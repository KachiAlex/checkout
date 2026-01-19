import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class EmailLoginDto {
  @ApiProperty({ example: 'cashier@acme-retail.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'User PIN or passphrase (6-64 characters)', example: '123456' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  pin!: string;

  @ApiProperty({ description: 'Device ID for device registration', required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
