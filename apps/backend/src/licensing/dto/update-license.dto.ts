import { IsString, IsOptional, IsNumber, IsArray, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum RenewLicenseAction {
  EXTEND = 'extend',
  SUSPEND = 'suspend',
  REACTIVATE = 'reactivate',
  CHANGE_TIER = 'changeTier',
  UPDATE_FEATURES = 'updateFeatures',
}

export class RenewLicenseDto {
  @ApiProperty({ description: 'Number of months to extend', example: 12 })
  @IsNumber()
  @Min(1)
  @Max(60)
  months: number;

  @ApiProperty({ description: 'New tier (optional)', required: false })
  @IsOptional()
  @IsString()
  tier?: string;

  @ApiProperty({ description: 'Renewal reason/notes', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SuspendLicenseDto {
  @ApiProperty({ description: 'Reason for suspension' })
  @IsString()
  reason: string;
}

export class UpdateLicenseDto {
  @ApiProperty({ enum: RenewLicenseAction, description: 'Action to perform' })
  @IsEnum(RenewLicenseAction)
  action: RenewLicenseAction;

  @ApiProperty({ description: 'Action-specific payload' })
  payload: Record<string, any>;
}

export class RegisterDeviceDto {
  @ApiProperty({ description: 'Hardware fingerprint/ID' })
  @IsString()
  hardwareId: string;

  @ApiProperty({ description: 'Device name/identifier' })
  @IsString()
  deviceName: string;
}

export class QueryLicensesDto {
  @ApiProperty({ description: 'Filter by status', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: 'Filter by tier', required: false })
  @IsOptional()
  @IsString()
  tier?: string;

  @ApiProperty({ description: 'Filter licenses expiring in N days', required: false })
  @IsOptional()
  @IsNumber()
  expiringInDays?: number;

  @ApiProperty({ description: 'Search by business name or license key', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Page number', required: false, example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiProperty({ description: 'Page size', required: false, example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
