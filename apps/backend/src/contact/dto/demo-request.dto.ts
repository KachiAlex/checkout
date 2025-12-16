import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DemoRequestDto {
  @ApiProperty({ description: 'Full name', example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Email address', example: 'john@company.com' })
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Phone number', required: false, example: '+234 XXX XXX XXXX' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Company name', example: 'Acme Store' })
  @IsNotEmpty()
  @IsString()
  companyName!: string;

  @ApiProperty({ description: 'Industry type', example: 'retail' })
  @IsNotEmpty()
  @IsString()
  industry!: string;

  @ApiProperty({ description: 'Additional message', required: false })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({ description: 'Recipient email', example: 'akoma@kreatixtech.com' })
  @IsNotEmpty()
  @IsEmail()
  recipientEmail!: string;

  @ApiProperty({ description: 'Email subject', required: false })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ description: 'Email content', required: false })
  @IsOptional()
  @IsString()
  content?: string;
}

