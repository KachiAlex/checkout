# Backend – Products Module

## Location

- `apps/backend/src/products/products.module.ts`

## Purpose

The Products module provides the **catalog management layer** for the POS backend. It exposes authenticated CRUD endpoints for creating, updating, and retrieving product definitions (SKU, barcode, pricing, tax rate, imagery). These records are referenced by Inventory, Orders, and Receipts flows when enriching line items or scanning barcodes during checkout.

## Key files

- `products.module.ts` – Registers controller, service, repository exports for other modules.@apps/backend/src/products/products.module.ts#1-11
- `products.controller.ts` – REST endpoints for listing, fetching, creating, and updating products.@apps/backend/src/products/products.controller.ts#1-63
- `products.service.ts` – Tenant-scoped business logic (search results, SKU/barcode lookups, validation before persistence).@apps/backend/src/products/products.service.ts#1-87
- `products.repository.ts` – Firestore DAO for the `products` collection, including search, create, update, and batch fetch helpers.@apps/backend/src/products/products.repository.ts#1-297
- DTOs
  - `dto/create-product.dto.ts`
  - `dto/update-product.dto.ts`

## Security model

- `@UseGuards(JwtAuthGuard)` on the controller ensures only authenticated tenant users can interact with products.@apps/backend/src/products/products.controller.ts#19-63
- No fine-grained role guard yet; access is granted to any authenticated tenant context.
- Tenant scoping enforced in service/repository by always passing the `tenantId` derived from `req.user` and filtering queries accordingly.@apps/backend/src/products/products.service.ts#10-85 @apps/backend/src/products/products.repository.ts#58-185

## Public API (ProductsController)

Base route: `@Controller('products')`

1. `GET /products`
   - **Query params**: `query` (search string), `location_id` (future filter hook).@apps/backend/src/products/products.controller.ts#26-36
   - Returns products belonging to the tenant, optionally filtered client-side by substring match on name/SKU/barcode.

2. `GET /products/:id`
   - Path param validated via `ParseUUIDPipe`.
   - Loads a product scoped to the tenant; throws 404 if missing.@apps/backend/src/products/products.controller.ts#37-43

3. `POST /products`
   - Body: `CreateProductDto`.
   - Creates a new product record (defaults `active=true`).@apps/backend/src/products/products.controller.ts#45-51

4. `PUT /products/:id`
   - Body: `UpdateProductDto` (partial update).
   - Persists changes after confirming the product belongs to the tenant.@apps/backend/src/products/products.controller.ts#52-62

## Core logic (ProductsService)

### Search & listing

- `findAll(query, locationId, tenantId)` pulls active products then applies in-memory filtering/sorting for search relevance (exact barcode > exact SKU > partials). Location filtering is a placeholder for future integration with inventory/branches.@apps/backend/src/products/products.service.ts#10-22 @apps/backend/src/products/products.repository.ts#66-109

### Lookup helpers

- `findOne(id, tenantId)` ensures tenant ownership and throws `NotFoundException` if absent.@apps/backend/src/products/products.service.ts#23-31
- `findByIds(ids, tenantId)` batches up to 10 Firestore document fetches per chunk to efficiently hydrate drafts or credit memos.@apps/backend/src/products/products.repository.ts#146-185
- `findByBarcode` / `findBySku` only return active products; used by barcode scanners or SKU entry flows.@apps/backend/src/products/products.service.ts#40-54

### Mutations

- `create(dto, tenantId)` maps validated DTO fields to repository `CreateProductInput`, ensuring required SKU/name and default tax rate/timestamps.@apps/backend/src/products/products.service.ts#56-74 @apps/backend/src/products/products.repository.ts#186-219
- `update(id, tenantId, dto)` first verifies existence (guarding against cross-tenant access) then issues a partial Firestore merge update limited to allowed fields.@apps/backend/src/products/products.service.ts#76-85 @apps/backend/src/products/products.repository.ts#221-259

## Persistence (ProductsRepository)

- Collection: `products` (Firestore).@apps/backend/src/products/products.repository.ts#52-65
- Indexed fields: `tenantId`, `active`, `sku`, `barcode`. Complex search currently executed in memory after fetching tenant’s active products.
- Records store pricing, taxRate, optional category/brand metadata, `variants` payload, and `images` array.
- Server timestamps (`createdAt`, `updatedAt`) stored as Firestore timestamps and converted to JS dates when returning to callers.@apps/backend/src/products/products.repository.ts#186-296
- `findByIds` uses Firestore `getAll()` chunking per 10 doc refs to keep RPC counts low – important for orders pulling dozens of product IDs at once.@apps/backend/src/products/products.repository.ts#146-185

## DTOs

- `CreateProductDto`: validates SKU/name, optional barcode/category/brand, price/cost in cents, tax rate between 0-1, variants (free-form object), image URLs, and `active` flag.@apps/backend/src/products/dto/create-product.dto.ts#1-87
- `UpdateProductDto`: `PartialType(CreateProductDto)` enabling PATCH-style payloads for PUT updates.@apps/backend/src/products/dto/update-product.dto.ts#1-5

## Dependencies

- `FirestoreService` (via ProductsRepository) for persistence.
- `JwtAuthGuard` for authentication context injection.
- Downstream modules: Inventory, Orders, Receipts, and Accounting consume product data (IDs, tax rates, cost/price) though not directly imported here.

## Operational notes

- **Idempotency**: Controller allows repeated POSTs with same SKU; repository does not currently enforce uniqueness. Rely on UI validation to avoid duplicates.
- **Search scaling**: Because search filters run in memory, tenants with very large catalogs should consider additional indexing or migrating to Firestore composite queries.
- **Location filtering**: `location_id` is accepted but ignored; future enhancement could join with inventory/branch stock levels.
- **Data integrity**: Repository throws if attempting to access another tenant’s product, preventing cross-tenant leakage.@apps/backend/src/products/products.repository.ts#221-259
