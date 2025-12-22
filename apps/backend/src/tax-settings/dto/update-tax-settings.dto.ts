import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsBoolean, Min, Max } from 'class-validator';

export class UpdateTaxSettingsDto {
  @ApiProperty({ description: 'Tax description/name', required: false, example: 'VAT' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Tax percentage (0-100)', required: false, example: 7.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage?: number;

  @ApiProperty({ description: 'Enable tax for this tenant', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
