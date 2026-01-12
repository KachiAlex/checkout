# Backend – Inventory Module

## Location

- `apps/backend/src/inventory/inventory.module.ts`

## Purpose

The Inventory module keeps **per-location stock, pricing, and transactional history** in sync with product creation, sales, returns, and manual adjustments. It provides APIs for:

- Viewing stock + batches per location
- Adjusting quantities (sales, returns, damage, credit, etc.)
- Creating combined product+inventory entries
- Managing pricing, reorder points, and batch metadata
- Auditing adjustments via transactions and deduplicating data

## Key files

- `inventory.module.ts` – Wires controllers/services and imports Products, Categories, Brands, Users, Tenants, plus repositories used for location lookups and batch tracking.@apps/backend/src/inventory/inventory.module.ts#1-19
- `inventory.controller.ts` – REST endpoints for stock views, adjustments, price updates, duplicates cleanup, etc., with tenant/location guards.@apps/backend/src/inventory/inventory.controller.ts#1-288
- `inventory.service.ts` – Core business logic: stock enrichment, adjustment workflows, create-item pipeline, duplicate handling, price updates, and helper methods consumed by other modules (Orders/Returns).@apps/backend/src/inventory/inventory.service.ts#1-430
- `inventory.repository.ts` – Firestore DAO for `inventory` and `inventoryTransactions` collections, including batching helpers, duplicate detection, and clear-all utilities.@apps/backend/src/inventory/inventory.repository.ts#1-426
- `batch-inventory.repository.ts` – Handles batch-level stock (Firestore or Postgres fallback) for tenants with batch/expiry tracking.@apps/backend/src/inventory/batch-inventory.repository.ts#1-257
- DTOs: `adjust-inventory.dto.ts`, `create-inventory-item.dto.ts`, `update-inventory-prices.dto.ts`, `update-inventory-item.dto.ts`.

## Security model

- Controller guarded by `JwtAuthGuard` and `@ApiBearerAuth('JWT-auth')` so only authenticated tenant users can operate inventory APIs.@apps/backend/src/inventory/inventory.controller.ts#31-288
- Each request extracts `tenantId` & `userId` from JWT (`getTenantId`, `getUserId` helpers) and rejects requests missing context.@apps/backend/src/inventory/inventory.controller.ts#273-287
- Location access enforced per endpoint: `locationsRepository.findById` ensures the location exists and belongs to the tenant before proceeding (403 on mismatch).@apps/backend/src/inventory/inventory.controller.ts#41-167
- Adjustments ignore caller-supplied `locationId/userId` when missing/invalid—controller resolves them from session or tenant defaults to avoid spoofing.@apps/backend/src/inventory/inventory.controller.ts#85-142

## Public API (InventoryController)

Base route: `@Controller('inventory')`.

1. `GET /inventory/:location_id/stock`
   - Validates tenant ownership of the location, then returns enriched stock for the location.@apps/backend/src/inventory/inventory.controller.ts#41-60

2. `GET /inventory/:location_id/batch/:product_id`
   - Fetches batch-level quantities for a product/location (requires tenant ownership).@apps/backend/src/inventory/inventory.controller.ts#61-83

3. `POST /inventory/adjust`
   - Adjusts stock (positive or negative) via `AdjustInventoryDto`. Cleans DTO, resolves location/user, and delegates to service adjust logic.@apps/backend/src/inventory/inventory.controller.ts#85-142

4. `GET /inventory/:location_id/transactions?from=&to=`
   - Lists transactions for a location with optional time filtering.@apps/backend/src/inventory/inventory.controller.ts#144-167

5. `POST /inventory/create-item`
   - Combined flow that creates a product (with category/brand auto-creation), inserts inventory, logs a transaction, and optionally creates batch records.@apps/backend/src/inventory/inventory.controller.ts#169-189

6. `GET /inventory/duplicates`
   - Diagnostic endpoint returning duplicate inventory records (same product/location pair).@apps/backend/src/inventory/inventory.controller.ts#191-196

7. `POST /inventory/remove-duplicates`
   - Removes duplicates while keeping the oldest record per product/location.@apps/backend/src/inventory/inventory.controller.ts#198-203

8. `DELETE /inventory/clear-all`
   - Purges all inventory records (dangerous maintenance hook).@apps/backend/src/inventory/inventory.controller.ts#205-211

9. `PUT /inventory/prices`
   - Updates cost/sales price for a product at a location, resolving location if omitted.@apps/backend/src/inventory/inventory.controller.ts#213-239

10. `PUT /inventory/item`
    - Updates quantity/reorder point/cost/sales price values, logging an ADJUST transaction when quantity changes.@apps/backend/src/inventory/inventory.controller.ts#241-271

## Core logic (InventoryService)

### Stock enrichment
- `getStock(locationId, tenantId)` lists inventory, batches product IDs for lookup, hydrates last transactions/users, and falls back to “Unknown product” when metadata is missing.@apps/backend/src/inventory/inventory.service.ts#25-142
- `getBatchInventory` proxies to `BatchInventoryRepository` for tenants with batch/expiry tracking.@apps/backend/src/inventory/inventory.service.ts#144-146

### Adjustments & order hooks
- `adjust` upserts inventory quantities (never negative), logs an inventory transaction, and captures metadata (user, notes, reference).@apps/backend/src/inventory/inventory.service.ts#160-186
- Convenience helpers `decrementForSale`, `decrementForCreditSale`, `incrementForReturn` wrap `adjust` with specific `InventoryTransactionType` enums and reference IDs (order/return).@apps/backend/src/inventory/inventory.service.ts#188-239
- `getTransactions` converts string query params to `Date` and delegates to repository listing.@apps/backend/src/inventory/inventory.service.ts#241-245

### Create inventory item pipeline
- Validates tenant feature flags for batch/expiry requirements (via `TenantsService`), ensures expiry dates/batch numbers align with enabled features, and autogenerates SKUs when omitted.@apps/backend/src/inventory/inventory.service.ts#247-272
- Finds/creates categories & brands if names are provided (soft dependencies on Categories/Brands modules).@apps/backend/src/inventory/inventory.service.ts#273-288
- Creates a Product via `ProductsService`, upserts initial inventory, logs a RECEIVED transaction, and optionally inserts into `batch_inventory` for batch tracking.@apps/backend/src/inventory/inventory.service.ts#290-339

### Data hygiene & pricing
- `findDuplicates` / `removeDuplicates` delegate to repository utilities for cleaning duplicate product/location rows (keeps oldest record).@apps/backend/src/inventory/inventory.service.ts#347-353 @apps/backend/src/inventory/inventory.repository.ts#278-340
- `clearAllInventory` deletes every inventory doc using Firestore batch commits (500 ops per batch).@apps/backend/src/inventory/inventory.service.ts#355-357 @apps/backend/src/inventory/inventory.repository.ts#342-370
- `updateInventoryPrices` and `updateInventoryItem` re-use repository upsert to apply new price/thresholds, and `updateInventoryItem` logs an ADJUST transaction if quantity changed to keep history consistent.@apps/backend/src/inventory/inventory.service.ts#359-428

## Persistence

- **Collections**:
  - `inventory`: per product/location stock with quantity, reorder points, cost, sales price.@apps/backend/src/inventory/inventory.repository.ts#52-126
  - `inventoryTransactions`: append-only ledger capturing deltas, reasons, reference IDs, and timestamps.@apps/backend/src/inventory/inventory.repository.ts#20-166
  - `batch_inventory`: optional batch-level tracking stored in Firestore or Prisma/Postgres depending on `DB_PROVIDER`.@apps/backend/src/inventory/batch-inventory.repository.ts#48-170
- **Indexes & batching**:
  - `getLastTransaction` first tries ordered query requiring composite index and falls back to scan/sort if missing (logs warning).@apps/backend/src/inventory/inventory.repository.ts#169-210
  - `getLastTransactionsBatch` pulls the latest ~1000 transactions per location to avoid N queries; falls back to per-product lookups if indexes missing.@apps/backend/src/inventory/inventory.repository.ts#212-276
  - `findByIds` style functionality not needed because inventory documents already keyed by location/product, but transactions & duplicates rely on in-memory grouping maps for dedupe stats.@apps/backend/src/inventory/inventory.repository.ts#278-340
- **Batch repository** seamlessly switches between Firestore and Prisma depending on deployment, ensuring expiry ordering even when Firestore lacks uniform fields (memory sort fallback).@apps/backend/src/inventory/batch-inventory.repository.ts#62-157

## DTOs

- `AdjustInventoryDto`: product/location/quantity delta, transaction type, optional reference/user/notes/reason (location resolved server-side if omitted).@apps/backend/src/inventory/dto/adjust-inventory.dto.ts#1-50
- `CreateInventoryItemDto`: combines product metadata, category/brand names, pricing, tax, batch number, expiry date for create-item flow.@apps/backend/src/inventory/dto/create-inventory-item.dto.ts#1-77
- `UpdateInventoryPricesDto`: optional location plus new cost/sales prices.@apps/backend/src/inventory/dto/update-inventory-prices.dto.ts#1-29
- `UpdateInventoryItemDto`: product/location plus optional quantity, reorder point, cost, sales price (all validated non-negative).@apps/backend/src/inventory/dto/update-inventory-item.dto.ts#1-41

## Dependencies

- `ProductsService` (product creation + metadata hydration).@apps/backend/src/inventory/inventory.service.ts#15-113 @apps/backend/src/inventory/inventory.service.ts#290-339
- `CategoriesService` & `BrandsService` (find-or-create flows for create-item).@apps/backend/src/inventory/inventory.service.ts#17-288
- `BatchInventoryRepository` for tenants with batch/expiry tracking.
- `UsersRepository` for enrichments (last adjusted by).@apps/backend/src/inventory/inventory.service.ts#71-100
- `TenantsService` for feature flags (batch/expiry enforcement).@apps/backend/src/inventory/inventory.service.ts#247-269
- `LocationsRepository` (controller-level access checks/resolution).@apps/backend/src/inventory/inventory.controller.ts#41-232

## Operational notes

- **Location access**: every endpoint validates location ownership, preventing cross-tenant leakage even if IDs are guessed.@apps/backend/src/inventory/inventory.controller.ts#41-167
- **Indexes**: Firestore composite indexes may be required for the ordered queries in `inventoryTransactions`. Watch console logs for index warnings and create suggested indexes in production.@apps/backend/src/inventory/inventory.repository.ts#169-276
- **Batch mode**: Setting `DB_PROVIDER=postgres` moves batch inventory persistence to Prisma/Postgres, so deployers must keep those tables migrated; Firestore remains source for main inventory counts.@apps/backend/src/inventory/batch-inventory.repository.ts#48-170
- **Dangerous endpoints**: `remove-duplicates` and `clear-all` are maintenance utilities—restrict their use in production or gate them behind higher roles if necessary.
- **Adjust safeguards**: Service clamps quantities to >=0 and records each change with metadata, which is critical for audit/history and reconciliations.@apps/backend/src/inventory/inventory.service.ts#160-186
