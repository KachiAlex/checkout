import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
  Req,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all customers for tenant' })
  @ApiResponse({ status: 200, description: 'List of customers' })
  async findAll(@Req() req: AuthenticatedRequest, @Query('search') search?: string) {
    try {
      const tenantId = this.getTenantId(req);

      const customers = await this.customersService.findAll(tenantId);

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
    } catch (error) {
      const normalizedError = error as Error & { code?: string };
      console.error('Error in customers.findAll:', error);
      console.error('Error details:', {
        message: normalizedError.message,
        code: normalizedError.code,
        stack: normalizedError.stack,
        tenantId: req.user?.tenantId,
        search,
      });

      // If it's already a NestJS exception, re-throw it
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Otherwise, wrap in InternalServerErrorException with helpful message
      throw new InternalServerErrorException(
        `Failed to fetch customers: ${normalizedError.message || 'Unknown error'}. Please check server logs for details.`,
      );
    }
  }

  @Get('search')
  @ApiOperation({ summary: 'Search customers by phone or loyalty ID' })
  @ApiResponse({ status: 200, description: 'Customer found' })
  async search(
    @Query('phone') phone?: string,
    @Query('loyaltyId') loyaltyId?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);

    if (phone) {
      return this.customersService.findByPhone(phone, tenantId);
    }
    if (loyaltyId) {
      return this.customersService.findByLoyaltyId(loyaltyId, tenantId);
    }
    return null;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiResponse({ status: 200, description: 'Customer found' })
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    return this.customersService.findById(id, tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({ status: 201, description: 'Customer created' })
  async create(@Body() createDto: CreateCustomerDto, @Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    return this.customersService.create({
      ...createDto,
      tenantId,
      dateOfBirth: createDto.dateOfBirth ? new Date(createDto.dateOfBirth) : undefined,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer' })
  @ApiResponse({ status: 200, description: 'Customer updated' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateCustomerDto>,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    return this.customersService.update(id, tenantId, {
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
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    return this.customersService.addLoyaltyPoints(id, tenantId, body.points);
  }

  @Post(':id/loyalty-points/redeem')
  @ApiOperation({ summary: 'Redeem loyalty points from customer' })
  @ApiResponse({ status: 200, description: 'Loyalty points redeemed' })
  async redeemLoyaltyPoints(
    @Param('id') id: string,
    @Body() body: { points: number },
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    return this.customersService.redeemLoyaltyPoints(id, tenantId, body.points);
  }

  @Post(':id/store-credit')
  @ApiOperation({ summary: 'Add store credit to customer' })
  @ApiResponse({ status: 200, description: 'Store credit added' })
  async addStoreCredit(
    @Param('id') id: string,
    @Body() body: { amountCents: number },
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    return this.customersService.addStoreCredit(id, tenantId, body.amountCents);
  }

  @Post(':id/store-credit/use')
  @ApiOperation({ summary: 'Use store credit from customer' })
  @ApiResponse({ status: 200, description: 'Store credit used' })
  async useStoreCredit(
    @Param('id') id: string,
    @Body() body: { amountCents: number },
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    return this.customersService.useStoreCredit(id, tenantId, body.amountCents);
  }

  @Get(':id/loyalty-transactions')
  @ApiOperation({ summary: 'Get loyalty points transaction history for a customer' })
  @ApiResponse({ status: 200, description: 'Transaction history' })
  async getLoyaltyTransactions(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.customersService.getLoyaltyTransactions(id, tenantId, limitNum);
  }

  private getTenantId(req?: AuthenticatedRequest): string {
    const tenantId = req?.user?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID is required');
    }
    return tenantId;
  }
}
