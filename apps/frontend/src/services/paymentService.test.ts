import { describe, it, expect, beforeEach, vi } from "vitest";
import axios from "axios";
import {
  PaymentService,
  InitiatePaymentRequest,
  PaymentResponse,
  PaymentStatusResponse,
} from "./paymentService";
import { useAuthStore } from "../stores/authStore";

// Mock axios
vi.mock("axios");
const mockedAxios = axios as any;

// Mock auth store
vi.mock("../stores/authStore", () => ({
  useAuthStore: {
    getState: vi.fn(),
  },
}));

// Mock config
vi.mock("../config", () => ({
  API_URL: "https://api.example.com",
}));

describe("PaymentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore.getState as any).mockReturnValue({
      accessToken: "test-token",
    });
  });

  describe("initiatePayment", () => {
    const mockPaymentResponse: PaymentResponse = {
      id: "payment-123",
      orderId: "order-123",
      amountCents: 10000,
      currency: "NGN",
      method: "card",
      status: "pending",
      transactionId: "txn-123",
      processorData: {
        checkoutUrl: "https://checkout.example.com",
      },
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    it("should initiate payment successfully", async () => {
      const request: InitiatePaymentRequest = {
        amount: 10000,
        method: "card",
      };

      mockedAxios.post.mockResolvedValue({
        data: mockPaymentResponse,
      });

      const result = await PaymentService.initiatePayment("order-123", request);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "https://api.example.com/api/v1/orders/order-123/payments/initiate",
        request,
        {
          headers: {
            Authorization: "Bearer test-token",
          },
        },
      );
      expect(result).toEqual(mockPaymentResponse);
    });

    it("should include metadata in request", async () => {
      const request: InitiatePaymentRequest = {
        amount: 10000,
        method: "card",
        metadata: {
          customerName: "John Doe",
          customerEmail: "john@example.com",
        },
      };

      mockedAxios.post.mockResolvedValue({
        data: mockPaymentResponse,
      });

      await PaymentService.initiatePayment("order-123", request);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        request,
        expect.any(Object),
      );
    });

    it("should throw error if not authenticated", async () => {
      (useAuthStore.getState as any).mockReturnValue({
        accessToken: null,
      });

      const request: InitiatePaymentRequest = {
        amount: 10000,
        method: "card",
      };

      await expect(
        PaymentService.initiatePayment("order-123", request),
      ).rejects.toThrow("Not authenticated");
    });

    it("should handle different payment methods", async () => {
      const methods: Array<"card" | "qr" | "cash" | "transfer"> = [
        "card",
        "qr",
        "cash",
        "transfer",
      ];

      for (const method of methods) {
        const request: InitiatePaymentRequest = {
          amount: 10000,
          method,
        };

        mockedAxios.post.mockResolvedValue({
          data: { ...mockPaymentResponse, method },
        });

        const result = await PaymentService.initiatePayment(
          "order-123",
          request,
        );
        expect(result.method).toBe(method);
      }
    });

    it("should handle axios errors", async () => {
      const request: InitiatePaymentRequest = {
        amount: 10000,
        method: "card",
      };

      mockedAxios.post.mockRejectedValue(new Error("Network error"));

      await expect(
        PaymentService.initiatePayment("order-123", request),
      ).rejects.toThrow("Network error");
    });
  });

  describe("capturePayment", () => {
    const mockPaymentResponse: PaymentResponse = {
      id: "payment-123",
      orderId: "order-123",
      amountCents: 10000,
      currency: "NGN",
      method: "card",
      status: "completed",
      transactionId: "txn-123",
      processedAt: "2024-01-01T00:00:00Z",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    it("should capture payment successfully", async () => {
      mockedAxios.post.mockResolvedValue({
        data: mockPaymentResponse,
      });

      const result = await PaymentService.capturePayment(
        "order-123",
        "payment-123",
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "https://api.example.com/api/v1/orders/order-123/payments/capture",
        { paymentId: "payment-123" },
        {
          headers: {
            Authorization: "Bearer test-token",
          },
        },
      );
      expect(result).toEqual(mockPaymentResponse);
    });

    it("should throw error if not authenticated", async () => {
      (useAuthStore.getState as any).mockReturnValue({
        accessToken: null,
      });

      await expect(
        PaymentService.capturePayment("order-123", "payment-123"),
      ).rejects.toThrow("Not authenticated");
    });
  });

  describe("getOrderPaymentStatus", () => {
    const mockStatusResponse: PaymentStatusResponse = {
      totalPaid: 10000,
      totalDue: 0,
      isFullyPaid: true,
      payments: [
        {
          id: "payment-123",
          orderId: "order-123",
          amountCents: 10000,
          currency: "NGN",
          method: "card",
          status: "completed",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
    };

    it("should get payment status successfully", async () => {
      mockedAxios.get.mockResolvedValue({
        data: mockStatusResponse,
      });

      const result = await PaymentService.getOrderPaymentStatus("order-123");

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "https://api.example.com/api/v1/orders/order-123/payments/status",
        {
          headers: {
            Authorization: "Bearer test-token",
          },
        },
      );
      expect(result).toEqual(mockStatusResponse);
    });

    it("should handle partially paid orders", async () => {
      const partialStatus: PaymentStatusResponse = {
        totalPaid: 5000,
        totalDue: 5000,
        isFullyPaid: false,
        payments: [
          {
            id: "payment-123",
            orderId: "order-123",
            amountCents: 5000,
            currency: "NGN",
            method: "card",
            status: "completed",
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
        ],
      };

      mockedAxios.get.mockResolvedValue({
        data: partialStatus,
      });

      const result = await PaymentService.getOrderPaymentStatus("order-123");
      expect(result.isFullyPaid).toBe(false);
      expect(result.totalDue).toBe(5000);
    });

    it("should throw error if not authenticated", async () => {
      (useAuthStore.getState as any).mockReturnValue({
        accessToken: null,
      });

      await expect(
        PaymentService.getOrderPaymentStatus("order-123"),
      ).rejects.toThrow("Not authenticated");
    });
  });

  describe("refundPayment", () => {
    const mockRefundResponse: PaymentResponse = {
      id: "payment-123",
      orderId: "order-123",
      amountCents: 10000,
      currency: "NGN",
      method: "card",
      status: "refunded",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    it("should refund full payment", async () => {
      mockedAxios.post.mockResolvedValue({
        data: mockRefundResponse,
      });

      const result = await PaymentService.refundPayment(
        "order-123",
        "payment-123",
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "https://api.example.com/api/v1/orders/order-123/payments/refund",
        { paymentId: "payment-123", amountCents: undefined },
        {
          headers: {
            Authorization: "Bearer test-token",
          },
        },
      );
      expect(result.status).toBe("refunded");
    });

    it("should refund partial amount", async () => {
      mockedAxios.post.mockResolvedValue({
        data: { ...mockRefundResponse, amountCents: 5000 },
      });

      const result = await PaymentService.refundPayment(
        "order-123",
        "payment-123",
        5000,
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        { paymentId: "payment-123", amountCents: 5000 },
        expect.any(Object),
      );
      expect(result.amountCents).toBe(5000);
    });

    it("should throw error if not authenticated", async () => {
      (useAuthStore.getState as any).mockReturnValue({
        accessToken: null,
      });

      await expect(
        PaymentService.refundPayment("order-123", "payment-123"),
      ).rejects.toThrow("Not authenticated");
    });
  });
});
