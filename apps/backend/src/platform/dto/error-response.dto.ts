import { ApiProperty } from '@nestjs/swagger';

export class ErrorDetailDto {
  @ApiProperty({
    description: 'Error code for programmatic handling',
    example: 'DUPLICATE_SLUG',
  })
  code!: string;

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'Company URL is already taken',
  })
  message!: string;

  @ApiProperty({
    description: 'Field name if this is a field-specific error',
    example: 'companySlug',
    required: false,
  })
  field?: string;

  @ApiProperty({
    description: 'Additional technical details for debugging',
    example: 'Slug already exists in database',
    required: false,
  })
  details?: string;
}

export class ErrorResponseDto {
  @ApiProperty({ description: 'Success flag', example: false })
  success!: boolean;

  @ApiProperty({ description: 'Error details' })
  error!: ErrorDetailDto;
}
