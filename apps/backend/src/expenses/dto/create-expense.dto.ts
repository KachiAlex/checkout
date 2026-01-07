import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@pos-checkout/shared';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, MaxLength } from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({ description: 'Amount in cents', example: 250000 })
  @IsInt()
  @Min(1)
  amountCents!: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiProperty({ example: 'Fuel for generator' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  description!: string;

  @ApiProperty({ required: false, example: 'Total Nigeria Plc' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  vendor?: string;

  @ApiProperty({ required: false, description: 'Location/branch ID', example: 'uuid' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiProperty({ required: false, description: 'ISO date string', example: '2026-01-07T10:00:00.000Z' })
  @IsOptional()
  @IsString()
  occurredAt?: string;
}
