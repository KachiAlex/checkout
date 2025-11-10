import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { CreateTenantDto } from './create-tenant.dto';
import { TenantStatus } from '@pos-checkout/shared';

export class UpdateTenantDto extends PartialType(CreateTenantDto) {
  @ApiPropertyOptional({ enum: TenantStatus })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @ApiPropertyOptional({ description: 'Primary tenant admin email' })
  @IsOptional()
  @IsEmail()
  adminEmail?: string;
}

