import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsNumber,
  IsOptional,
  IsDateString,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseOrderItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Product name' })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ description: 'Product SKU' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ description: 'Quantity ordered', example: 100 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Unit cost in cents', example: 1000 })
  @IsNumber()
  @Min(0)
  unitCostCents: number;

  @ApiProperty({ description: 'Total cost in cents', example: 100000 })
  @IsNumber()
  @Min(0)
  totalCostCents: number;

  @ApiProperty({ description: 'Batch number', required: false })
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiProperty({ description: 'Expiry date (ISO 8601)', required: false })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ description: 'Location ID' })
  @IsString()
  @IsNotEmpty()
  locationId: string;

  @ApiProperty({ description: 'Supplier ID' })
  @IsString()
  @IsNotEmpty()
  supplierId: string;

  @ApiProperty({ description: 'Purchase order items', type: [PurchaseOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];

  @ApiProperty({ description: 'Subtotal in cents', example: 100000 })
  @IsNumber()
  @Min(0)
  subtotalCents: number;

  @ApiProperty({ description: 'Tax in cents', example: 7500 })
  @IsNumber()
  @Min(0)
  taxCents: number;

  @ApiProperty({ description: 'Total in cents', example: 107500 })
  @IsNumber()
  @Min(0)
  totalCents: number;

  @ApiProperty({ description: 'Expected delivery date', required: false })
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @ApiProperty({ description: 'Notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
