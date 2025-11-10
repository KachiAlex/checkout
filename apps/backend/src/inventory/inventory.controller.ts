import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get(':location_id/stock')
  @ApiOperation({ summary: 'Get inventory stock for a location' })
  @ApiResponse({ status: 200, description: 'Inventory stock list' })
  async getStock(@Param('location_id') locationId: string) {
    return this.inventoryService.getStock(locationId);
  }

  @Post('adjust')
  @ApiOperation({ summary: 'Adjust inventory quantity' })
  @ApiResponse({ status: 201, description: 'Inventory adjusted' })
  async adjust(@Body() adjustDto: AdjustInventoryDto) {
    return this.inventoryService.adjust(adjustDto);
  }

  @Get(':location_id/transactions')
  @ApiOperation({ summary: 'Get inventory transactions for a location' })
  @ApiResponse({ status: 200, description: 'Inventory transactions list' })
  async getTransactions(
    @Param('location_id') locationId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.inventoryService.getTransactions(locationId, from, to);
  }
}
