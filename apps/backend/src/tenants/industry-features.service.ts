import { Injectable } from '@nestjs/common';
import { Industry, IndustryFeatureFlags } from '@pos-checkout/shared';

@Injectable()
export class IndustryFeaturesService {
  /**
   * Get default feature flags based on industry
   */
  getDefaultFeatureFlags(industry: Industry): IndustryFeatureFlags {
    switch (industry) {
      case Industry.PHARMACEUTICAL:
        return {
          expiryTracking: true,
          batchTracking: true,
          prescriptionManagement: true,
          drugInteractionWarnings: false, // Can be enabled later
          prescriptionRefills: false, // Can be enabled later
          variantManagement: true,
          multiLocation: true,
          advancedReports: true,
        };

      case Industry.RESTAURANT:
        return {
          tableManagement: true,
          kitchenOrders: true,
          menuModifiers: true,
          splitBills: true,
          reservations: false, // Can be enabled later
          variantManagement: true,
          multiLocation: true,
          advancedReports: true,
        };

      case Industry.RETAIL:
        return {
          variantManagement: true,
          layaway: false, // Can be enabled later
          giftCards: false, // Can be enabled later
          loyaltyPrograms: false, // Can be enabled later
          multiLocation: true,
          advancedReports: true,
        };

      case Industry.GROCERY:
        return {
          expiryTracking: true,
          batchTracking: true,
          variantManagement: true,
          multiLocation: true,
          advancedReports: true,
        };

      case Industry.ELECTRONICS:
      case Industry.FASHION:
      case Industry.HARDWARE:
        return {
          variantManagement: true,
          multiLocation: true,
          advancedReports: true,
        };

      case Industry.GENERAL:
      default:
        return {
          variantManagement: true,
          multiLocation: true,
          advancedReports: false,
        };
    }
  }

  /**
   * Merge custom feature flags with defaults
   */
  mergeFeatureFlags(
    industry: Industry,
    customFlags?: Partial<IndustryFeatureFlags>,
  ): IndustryFeatureFlags {
    const defaults = this.getDefaultFeatureFlags(industry);
    return {
      ...defaults,
      ...customFlags,
    };
  }

  /**
   * Check if a specific feature is enabled for a tenant
   */
  isFeatureEnabled(
    featureFlags: IndustryFeatureFlags | undefined,
    feature: keyof IndustryFeatureFlags,
  ): boolean {
    if (!featureFlags) {
      return false;
    }
    return featureFlags[feature] === true;
  }

  /**
   * Get industry-specific features list
   */
  getIndustryFeatures(industry: Industry): string[] {
    const flags = this.getDefaultFeatureFlags(industry);
    return Object.entries(flags)
      .filter(([_, enabled]) => enabled === true)
      .map(([feature]) => feature);
  }
}

