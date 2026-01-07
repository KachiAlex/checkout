import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '@pos-checkout/shared';
import { Request } from 'express';
import { AccountingReportsService } from './accounting-reports.service';

interface AuthenticatedUser {
  tenantId: string;
  sub: string;
  role?: UserRole;
  isPlatformAdmin?: boolean;
  locationId?: string;
}

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@ApiTags('admin-accounting-reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('admin/accounting/reports')
export class AdminAccountingReportsController {
  constructor(private readonly reportsService: AccountingReportsService) {}

  private ensureTenantAdmin(req: AuthenticatedRequest) {
    if (req.user?.isPlatformAdmin) return;
    if (req.user?.role === UserRole.ADMIN) return;
    throw new ForbiddenException('Only tenant administrators can access accounting reports');
  }

  private ensureValidDate(value: string | undefined, field: string) {
    if (!value) return;
    if (Number.isNaN(Date.parse(value))) {
      throw new BadRequestException(`Invalid ${field} date`);
    }
  }

  @Get('general-ledger')
  @ApiOperation({ summary: 'General ledger for an account' })
  async generalLedger(
    @Req() req: AuthenticatedRequest,
    @Query('accountId') accountId?: string,
    @Query('locationId') locationId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    this.ensureTenantAdmin(req);
    if (!accountId) {
      throw new BadRequestException('accountId is required');
    }
    this.ensureValidDate(from, 'from');
    this.ensureValidDate(to, 'to');

    return this.reportsService.generalLedger({
      tenantId: req.user.tenantId,
      accountId,
      locationId,
      from,
      to,
    });
  }

  @Get('trial-balance')
  @ApiOperation({ summary: 'Trial balance' })
  async trialBalance(
    @Req() req: AuthenticatedRequest,
    @Query('locationId') locationId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    this.ensureTenantAdmin(req);
    this.ensureValidDate(from, 'from');
    this.ensureValidDate(to, 'to');

    return this.reportsService.trialBalance({
      tenantId: req.user.tenantId,
      locationId,
      from,
      to,
    });
  }

  @Get('profit-loss')
  @ApiOperation({ summary: 'Profit and loss statement (income statement)' })
  async profitAndLoss(
    @Req() req: AuthenticatedRequest,
    @Query('locationId') locationId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    this.ensureTenantAdmin(req);
    this.ensureValidDate(from, 'from');
    this.ensureValidDate(to, 'to');

    return this.reportsService.profitAndLoss({
      tenantId: req.user.tenantId,
      locationId,
      from,
      to,
    });
  }

  @Get('balance-sheet')
  @ApiOperation({ summary: 'Balance sheet' })
  async balanceSheet(
    @Req() req: AuthenticatedRequest,
    @Query('locationId') locationId?: string,
    @Query('asOf') asOf?: string,
  ) {
    this.ensureTenantAdmin(req);
    this.ensureValidDate(asOf, 'asOf');

    return this.reportsService.balanceSheet({
      tenantId: req.user.tenantId,
      locationId,
      asOf,
    });
  }
}
