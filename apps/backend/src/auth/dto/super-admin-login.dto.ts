import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class SuperAdminLoginDto {
  @ApiProperty({ example: 'superadmin@checkouthq.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Platform admin password', minLength: 8, maxLength: 128 })
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
