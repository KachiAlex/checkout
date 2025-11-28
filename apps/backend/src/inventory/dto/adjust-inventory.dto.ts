import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { InventoryTransactionType } from '@pos-checkout/shared';

export class AdjustInventoryDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Location ID (optional, will be resolved from user context if not provided)', required: false })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiProperty({ description: 'Quantity delta (can be negative)', example: -5 })
  @IsNumber()
  delta: number;

  @ApiProperty({
    description: 'Transaction type',
    enum: InventoryTransactionType,
  })
  @IsEnum(InventoryTransactionType)
  type: InventoryTransactionType;

  @ApiProperty({ description: 'User ID performing the adjustment', required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: 'Reference ID (e.g., order ID)', required: false })
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiProperty({ description: 'Notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Reason for adjustment', required: false, example: 'damaged' })
  @IsOptional()
  @IsString()
  reason?: string;
}
