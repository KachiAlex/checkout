import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsRepository, TenantRecord } from './tenants.repository';
import { UsersRepository } from '../users/users.repository';
import { TenantPlan, TenantStatus, UserRole } from '@pos-checkout/shared';

const normalizeSlug = (value: string) => value.trim().toLowerCase();
const generateDefaultPin = () => Math.floor(Math.random() * 900000 + 100000).toString();

@Injectable()
export class TenantsService {
  constructor(
    private readonly tenantsRepository: TenantsRepository,
    private readonly usersRepository: UsersRepository,
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

    const tenant = await this.tenantsRepository.create({
      name: dto.name.trim(),
      slug,
      plan: dto.plan,
      status: TenantStatus.PENDING,
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
      updatePayload.billingCycleStart = dto.billingCycleStart ? new Date(dto.billingCycleStart) : undefined;
    }

    if (dto.billingCycleEnd !== undefined) {
      updatePayload.billingCycleEnd = dto.billingCycleEnd ? new Date(dto.billingCycleEnd) : undefined;
    }

    return this.tenantsRepository.update(id, updatePayload);
  }
}

