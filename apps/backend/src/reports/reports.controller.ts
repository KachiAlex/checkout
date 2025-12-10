import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @ApiOperation({ summary: 'Get sales report (paginated)' })
  @ApiResponse({ status: 200, description: 'Sales data' })
  async getSales(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('location_id') locationId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Request() req?: any,
  ) {
    // Parse limit and offset as numbers (they come as strings from query params)
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const offsetNum = offset ? parseInt(offset, 10) : undefined;
    return this.reportsService.getSales(from, to, locationId, req?.user?.tenantId, limitNum, offsetNum);
  }

  @Get('top-sellers')
  @ApiOperation({ summary: 'Get top selling products' })
  @ApiResponse({ status: 200, description: 'Top sellers data' })
  async getTopSellers(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('location_id') locationId?: string,
    @Query('limit') limit?: number,
    @Request() req?: any,
  ) {
    return this.reportsService.getTopSellers(from, to, locationId, limit, req?.user?.tenantId);
  }

  @Get('sales-analytics')
  @ApiOperation({ summary: 'Get sales analytics by period (daily/weekly/monthly)' })
  @ApiResponse({ status: 200, description: 'Sales analytics data' })
  async getSalesAnalytics(
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
    @Query('location_id') locationId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Request() req?: any,
  ) {
    return this.reportsService.getSalesAnalytics(period, locationId, from, to, req?.user?.tenantId);
  }

  @Get('inventory-analytics')
  @ApiOperation({ summary: 'Get inventory analytics by period (daily/weekly/monthly)' })
  @ApiResponse({ status: 200, description: 'Inventory analytics data' })
  async getInventoryAnalytics(
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
    @Query('location_id') locationId?: string,
    @Request() req?: any,
  ) {
    return this.reportsService.getInventoryAnalytics(period, locationId, req?.user?.tenantId);
  }

  @Get('staff-performance')
  @ApiOperation({ summary: 'Get staff performance analytics (sales and inventory)' })
  @ApiResponse({ status: 200, description: 'Staff performance data' })
  async getStaffPerformance(
    @Query('location_id') locationId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.getStaffPerformance(locationId, from, to);
  }

  // ========== PHASE 1 ENDPOINTS ==========

  @Get('alerts')
  @ApiOperation({ summary: 'Get smart alerts (stock-outs, low sales, customer inactivity, staff performance)' })
  @ApiResponse({ status: 200, description: 'Alerts data' })
  async getAlerts(
    @Query('location_id') locationId?: string,
    @Request() req?: any,
  ) {
    return this.reportsService.getAlerts(locationId, req?.user?.tenantId);
  }

  @Get('fraud-detection')
  @ApiOperation({ summary: 'Get fraud detection alerts (discount abuse, suspicious patterns)' })
  @ApiResponse({ status: 200, description: 'Fraud detection data' })
  async getFraudDetection(
    @Query('location_id') locationId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.getFraudDetection(locationId, from, to);
  }

  @Get('expiry-analytics')
  @ApiOperation({ summary: 'Get expiry and batch analytics' })
  @ApiResponse({ status: 200, description: 'Expiry analytics data' })
  async getExpiryAnalytics(
    @Query('location_id') locationId?: string,
    @Request() req?: any,
  ) {
    return this.reportsService.getExpiryAnalytics(locationId, req?.user?.tenantId);
  }

  @Get('shrinkage-detection')
  @ApiOperation({ summary: 'Get inventory shrinkage detection (theoretical vs actual stock)' })
  @ApiResponse({ status: 200, description: 'Shrinkage detection data' })
  async getShrinkageDetection(
    @Query('location_id') locationId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Request() req?: any,
  ) {
    return this.reportsService.getShrinkageDetection(locationId, from, to, req?.user?.tenantId);
  }
}
