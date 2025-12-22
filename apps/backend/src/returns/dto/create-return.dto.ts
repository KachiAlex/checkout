import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
  IsEnum,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReturnReason } from '../returns.repository';

class ReturnItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Quantity to return', example: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Price in cents (from original order)', example: 150 })
  @IsNumber()
  @Min(0)
  priceCents: number;

  @ApiProperty({ description: 'Return reason', enum: ReturnReason })
  @IsEnum(ReturnReason)
  reason: ReturnReason;

  @ApiProperty({ description: 'Notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateReturnDto {
  @ApiProperty({ description: 'Original order ID' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ description: 'Items to return', type: [ReturnItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];

  @ApiProperty({ description: 'Total refund amount in cents', example: 150 })
  @IsNumber()
  @Min(0)
  totalRefundCents: number;

  @ApiProperty({ description: 'Return reason', enum: ReturnReason })
  @IsEnum(ReturnReason)
  reason: ReturnReason;

  @ApiProperty({ description: 'Notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
