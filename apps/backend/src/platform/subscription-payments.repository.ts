import { Injectable, NotFoundException } from '@nestjs/common';
import { FieldValue, Timestamp, Query } from 'firebase-admin/firestore';
import { PaymentStatus, TenantPlan } from '@pos-checkout/shared';
import { FirestoreService } from '../firestore/firestore.service';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';

export interface SubscriptionPaymentRecord {
  id: string;
  tenantId: string;
  tenantSlug: string;
  plan: TenantPlan;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  transactionId?: string;
  checkoutUrl?: string;
  processorData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  paidAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type TimestampField = Timestamp | FieldValue | null | undefined;

type SubscriptionPaymentDocument = Omit<SubscriptionPaymentRecord, 'id' | 'paidAt' | 'createdAt' | 'updatedAt'> & {
  paidAt?: TimestampField;
  createdAt?: TimestampField;
  updatedAt?: TimestampField;
};

export interface CreateSubscriptionPaymentInput {
  id?: string;
  tenantId: string;
  tenantSlug: string;
  plan: TenantPlan;
  amountCents: number;
  currency?: string;
  status?: PaymentStatus;
  transactionId?: string;
  checkoutUrl?: string;
  processorData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  paidAt?: Date;
}

export interface UpdateSubscriptionPaymentInput {
  status?: PaymentStatus;
  transactionId?: string | null;
  checkoutUrl?: string | null;
  processorData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  paidAt?: Date | null;
}

export interface SubscriptionPaymentFilter {
  tenantId?: string;
  tenantIds?: string[];
  status?: PaymentStatus;
  from?: Date;
  to?: Date;
}

@Injectable()
export class SubscriptionPaymentsRepository {
  private readonly collection =
    this.firestore.collection<SubscriptionPaymentDocument>('subscription_payments');

  constructor(
    private readonly firestore: FirestoreService,
    private readonly prismaService: PrismaService,
  ) {}

  private isPostgresEnabled() {
    return (process.env.DB_PROVIDER || '').toLowerCase() === 'postgres';
  }

  async create(data: CreateSubscriptionPaymentInput): Promise<SubscriptionPaymentRecord> {
    const payload = {
      tenantId: data.tenantId,
      tenantSlug: data.tenantSlug,
      plan: data.plan,
      amountCents: data.amountCents,
      currency: data.currency ?? 'NGN',
      status: data.status ?? PaymentStatus.PROCESSING,
      transactionId: data.transactionId,
      checkoutUrl: data.checkoutUrl,
      processorData: data.processorData,
      metadata: data.metadata,
      paidAt: data.paidAt ?? null,
    };

    if (this.isPostgresEnabled()) {
      const row = await this.prismaService.prisma.subscriptionPayment.create({
        data: this.toPrismaCreateInput(data),
      });
      return this.toRecord(row);
    }

    const now = FieldValue.serverTimestamp();
    const docRef = data.id ? this.collection.doc(data.id) : this.collection.doc();
    await docRef.set({
      ...payload,
      paidAt: payload.paidAt ? Timestamp.fromDate(payload.paidAt) : null,
      createdAt: now,
      updatedAt: now,
    });
    const snapshot = await docRef.get();
    return this.toRecord({ id: snapshot.id, ...(snapshot.data() as SubscriptionPaymentDocument) });
  }

  async update(
    id: string,
    update: UpdateSubscriptionPaymentInput,
  ): Promise<SubscriptionPaymentRecord> {
    if (this.isPostgresEnabled()) {
      const row = await this.prismaService.prisma.subscriptionPayment.update({
        where: { id },
        data: this.toPrismaUpdateInput(update),
      });
      return this.toRecord(row);
    }

    const docRef = this.collection.doc(id);
    const existing = await docRef.get();
    if (!existing.exists) {
      throw new NotFoundException(`Subscription payment ${id} not found`);
    }

    const payload: Partial<SubscriptionPaymentDocument> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (update.status !== undefined) payload.status = update.status;
    if (update.transactionId !== undefined) payload.transactionId = update.transactionId;
    if (update.checkoutUrl !== undefined) payload.checkoutUrl = update.checkoutUrl;
    if (update.processorData !== undefined) payload.processorData = update.processorData;
    if (update.metadata !== undefined) payload.metadata = update.metadata;
    if (update.paidAt !== undefined) {
      payload.paidAt = update.paidAt ? Timestamp.fromDate(update.paidAt) : null;
    }

    await docRef.set(payload, { merge: true });
    const snapshot = await docRef.get();
    return this.toRecord({ id: snapshot.id, ...(snapshot.data() as SubscriptionPaymentDocument) });
  }

  async findById(id: string): Promise<SubscriptionPaymentRecord | null> {
    if (this.isPostgresEnabled()) {
      const row = await this.prismaService.prisma.subscriptionPayment.findUnique({
        where: { id },
      });
      return row ? this.toRecord(row) : null;
    }

    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return this.toRecord({ id: doc.id, ...doc.data() });
  }

  async findByTransactionId(transactionId: string): Promise<SubscriptionPaymentRecord | null> {
    if (this.isPostgresEnabled()) {
      const row = await this.prismaService.prisma.subscriptionPayment.findFirst({
        where: { transactionId },
      });
      return row ? this.toRecord(row) : null;
    }

    const snapshot = await this.collection.where('transactionId', '==', transactionId).limit(1).get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return this.toRecord({ id: doc.id, ...doc.data() });
  }

  async list(filter: SubscriptionPaymentFilter = {}): Promise<SubscriptionPaymentRecord[]> {
    if (this.isPostgresEnabled()) {
      const rows = await this.prismaService.prisma.subscriptionPayment.findMany({
        where: {
          tenantId: filter.tenantIds?.length
            ? { in: filter.tenantIds }
            : filter.tenantId
              ? filter.tenantId
              : undefined,
          status: filter.status ? (filter.status as Prisma.PaymentStatus) : undefined,
          paidAt:
            filter.from || filter.to
              ? {
                  gte: filter.from ?? undefined,
                  lte: filter.to ?? undefined,
                }
              : undefined,
        },
        orderBy: {
          paidAt: 'desc',
        },
      });
      return rows.map((row) => this.toRecord(row));
    }

    let query: Query<SubscriptionPaymentDocument> = this.collection;
    if (filter.tenantId) {
      query = query.where('tenantId', '==', filter.tenantId);
    }
    if (filter.status) {
      query = query.where('status', '==', filter.status);
    }

    const snapshot = await query.get();
    const records = snapshot.docs.map((doc) =>
      this.toRecord({ id: doc.id, ...(doc.data() as SubscriptionPaymentDocument) }),
    );

    return records.filter((record) => {
      if (filter.tenantIds?.length && !filter.tenantIds.includes(record.tenantId)) {
        return false;
      }
      if (filter.from && this.getEffectiveDate(record) < filter.from) {
        return false;
      }
      if (filter.to && this.getEffectiveDate(record) > filter.to) {
        return false;
      }
      return true;
    });
  }

  private toPrismaCreateInput(
    data: CreateSubscriptionPaymentInput,
  ): Prisma.SubscriptionPaymentUncheckedCreateInput {
    return {
      id: data.id,
      tenantId: data.tenantId,
      tenantSlug: data.tenantSlug,
      plan: data.plan as Prisma.TenantPlan,
      amountCents: data.amountCents,
      currency: data.currency ?? 'NGN',
      status: (data.status ?? PaymentStatus.PROCESSING) as Prisma.PaymentStatus,
      transactionId: data.transactionId ?? undefined,
      checkoutUrl: data.checkoutUrl ?? undefined,
      processorData: this.toJsonValue(data.processorData),
      metadata: this.toJsonValue(data.metadata),
      paidAt: data.paidAt ?? undefined,
    };
  }

  private toPrismaUpdateInput(
    update: UpdateSubscriptionPaymentInput,
  ): Prisma.SubscriptionPaymentUncheckedUpdateInput {
    const payload: Prisma.SubscriptionPaymentUncheckedUpdateInput = {};

    if (update.status !== undefined) {
      payload.status = update.status as Prisma.PaymentStatus;
    }
    if (update.transactionId !== undefined) {
      payload.transactionId = update.transactionId;
    }
    if (update.checkoutUrl !== undefined) {
      payload.checkoutUrl = update.checkoutUrl;
    }
    if (update.processorData !== undefined) {
      payload.processorData = this.toJsonValue(update.processorData);
    }
    if (update.metadata !== undefined) {
      payload.metadata = this.toJsonValue(update.metadata);
    }
    if (update.paidAt !== undefined) {
      payload.paidAt = update.paidAt ?? null;
    }

    return payload;
  }

  private toJsonValue(value?: Record<string, unknown>): Prisma.JsonValue | undefined {
    return value === undefined ? undefined : (value as Prisma.JsonValue);
  }

  private toRecord(data: any): SubscriptionPaymentRecord {
    if (!data) {
      throw new NotFoundException('Subscription payment document has no data');
    }
    return {
      id: data.id,
      tenantId: data.tenantId,
      tenantSlug: data.tenantSlug,
      plan: data.plan,
      amountCents: data.amountCents,
      currency: data.currency ?? 'NGN',
      status: data.status,
      transactionId: data.transactionId ?? undefined,
      checkoutUrl: data.checkoutUrl ?? undefined,
      processorData: data.processorData ?? undefined,
      metadata: data.metadata ?? undefined,
      paidAt: this.timestampToDate(data.paidAt),
      createdAt: this.timestampToDate(data.createdAt) ?? new Date(),
      updatedAt: this.timestampToDate(data.updatedAt) ?? new Date(),
    };
  }

  private timestampToDate(value?: TimestampField | Date): Date | null {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return value;
    }
    if (value instanceof Timestamp) {
      return value.toDate();
    }
    return null;
  }

  private getEffectiveDate(record: SubscriptionPaymentRecord): Date {
    return record.paidAt ?? record.updatedAt ?? record.createdAt;
  }
}
