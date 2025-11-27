import { Injectable } from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { FirestoreService } from '../firestore/firestore.service';

export enum GRNStatus {
  DRAFT = 'draft',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

type TimestampField = Timestamp | FieldValue | null | undefined;

export interface GRNItem {
  productId: string;
  productName: string;
  sku: string;
  orderedQuantity: number;
  receivedQuantity: number;
  batchNumber?: string;
  expiryDate?: Date | TimestampField | string;
  unitCostCents: number;
  totalCostCents: number;
}

export interface GRNRecord {
  id: string;
  tenantId: string;
  locationId: string;
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  supplierId: string;
  supplierName: string;
  grnNumber: string;
  status: GRNStatus;
  items: GRNItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  receivedBy: string;
  receivedAt: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

type GRNDocument = Omit<GRNRecord, 'id' | 'createdAt' | 'updatedAt' | 'receivedAt'> & {
  receivedAt?: TimestampField;
  createdAt?: TimestampField;
  updatedAt?: TimestampField;
};

export type CreateGRNInput = {
  tenantId: string;
  locationId: string;
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  supplierId: string;
  supplierName: string;
  items: GRNItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  receivedBy: string;
  notes?: string;
};

@Injectable()
export class GRNRepository {
  private readonly collection = this.firestore.collection<GRNDocument>('grn');

  constructor(private readonly firestore: FirestoreService) {}

  async findAll(tenantId: string, locationId?: string): Promise<GRNRecord[]> {
    let query = this.collection.where('tenantId', '==', tenantId);
    
    if (locationId) {
      query = query.where('locationId', '==', locationId) as any;
    }
    
    const snapshot = await query.orderBy('receivedAt', 'desc').get();
    return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
  }

  async findById(id: string, tenantId: string): Promise<GRNRecord | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    const data = doc.data();
    if (data?.tenantId !== tenantId) {
      return null;
    }
    return this.toRecord(doc.id, data);
  }

  async findByPurchaseOrder(purchaseOrderId: string, tenantId: string): Promise<GRNRecord[]> {
    const snapshot = await this.collection
      .where('tenantId', '==', tenantId)
      .where('purchaseOrderId', '==', purchaseOrderId)
      .orderBy('receivedAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
  }

  async create(data: CreateGRNInput): Promise<GRNRecord> {
    const now = FieldValue.serverTimestamp();
    const id = this.collection.doc().id;
    const grnNumber = `GRN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const docRef = this.collection.doc(id);
    await docRef.set({
      tenantId: data.tenantId,
      locationId: data.locationId,
      purchaseOrderId: data.purchaseOrderId,
      purchaseOrderNumber: data.purchaseOrderNumber,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      grnNumber,
      status: GRNStatus.COMPLETED,
      items: data.items,
      subtotalCents: data.subtotalCents,
      taxCents: data.taxCents,
      totalCents: data.totalCents,
      receivedBy: data.receivedBy,
      receivedAt: now,
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    });

    const created = await docRef.get();
    return this.toRecord(created.id, created.data() as GRNDocument);
  }

  private toRecord(id: string, data: GRNDocument | undefined): GRNRecord {
    if (!data) {
      throw new Error(`GRN document ${id} has no data.`);
    }

    return {
      id,
      tenantId: data.tenantId,
      locationId: data.locationId,
      purchaseOrderId: data.purchaseOrderId,
      purchaseOrderNumber: data.purchaseOrderNumber,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      grnNumber: data.grnNumber,
      status: data.status,
      items: data.items.map(item => ({
        ...item,
        expiryDate: item.expiryDate ? (item.expiryDate instanceof Timestamp ? item.expiryDate.toDate() : (typeof item.expiryDate === 'string' ? new Date(item.expiryDate) : undefined)) : undefined,
      })),
      subtotalCents: data.subtotalCents,
      taxCents: data.taxCents,
      totalCents: data.totalCents,
      receivedBy: data.receivedBy,
      receivedAt: data.receivedAt ? (data.receivedAt instanceof Timestamp ? data.receivedAt.toDate() : (typeof data.receivedAt === 'string' ? new Date(data.receivedAt) : new Date())) : new Date(),
      notes: data.notes,
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

