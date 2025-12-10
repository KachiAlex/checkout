import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order (idempotent)' })
  @ApiResponse({ status: 201, description: 'Order created' })
  @ApiResponse({ status: 409, description: 'Insufficient inventory' })
  async create(@Body() createOrderDto: CreateOrderDto, @Request() req: any) {
    return this.ordersService.create(createOrderDto, req.user.sub, req.user.tenantId, req.user.locationId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders (sales)' })
  @ApiResponse({ status: 200, description: 'List of orders' })
  async findAll(
    @Request() req: any,
    @Query('location_id') locationId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    // Ensure location belongs to tenant if provided
    if (locationId) {
      await this.ordersService.verifyLocationAccess(locationId, req.user.tenantId);
    }
    
    return this.ordersService.findAll(locationId, from, to, status, req.user.tenantId);
  }

  // Specific routes must come before parameterized routes (:id)
  @Get('held')
  @ApiOperation({ summary: 'Get all held/suspended orders' })
  @ApiResponse({ status: 200, description: 'List of held orders' })
  async findHeldOrders(@Request() req: any, @Query('location_id') locationId?: string) {
    // Ensure location belongs to tenant if provided
    if (locationId) {
      await this.ordersService.verifyLocationAccess(locationId, req.user.tenantId);
    }
    
    return this.ordersService.findHeldOrders(locationId, req.user.tenantId);
  }

  @Get('credit')
  @ApiOperation({ summary: 'Get all credit orders (products taken on credit)' })
  @ApiResponse({ status: 200, description: 'List of credit orders' })
  async getCreditOrders(
    @Request() req: any,
    @Query('location_id') locationId?: string,
  ) {
    // Ensure location belongs to tenant if provided
    if (locationId) {
      await this.ordersService.verifyLocationAccess(locationId, req.user.tenantId);
    }
    
    return this.ordersService.findCreditOrders(locationId, req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order found' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const order = await this.ordersService.findOne(id);
    
    // Verify order belongs to user's tenant via location
    const hasAccess = await this.ordersService.verifyTenantAccess(order, req.user.tenantId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this order');
    }
    
    return order;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update order status' })
  @ApiResponse({ status: 200, description: 'Order updated' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: { status?: string; notes?: string },
    @Request() req: any,
  ) {
    const order = await this.ordersService.findOne(id);
    
    // Verify order belongs to user's tenant
    const hasAccess = await this.ordersService.verifyTenantAccess(order, req.user.tenantId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this order');
    }
    
    return this.ordersService.update(id, updateDto);
  }

  @Post(':id/hold')
  @ApiOperation({ summary: 'Hold/suspend an order' })
  @ApiResponse({ status: 200, description: 'Order held' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async holdOrder(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const order = await this.ordersService.findOne(id);
    
    const hasAccess = await this.ordersService.verifyTenantAccess(order, req.user.tenantId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this order');
    }
    
    return this.ordersService.holdOrder(id);
  }

  @Post(':id/recall')
  @ApiOperation({ summary: 'Recall a held order' })
  @ApiResponse({ status: 200, description: 'Order recalled' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async recallOrder(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const order = await this.ordersService.findOne(id);
    
    const hasAccess = await this.ordersService.verifyTenantAccess(order, req.user.tenantId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this order');
    }
    
    return this.ordersService.recallOrder(id);
  }

  @Post(':id/complete-held')
  @ApiOperation({ summary: 'Complete a held order (decrements inventory)' })
  @ApiResponse({ status: 200, description: 'Held order completed' })
  async completeHeldOrder(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.ordersService.completeHeldOrder(id, req.user.tenantId);
  }

  @Post(':id/credit/mark-paid')
  @ApiOperation({ summary: 'Mark a credit order as paid' })
  @ApiResponse({ status: 200, description: 'Credit order marked as paid' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 400, description: 'Order is not a credit order or already paid' })
  async markCreditOrderAsPaid(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const order = await this.ordersService.findOne(id);
    
    const hasAccess = await this.ordersService.verifyTenantAccess(order, req.user.tenantId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this order');
    }
    
    return this.ordersService.markCreditOrderAsPaid(id, req.user.sub, req.user.tenantId);
  }

  @Post(':id/credit/mark-returned')
  @ApiOperation({ summary: 'Mark a credit order as returned (products returned)' })
  @ApiResponse({ status: 200, description: 'Credit order marked as returned' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 400, description: 'Order is not a credit order or already returned' })
  async markCreditOrderAsReturned(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const order = await this.ordersService.findOne(id);
    
    const hasAccess = await this.ordersService.verifyTenantAccess(order, req.user.tenantId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this order');
    }
    
    return this.ordersService.markCreditOrderAsReturned(id, req.user.sub, req.user.tenantId);
  }
}
