import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateLicenseDto {
  @ApiProperty({ description: 'Desktop license key' })
  @IsString()
  desktopKey: string;

  @ApiProperty({ description: 'Hardware ID/fingerprint' })
  @IsString()
  hardwareId: string;

  @ApiProperty({ description: 'Device name', required: false })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiProperty({ description: 'Last validation timestamp', required: false })
  @IsOptional()
  lastValidationTime?: number;

  @ApiProperty({ description: 'App version', required: false })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiProperty({ description: 'IP address (for audit)', required: false })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({ description: 'User agent (for audit)', required: false })
  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class ValidateLicenseResponseDto {
  isValid: boolean;
  reason?: string;
  expiryDate?: string;
  serverTime?: number;
  gracePeriodDays?: number;
  features?: string[];
  syncRequired?: boolean;
  maxDevices?: number;
  registeredDevices?: number;
}
