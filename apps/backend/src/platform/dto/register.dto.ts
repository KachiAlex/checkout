import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { TenantPlan } from '@pos-checkout/shared';

export class RegisterDto {
  @ApiProperty({ description: 'Company name', example: 'Acme Store' })
  @IsNotEmpty()
  @IsString()
  companyName!: string;

  @ApiProperty({ description: 'Company URL slug', example: 'acme-store' })
  @IsNotEmpty()
  @IsString()
  companySlug!: string;

  @ApiProperty({ description: 'Admin user name', example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  adminName!: string;

  @ApiProperty({ description: 'Admin user email', example: 'admin@acmestore.com' })
  @IsNotEmpty()
  @IsEmail()
  adminEmail!: string;

  @ApiProperty({ description: 'Admin user password', example: 'SecurePassword123' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  adminPassword!: string;

  @ApiProperty({ 
    description: 'Subscription plan', 
    enum: TenantPlan, 
    required: false,
    example: TenantPlan.FREE 
  })
  @IsOptional()
  @IsEnum(TenantPlan)
  plan?: TenantPlan;
}

