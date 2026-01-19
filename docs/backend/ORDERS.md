# Backend – Orders Module

## Location

- `apps/backend/src/orders/orders.module.ts`

## Purpose

The Orders module powers the **checkout transaction lifecycle**:

- Validates POS cart payloads and creates tenant-scoped orders (idempotent via client UUID)
- Resolves locations, enforces tenant/location permissions, and handles held/suspended orders
- Coordinates with Inventory to decrement/increment stock, Customers to award loyalty points, and Accounting to post journals
- Provides administrative endpoints for listing/filtering orders, handling credit sales, and updating statuses

## Key files

- `orders.module.ts`
  - Imports Inventory, Customers, Locations, Users, Products, Accounting modules.
  - Registers `OrdersController`, `OrdersService`, `OrdersRepository`.

- `orders.controller.ts`
  - REST API for creating orders, listing (all/held/credit), reading, holding/recalling/completing held orders, and marking credit orders paid/returned.

- `orders.service.ts`
  - Business logic: location resolution, inventory validation/decrement, loyalty points, accounting journals, held/credit flows, tenant access helpers.

- `orders.repository.ts`
  - Firestore persistence layer (collection `orders`), includes pagination fallbacks when indexes are missing.

- `dto/create-order.dto.ts`
  - Request DTO enforced on `POST /orders`.

## Security model

- All endpoints are wrapped with `@UseGuards(JwtAuthGuard)` and require `@ApiBearerAuth('JWT-auth')` tokens.
- Tenant scoping occurs via helpers inside `OrdersController` (`getTenantId/getUserId`) and `OrdersService` (`verifyTenantAccess`, `verifyLocationAccess`).
- Unauthorized/forbidden access triggers `UnauthorizedException` or `ForbiddenException` depending on context.

## Public API (Controllers)

Base route: `@Controller('orders')`

### `POST /orders`

- **Summary**: Create an order (idempotent by `dto.uuid`).
- **Body**: `CreateOrderDto`
  - `uuid` (required client UUID)
  - `locationId?` (resolved via user/location fallback)
  - `items[]` (`productId`, `quantity`, `priceCents`, `taxCents`, `discountCents?`)
  - `subtotalCents`, `taxCents`, `totalCents`
  - `taxRuleIdUsed?`, `taxRateBpsUsed?`
  - `discountCents?`, `discountPercent?`, `discountReason?`
  - `deviceId?`, `notes?`
  - `isHeld?`, `isCreditOrder?`, `paymentMethod?`
  - `customerId?`
- **Behavior**: resolves location, validates prices vs Products/Inventory, decrements stock (unless held), posts journals, awards loyalty.

### `GET /orders`

- **Summary**: List orders (sales).
- **Query**:
  - `location_id?`
  - `from?`, `to?` (ISO)
  - `status?`
- **Notes**: verifies optional location belongs to tenant before invoking `OrdersService.findAll`. Without `location_id`, results filtered by tenant’s locations.

### `GET /orders/held`

- **Summary**: List held/suspended orders.
- **Query**: `location_id?` (tenant access enforced if provided).

### `GET /orders/credit`

- **Summary**: List credit orders (items taken on credit).
- **Query**: `location_id?` (tenant access enforced if provided).

### `GET /orders/:id`

- **Summary**: Fetch order by ID.
- **Behavior**: verifies tenant owns the order’s location, else `ForbiddenException`.

### `PATCH /orders/:id`

- **Summary**: Update order status and/or notes.
- **Body**: `{ status?: string; notes?: string }`
- **Guard**: tenant ownership check before update.

### `POST /orders/:id/hold`

- **Summary**: Mark an order as held (pending). Fails if already completed.

### `POST /orders/:id/recall`

- **Summary**: Recall (un-hold) a held order.

### `POST /orders/:id/complete-held`

- **Summary**: Complete a held order (validates inventory, decrements stock, posts journal, awards loyalty).

### `POST /orders/:id/credit/mark-paid`

- **Summary**: Mark a credit order as paid.
- **Validation**: order must be credit, not already paid/returned.

### `POST /orders/:id/credit/mark-returned`

- **Summary**: Mark a credit order as returned (restocks items, sets payment status to REFUNDED).

## Core logic (OrdersService)

### Location resolution

1. `dto.locationId`
2. User’s `locationId` (via `UsersRepository.findById`)
3. `userLocationId` argument from controller (derived from JWT)
4. First tenant location (`LocationsRepository.findByTenant`)
5. Tenant ID fallback (single-location tenants)

If still missing, throws `BadRequestException` advising to assign/create a location.

### Order validation & creation

- `validateOrderPrices` cross-checks item prices against Products/Inventory (logs mismatches).
- `validateAndDecrementInventory` ensures sufficient stock and decrements with proper transaction types (credit vs cash sale).
- Held orders skip inventory decrement until completion.
- Generates order number as `ORD-{locPrefix}-{YYYYMMDD}-{seq}` based on daily count per location.
- Stored attributes include `tenantId`, `taxRuleIdUsed`, `taxRateBpsUsed`, `paymentMethod`, credit flags, statuses, etc.
- Completed instant sales trigger `AccountingService.ensureSaleJournalForOrder` with event type derived from payment method:
  - `SALE_CASH`, `SALE_CARD`, `SALE_TRANSFER`, `SALE_QR`, or fallback `SALE`.
- Credit sales use `SALE_CREDIT` event type.
- Loyalty points awarded (Customers service) for completed orders with a `customerId`.

### Held order flow

- `holdOrder`: ensures order not completed, toggles `isHeld=true`, status `PENDING`, sets `heldAt`.
- `recallOrder`: ensures `isHeld`, toggles `isHeld=false`, clears `heldAt`.
- `completeHeldOrder`: validates stock, decrements inventory, marks `COMPLETED`, posts journal, awards loyalty.

### Credit order flow

- `isCreditOrder` flag triggers `paymentStatus = PENDING` and requires `customerId`.
- `markCreditOrderAsPaid`: ensures tenant access, credit status, not already paid/refunded; sets `paymentStatus=COMPLETED`, `paidAt`.
- `markCreditOrderAsReturned`: ensures credit order, not already returned; increments inventory for each item via `InventoryService.incrementForReturn`, sets `paymentStatus=REFUNDED`, `returnedAt`.

### Tenant guardrails

- `verifyTenantAccess(order, tenantId)` fetches order location to ensure tenant ownership.
- `verifyLocationAccess(locationId, tenantId)` ensures location exists and belongs to tenant.

## Persistence (OrdersRepository)

- Backed by Firestore (`orders` collection) via `FirestoreService`.
- `findByUuid`, `findById`, `list`, `findHeldOrders`, `create`, `update`.
- `list` builds Firestore queries with filtering (tenant, status, location, device, held, credit, customer, payment status) and date ranges (ordered by `createdAt desc`).
- Includes fallback logic when composite indexes are missing (logs warnings, runs broader query, filters in memory, limits to avoid large scans).
- `create` serializes items, sets server timestamps, omits undefined optional fields, enforces idempotency by `uuid` (service-level check).
- `update` merges fields, handles timestamp conversions, ensures `uuid` immutability, and deletes Firestore fields when clearing `paidAt/returnedAt`.

## Dependencies

- `InventoryService`: stock checks (`getStockByProduct`, `getInventoryRecord`, `decrementForSale`, `decrementForCreditSale`, `incrementForReturn`).
- `ProductsService`: server-side price checks.
- `CustomersService`: loyalty points accrual.
- `LocationsRepository`: tenant/location lookups and ownership checks.
- `UsersRepository`: user location resolution.
- `AccountingService`: sale journal posting.

## Operational notes

- **Idempotency**: repeated `POST /orders` with same UUID returns existing order.
- **Held orders**: inventory only decremented when completing held order.
- **Credit orders**: require `customerId`, track `paymentStatus`, and have dedicated mark-paid/mark-returned endpoints.
- **Firestore indexes**: complex filters may need composite indexes; repository logs and falls back to simpler queries with in-memory filtering.
- **Loyalty**: default points rate is 1 point per 100 cents, configurable in future.
