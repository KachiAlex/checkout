import { Injectable } from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { FirestoreService } from '../firestore/firestore.service';

export interface BatchInventoryRecord {
  id: string;
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

type BatchInventoryDocument = Omit<BatchInventoryRecord, 'id' | 'createdAt' | 'updatedAt' | 'expiryDate' | 'receivedDate'> & {
  expiryDate?: TimestampField;
  receivedDate?: TimestampField;
  createdAt?: TimestampField;
  updatedAt?: TimestampField;
};

export type CreateBatchInventoryInput = {
  productId: string;
  locationId: string;
  batchNumber: string;
  expiryDate?: Date;
  quantity: number;
  unitCostCents?: number;
  purchaseOrderId?: string;
  grnId?: string;
};

@Injectable()
export class BatchInventoryRepository {
  private readonly collection = this.firestore.collection<BatchInventoryDocument>('batch_inventory');

  constructor(private readonly firestore: FirestoreService) {}

  async findByProduct(productId: string, locationId: string): Promise<BatchInventoryRecord[]> {
    const snapshot = await this.collection
      .where('productId', '==', productId)
      .where('locationId', '==', locationId)
      .orderBy('expiryDate', 'asc')
      .get();
    return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
  }

  async findByLocation(locationId: string): Promise<BatchInventoryRecord[]> {
    const snapshot = await this.collection
      .where('locationId', '==', locationId)
      .orderBy('expiryDate', 'asc')
      .get();
    return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
  }

  async create(data: CreateBatchInventoryInput): Promise<BatchInventoryRecord> {
    const now = FieldValue.serverTimestamp();
    const id = this.collection.doc().id;
    const docRef = this.collection.doc(id);
    
    await docRef.set({
      productId: data.productId,
      locationId: data.locationId,
      batchNumber: data.batchNumber,
      expiryDate: data.expiryDate ? Timestamp.fromDate(data.expiryDate) : undefined,
      quantity: data.quantity,
      unitCostCents: data.unitCostCents,
      receivedDate: now,
      purchaseOrderId: data.purchaseOrderId,
      grnId: data.grnId,
      createdAt: now,
      updatedAt: now,
    });

    const created = await docRef.get();
    return this.toRecord(created.id, created.data() as BatchInventoryDocument);
  }

  async updateQuantity(id: string, delta: number): Promise<BatchInventoryRecord> {
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
      productId: data.productId,
      locationId: data.locationId,
      batchNumber: data.batchNumber,
      expiryDate: data.expiryDate ? (data.expiryDate instanceof Timestamp ? data.expiryDate.toDate() : (typeof data.expiryDate === 'string' ? new Date(data.expiryDate) : undefined)) : undefined,
      quantity: data.quantity,
      unitCostCents: data.unitCostCents,
      receivedDate: data.receivedDate ? (data.receivedDate instanceof Timestamp ? data.receivedDate.toDate() : (typeof data.receivedDate === 'string' ? new Date(data.receivedDate) : new Date())) : new Date(),
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
}

