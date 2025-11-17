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

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order found' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update order status' })
  @ApiResponse({ status: 200, description: 'Order updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: { status?: string; notes?: string },
  ) {
    return this.ordersService.update(id, updateDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders (sales)' })
  @ApiResponse({ status: 200, description: 'List of orders' })
  async findAll(
    @Query('location_id') locationId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    return this.ordersService.findAll(locationId, from, to, status);
  }

  @Get('held')
  @ApiOperation({ summary: 'Get all held/suspended orders' })
  @ApiResponse({ status: 200, description: 'List of held orders' })
  async findHeldOrders(@Query('location_id') locationId?: string) {
    return this.ordersService.findHeldOrders(locationId);
  }

  @Post(':id/hold')
  @ApiOperation({ summary: 'Hold/suspend an order' })
  @ApiResponse({ status: 200, description: 'Order held' })
  async holdOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.holdOrder(id);
  }

  @Post(':id/recall')
  @ApiOperation({ summary: 'Recall a held order' })
  @ApiResponse({ status: 200, description: 'Order recalled' })
  async recallOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.recallOrder(id);
  }

  @Post(':id/complete-held')
  @ApiOperation({ summary: 'Complete a held order (decrements inventory)' })
  @ApiResponse({ status: 200, description: 'Held order completed' })
  async completeHeldOrder(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.ordersService.completeHeldOrder(id, req.user.tenantId);
  }
}
