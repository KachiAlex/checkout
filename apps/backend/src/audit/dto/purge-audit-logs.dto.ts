import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PurgeAuditLogsDto {
  @ApiPropertyOptional({
    description: 'Retention in days. Logs older than this will be deleted.',
    default: 90,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  retentionDays?: number;
}
