# Backend – Accounting Module

## Location

- `apps/backend/src/accounting/accounting.module.ts`

## Purpose

The Accounting module provides:

- A tenant-scoped **chart of accounts** and **account mappings** (event → debit/credit accounts)
- Tenant-scoped **journals** (posted entries + lines)
- A **tax engine** for computing order taxes from tax rules
- Tax configuration primitives (**tax rules**, **tax periods**) used by checkout and compliance
- Accounting reports (general ledger, trial balance, profit & loss, balance sheet, VAT payable)

This module is central to:

- Consistent tax calculation at checkout
- Automatic journal posting for sales/refunds/expenses
- VAT payable tracking and reporting

## Key files

- `accounting.module.ts`
  - Registers controllers for compute tax, admin accounting CRUD, reports, and tax management.
  - Provides `AccountingService`, `AccountingRepository`, `TaxEngineService`, `AccountingReportsService`.

- `accounting.controller.ts`
  - Authenticated endpoint to compute taxes for draft order lines.

- `tax-rules.controller.ts`
  - Authenticated endpoint to list active tax rules for checkout.

- `admin-accounting.controller.ts`
  - Authenticated admin endpoints for accounts/mappings/journals.

- `admin-accounting-reports.controller.ts`
  - Authenticated admin/manager endpoints for accounting reports.

- `admin-tax-rules.controller.ts`
  - Authenticated admin endpoints to manage tax rules.

- `admin-tax-periods.controller.ts`
  - Authenticated admin endpoints to manage tax periods.

- `accounting.service.ts`
  - Higher-level operations:
    - ensure defaults (accounts + mappings)
    - compute order taxes
    - post journals and deduplicate sale journals

- `tax-engine.service.ts`
  - Tax rule matching + exclusive/inclusive tax computation.

- `accounting-reports.service.ts`
  - Report computations using repository queries/aggregations.

- `accounting.repository.ts`
  - Prisma persistence for accounts/mappings/journals/tax rules/tax periods.
  - Ensures tenant defaults for accounting.

- `accounting-defaults.ts`
  - Default system accounts and default event mappings.

## Security model

All controllers in this module use `JwtAuthGuard`.

Admin/manager restrictions are implemented inside controllers via `ensureTenantAdmin(...)` and `ensureTenantAdminOrManagerReadOnly(...)` helpers.

- **Platform admin** (`req.user.isPlatformAdmin`) bypasses tenant role checks.
- **Tenant admin** (`UserRole.ADMIN`) can manage configuration.
- **Tenant manager** (`UserRole.MANAGER`) is typically read-only for admin surfaces and allowed for reports.

## Public API (Controllers)

### 1) Tax computation (checkout)

Base route: `@Controller('accounting')`

#### `POST /accounting/compute-tax`

- **Purpose**: Compute taxes for draft order lines before an order is finalized.
- **Auth**: JWT required
- **Tenant scoping**: uses `req.user.tenantId`
- **Body**: `ComputeTaxDto`
  - `locationId?`
  - `defaultTaxRate?` (decimal; `0.075` for 7.5%)
  - `lines[]`
    - `lineId`
    - `amountCents`
    - `taxRuleId?`
    - `categoryId?`
    - `tags?[]`
- **Service**: `AccountingService.computeOrderTaxes(...)`

### 2) Tax rules (checkout)

Base route: `@Controller('tax-rules')`

#### `GET /tax-rules`

- **Purpose**: List active tax rules for the current tenant for checkout.
- **Auth**: JWT required
- **Tenant scoping**: uses `req.user.tenantId`
- **Query**:
  - `locationId?` (optional branch override)
  - `taxCode?` (e.g. `VAT`)
- **Repository**: `AccountingRepository.listActiveTaxRules(...)`

### 3) Admin accounting (accounts, mappings, journals)

Base route: `@Controller('admin/accounting')`

#### `GET /admin/accounting/accounts`

- **Purpose**: List tenant chart of accounts.
- **Role**: ADMIN or MANAGER (read-only) or platform admin
- **Repository**: `listAccounts(tenantId)`

#### `POST /admin/accounting/accounts`

- **Purpose**: Create a custom account.
- **Role**: ADMIN or platform admin
- **Body**: `CreateAccountDto` (`code`, `name`, `type`, `isActive?`)
- **Repository**: `createAccount(tenantId, dto)`

#### `PATCH /admin/accounting/accounts/:id`

- **Purpose**: Update account (name/type/isActive).
- **Role**: ADMIN or platform admin
- **Body**: `UpdateAccountDto`
- **Repository**: `updateAccount(tenantId, id, dto)`

#### `GET /admin/accounting/mappings`

- **Purpose**: List account mappings (event → debit/credit accounts).
- **Role**: ADMIN or platform admin
- **Repository**: `listMappings(tenantId)`

#### `PUT /admin/accounting/mappings/:eventType`

- **Purpose**: Upsert an account mapping (tenant-wide or branch override).
- **Role**: ADMIN or platform admin
- **Body**: `UpsertAccountMappingDto`
  - `debitAccountId`
  - `creditAccountId`
  - `branchId?` (null/undefined means tenant default)
  - `isActive?`
- **Repository**: `upsertMapping(tenantId, eventType, dto)`

#### `GET /admin/accounting/journals`

- **Purpose**: List journal entries.
- **Role**: ADMIN or MANAGER or platform admin
- **Query**:
  - `locationId?`
  - `source?` (cast to `JournalSource`)
  - `status?` (cast to `JournalStatus`)
  - `from?`/`to?` (validated by controller)
- **Repository**: `listJournalEntries(tenantId, filters)`

#### `GET /admin/accounting/journals/:id`

- **Purpose**: Retrieve a journal entry and its lines.
- **Role**: ADMIN or MANAGER or platform admin
- **Repository**: `getJournalEntry(tenantId, id)`

#### `POST /admin/accounting/journals/:id/void`

- **Purpose**: Void a journal entry.
- **Role**: ADMIN or platform admin
- **Repository**: `voidJournalEntry(tenantId, id)`

### 4) Admin tax rules

Base route: `@Controller('admin/accounting/tax-rules')`

#### `GET /admin/accounting/tax-rules`

- **Purpose**: List tax rules, optionally include inactive.
- **Role**: ADMIN or platform admin
- **Query**:
  - `locationId?`
  - `taxCode?`
  - `includeInactive?` (string `'true'` → boolean)
- **Repository**: `listTaxRules(tenantId, filters)`

#### `POST /admin/accounting/tax-rules`

- **Purpose**: Create a tax rule.
- **Role**: ADMIN or platform admin
- **Body**: `CreateTaxRuleDto`
  - `name`, `authority`, `taxCode`, `rate`, `mode?`, `effectiveFrom`, `effectiveTo?`, `locationId?`, `isActive?`
- **Repository**: `createTaxRule(tenantId, dto, createdBy)`

#### `PATCH /admin/accounting/tax-rules/:id`

- **Purpose**: Update a tax rule.
- **Role**: ADMIN or platform admin
- **Body**: `UpdateTaxRuleDto` (all optional)
- **Repository**: `updateTaxRule(tenantId, id, dto)`

### 5) Admin tax periods

Base route: `@Controller('admin/accounting/tax-periods')`

#### `GET /admin/accounting/tax-periods`

- **Purpose**: List tax periods.
- **Role**: ADMIN or platform admin
- **Query**:
  - `locationId?`, `taxCode?`, `from?`, `to?`
- **Repository**: `listTaxPeriods(tenantId, filters)`

#### `POST /admin/accounting/tax-periods`

- **Purpose**: Upsert a tax period record.
- **Role**: ADMIN or platform admin
- **Body**: `UpsertTaxPeriodDto`
- **Repository**: `upsertTaxPeriod(tenantId, dto, createdBy)`

### 6) Admin accounting reports

Base route: `@Controller('admin/accounting/reports')`

All report endpoints require ADMIN (or MANAGER for some) or platform admin.

#### `GET /admin/accounting/reports/general-ledger`

- **Query**: `accountId` (required), `locationId?`, `from?`, `to?`
- **Service**: `AccountingReportsService.generalLedger(...)`

#### `GET /admin/accounting/reports/trial-balance`

- **Query**: `locationId?`, `from?`, `to?`
- **Service**: `AccountingReportsService.trialBalance(...)`

#### `GET /admin/accounting/reports/profit-loss`

- **Query**: `locationId?`, `from` (required), `to` (required)
- **Service**: `AccountingReportsService.profitAndLoss(...)`

#### `GET /admin/accounting/reports/balance-sheet`

- **Query**: `locationId?`, `asOf` (required)
- **Service**: `AccountingReportsService.balanceSheet(...)`

#### `GET /admin/accounting/reports/vat-payable`

- **Query**: `locationId?`, `from` (required), `to` (required), `taxCode?` (default `VAT`)
- **Service**: `AccountingReportsService.vatPayableReport(...)`

## Core logic

### Defaults and configuration

`AccountingService.ensureTenantDefaults(tenantId)` calls:

- `AccountingRepository.ensureDefaults({ tenantId })`
  - `ensureAccounts(tenantId)` upserts system accounts from `DEFAULT_ACCOUNT_DEFINITIONS`.
  - `ensureMappings(tenantId)` ensures tenant-wide default mappings from `DEFAULT_ACCOUNT_MAPPINGS`.

Default system accounts include (examples):

- `CASH`, `BANK`, `ACCOUNTS_RECEIVABLE`, `ACCOUNTS_PAYABLE`
- `SALES_REVENUE`, `SALES_RETURNS`
- `VAT_PAYABLE`
- `INVENTORY`, `COGS`, `OPERATING_EXPENSES`

Default event mappings include (examples):

- `SALE_CASH`: debit `CASH`, credit `SALES_REVENUE` (+ VAT)
- `SALE_CARD`: debit `BANK`, credit `SALES_REVENUE` (+ VAT)
- `SALE_CREDIT`: debit `ACCOUNTS_RECEIVABLE`, credit `SALES_REVENUE` (+ VAT)
- `REFUND_*`: debit `SALES_RETURNS`, credit `CASH/BANK` (+ VAT)
- `EXPENSE_*`: debit `OPERATING_EXPENSES`, credit `CASH/BANK`

### Tax computation

Tax computations are performed by `TaxEngineService`:

- Loads active tax rules for tenant, optionally scoped by `locationId`:
  - includes both location-specific rules and global rules (`locationId=null`)
- Selects a rule per line by priority:
  1. `line.taxRuleId` (if provided)
  2. `matchRule(...)` using `categoryId` and/or `tags`
  3. fallback to `defaultTaxRate` or 0
- Computes tax by mode:
  - `TaxMode.EXCLUSIVE`: tax = `amount * rate`
  - `TaxMode.INCLUSIVE`: splits inclusive amount into net + tax

### Journal posting

`AccountingService.ensureSaleJournalForOrder(...)` ensures journals are not duplicated:

- Uses repository `findJournalEntry({ tenantId, source, sourceId })` to check for existing
- If not found, posts journal via `postSaleJournal(...)`

`postSaleJournal(...)`:

- Looks up mapping by `eventType` and optional `branchId` (location) with fallback to tenant-wide mapping.
- Adds VAT payable line when `taxCents > 0`.
- Uses `taxDirection` (credit/debit) to support normal sale VAT vs VAT reversal.
- Persists as a `JournalEntry` with `JournalLine` children.

### Reporting

`AccountingReportsService` computes reports by:

- Using repository list/groupBy queries
- Normalizing “normal side” of accounts based on `AccountType`
- Producing computed totals and sorted rows

Notable specifics:

- `generalLedger` computes a running balance.
- `trialBalance` groups balances by account and normalizes debit/credit.
- `balanceSheet` computes `isBalanced` and `differenceCents`.
- `vatPayableReport`:
  - sums VAT payable credits (collected) and debits (reversed)
  - produces breakdown by `taxRuleId`
  - attempts to find a `TaxPeriod` covering the requested date range

## Persistence (Repository)

Everything here is Prisma/Postgres.

Key methods include:

- Tax:
  - `listActiveTaxRules`, `listTaxRules`, `createTaxRule`, `updateTaxRule`
  - `upsertTaxPeriod`, `listTaxPeriods`, `findTaxPeriodCoveringRange`
- Defaults:
  - `ensureDefaults`, `ensureAccounts`, `ensureMappings`
- Accounts:
  - `listAccounts`, `createAccount`, `updateAccount`
- Mappings:
  - `listMappings`, `getMapping`, `upsertMapping`
- Journals:
  - `findJournalEntry`, `createJournalEntry`, `listJournalEntries`, `getJournalEntry`, `voidJournalEntry`
- Reports helpers:
  - `listGeneralLedgerLines`, `aggregateAccountBalances`
  - `listVatPayableLines`, `aggregateVatPayableByTaxRule`, `listTaxRulesByIds`

### Notable implementation details

- `getMapping(...)` supports branch overrides:
  - if `branchId` provided, mapping lookup prefers `branchId` then falls back to `null`.

- `ensureMappings(...)` has a special case:
  - Prisma cannot `upsert` on a composite unique where a nullable field is `null` in the unique key.
  - Tenant-wide mappings are treated as `branchId = null` and are handled via `findFirst + update/create`.

- `createTaxRule(...)` validates:
  - dates parse successfully
  - rate is finite and >= 0
  - wraps Prisma known errors as `BadRequestException`

- `createTaxRule(...)` also calls `ensureTenantExists(tenantId)` as a guard against FK violations.

## Dependencies

- `DatabaseModule` / `PrismaService`
- Auth guards: `JwtAuthGuard`
- Shared enum: `UserRole` from `@pos-checkout/shared`

## Operational notes

- If a tenant has no chart of accounts/mappings yet, `compute-tax` and journal posting paths call `ensureTenantDefaults` to bootstrap configuration.
- VAT reporting requires the `VAT_PAYABLE` system account to exist; otherwise it throws `NotFoundException`.
