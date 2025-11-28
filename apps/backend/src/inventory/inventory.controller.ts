import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LocationsRepository } from '../locations/locations.repository';

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly locationsRepository: LocationsRepository,
  ) {}

  @Get(':location_id/stock')
  @ApiOperation({ summary: 'Get inventory stock for a location' })
  @ApiResponse({ status: 200, description: 'Inventory stock list' })
  async getStock(
    @Param('location_id') locationId: string,
    @Request() req: any,
  ) {
    const tenantId = req.user?.tenantId;
    return this.inventoryService.getStock(locationId, tenantId);
  }

  @Get(':location_id/batch/:product_id')
  @ApiOperation({ summary: 'Get batch inventory for a product' })
  @ApiResponse({ status: 200, description: 'Batch inventory list' })
  async getBatchInventory(
    @Param('location_id') locationId: string,
    @Param('product_id') productId: string,
  ) {
    return this.inventoryService.getBatchInventory(productId, locationId);
  }

  @Post('adjust')
  @ApiOperation({ summary: 'Adjust inventory quantity' })
  @ApiResponse({ status: 201, description: 'Inventory adjusted' })
  async adjust(@Body() adjustDto: AdjustInventoryDto, @Request() req: any) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.sub || req.user?.id;

    if (!tenantId || !userId) {
      throw new BadRequestException('Missing required user information (tenantId or userId)');
    }

    // Build clean DTO with only required fields and valid optional fields
    const cleanDto: any = {
      productId: adjustDto.productId,
      delta: adjustDto.delta,
      type: adjustDto.type,
    };

    // Ignore locationId, userId, and referenceId from request - they will be resolved automatically
    // Only include referenceId if explicitly provided and valid (for order returns, etc.)
    if (adjustDto.referenceId != null && adjustDto.referenceId !== undefined && adjustDto.referenceId !== '') {
      const referenceIdStr = String(adjustDto.referenceId).trim();
      if (referenceIdStr !== '' && isUUID(referenceIdStr)) {
        cleanDto.referenceId = referenceIdStr;
      }
    }

    // Include notes and reason if provided
    if (adjustDto.notes) {
      cleanDto.notes = adjustDto.notes;
    }
    if (adjustDto.reason) {
      cleanDto.reason = adjustDto.reason;
    }

    // Automatically resolve locationId from user context (skip if already in cleanDto)
    let locationId = cleanDto.locationId || req.user?.locationId;

    // If still no locationId, get the first location for the tenant
    if (!locationId) {
      const locations = await this.locationsRepository.findByTenant(tenantId);
      if (locations.length === 0) {
        throw new BadRequestException('No locations found for this tenant. Please create a location first.');
      }
      locationId = locations[0].id;
    }

    // Update the DTO with the resolved locationId and userId
    const adjustedDto = {
      ...cleanDto,
      locationId,
      userId: cleanDto.userId || userId,
    };
    
    return this.inventoryService.adjust(adjustedDto);
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

  @Post('create-item')
  @ApiOperation({ summary: 'Create product and inventory in one operation' })
  @ApiResponse({ status: 201, description: 'Product and inventory created' })
  async createInventoryItem(
    @Body() createDto: CreateInventoryItemDto,
    @Request() req: any,
  ) {
    // Extract user info from JWT payload (sub is the user ID)
    const userId = req.user?.sub || req.user?.id;
    const tenantId = req.user?.tenantId;
    let locationId = req.user?.locationId;

    if (!tenantId || !userId) {
      throw new BadRequestException('Missing required user information (tenantId or userId)');
    }

    // For platform admins or users without locationId, get the first location for the tenant
    if (!locationId) {
      const locations = await this.locationsRepository.findByTenant(tenantId);
      if (locations.length === 0) {
        throw new BadRequestException('No locations found for this tenant. Please create a location first.');
      }
      locationId = locations[0].id;
    }

    return this.inventoryService.createInventoryItem(
      createDto,
      locationId,
      tenantId,
      userId,
    );
  }

  @Get('duplicates')
  @ApiOperation({ summary: 'Find duplicate inventory entries' })
  @ApiResponse({ status: 200, description: 'List of duplicate inventory entries' })
  async findDuplicates() {
    return this.inventoryService.findDuplicates();
  }

  @Post('remove-duplicates')
  @ApiOperation({ summary: 'Remove duplicate inventory entries (keeps the oldest one)' })
  @ApiResponse({ status: 200, description: 'Duplicates removed' })
  async removeDuplicates() {
    return this.inventoryService.removeDuplicates();
  }

  @Delete('clear-all')
  @ApiOperation({ summary: 'Clear all inventory (CAUTION: This deletes all inventory records)' })
  @ApiResponse({ status: 200, description: 'All inventory cleared' })
  async clearAllInventory() {
    const count = await this.inventoryService.clearAllInventory();
    return { message: `Cleared ${count} inventory records`, count };
  }
}
