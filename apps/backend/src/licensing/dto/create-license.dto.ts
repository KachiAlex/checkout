import { IsString, IsUUID, IsNumber, IsBoolean, IsArray, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum LicenseTierEnum {
  STARTER = 'STARTER',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export class CreateLicenseDto {
  @ApiProperty({ description: 'Tenant ID' })
  @IsUUID()
  tenantId: string;

  @ApiProperty({ description: 'Business/Store name' })
  @IsString()
  businessName: string;

  @ApiProperty({ enum: LicenseTierEnum, description: 'License tier' })
  @IsEnum(LicenseTierEnum)
  tier: LicenseTierEnum;

  @ApiProperty({ description: 'License validity in months', example: 12 })
  @IsNumber()
  @Min(1)
  @Max(60)
  expiryMonths: number;

  @ApiProperty({ description: 'Maximum number of devices allowed', example: 1 })
  @IsNumber()
  @Min(1)
  maxDevices: number = 1;

  @ApiProperty({ description: 'Enable offline mode for desktop app', example: true })
  @IsBoolean()
  offlineEnabled: boolean = false;

  @ApiProperty({ description: 'Enable backup feature', example: true })
  @IsBoolean()
  backupEnabled: boolean = true;

  @ApiProperty({ description: 'Maximum users allowed', example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsers?: number;

  @ApiProperty({ description: 'Maximum locations allowed', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxLocations?: number;

  @ApiProperty({
    description: 'License features',
    example: ['offline', 'backup', 'sync'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiProperty({ description: 'Custom notes about the license', required: false })
  @IsOptional()
  @IsString()
  customNote?: string;

  @ApiProperty({ description: 'Offline grace period in days', example: 14 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(90)
  offlineGracePeriod?: number;

  @ApiProperty({ description: 'Backup retention in days', example: 90 })
  @IsOptional()
  @IsNumber()
  @Min(7)
  @Max(730)
  backupRetentionDays?: number;
}
