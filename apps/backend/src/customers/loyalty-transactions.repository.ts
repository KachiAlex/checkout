import { Injectable } from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { FirestoreService } from '../firestore/firestore.service';

export enum LoyaltyTransactionType {
  EARNED = 'earned',
  REDEEMED = 'redeemed',
  ADJUSTED = 'adjusted',
  EXPIRED = 'expired',
}

export interface LoyaltyTransactionRecord {
  id: string;
  customerId: string;
  tenantId: string;
  type: LoyaltyTransactionType;
  points: number; // Positive for earned, negative for redeemed
  balanceAfter: number; // Points balance after this transaction
  orderId?: string; // If related to an order
  reason?: string; // Reason for adjustment or redemption
  notes?: string;
  createdAt: Date;
}

type TimestampField = Timestamp | FieldValue | null | undefined;

type LoyaltyTransactionDocument = Omit<LoyaltyTransactionRecord, 'id' | 'createdAt'> & {
  createdAt?: TimestampField;
};

export type CreateLoyaltyTransactionInput = {
  customerId: string;
  tenantId: string;
  type: LoyaltyTransactionType;
  points: number;
  balanceAfter: number;
  orderId?: string;
  reason?: string;
  notes?: string;
};

@Injectable()
export class LoyaltyTransactionsRepository {
  private readonly collection =
    this.firestore.collection<LoyaltyTransactionDocument>('loyalty_transactions');

  constructor(private readonly firestore: FirestoreService) {}

  async create(data: CreateLoyaltyTransactionInput): Promise<LoyaltyTransactionRecord> {
    const now = FieldValue.serverTimestamp();
    const id = this.collection.doc().id;

    const docRef = this.collection.doc(id);
    await docRef.set({
      customerId: data.customerId,
      tenantId: data.tenantId,
      type: data.type,
      points: data.points,
      balanceAfter: data.balanceAfter,
      orderId: data.orderId,
      reason: data.reason,
      notes: data.notes,
      createdAt: now,
    });

    const created = await docRef.get();
    return this.toRecord(created.id, created.data() as LoyaltyTransactionDocument);
  }

  async findByCustomer(
    customerId: string,
    tenantId: string,
    limit = 50,
  ): Promise<LoyaltyTransactionRecord[]> {
    const snapshot = await this.collection
      .where('customerId', '==', customerId)
      .where('tenantId', '==', tenantId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
  }

  async findByOrder(orderId: string, tenantId: string): Promise<LoyaltyTransactionRecord[]> {
    const snapshot = await this.collection
      .where('orderId', '==', orderId)
      .where('tenantId', '==', tenantId)
      .get();

    return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
  }

  private toRecord(
    id: string,
    data: LoyaltyTransactionDocument | undefined,
  ): LoyaltyTransactionRecord {
    if (!data) {
      throw new Error(`Loyalty transaction document ${id} has no data.`);
    }

    return {
      id,
      customerId: data.customerId,
      tenantId: data.tenantId,
      type: data.type,
      points: data.points,
      balanceAfter: data.balanceAfter,
      orderId: data.orderId,
      reason: data.reason,
      notes: data.notes,
      createdAt: this.timestampToDate(data.createdAt),
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
