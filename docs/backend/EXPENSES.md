# Backend – Expenses Module

## Location

- `apps/backend/src/expenses/expenses.module.ts`

## Purpose

Enables **tenant admins** to log operational expenses (fuel, supplies, services) and automatically mirror them in accounting journals. Provides CRUD-lite functionality (create + list) with audit-friendly metadata (who logged, when, vendor, payment method).

## Key files

- `expenses.module.ts` – Imports `DatabaseModule` (Prisma) and `AccountingModule`, registers `AdminExpensesController`, `ExpensesService`, and `ExpensesRepository`.@apps/backend/src/expenses/expenses.module.ts#1-15
- `admin-expenses.controller.ts` – Admin-only routes under `/admin/expenses` for creating and listing expenses.@apps/backend/src/expenses/admin-expenses.controller.ts#1-70
- `expenses.service.ts` – Business logic validating payloads, persisting expenses, and invoking accounting journals.@apps/backend/src/expenses/expenses.service.ts#1-91
- `expenses.repository.ts` – Prisma DAO for the `Expense` table (create + list with filtering).@apps/backend/src/expenses/expenses.repository.ts#1-62
- `dto/create-expense.dto.ts` – Validates request payload (amount, payment method, description, optional vendor/location/occurredAt).@apps/backend/src/expenses/dto/create-expense.dto.ts#1-36

## Security model

- Controller secured with `JwtAuthGuard` and `@ApiBearerAuth('JWT-auth')`.
- Only **tenant admins** (or platform admins) may manage expenses: `ensureTenantAdmin` checks `req.user.role === UserRole.ADMIN` or `isPlatformAdmin`.@apps/backend/src/expenses/admin-expenses.controller.ts#29-69
- Tenant scoping enforced by passing `req.user.tenantId` into service/repository methods; no cross-tenant queries.

## Public API (AdminExpensesController)

Base route: `POST/GET /admin/expenses`

1. `POST /admin/expenses`
   - Body: `CreateExpenseDto`.
   - Validates admin role, then calls `ExpensesService.createExpense` to persist and auto-post accounting journal.@apps/backend/src/expenses/admin-expenses.controller.ts#42-51

2. `GET /admin/expenses`
   - Query params: `locationId?`, `from?`, `to?` (ISO strings).
   - Returns expenses filtered by tenant and optional location/date range.@apps/backend/src/expenses/admin-expenses.controller.ts#53-67

## Core logic (ExpensesService)

### createExpense
1. Rejects `PaymentMethod.CREDIT`; expenses must be paid with immediate methods (cash/bank).@apps/backend/src/expenses/expenses.service.ts#19-27
2. Validates `occurredAt` ISO string.
3. Persists via `expensesRepository.create`, storing metadata about source + creator.
4. Determines accounting event type (`EXPENSE_CASH` vs `EXPENSE_BANK`) based on payment method and calls `AccountingService.postSaleJournal` with `JournalSource.EXPENSE`.@apps/backend/src/expenses/expenses.service.ts#33-67

### listExpenses
- Parses optional `from`/`to` dates and calls repository `list`, which filters by tenant, location, and occurredAt interval (ordered desc).@apps/backend/src/expenses/expenses.service.ts#69-90

## Persistence (ExpensesRepository)

- Backed by Prisma `expense` table (Postgres).
- `create`: inserts tenant, location, amount, currency (default NGN), payment method, description, vendor, occurredAt, createdBy, metadata.@apps/backend/src/expenses/expenses.repository.ts#26-41
- `list`: `findMany` filtered by tenant, optional location & date range, ordered by occurredAt descending.@apps/backend/src/expenses/expenses.repository.ts#43-62
- No Firestore usage; relies entirely on relational DB.

## DTOs

- `CreateExpenseDto`
  - `amountCents` (int >=1)
  - `paymentMethod` (`PaymentMethod` enum; credit disallowed server-side)
  - `description` (max 240 chars)
  - Optional `vendor`, `locationId` (UUID), `occurredAt` ISO string.@apps/backend/src/expenses/dto/create-expense.dto.ts#1-36

## Dependencies

- `DatabaseModule` → `PrismaService` for expense persistence.
- `AccountingModule` → `AccountingService.postSaleJournal` ensures expenses flow into ledgers with the correct mapping.
- `@pos-checkout/shared` enums (PaymentMethod, UserRole) for validation/guards.

## Operational notes

- **Accounting mapping**: Tenants must configure event types `EXPENSE_CASH` / `EXPENSE_BANK`; otherwise finance posting may fail. `postSaleJournal` uses event type to select debit/credit accounts.
- **Payment methods**: Currently only cash/bank-like methods allowed. Extend `isCashMethod` or validations if additional tender types (card, mobile money) should behave differently.
- **Time zones**: `occurredAt` defaults to `new Date()` if omitted; tenant timezone conversions happen client-side—server stores UTC.
- **Auditing**: Metadata includes source `admin.expenses.create`, enabling filtering in accounting logs.
- **Future enhancements**: Add update/delete endpoints, attachment uploads (receipts), or categorize expenses for reporting.
