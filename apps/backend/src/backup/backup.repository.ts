import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BackupManifest } from '@prisma/client';
import { QueryBackupsDto } from './dto/create-backup.dto';

@Injectable()
export class BackupRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Create backup manifest
   */
  async createBackup(data: {
    licenseId: string;
    tenantId: string;
    backupId: string;
    timestamp: Date;
    size: number;
    recordCount: Record<string, number>;
    status: string;
    storageLocation: string;
    checksum: string;
    encryptionVersion: string;
  }): Promise<BackupManifest> {
    return this.prisma.backupManifest.create({
      data: {
        licenseId: data.licenseId,
        tenantId: data.tenantId,
        backupId: data.backupId,
        timestamp: data.timestamp,
        size: data.size,
        recordCount: data.recordCount,
        status: data.status as any, // Cast to enum value
        storageLocation: data.storageLocation,
        checksum: data.checksum,
        encryptionVersion: data.encryptionVersion,
      },
    });
  }

  /**
   * Find backup by ID
   */
  async findById(id: string): Promise<BackupManifest | null> {
    return this.prisma.backupManifest.findUnique({
      where: { id },
    });
  }

  /**
   * Find backup by backupId
   */
  async findByBackupId(backupId: string): Promise<BackupManifest | null> {
    return this.prisma.backupManifest.findUnique({
      where: { backupId },
    });
  }

  /**
   * List backups with filters
   */
  async listBackups(query: QueryBackupsDto): Promise<{ backups: BackupManifest[]; total: number }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.tenantId) {
      where.tenantId = query.tenantId;
    }

    if (query.licenseId) {
      where.licenseId = query.licenseId;
    }

    if (query.status) {
      where.status = query.status.toUpperCase();
    }

    const [backups, total] = await Promise.all([
      this.prisma.backupManifest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.backupManifest.count({ where }),
    ]);

    return { backups, total };
  }

  /**
   * Get backups for license
   */
  async getBackupsForLicense(licenseId: string, limit: number = 50): Promise<BackupManifest[]> {
    return this.prisma.backupManifest.findMany({
      where: { licenseId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Delete old backups (retention policy)
   */
  async deleteOldBackups(licenseId: string, retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.backupManifest.deleteMany({
      where: {
        licenseId,
        timestamp: { lt: cutoffDate },
      },
    });

    return result.count;
  }

  /**
   * Update backup status
   */
  async updateBackupStatus(id: string, status: string): Promise<BackupManifest> {
    return this.prisma.backupManifest.update({
      where: { id },
      data: { status: status as any }, // Cast to enum value
    });
  }

  /**
   * Get backup statistics
   */
  async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    successCount: number;
    failureCount: number;
  }> {
    const [totalBackups, successCount, failureCount] = await Promise.all([
      this.prisma.backupManifest.count(),
      this.prisma.backupManifest.count({ where: { status: 'COMPLETED' } }),
      this.prisma.backupManifest.count({ where: { status: 'FAILED' } }),
    ]);

    const backups = await this.prisma.backupManifest.findMany({
      select: { size: true },
    });

    const totalSize = backups.reduce((sum, b) => sum + (b.size || 0), 0);

    return {
      totalBackups,
      totalSize,
      successCount,
      failureCount,
    };
  }
}
