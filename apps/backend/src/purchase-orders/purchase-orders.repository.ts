import { Injectable } from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { FirestoreService } from '../firestore/firestore.service';

export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  PARTIALLY_RECEIVED = 'partially_received',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCostCents: number;
  totalCostCents: number;
  receivedQuantity?: number;
}

export interface PurchaseOrderRecord {
  id: string;
  tenantId: string;
  locationId: string;
  supplierId: string;
  supplierName: string;
  orderNumber: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  expectedDeliveryDate?: Date;
  notes?: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

type TimestampField = Timestamp | FieldValue | null | undefined;

type PurchaseOrderDocument = Omit<PurchaseOrderRecord, 'id' | 'createdAt' | 'updatedAt' | 'expectedDeliveryDate' | 'approvedAt'> & {
  expectedDeliveryDate?: TimestampField;
  approvedAt?: TimestampField;
  createdAt?: TimestampField;
  updatedAt?: TimestampField;
};

export type CreatePurchaseOrderInput = {
  tenantId: string;
  locationId: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  expectedDeliveryDate?: Date;
  notes?: string;
  createdBy: string;
};

@Injectable()
export class PurchaseOrdersRepository {
  private readonly collection = this.firestore.collection<PurchaseOrderDocument>('purchase_orders');

  constructor(private readonly firestore: FirestoreService) {}

  async findAll(tenantId: string, locationId?: string): Promise<PurchaseOrderRecord[]> {
    let query = this.collection.where('tenantId', '==', tenantId);
    
    if (locationId) {
      query = query.where('locationId', '==', locationId) as any;
    }
    
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
  }

  async findById(id: string, tenantId: string): Promise<PurchaseOrderRecord | null> {
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

  async findByOrderNumber(orderNumber: string, tenantId: string): Promise<PurchaseOrderRecord | null> {
    const snapshot = await this.collection
      .where('tenantId', '==', tenantId)
      .where('orderNumber', '==', orderNumber)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    return this.toRecord(snapshot.docs[0].id, snapshot.docs[0].data());
  }

  async create(data: CreatePurchaseOrderInput): Promise<PurchaseOrderRecord> {
    const now = FieldValue.serverTimestamp();
    const id = this.collection.doc().id;
    const orderNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const docRef = this.collection.doc(id);
    await docRef.set({
      tenantId: data.tenantId,
      locationId: data.locationId,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      orderNumber,
      status: PurchaseOrderStatus.DRAFT,
      items: data.items,
      subtotalCents: data.subtotalCents,
      taxCents: data.taxCents,
      totalCents: data.totalCents,
      expectedDeliveryDate: data.expectedDeliveryDate ? Timestamp.fromDate(data.expectedDeliveryDate) : undefined,
      notes: data.notes,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    const created = await docRef.get();
    return this.toRecord(created.id, created.data() as PurchaseOrderDocument);
  }

  async update(id: string, tenantId: string, update: Partial<PurchaseOrderRecord>): Promise<PurchaseOrderRecord> {
    const docRef = this.collection.doc(id);
    const existing = await docRef.get();
    
    if (!existing.exists) {
      throw new Error(`Purchase order ${id} not found`);
    }
    
    const data = existing.data();
    if (data?.tenantId !== tenantId) {
      throw new Error(`Purchase order ${id} does not belong to tenant ${tenantId}`);
    }

    const payload: Partial<PurchaseOrderDocument> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (update.status !== undefined) payload.status = update.status;
    if (update.items !== undefined) payload.items = update.items;
    if (update.subtotalCents !== undefined) payload.subtotalCents = update.subtotalCents;
    if (update.taxCents !== undefined) payload.taxCents = update.taxCents;
    if (update.totalCents !== undefined) payload.totalCents = update.totalCents;
    if (update.notes !== undefined) payload.notes = update.notes;
    if (update.approvedBy !== undefined) payload.approvedBy = update.approvedBy;
    if (update.approvedAt !== undefined) {
      payload.approvedAt = update.approvedAt ? Timestamp.fromDate(update.approvedAt) : undefined;
    }

    await docRef.set(payload, { merge: true });

    const updated = await docRef.get();
    return this.toRecord(updated.id, updated.data() as PurchaseOrderDocument);
  }

  private toRecord(id: string, data: PurchaseOrderDocument | undefined): PurchaseOrderRecord {
    if (!data) {
      throw new Error(`Purchase order document ${id} has no data.`);
    }

    return {
      id,
      tenantId: data.tenantId,
      locationId: data.locationId,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      orderNumber: data.orderNumber,
      status: data.status,
      items: data.items,
      subtotalCents: data.subtotalCents,
      taxCents: data.taxCents,
      totalCents: data.totalCents,
      expectedDeliveryDate: data.expectedDeliveryDate ? (data.expectedDeliveryDate instanceof Timestamp ? data.expectedDeliveryDate.toDate() : (typeof data.expectedDeliveryDate === 'string' ? new Date(data.expectedDeliveryDate) : undefined)) : undefined,
      notes: data.notes,
      createdBy: data.createdBy,
      approvedBy: data.approvedBy,
      approvedAt: data.approvedAt ? (data.approvedAt instanceof Timestamp ? data.approvedAt.toDate() : (typeof data.approvedAt === 'string' ? new Date(data.approvedAt) : undefined)) : undefined,
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

