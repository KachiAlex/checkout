import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { SubscriptionPricingService } from './subscription-pricing.service';
import { SubscriptionPricingEntity } from './subscription-pricing.entity';
import { UpdateSubscriptionPricingDto } from './dto/update-subscription-pricing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';

@ApiTags('subscription-pricing')
@Controller('api/v1/subscription-pricing')
export class SubscriptionPricingController {
  constructor(private readonly pricingService: SubscriptionPricingService) {}

  @Get()
  @ApiOperation({ summary: 'Get subscription pricing configuration (public)' })
  @ApiOkResponse({ description: 'Returns subscription pricing tiers' })
  async getPricing(): Promise<SubscriptionPricingEntity> {
    return this.pricingService.getPricing();
  }

  @Put()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update subscription pricing (Super Admin only)' })
  @ApiOkResponse({ description: 'Returns updated subscription pricing' })
  async updatePricing(
    @Body() dto: UpdateSubscriptionPricingDto,
    @Request() req: any,
  ): Promise<SubscriptionPricingEntity> {
    const userId = req.user?.userId || req.user?.id;
    return this.pricingService.updatePricing(dto, userId);
  }
}

