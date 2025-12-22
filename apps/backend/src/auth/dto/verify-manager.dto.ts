import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyManagerDto {
  @ApiProperty({ description: 'Manager PIN for authorization' })
  @IsString()
  @IsNotEmpty()
  pin: string;
}
