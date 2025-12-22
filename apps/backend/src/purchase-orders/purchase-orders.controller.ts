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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';

@ApiTags('purchase-orders')
@Controller('purchase-orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all purchase orders for tenant' })
  @ApiResponse({ status: 200, description: 'List of purchase orders' })
  async findAll(@Request() req: any, @Query('location_id') locationId?: string) {
    return this.purchaseOrdersService.findAll(req.user.tenantId, locationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase order by ID' })
  @ApiResponse({ status: 200, description: 'Purchase order found' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.purchaseOrdersService.findById(id, req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new purchase order' })
  @ApiResponse({ status: 201, description: 'Purchase order created' })
  async create(@Body() createDto: CreatePurchaseOrderDto, @Request() req: any) {
    const locationId = req.user?.locationId || createDto.locationId;
    if (!locationId) {
      throw new Error('Location ID is required');
    }

    return this.purchaseOrdersService.create({
      tenantId: req.user.tenantId,
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
      createdBy: req.user.sub || req.user.id,
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
}
