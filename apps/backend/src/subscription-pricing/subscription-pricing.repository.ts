import { Injectable } from '@nestjs/common';
import { FirestoreService } from '../firestore/firestore.service';
import { PrismaService } from '../database/prisma.service';
import { SubscriptionPricingEntity } from './subscription-pricing.entity';

const COLLECTION = 'subscription_pricing';
const DEFAULT_DOC_ID = 'default';

@Injectable()
export class SubscriptionPricingRepository {
  constructor(
    private readonly firestore: FirestoreService,
    private readonly prismaService: PrismaService,
  ) {}

  private isPostgresEnabled(): boolean {
    return (process.env.DB_PROVIDER || '').toLowerCase() === 'postgres';
  }

  /**
   * Get the default subscription pricing configuration
   * If it doesn't exist, returns default values
   */
  async get(): Promise<SubscriptionPricingEntity> {
    if (this.isPostgresEnabled()) {
      const row = await this.prismaService.prisma.subscriptionPricing.findUnique({
        where: { id: DEFAULT_DOC_ID },
      });

      if (!row) {
        return this.getDefaultPricing();
      }

      return {
        id: row.id,
        free: row.free as any,
        starter: row.starter as any,
        professional: row.professional as any,
        enterprise: row.enterprise as any,
        lifetime: row.lifetime as any,
        updatedAt: row.updatedAt ? row.updatedAt.toISOString() : undefined,
        updatedBy: row.updatedBy ?? undefined,
      };
    }

    const docRef = this.firestore.collection(COLLECTION).doc(DEFAULT_DOC_ID);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      // Return default pricing if not configured
      return this.getDefaultPricing();
    }

    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...data,
    } as SubscriptionPricingEntity;
  }

  /**
   * Update the subscription pricing configuration
   */
  async update(updates: Partial<SubscriptionPricingEntity>): Promise<SubscriptionPricingEntity> {
    // Get current config
    const current = await this.get();

    // Merge updates with current config
    const updated: SubscriptionPricingEntity = {
      ...current,
      ...updates,
      free: { ...current.free, ...(updates.free || {}) },
      starter: { ...current.starter, ...(updates.starter || {}) },
      professional: { ...current.professional, ...(updates.professional || {}) },
      enterprise: { ...current.enterprise, ...(updates.enterprise || {}) },
      lifetime: { ...current.lifetime, ...(updates.lifetime || {}) },
      updatedAt: new Date().toISOString(),
    };

    if (this.isPostgresEnabled()) {
      await this.prismaService.prisma.subscriptionPricing.upsert({
        where: { id: DEFAULT_DOC_ID },
        update: {
          free: updated.free as any,
          starter: updated.starter as any,
          professional: updated.professional as any,
          enterprise: updated.enterprise as any,
          lifetime: updated.lifetime as any,
          updatedAt: updated.updatedAt ? new Date(updated.updatedAt) : undefined,
          updatedBy: updated.updatedBy,
        },
        create: {
          id: DEFAULT_DOC_ID,
          free: updated.free as any,
          starter: updated.starter as any,
          professional: updated.professional as any,
          enterprise: updated.enterprise as any,
          lifetime: updated.lifetime as any,
          updatedAt: updated.updatedAt ? new Date(updated.updatedAt) : undefined,
          updatedBy: updated.updatedBy,
        },
      });
      return updated;
    }

    const docRef = this.firestore.collection(COLLECTION).doc(DEFAULT_DOC_ID);
    await docRef.set(updated);

    return updated;
  }

  /**
   * Returns default pricing configuration
   */
  private getDefaultPricing(): SubscriptionPricingEntity {
    return {
      id: DEFAULT_DOC_ID,
      free: {
        priceCents: 0,
        durationDays: 14,
        locations: 1,
        users: 1,
        features: ['Basic POS', 'Inventory Management', '14-day trial'],
      },
      starter: {
        priceCents: 1999, // $19.99/month
        locations: 1,
        users: 3,
        features: [
          'All Free features',
          'Multi-user support',
          'Basic reports',
          'Email support',
        ],
      },
      professional: {
        priceCents: 4999, // $49.99/month
        locations: 3,
        users: 10,
        features: [
          'All Starter features',
          'Multi-location support',
          'Advanced reports',
          'Priority support',
          'Custom branding',
        ],
      },
      enterprise: {
        priceCents: 9999, // $99.99/month
        locations: 0, // unlimited
        users: 0, // unlimited
        features: [
          'All Professional features',
          'Unlimited locations',
          'Unlimited users',
          'API access',
          'Dedicated support',
          'Custom integrations',
        ],
      },
      lifetime: {
        priceCents: 49999, // $499.99 one-time
        locations: 0, // unlimited
        users: 0, // unlimited
        features: [
          'All Enterprise features',
          'Lifetime access',
          'No recurring fees',
          'Priority updates',
        ],
      },
    };
  }
}

