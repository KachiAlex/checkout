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
export declare class TenantsRepository {
    private readonly firestore;
    private readonly collection;
    constructor(firestore: FirestoreService);
    findAll(): Promise<TenantRecord[]>;
    findById(id: string): Promise<TenantRecord | null>;
    findBySlug(slug: string): Promise<TenantRecord | null>;
    create(data: Omit<TenantRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<TenantRecord>;
    update(id: string, update: Partial<Omit<TenantRecord, 'id' | 'createdAt' | 'updatedAt'>>): Promise<TenantRecord>;
    private toRecord;
    private timestampToDate;
}
