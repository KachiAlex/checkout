import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class ChangePinDto {
  @ApiProperty({
    description: 'Current PIN for verification',
    example: '1234',
  })
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  currentPin!: string;

  @ApiProperty({
    description: 'New PIN to be set',
    example: '5678',
  })
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  newPin!: string;
}
