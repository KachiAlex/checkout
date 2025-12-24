import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GRNService } from './grn.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateGRNDto } from './dto/create-grn.dto';
import { PurchaseOrdersRepository } from '../purchase-orders/purchase-orders.repository';
import { LocationsRepository } from '../locations/locations.repository';

@ApiTags('grn')
@Controller('grn')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class GRNController {
  constructor(
    private readonly grnService: GRNService,
    private readonly purchaseOrdersRepository: PurchaseOrdersRepository,
    private readonly locationsRepository: LocationsRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all GRNs for tenant' })
  @ApiResponse({ status: 200, description: 'List of GRNs' })
  async findAll(@Request() req: any, @Query('location_id') locationId?: string) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context missing from request');
    }

    if (locationId) {
      await this.ensureLocationAccess(locationId, tenantId);
    }

    return this.grnService.findAll(tenantId, locationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get GRN by ID' })
  @ApiResponse({ status: 200, description: 'GRN found' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context missing from request');
    }
    return this.grnService.findById(id, tenantId);
  }

  @Get('purchase-order/:poId')
  @ApiOperation({ summary: 'Get GRNs for a purchase order' })
  @ApiResponse({ status: 200, description: 'List of GRNs for purchase order' })
  async findByPurchaseOrder(@Param('poId') poId: string, @Request() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context missing from request');
    }

    const po = await this.purchaseOrdersRepository.findById(poId, tenantId);
    if (!po) {
      throw new Error(`Purchase order with ID ${poId} not found`);
    }
    const locationId = req.user?.locationId;
    if (locationId) {
      await this.ensureLocationAccess(locationId, tenantId);
    }

    return {
      purchaseOrder: po,
      grns: await this.grnService.findAll(tenantId, locationId),
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new GRN (Goods Received Note)' })
  @ApiResponse({ status: 201, description: 'GRN created and inventory updated' })
  async create(@Body() createDto: CreateGRNDto, @Request() req: any) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.sub || req.user?.id;
    if (!tenantId || !userId) {
      throw new BadRequestException('Missing tenant or user context');
    }

    let locationId = req.user?.locationId;
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

    // Get purchase order to get supplier info
    const po = await this.purchaseOrdersRepository.findById(createDto.purchaseOrderId, tenantId);
    if (!po) {
      throw new Error(`Purchase order with ID ${createDto.purchaseOrderId} not found`);
    }

    const result = await this.grnService.create({
      tenantId,
      locationId,
      purchaseOrderId: createDto.purchaseOrderId,
      purchaseOrderNumber: po.orderNumber,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      items: createDto.items.map((item) => ({
        ...item,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
      })),
      subtotalCents: createDto.subtotalCents,
      taxCents: createDto.taxCents,
      totalCents: createDto.totalCents,
      receivedBy: userId,
      notes: createDto.notes,
    });

    // Return GRN with metadata for frontend notifications
    return {
      ...result.grn,
      metadata: result.metadata,
    };
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
