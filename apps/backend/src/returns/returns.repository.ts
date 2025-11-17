import { Injectable, NotFoundException } from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuid } from 'uuid';
import { FirestoreService } from '../firestore/firestore.service';

export enum ReturnStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
}

export enum ReturnReason {
  DEFECTIVE = 'DEFECTIVE',
  WRONG_ITEM = 'WRONG_ITEM',
  CUSTOMER_REQUEST = 'CUSTOMER_REQUEST',
  EXPIRED = 'EXPIRED',
  DAMAGED = 'DAMAGED',
  OTHER = 'OTHER',
}

export interface ReturnRecord {
  id: string;
  returnNumber: string;
  orderId: string;
  orderNumber: string;
  locationId: string;
  customerId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    priceCents: number;
    reason: ReturnReason;
    notes?: string;
  }>;
  totalRefundCents: number;
  status: ReturnStatus;
  reason: ReturnReason;
  notes?: string;
  processedBy?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

type TimestampField = Timestamp | FieldValue | null | undefined;

type ReturnDocument = Omit<ReturnRecord, 'id' | 'createdAt' | 'updatedAt' | 'processedAt'> & {
  processedAt?: TimestampField;
  createdAt?: TimestampField;
  updatedAt?: TimestampField;
};

export type CreateReturnInput = {
  orderId: string;
  orderNumber: string;
  locationId: string;
  customerId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    priceCents: number;
    reason: ReturnReason;
    notes?: string;
  }>;
  totalRefundCents: number;
  reason: ReturnReason;
  notes?: string;
  processedBy?: string;
};

@Injectable()
export class ReturnsRepository {
  private readonly collection = this.firestore.collection<ReturnDocument>('returns');

  constructor(private readonly firestore: FirestoreService) {}

  async create(data: CreateReturnInput): Promise<ReturnRecord> {
    const now = FieldValue.serverTimestamp();
    const id = uuid();
    const returnNumber = await this.generateReturnNumber(data.locationId);

    const doc: ReturnDocument = {
      returnNumber,
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      locationId: data.locationId,
      customerId: data.customerId,
      items: data.items,
      totalRefundCents: data.totalRefundCents,
      status: ReturnStatus.PENDING,
      reason: data.reason,
      notes: data.notes,
      processedBy: data.processedBy,
      processedAt: data.processedBy ? Timestamp.fromDate(new Date()) : undefined,
      createdAt: now,
      updatedAt: now,
    };

    await this.collection.doc(id).set(doc);
    const created = await this.collection.doc(id).get();
    return this.toRecord(id, created.data() as ReturnDocument);
  }

  async findById(id: string): Promise<ReturnRecord | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return this.toRecord(doc.id, doc.data() as ReturnDocument);
  }

  async findByOrderId(orderId: string): Promise<ReturnRecord[]> {
    const snapshot = await this.collection.where('orderId', '==', orderId).get();
    return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
  }

  async findByReturnNumber(returnNumber: string): Promise<ReturnRecord | null> {
    const snapshot = await this.collection.where('returnNumber', '==', returnNumber).limit(1).get();
    if (snapshot.empty) {
      return null;
    }
    return this.toRecord(snapshot.docs[0].id, snapshot.docs[0].data());
  }

  async list(params: {
    locationId?: string;
    from?: Date;
    to?: Date;
    status?: ReturnStatus;
    customerId?: string;
  }): Promise<ReturnRecord[]> {
    let query = this.collection.orderBy('createdAt', 'desc');

    if (params.locationId) {
      query = query.where('locationId', '==', params.locationId);
    }
    if (params.status) {
      query = query.where('status', '==', params.status);
    }
    if (params.customerId) {
      query = query.where('customerId', '==', params.customerId);
    }
    if (params.from) {
      query = query.where('createdAt', '>=', Timestamp.fromDate(params.from));
    }
    if (params.to) {
      query = query.where('createdAt', '<=', Timestamp.fromDate(params.to));
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
  }

  async update(id: string, update: Partial<ReturnRecord>): Promise<ReturnRecord> {
    const docRef = this.collection.doc(id);
    const existing = await docRef.get();
    if (!existing.exists) {
      throw new NotFoundException(`Return with id ${id} not found.`);
    }

    const data = existing.data() as ReturnDocument;

    const updateDoc: Partial<ReturnDocument> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (update.status !== undefined) updateDoc.status = update.status;
    if (update.notes !== undefined) updateDoc.notes = update.notes;
    if (update.processedBy !== undefined) updateDoc.processedBy = update.processedBy;
    if (update.processedAt !== undefined) {
      updateDoc.processedAt = update.processedAt ? Timestamp.fromDate(update.processedAt) : undefined;
    }

    await docRef.set(updateDoc, { merge: true });

    const updated = await docRef.get();
    return this.toRecord(updated.id, updated.data() as ReturnDocument);
  }

  private async generateReturnNumber(locationId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const locationPrefix = locationId.substring(0, 4).toUpperCase();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));

    const returnsToday = await this.list({
      locationId,
      from: startOfDay,
      to: new Date(),
    });

    return `RET-${locationPrefix}-${dateStr}-${String(returnsToday.length + 1).padStart(6, '0')}`;
  }

  private toRecord(id: string, data: ReturnDocument | undefined): ReturnRecord {
    if (!data) {
      throw new NotFoundException(`Return document ${id} has no data.`);
    }

    return {
      id,
      returnNumber: data.returnNumber,
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      locationId: data.locationId,
      customerId: data.customerId,
      items: data.items,
      totalRefundCents: data.totalRefundCents,
      status: data.status,
      reason: data.reason,
      notes: data.notes,
      processedBy: data.processedBy,
      processedAt: this.timestampToDate(data.processedAt),
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

