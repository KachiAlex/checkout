import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SubscriptionPricingTierDto {
  @ApiPropertyOptional()
  @IsOptional()
  priceCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  locations?: number;

  @ApiPropertyOptional()
  @IsOptional()
  users?: number;

  @ApiPropertyOptional()
  @IsOptional()
  features?: string[];
}

export class SubscriptionPricingFreeTierDto extends SubscriptionPricingTierDto {
  @ApiPropertyOptional()
  @IsOptional()
  durationDays?: number;
}

export class UpdateSubscriptionPricingDto {
  @ApiPropertyOptional({ type: SubscriptionPricingFreeTierDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SubscriptionPricingFreeTierDto)
  free?: Partial<SubscriptionPricingFreeTierDto>;

  @ApiPropertyOptional({ type: SubscriptionPricingTierDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SubscriptionPricingTierDto)
  starter?: Partial<SubscriptionPricingTierDto>;

  @ApiPropertyOptional({ type: SubscriptionPricingTierDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SubscriptionPricingTierDto)
  professional?: Partial<SubscriptionPricingTierDto>;

  @ApiPropertyOptional({ type: SubscriptionPricingTierDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SubscriptionPricingTierDto)
  enterprise?: Partial<SubscriptionPricingTierDto>;

  @ApiPropertyOptional({ type: SubscriptionPricingTierDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SubscriptionPricingTierDto)
  lifetime?: Partial<SubscriptionPricingTierDto>;
}
