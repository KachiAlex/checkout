import { Injectable, NotFoundException } from '@nestjs/common';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentMethod, PaymentStatus, OrderStatus } from '@pos-checkout/shared';
import { OrdersService } from '../orders/orders.service';
import { MockTerminal, MonnifyAdapter, PaymentAdapter } from '@pos-checkout/payment-adapters';
import { ConfigService } from '@nestjs/config';
import { PaymentsRepository, PaymentRecord } from './payments.repository';
import { PaymentSettingsService } from '../payment-settings/payment-settings.service';
import { UsersRepository } from '../users/users.repository';

@Injectable()
export class PaymentsService {
  private defaultPaymentAdapter: PaymentAdapter;

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly ordersService: OrdersService,
    private readonly configService: ConfigService,
    private readonly paymentSettingsService: PaymentSettingsService,
    private readonly usersRepository: UsersRepository,
  ) {
    // Initialize default payment adapter (fallback to global env vars or mock)
    const monnifyApiKey = this.configService.get<string>('MONNIFY_API_KEY');
    const monnifySecretKey = this.configService.get<string>('MONNIFY_SECRET_KEY');
    const monnifyContractCode = this.configService.get<string>('MONNIFY_CONTRACT_CODE');

    if (monnifyApiKey && monnifySecretKey && monnifyContractCode) {
      this.defaultPaymentAdapter = new MonnifyAdapter({
        apiKey: monnifyApiKey,
        secretKey: monnifySecretKey,
        contractCode: monnifyContractCode,
        baseUrl: this.configService.get<string>('MONNIFY_BASE_URL'),
        webhookSecret: this.configService.get<string>('MONNIFY_WEBHOOK_SECRET'),
      });
    } else {
      const approveRate = this.configService.get<number>('PAYMENT_MOCK_APPROVE_RATE', 0.95);
      this.defaultPaymentAdapter = new MockTerminal(approveRate);
    }
  }

  /**
   * Get payment adapter for a specific tenant
   */
  private async getPaymentAdapter(tenantId: string): Promise<PaymentAdapter> {
    // Try to get tenant-specific Monnify settings
    const tenantSettings = await this.paymentSettingsService.getFullPaymentSettings(tenantId);
    
    if (tenantSettings) {
      return new MonnifyAdapter({
        apiKey: tenantSettings.monnifyApiKey!,
        secretKey: tenantSettings.monnifySecretKey!,
        contractCode: tenantSettings.monnifyContractCode!,
        baseUrl: this.configService.get<string>('MONNIFY_BASE_URL'),
        webhookSecret: tenantSettings.monnifyWebhookSecret,
      });
    }

    // Fall back to default adapter (global env vars or mock)
    return this.defaultPaymentAdapter;
  }

  async initiatePayment(orderId: string, dto: InitiatePaymentDto): Promise<PaymentRecord> {
    const order = await this.ordersService.findOne(orderId);

    if (order.status === OrderStatus.COMPLETED) {
      throw new Error('Order already completed');
    }

    // Get tenant ID from the user who created the order
    const user = await this.usersRepository.findById(order.createdBy);
    const tenantId = user?.tenantId || '';

    let payment = await this.paymentsRepository.create({
      orderId: order.id,
      amountCents: dto.amount,
      currency: 'NGN',
      method: dto.method,
      status: PaymentStatus.PROCESSING,
    });

    // Process payment based on method
    try {
      let result;
      
      if (dto.method === PaymentMethod.CASH || dto.method === PaymentMethod.TRANSFER) {
        // Cash or manual transfer payment - auto approve once cashier confirms funds
        result = await this.paymentsRepository.update(payment.id, {
          status: PaymentStatus.COMPLETED,
          processedAt: new Date(),
          transactionId: `${
            dto.method === PaymentMethod.CASH ? 'CASH' : 'TRANSFER'
          }_${Date.now()}`,
        });
      } else {
        // Process via payment adapter (Monnify or MockTerminal)
        const paymentAdapter = await this.getPaymentAdapter(tenantId);
        const adapterResult = await paymentAdapter.initiatePayment({
          order_id: order.id,
          amount_cents: dto.amount,
          currency: 'NGN',
          method: dto.method,
          metadata: {
            ...dto.metadata,
            // Add customer info if available
            customerName: dto.metadata?.customerName,
            customerEmail: dto.metadata?.customerEmail,
            customerPhone: dto.metadata?.customerPhone,
            // Add redirect URL for Monnify checkout
            redirectUrl: dto.metadata?.redirectUrl || `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173')}/checkout/payment-callback`,
          },
        });

        result = await this.paymentsRepository.update(payment.id, {
          status: adapterResult.status,
          transactionId: adapterResult.transaction_id,
          processorData: adapterResult.processor_data,
          error: adapterResult.error,
          processedAt: adapterResult.status === PaymentStatus.COMPLETED ? new Date() : undefined,
        });
      }

      payment = result;
      return payment;
    } catch (error) {
      payment = await this.paymentsRepository.update(payment.id, {
        status: PaymentStatus.FAILED,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async capture(paymentId: string): Promise<PaymentRecord> {
    const payment = await this.paymentsRepository.findById(paymentId);

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      return payment;
    }

    // Get tenant ID from the user who created the order
    const order = await this.ordersService.findOne(payment.orderId);
    const user = await this.usersRepository.findById(order.createdBy);
    const tenantId = user?.tenantId || '';
    const paymentAdapter = await this.getPaymentAdapter(tenantId);
    const result = await paymentAdapter.capture(paymentId);

    return this.paymentsRepository.update(paymentId, {
      status: result.status,
      transactionId: result.transaction_id,
      processorData: result.processor_data,
      processedAt: result.status === PaymentStatus.COMPLETED ? new Date() : undefined,
    });
  }

  async refund(paymentId: string, amountCents?: number): Promise<PaymentRecord> {
    const payment = await this.paymentsRepository.findById(paymentId);

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new Error(`Cannot refund payment with status: ${payment.status}`);
    }

    // Get tenant ID from the user who created the order
    const order = await this.ordersService.findOne(payment.orderId);
    const user = await this.usersRepository.findById(order.createdBy);
    const tenantId = user?.tenantId || '';
    const refundAmount = amountCents || payment.amountCents;
    const paymentAdapter = await this.getPaymentAdapter(tenantId);
    const result = await paymentAdapter.refund(paymentId, refundAmount);

    return this.paymentsRepository.update(paymentId, {
      status: result.status,
      processorData: {
        ...(payment.processorData ?? {}),
        refund_amount: refundAmount,
        refunded_at: new Date().toISOString(),
      },
    });
  }

  async getOrderPayments(orderId: string): Promise<PaymentRecord[]> {
    return this.paymentsRepository.findByOrderId(orderId);
  }

  async getOrderPaymentStatus(orderId: string): Promise<{
    totalPaid: number;
    totalDue: number;
    isFullyPaid: boolean;
    payments: PaymentRecord[];
  }> {
    const order = await this.ordersService.findOne(orderId);
    const payments = await this.paymentsRepository.findByOrderId(orderId);
    
    const totalPaid = payments
      .filter(p => p.status === PaymentStatus.COMPLETED)
      .reduce((sum, p) => sum + p.amountCents, 0);
    
    const totalDue = order.totalCents;
    const isFullyPaid = totalPaid >= totalDue;

    return {
      totalPaid,
      totalDue,
      isFullyPaid,
      payments,
    };
  }

  /**
   * Handle webhook notification from payment gateway
   */
  async handleWebhookNotification(paymentReference: string, status: PaymentStatus, transactionData?: Record<string, unknown>): Promise<PaymentRecord | null> {
    // Find payment by reference (could be paymentReference or transactionReference)
    const payment = await this.paymentsRepository.findByPaymentReference(paymentReference);

    if (!payment) {
      return null;
    }

    // Update payment status
    return this.paymentsRepository.update(payment.id, {
      status,
      transactionId: transactionData?.transactionReference as string || payment.transactionId,
      processorData: {
        ...(payment.processorData ?? {}),
        ...transactionData,
        webhookReceivedAt: new Date().toISOString(),
      },
      processedAt: status === PaymentStatus.COMPLETED ? new Date() : payment.processedAt,
    });
  }
}
