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
}
