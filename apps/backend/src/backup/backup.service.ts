import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { BackupRepository } from './backup.repository';
import { LicensingRepository } from '../licensing/licensing.repository';
import { LicenseValidatorService } from '../licensing/services/license-validator.service';
import { CreateBackupDto, QueryBackupsDto, RestoreBackupDto } from './dto/create-backup.dto';
import * as crypto from 'crypto';

@Injectable()
export class BackupService {
  constructor(
    private backupRepo: BackupRepository,
    private licensingRepo: LicensingRepository,
    private licenseValidator: LicenseValidatorService,
  ) {}

  /**
   * Create new backup from desktop app
   */
  async createBackup(licenseId: string, dto: CreateBackupDto): Promise<any> {
    // Verify license exists and is valid
    const license = await this.licensingRepo.findById(licenseId);

    if (!license) {
      throw new NotFoundException('License not found');
    }

    if (license.status === 'SUSPENDED') {
      throw new BadRequestException('License is suspended');
    }

    if (license.status === 'EXPIRED') {
      throw new BadRequestException('License has expired');
    }

    if (!license.backupEnabled) {
      throw new BadRequestException('Backups are not enabled for this license');
    }

    // Verify checksum
    const calculatedChecksum = this.calculateChecksum(dto.encrypted);
    if (calculatedChecksum !== dto.metadata.checksum) {
      throw new BadRequestException('Backup checksum mismatch - possible corruption');
    }

    // Create backup manifest
    const backupId = `BACKUP-${Date.now()}-${uuidv4().substring(0, 8)}`;

    const backup = await this.backupRepo.createBackup({
      licenseId,
      tenantId: dto.tenantId,
      backupId,
      timestamp: new Date(dto.metadata.timestamp),
      size: dto.metadata.size,
      recordCount: dto.metadata.recordCount,
      status: 'COMPLETED',
      storageLocation: this.getStorageLocation(licenseId, backupId),
      checksum: dto.metadata.checksum,
      encryptionVersion: dto.metadata.encryptionVersion,
    });

    // TODO: Store encrypted data to cloud storage (Firebase/S3)
    // await this.storageService.upload(backup.storageLocation, dto.encrypted);

    // Clean up old backups based on retention policy
    if (license.backupRetentionDays) {
      await this.backupRepo.deleteOldBackups(licenseId, license.backupRetentionDays);
    }

    return {
      id: backup.id,
      backupId: backup.backupId,
      timestamp: backup.timestamp,
      status: backup.status,
      size: backup.size,
    };
  }

  /**
   * List backups
   */
  async listBackups(query: QueryBackupsDto): Promise<any> {
    const { backups, total } = await this.backupRepo.listBackups(query);
    const stats = await this.backupRepo.getBackupStats();
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const pages = Math.ceil(total / limit);

    return {
      backups,
      stats,
      pagination: { total, page, limit, pages },
    };
  }

  /**
   * Get backups for license
   */
  async getBackupsForLicense(licenseId: string, limit: number = 50): Promise<any> {
    const license = await this.licensingRepo.findById(licenseId);

    if (!license) {
      throw new NotFoundException('License not found');
    }

    const backups = await this.backupRepo.getBackupsForLicense(licenseId, limit);

    return {
      licenseId,
      businessName: license.businessName,
      backups,
      stats: {
        totalBackups: backups.length,
        totalSize: backups.reduce((sum, b) => sum + (b.size || 0), 0),
        latestBackup: backups[0]?.timestamp,
      },
    };
  }

  /**
   * Download backup
   */
  async downloadBackup(backupId: string): Promise<{ url: string; backup: any }> {
    const backup = await this.backupRepo.findByBackupId(backupId);

    if (!backup) {
      throw new NotFoundException('Backup not found');
    }

    // TODO: Generate signed URL from cloud storage
    // const url = await this.storageService.getDownloadUrl(backup.storageLocation);

    return {
      url: `${process.env.API_URL}/backups/${backup.id}/download`,
      backup,
    };
  }

  /**
   * Delete backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    const backup = await this.backupRepo.findByBackupId(backupId);

    if (!backup) {
      throw new NotFoundException('Backup not found');
    }

    // TODO: Delete from cloud storage
    // await this.storageService.delete(backup.storageLocation);

    // Mark as deleted in database (soft delete)
    await this.backupRepo.updateBackupStatus(backup.id, 'DELETED');
  }

  /**
   * Restore from backup
   */
  async restoreBackup(licenseId: string, dto: RestoreBackupDto): Promise<any> {
    const license = await this.licensingRepo.findById(licenseId);

    if (!license) {
      throw new NotFoundException('License not found');
    }

    const backup = await this.backupRepo.findByBackupId(dto.backupId);

    if (!backup) {
      throw new NotFoundException('Backup not found');
    }

    if (backup.licenseId !== licenseId) {
      throw new BadRequestException('Backup does not belong to this license');
    }

    // Validate license if requested
    if (dto.validateLicense) {
      const validation = this.licenseValidator.comprehensiveValidate({
        licenseKey: license.licenseKey,
        expiryDate: license.expiryDate,
        status: license.status,
        hardwareIds: license.hardwareIds,
        maxDevices: license.maxDevices,
        features: license.features,
        offlineGracePeriod: license.offlineGracePeriod,
      });

      if (!validation.isValid) {
        throw new BadRequestException(`Cannot restore: ${validation.reason}`);
      }
    }

    // TODO: Download backup from storage
    // const encryptedData = await this.storageService.download(backup.storageLocation);

    return {
      backupId: backup.id,
      timestamp: backup.timestamp,
      recordCount: backup.recordCount,
      merge: dto.merge,
      // In real implementation, would return encrypted data for client to decrypt
      // encrypted: encryptedData,
      instructions: 'Download encrypted backup and restore on client side',
    };
  }

  /**
   * Get backup statistics
   */
  async getStatistics(): Promise<any> {
    return this.backupRepo.getBackupStats();
  }

  // Helper methods

  private calculateChecksum(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private getStorageLocation(licenseId: string, backupId: string): string {
    const provider = process.env.BACKUP_STORAGE_PROVIDER || 'firebase';

    if (provider === 'firebase') {
      return `gs://checkout-pos-backups/${licenseId}/${backupId}.backup.enc`;
    } else if (provider === 's3') {
      return `s3://checkout-pos-backups/${licenseId}/${backupId}.backup.enc`;
    } else {
      return `/backups/${licenseId}/${backupId}.backup.enc`;
    }
  }
}
