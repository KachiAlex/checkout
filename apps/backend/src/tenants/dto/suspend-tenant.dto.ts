import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SuspendTenantDto {
  @ApiPropertyOptional({
    description: 'Reason for suspending the tenant',
    example: 'Overdue invoice - awaiting settlement',
  })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  reason?: string;
}


