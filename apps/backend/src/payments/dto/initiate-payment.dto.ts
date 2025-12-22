import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { PaymentMethod } from '@pos-checkout/shared';

export class InitiatePaymentDto {
  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.CARD,
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ description: 'Amount in cents', example: 1075 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Additional metadata (e.g., token for card payments)',
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
