import { Injectable, NotFoundException } from '@nestjs/common';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentMethod, PaymentStatus, OrderStatus } from '@pos-checkout/shared';
import { OrdersService } from '../orders/orders.service';
import { MockTerminal } from '@pos-checkout/payment-adapters';
import { ConfigService } from '@nestjs/config';
import { PaymentsRepository, PaymentRecord } from './payments.repository';

@Injectable()
export class PaymentsService {
  private mockTerminal: MockTerminal;

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly ordersService: OrdersService,
    private readonly configService: ConfigService,
  ) {
    const approveRate = this.configService.get<number>('PAYMENT_MOCK_APPROVE_RATE', 0.95);
    this.mockTerminal = new MockTerminal(approveRate);
  }

  async initiatePayment(orderId: string, dto: InitiatePaymentDto): Promise<PaymentRecord> {
    const order = await this.ordersService.findOne(orderId);

    if (order.status === OrderStatus.COMPLETED) {
      throw new Error('Order already completed');
    }

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
      
      if (dto.method === PaymentMethod.CASH) {
        // Cash payment - auto approve
        result = await this.paymentsRepository.update(payment.id, {
          status: PaymentStatus.COMPLETED,
          processedAt: new Date(),
          transactionId: `CASH_${Date.now()}`,
        });
      } else {
        // Process via terminal/gateway
        const adapterResult = await this.mockTerminal.initiatePayment({
          order_id: order.id,
          amount_cents: dto.amount,
          currency: 'NGN',
          method: dto.method,
          metadata: dto.metadata,
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

    const result = await this.mockTerminal.capture(paymentId);

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

    const refundAmount = amountCents || payment.amountCents;
    const result = await this.mockTerminal.refund(paymentId, refundAmount);

    return this.paymentsRepository.update(paymentId, {
      status: result.status,
      processorData: {
        ...(payment.processorData ?? {}),
        refund_amount: refundAmount,
        refunded_at: new Date().toISOString(),
      },
    });
  }
}
