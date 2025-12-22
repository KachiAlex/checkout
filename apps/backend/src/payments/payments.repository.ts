import { Injectable, NotFoundException } from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuid } from 'uuid';
import { PaymentMethod, PaymentStatus } from '@pos-checkout/shared';
import { FirestoreService } from '../firestore/firestore.service';

export interface PaymentRecord {
  id: string;
  orderId: string;
  amountCents: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  processorData?: Record<string, unknown>;
  transactionId?: string;
  error?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

type TimestampField = Timestamp | FieldValue | null | undefined;

type PaymentDocument = Omit<PaymentRecord, 'id' | 'createdAt' | 'updatedAt' | 'processedAt'> & {
  createdAt?: TimestampField;
  updatedAt?: TimestampField;
  processedAt?: TimestampField;
};

export type CreatePaymentInput = {
  orderId: string;
  amountCents: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  processorData?: Record<string, unknown>;
  transactionId?: string;
  error?: string;
  processedAt?: Date;
};

@Injectable()
export class PaymentsRepository {
  private readonly collection = this.firestore.collection<PaymentDocument>('payments');

  constructor(private readonly firestore: FirestoreService) {}

  async create(data: CreatePaymentInput): Promise<PaymentRecord> {
    const now = FieldValue.serverTimestamp();
    const id = uuid();

    try {
      await this.collection.doc(id).set({
        orderId: data.orderId,
        amountCents: data.amountCents,
        currency: data.currency,
        method: data.method,
        status: data.status,
        processorData: data.processorData,
        transactionId: data.transactionId,
        error: data.error,
        processedAt: data.processedAt ? Timestamp.fromDate(data.processedAt) : undefined,
        createdAt: now,
        updatedAt: now,
      });

      const created = await this.collection.doc(id).get();
      if (!created.exists) {
        throw new Error(`Failed to create payment: document ${id} does not exist after creation`);
      }
      console.log(
        `✅ Payment saved to Firestore: ${id} (order: ${data.orderId}, amount: ${data.amountCents / 100} ${data.currency})`,
      );
      return this.toRecord(created.id, created.data() as PaymentDocument);
    } catch (error) {
      console.error(`❌ Failed to save payment to Firestore:`, error);
      throw error;
    }
  }

  async findById(id: string): Promise<PaymentRecord | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return this.toRecord(doc.id, doc.data() as PaymentDocument);
  }

  async findByOrderId(orderId: string): Promise<PaymentRecord[]> {
    const snapshot = await this.collection.where('orderId', '==', orderId).get();
    return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
  }

  async findByPaymentReference(paymentReference: string): Promise<PaymentRecord | null> {
    // Search by paymentReference in processorData
    const snapshot = await this.collection
      .where('processorData.paymentReference', '==', paymentReference)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return this.toRecord(doc.id, doc.data());
    }

    // Also check transactionReference
    const snapshot2 = await this.collection
      .where('processorData.transactionReference', '==', paymentReference)
      .limit(1)
      .get();

    if (!snapshot2.empty) {
      const doc = snapshot2.docs[0];
      return this.toRecord(doc.id, doc.data());
    }

    // Check transactionId field
    const snapshot3 = await this.collection
      .where('transactionId', '==', paymentReference)
      .limit(1)
      .get();

    if (!snapshot3.empty) {
      const doc = snapshot3.docs[0];
      return this.toRecord(doc.id, doc.data());
    }

    return null;
  }

  async update(id: string, update: Partial<CreatePaymentInput>): Promise<PaymentRecord> {
    const docRef = this.collection.doc(id);
    const existing = await docRef.get();
    if (!existing.exists) {
      throw new NotFoundException(`Payment ${id} not found`);
    }

    await docRef.set(
      {
        ...update,
        processedAt: update.processedAt
          ? Timestamp.fromDate(update.processedAt)
          : update.processedAt === null
            ? null
            : undefined,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const updated = await docRef.get();
    return this.toRecord(updated.id, updated.data() as PaymentDocument);
  }

  private toRecord(id: string, data: PaymentDocument | undefined): PaymentRecord {
    if (!data) {
      throw new NotFoundException(`Payment document ${id} has no data.`);
    }

    return {
      id,
      orderId: data.orderId,
      amountCents: data.amountCents,
      currency: data.currency,
      method: data.method,
      status: data.status,
      processorData: data.processorData,
      transactionId: data.transactionId,
      error: data.error,
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
