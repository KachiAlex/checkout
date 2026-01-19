import { PaymentAdapter, PaymentContext, PaymentResult } from "./interfaces";
import { PaymentMethod, PaymentStatus } from "@pos-checkout/shared";
import axios, { AxiosInstance } from "axios";
import * as crypto from "crypto";

export interface MonnifyConfig {
  apiKey: string;
  secretKey: string;
  contractCode: string;
  baseUrl?: string;
  webhookSecret?: string;
}

export interface MonnifyInitiatePaymentRequest {
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhoneNumber?: string;
  paymentReference: string;
  paymentDescription: string;
  currencyCode: string;
  contractCode: string;
  redirectUrl?: string;
  paymentMethods?: string[];
  metadata?: Record<string, unknown>;
}

export interface MonnifyInitiatePaymentResponse {
  requestSuccessful: boolean;
  responseMessage: string;
  responseCode: string;
  responseBody: {
    transactionReference: string;
    paymentReference: string;
    merchantName: string;
    apiKey: string;
    enabledPaymentMethod: string[];
    checkoutUrl: string;
  };
}

export interface MonnifyTransactionStatusResponse {
  requestSuccessful: boolean;
  responseMessage: string;
  responseCode: string;
  responseBody: {
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
    product: {
      type: string;
      reference: string;
    };
    customer: {
      email: string;
      name: string;
    };
    metaData: Record<string, unknown>;
  };
}

export interface MonnifyRefundRequest {
  transactionReference: string;
  refundAmount: number;
  refundReason: string;
  customerNote?: string;
}

export interface MonnifyRefundResponse {
  requestSuccessful: boolean;
  responseMessage: string;
  responseCode: string;
  responseBody: {
    transactionReference: string;
    paymentReference: string;
    amount: number;
    refundAmount: number;
    refundedBy: string;
    refundedAt: string;
    status: string;
  };
}

/**
 * MonnifyAdapter - Integrates with Monnify payment gateway
 * Supports card, bank transfer, USSD, and QR code payments
 */
export class MonnifyAdapter implements PaymentAdapter {
  private axiosInstance: AxiosInstance;
  private config: MonnifyConfig;
  private baseUrl: string;

  constructor(config: MonnifyConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || "https://api.monnify.com";

    // Create basic auth token (API_KEY:SECRET_KEY base64 encoded)
    const authToken = Buffer.from(
      `${config.apiKey}:${config.secretKey}`,
    ).toString("base64");

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Basic ${authToken}`,
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 seconds
    });
  }

  /**
   * Initialize a payment transaction with Monnify
   */
  async initiatePayment(context: PaymentContext): Promise<PaymentResult> {
    try {
      // Generate unique payment reference
      const paymentReference = `POS_${context.order_id}_${Date.now()}`;

      // Determine payment methods based on context method
      const paymentMethods = this.getPaymentMethods(context.method);

      // Build customer info from metadata or use defaults
      const customerName =
        (context.metadata?.customerName as string) || "POS Customer";
      const customerEmail =
        (context.metadata?.customerEmail as string) || "customer@pos.local";
      const customerPhone =
        (context.metadata?.customerPhone as string) || undefined;

      // Build redirect URL (if provided in metadata)
      const redirectUrl =
        (context.metadata?.redirectUrl as string) || undefined;

      const request: MonnifyInitiatePaymentRequest = {
        amount: context.amount_cents / 100, // Convert cents to Naira
        customerName,
        customerEmail,
        customerPhoneNumber: customerPhone,
        paymentReference,
        paymentDescription: `Payment for Order ${context.order_id}`,
        currencyCode: context.currency?.toUpperCase() || "NGN",
        contractCode: this.config.contractCode,
        redirectUrl,
        paymentMethods,
        metadata: {
          orderId: context.order_id,
          ...context.metadata,
        },
      };

      const response =
        await this.axiosInstance.post<MonnifyInitiatePaymentResponse>(
          "/api/v1/merchant/transactions/init-transaction",
          request,
        );

      if (!response.data.requestSuccessful) {
        return {
          payment_id: paymentReference,
          status: PaymentStatus.FAILED,
          error: response.data.responseMessage || "Payment initiation failed",
          processor_data: {
            monnify_response_code: response.data.responseCode,
          },
        };
      }

      const { responseBody } = response.data;

      return {
        payment_id: paymentReference,
        status: PaymentStatus.PROCESSING, // Payment is initiated but not yet completed
        transaction_id: responseBody.transactionReference,
        processor_data: {
          transactionReference: responseBody.transactionReference,
          paymentReference: responseBody.paymentReference,
          checkoutUrl: responseBody.checkoutUrl,
          enabledPaymentMethods: responseBody.enabledPaymentMethod,
          merchantName: responseBody.merchantName,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const paymentReference = `POS_${context.order_id}_${Date.now()}`;

      return {
        payment_id: paymentReference,
        status: PaymentStatus.FAILED,
        error: `Monnify API error: ${errorMessage}`,
        processor_data: {
          error_details: errorMessage,
        },
      };
    }
  }

  /**
   * Capture a pending payment (check status and complete if paid)
   */
  async capture(payment_id: string): Promise<PaymentResult> {
    try {
      // Get transaction status from Monnify
      const statusResult = await this.getStatus(payment_id);

      if (statusResult === PaymentStatus.COMPLETED) {
        // Fetch full transaction details
        const transactionDetails = await this.getTransactionDetails(payment_id);

        return {
          payment_id,
          status: PaymentStatus.COMPLETED,
          transaction_id: transactionDetails?.transactionReference,
          processor_data: transactionDetails || undefined,
        };
      }

      return {
        payment_id,
        status: statusResult,
        error:
          statusResult === PaymentStatus.FAILED
            ? "Payment not completed"
            : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
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
  async refund(
    payment_id: string,
    amount_cents?: number,
  ): Promise<PaymentResult> {
    try {
      // Get transaction details to find transaction reference
      const transactionDetails = await this.getTransactionDetails(payment_id);

      if (!transactionDetails || transactionDetails.paymentStatus !== "PAID") {
        return {
          payment_id,
          status: PaymentStatus.FAILED,
          error: "Transaction not found or not paid",
        };
      }

      const refundAmount = amount_cents
        ? amount_cents / 100
        : parseFloat(transactionDetails.amountPaid);
      const refundReason = "Refund requested from POS system";

      const request: MonnifyRefundRequest = {
        transactionReference: transactionDetails.transactionReference,
        refundAmount,
        refundReason,
        customerNote: "Refund processed from POS",
      };

      const response = await this.axiosInstance.post<MonnifyRefundResponse>(
        "/api/v2/refund/initiate-refund",
        request,
      );

      if (!response.data.requestSuccessful) {
        return {
          payment_id,
          status: PaymentStatus.FAILED,
          error: response.data.responseMessage || "Refund failed",
          processor_data: {
            monnify_response_code: response.data.responseCode,
          },
        };
      }

      const { responseBody } = response.data;

      return {
        payment_id,
        status: PaymentStatus.REFUNDED,
        transaction_id: responseBody.transactionReference,
        processor_data: {
          refundAmount: responseBody.refundAmount,
          refundedAt: responseBody.refundedAt,
          refundedBy: responseBody.refundedBy,
          status: responseBody.status,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        payment_id,
        status: PaymentStatus.FAILED,
        error: `Refund failed: ${errorMessage}`,
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

      // Map Monnify payment status to our PaymentStatus enum
      const monnifyStatus = transactionDetails.paymentStatus.toUpperCase();

      switch (monnifyStatus) {
        case "PAID":
          return PaymentStatus.COMPLETED;
        case "OVERPAID":
          return PaymentStatus.COMPLETED;
        case "PENDING":
          return PaymentStatus.PROCESSING;
        case "FAILED":
          return PaymentStatus.FAILED;
        case "CANCELLED":
          return PaymentStatus.FAILED;
        default:
          return PaymentStatus.PROCESSING;
      }
    } catch (error) {
      return PaymentStatus.FAILED;
    }
  }

  /**
   * Get transaction details from Monnify
   */
  private async getTransactionDetails(
    paymentReference: string,
  ): Promise<MonnifyTransactionStatusResponse["responseBody"] | null> {
    try {
      const response =
        await this.axiosInstance.get<MonnifyTransactionStatusResponse>(
          `/api/v2/transactions/${encodeURIComponent(paymentReference)}`,
        );

      if (!response.data.requestSuccessful || !response.data.responseBody) {
        return null;
      }

      return response.data.responseBody;
    } catch (error) {
      return null;
    }
  }

  /**
   * Map our PaymentMethod to Monnify payment methods
   */
  private getPaymentMethods(method: PaymentMethod): string[] {
    switch (method) {
      case PaymentMethod.CARD:
        return ["CARD"];
      case PaymentMethod.QR:
        return ["ACCOUNT_TRANSFER", "USSD"];
      case PaymentMethod.CASH:
        // For cash, we might want to enable offline payment
        return ["ACCOUNT_TRANSFER"];
      default:
        return ["CARD", "ACCOUNT_TRANSFER", "USSD"];
    }
  }

  /**
   * Verify webhook signature from Monnify
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      return false;
    }

    const computedHash = crypto
      .createHmac("sha512", this.config.webhookSecret)
      .update(payload)
      .digest("hex");

    return computedHash === signature;
  }
}
