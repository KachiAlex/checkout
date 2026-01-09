import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SupportRequestDto {
  @ApiProperty({ description: 'Issue subject/title', example: 'Unable to print receipt' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  subject!: string;

  @ApiProperty({ description: 'Module or area of the app', required: false, example: 'receipts' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  module?: string;

  @ApiProperty({ description: 'Detailed description of the issue/request' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  message!: string;
}
