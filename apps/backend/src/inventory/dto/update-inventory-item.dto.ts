import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateInventoryItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Location ID (optional, will be resolved from user context if not provided)', required: false })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiProperty({ description: 'Quantity', required: false, example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiProperty({ description: 'Reorder point', required: false, example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderPoint?: number;

  @ApiProperty({ description: 'Cost price in cents', required: false, example: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costCents?: number;

  @ApiProperty({ description: 'Sales price in cents', required: false, example: 15000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salesPriceCents?: number;
}

