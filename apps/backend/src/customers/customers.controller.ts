import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCustomerDto } from './dto/create-customer.dto';

@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all customers for tenant' })
  @ApiResponse({ status: 200, description: 'List of customers' })
  async findAll(@Request() req: any, @Query('search') search?: string) {
    if (!req?.user?.tenantId) {
      throw new UnauthorizedException('Tenant ID is required');
    }
    
    const customers = await this.customersService.findAll(req.user.tenantId);
    
    // Simple search filter with null safety
    if (search) {
      const searchLower = search.toLowerCase().trim();
      return customers.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(searchLower)) ||
          (c.phone && c.phone.toLowerCase().includes(searchLower)) ||
          (c.email && c.email.toLowerCase().includes(searchLower)) ||
          (c.loyaltyId && c.loyaltyId.toLowerCase().includes(searchLower)),
      );
    }
    
    return customers;
  }

  @Get('search')
  @ApiOperation({ summary: 'Search customers by phone or loyalty ID' })
  @ApiResponse({ status: 200, description: 'Customer found' })
  async search(
    @Query('phone') phone?: string,
    @Query('loyaltyId') loyaltyId?: string,
    @Request() req?: any,
  ) {
    if (!req?.user?.tenantId) {
      throw new UnauthorizedException('Tenant ID is required');
    }
    
    if (phone) {
      return this.customersService.findByPhone(phone, req.user.tenantId);
    }
    if (loyaltyId) {
      return this.customersService.findByLoyaltyId(loyaltyId, req.user.tenantId);
    }
    return null;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiResponse({ status: 200, description: 'Customer found' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.customersService.findById(id, req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({ status: 201, description: 'Customer created' })
  async create(@Body() createDto: CreateCustomerDto, @Request() req: any) {
    return this.customersService.create({
      ...createDto,
      tenantId: req.user.tenantId,
      dateOfBirth: createDto.dateOfBirth ? new Date(createDto.dateOfBirth) : undefined,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer' })
  @ApiResponse({ status: 200, description: 'Customer updated' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateCustomerDto>,
    @Request() req: any,
  ) {
    return this.customersService.update(id, req.user.tenantId, {
      ...updateDto,
      dateOfBirth: updateDto.dateOfBirth ? new Date(updateDto.dateOfBirth) : undefined,
    });
  }

  @Post(':id/loyalty-points')
  @ApiOperation({ summary: 'Add loyalty points to customer' })
  @ApiResponse({ status: 200, description: 'Loyalty points added' })
  async addLoyaltyPoints(
    @Param('id') id: string,
    @Body() body: { points: number },
    @Request() req: any,
  ) {
    return this.customersService.addLoyaltyPoints(id, req.user.tenantId, body.points);
  }

  @Post(':id/loyalty-points/redeem')
  @ApiOperation({ summary: 'Redeem loyalty points from customer' })
  @ApiResponse({ status: 200, description: 'Loyalty points redeemed' })
  async redeemLoyaltyPoints(
    @Param('id') id: string,
    @Body() body: { points: number },
    @Request() req: any,
  ) {
    return this.customersService.redeemLoyaltyPoints(id, req.user.tenantId, body.points);
  }

  @Post(':id/store-credit')
  @ApiOperation({ summary: 'Add store credit to customer' })
  @ApiResponse({ status: 200, description: 'Store credit added' })
  async addStoreCredit(
    @Param('id') id: string,
    @Body() body: { amountCents: number },
    @Request() req: any,
  ) {
    return this.customersService.addStoreCredit(id, req.user.tenantId, body.amountCents);
  }

  @Post(':id/store-credit/use')
  @ApiOperation({ summary: 'Use store credit from customer' })
  @ApiResponse({ status: 200, description: 'Store credit used' })
  async useStoreCredit(
    @Param('id') id: string,
    @Body() body: { amountCents: number },
    @Request() req: any,
  ) {
    return this.customersService.useStoreCredit(id, req.user.tenantId, body.amountCents);
  }

  @Get(':id/loyalty-transactions')
  @ApiOperation({ summary: 'Get loyalty points transaction history for a customer' })
  @ApiResponse({ status: 200, description: 'Transaction history' })
  async getLoyaltyTransactions(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.customersService.getLoyaltyTransactions(id, req.user.tenantId, limitNum);
  }
}

