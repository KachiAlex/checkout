import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { TaxMode } from '@prisma/client';

export class CreateTaxRuleDto {
  @ApiProperty({ description: 'Tax rule name', example: 'VAT' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Tax authority', example: 'Federal Inland Revenue Service' })
  @IsString()
  @MaxLength(200)
  authority: string;

  @ApiProperty({ description: 'Tax code identifier', example: 'VAT' })
  @IsString()
  @MaxLength(50)
  taxCode: string;

  @ApiProperty({ description: 'Tax rate as decimal (EXCLUSIVE). Example: 0.075 for 7.5%', example: 0.075, minimum: 0 })
  @IsNumber()
  @Min(0)
  rate: number;

  @ApiProperty({ description: 'Tax mode', enum: TaxMode, required: false, default: TaxMode.EXCLUSIVE })
  @IsOptional()
  @IsEnum(TaxMode)
  mode?: TaxMode;

  @ApiProperty({ description: 'Effective from (ISO date)', example: '2026-01-01T00:00:00.000Z' })
  @IsDateString()
  effectiveFrom: string;

  @ApiProperty({ description: 'Effective to (ISO date)', required: false })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiProperty({ description: 'Optional location/branch scope', required: false })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiProperty({ description: 'Whether this rule is active', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
