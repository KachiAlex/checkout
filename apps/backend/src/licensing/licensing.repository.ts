import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { License, LicenseAudit, DeviceRegistration } from '@prisma/client';
import { QueryLicensesDto } from './dto/update-license.dto';

@Injectable()
export class LicensingRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new license
   */
  async createLicense(data: {
    businessId: string;
    tenantId: string;
    licenseKey: string;
    desktopKey: string;
    activationKey: string;
    businessName: string;
    tier: string;
    expiryDate: Date;
    maxDevices: number;
    maxUsers?: number;
    maxLocations?: number;
    offlineEnabled: boolean;
    backupEnabled: boolean;
    features: string[];
    offlineGracePeriod: number;
    backupRetentionDays: number;
    createdBy: string;
    updatedBy: string;
  }): Promise<License> {
    return this.prisma.license.create({
      data: {
        businessId: data.businessId,
        tenantId: data.tenantId,
        licenseKey: data.licenseKey,
        businessName: data.businessName,
        expiryDate: data.expiryDate,
        hardwareIds: [],
        maxDevices: data.maxDevices,
        allowHardwareChange: false,
        tier: data.tier as any, // Cast to enum value
        features: data.features,
        maxUsers: data.maxUsers || 5,
        maxLocations: data.maxLocations || 1,
        offlineEnabled: data.offlineEnabled,
        desktopKey: data.desktopKey,
        offlineGracePeriod: data.offlineGracePeriod,
        backupEnabled: data.backupEnabled,
        backupRetentionDays: data.backupRetentionDays,
        backupStorageProvider: 'firebase',
        activationKey: data.activationKey,
        status: 'PENDING' as any, // Cast to enum value
        isActivated: false,
        createdBy: data.createdBy,
        updatedBy: data.updatedBy,
      },
    });
  }

  /**
   * Find license by ID
   */
  async findById(id: string): Promise<License | null> {
    return this.prisma.license.findUnique({
      where: { id },
    });
  }

  /**
   * Find license by license key
   */
  async findByLicenseKey(licenseKey: string): Promise<License | null> {
    return this.prisma.license.findUnique({
      where: { licenseKey },
    });
  }

  /**
   * Find license by desktop key
   */
  async findByDesktopKey(desktopKey: string): Promise<License | null> {
    return this.prisma.license.findUnique({
      where: { desktopKey },
    });
  }

  /**
   * Find by tenant ID
   */
  async findByTenantId(tenantId: string): Promise<License | null> {
    return this.prisma.license.findFirst({
      where: { tenantId },
    });
  }

  /**
   * List licenses with pagination and filters
   */
  async listLicenses(
    query: QueryLicensesDto,
  ): Promise<{ licenses: License[]; total: number }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status.toUpperCase();
    }

    if (query.tier) {
      where.tier = query.tier.toUpperCase();
    }

    if (query.expiringInDays) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + query.expiringInDays);
      where.expiryDate = {
        lte: futureDate,
        gte: new Date(),
      };
    }

    if (query.search) {
      where.OR = [
        { businessName: { contains: query.search, mode: 'insensitive' } },
        { licenseKey: { contains: query.search, mode: 'insensitive' } },
        { businessId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [licenses, total] = await Promise.all([
      this.prisma.license.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expiryDate: 'asc' },
      }),
      this.prisma.license.count({ where }),
    ]);

    return { licenses, total };
  }

  /**
   * Get license statistics
   */
  async getLicenseStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    expiringSoon: number;
    suspended: number;
  }> {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [total, active, suspended] = await Promise.all([
      this.prisma.license.count(),
      this.prisma.license.count({
        where: {
          status: 'ACTIVE',
          expiryDate: { gte: now },
        },
      }),
      this.prisma.license.count({
        where: { status: 'SUSPENDED' },
      }),
    ]);

    const expired = await this.prisma.license.count({
      where: {
        expiryDate: { lt: now },
      },
    });

    const expiringSoon = await this.prisma.license.count({
      where: {
        expiryDate: { lte: thirtyDaysLater, gte: now },
        status: 'ACTIVE',
      },
    });

    return {
      total,
      active,
      expired,
      expiringSoon,
      suspended,
    };
  }

  /**
   * Update license
   */
  async updateLicense(
    id: string,
    data: Partial<License> & { updatedBy: string },
  ): Promise<License> {
    return this.prisma.license.update({
      where: { id },
      data,
    });
  }

  /**
   * Activate license
   */
  async activateLicense(id: string, updatedBy: string): Promise<License> {
    return this.updateLicense(id, {
      status: 'ACTIVE',
      isActivated: true,
      activatedAt: new Date(),
      updatedBy,
    });
  }

  /**
   * Suspend license
   */
  async suspendLicense(id: string, reason: string, updatedBy: string): Promise<License> {
    return this.updateLicense(id, {
      status: 'SUSPENDED',
      suspendedAt: new Date(),
      suspensionReason: reason,
      updatedBy,
    });
  }

  /**
   * Renew license (extend expiry)
   */
  async renewLicense(id: string, newExpiryDate: Date, updatedBy: string): Promise<License> {
    return this.updateLicense(id, {
      expiryDate: newExpiryDate,
      status: 'ACTIVE',
      updatedBy,
    });
  }

  /**
   * Log audit entry
   */
  async logAudit(data: {
    licenseId: string;
    action: string;
    details: Record<string, any>;
    hardwareId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<LicenseAudit> {
    return this.prisma.licenseAudit.create({
      data: {
        licenseId: data.licenseId,
        action: data.action as any, // Cast to enum value
        details: data.details,
        hardwareId: data.hardwareId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  /**
   * Get audit logs for license
   */
  async getAuditLogs(licenseId: string, limit: number = 50): Promise<LicenseAudit[]> {
    return this.prisma.licenseAudit.findMany({
      where: { licenseId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Register device
   */
  async registerDevice(
    licenseId: string,
    hardwareId: string,
    deviceName: string,
  ): Promise<DeviceRegistration> {
    // Upsert - update if exists, create if not
    return this.prisma.deviceRegistration.upsert({
      where: {
        licenseId_hardwareId: { licenseId, hardwareId },
      },
      create: {
        licenseId,
        hardwareId,
        deviceName,
        isActive: true,
      },
      update: {
        lastValidated: new Date(),
        isActive: true,
      },
    });
  }

  /**
   * Get registered devices for license
   */
  async getRegisteredDevices(licenseId: string): Promise<DeviceRegistration[]> {
    return this.prisma.deviceRegistration.findMany({
      where: { licenseId },
      orderBy: { registeredAt: 'desc' },
    });
  }

  /**
   * Revoke device
   */
  async revokeDevice(licenseId: string, hardwareId: string): Promise<void> {
    await this.prisma.deviceRegistration.deleteMany({
      where: { licenseId, hardwareId },
    });
  }

  /**
   * Update device last validated time
   */
  async updateDeviceLastValidated(licenseId: string, hardwareId: string): Promise<void> {
    await this.prisma.deviceRegistration.update({
      where: {
        licenseId_hardwareId: { licenseId, hardwareId },
      },
      data: {
        lastValidated: new Date(),
      },
    });
  }
}
