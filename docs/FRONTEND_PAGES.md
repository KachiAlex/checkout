# Frontend Pages

This document lists the key pages under `apps/frontend/src/pages` and explains what each page is responsible for.

## Authentication

- `LoginPage.tsx`
  - Tenant slug + PIN login.
  - Calls backend auth endpoints via `useAuthStore().login(...)`.

- `SplashPage.tsx`
  - Startup loading/bootstrapping experience.

## Core POS

- `CheckoutPage.tsx`
  - Main POS checkout flow.
  - Interacts with cart state, product lookup, pricing, and payment.

- `HomePage.tsx`
  - Landing dashboard for logged-in users.

## Inventory

- `InventoryManagementPage.tsx`
- `InventoryPage.tsx`
- `InventorySalesPage.tsx`
- `AddInventoryPage.tsx`

## Orders / Returns

- `ReturnsPage.tsx`
- `CreditOrdersPage.tsx`

## Suppliers / Procurement

- `SuppliersPage.tsx`
- `PurchaseOrdersPage.tsx`
- `GRNPage.tsx`

## Customers

- `CustomersPage.tsx`

## Reports

- `ReportsPage.tsx`
- `ExecutiveDashboardPage.tsx`

## Accounting

- `AccountingLandingPage.tsx`
- `AccountingAccountsPage.tsx`
- `AccountingMappingsPage.tsx`
- `AccountingJournalsPage.tsx`
- `AccountingJournalDetailPage.tsx`
- `AccountingTaxRulesPage.tsx`
- `AccountingTaxPeriodsPage.tsx`
- `AccountingReportsPage.tsx`

## Platform / Admin

- `SuperAdminPage.tsx`
- `AdminTenantsPage.tsx`
- `BillingPage.tsx`
- `SubscriptionPaymentCallbackPage.tsx`

## Help / Audit

- `AuditLogsPage.tsx`
- `HelpSupportPage.tsx`
- `GetAppPage.tsx`

## Next steps

For API wiring and state flows, see `FRONTEND_STATE_AND_SERVICES.md`.
