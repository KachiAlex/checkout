import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsRepository, TenantRecord } from './tenants.repository';
import { UsersRepository } from '../users/users.repository';
import {
  TenantPlan,
  TenantStatus,
  UserRole,
  Industry,
  IndustryFeatureFlags,
} from '@pos-checkout/shared';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { ResetTenantAdminPinDto } from './dto/reset-tenant-admin-pin.dto';
import { SuspendTenantDto } from './dto/suspend-tenant.dto';
import { IndustryFeaturesService } from './industry-features.service';

const normalizeSlug = (value: string) => value.trim().toLowerCase();
const generateDefaultPin = () => Math.floor(Math.random() * 900000 + 100000).toString();

@Injectable()
export class TenantsService {
  constructor(
    private readonly tenantsRepository: TenantsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly industryFeaturesService: IndustryFeaturesService,
  ) {}

  async create(dto: CreateTenantDto): Promise<{
    tenant: TenantRecord;
    admin: { id: string; email: string; temporaryPin: string };
  }> {
    const slug = normalizeSlug(dto.slug);
    const existing = await this.tenantsRepository.findBySlug(slug);
    if (existing) {
      throw new BadRequestException('Tenant slug already in use');
    }

    const billingCycleStart = dto.billingCycleStart ? new Date(dto.billingCycleStart) : undefined;
    const shouldApplyBillingEnd = dto.plan !== TenantPlan.LIFETIME;
    const billingCycleEnd =
      dto.billingCycleEnd && shouldApplyBillingEnd ? new Date(dto.billingCycleEnd) : undefined;

    // Get industry and set default feature flags
    const industry = dto.industry || Industry.GENERAL;
    const featureFlags = this.industryFeaturesService.mergeFeatureFlags(industry, dto.featureFlags);

    const initialStatus = dto.plan === TenantPlan.FREE ? TenantStatus.ACTIVE : TenantStatus.PENDING;

    const tenant = await this.tenantsRepository.create({
      name: dto.name.trim(),
      slug,
      plan: dto.plan,
      status: initialStatus,
      industry,
      featureFlags,
      seatLimit: dto.seatLimit,
      contactEmail: dto.adminEmail.toLowerCase(),
      billingCycleStart,
      billingCycleEnd,
      metadata: {},
    });

    const temporaryPin = generateDefaultPin();
    const pinHash = await bcrypt.hash(temporaryPin, 10);

    const adminUser = await this.usersRepository.save({
      name: dto.adminName?.trim() || `${dto.name.trim()} Admin`,
      email: dto.adminEmail.toLowerCase(),
      role: UserRole.ADMIN,
      pinHash,
      tenantId: tenant.id,
      isPlatformAdmin: false,
    });

    return {
      tenant,
      admin: {
        id: adminUser.id,
        email: adminUser.email ?? dto.adminEmail.toLowerCase(),
        temporaryPin,
      },
    };
  }

  async findAll(): Promise<TenantRecord[]> {
    return this.tenantsRepository.findAll();
  }

  async findById(id: string): Promise<TenantRecord> {
    const tenant = await this.tenantsRepository.findById(id);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async findBySlug(slug: string): Promise<TenantRecord> {
    const tenant = await this.tenantsRepository.findBySlug(normalizeSlug(slug));
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto): Promise<TenantRecord> {
    const updatePayload: Partial<TenantRecord> = {};

    if (dto.slug) {
      const slug = normalizeSlug(dto.slug);
      const existing = await this.tenantsRepository.findBySlug(slug);
      if (existing && existing.id !== id) {
        throw new BadRequestException('Another tenant already uses this slug');
      }
      updatePayload.slug = slug;
    }

    if (dto.name) {
      updatePayload.name = dto.name.trim();
    }

    if (dto.adminEmail) {
      updatePayload.contactEmail = dto.adminEmail.toLowerCase();
    }

    if (dto.plan) {
      updatePayload.plan = dto.plan;
    }

    if (dto.status) {
      updatePayload.status = dto.status;
    }

    if (dto.seatLimit !== undefined) {
      updatePayload.seatLimit = dto.seatLimit;
    }

    if (dto.billingCycleStart !== undefined) {
      updatePayload.billingCycleStart = dto.billingCycleStart
        ? new Date(dto.billingCycleStart)
        : undefined;
    }

    if (dto.billingCycleEnd !== undefined) {
      updatePayload.billingCycleEnd = dto.billingCycleEnd
        ? new Date(dto.billingCycleEnd)
        : undefined;
    }

    return this.tenantsRepository.update(id, updatePayload);
  }

  async updateSubscription(id: string, dto: UpdateSubscriptionDto): Promise<TenantRecord> {
    const tenant = await this.findById(id);
    const updatePayload: Partial<TenantRecord> = {};
    const nextPlan = dto.plan ?? tenant.plan;

    if (dto.plan) {
      updatePayload.plan = dto.plan;
    }

    if (dto.seatLimit !== undefined) {
      updatePayload.seatLimit = dto.seatLimit;
    }

    if (dto.billingCycleStart !== undefined) {
      updatePayload.billingCycleStart = dto.billingCycleStart
        ? new Date(dto.billingCycleStart)
        : undefined;
    }

    if (dto.billingCycleEnd !== undefined || nextPlan === TenantPlan.LIFETIME) {
      updatePayload.billingCycleEnd =
        nextPlan === TenantPlan.LIFETIME
          ? undefined
          : dto.billingCycleEnd
            ? new Date(dto.billingCycleEnd)
            : undefined;
    }

    return this.tenantsRepository.update(id, updatePayload);
  }

  async resetAdminPin(
    id: string,
    dto: ResetTenantAdminPinDto,
  ): Promise<{ tenantId: string; adminUserId: string; adminEmail?: string; temporaryPin: string }> {
    const tenant = await this.findById(id);

    let adminUser =
      dto.adminEmail !== undefined
        ? await this.usersRepository.findByEmailForTenant(dto.adminEmail, tenant.id)
        : null;

    if (!adminUser) {
      adminUser = await this.usersRepository.findByRole(UserRole.ADMIN, tenant.id);
    }

    if (!adminUser) {
      throw new NotFoundException('No tenant admin found to reset PIN');
    }

    const temporaryPin = generateDefaultPin();
    const pinHash = await bcrypt.hash(temporaryPin, 10);
    await this.usersRepository.update(adminUser.id, { pinHash });

    return {
      tenantId: tenant.id,
      adminUserId: adminUser.id,
      adminEmail: adminUser.email ?? tenant.contactEmail,
      temporaryPin,
    };
  }

  async suspend(id: string, dto: SuspendTenantDto): Promise<TenantRecord> {
    const tenant = await this.findById(id);

    const metadata = {
      ...(tenant.metadata ?? {}),
      suspensionReason: dto.reason ?? 'Suspended by platform administrator',
      suspendedAt: new Date().toISOString(),
    };

    return this.tenantsRepository.update(id, {
      status: TenantStatus.SUSPENDED,
      metadata,
    });
  }

  async activate(id: string): Promise<TenantRecord> {
    const tenant = await this.findById(id);
    const metadata = { ...(tenant.metadata ?? {}) };
    delete metadata.suspensionReason;
    delete metadata.suspendedAt;

    return this.tenantsRepository.update(id, {
      status: TenantStatus.ACTIVE,
      metadata,
    });
  }

  async deleteTenant(id: string): Promise<{ tenantId: string; removedUsers: number }> {
    await this.findById(id);

    const removedUsers = await this.usersRepository.deleteByTenantId(id);
    await this.tenantsRepository.delete(id);

    return {
      tenantId: id,
      removedUsers,
    };
  }

  async getFeatureFlags(tenantId: string): Promise<IndustryFeatureFlags> {
    const tenant = await this.findById(tenantId);
    const industry = (tenant.industry as Industry) ?? Industry.GENERAL;
    return this.industryFeaturesService.mergeFeatureFlags(industry, tenant.featureFlags);
  }
}
