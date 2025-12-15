import { Body, Controller, Post, Get, Query, Param, Headers } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { PlatformService } from './platform.service';
import { RegisterDto } from './dto/register.dto';

@ApiTags('platform')
@Controller('platform')
// Note: These endpoints are intentionally public (no auth required)
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new tenant and admin user (public endpoint)' })
  @ApiResponse({ status: 201, description: 'Tenant and admin registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async register(@Body() dto: RegisterDto) {
    return this.platformService.registerTenant(dto);
  }

  @Get('subscriptions/:tenantId/payment/status/:paymentId')
  @ApiOperation({ summary: 'Check payment status for a subscription' })
  @ApiResponse({ status: 200, description: 'Payment status retrieved' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentStatus(
    @Param('tenantId') tenantId: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.platformService.getPaymentStatus(tenantId, paymentId);
  }

  @Post('subscriptions/webhook/flutterwave')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Flutterwave webhook handler' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleFlutterwaveWebhook(
    @Body() payload: any,
    @Headers('verif-hash') verifHash: string,
  ) {
    return this.platformService.handleFlutterwaveWebhook(payload, verifHash);
  }
}

