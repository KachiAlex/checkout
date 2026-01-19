import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentMethod, PaymentStatus, OrderStatus } from '@pos-checkout/shared';
import { OrdersService } from '../orders/orders.service';
import { MockTerminal, PaymentAdapter } from '@pos-checkout/payment-adapters';
import { ConfigService } from '@nestjs/config';
import { PaymentsRepository, PaymentRecord } from './payments.repository';
import { UsersRepository } from '../users/users.repository';
import { AccountingService } from '../accounting/accounting.service';
import { OrderRecord } from '../orders/orders.repository';
import { JournalSource } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private defaultPaymentAdapter: PaymentAdapter;

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly ordersService: OrdersService,
    private readonly configService: ConfigService,
    private readonly usersRepository: UsersRepository,
    private readonly accountingService: AccountingService,
  ) {
    const approveRate = this.configService.get<number>('PAYMENT_MOCK_APPROVE_RATE', 0.95);
    this.defaultPaymentAdapter = new MockTerminal(approveRate);
  }

  /**
   * Get payment adapter for a specific tenant
   */
  private async getPaymentAdapter(): Promise<PaymentAdapter> {
    return this.defaultPaymentAdapter;
  }

  private getSaleEventType(method: PaymentMethod): string {
    switch (method) {
      case PaymentMethod.CASH:
        return 'SALE_CASH';
      case PaymentMethod.TRANSFER:
        return 'SALE_TRANSFER';
      case PaymentMethod.QR:
        return 'SALE_QR';
      case PaymentMethod.CARD:
      default:
        return 'SALE_CARD';
    }
  }

  private getCreditPaymentEventType(method: PaymentMethod): string {
    switch (method) {
      case PaymentMethod.CASH:
        return 'CREDIT_PAYMENT_CASH';
      case PaymentMethod.TRANSFER:
        return 'CREDIT_PAYMENT_TRANSFER';
      case PaymentMethod.QR:
        return 'CREDIT_PAYMENT_QR';
      case PaymentMethod.CARD:
      default:
        return 'CREDIT_PAYMENT_CARD';
    }
  }

  private getRefundEventType(method: PaymentMethod): string {
    switch (method) {
      case PaymentMethod.CASH:
        return 'REFUND_CASH';
      case PaymentMethod.TRANSFER:
        return 'REFUND_TRANSFER';
      case PaymentMethod.QR:
        return 'REFUND_QR';
      case PaymentMethod.CARD:
      default:
        return 'REFUND_CARD';
    }
  }

  private async handleSuccessfulPayment(
    order: OrderRecord,
    tenantId: string,
    method: PaymentMethod,
  ): Promise<void> {
    if (!tenantId) {
      return;
    }

    if (order.isCreditOrder) {
      await this.ordersService.markCreditOrderAsPaid(order.id, order.createdBy, tenantId);
      try {
        await this.accountingService.ensureSaleJournalForOrder({
          order,
          eventType: this.getCreditPaymentEventType(method),
          metadata: {
            trigger: 'payments.handleSuccessfulPayment',
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to post accounting journal for credit payment (order ${order.id}). Continuing without journal.`,
          error instanceof Error ? error.stack : undefined,
        );
      }
      return;
    }

    try {
      await this.accountingService.ensureSaleJournalForOrder({
        order,
        eventType: this.getSaleEventType(method),
        metadata: {
          trigger: 'payments.handleSuccessfulPayment',
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to post accounting journal for payment (order ${order.id}). Continuing without journal.`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async initiatePayment(orderId: string, dto: InitiatePaymentDto): Promise<PaymentRecord> {
    const order = await this.ordersService.findOne(orderId);

    if (order.status === OrderStatus.COMPLETED) {
      const existingPayments = await this.paymentsRepository.findByOrderId(order.id);
      const hasCompletedPayment = existingPayments.some(
        (payment) => payment.status === PaymentStatus.COMPLETED,
      );
      if (hasCompletedPayment) {
        throw new ConflictException('Order already paid');
      }
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
          transactionId: `${dto.method === PaymentMethod.CASH ? 'CASH' : 'TRANSFER'}_${Date.now()}`,
        });
      } else {
        // Process via payment adapter (Monnify or MockTerminal)
        const paymentAdapter = await this.getPaymentAdapter();
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
            redirectUrl:
              dto.metadata?.redirectUrl ||
              `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173')}/checkout/payment-callback`,
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
      await this.handleSuccessfulPayment(order, tenantId, payment.method);
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
    const paymentAdapter = await this.getPaymentAdapter();
    const result = await paymentAdapter.capture(paymentId);

    const updated = await this.paymentsRepository.update(paymentId, {
      status: result.status,
      transactionId: result.transaction_id,
      processorData: result.processor_data,
      processedAt: result.status === PaymentStatus.COMPLETED ? new Date() : undefined,
    });

    if (updated.status === PaymentStatus.COMPLETED) {
      await this.handleSuccessfulPayment(order, tenantId, payment.method);
    }

    return updated;
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
    const paymentAdapter = await this.getPaymentAdapter();
    const result = await paymentAdapter.refund(paymentId, refundAmount);

    const updated = await this.paymentsRepository.update(paymentId, {
      status: result.status,
      processorData: {
        ...(payment.processorData ?? {}),
        refund_amount: refundAmount,
        refunded_at: new Date().toISOString(),
      },
    });

    if (updated.status === PaymentStatus.REFUNDED) {
      const ratio =
        order.totalCents > 0 ? Math.min(1, Math.max(0, refundAmount / order.totalCents)) : 0;
      const subtotalRefundCents = Math.round(order.subtotalCents * ratio);
      const taxRefundCents = Math.round(order.taxCents * ratio);

      await this.accountingService.ensureSaleJournalForOrder({
        order,
        source: JournalSource.REFUND,
        eventType: this.getRefundEventType(payment.method),
        reference: payment.id,
        sourceIdOverride: payment.id,
        subtotalCentsOverride: subtotalRefundCents,
        taxCentsOverride: taxRefundCents,
        totalCentsOverride: refundAmount,
        metadata: {
          trigger: 'payments.refund',
          refundAmount: refundAmount,
        },
        taxDirection: 'debit',
      });
    }

    return updated;
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
      .filter((p) => p.status === PaymentStatus.COMPLETED)
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
  async handleWebhookNotification(
    paymentReference: string,
    status: PaymentStatus,
    transactionData?: Record<string, unknown>,
  ): Promise<PaymentRecord | null> {
    // Find payment by reference (could be paymentReference or transactionReference)
    const payment = await this.paymentsRepository.findByPaymentReference(paymentReference);

    if (!payment) {
      return null;
    }

    // Update payment status
    return this.paymentsRepository.update(payment.id, {
      status,
      transactionId: (transactionData?.transactionReference as string) || payment.transactionId,
      processorData: {
        ...(payment.processorData ?? {}),
        ...transactionData,
        webhookReceivedAt: new Date().toISOString(),
      },
      processedAt: status === PaymentStatus.COMPLETED ? new Date() : payment.processedAt,
    });
  }
}
