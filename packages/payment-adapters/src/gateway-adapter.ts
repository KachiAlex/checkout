import { PaymentAdapter, PaymentContext, PaymentResult } from './interfaces';
import { PaymentMethod, PaymentStatus } from '@pos-checkout/shared';

/**
 * GatewayAdapter - Simulates an online payment gateway (Stripe/Paystack/Flutterwave)
 * Supports tokenization flow - never stores PAN/CVV
 */
export class GatewayAdapter implements PaymentAdapter {
  private payments: Map<string, PaymentResult> = new Map();
  private approveRate: number = 0.98; // Higher approval rate for gateway

  constructor(approveRate: number = 0.98) {
    this.approveRate = approveRate;
  }

  async initiatePayment(context: PaymentContext): Promise<PaymentResult> {
    const paymentId = `gateway_pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Simulate API call delay
    await this.delay(800 + Math.random() * 1200);

    // Tokenization: We only receive token, not PAN/CVV
    const token = context.metadata?.token as string;
    if (!token && context.method !== PaymentMethod.CASH) {
      return {
        payment_id: paymentId,
        status: PaymentStatus.FAILED,
        error: 'Payment token required',
      };
    }

    // Simulate approval/decline
    const isApproved = Math.random() < this.approveRate;

    let status: PaymentStatus;
    let error: string | undefined;
    let transactionId: string | undefined;

    if (isApproved) {
      status = PaymentStatus.COMPLETED;
      transactionId = `GW_TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    } else {
      status = PaymentStatus.FAILED;
      const declineReasons = [
        'Card declined by issuer',
        '3D Secure authentication failed',
        'Invalid token',
        'Network error',
      ];
      error = declineReasons[Math.floor(Math.random() * declineReasons.length)];
    }

    const result: PaymentResult = {
      payment_id: paymentId,
      status,
      transaction_id: transactionId,
      processor_data: {
        method: context.method,
        amount: context.amount_cents,
        token_id: token, // Only store token, never PAN
        timestamp: new Date().toISOString(),
        gateway: 'mock_gateway',
      },
      error,
    };

    this.payments.set(paymentId, result);
    return result;
  }

  async capture(paymentId: string): Promise<PaymentResult> {
    const payment = this.payments.get(paymentId);
    
    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      return payment;
    }

    await this.delay(300 + Math.random() * 500);

    payment.status = PaymentStatus.COMPLETED;
    this.payments.set(paymentId, payment);
    
    return payment;
  }

  async refund(paymentId: string, amountCents?: number): Promise<PaymentResult> {
    const payment = this.payments.get(paymentId);
    
    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new Error(`Cannot refund payment with status: ${payment.status}`);
    }

    await this.delay(500 + Math.random() * 1000);

    payment.status = PaymentStatus.REFUNDED;
    this.payments.set(paymentId, payment);

    return payment;
  }

  async getStatus(paymentId: string): Promise<PaymentStatus> {
    const payment = this.payments.get(paymentId);
    
    if (!payment) {
      return PaymentStatus.FAILED;
    }

    return payment.status;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  reset(): void {
    this.payments.clear();
  }

  setApproveRate(rate: number): void {
    this.approveRate = Math.max(0, Math.min(1, rate));
  }
}
