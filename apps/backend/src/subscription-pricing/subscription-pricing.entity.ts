export interface SubscriptionPricingTier {
  priceCents: number;
  locations: number; // 0 = unlimited
  users: number; // 0 = unlimited
  features: string[];
}

export interface SubscriptionPricingFreeTier extends SubscriptionPricingTier {
  durationDays: number;
}

export interface SubscriptionPricingEntity {
  id: string;
  free: SubscriptionPricingFreeTier;
  starter: SubscriptionPricingTier;
  professional: SubscriptionPricingTier;
  enterprise: SubscriptionPricingTier;
  lifetime: SubscriptionPricingTier;
  updatedAt?: string;
  updatedBy?: string;
}

