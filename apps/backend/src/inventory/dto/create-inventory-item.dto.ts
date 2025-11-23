import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateInventoryItemDto {
  @ApiProperty({ description: 'Product name', example: 'Bottled Water 500ml' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Product description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Product SKU (auto-generated if not provided)', required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ description: 'Barcode', required: false })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ description: 'Quantity to add', example: 100 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ description: 'Price in cents', example: 15000 })
  @IsNumber()
  @Min(0)
  priceCents: number;

  @ApiProperty({ description: 'Cost in cents', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costCents?: number;

  @ApiProperty({ description: 'Tax rate (0-1)', example: 0.075, default: 0.075 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiProperty({ description: 'Category ID', required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ description: 'Category Name (if creating new category)', required: false })
  @IsOptional()
  @IsString()
  categoryName?: string;

  @ApiProperty({ description: 'Brand ID', required: false })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiProperty({ description: 'Brand Name (if creating new brand)', required: false })
  @IsOptional()
  @IsString()
  brandName?: string;
}

