import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { TenantPlan, TenantStatus, Industry, IndustryFeatureFlags } from '@pos-checkout/shared';
import { FirestoreService } from '../firestore/firestore.service';

export interface TenantRecord {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  industry?: Industry;
  featureFlags?: IndustryFeatureFlags;
  seatLimit?: number;
  contactEmail?: string;
  billingCycleStart?: Date;
  billingCycleEnd?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

type TimestampField = Timestamp | FieldValue | null | undefined;

type TenantDocument = Omit<TenantRecord, 'id' | 'createdAt' | 'updatedAt' | 'billingCycleStart' | 'billingCycleEnd'> & {
  createdAt?: TimestampField;
  updatedAt?: TimestampField;
  billingCycleStart?: TimestampField;
  billingCycleEnd?: TimestampField;
};

@Injectable()
export class TenantsRepository {
  private readonly collection = this.firestore.collection<TenantDocument>('tenants');

  constructor(private readonly firestore: FirestoreService) {}

  async findAll(): Promise<TenantRecord[]> {
    const snapshot = await this.collection.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
  }

  async findById(id: string): Promise<TenantRecord | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return this.toRecord(doc.id, doc.data() as TenantDocument);
  }

  async findBySlug(slug: string): Promise<TenantRecord | null> {
    const snapshot = await this.collection.where('slug', '==', slug).limit(1).get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return this.toRecord(doc.id, doc.data() as TenantDocument);
  }

  async create(data: Omit<TenantRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<TenantRecord> {
    if (!data.name || !data.slug) {
      throw new BadRequestException('Tenant name and slug are required');
    }

    const now = FieldValue.serverTimestamp();
    const payload: TenantDocument = {
      name: data.name,
      slug: data.slug,
      plan: data.plan,
      status: data.status,
      industry: data.industry,
      featureFlags: data.featureFlags,
      seatLimit: data.seatLimit,
      contactEmail: data.contactEmail,
      billingCycleStart: data.billingCycleStart ? Timestamp.fromDate(data.billingCycleStart) : undefined,
      billingCycleEnd: data.billingCycleEnd ? Timestamp.fromDate(data.billingCycleEnd) : undefined,
      metadata: data.metadata,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.collection.add(payload);
    const created = await docRef.get();
    return this.toRecord(created.id, created.data() as TenantDocument);
  }

  async update(id: string, update: Partial<Omit<TenantRecord, 'id' | 'createdAt' | 'updatedAt'>>): Promise<TenantRecord> {
    const docRef = this.collection.doc(id);
    const existing = await docRef.get();
    if (!existing.exists) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }

    const payload: Partial<TenantDocument> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (update.name !== undefined) {
      payload.name = update.name;
    }
    if (update.slug !== undefined) {
      payload.slug = update.slug;
    }
    if (update.plan !== undefined) {
      payload.plan = update.plan;
    }
    if (update.status !== undefined) {
      payload.status = update.status;
    }
    if (update.seatLimit !== undefined) {
      payload.seatLimit = update.seatLimit;
    }
    if (update.contactEmail !== undefined) {
      payload.contactEmail = update.contactEmail;
    }
    if (update.industry !== undefined) {
      payload.industry = update.industry;
    }
    if (update.featureFlags !== undefined) {
      payload.featureFlags = update.featureFlags;
    }
    if (update.metadata !== undefined) {
      payload.metadata = update.metadata;
    }
    if (update.billingCycleStart !== undefined) {
      payload.billingCycleStart = update.billingCycleStart
        ? Timestamp.fromDate(update.billingCycleStart)
        : null;
    }
    if (update.billingCycleEnd !== undefined) {
      payload.billingCycleEnd = update.billingCycleEnd ? Timestamp.fromDate(update.billingCycleEnd) : null;
    }

    await docRef.set(payload, { merge: true });

    const updated = await docRef.get();
    return this.toRecord(updated.id, updated.data() as TenantDocument);
  }

  async delete(id: string): Promise<void> {
    const docRef = this.collection.doc(id);
    const existing = await docRef.get();
    if (!existing.exists) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }
    await docRef.delete();
  }

  private toRecord(id: string, data: TenantDocument | undefined): TenantRecord {
    if (!data) {
      throw new NotFoundException(`Tenant document ${id} has no data`);
    }

    return {
      id,
      name: data.name,
      slug: data.slug,
      plan: data.plan,
      status: data.status,
      industry: data.industry,
      featureFlags: data.featureFlags,
      seatLimit: data.seatLimit,
      contactEmail: data.contactEmail,
      billingCycleStart: this.timestampToDate(data.billingCycleStart),
      billingCycleEnd: this.timestampToDate(data.billingCycleEnd),
      metadata: data.metadata,
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

