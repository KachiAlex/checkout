import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { LocationsRepository } from '../locations/locations.repository';

@ApiTags('purchase-orders')
@Controller('purchase-orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PurchaseOrdersController {
  constructor(
    private readonly purchaseOrdersService: PurchaseOrdersService,
    private readonly locationsRepository: LocationsRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all purchase orders for tenant' })
  @ApiResponse({ status: 200, description: 'List of purchase orders' })
  async findAll(@Request() req: any, @Query('location_id') locationId?: string) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context missing from request');
    }

    if (locationId) {
      await this.ensureLocationAccess(locationId, tenantId);
    }

    return this.purchaseOrdersService.findAll(tenantId, locationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase order by ID' })
  @ApiResponse({ status: 200, description: 'Purchase order found' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context missing from request');
    }
    return this.purchaseOrdersService.findById(id, tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new purchase order' })
  @ApiResponse({ status: 201, description: 'Purchase order created' })
  async create(@Body() createDto: CreatePurchaseOrderDto, @Request() req: any) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.sub || req.user?.id;
    if (!tenantId || !userId) {
      throw new BadRequestException('Missing tenant or user context');
    }

    let locationId = req.user?.locationId || createDto.locationId;

    if (locationId) {
      await this.ensureLocationAccess(locationId, tenantId);
    } else {
      const locations = await this.locationsRepository.findByTenant(tenantId);
      if (locations.length === 0) {
        throw new BadRequestException(
          'No locations found for this tenant. Please create a location first.',
        );
      }
      locationId = locations[0].id;
    }

    return this.purchaseOrdersService.create({
      tenantId,
      locationId,
      supplierId: createDto.supplierId,
      supplierName: '', // Will be filled by service
      items: createDto.items,
      subtotalCents: createDto.subtotalCents,
      taxCents: createDto.taxCents,
      totalCents: createDto.totalCents,
      expectedDeliveryDate: createDto.expectedDeliveryDate
        ? new Date(createDto.expectedDeliveryDate)
        : undefined,
      notes: createDto.notes,
      createdBy: userId,
    });
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a purchase order' })
  @ApiResponse({ status: 200, description: 'Purchase order approved' })
  async approve(@Param('id') id: string, @Request() req: any) {
    return this.purchaseOrdersService.approve(id, req.user.tenantId, req.user.sub || req.user.id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a purchase order' })
  @ApiResponse({ status: 200, description: 'Purchase order cancelled' })
  async cancel(@Param('id') id: string, @Request() req: any) {
    return this.purchaseOrdersService.cancel(id, req.user.tenantId);
  }

  private async ensureLocationAccess(locationId: string, tenantId: string) {
    const location = await this.locationsRepository.findById(locationId);
    if (!location) {
      throw new BadRequestException(`Location with ID ${locationId} not found`);
    }
    if (location.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied to this location');
    }
  }
}
