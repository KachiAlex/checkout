import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TaxMode } from '@prisma/client';

export class UpdateTaxRuleDto {
  @ApiProperty({ description: 'Tax rule name', required: false, example: 'VAT' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: 'Tax authority',
    required: false,
    example: 'Federal Inland Revenue Service',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  authority?: string;

  @ApiProperty({ description: 'Tax code identifier', required: false, example: 'VAT' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxCode?: string;

  @ApiProperty({
    description: 'Tax rate as decimal. Example: 0.075 for 7.5%',
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rate?: number;

  @ApiProperty({ description: 'Tax mode', enum: TaxMode, required: false })
  @IsOptional()
  @IsEnum(TaxMode)
  mode?: TaxMode;

  @ApiProperty({ description: 'Effective from (ISO date)', required: false })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiProperty({ description: 'Effective to (ISO date)', required: false })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiProperty({ description: 'Optional location/branch scope', required: false })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiProperty({ description: 'Whether this rule is active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
