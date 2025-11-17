# Monnify Payment Integration Guide

This guide explains how to configure and use the Monnify payment gateway integration in the POS Checkout MVP.

## Overview

The Monnify integration allows your POS system to accept:
- **Card payments** (debit/credit cards)
- **QR code payments** (via bank transfers)
- **Bank transfers**
- **USSD payments**
- **Offline cash payments** (via MoniePoint agent network)

## Prerequisites

1. **Monnify Account**: Sign up at [https://app.monnify.com](https://app.monnify.com)
2. **API Credentials**: Get your API key, secret key, and contract code from Monnify dashboard
3. **Webhook Secret**: Configure webhook secret in Monnify dashboard

## Environment Variables

Add the following environment variables to your backend `.env` file:

```bash
# Monnify Configuration
MONNIFY_API_KEY=your_api_key_here
MONNIFY_SECRET_KEY=your_secret_key_here
MONNIFY_CONTRACT_CODE=your_contract_code_here
MONNIFY_WEBHOOK_SECRET=your_webhook_secret_here
MONNIFY_BASE_URL=https://api.monnify.com  # Optional, defaults to production URL

# Frontend URL (for redirect URLs)
FRONTEND_URL=https://your-domain.com  # Or http://localhost:5173 for development
```

### Getting Your Monnify Credentials

1. **Log in** to [Monnify Dashboard](https://app.monnify.com)
2. Navigate to **Settings** → **API Keys & Webhooks**
3. Copy your:
   - **API Key**
   - **Secret Key**
   - **Contract Code** (found in your merchant profile)
4. Set up a **Webhook Secret** for signature verification

## Webhook Configuration

Configure Monnify to send webhooks to your backend:

1. In Monnify Dashboard, go to **Settings** → **Webhooks**
2. Add webhook URL: `https://your-backend-url.com/api/v1/webhooks/monnify`
3. Select events:
   - `SUCCESSFUL_TRANSACTION`
   - `FAILED_TRANSACTION` (optional)
   - `OVERPAYMENT_TRANSACTION` (optional)
4. Save your webhook secret

## Payment Flow

### Card/QR Payment Flow

1. **Customer selects payment method** (Card or QR)
2. **Order is created** in the system
3. **Payment is initiated** via Monnify API
4. **Customer is redirected** to Monnify checkout page
5. **Customer completes payment** on Monnify
6. **Monnify sends webhook** to your backend
7. **Payment status is updated** automatically
8. **Order is marked as paid**

### Cash Payment Flow

1. **Customer selects cash payment**
2. **Cashier enters amount received**
3. **Payment is marked as completed** immediately
4. **Order is processed** with change calculation

## Testing

### Test Mode

Monnify provides test credentials for development:

1. Use **test API keys** from Monnify dashboard
2. Use **test card numbers**:
   - Success: `5060666666666666666`
   - Decline: `5060666666666666667`
   - 3D Secure: `5060666666666666668`

### Testing Webhooks Locally

For local development, use a tool like [ngrok](https://ngrok.com) to expose your local server:

```bash
ngrok http 3000
```

Then use the ngrok URL in Monnify webhook configuration:
```
https://your-ngrok-url.ngrok.io/api/v1/webhooks/monnify
```

## API Endpoints

### Initiate Payment

```typescript
POST /api/v1/orders/:orderId/payments/initiate
{
  "amount": 10000,  // in cents (₦100.00)
  "method": "card", // or "qr", "cash"
  "metadata": {
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "customerPhone": "+2348012345678"
  }
}
```

### Check Payment Status

```typescript
GET /api/v1/orders/:orderId/payments/status
```

### Webhook Endpoint

```typescript
POST /api/v1/webhooks/monnify
```

## Frontend Integration

The frontend `PaymentModal` component automatically handles:

- **Payment initiation** via `PaymentService`
- **Redirect to Monnify checkout** for card/QR payments
- **Payment status polling** while waiting for completion
- **Automatic order completion** when payment succeeds

### Example Usage

```typescript
<PaymentModal
  isOpen={paymentModalOpen}
  method="card"
  total={10000}
  cart={cartItems}
  orderId={orderId}
  customerName="John Doe"
  customerEmail="john@example.com"
  onClose={() => setPaymentModalOpen(false)}
  onComplete={() => {
    // Handle successful payment
  }}
/>
```

## Troubleshooting

### Payment Not Completing

1. **Check webhook configuration**: Ensure webhook URL is correct and accessible
2. **Verify webhook secret**: Make sure `MONNIFY_WEBHOOK_SECRET` matches Monnify dashboard
3. **Check payment status**: Use Monnify dashboard to verify payment status
4. **Review logs**: Check backend logs for webhook processing errors

### Webhook Not Received

1. **Verify webhook URL**: Test webhook endpoint is accessible
2. **Check firewall**: Ensure Monnify IPs are whitelisted
3. **Review Monnify logs**: Check webhook delivery status in Monnify dashboard
4. **Test manually**: Use Monnify's webhook testing tool

### Payment Status Stuck in Processing

1. **Check webhook processing**: Verify webhooks are being received and processed
2. **Manual status check**: Use `GET /api/v1/orders/:orderId/payments/status`
3. **Poll payment status**: Frontend automatically polls, but you can check manually

## Security Considerations

1. **Never expose API keys**: Keep credentials in environment variables only
2. **Verify webhook signatures**: Always verify Monnify webhook signatures
3. **Use HTTPS**: Always use HTTPS in production
4. **Validate payment amounts**: Always verify payment amounts match order totals
5. **Handle timeouts**: Implement proper timeout handling for payment status checks

## Support

- **Monnify Documentation**: [https://developers.monnify.com](https://developers.monnify.com)
- **Monnify Support**: support@monnify.com
- **API Status**: [https://status.monnify.com](https://status.monnify.com)

## Migration from Mock Terminal

If you're currently using the mock terminal for testing:

1. **Add Monnify credentials** to `.env` file
2. **Restart backend** - it will automatically use Monnify if credentials are present
3. **Test with test credentials** first
4. **Switch to production credentials** when ready

The system automatically falls back to `MockTerminal` if Monnify credentials are not configured.

