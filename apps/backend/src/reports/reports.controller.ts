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
  @ApiOperation({ summary: 'Get sales report' })
  @ApiResponse({ status: 200, description: 'Sales data' })
  async getSales(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('location_id') locationId?: string,
  ) {
    return this.reportsService.getSales(from, to, locationId);
  }

  @Get('top-sellers')
  @ApiOperation({ summary: 'Get top selling products' })
  @ApiResponse({ status: 200, description: 'Top sellers data' })
  async getTopSellers(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('location_id') locationId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.reportsService.getTopSellers(from, to, locationId, limit);
  }

  @Get('sales-analytics')
  @ApiOperation({ summary: 'Get sales analytics by period (daily/weekly/monthly)' })
  @ApiResponse({ status: 200, description: 'Sales analytics data' })
  async getSalesAnalytics(
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
    @Query('location_id') locationId?: string,
  ) {
    return this.reportsService.getSalesAnalytics(period, locationId);
  }

  @Get('inventory-analytics')
  @ApiOperation({ summary: 'Get inventory analytics by period (daily/weekly/monthly)' })
  @ApiResponse({ status: 200, description: 'Inventory analytics data' })
  async getInventoryAnalytics(
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
    @Query('location_id') locationId?: string,
  ) {
    return this.reportsService.getInventoryAnalytics(period, locationId);
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
