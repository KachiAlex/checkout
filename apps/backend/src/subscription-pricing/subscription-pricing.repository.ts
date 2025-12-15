import { Injectable } from '@nestjs/common';
import { FirestoreService } from '../firestore/firestore.service';
import { SubscriptionPricingEntity } from './subscription-pricing.entity';

const COLLECTION = 'subscription_pricing';
const DEFAULT_DOC_ID = 'default';

@Injectable()
export class SubscriptionPricingRepository {
  constructor(private readonly firestore: FirestoreService) {}

  /**
   * Get the default subscription pricing configuration
   * If it doesn't exist, returns default values
   */
  async get(): Promise<SubscriptionPricingEntity> {
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
    const docRef = this.firestore.collection(COLLECTION).doc(DEFAULT_DOC_ID);

    // Get current config
    const current = await this.get();

    // Merge updates with current config
    const updated = {
      ...current,
      ...updates,
      free: { ...current.free, ...(updates.free || {}) },
      starter: { ...current.starter, ...(updates.starter || {}) },
      professional: { ...current.professional, ...(updates.professional || {}) },
      enterprise: { ...current.enterprise, ...(updates.enterprise || {}) },
      lifetime: { ...current.lifetime, ...(updates.lifetime || {}) },
      updatedAt: new Date().toISOString(),
    };

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

