# Payment Terminal Integration Guide

This guide explains how to integrate real payment terminals and gateways into the POS Checkout MVP.

## Architecture

The payment system uses a plugin architecture with adapter interfaces:

- `PaymentAdapter`: Base interface for all payment providers
- `MockTerminal`: Simulated terminal for testing
- `GatewayAdapter`: Simulated gateway for testing

## PaymentAdapter Interface

```typescript
interface PaymentAdapter {
  initiatePayment(context: PaymentContext): Promise<PaymentResult>;
  capture(payment_id: string): Promise<PaymentResult>;
  refund(payment_id: string, amount_cents?: number): Promise<PaymentResult>;
  getStatus(payment_id: string): Promise<PaymentStatus>;
}
```

## Implementing a New Adapter

### 1. Create Adapter Class

```typescript
import {
  PaymentAdapter,
  PaymentContext,
  PaymentResult,
} from "@pos-checkout/payment-adapters";
import { PaymentStatus } from "@pos-checkout/shared";

export class YourTerminalAdapter implements PaymentAdapter {
  async initiatePayment(context: PaymentContext): Promise<PaymentResult> {
    // Implement terminal-specific payment initiation
    // - Send payment request to terminal
    // - Wait for response
    // - Return PaymentResult

    return {
      payment_id: "unique_payment_id",
      status: PaymentStatus.COMPLETED,
      transaction_id: "terminal_txn_id",
      processor_data: {
        /* terminal-specific data */
      },
    };
  }

  async capture(paymentId: string): Promise<PaymentResult> {
    // Implement capture logic if needed
  }

  async refund(
    paymentId: string,
    amountCents?: number,
  ): Promise<PaymentResult> {
    // Implement refund logic
  }

  async getStatus(paymentId: string): Promise<PaymentStatus> {
    // Implement status check
  }
}
```

### 2. Register Adapter

In `PaymentsService`:

```typescript
import { YourTerminalAdapter } from "./adapters/your-terminal-adapter";

@Injectable()
export class PaymentsService {
  private getAdapter(method: PaymentMethod): PaymentAdapter {
    switch (method) {
      case PaymentMethod.CARD:
        return new YourTerminalAdapter();
      // ... other adapters
    }
  }
}
```

## Integration Examples

### Verifone Terminal Integration

```typescript
import { SerialPort } from "serialport";

export class VerifoneAdapter implements PaymentAdapter {
  private port: SerialPort;

  constructor(portPath: string) {
    this.port = new SerialPort({ path: portPath, baudRate: 9600 });
  }

  async initiatePayment(context: PaymentContext): Promise<PaymentResult> {
    // Send ESC/POS commands to terminal
    const command = this.buildPaymentCommand(context.amount_cents);
    await this.sendCommand(command);

    // Wait for response
    const response = await this.waitForResponse();

    return this.parseResponse(response);
  }
}
```

### Stripe Gateway Integration

```typescript
import Stripe from "stripe";

export class StripeAdapter implements PaymentAdapter {
  private stripe: Stripe;

  constructor(apiKey: string) {
    this.stripe = new Stripe(apiKey);
  }

  async initiatePayment(context: PaymentContext): Promise<PaymentResult> {
    // Tokenization: Use payment token, never PAN/CVV
    const token = context.metadata?.token as string;

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: context.amount_cents,
      currency: context.currency || "ngn",
      payment_method: token,
      confirm: true,
    });

    return {
      payment_id: paymentIntent.id,
      status:
        paymentIntent.status === "succeeded"
          ? PaymentStatus.COMPLETED
          : PaymentStatus.FAILED,
      transaction_id: paymentIntent.id,
      processor_data: {
        stripe_payment_intent: paymentIntent.id,
      },
    };
  }
}
```

## PCI Compliance

### Critical Requirements

1. **Never store PAN/CVV**: Only store tokenized payment methods
2. **Use TLS**: All payment API calls must use HTTPS
3. **Tokenization**: Always use gateway tokens, never raw card data
4. **Audit logging**: Log all payment attempts (without sensitive data)

### Tokenization Flow

1. Client captures card data (via secure terminal or gateway)
2. Client receives token from gateway
3. Client sends token to backend (never PAN/CVV)
4. Backend uses token to process payment
5. Store only token and transaction ID

## Testing

### Using MockTerminal

```typescript
import { MockTerminal } from "@pos-checkout/payment-adapters";

const terminal = new MockTerminal(0.95); // 95% approval rate

const result = await terminal.initiatePayment({
  order_id: "order-123",
  amount_cents: 1000,
  method: PaymentMethod.CARD,
});
```

### Integration Tests

```typescript
describe("Payment Integration", () => {
  it("should process card payment", async () => {
    const adapter = new YourTerminalAdapter();
    const result = await adapter.initiatePayment({
      order_id: "test-order",
      amount_cents: 1000,
      method: PaymentMethod.CARD,
    });

    expect(result.status).toBe(PaymentStatus.COMPLETED);
  });
});
```

## Webhooks

Payment gateways may send webhook notifications. Handle them in `WebhooksController`:

```typescript
@Post('payment-status')
async handlePaymentStatus(@Body() payload: any) {
  // Verify webhook signature
  // Update payment status
  // Handle edge cases
}
```

## Error Handling

Always handle payment failures gracefully:

```typescript
try {
  const result = await adapter.initiatePayment(context);
  if (result.status === PaymentStatus.FAILED) {
    // Log error, notify user, retry if appropriate
    throw new PaymentFailedError(result.error);
  }
} catch (error) {
  // Handle terminal errors, timeouts, etc.
}
```

## Security Checklist

- [ ] Use TLS for all payment communications
- [ ] Never log PAN/CVV
- [ ] Implement webhook signature verification
- [ ] Use environment variables for API keys
- [ ] Rotate secrets regularly
- [ ] Audit all payment operations
- [ ] Implement rate limiting
- [ ] Validate all input data

## Resources

- [PCI DSS Requirements](https://www.pcisecuritystandards.org/)
- [Stripe Documentation](https://stripe.com/docs)
- [Paystack API Reference](https://paystack.com/docs/api/)
