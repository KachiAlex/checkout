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

