import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { PlatformAnalyticsService, PlatformAnalyticsPeriod } from './platform-analytics.service';
import { TenantPlan, TenantStatus } from '@pos-checkout/shared';

@ApiTags('platform-analytics')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('platform/analytics')
export class PlatformAnalyticsController {
  constructor(private readonly analyticsService: PlatformAnalyticsService) {}

  @Get('revenue')
  @ApiOperation({
    summary: 'Platform revenue analytics for license sales (Super Admin only)',
  })
  getRevenueAnalytics(
    @Query('period') period: PlatformAnalyticsPeriod = 'monthly',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getRevenueAnalytics(period, from, to);
  }

  @Get('clients')
  @ApiOperation({
    summary: 'List platform clients (tenants) with subscription insights (Super Admin only)',
  })
  async getClientsOverview(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('plan') plan?: string,
    @Query('status') status?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const offsetNum = offset ? parseInt(offset, 10) : undefined;
    const planEnum = plan ? (plan.toUpperCase() as TenantPlan) : undefined;
    const statusEnum = status ? (status.toUpperCase() as TenantStatus) : undefined;

    return this.analyticsService.getClientsOverview({
      limit: limitNum,
      offset: offsetNum,
      plan: planEnum,
      status: statusEnum,
    });
  }
}
