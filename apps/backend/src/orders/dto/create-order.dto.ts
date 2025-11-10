import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@pos-checkout/shared';

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

  @ApiProperty({ description: 'Location ID' })
  @IsUUID()
  locationId: string;

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

  @ApiProperty({ description: 'Discount in cents', default: 0, example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountCents?: number;

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
}
