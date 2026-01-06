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
  Req,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

type AuthenticatedRequest = Request & {
  user?: JwtPayload & { locationId?: string };
};

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
  async create(@Body() createOrderDto: CreateOrderDto, @Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    const userId = this.getUserId(req);
    const locationId = req.user?.locationId;
    return this.ordersService.create(
      createOrderDto,
      userId,
      tenantId,
      locationId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders (sales)' })
  @ApiResponse({ status: 200, description: 'List of orders' })
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query('location_id') locationId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    const tenantId = this.getTenantId(req);
    // Ensure location belongs to tenant if provided
    if (locationId) {
      await this.ordersService.verifyLocationAccess(locationId, tenantId);
    }

    return this.ordersService.findAll(locationId, from, to, status, tenantId);
  }

  // Specific routes must come before parameterized routes (:id)
  @Get('held')
  @ApiOperation({ summary: 'Get all held/suspended orders' })
  @ApiResponse({ status: 200, description: 'List of held orders' })
  async findHeldOrders(@Req() req: AuthenticatedRequest, @Query('location_id') locationId?: string) {
    const tenantId = this.getTenantId(req);
    // Ensure location belongs to tenant if provided
    if (locationId) {
      await this.ordersService.verifyLocationAccess(locationId, tenantId);
    }

    return this.ordersService.findHeldOrders(locationId, tenantId);
  }

  @Get('credit')
  @ApiOperation({ summary: 'Get all credit orders (products taken on credit)' })
  @ApiResponse({ status: 200, description: 'List of credit orders' })
  async getCreditOrders(@Req() req: AuthenticatedRequest, @Query('location_id') locationId?: string) {
    const tenantId = this.getTenantId(req);
    // Ensure location belongs to tenant if provided
    if (locationId) {
      await this.ordersService.verifyLocationAccess(locationId, tenantId);
    }

    return this.ordersService.findCreditOrders(locationId, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order found' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    const order = await this.ordersService.findOne(id);

    // Verify order belongs to user's tenant via location
    const hasAccess = await this.ordersService.verifyTenantAccess(order, tenantId);
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
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const order = await this.ordersService.findOne(id);

    // Verify order belongs to user's tenant
    const hasAccess = await this.ordersService.verifyTenantAccess(order, tenantId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this order');
    }

    return this.ordersService.update(id, updateDto);
  }

  @Post(':id/hold')
  @ApiOperation({ summary: 'Hold/suspend an order' })
  @ApiResponse({ status: 200, description: 'Order held' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async holdOrder(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    const order = await this.ordersService.findOne(id);

    const hasAccess = await this.ordersService.verifyTenantAccess(order, tenantId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this order');
    }

    return this.ordersService.holdOrder(id);
  }

  @Post(':id/recall')
  @ApiOperation({ summary: 'Recall a held order' })
  @ApiResponse({ status: 200, description: 'Order recalled' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async recallOrder(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    const order = await this.ordersService.findOne(id);

    const hasAccess = await this.ordersService.verifyTenantAccess(order, tenantId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this order');
    }

    return this.ordersService.recallOrder(id);
  }

  @Post(':id/complete-held')
  @ApiOperation({ summary: 'Complete a held order (decrements inventory)' })
  @ApiResponse({ status: 200, description: 'Held order completed' })
  async completeHeldOrder(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    return this.ordersService.completeHeldOrder(id, tenantId);
  }

  @Post(':id/credit/mark-paid')
  @ApiOperation({ summary: 'Mark a credit order as paid' })
  @ApiResponse({ status: 200, description: 'Credit order marked as paid' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 400, description: 'Order is not a credit order or already paid' })
  async markCreditOrderAsPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const userId = this.getUserId(req);
    const order = await this.ordersService.findOne(id);

    const hasAccess = await this.ordersService.verifyTenantAccess(order, tenantId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this order');
    }

    return this.ordersService.markCreditOrderAsPaid(id, userId, tenantId);
  }

  @Post(':id/credit/mark-returned')
  @ApiOperation({ summary: 'Mark a credit order as returned (products returned)' })
  @ApiResponse({ status: 200, description: 'Credit order marked as returned' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 400, description: 'Order is not a credit order or already returned' })
  async markCreditOrderAsReturned(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const userId = this.getUserId(req);
    const order = await this.ordersService.findOne(id);

    const hasAccess = await this.ordersService.verifyTenantAccess(order, tenantId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this order');
    }

    return this.ordersService.markCreditOrderAsReturned(id, userId, tenantId);
  }

  private getTenantId(req: AuthenticatedRequest): string {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context missing');
    }
    return tenantId;
  }

  private getUserId(req: AuthenticatedRequest): string {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User context missing');
    }
    return userId;
  }
}
