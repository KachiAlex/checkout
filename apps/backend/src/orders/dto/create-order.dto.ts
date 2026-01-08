import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@pos-checkout/shared';

class OrderItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Quantity', example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Price in cents', example: 150 })
  @IsNumber()
  @Min(0)
  priceCents: number;

  @ApiProperty({ description: 'Tax in cents', example: 11 })
  @IsNumber()
  @Min(0)
  taxCents: number;

  @ApiProperty({ description: 'Discount in cents', required: false, example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountCents?: number;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Client-generated UUID for idempotency' })
  @IsUUID()
  uuid: string;

  @ApiProperty({ description: 'Location ID', required: false })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiProperty({ description: 'Customer ID (Firestore document ID)', required: false })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ description: 'Order items', type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ description: 'Subtotal in cents', example: 1000 })
  @IsNumber()
  @Min(0)
  subtotalCents: number;

  @ApiProperty({ description: 'Tax in cents', example: 75 })
  @IsNumber()
  @Min(0)
  taxCents: number;

  @ApiProperty({ description: 'Tax rule ID used (VAT rule)', required: false })
  @IsOptional()
  @IsUUID()
  taxRuleIdUsed?: string;

  @ApiProperty({ description: 'Tax rate used in basis points (e.g. 750 = 7.5%)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRateBpsUsed?: number;

  @ApiProperty({ description: 'Cart-level discount in cents', default: 0, example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountCents?: number;

  @ApiProperty({
    description: 'Cart-level discount percentage (0-100)',
    required: false,
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercent?: number;

  @ApiProperty({ description: 'Discount reason/description', required: false })
  @IsOptional()
  discountReason?: string;

  @ApiProperty({ description: 'Total in cents', example: 1075 })
  @IsNumber()
  @Min(0)
  totalCents: number;

  @ApiProperty({ description: 'Device ID', required: false })
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiProperty({ description: 'Notes', required: false })
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Whether this order is held/suspended', default: false })
  @IsOptional()
  isHeld?: boolean;

  @ApiProperty({
    description: 'Whether this is a credit order (products taken on credit)',
    default: false,
  })
  @IsOptional()
  isCreditOrder?: boolean;

  @ApiProperty({
    description: 'Payment method for immediate (non-credit) orders',
    required: false,
    enum: PaymentMethod,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
