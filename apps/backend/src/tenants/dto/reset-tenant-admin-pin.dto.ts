import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional } from 'class-validator';

export class ResetTenantAdminPinDto {
  @ApiPropertyOptional({
    description: 'Specific admin email to target (defaults to primary contact when omitted)',
    example: 'admin@tenant.com',
  })
  @IsOptional()
  @IsEmail()
  adminEmail?: string;
}


