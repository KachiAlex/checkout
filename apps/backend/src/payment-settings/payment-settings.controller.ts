import { Controller, Get, Put, UseGuards, Request, Body, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PaymentSettingsService } from './payment-settings.service';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('payment-settings')
@Controller('payment-settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PaymentSettingsController {
  constructor(private readonly paymentSettingsService: PaymentSettingsService) {}

  private ensureTenantAdmin(req: any) {
    if (req.user?.role !== 'admin' && !req.user?.isPlatformAdmin) {
      throw new ForbiddenException('Only tenant administrators can manage payment settings');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get payment settings for current tenant' })
  @ApiResponse({ status: 200, description: 'Payment settings retrieved' })
  async getPaymentSettings(@Request() req: any) {
    this.ensureTenantAdmin(req);
    return this.paymentSettingsService.getPaymentSettings(req.user.tenantId);
  }

  @Put()
  @ApiOperation({ summary: 'Update payment settings for current tenant' })
  @ApiResponse({ status: 200, description: 'Payment settings updated' })
  async updatePaymentSettings(@Request() req: any, @Body() body: UpdatePaymentSettingsDto) {
    this.ensureTenantAdmin(req);
    return this.paymentSettingsService.updatePaymentSettings(req.user.tenantId, body);
  }
}
