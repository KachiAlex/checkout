import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { InventoryTransactionType } from '@pos-checkout/shared';

export class AdjustInventoryDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Location ID' })
  @IsUUID()
  locationId: string;

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
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'Reference ID (e.g., order ID)', required: false })
  @IsOptional()
  @IsUUID()
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
