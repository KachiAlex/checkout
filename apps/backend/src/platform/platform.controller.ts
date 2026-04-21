import { Body, Controller, Post, Get, Param, Headers } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { PlatformService } from './platform.service';
import { RegisterDto } from './dto/register.dto';
import { PlatformWebhookDto } from './dto/platform-webhook.dto';

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
    const requestId = `reg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('[Platform Registration] Received registration request:', {
      requestId,
      companyName: dto.companyName,
      companySlug: dto.companySlug,
      adminName: dto.adminName,
      adminEmail: dto.adminEmail,
      plan: dto.plan,
      industry: dto.industry,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await this.platformService.registerTenant(dto);
      console.log('[Platform Registration] Registration successful:', {
        requestId,
        success: result.success,
        tenantId: result.tenant?.id,
        tenantSlug: result.tenant?.slug,
        requiresPayment: result.requiresPayment,
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      const errorCode = error?.response?.error?.code || 'UNKNOWN_ERROR';
      const errorMessage = error?.response?.error?.message || error?.message || 'Registration failed';
      
      console.error('[Platform Registration] Registration failed:', {
        requestId,
        errorCode,
        errorMessage,
        errorDetails: error?.response?.error?.details,
        errorField: error?.response?.error?.field,
        stack: error?.stack,
        dto: {
          companyName: dto.companyName,
          companySlug: dto.companySlug,
          adminEmail: dto.adminEmail,
        },
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
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

  @Get('health')
  @ApiOperation({ summary: 'Platform service health check' })
  @ApiResponse({ status: 200, description: 'Platform service is healthy' })
  async healthCheck() {
    return {
      status: 'ok',
      service: 'platform',
      timestamp: new Date().toISOString(),
      endpoints: {
        register: '/api/v1/platform/register',
        paymentStatus: '/api/v1/platform/subscriptions/:tenantId/payment/status/:paymentId',
      },
    };
  }

  @Post('subscriptions/webhook/flutterwave')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Flutterwave webhook handler' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleFlutterwaveWebhook(
    @Body() payload: PlatformWebhookDto,
    @Headers('verif-hash') verifHash: string,
  ) {
    return this.platformService.handleFlutterwaveWebhook(payload, verifHash);
  }
}
