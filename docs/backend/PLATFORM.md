# Backend – Platform Module

## Location

- `apps/backend/src/platform/platform.module.ts`

## Purpose

The Platform module exposes **public** endpoints that support platform-level operations:

- Tenant self-registration (`/platform/register`) including subscription selection.
- Subscription payment tracking/status.
- Payment processor webhook handling.

Unlike `TenantsController`, these endpoints are intended to be called from the public marketing/app onboarding flows.

## Key files

- `platform.controller.ts`
  - Public registration + subscription status endpoints.

- `platform.service.ts`
  - Implements registration and payment flows.

- `subscription-payments.repository.ts`
  - Persistence for subscription payment records.

- `platform-analytics.*`
  - Analytics endpoints/services.

## Public API (Controller)

Controller base route: `@Controller('platform')`

### `POST /platform/register`

- **Handler**: `PlatformController.register(dto: RegisterDto)`
- **Auth**: none (public)
- **Purpose**:
  - Create a tenant + tenant admin.
  - If plan is paid, initiate payment with Flutterwave and return checkout URL.

### `GET /platform/subscriptions/:tenantId/payment/status/:paymentId`

- **Handler**: `PlatformController.getPaymentStatus(tenantId, paymentId)`
- **Auth**: none (public)
- **Purpose**:
  - Returns current payment status.
  - If still processing, attempts to query Flutterwave for updated status.

### `POST /platform/subscriptions/webhook/flutterwave`

- **Handler**: `PlatformController.handleFlutterwaveWebhook(payload, verifHash)`
- **Auth**: none (but verified using webhook hash)
- **Purpose**:
  - Receives Flutterwave webhook events and updates subscription payment status.

### `GET /platform/health`

- Simple health check specific to platform module.

## Core logic (Service)

### `registerTenant(dto: RegisterDto)`

- **Validates** company slug uniqueness:
  - `TenantsRepository.findBySlug(dto.companySlug.toLowerCase())`
- **Determines plan**:
  - defaults to `TenantPlan.FREE` if not specified
- **Calculates billing window**:
  - FREE: end date = 14 days
  - Monthly paid plans: +1 month
  - Lifetime: no end date
- **Creates tenant + admin** via `TenantsService.create(...)`.
- **Overwrites admin password**:
  - TenantsService initially creates `temporaryPin`.
  - PlatformService then hashes `dto.adminPassword` and updates `pinHash` for that admin user.

#### Paid plan flow

If plan is not FREE:

1. Determine plan pricing.
2. Create a subscription payment record (`SubscriptionPaymentsRepository.create`).
3. Initiate Flutterwave payment (`FlutterwaveAdapter.initiatePayment`).
4. Update payment record with transaction id + checkoutUrl.
5. If payment is already completed (edge case), activate subscription and send receipt.
6. Return `checkoutUrl` to the client.

### `getPaymentStatus(tenantId, paymentId)`

- Loads payment record.
- If status is PROCESSING and transaction id exists, calls `FlutterwaveAdapter.getStatus(...)`.
- If completed:
  - activates subscription
  - marks payment as paid
  - sends receipt email

### `handleFlutterwaveWebhook(payload, verifHash)`

- Verifies the webhook signature/hash.
- Updates the payment record.
- Triggers subscription activation and receipt sending when appropriate.

## Dependencies

- `TenantsService`
- `TenantsRepository`
- `UsersRepository`
- `SubscriptionPaymentsRepository`
- `EmailService`
- `FlutterwaveAdapter`
- `ConfigService`

## Operational notes

- The frontend redirect URL after payment is embedded in the payment initiation metadata.
- Ensure all Flutterwave secrets/config are set in backend environment variables.
- Consider rate-limiting these public endpoints at the gateway level.
