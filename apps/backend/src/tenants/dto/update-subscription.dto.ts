import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { TenantPlan } from '@pos-checkout/shared';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ enum: TenantPlan })
  @IsOptional()
  @IsEnum(TenantPlan)
  plan?: TenantPlan;

  @ApiPropertyOptional({ description: 'Seat or license limit', example: 25 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  seatLimit?: number;

  @ApiPropertyOptional({ description: 'Billing cycle start (ISO string)', example: '2025-01-01' })
  @IsOptional()
  @IsString()
  billingCycleStart?: string | null;

  @ApiPropertyOptional({ description: 'Billing cycle end (ISO string)', example: '2025-12-31' })
  @IsOptional()
  @IsString()
  billingCycleEnd?: string | null;
}
