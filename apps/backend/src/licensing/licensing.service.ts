import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { addMonths } from 'date-fns';
import { LicensingRepository } from './licensing.repository';
import { LicenseKeyGeneratorService } from './services/license-key-generator.service';
import { LicenseValidatorService, LicenseValidationResult } from './services/license-validator.service';
import { LicenseCryptoService } from './services/license-crypto.service';
import { HardwareFingerprintService } from './services/hardware-fingerprint.service';
import { CreateLicenseDto, LicenseTierEnum } from './dto/create-license.dto';
import { ValidateLicenseDto, ValidateLicenseResponseDto } from './dto/validate-license.dto';
import { QueryLicensesDto, RenewLicenseDto } from './dto/update-license.dto';
import { License } from '@prisma/client';

@Injectable()
export class LicensingService {
  constructor(
    private repo: LicensingRepository,
    private keyGen: LicenseKeyGeneratorService,
    private validator: LicenseValidatorService,
    private crypto: LicenseCryptoService,
    private hardware: HardwareFingerprintService,
  ) {}

  /**
   * Create a new license
   */
  async createLicense(dto: CreateLicenseDto, createdBy: string): Promise<any> {
    const expiryDate = addMonths(new Date(), dto.expiryMonths);

    // Generate keys
    const bundle = this.keyGen.generateLicenseBundle(dto.tenantId, expiryDate);

    // Determine feature set based on tier
    const features = this.getFeaturesForTier(dto.tier, dto.features);

    const license = await this.repo.createLicense({
      businessId: dto.tenantId,
      tenantId: dto.tenantId,
      licenseKey: bundle.licenseKey,
      desktopKey: bundle.desktopKey,
      activationKey: bundle.activationKey,
      businessName: dto.businessName,
      tier: dto.tier,
      expiryDate,
      maxDevices: dto.maxDevices,
      maxUsers: dto.maxUsers || this.getMaxUsersForTier(dto.tier),
      maxLocations: dto.maxLocations || this.getMaxLocationsForTier(dto.tier),
      offlineEnabled: dto.offlineEnabled,
      backupEnabled: dto.backupEnabled,
      features,
      offlineGracePeriod: dto.offlineGracePeriod || 14,
      backupRetentionDays: dto.backupRetentionDays || 90,
      createdBy,
      updatedBy: createdBy,
    });

    // Log audit
    await this.repo.logAudit({
      licenseId: license.id,
      action: 'CREATED',
      details: {
        tier: dto.tier,
        features,
        expiryDate,
      },
      ipAddress: 'admin-portal',
    });

    // Return without sensitive info exposed
    return {
      id: license.id,
      licenseKey: license.licenseKey,
      desktopKey: license.desktopKey,
      activationKey: license.activationKey,
      expiryDate: license.expiryDate,
      status: license.status,
      businessName: license.businessName,
      tier: license.tier,
    };
  }

  /**
   * Validate desktop license (public endpoint)
   */
  async validateDesktopLicense(
    dto: ValidateLicenseDto,
  ): Promise<ValidateLicenseResponseDto> {
    const license = await this.repo.findByDesktopKey(dto.desktopKey);

    if (!license) {
      return {
        isValid: false,
        reason: 'License not found',
      };
    }

    // Validate comprehensively
    const validation = this.validator.comprehensiveValidate(license, dto.hardwareId);

    if (!validation.isValid) {
      // Log failed validation
      await this.repo.logAudit({
        licenseId: license.id,
        action: 'VALIDATED',
        details: { result: 'failed', reason: validation.reason },
        hardwareId: dto.hardwareId,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
      });

      return {
        isValid: false,
        reason: validation.reason,
      };
    }

    // Check if hardware needs registration
    if (
      dto.hardwareId &&
      !license.hardwareIds.includes(dto.hardwareId) &&
      license.hardwareIds.length < license.maxDevices
    ) {
      // Auto-register new device
      await this.repo.registerDevice(license.id, dto.hardwareId, dto.deviceName || 'Unknown');
    }

    // Update last validation
    if (dto.hardwareId && license.hardwareIds.includes(dto.hardwareId)) {
      await this.repo.updateDeviceLastValidated(license.id, dto.hardwareId);
    }

    // Log successful validation
    await this.repo.logAudit({
      licenseId: license.id,
      action: 'VALIDATED',
      details: { result: 'success' },
      hardwareId: dto.hardwareId,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
    });

    // Update last sync time
    await this.repo.updateLicense(license.id, {
      lastDesktopSync: new Date(),
      updatedBy: 'system',
    });

    return {
      isValid: true,
      expiryDate: license.expiryDate.toISOString(),
      serverTime: Date.now(),
      gracePeriodDays: license.offlineGracePeriod,
      features: license.features,
      syncRequired: this.shouldSyncBackup(license),
      maxDevices: license.maxDevices,
      registeredDevices: license.hardwareIds.length,
    };
  }

  /**
   * Get license by ID
   */
  async getLicenseById(id: string): Promise<any> {
    const license = await this.repo.findById(id);

    if (!license) {
      throw new NotFoundException('License not found');
    }

    const auditLogs = await this.repo.getAuditLogs(id, 20);
    const devices = await this.repo.getRegisteredDevices(id);

    return {
      ...license,
      auditLogs,
      devices,
      daysUntilExpiry: this.validator.daysUntilExpiry(license.expiryDate),
    };
  }

  /**
   * List licenses with filters
   */
  async listLicenses(query: QueryLicensesDto): Promise<any> {
    const { licenses, total } = await this.repo.listLicenses(query);
    const stats = await this.repo.getLicenseStats();
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const pages = Math.ceil(total / limit);

    return {
      licenses: licenses.map((l) => ({
        ...l,
        daysUntilExpiry: this.validator.daysUntilExpiry(l.expiryDate),
        isExpiringSoon: this.validator.isExpiringSoon(l.expiryDate),
      })),
      stats,
      pagination: { total, page, limit, pages },
    };
  }

  /**
   * Renew license
   */
  async renewLicense(licenseId: string, dto: RenewLicenseDto, updatedBy: string): Promise<any> {
    const license = await this.repo.findById(licenseId);

    if (!license) {
      throw new NotFoundException('License not found');
    }

    const newExpiryDate = addMonths(license.expiryDate, dto.months);

    const updated = await this.repo.renewLicense(licenseId, newExpiryDate, updatedBy);

    await this.repo.logAudit({
      licenseId,
      action: 'RENEWED',
      details: {
        previousExpiry: license.expiryDate,
        newExpiry: newExpiryDate,
        months: dto.months,
        reason: dto.reason,
      },
      ipAddress: 'admin-portal',
    });

    return {
      id: updated.id,
      expiryDate: updated.expiryDate,
      status: updated.status,
      daysUntilExpiry: this.validator.daysUntilExpiry(updated.expiryDate),
    };
  }

  /**
   * Suspend license
   */
  async suspendLicense(licenseId: string, reason: string, updatedBy: string): Promise<any> {
    const license = await this.repo.findById(licenseId);

    if (!license) {
      throw new NotFoundException('License not found');
    }

    const updated = await this.repo.suspendLicense(licenseId, reason, updatedBy);

    await this.repo.logAudit({
      licenseId,
      action: 'SUSPENDED',
      details: { reason },
      ipAddress: 'admin-portal',
    });

    return { id: updated.id, status: updated.status };
  }

  /**
   * Reactivate license
   */
  async reactivateLicense(licenseId: string, updatedBy: string): Promise<any> {
    const license = await this.repo.findById(licenseId);

    if (!license) {
      throw new NotFoundException('License not found');
    }

    const updated = await this.repo.updateLicense(licenseId, {
      status: 'ACTIVE',
      suspendedAt: null,
      suspensionReason: null,
      updatedBy,
    });

    await this.repo.logAudit({
      licenseId,
      action: 'REACTIVATED',
      details: {},
      ipAddress: 'admin-portal',
    });

    return { id: updated.id, status: updated.status };
  }

  /**
   * Register device for license
   */
  async registerDevice(licenseId: string, hardwareId: string, deviceName: string): Promise<any> {
    const license = await this.repo.findById(licenseId);

    if (!license) {
      throw new NotFoundException('License not found');
    }

    if (license.hardwareIds.length >= license.maxDevices) {
      throw new BadRequestException(
        `Maximum devices (${license.maxDevices}) already registered`,
      );
    }

    if (license.hardwareIds.includes(hardwareId)) {
      throw new BadRequestException('Device already registered');
    }

    const device = await this.repo.registerDevice(licenseId, hardwareId, deviceName);

    // Update hardwareIds array
    const updated = await this.repo.updateLicense(licenseId, {
      hardwareIds: [...license.hardwareIds, hardwareId],
      updatedBy: 'system',
    });

    await this.repo.logAudit({
      licenseId,
      action: 'DEVICE_REGISTERED',
      details: { hardwareId, deviceName },
      hardwareId,
      ipAddress: 'admin-portal',
    });

    return {
      id: device.id,
      hardwareId: device.hardwareId,
      deviceName: device.deviceName,
      registeredAt: device.registeredAt,
    };
  }

  /**
   * Revoke device
   */
  async revokeDevice(licenseId: string, hardwareId: string): Promise<void> {
    const license = await this.repo.findById(licenseId);

    if (!license) {
      throw new NotFoundException('License not found');
    }

    await this.repo.revokeDevice(licenseId, hardwareId);

    // Update hardwareIds array
    const updated = await this.repo.updateLicense(licenseId, {
      hardwareIds: license.hardwareIds.filter((id) => id !== hardwareId),
      updatedBy: 'system',
    });

    await this.repo.logAudit({
      licenseId,
      action: 'DEVICE_REVOKED',
      details: { hardwareId },
      hardwareId,
      ipAddress: 'admin-portal',
    });
  }

  /**
   * Get license statistics
   */
  async getStatistics(): Promise<any> {
    return this.repo.getLicenseStats();
  }

  // Helper methods

  private getFeaturesForTier(tier: string, customFeatures?: string[]): string[] {
    if (customFeatures && customFeatures.length > 0) {
      return customFeatures;
    }

    const featuresByTier = {
      [LicenseTierEnum.STARTER]: ['offline', 'backup'],
      [LicenseTierEnum.PRO]: ['offline', 'backup', 'sync', 'reports'],
      [LicenseTierEnum.ENTERPRISE]: ['offline', 'backup', 'sync', 'reports', 'api', 'sso'],
    };

    return featuresByTier[tier as LicenseTierEnum] || ['offline', 'backup'];
  }

  private getMaxUsersForTier(tier: string): number {
    const usersByTier = {
      [LicenseTierEnum.STARTER]: 5,
      [LicenseTierEnum.PRO]: 10,
      [LicenseTierEnum.ENTERPRISE]: 100,
    };

    return usersByTier[tier as LicenseTierEnum] || 5;
  }

  private getMaxLocationsForTier(tier: string): number {
    const locationsByTier = {
      [LicenseTierEnum.STARTER]: 1,
      [LicenseTierEnum.PRO]: 3,
      [LicenseTierEnum.ENTERPRISE]: 999,
    };

    return locationsByTier[tier as LicenseTierEnum] || 1;
  }

  private shouldSyncBackup(license: License): boolean {
    if (!license.lastDesktopSync) {
      return true;
    }

    // Sync every 24-48 hours
    const hoursSinceSync = (Date.now() - license.lastDesktopSync.getTime()) / (1000 * 60 * 60);
    return hoursSinceSync > 24;
  }
}
