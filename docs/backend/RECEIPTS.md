# Backend – Receipts Module

## Location

- `apps/backend/src/receipts/receipts.module.ts`

## Purpose

The Receipts module generates **order receipts** in multiple formats and can send them via email.

Supported outputs:

- Plain text (monospace receipt)
- HTML (email-friendly receipt)
- ESC/POS payload (for thermal printers)

## Key files

- `receipts.module.ts`
  - Wires `ReceiptsService` and `ReceiptsController`.
  - Imports repositories/services needed to build receipt context.

- `receipts.controller.ts`
  - Authenticated endpoints for retrieving receipts and emailing receipts.

- `receipts.service.ts`
  - Core rendering logic (text + HTML + ESC/POS conversion) and email send.

## Dependencies (Module imports)

From `ReceiptsModule`:

- `OrdersModule`
- `PaymentsModule`
- `LocationsModule`
- `UsersModule`
- `EmailModule`
- `CustomizationModule`

## Public API (Controller)

Controller base route: `@Controller('receipts')`

Guards:

- `@UseGuards(JwtAuthGuard)`
- `@ApiBearerAuth('JWT-auth')`

### `GET /receipts/:orderId`

- **Handler**: `ReceiptsController.getReceipt(orderId)`
- **Param**: `orderId` validated via `ParseUUIDPipe`
- **Result**: `{ receipt, orderId }`
  - `receipt` is plain text.

### `GET /receipts/:orderId/print`

- **Handler**: `ReceiptsController.getReceiptForPrint(orderId)`
- **Param**: `orderId` validated via `ParseUUIDPipe`
- **Result**: `{ text, html, escpos }`
  - `escpos` is a string containing ESC/POS commands and the receipt text.

### `POST /receipts/:orderId/email`

- **Handler**: `ReceiptsController.sendEmailReceipt(orderId, email)`
- **Param**: `orderId` validated via `ParseUUIDPipe`
- **Body**:
  - `email` (string) via `@Body('email')`
- **Result**: `{ success, message }`

## Core logic (Service)

### Context building (`buildReceiptContext(orderId)`)

- Fetches:
  - `order` via `OrdersRepository.findById`
  - `payment` via `PaymentsRepository.findByOrderId(order.id)` (takes the first)
  - `location` via `LocationsRepository.findById(order.locationId)`
  - `user` via `UsersRepository.findById(order.createdBy)`
- Loads customization (branding) for the location’s tenant:
  - `CustomizationService.getCustomization(location.tenantId)`
  - If missing, logs a warning and falls back to defaults.
- Throws if the order doesn’t exist.

### Payload generation (`generateReceiptPayload(orderId)`)

Returns:

- `text` from `formatReceipt(...)`
- `html` from `formatReceiptHTML(...)`
- `orderNumber`

### Receipt rendering

- `formatReceipt(...)`
  - Produces a plain text receipt with totals.
  - Uses customization overrides (companyName/header/footer/contact fields).
  - Prints per-line items from `order.items`, computing:
    - `subtotal = item.priceCents * item.quantity`
    - `tax = item.taxCents * item.quantity`
    - `total = subtotal + tax`

- `formatReceiptHTML(...)`
  - Produces a styled HTML document.
  - Includes optional company logo.
  - Includes item table + totals.

### ESC/POS conversion (`convertToESCPOS(text)`)

- Wraps receipt text in basic ESC/POS commands:
  - initialize
  - center align
  - feed lines
  - cut paper

### Email send (`sendEmailReceipt(orderId, email)`)

- Builds payload, then calls `EmailService.sendEmail({ to, subject, text, html })`.
- Returns `true/false`.

## Error handling notes

- Receipt generation throws if the order is missing.
- Customization lookup is best-effort (fallback to defaults).
- Email send catches and returns `false` on failures.

## Extension points

- Add real product display names by joining product records instead of using `item.productId` in the rendered item lines.
- If multiple payments per order are supported, update selection logic in `buildReceiptContext`.
