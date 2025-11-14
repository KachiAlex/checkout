import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '@pos-checkout/shared';

export class CreateUserDto {
  @ApiProperty({ description: 'User display name', example: 'Jane Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ description: 'Email for communication/login notifications', example: 'jane@store.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: UserRole, description: 'Role within tenant' })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiProperty({ description: 'Optional PIN or passphrase for initial login (4-64 characters)', required: false })
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  pin?: string;

  @ApiProperty({ description: 'Optional location assignment', required: false })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiProperty({ description: 'Whether the user should have platform-level admin access', required: false })
  @IsOptional()
  isPlatformAdmin?: boolean;
}

