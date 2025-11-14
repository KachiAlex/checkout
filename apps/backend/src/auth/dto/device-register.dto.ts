import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsUUID, Matches } from 'class-validator';

export class DeviceRegisterDto {
  @ApiProperty({ description: 'Tenant slug for multi-tenant context', example: 'acme-retail' })
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'tenantSlug may only contain lowercase letters, numbers, and hyphens',
  })
  tenantSlug!: string;

  @ApiProperty({ description: 'Unique device identifier' })
  @IsNotEmpty()
  @IsString()
  deviceId!: string;

  @ApiProperty({ description: 'Device public key for secure communication' })
  @IsNotEmpty()
  @IsString()
  publicKey!: string;

  @ApiProperty({ description: 'Location ID to associate device with', required: false })
  @IsOptional()
  @IsUUID()
  locationId?: string;
}
