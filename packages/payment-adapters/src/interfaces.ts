import { PaymentMethod, PaymentStatus } from '@pos-checkout/shared';

export interface PaymentContext {
  order_id: string;
  amount_cents: number;
  currency?: string;
  method: PaymentMethod;
  metadata?: Record<string, unknown>;
}

export interface PaymentResult {
  payment_id: string;
  status: PaymentStatus;
  transaction_id?: string;
  processor_data?: Record<string, unknown>;
  error?: string;
}

export interface PaymentAdapter {
  /**
   * Initialize a payment transaction
   */
  initiatePayment(context: PaymentContext): Promise<PaymentResult>;

  /**
   * Capture a pending payment
   */
  capture(payment_id: string): Promise<PaymentResult>;

  /**
   * Refund a completed payment
   */
  refund(payment_id: string, amount_cents?: number): Promise<PaymentResult>;

  /**
   * Check payment status
   */
  getStatus(payment_id: string): Promise<PaymentStatus>;
}
