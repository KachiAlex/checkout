import { PaymentAdapter, PaymentContext, PaymentResult } from './interfaces';
import { PaymentMethod, PaymentStatus } from '@pos-checkout/shared';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface FlutterwaveConfig {
  publicKey: string;
  secretKey: string;
  baseUrl?: string;
  webhookSecret?: string;
}

export interface FlutterwaveInitiatePaymentRequest {
  tx_ref: string;
  amount: number;
  currency: string;
  redirect_url?: string;
  payment_options?: string;
  customer: {
    email: string;
    name: string;
    phone_number?: string;
  };
  customizations?: {
    title?: string;
    description?: string;
    logo?: string;
  };
  meta?: Record<string, unknown>;
}

export interface FlutterwaveInitiatePaymentResponse {
  status: string;
  message: string;
  data: {
    link: string;
  };
}

export interface FlutterwaveTransactionStatusResponse {
  status: string;
  message: string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    device_fingerprint: string;
    amount: number;
    currency: string;
    charged_amount: number;
    app_fee: number;
    merchant_fee: number;
    processor_response: string;
    auth_model: string;
    card?: {
      first_6digits: string;
      last_4digits: string;
      issuer: string;
      country: string;
      type: string;
      token: string;
      expiry: string;
    };
    created_at: string;
    account_id: number;
    status: string;
    payment_type: string;
    customer: {
      id: number;
      name: string;
      phone_number: string;
      email: string;
      created_at: string;
    };
  };
}

export interface FlutterwaveRefundRequest {
  id: string | number;
  amount?: number;
  comments?: string;
}

export interface FlutterwaveRefundResponse {
  status: string;
  message: string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    wallet_id: number;
    amount_refunded: number;
    status: string;
    destination: string;
    meta: Record<string, unknown>;
    created_at: string;
  };
}

/**
 * FlutterwaveAdapter - Integrates with Flutterwave payment gateway
 * Supports card, bank transfer, USSD, mobile money, and QR code payments
 */
export class FlutterwaveAdapter implements PaymentAdapter {
  private axiosInstance: AxiosInstance;
  private config: FlutterwaveConfig;
  private baseUrl: string;

  constructor(config: FlutterwaveConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.flutterwave.com/v3';

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.secretKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });
  }

  /**
   * Initialize a payment transaction with Flutterwave
   */
  async initiatePayment(context: PaymentContext): Promise<PaymentResult> {
    try {
      // Generate unique transaction reference
      const txRef = `POS_${context.order_id}_${Date.now()}`;

      // Build customer info from metadata or use defaults
      const customerName = (context.metadata?.customerName as string) || 'POS Customer';
      const customerEmail = (context.metadata?.customerEmail as string) || 'customer@pos.local';
      const customerPhone = (context.metadata?.customerPhone as string) || undefined;

      // Build redirect URL (if provided in metadata)
      const redirectUrl = (context.metadata?.redirectUrl as string) || undefined;

      // Determine payment options based on context method
      const paymentOptions = this.getPaymentOptions(context.method);

      const request: FlutterwaveInitiatePaymentRequest = {
        tx_ref: txRef,
        amount: context.amount_cents / 100, // Convert cents to currency unit
        currency: context.currency?.toUpperCase() || 'NGN',
        redirect_url: redirectUrl,
        payment_options: paymentOptions,
        customer: {
          email: customerEmail,
          name: customerName,
          phone_number: customerPhone,
        },
        customizations: {
          title: 'Checkout POS Payment',
          description: `Payment for Order ${context.order_id}`,
        },
        meta: {
          orderId: context.order_id,
          ...context.metadata,
        },
      };

      const response = await this.axiosInstance.post<FlutterwaveInitiatePaymentResponse>(
        '/payments',
        request
      );

      if (response.data.status !== 'success') {
        return {
          payment_id: txRef,
          status: PaymentStatus.FAILED,
          error: response.data.message || 'Payment initiation failed',
          processor_data: {
            flutterwave_status: response.data.status,
          },
        };
      }

      return {
        payment_id: txRef,
        status: PaymentStatus.PROCESSING, // Payment is initiated but not yet completed
        transaction_id: txRef,
        processor_data: {
          tx_ref: txRef,
          checkout_url: response.data.data.link,
          payment_options: paymentOptions,
        },
      };
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const txRef = `POS_${context.order_id}_${Date.now()}`;

      return {
        payment_id: txRef,
        status: PaymentStatus.FAILED,
        error: `Flutterwave API error: ${errorMessage}`,
        processor_data: {
          error_details: errorMessage,
          response: error.response?.data,
        },
      };
    }
  }

  /**
   * Capture a pending payment (check status and complete if paid)
   */
  async capture(payment_id: string): Promise<PaymentResult> {
    try {
      // Get transaction status from Flutterwave
      const statusResult = await this.getStatus(payment_id);

      if (statusResult === PaymentStatus.COMPLETED) {
        // Fetch full transaction details
        const transactionDetails = await this.getTransactionDetails(payment_id);
        
        return {
          payment_id,
          status: PaymentStatus.COMPLETED,
          transaction_id: transactionDetails?.flw_ref,
          processor_data: transactionDetails || undefined,
        };
      }

      return {
        payment_id,
        status: statusResult,
        error: statusResult === PaymentStatus.FAILED ? 'Payment not completed' : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        payment_id,
        status: PaymentStatus.FAILED,
        error: `Failed to capture payment: ${errorMessage}`,
      };
    }
  }

  /**
   * Refund a completed payment
   */
  async refund(payment_id: string, amount_cents?: number): Promise<PaymentResult> {
    try {
      // Get transaction details to find transaction ID
      const transactionDetails = await this.getTransactionDetails(payment_id);
      
      if (!transactionDetails || transactionDetails.status !== 'successful') {
        return {
          payment_id,
          status: PaymentStatus.FAILED,
          error: 'Transaction not found or not successful',
        };
      }

      const refundAmount = amount_cents ? amount_cents / 100 : transactionDetails.amount;
      const comments = 'Refund requested from POS system';

      const request: FlutterwaveRefundRequest = {
        id: transactionDetails.id,
        amount: refundAmount,
        comments,
      };

      const response = await this.axiosInstance.post<FlutterwaveRefundResponse>(
        '/refunds',
        request
      );

      if (response.data.status !== 'success') {
        return {
          payment_id,
          status: PaymentStatus.FAILED,
          error: response.data.message || 'Refund failed',
          processor_data: {
            flutterwave_status: response.data.status,
          },
        };
      }

      const { data } = response.data;

      return {
        payment_id,
        status: PaymentStatus.REFUNDED,
        transaction_id: data.flw_ref,
        processor_data: {
          refundAmount: data.amount_refunded,
          refundedAt: data.created_at,
          status: data.status,
          destination: data.destination,
        },
      };
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        payment_id,
        status: PaymentStatus.FAILED,
        error: `Refund failed: ${errorMessage}`,
        processor_data: {
          error_details: errorMessage,
          response: error.response?.data,
        },
      };
    }
  }

  /**
   * Check payment status
   */
  async getStatus(payment_id: string): Promise<PaymentStatus> {
    try {
      const transactionDetails = await this.getTransactionDetails(payment_id);

      if (!transactionDetails) {
        return PaymentStatus.FAILED;
      }

      // Map Flutterwave payment status to our PaymentStatus enum
      const flutterwaveStatus = transactionDetails.status.toLowerCase();
      
      switch (flutterwaveStatus) {
        case 'successful':
          return PaymentStatus.COMPLETED;
        case 'pending':
          return PaymentStatus.PROCESSING;
        case 'failed':
          return PaymentStatus.FAILED;
        case 'cancelled':
          return PaymentStatus.FAILED;
        default:
          return PaymentStatus.PROCESSING;
      }
    } catch (error) {
      return PaymentStatus.FAILED;
    }
  }

  /**
   * Get transaction details from Flutterwave using tx_ref
   */
  private async getTransactionDetails(txRef: string): Promise<FlutterwaveTransactionStatusResponse['data'] | null> {
    try {
      const response = await this.axiosInstance.get<FlutterwaveTransactionStatusResponse>(
        `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`
      );

      if (response.data.status !== 'success' || !response.data.data) {
        return null;
      }

      return response.data.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Map our PaymentMethod to Flutterwave payment options
   */
  private getPaymentOptions(method: PaymentMethod): string {
    switch (method) {
      case PaymentMethod.CARD:
        return 'card';
      case PaymentMethod.QR:
        return 'ussd,banktransfer,mobilemoney';
      case PaymentMethod.TRANSFER:
        return 'banktransfer';
      default:
        return 'card,banktransfer,ussd,mobilemoney';
    }
  }

  /**
   * Verify webhook signature from Flutterwave
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      return false;
    }

    const computedHash = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');

    return computedHash === signature;
  }
}

