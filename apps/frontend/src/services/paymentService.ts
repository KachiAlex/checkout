import axios from "axios";
import { API_URL } from "../config";
import { useAuthStore } from "../stores/authStore";

export interface InitiatePaymentRequest {
  amount: number; // in cents
  method: "card" | "qr" | "cash" | "transfer";
  metadata?: {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    redirectUrl?: string;
    [key: string]: unknown;
  };
}

export interface PaymentResponse {
  id: string;
  orderId: string;
  amountCents: number;
  currency: string;
  method: "card" | "qr" | "cash" | "transfer";
  status: "pending" | "processing" | "completed" | "failed" | "refunded";
  transactionId?: string;
  processorData?: {
    checkoutUrl?: string;
    paymentReference?: string;
    transactionReference?: string;
    enabledPaymentMethods?: string[];
    [key: string]: unknown;
  };
  error?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentStatusResponse {
  totalPaid: number;
  totalDue: number;
  isFullyPaid: boolean;
  payments: PaymentResponse[];
}

/**
 * Payment Service - Handles payment operations
 */
export class PaymentService {
  /**
   * Initiate a payment for an order
   */
  static async initiatePayment(
    orderId: string,
    request: InitiatePaymentRequest,
  ): Promise<PaymentResponse> {
    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) {
      throw new Error("Not authenticated");
    }

    const response = await axios.post<PaymentResponse>(
      `${API_URL}/api/v1/orders/${orderId}/payments/initiate`,
      request,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return response.data;
  }

  /**
   * Capture a pending payment (check status and complete if paid)
   * Note: This endpoint requires orderId, but we'll use a workaround for now
   */
  static async capturePayment(
    orderId: string,
    paymentId: string,
  ): Promise<PaymentResponse> {
    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) {
      throw new Error("Not authenticated");
    }

    const response = await axios.post<PaymentResponse>(
      `${API_URL}/api/v1/orders/${orderId}/payments/capture`,
      { paymentId },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return response.data;
  }

  /**
   * Get payment status for an order
   */
  static async getOrderPaymentStatus(
    orderId: string,
  ): Promise<PaymentStatusResponse> {
    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) {
      throw new Error("Not authenticated");
    }

    const response = await axios.get<PaymentStatusResponse>(
      `${API_URL}/api/v1/orders/${orderId}/payments/status`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return response.data;
  }

  /**
   * Refund a payment
   * Note: This endpoint requires orderId, but we'll use a workaround for now
   */
  static async refundPayment(
    orderId: string,
    paymentId: string,
    amountCents?: number,
  ): Promise<PaymentResponse> {
    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) {
      throw new Error("Not authenticated");
    }

    const response = await axios.post<PaymentResponse>(
      `${API_URL}/api/v1/orders/${orderId}/payments/refund`,
      { paymentId, amountCents },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return response.data;
  }
}
