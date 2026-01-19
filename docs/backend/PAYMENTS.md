# Backend – Payments Module

## Location

- `apps/backend/src/payments/payments.module.ts`

## Purpose

The Payments module orchestrates **order payment initiation, capture/refund, and webhook handling**. It integrates with payment adapters (Monnify/Mock) and coordinates with Orders + Accounting to ensure payment status, journals, and credit settlements stay in sync.

Capabilities:

- Initiate payments for an order (cash, transfer, card, QR, etc.)
- Capture/refund payments
- List/order payments and statuses
- Process webhooks from Monnify (or generic legacy endpoint)
- Post accounting journals upon successful payment/settlement
- Mark credit orders paid when external payment succeeds

## Key files

- `payments.module.ts`
  - Imports `OrdersModule`, `UsersModule`, `AccountingModule`
  - Registers `PaymentsController`, `WebhooksController`
  - Provides `PaymentsService`, `PaymentsRepository`

- `payments.controller.ts`
  - Authenticated endpoints scoped under `orders/:orderId/payments`
    - initiate/capture/refund/get/get-status

- `webhooks.controller.ts`
  - Public webhook endpoints (Monnify + legacy payment-status)
  - Verifies webhook signature if keys provided

- `payments.service.ts`
  - Business logic for initiating payments, handling success/failure, mapping events to accounting entries, webhook updates.

- `payments.repository.ts`
  - Firestore persistence for payments collection.

- `dto/initiate-payment.dto.ts`
  - Request DTO for `POST /orders/:orderId/payments/initiate`

## Security model

- `PaymentsController` protected by `JwtAuthGuard` + `@ApiBearerAuth('JWT-auth')`.
- `WebhooksController` is intentionally unauthenticated (payment providers POST to it) but optionally enforces Monnify signature.

## Public API (PaymentsController)

Base route: `@Controller('orders/:orderId/payments')`

### `POST /orders/:orderId/payments/initiate`

- **Body**: `InitiatePaymentDto`
  - `method` (enum `PaymentMethod`)
  - `amount` (cents)
  - `metadata?` (adapter-specific)
- **Flow**: loads order, ensures not already paid, inserts payment row (`status=PROCESSING`), dispatches to adapter (or auto-completes for cash/transfer), updates status + processor data, posts accounting journal via `handleSuccessfulPayment`.

### `POST /orders/:orderId/payments/capture`

- **Body**: `{ paymentId }`
- **Flow**: calls `PaymentsService.capture(paymentId)` (currently placeholder to finalize pending payments).

### `POST /orders/:orderId/payments/refund`

- **Body**: `{ paymentId, amountCents? }`
- **Flow**: triggers refund via service; updates payment record accordingly.

### `GET /orders/:orderId/payments`

- Lists all payments for the order via `PaymentsRepository.findByOrderId`.

### `GET /orders/:orderId/payments/status`

- Aggregated payment status for the order (e.g., overall/completed/pending).

## Public API (WebhooksController)

Base route: `@Controller('webhooks')`

### `POST /webhooks/monnify`

- **Purpose**: Handle Monnify webhook events.
- **Headers**: optional `monnify-signature` (verified if config present).
- **Flow**:
  - parse payload, verify signature
  - map Monnify `paymentStatus` to internal `PaymentStatus`
  - call `paymentsService.handleWebhookNotification(paymentReference, status, transactionData)`
  - respond `{ received, processed }`

### `POST /webhooks/payment-status`

- Legacy, generic webhook that simply acknowledges receipt.

## Core logic (PaymentsService)

### Initiating a payment

1. `ordersService.findOne(orderId)` ensures order exists and obtains tenant context.
2. If order already completed, checks for existing completed payments to prevent duplicates (ConflictException).
3. Creates a payment record (`status=PROCESSING`).
4. If method is `CASH` or `TRANSFER`, marks payment as `COMPLETED` immediately with generated `transactionId`.
5. Otherwise obtains `paymentAdapter` (Monnify or MockTerminal) and calls `initiatePayment`. Updates payment with adapter response (status, `transactionId`, `processorData`).
6. On success, runs `handleSuccessfulPayment` (posts accounting journal, resolves credit orders).
7. On failure, updates payment to `FAILED` with `error` message.

### Capturing and refunding

- `capture(paymentId)` & `refund(paymentId, amountCents)` delegate to repository + adapter flows (implementation may be minimal depending on adapter).

### Handling webhook notification

- `handleWebhookNotification(paymentReference, status, transactionData)` finds payment by reference (`processorData.paymentReference`, `transactionReference`, or `transactionId`).
- Updates payment status, merges `processorData`, sets `processedAt` when completed.

### Accounting integration

- `handleSuccessfulPayment(order, tenantId, method)`
  - If order is credit: `ordersService.markCreditOrderAsPaid`, ensures journal posted using `getCreditPaymentEventType`.
  - Otherwise posts sale journal using `getSaleEventType` mapping (cash/card/transfer/QR).
  - Logs errors but continues to avoid blocking payment completion.

### Payment adapters

- `getPaymentAdapter()` chooses between:
  - Monnify adapter (if `MONNIFY` env config present)
  - Mock terminal adapter (for development)
- Adapter returns `{ status, transaction_id, processor_data, error }`.

## Persistence (PaymentsRepository)

- Collection: `payments`
- Methods:
  - `create(data)` – writes Firestore doc with server timestamps; logs success/failure.
  - `findById`, `findByOrderId` – query by order.
  - `findByPaymentReference(ref)` – search within nested `processorData` fields or `transactionId`.
  - `update(id, update)` – merges updates, sets `processedAt`, `updatedAt`.
- `PaymentRecord` fields: `orderId`, `amountCents`, `currency`, `method`, `status`, `processorData`, `transactionId`, `error`, `processedAt`, timestamps.

## DTO

### `InitiatePaymentDto`

- `method` (enum `PaymentMethod`)
- `amount` (cents)
- `metadata?` (record)

## Dependencies

- `OrdersService` (order lookup, credit settlements)
- `UsersRepository` (tenant context from order creator)
- `AccountingService` (journals)
- Payment adapters from `@pos-checkout/payment-adapters`
- `ConfigService` (adapter credentials & webhook secrets)

## Operational notes

- **Idempotency**: not strictly enforced yet; repeated initiate calls can create multiple processing payments if order not yet marked completed.
- **Credit orders**: payments automatically mark credit orders as paid and post credit journals (`SALE_CREDIT_PAYMENT_*`).
- **Webhooks**: ensure `MONNIFY_*` env vars are set to enable signature verification.
- **Redirect URL**: defaults to `FRONTEND_URL/checkout/payment-callback` but can be overridden via `dto.metadata.redirectUrl`.
