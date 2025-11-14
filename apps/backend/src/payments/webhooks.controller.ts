import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('payment-status')
  @ApiOperation({ summary: 'Webhook endpoint for payment gateway status updates' })
  async handlePaymentStatus(@Body() payload: any) {
    // For MVP: Simulate webhook handler
    // In production, this would verify webhook signature and update payment status
    return { received: true, timestamp: new Date().toISOString() };
  }
}
