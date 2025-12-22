import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum, IsDateString } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ description: 'Customer name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Phone number', required: false, example: '+2348000000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Email address', required: false, example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Loyalty ID (auto-generated if not provided)', required: false })
  @IsOptional()
  @IsString()
  loyaltyId?: string;

  @ApiProperty({
    description: 'Preferred payment method',
    required: false,
    enum: ['cash', 'card', 'qr', 'transfer'],
  })
  @IsOptional()
  @IsEnum(['cash', 'card', 'qr', 'transfer'])
  preferredPaymentMethod?: 'cash' | 'card' | 'qr' | 'transfer';

  @ApiProperty({ description: 'Date of birth', required: false, example: '1990-01-01' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ description: 'Address', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'Notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
