import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ComputeTaxLineDto {
  @ApiProperty({ description: 'Client line identifier for traceability' })
  @IsString()
  lineId: string;

  @ApiProperty({ description: 'Amount in cents (minor units)', example: 10000 })
  @IsNumber()
  amountCents: number;

  @ApiProperty({ description: 'Optional tax rule ID to force usage', required: false })
  @IsOptional()
  @IsString()
  taxRuleId?: string;

  @ApiProperty({ description: 'Product category identifier', required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ description: 'Arbitrary tags for tax matching', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class ComputeTaxDto {
  @ApiProperty({ description: 'Tenant branch/location context', required: false })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiProperty({ type: [ComputeTaxLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComputeTaxLineDto)
  lines: ComputeTaxLineDto[];

  @ApiProperty({
    description: 'Fallback tax rate (decimal). Example: 0.075 for 7.5%',
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultTaxRate?: number;
}
