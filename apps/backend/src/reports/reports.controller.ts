import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseUUIDPipe,
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
}
