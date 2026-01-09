import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UserRole } from '@pos-checkout/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { AuditLogService } from './audit-log.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs.dto';
import { PurgeAuditLogsDto } from './dto/purge-audit-logs.dto';

type AuthenticatedUser = {
  tenantId: string;
  sub: string;
  role?: UserRole;
};

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@ApiTags('audit-logs')
@Controller('audit-logs')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class AuditLogsController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs (admin/manager)' })
  async list(@Req() req: AuthenticatedRequest, @Query() query: ListAuditLogsQueryDto) {
    return this.auditLogService.list(req.user.tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single audit log by id (admin/manager)' })
  async get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.auditLogService.getById(req.user.tenantId, id);
  }

  @Post('purge')
  @ApiOperation({ summary: 'Purge audit logs older than retention window (admin only)' })
  @Roles(UserRole.ADMIN)
  async purge(@Req() req: AuthenticatedRequest, @Query() query: PurgeAuditLogsDto) {
    return this.auditLogService.purgeOlderThanDays(req.user.tenantId, query.retentionDays ?? 90);
  }
}
