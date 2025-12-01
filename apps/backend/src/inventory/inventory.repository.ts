import { Injectable, NotFoundException } from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuid } from 'uuid';
import { InventoryTransactionType } from '@pos-checkout/shared';
import { FirestoreService } from '../firestore/firestore.service';

export interface InventoryRecord {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  reorderPoint?: number;
  maxStock?: number;
  costCents?: number;
  salesPriceCents?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryTransactionRecord {
  id: string;
  productId: string;
  locationId: string;
  delta: number;
  type: InventoryTransactionType;
  referenceId?: string;
  userId?: string;
  notes?: string;
  reason?: string;
  ts: Date;
  createdAt: Date;
  updatedAt: Date;
}

type TimestampField = Timestamp | FieldValue | null | undefined;

type InventoryDocument = Omit<InventoryRecord, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt?: TimestampField;
  updatedAt?: TimestampField;
};

type InventoryTransactionDocument = Omit<
  InventoryTransactionRecord,
  'id' | 'createdAt' | 'updatedAt' | 'ts'
> & {
  reason?: string;
  createdAt?: TimestampField;
  updatedAt?: TimestampField;
  ts?: TimestampField;
};

@Injectable()
export class InventoryRepository {
  private readonly inventoryCollection = this.firestore.collection<InventoryDocument>('inventory');
  private readonly transactionsCollection =
    this.firestore.collection<InventoryTransactionDocument>('inventoryTransactions');

  constructor(private readonly firestore: FirestoreService) {}

  async listStock(locationId: string): Promise<InventoryRecord[]> {
    const snapshot = await this.inventoryCollection.where('locationId', '==', locationId).get();
    return snapshot.docs.map((doc) => this.toInventoryRecord(doc.id, doc.data()));
  }

  async getInventory(productId: string, locationId: string): Promise<InventoryRecord | null> {
    const snapshot = await this.inventoryCollection
      .where('productId', '==', productId)
      .where('locationId', '==', locationId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return this.toInventoryRecord(doc.id, doc.data());
  }

  async upsertInventory(record: Omit<InventoryRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryRecord> {
    const existing = await this.getInventory(record.productId, record.locationId);
    const now = FieldValue.serverTimestamp();

    if (existing) {
      const docRef = this.inventoryCollection.doc(existing.id);
      await docRef.set(
        {
          quantity: record.quantity,
          reorderPoint: record.reorderPoint,
          maxStock: record.maxStock,
          costCents: record.costCents,
          salesPriceCents: record.salesPriceCents,
          updatedAt: now,
        },
        { merge: true },
      );
      const updated = await docRef.get();
      return this.toInventoryRecord(updated.id, updated.data() as InventoryDocument);
    }

    const id = uuid();
    const docRef = this.inventoryCollection.doc(id);
    await docRef.set({
      ...record,
      createdAt: now,
      updatedAt: now,
    });
    const created = await docRef.get();
    return this.toInventoryRecord(created.id, created.data() as InventoryDocument);
  }

  async createTransaction(
    record: Omit<InventoryTransactionRecord, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<InventoryTransactionRecord> {
    const id = uuid();
    const now = FieldValue.serverTimestamp();

    const docRef = this.transactionsCollection.doc(id);
    const timestampValue =
      record.ts instanceof Date ? Timestamp.fromDate(record.ts) : record.ts ?? now;

    await docRef.set({
      ...record,
      ts: timestampValue,
      createdAt: now,
      updatedAt: now,
    });

    const created = await docRef.get();
    return this.toTransactionRecord(created.id, created.data() as InventoryTransactionDocument);
  }

  async listTransactions(locationId: string, from?: Date, to?: Date): Promise<InventoryTransactionRecord[]> {
    let query = this.transactionsCollection.where('locationId', '==', locationId).orderBy('ts', 'desc');

    if (from) {
      query = query.where('ts', '>=', Timestamp.fromDate(from));
    }

    if (to) {
      query = query.where('ts', '<=', Timestamp.fromDate(to));
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => this.toTransactionRecord(doc.id, doc.data()));
  }

  async getLastTransaction(productId: string, locationId: string): Promise<InventoryTransactionRecord | null> {
    try {
      // Try with orderBy first (requires composite index)
      const snapshot = await this.transactionsCollection
        .where('productId', '==', productId)
        .where('locationId', '==', locationId)
        .orderBy('ts', 'desc')
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return this.toTransactionRecord(snapshot.docs[0].id, snapshot.docs[0].data());
    } catch (error: any) {
      // If index doesn't exist, fallback to fetching all and sorting in memory
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.warn('Firestore index not found, falling back to in-memory sort');
        const snapshot = await this.transactionsCollection
          .where('productId', '==', productId)
          .where('locationId', '==', locationId)
          .get();

        if (snapshot.empty) {
          return null;
        }

        const transactions = snapshot.docs.map((doc) =>
          this.toTransactionRecord(doc.id, doc.data()),
        );
        
        // Sort by timestamp descending and return the first one
        transactions.sort((a, b) => b.ts.getTime() - a.ts.getTime());
        return transactions[0];
      }
      throw error;
    }
  }

  /**
   * Batch fetch last transaction for multiple products (optimized for inventory loading)
   * Fetches recent transactions for the location and groups by productId
   */
  async getLastTransactionsBatch(productIds: string[], locationId: string): Promise<Map<string, InventoryTransactionRecord>> {
    if (productIds.length === 0) {
      return new Map();
    }

    const result = new Map<string, InventoryTransactionRecord>();
    const uniqueProductIds = new Set(productIds);

    try {
      // Fetch recent transactions for this location (last 1000 should cover most cases)
      // This is more efficient than N individual queries
      const snapshot = await this.transactionsCollection
        .where('locationId', '==', locationId)
        .orderBy('ts', 'desc')
        .limit(1000)
        .get();

      // Group by productId and keep only the latest for each
      const transactionsByProduct = new Map<string, InventoryTransactionRecord>();
      
      for (const doc of snapshot.docs) {
        const transaction = this.toTransactionRecord(doc.id, doc.data());
        
        // Only process transactions for products we're interested in
        if (!uniqueProductIds.has(transaction.productId)) {
          continue;
        }

        // Keep only the latest transaction for each product
        const existing = transactionsByProduct.get(transaction.productId);
        if (!existing || transaction.ts.getTime() > existing.ts.getTime()) {
          transactionsByProduct.set(transaction.productId, transaction);
        }
      }

      return transactionsByProduct;
    } catch (error: any) {
      // If index doesn't exist, fallback to individual queries (slower but works)
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.warn('Firestore index not found for batch transaction fetch, using individual queries');
        const promises = productIds.map((productId) => 
          this.getLastTransaction(productId, locationId)
        );
        const transactions = await Promise.all(promises);
        
        transactions.forEach((transaction, index) => {
          if (transaction) {
            result.set(productIds[index], transaction);
          }
        });
        
        return result;
      }
      throw error;
    }
  }

  async getAllInventory(): Promise<InventoryRecord[]> {
    const snapshot = await this.inventoryCollection.get();
    return snapshot.docs.map((doc) => this.toInventoryRecord(doc.id, doc.data()));
  }

  async findDuplicates(): Promise<{ key: string; records: InventoryRecord[] }[]> {
    const allInventory = await this.getAllInventory();
    const groups = new Map<string, InventoryRecord[]>();

    // Group by productId + locationId
    for (const record of allInventory) {
      const key = `${record.productId}:${record.locationId}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(record);
    }

    // Filter to only groups with duplicates
    const duplicates: { key: string; records: InventoryRecord[] }[] = [];
    for (const [key, records] of groups.entries()) {
      if (records.length > 1) {
        // Sort by createdAt to keep the first one
        records.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        duplicates.push({ key, records });
      }
    }

    return duplicates;
  }

  async removeDuplicates(): Promise<{ removed: number; kept: number }> {
    const duplicates = await this.findDuplicates();
    const batches: ReturnType<typeof this.firestore.batch>[] = [this.firestore.batch()];
    let currentBatch = batches[0];
    let currentBatchCount = 0;
    let removedCount = 0;
    let keptCount = 0;

    for (const { records } of duplicates) {
      // Keep the first one (oldest), remove the rest
      const [keep, ...toRemove] = records;
      keptCount++;

      for (const record of toRemove) {
        if (currentBatchCount >= 500) {
          currentBatch = this.firestore.batch();
          batches.push(currentBatch);
          currentBatchCount = 0;
        }
        const docRef = this.inventoryCollection.doc(record.id);
        currentBatch.delete(docRef);
        currentBatchCount++;
        removedCount++;
      }
    }

    if (removedCount > 0) {
      await Promise.all(batches.map((b) => b.commit()));
    }

    return { removed: removedCount, kept: keptCount };
  }

  async clearAllInventory(): Promise<number> {
    const snapshot = await this.inventoryCollection.get();
    
    if (snapshot.empty) {
      return 0;
    }

    let count = 0;

    // Firestore batches are limited to 500 operations
    const batches: ReturnType<typeof this.firestore.batch>[] = [this.firestore.batch()];
    let currentBatch = batches[0];
    let currentBatchCount = 0;

    for (const doc of snapshot.docs) {
      if (currentBatchCount >= 500) {
        currentBatch = this.firestore.batch();
        batches.push(currentBatch);
        currentBatchCount = 0;
      }
      currentBatch.delete(doc.ref);
      currentBatchCount++;
      count++;
    }

    // Commit all batches
    await Promise.all(batches.map((b) => b.commit()));

    return count;
  }

  private toInventoryRecord(id: string, data: InventoryDocument | undefined): InventoryRecord {
    if (!data) {
      throw new NotFoundException(`Inventory document ${id} has no data.`);
    }

    return {
      id,
      productId: data.productId,
      locationId: data.locationId,
      quantity: data.quantity,
      reorderPoint: data.reorderPoint,
      maxStock: data.maxStock,
      costCents: data.costCents,
      salesPriceCents: data.salesPriceCents,
      createdAt: this.timestampToDate(data.createdAt),
      updatedAt: this.timestampToDate(data.updatedAt),
    };
  }

  private toTransactionRecord(id: string, data: InventoryTransactionDocument | undefined): InventoryTransactionRecord {
    if (!data) {
      throw new NotFoundException(`Inventory transaction document ${id} has no data.`);
    }

    return {
      id,
      productId: data.productId,
      locationId: data.locationId,
      delta: data.delta,
      type: data.type,
      referenceId: data.referenceId,
      userId: data.userId,
      notes: data.notes,
      reason: data.reason,
      ts: this.timestampToDate(data.ts),
      createdAt: this.timestampToDate(data.createdAt),
      updatedAt: this.timestampToDate(data.updatedAt),
    };
  }

  private timestampToDate(timestamp?: TimestampField): Date {
    if (!timestamp) {
      return new Date();
    }
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    return new Date();
  }
}

