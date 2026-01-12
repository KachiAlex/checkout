# Data Model (Prisma / Postgres)

This document summarizes the Postgres schema defined in `apps/backend/prisma/schema.prisma`.

## Core concepts

- **Tenant** is the root entity for multi-tenancy.
- Most operational entities include a `tenantId` foreign key referencing `Tenant.id`.

## Key tables/entities (high-level)

### Tenant

- **Fields**: `id`, `name`, `slug`, `plan`, `status`, timestamps.
- **Relations**: users, products, locations, orders, accounting entities, audit logs, etc.

### User

- Belongs to a tenant (`tenantId`).
- Stores `pinHash` for PIN-based login.

### Location

- A store/branch.
- Many transactional entities are scoped to a location.

### Product / Inventory

- `Product` defines catalog.
- `Inventory`/`InventoryBatch` track on-hand quantities and batches.

### Orders / Payments

- `Order` represents a checkout transaction.
- `Payment` represents payment records; webhooks update status.

### Procurement

- `Supplier`, `PurchaseOrder`, `GRN` (goods received note) represent procurement flow.

### Returns

- `Return` represents returned/credited items.

### Accounting

- `Account`, `AccountMapping`, `JournalEntry` for bookkeeping.
- `TaxRule` defines tax rates/modes.
- `TaxPeriod` defines filing periods.

### Audit

- `ComplianceAuditLog` stores audit events for authenticated writes.

## Multi-tenant FK behavior

- Many tables use `@relation(fields: [tenantId], references: [id], onDelete: Cascade)`.
- This means the referenced tenant row must exist for inserts.

## Where to look in code

- Prisma usage: `apps/backend/src/database/prisma.service.ts`.
- Tenant CRUD: `apps/backend/src/tenants/tenants.repository.ts`.
- Accounting persistence: `apps/backend/src/accounting/accounting.repository.ts`.
