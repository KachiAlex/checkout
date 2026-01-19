# Backend – Reports Module

## Location

- `apps/backend/src/reports/reports.module.ts`

## Purpose

Generates **multi-dimensional analytics** for sales, inventory, staff, and operational risk. The module aggregates data across Orders, Inventory, Users, Products, Customers, Locations, etc., to surface metrics like:

- Sales summaries, top sellers, and time-based analytics
- Inventory movement and stock health
- Staff performance (sales & inventory activity)
- Smart alerts (stock-outs, low sales), fraud signals, expiry tracking, shrinkage detection

Designed as a reporting façade that orchestrates existing repositories/services rather than storing its own data.

## Key files

- `reports.module.ts` – Imports dependent modules (Orders, Inventory, Users, Products, Customers, Suppliers, Locations) and registers controller/service.@apps/backend/src/reports/reports.module.ts#1-27
- `reports.controller.ts` – REST endpoints for all reporting/analytics routes (sales, top sellers, analytics, alerts, etc.).@apps/backend/src/reports/reports.controller.ts#1-129
- `reports.service.ts` – Core analytics logic (sales aggregation, inventory analytics, staff metrics, alerts). Heavy use of repositories/services to gather raw data.@apps/backend/src/reports/reports.service.ts#1-885

## Security model

- Entire controller guarded with `JwtAuthGuard` and `@ApiBearerAuth('JWT-auth')`.@apps/backend/src/reports/reports.controller.ts#6-28
- Tenant scoping handled by passing `req.user.tenantId` into service methods so repository queries include tenant filters (@ordersRepository.list, @usersRepository.findAll).@apps/backend/src/reports/reports.controller.ts#13-87 @apps/backend/src/reports/reports.service.ts#28-774
- Location access enforced by verifying location ownership before certain computations (inventory analytics).@apps/backend/src/reports/reports.service.ts#612-727

## Public API (ReportsController)

1. `GET /reports/sales`
   - Query: `from`, `to`, `location_id`, `limit`, `offset`.
   - Returns paginated sales summary combining completed orders and paid credit orders.@apps/backend/src/reports/reports.controller.ts#13-35 @apps/backend/src/reports/reports.service.ts#28-149

2. `GET /reports/top-sellers`
   - Query: `from`, `to`, `location_id`, `limit`.
   - Aggregates product quantities/revenue to highlight best performers.@apps/backend/src/reports/reports.controller.ts#37-48 @apps/backend/src/reports/reports.service.ts#151-241

3. `GET /reports/sales-analytics`
   - Query: `period` (daily/weekly/monthly/quarterly/yearly), `location_id`, `from`, `to`.
   - Provides grouped revenue/COGS/gross profit metrics, comparisons, best/worst days, peak hours.@apps/backend/src/reports/reports.controller.ts#50-63 @apps/backend/src/reports/reports.service.ts#243-610

4. `GET /reports/inventory-analytics`
   - Query: `period` (daily/weekly/monthly), `location_id`.
   - Tracks transactions (received/sold/returned/adjusted) and inventorized stock snapshot (quantities, low stock).@apps/backend/src/reports/reports.controller.ts#65-74 @apps/backend/src/reports/reports.service.ts#612-773

5. `GET /reports/staff-performance`
   - Query: `location_id`, `from`, `to`.
   - Combines order totals and inventory transactions per user with comparative metrics.@apps/backend/src/reports/reports.controller.ts#76-86 @apps/backend/src/reports/reports.service.ts#775-1196 (later portion not shown but described conceptually)

6. `GET /reports/alerts`
   - Smart alerts (stock-out, low sales, inactive customers, staff anomalies).@apps/backend/src/reports/reports.controller.ts#88-97

7. `GET /reports/fraud-detection`
   - Highlights suspicious discounting or sales patterns (currently stubbed logic).@apps/backend/src/reports/reports.controller.ts#99-108

8. `GET /reports/expiry-analytics`
   - Batch/expiry monitoring, leverages inventory + batch data to surface upcoming expirations.@apps/backend/src/reports/reports.controller.ts#110-115

9. `GET /reports/shrinkage-detection`
   - Compares theoretical vs actual stock to flag shrinkage.@apps/backend/src/reports/reports.controller.ts#117-127

## Core logic (ReportsService highlights)

### Sales report (`getSales`)

- Fetches completed orders + paid credit orders (filtered by `tenantId`, optional `locationId`, date range).
- Deduplicates via order UUID, sorts by relevant timestamp (paidAt vs createdAt), paginates results, and enriches items with product names via `ProductsService.findByIds`.
- Calculates total/avg order value and returns full order list for requested page.@apps/backend/src/reports/reports.service.ts#28-149

### Top sellers (`getTopSellers`)

- Aggregates order items into `{quantity, revenue}` per product, sorts descending, fetches product metadata for display, and returns top N results.@apps/backend/src/reports/reports.service.ts#151-241

### Sales analytics (`getSalesAnalytics`)

- Supports multiple time buckets via `groupBy` functions, builds range + comparison periods, pulls orders twice (current & previous period) for delta metrics.
- Computes revenue, COGS (using inventory costs or product costs), gross profit, frequency stats, peak hours, best/worst days, and comparison percentages.
- Heavy use of `InventoryRepository.listStock`, `ProductsService.findByIds`, and custom grouping structures.@apps/backend/src/reports/reports.service.ts#243-610

### Inventory analytics (`getInventoryAnalytics`)

- Validates location belongs to tenant; parallel fetch of transactions + stock.
- Groups transactions by period for net flow (received/sold/returned/adjusted) and builds inventory snapshot (quantity, cost value, low stock).@apps/backend/src/reports/reports.service.ts#612-773

### Staff performance (`getStaffPerformance`)

- Parallel fetch: completed orders, inventory transactions, tenant users.
- Aggregates per-user totals for sales (revenue, orders, items) and inventory actions (received/sold/returns/adjustments).
- Merges metrics into a unified staff performance array with ranking potentials.@apps/backend/src/reports/reports.service.ts#775-883 (reads beyond snippet)\*

### Alerts / fraud / expiry / shrinkage

- Later sections combine outcomes from above metrics plus additional heuristics (e.g., SKU-level thresholds, suspicious discounts) to return early warning signals.
- Implementation uses supporting repositories (Customers/Suppliers/BatchInventory) to derive domain-specific alerts.

## Persistence & data sources

The module does not own persistence; it reads from:

- `OrdersRepository` (`orders` Firestore collection): list/filter by status, credit state, device, etc.@apps/backend/src/orders/orders.repository.ts#1-445
- `InventoryRepository`: inventory stock + transactions for movement metrics.@apps/backend/src/inventory/inventory.repository.ts#1-426
- `BatchInventoryRepository`: expiry/batch analytics (Firestore or Prisma).@apps/backend/src/inventory/batch-inventory.repository.ts#1-257
- `UsersRepository`, `ProductsService`, `CustomersRepository`, `LocationsRepository`: metadata enrichment and tenant scoping.

Because queries rely heavily on Firestore filters (equality + range), composite indexes (tenantId + createdAt, tenantId + locationId + createdAt, etc.) must exist in production.

## DTOs

- Uses query params rather than dedicated DTO classes; relies on controller parsing + Nest query decorators.
- `PushChangesDto` etc. irrelevant here; Reports module primarily consumes request query strings with manual parsing (`parseInt`, default ranges).@apps/backend/src/reports/reports.controller.ts#24-35

## Dependencies

- **OrdersModule**: main data source for sales analytics and top sellers.
- **InventoryModule**: transactions, stock snapshots, inventory service for cost lookups.
- **UsersModule**: staff metadata and access context.
- **ProductsModule**: product names/costs for reporting.
- **Customers/Suppliers/Locations Modules**: used in alerts, customer inactivity, supplier performance, location validation.

## Operational notes

- **Performance**: Some reports aggregate entire order histories; consider adding cached/pre-aggregated views for large tenants or adding query pagination to repo-level list methods.
- **Indexes**: Ensure Firestore composite indexes exist for `tenantId + status + createdAt`, `tenantId + isCreditOrder + paymentStatus`, `locationId + ts`, etc., to avoid `requires index` errors (logs already emit warnings).
- **Time zones**: Date handling uses server timezone; if tenants operate across time zones, consider storing offsets or using tenant-specific timezone settings for grouping.
- **Fraud/alerts**: Current endpoints may be MVP stubs; ensure clients treat them as informational until heuristics mature.
- **Pagination limits**: `getSales` caps limit at 1000; clients needing exports should fetch pages sequentially or extend repository to support streaming.
