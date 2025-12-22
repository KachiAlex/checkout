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

export class GRNItemDto {
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

  @ApiProperty({ description: 'Ordered quantity', example: 100 })
  @IsNumber()
  @Min(0)
  orderedQuantity: number;

  @ApiProperty({ description: 'Received quantity', example: 100 })
  @IsNumber()
  @Min(0)
  receivedQuantity: number;

  @ApiProperty({ description: 'Batch number', required: false })
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiProperty({ description: 'Expiry date', required: false })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiProperty({ description: 'Unit cost in cents', example: 1000 })
  @IsNumber()
  @Min(0)
  unitCostCents: number;

  @ApiProperty({ description: 'Total cost in cents', example: 100000 })
  @IsNumber()
  @Min(0)
  totalCostCents: number;
}

export class CreateGRNDto {
  @ApiProperty({ description: 'Purchase Order ID' })
  @IsString()
  @IsNotEmpty()
  purchaseOrderId: string;

  @ApiProperty({ description: 'GRN items', type: [GRNItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GRNItemDto)
  items: GRNItemDto[];

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

  @ApiProperty({ description: 'Notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
