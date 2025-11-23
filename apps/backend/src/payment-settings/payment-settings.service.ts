import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantsRepository } from '../tenants/tenants.repository';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';

export interface PaymentSettings {
  monnifyApiKey?: string;
  monnifySecretKey?: string;
  monnifyContractCode?: string;
  monnifyWebhookSecret?: string;
  monnifyEnabled: boolean;
}

@Injectable()
export class PaymentSettingsService {
  constructor(private readonly tenantsRepository: TenantsRepository) {}

  private ensureSettings(settings?: PaymentSettings): PaymentSettings {
    return {
      monnifyEnabled: settings?.monnifyEnabled ?? false,
      monnifyApiKey: settings?.monnifyApiKey,
      monnifySecretKey: settings?.monnifySecretKey,
      monnifyContractCode: settings?.monnifyContractCode,
      monnifyWebhookSecret: settings?.monnifyWebhookSecret,
    };
  }

  private maskSettings(settings: PaymentSettings): PaymentSettings {
    return {
      monnifyEnabled: settings.monnifyEnabled ?? false,
      monnifyApiKey: settings.monnifyApiKey
        ? `${settings.monnifyApiKey.substring(0, 8)}...`
        : undefined,
      monnifySecretKey: settings.monnifySecretKey
        ? `${settings.monnifySecretKey.substring(0, 8)}...`
        : undefined,
      monnifyContractCode: settings.monnifyContractCode,
      monnifyWebhookSecret: settings.monnifyWebhookSecret
        ? `${settings.monnifyWebhookSecret.substring(0, 8)}...`
        : undefined,
    };
  }

  async getPaymentSettings(tenantId: string): Promise<PaymentSettings> {
    const tenant = await this.tenantsRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const paymentSettings = this.ensureSettings(tenant.metadata?.paymentSettings as PaymentSettings | undefined);

    return this.maskSettings(paymentSettings);
  }

  async updatePaymentSettings(tenantId: string, dto: UpdatePaymentSettingsDto): Promise<PaymentSettings> {
    const tenant = await this.tenantsRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const currentSettings = this.ensureSettings(tenant.metadata?.paymentSettings as PaymentSettings | undefined);
    const updatedSettings: PaymentSettings = {
      ...currentSettings,
      monnifyEnabled: dto.monnifyEnabled ?? currentSettings.monnifyEnabled ?? false,
    };

    // Only update fields that are provided (not undefined)
    if (dto.monnifyApiKey !== undefined) {
      updatedSettings.monnifyApiKey = dto.monnifyApiKey;
    }
    if (dto.monnifySecretKey !== undefined) {
      updatedSettings.monnifySecretKey = dto.monnifySecretKey;
    }
    if (dto.monnifyContractCode !== undefined) {
      updatedSettings.monnifyContractCode = dto.monnifyContractCode;
    }
    if (dto.monnifyWebhookSecret !== undefined) {
      updatedSettings.monnifyWebhookSecret = dto.monnifyWebhookSecret;
    }

    // Update tenant metadata
    const updatedTenant = await this.tenantsRepository.update(tenantId, {
      metadata: {
        ...tenant.metadata,
        paymentSettings: updatedSettings,
      },
    });

    const savedSettings = this.ensureSettings(updatedTenant.metadata?.paymentSettings as PaymentSettings | undefined);

    // Return with masked keys
    return this.maskSettings(savedSettings);
  }

  /**
   * Get full payment settings (with unmasked keys) for internal use
   */
  async getFullPaymentSettings(tenantId: string): Promise<PaymentSettings | null> {
    const tenant = await this.tenantsRepository.findById(tenantId);
    if (!tenant) {
      return null;
    }

    const paymentSettings = this.ensureSettings(tenant.metadata?.paymentSettings as PaymentSettings | undefined);
    
    // Return null if Monnify is not enabled or credentials are missing
    if (!paymentSettings.monnifyEnabled) {
      return null;
    }

    if (
      !paymentSettings.monnifyApiKey ||
      !paymentSettings.monnifySecretKey ||
      !paymentSettings.monnifyContractCode
    ) {
      return null;
    }

    return paymentSettings;
  }
}

