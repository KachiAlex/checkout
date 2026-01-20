import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsOptional, Matches, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Tenant slug/company identifier', example: 'acme-retail' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'tenantSlug may only contain lowercase letters, numbers, and hyphens',
  })
  tenantSlug!: string;

  @ApiProperty({ description: 'User PIN or passphrase (6-64 characters)', example: '123456' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  pin!: string;

  @ApiProperty({ description: 'Device ID for device registration', required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
