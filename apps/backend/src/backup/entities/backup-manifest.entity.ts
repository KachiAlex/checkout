import { ApiProperty } from '@nestjs/swagger';

export class BackupManifestEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  backupId: string;

  @ApiProperty()
  licenseId: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  timestamp: Date;

  @ApiProperty()
  size: number;

  @ApiProperty()
  recordCount: Record<string, number>;

  @ApiProperty()
  status: string;

  @ApiProperty()
  storageLocation: string;

  @ApiProperty()
  checksum: string;

  @ApiProperty()
  encryptionVersion: string;

  @ApiProperty()
  createdAt: Date;
}

export class BackupListResponseDto {
  @ApiProperty()
  backups: BackupManifestEntity[];

  @ApiProperty()
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };

  @ApiProperty()
  stats: {
    totalBackups: number;
    totalSize: number;
    successCount: number;
    failureCount: number;
  };
}
