import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { PaymentStatus } from '@pos-checkout/shared';
import { MonnifyAdapter } from '@pos-checkout/payment-adapters';
import { ConfigService } from '@nestjs/config';

interface MonnifyWebhookPayload {
  eventType: string;
  eventData: {
    product: {
      type: string;
      reference: string;
    };
    transactionReference: string;
    paymentReference: string;
    amountPaid: string;
    totalPayable: string;
    settlementAmount: string;
    paidOn: string;
    paymentStatus: string;
    paymentDescription: string;
    currency: string;
    paymentMethod: string;
    customer: {
      email: string;
      name: string;
    };
    metaData: Record<string, unknown>;
  };
}

@ApiTags('payments')
@Controller('webhooks')
export class WebhooksController {
  private monnifyAdapter: MonnifyAdapter | null = null;

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {
    // Initialize Monnify adapter for webhook verification if configured
    const monnifyApiKey = this.configService.get<string>('MONNIFY_API_KEY');
    const monnifySecretKey = this.configService.get<string>('MONNIFY_SECRET_KEY');
    const monnifyContractCode = this.configService.get<string>('MONNIFY_CONTRACT_CODE');
    const monnifyWebhookSecret = this.configService.get<string>('MONNIFY_WEBHOOK_SECRET');

    if (monnifyApiKey && monnifySecretKey && monnifyContractCode && monnifyWebhookSecret) {
      this.monnifyAdapter = new MonnifyAdapter({
        apiKey: monnifyApiKey,
        secretKey: monnifySecretKey,
        contractCode: monnifyContractCode,
        webhookSecret: monnifyWebhookSecret,
      });
    }
  }

  @Post('monnify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook endpoint for Monnify payment status updates' })
  @ApiHeader({
    name: 'monnify-signature',
    required: false,
    description: 'Monnify webhook signature for verification',
  })
  async handleMonnifyWebhook(
    @Body() payload: MonnifyWebhookPayload,
    @Headers('monnify-signature') signature?: string,
  ) {
    try {
      // Verify webhook signature if Monnify adapter is configured
      if (this.monnifyAdapter && signature) {
        const payloadString = JSON.stringify(payload);
        const isValid = this.monnifyAdapter.verifyWebhookSignature(payloadString, signature);

        if (!isValid) {
          throw new BadRequestException('Invalid webhook signature');
        }
      }

      // Handle different event types
      if (payload.eventType === 'SUCCESSFUL_TRANSACTION') {
        const { eventData } = payload;

        // Map Monnify payment status to our PaymentStatus enum
        let status: PaymentStatus;
        const monnifyStatus = eventData.paymentStatus.toUpperCase();

        switch (monnifyStatus) {
          case 'PAID':
          case 'OVERPAID':
            status = PaymentStatus.COMPLETED;
            break;
          case 'PENDING':
            status = PaymentStatus.PROCESSING;
            break;
          case 'FAILED':
          case 'CANCELLED':
            status = PaymentStatus.FAILED;
            break;
          default:
            status = PaymentStatus.PROCESSING;
        }

        // Update payment status
        const updatedPayment = await this.paymentsService.handleWebhookNotification(
          eventData.paymentReference,
          status,
          {
            transactionReference: eventData.transactionReference,
            paymentReference: eventData.paymentReference,
            amountPaid: eventData.amountPaid,
            totalPayable: eventData.totalPayable,
            settlementAmount: eventData.settlementAmount,
            paidOn: eventData.paidOn,
            paymentStatus: eventData.paymentStatus,
            paymentMethod: eventData.paymentMethod,
            currency: eventData.currency,
            customer: eventData.customer,
            metaData: eventData.metaData,
          },
        );

        return {
          received: true,
          processed: !!updatedPayment,
          timestamp: new Date().toISOString(),
        };
      }

      // For other event types, just acknowledge receipt
      return {
        received: true,
        eventType: payload.eventType,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Webhook processing error:', error);
      throw new BadRequestException('Failed to process webhook');
    }
  }

  @Post('payment-status')
  @ApiOperation({ summary: 'Generic webhook endpoint for payment gateway status updates (legacy)' })
  async handlePaymentStatus(@Body() payload: any) {
    // Legacy endpoint for backward compatibility
    return { received: true, timestamp: new Date().toISOString() };
  }
}
