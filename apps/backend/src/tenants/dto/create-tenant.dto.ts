import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TenantPlan, Industry, IndustryFeatureFlags } from '@pos-checkout/shared';

export class CreateTenantDto {
  @ApiProperty({ description: 'Company name', example: 'Acme Retail' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ description: 'URL-friendly slug', example: 'acme-retail' })
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug may only contain lowercase letters, numbers, and hyphens',
  })
  slug!: string;

  @ApiProperty({ enum: TenantPlan, default: TenantPlan.MONTHLY })
  @IsEnum(TenantPlan)
  plan: TenantPlan = TenantPlan.MONTHLY;

  @ApiProperty({ description: 'Seat/license limit', required: false, example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  seatLimit?: number;

  @ApiProperty({ description: 'Primary tenant admin email', example: 'manager@acme.com' })
  @IsEmail()
  adminEmail!: string;

  @ApiProperty({ description: 'Tenant admin display name', required: false })
  @IsOptional()
  @IsString()
  adminName?: string;

  @ApiProperty({ description: 'Billing cycle start date (ISO format)', required: false, example: '2025-01-01' })
  @IsOptional()
  @IsString()
  billingCycleStart?: string;

  @ApiProperty({ description: 'Billing cycle end date (ISO format)', required: false, example: '2025-12-31' })
  @IsOptional()
  @IsString()
  billingCycleEnd?: string;

  @ApiProperty({ enum: Industry, description: 'Industry type', required: false, default: Industry.GENERAL })
  @IsOptional()
  @IsEnum(Industry)
  industry?: Industry;

  @ApiProperty({ description: 'Custom feature flags (will be merged with industry defaults)', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  featureFlags?: Partial<IndustryFeatureFlags>;
}

