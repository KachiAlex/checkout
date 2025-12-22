import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantsRepository } from '../tenants/tenants.repository';
import { UpdateCustomizationDto } from './dto/update-customization.dto';

export interface ReceiptCustomization {
  companyName?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  headerInfo?: string;
  footerMessage?: string;
}

@Injectable()
export class CustomizationService {
  constructor(private readonly tenantsRepository: TenantsRepository) {}

  private ensureCustomization(customization?: ReceiptCustomization): ReceiptCustomization {
    return {
      companyName: customization?.companyName,
      logoUrl: customization?.logoUrl,
      address: customization?.address,
      phone: customization?.phone,
      email: customization?.email,
      website: customization?.website,
      headerInfo: customization?.headerInfo,
      footerMessage: customization?.footerMessage || 'Thank you for your purchase!',
    };
  }

  async getCustomization(tenantId: string): Promise<ReceiptCustomization> {
    const tenant = await this.tenantsRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return this.ensureCustomization(
      tenant.metadata?.receiptCustomization as ReceiptCustomization | undefined,
    );
  }

  async updateCustomization(
    tenantId: string,
    dto: UpdateCustomizationDto,
  ): Promise<ReceiptCustomization> {
    const tenant = await this.tenantsRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const currentCustomization = this.ensureCustomization(
      tenant.metadata?.receiptCustomization as ReceiptCustomization | undefined,
    );

    const updatedCustomization: ReceiptCustomization = {
      ...currentCustomization,
    };

    // Only update fields that are provided (not undefined)
    if (dto.companyName !== undefined) {
      updatedCustomization.companyName = dto.companyName;
    }
    if (dto.logoUrl !== undefined) {
      updatedCustomization.logoUrl = dto.logoUrl;
    }
    if (dto.address !== undefined) {
      updatedCustomization.address = dto.address;
    }
    if (dto.phone !== undefined) {
      updatedCustomization.phone = dto.phone;
    }
    if (dto.email !== undefined) {
      updatedCustomization.email = dto.email;
    }
    if (dto.website !== undefined) {
      updatedCustomization.website = dto.website;
    }
    if (dto.headerInfo !== undefined) {
      updatedCustomization.headerInfo = dto.headerInfo;
    }
    if (dto.footerMessage !== undefined) {
      updatedCustomization.footerMessage = dto.footerMessage;
    }

    // Update tenant metadata
    const updatedTenant = await this.tenantsRepository.update(tenantId, {
      metadata: {
        ...tenant.metadata,
        receiptCustomization: updatedCustomization,
      },
    });

    return this.ensureCustomization(
      updatedTenant.metadata?.receiptCustomization as ReceiptCustomization | undefined,
    );
  }
}
