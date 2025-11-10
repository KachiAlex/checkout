import { PaymentAdapter, PaymentContext, PaymentResult } from './interfaces';
import { PaymentMethod, PaymentStatus } from '@pos-checkout/shared';

/**
 * MockTerminal - Simulates a payment terminal for testing
 * Supports card payments with simulated approval/decline/timeout scenarios
 */
export class MockTerminal implements PaymentAdapter {
  private payments: Map<string, PaymentResult> = new Map();
  private approveRate: number = 0.95; // 95% approval rate by default

  constructor(approveRate: number = 0.95) {
    this.approveRate = approveRate;
  }

  async initiatePayment(context: PaymentContext): Promise<PaymentResult> {
    // Generate payment ID
    const paymentId = `mock_pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Simulate processing delay
    await this.delay(500 + Math.random() * 1500); // 500-2000ms

    // Simulate approval/decline based on rate
    const isApproved = Math.random() < this.approveRate;
    
    // Simulate timeout (1% chance)
    const isTimeout = Math.random() < 0.01;

    let status: PaymentStatus;
    let error: string | undefined;
    let transactionId: string | undefined;

    if (isTimeout) {
      status = PaymentStatus.FAILED;
      error = 'Payment timeout: Terminal did not respond';
    } else if (isApproved) {
      status = PaymentStatus.COMPLETED;
      transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    } else {
      status = PaymentStatus.FAILED;
      // Simulate different decline reasons
      const declineReasons = [
        'Insufficient funds',
        'Card declined',
        'Invalid card',
        'Transaction not permitted',
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
        timestamp: new Date().toISOString(),
        terminal_id: 'MOCK_TERMINAL_001',
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
      return payment; // Already captured
    }

    // Simulate capture delay
    await this.delay(200 + Math.random() * 300);

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

    // Simulate refund delay
    await this.delay(300 + Math.random() * 500);

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

  // Test helper: Reset payments map
  reset(): void {
    this.payments.clear();
  }

  // Test helper: Set approve rate
  setApproveRate(rate: number): void {
    this.approveRate = Math.max(0, Math.min(1, rate));
  }
}
