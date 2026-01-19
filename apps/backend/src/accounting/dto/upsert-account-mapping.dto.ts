import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpsertAccountMappingDto {
  @ApiProperty({ description: 'Debit account ID', example: 'uuid' })
  @IsUUID()
  debitAccountId!: string;

  @ApiProperty({ description: 'Credit account ID', example: 'uuid' })
  @IsUUID()
  creditAccountId!: string;

  @ApiProperty({
    required: false,
    description: 'Branch/location override (null for tenant default)',
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
