# Backend Modules Reference

This document is the backend module map. It explains each module’s purpose, primary controllers, and primary services.

> Note: Some modules are present in the repo but may be temporarily disabled in `AppModule`.

## Root / Infrastructure

### AppModule

- **File**: `apps/backend/src/app.module.ts`
- **Role**: Root module importing all feature modules.

### DatabaseModule

- **Files**:
  - `apps/backend/src/database/database.module.ts`
  - `apps/backend/src/database/prisma.service.ts`
- **Role**: Provides Prisma client to the app.

### FirestoreModule

- **Files**:
  - `apps/backend/src/firestore/firestore.module.ts`
  - `apps/backend/src/firestore/firestore.service.ts`
- **Role**: Provides Firestore access utilities.

## Auth

### AuthModule

- **Files**:
  - `apps/backend/src/auth/auth.module.ts`
  - `apps/backend/src/auth/auth.controller.ts`
  - `apps/backend/src/auth/auth.service.ts`
  - `apps/backend/src/auth/strategies/jwt.strategy.ts`
  - `apps/backend/src/auth/guards/jwt-auth.guard.ts`
  - `apps/backend/src/auth/guards/roles.guard.ts`
- **Responsibilities**:
  - Tenant + user login, token issuance, refresh.
  - JWT validation and guard integration.

## Tenants / Platform

### TenantsModule

- **Files**:
  - `apps/backend/src/tenants/tenants.module.ts`
  - `apps/backend/src/tenants/tenants.controller.ts` (platform admin endpoints)
  - `apps/backend/src/tenants/tenants.service.ts`
  - `apps/backend/src/tenants/tenants.repository.ts`
  - `apps/backend/src/tenants/industry-features.service.ts`
- **Docs**: `docs/backend/TENANTS.md`

### PlatformModule

- **Files**:
  - `apps/backend/src/platform/platform.module.ts`
  - `apps/backend/src/platform/platform.controller.ts` (public registration)
  - `apps/backend/src/platform/platform.service.ts`
  - `apps/backend/src/platform/platform-analytics.controller.ts`
  - `apps/backend/src/platform/platform-analytics.service.ts`
- **Docs**: `docs/backend/PLATFORM.md`

## Core business modules

### ProductsModule

- **Files**: `apps/backend/src/products/*`
- **Responsibilities**: CRUD for products.
- **Docs**: `docs/backend/PRODUCTS.md`

### InventoryModule

- **Files**: `apps/backend/src/inventory/*`
- **Responsibilities**:
  - Inventory adjustments, stock tracking, batch handling.
- **Docs**: `docs/backend/INVENTORY.md`

### OrdersModule

- **Files**: `apps/backend/src/orders/*`
- **Responsibilities**:
  - Checkout orders, order lifecycle, totals, tax application.

### PaymentsModule

- **Files**: `apps/backend/src/payments/*`
- **Responsibilities**:
  - Payment initiation, status, and webhooks.
- **Docs**: `docs/backend/PAYMENTS.md`

### ReceiptsModule

- **Files**: `apps/backend/src/receipts/*`
- **Responsibilities**:
  - Receipt rendering/data formatting.
- **Docs**: `docs/backend/RECEIPTS.md`

### DevicesModule

- **Files**: `apps/backend/src/devices/*`
- **Responsibilities**:
  - Device registration and device-scoped operations.
- **Docs**: `docs/backend/DEVICES.md`

### SyncModule

- **Files**: `apps/backend/src/sync/*`
- **Responsibilities**:
  - Offline sync endpoints and conflict handling.
- **Docs**: `docs/backend/SYNC.md`

### ReportsModule

- **Files**: `apps/backend/src/reports/*`
- **Responsibilities**:
  - Dashboard and analytics report endpoints.
- **Docs**: `docs/backend/REPORTS.md`

### AccountingModule

- **Files**: `apps/backend/src/accounting/*`
- **Responsibilities**:
  - Accounts, mappings, journals.
  - Tax rules + tax periods.
  - Reporting endpoints for accounting.
- **Docs**: `docs/backend/ACCOUNTING.md`

### OrdersModule

- **Files**: `apps/backend/src/orders/*`
- **Responsibilities**:
  - Checkout orders, order lifecycle, totals, tax application.
- **Docs**: `docs/backend/ORDERS.md`

### ExpensesModule

- **Files**: `apps/backend/src/expenses/*`
- **Responsibilities**:
  - Expense capture and admin expense operations.
- **Docs**: `docs/backend/EXPENSES.md`

### SuppliersModule / PurchaseOrdersModule / GRNModule

- **Files**:
  - `apps/backend/src/suppliers/*`
  - `apps/backend/src/purchase-orders/*`
  - `apps/backend/src/grn/*`
- **Responsibilities**:
  - Supplier management.
  - Purchase orders.
  - Goods received notes.

### ReturnsModule

- **Files**: `apps/backend/src/returns/*`
- **Responsibilities**:
  - Returns/refunds and credit orders.

## Settings modules

### PaymentSettingsModule

- **Files**: `apps/backend/src/payment-settings/*`

### TaxSettingsModule

- **Files**: `apps/backend/src/tax-settings/*`

### SubscriptionPricingModule

- **Files**: `apps/backend/src/subscription-pricing/*`

## Contact / Support

### ContactModule

- **Files**:
  - `apps/backend/src/contact/contact.module.ts`
  - `apps/backend/src/contact/contact.controller.ts`
  - `apps/backend/src/contact/contact.service.ts`
  - `apps/backend/src/contact/sendgrid.service.ts`
- **Responsibilities**:
  - Demo request flow.
  - Authenticated support request flow.

## Audit

### AuditModule

- **Files**:
  - `apps/backend/src/audit/audit.module.ts`
  - `apps/backend/src/audit/audit-log.service.ts`
  - `apps/backend/src/audit/audit-log.interceptor.ts`
  - `apps/backend/src/audit/audit-logs.controller.ts`
- **Docs**: `docs/backend/AUDIT.md`
- **Responsibilities**:
  - Record authenticated mutating requests.
  - Provide admin read/purge endpoints.

## Health

### HealthModule

- **Files**: `apps/backend/src/health/*`
- **Responsibilities**:
  - Health endpoints for uptime monitoring.
