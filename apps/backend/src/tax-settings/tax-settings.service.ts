import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantsRepository } from '../tenants/tenants.repository';
import { UpdateTaxSettingsDto } from './dto/update-tax-settings.dto';

export interface TaxSettings {
  description?: string;
  percentage?: number;
  enabled: boolean;
}

@Injectable()
export class TaxSettingsService {
  constructor(private readonly tenantsRepository: TenantsRepository) {}

  private ensureSettings(settings?: TaxSettings): TaxSettings {
    return {
      enabled: settings?.enabled ?? false,
      description: settings?.description,
      percentage: settings?.percentage,
    };
  }

  async getTaxSettings(tenantId: string): Promise<TaxSettings> {
    const tenant = await this.tenantsRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return this.ensureSettings(tenant.metadata?.taxSettings as TaxSettings | undefined);
  }

  async updateTaxSettings(tenantId: string, dto: UpdateTaxSettingsDto): Promise<TaxSettings> {
    const tenant = await this.tenantsRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const currentSettings = this.ensureSettings(tenant.metadata?.taxSettings as TaxSettings | undefined);
    const updatedSettings: TaxSettings = {
      ...currentSettings,
      enabled: dto.enabled ?? currentSettings.enabled ?? false,
    };

    // Only update fields that are provided (not undefined)
    if (dto.description !== undefined) {
      updatedSettings.description = dto.description;
    }
    if (dto.percentage !== undefined) {
      updatedSettings.percentage = dto.percentage;
    }

    // Update tenant metadata
    const updatedTenant = await this.tenantsRepository.update(tenantId, {
      metadata: {
        ...tenant.metadata,
        taxSettings: updatedSettings,
      },
    });

    return this.ensureSettings(updatedTenant.metadata?.taxSettings as TaxSettings | undefined);
  }
}

