import { IsString, IsUUID, IsObject, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBackupDto {
  @ApiProperty({ description: 'License ID' })
  @IsString()
  licenseId: string;

  @ApiProperty({ description: 'Tenant ID' })
  @IsUUID()
  tenantId: string;

  @ApiProperty({ description: 'Encrypted backup data' })
  encrypted: string;

  @ApiProperty({ description: 'Backup metadata' })
  @IsObject()
  metadata: {
    timestamp: number;
    size: number;
    recordCount: Record<string, number>;
    checksum: string;
    encryptionVersion: string;
  };

  @ApiProperty({ description: 'Backup notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RestoreBackupDto {
  @ApiProperty({ description: 'Backup ID to restore' })
  @IsString()
  backupId: string;

  @ApiProperty({ description: 'Merge with existing data or replace', example: false })
  merge: boolean = false;

  @ApiProperty({ description: 'Validate license before restore', example: true })
  validateLicense: boolean = true;
}

export class QueryBackupsDto {
  @ApiProperty({ description: 'Tenant ID', required: false })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiProperty({ description: 'License ID', required: false })
  @IsOptional()
  @IsString()
  licenseId?: string;

  @ApiProperty({ description: 'Filter by status', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: 'Page number', required: false, example: 1 })
  @IsOptional()
  page?: number;

  @ApiProperty({ description: 'Page size', required: false, example: 20 })
  @IsOptional()
  limit?: number;
}
