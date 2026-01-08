import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { TaxPeriodStatus } from '@prisma/client';

export class UpsertTaxPeriodDto {
  @ApiProperty({ description: 'Tax code identifier', example: 'VAT' })
  @IsString()
  @MaxLength(50)
  taxCode: string;

  @ApiProperty({ description: 'Period start (ISO date)', example: '2026-01-01T00:00:00.000Z' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ description: 'Period end (ISO date)', example: '2026-01-31T23:59:59.999Z' })
  @IsDateString()
  periodEnd: string;

  @ApiProperty({ description: 'Optional location/branch scope', required: false })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiProperty({ description: 'Status', enum: TaxPeriodStatus, required: false })
  @IsOptional()
  @IsEnum(TaxPeriodStatus)
  status?: TaxPeriodStatus;

  @ApiProperty({ description: 'Filing date (ISO)', required: false })
  @IsOptional()
  @IsDateString()
  filedAt?: string;

  @ApiProperty({ description: 'Payment date (ISO)', required: false })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiProperty({ description: 'Payment reference', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentReference?: string;

  @ApiProperty({ description: 'Payment amount in cents', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paymentAmountCents?: number;

  @ApiProperty({ description: 'Due date (ISO)', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ description: 'Currency', required: false, default: 'NGN' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;
}
