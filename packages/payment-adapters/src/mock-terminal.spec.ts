import { MockTerminal } from "./mock-terminal";
import { PaymentMethod, PaymentStatus } from "@pos-checkout/shared";

describe("MockTerminal", () => {
  let terminal: MockTerminal;

  beforeEach(() => {
    terminal = new MockTerminal(1.0); // 100% approval rate for testing
  });

  describe("initiatePayment", () => {
    it("should create payment with COMPLETED status when approved", async () => {
      const result = await terminal.initiatePayment({
        order_id: "order-123",
        amount_cents: 1000,
        currency: "NGN",
        method: PaymentMethod.CARD,
      });

      expect(result.status).toBe(PaymentStatus.COMPLETED);
      expect(result.payment_id).toBeDefined();
      expect(result.transaction_id).toBeDefined();
    });

    it("should handle timeout scenario", async () => {
      terminal.setApproveRate(0); // Force failure
      const result = await terminal.initiatePayment({
        order_id: "order-123",
        amount_cents: 1000,
        method: PaymentMethod.CARD,
      });

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.error).toBeDefined();
    });
  });

  describe("refund", () => {
    it("should refund a completed payment", async () => {
      // First create a payment
      const payment = await terminal.initiatePayment({
        order_id: "order-123",
        amount_cents: 1000,
        method: PaymentMethod.CARD,
      });

      expect(payment.status).toBe(PaymentStatus.COMPLETED);

      // Then refund it
      const refund = await terminal.refund(payment.payment_id);
      expect(refund.status).toBe(PaymentStatus.REFUNDED);
    });

    it("should throw error when refunding non-existent payment", async () => {
      await expect(terminal.refund("invalid-id")).rejects.toThrow();
    });
  });
});
