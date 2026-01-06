import { Injectable } from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { InventoryBatch as PrismaInventoryBatch } from '@prisma/client';
import { FirestoreService } from '../firestore/firestore.service';
import { PrismaService } from '../database/prisma.service';

export interface BatchInventoryRecord {
  id: string;
  tenantId: string;
  productId: string;
  locationId: string;
  batchNumber: string;
  expiryDate?: Date;
  quantity: number;
  unitCostCents?: number;
  receivedDate: Date;
  purchaseOrderId?: string;
  grnId?: string;
  createdAt: Date;
  updatedAt: Date;
}

type TimestampField = Timestamp | FieldValue | null | undefined;

type BatchInventoryDocument = Omit<
  BatchInventoryRecord,
  'id' | 'createdAt' | 'updatedAt' | 'expiryDate' | 'receivedDate'
> & {
  expiryDate?: TimestampField;
  receivedDate?: TimestampField;
  createdAt?: TimestampField;
  updatedAt?: TimestampField;
};

export type CreateBatchInventoryInput = {
  tenantId: string;
  productId: string;
  locationId: string;
  batchNumber: string;
  expiryDate?: Date;
  quantity: number;
  unitCostCents?: number;
  purchaseOrderId?: string;
  grnId?: string;
  receivedDate?: Date;
};

@Injectable()
export class BatchInventoryRepository {
  private readonly collection =
    this.firestore.collection<BatchInventoryDocument>('batch_inventory');

  constructor(
    private readonly firestore: FirestoreService,
    private readonly prismaService: PrismaService,
  ) {}

  private isPostgresEnabled(): boolean {
    return (process.env.DB_PROVIDER || '').toLowerCase() === 'postgres';
  }

  async findByProduct(productId: string, locationId: string): Promise<BatchInventoryRecord[]> {
    if (this.isPostgresEnabled()) {
      const rows = await this.prismaService.prisma.inventoryBatch.findMany({
        where: { productId, locationId },
        orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
      });
      return rows.map((row) => this.fromPrismaRecord(row));
    }

    const snapshot = await this.collection
      .where('productId', '==', productId)
      .where('locationId', '==', locationId)
      .orderBy('expiryDate', 'asc')
      .get();
    return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
  }

  async findByLocation(locationId: string): Promise<BatchInventoryRecord[]> {
    if (this.isPostgresEnabled()) {
      const rows = await this.prismaService.prisma.inventoryBatch.findMany({
        where: { locationId },
        orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
      });
      return rows.map((row) => this.fromPrismaRecord(row));
    }

    try {
      // Query without orderBy first to avoid issues with missing expiryDate fields
      const snapshot = await this.collection.where('locationId', '==', locationId).get();

      const records = snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));

      // Sort in memory: batches with expiry dates first (sorted by expiry), then batches without expiry dates
      records.sort((a, b) => {
        // If both have expiry dates, sort by expiry date
        if (a.expiryDate && b.expiryDate) {
          return a.expiryDate.getTime() - b.expiryDate.getTime();
        }
        // Batches with expiry dates come first
        if (a.expiryDate && !b.expiryDate) return -1;
        if (!a.expiryDate && b.expiryDate) return 1;
        // Both don't have expiry dates, maintain original order
        return 0;
      });

      return records;
    } catch (error: any) {
      console.error('Error fetching batch inventory by location:', error);
      // If query fails, try without orderBy as fallback
      const snapshot = await this.collection.where('locationId', '==', locationId).get();
      return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
    }
  }

  async create(data: CreateBatchInventoryInput): Promise<BatchInventoryRecord> {
    if (this.isPostgresEnabled()) {
      const row = await this.prismaService.prisma.inventoryBatch.create({
        data: {
          tenantId: data.tenantId ?? '',
          productId: data.productId,
          locationId: data.locationId,
          batchNumber: data.batchNumber,
          expiryDate: data.expiryDate ?? null,
          quantity: data.quantity,
          unitCostCents: data.unitCostCents ?? null,
          receivedDate: data.receivedDate ?? undefined,
          purchaseOrderId: data.purchaseOrderId,
          grnId: data.grnId,
        },
      });
      return this.fromPrismaRecord(row);
    }

    const now = FieldValue.serverTimestamp();
    const id = this.collection.doc().id;
    const docRef = this.collection.doc(id);

    await docRef.set({
      tenantId: data.tenantId,
      productId: data.productId,
      locationId: data.locationId,
      batchNumber: data.batchNumber,
      expiryDate: data.expiryDate ? Timestamp.fromDate(data.expiryDate) : undefined,
      quantity: data.quantity,
      unitCostCents: data.unitCostCents,
      receivedDate: data.receivedDate ? Timestamp.fromDate(data.receivedDate) : now,
      purchaseOrderId: data.purchaseOrderId,
      grnId: data.grnId,
      createdAt: now,
      updatedAt: now,
    });

    const created = await docRef.get();
    return this.toRecord(created.id, created.data() as BatchInventoryDocument);
  }

  async updateQuantity(id: string, delta: number): Promise<BatchInventoryRecord> {
    if (this.isPostgresEnabled()) {
      const existing = await this.prismaService.prisma.inventoryBatch.findUnique({ where: { id } });
      if (!existing) {
        throw new Error(`Batch inventory ${id} not found`);
      }

      const newQuantity = Math.max(0, existing.quantity + delta);
      const row = await this.prismaService.prisma.inventoryBatch.update({
        where: { id },
        data: { quantity: newQuantity },
      });
      return this.fromPrismaRecord(row);
    }

    const docRef = this.collection.doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      throw new Error(`Batch inventory ${id} not found`);
    }

    const data = existing.data();
    const newQuantity = Math.max(0, (data?.quantity || 0) + delta);

    await docRef.set(
      {
        quantity: newQuantity,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const updated = await docRef.get();
    return this.toRecord(updated.id, updated.data() as BatchInventoryDocument);
  }

  private toRecord(id: string, data: BatchInventoryDocument | undefined): BatchInventoryRecord {
    if (!data) {
      throw new Error(`Batch inventory document ${id} has no data.`);
    }

    return {
      id,
      tenantId: data.tenantId,
      productId: data.productId,
      locationId: data.locationId,
      batchNumber: data.batchNumber,
      expiryDate: data.expiryDate
        ? data.expiryDate instanceof Timestamp
          ? data.expiryDate.toDate()
          : typeof data.expiryDate === 'string'
            ? new Date(data.expiryDate)
            : undefined
        : undefined,
      quantity: data.quantity,
      unitCostCents: data.unitCostCents,
      receivedDate: data.receivedDate
        ? data.receivedDate instanceof Timestamp
          ? data.receivedDate.toDate()
          : typeof data.receivedDate === 'string'
            ? new Date(data.receivedDate)
            : new Date()
        : new Date(),
      purchaseOrderId: data.purchaseOrderId,
      grnId: data.grnId,
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

  private fromPrismaRecord(row: PrismaInventoryBatch): BatchInventoryRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      productId: row.productId,
      locationId: row.locationId,
      batchNumber: row.batchNumber,
      expiryDate: row.expiryDate ?? undefined,
      quantity: row.quantity,
      unitCostCents: row.unitCostCents ?? undefined,
      receivedDate: row.receivedDate,
      purchaseOrderId: row.purchaseOrderId ?? undefined,
      grnId: row.grnId ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
