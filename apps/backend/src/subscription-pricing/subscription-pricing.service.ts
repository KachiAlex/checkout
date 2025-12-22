import { Injectable } from '@nestjs/common';
import { SubscriptionPricingRepository } from './subscription-pricing.repository';
import { SubscriptionPricingEntity } from './subscription-pricing.entity';
import { UpdateSubscriptionPricingDto } from './dto/update-subscription-pricing.dto';

@Injectable()
export class SubscriptionPricingService {
  constructor(private readonly repository: SubscriptionPricingRepository) {}

  /**
   * Get the current subscription pricing configuration
   */
  async getPricing(): Promise<SubscriptionPricingEntity> {
    return this.repository.get();
  }

  /**
   * Update subscription pricing configuration
   * Only Super Admins can update pricing
   */
  async updatePricing(
    updates: UpdateSubscriptionPricingDto,
    userId?: string,
  ): Promise<SubscriptionPricingEntity> {
    const updateData: any = {
      ...updates,
      updatedBy: userId,
    };

    return this.repository.update(updateData);
  }
}
