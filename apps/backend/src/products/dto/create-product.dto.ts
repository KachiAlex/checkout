import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsArray,
  IsBoolean,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ description: 'Product SKU', example: 'SKU-0001' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ description: 'Barcode', required: false, example: '1000000001' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ description: 'Product name', example: 'Bottled Water 500ml' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Product description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Price in cents', example: 150 })
  @IsNumber()
  @Min(0)
  priceCents: number;

  @ApiProperty({ description: 'Cost in cents', required: false, example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costCents?: number;

  @ApiProperty({ description: 'Tax rate (0-1)', example: 0.075, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  taxRate?: number;

  @ApiProperty({ description: 'Product variants', required: false })
  @IsOptional()
  variants?: Record<string, unknown>;

  @ApiProperty({ description: 'Product images URLs', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ description: 'Is product active', default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
