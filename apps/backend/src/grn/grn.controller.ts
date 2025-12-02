import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GRNService } from './grn.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateGRNDto } from './dto/create-grn.dto';
import { PurchaseOrdersRepository } from '../purchase-orders/purchase-orders.repository';

@ApiTags('grn')
@Controller('grn')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class GRNController {
  constructor(
    private readonly grnService: GRNService,
    private readonly purchaseOrdersRepository: PurchaseOrdersRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all GRNs for tenant' })
  @ApiResponse({ status: 200, description: 'List of GRNs' })
  async findAll(@Request() req: any, @Query('location_id') locationId?: string) {
    return this.grnService.findAll(req.user.tenantId, locationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get GRN by ID' })
  @ApiResponse({ status: 200, description: 'GRN found' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.grnService.findById(id, req.user.tenantId);
  }

  @Get('purchase-order/:poId')
  @ApiOperation({ summary: 'Get GRNs for a purchase order' })
  @ApiResponse({ status: 200, description: 'List of GRNs for purchase order' })
  async findByPurchaseOrder(@Param('poId') poId: string, @Request() req: any) {
    const po = await this.purchaseOrdersRepository.findById(poId, req.user.tenantId);
    if (!po) {
      throw new Error(`Purchase order with ID ${poId} not found`);
    }
    return {
      purchaseOrder: po,
      grns: await this.grnService.findAll(req.user.tenantId, req.user.locationId),
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new GRN (Goods Received Note)' })
  @ApiResponse({ status: 201, description: 'GRN created and inventory updated' })
  async create(@Body() createDto: CreateGRNDto, @Request() req: any) {
    const locationId = req.user?.locationId;
    if (!locationId) {
      throw new Error('Location ID is required');
    }

    // Get purchase order to get supplier info
    const po = await this.purchaseOrdersRepository.findById(createDto.purchaseOrderId, req.user.tenantId);
    if (!po) {
      throw new Error(`Purchase order with ID ${createDto.purchaseOrderId} not found`);
    }

    const result = await this.grnService.create({
      tenantId: req.user.tenantId,
      locationId,
      purchaseOrderId: createDto.purchaseOrderId,
      purchaseOrderNumber: po.orderNumber,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      items: createDto.items.map(item => ({
        ...item,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
      })),
      subtotalCents: createDto.subtotalCents,
      taxCents: createDto.taxCents,
      totalCents: createDto.totalCents,
      receivedBy: req.user.sub || req.user.id,
      notes: createDto.notes,
    });
    
    // Return GRN with metadata for frontend notifications
    return {
      ...result.grn,
      metadata: result.metadata,
    };
  }
}

