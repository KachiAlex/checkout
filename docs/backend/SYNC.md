# Backend – Sync Module

## Location

- `apps/backend/src/sync/sync.module.ts`

## Purpose

Provides a lightweight **offline synchronization bridge** for devices. It accepts event batches generated while offline (e.g., order creation on mobile/PWA) and lets devices pull recent server-side activity to reconcile local state.

Capabilities:

- Idempotent event ingestion (currently focused on `order.created` events).
- Pull-based change feed so devices can request updates since a timestamp.

## Key files

- `sync.module.ts` – Imports `OrdersModule`, registers controller/service, re-exports `SyncService` for other flows needing sync helpers.@apps/backend/src/sync/sync.module.ts#1-13
- `sync.controller.ts` – Authenticated REST endpoints for pushing and pulling changes.@apps/backend/src/sync/sync.controller.ts#1-28
- `sync.service.ts` – Implements event ingestion, idempotency checks, and change feed generation via `OrdersRepository`.@apps/backend/src/sync/sync.service.ts#1-73
- DTOs: `dto/push-changes.dto.ts` (defines `PushChangesDto`, `SyncEventDto`).@apps/backend/src/sync/dto/push-changes.dto.ts#1-34

## Security model

- Controller guarded by `JwtAuthGuard` and `@ApiBearerAuth('JWT-auth')`, so only authenticated tenant users/devices can sync.@apps/backend/src/sync/sync.controller.ts#7-28
- Device IDs are supplied by clients within DTOs; server trusts tenant context from JWT to gate data visibility (orders query uses tenant/device filters).
- Service enforces idempotency by checking event IDs (order UUIDs) before processing to prevent duplicate inserts.@apps/backend/src/sync/sync.service.ts#13-43

## Public API (SyncController)

1. `POST /sync/push-changes`
   - Body: `PushChangesDto` with `deviceId` and `events[]`.
   - Each event includes `id`, `type`, `payload`, and `client_ts`.
   - Returns `{ processed, failed }` summary; unknown event types are logged but counted as processed to avoid stalling clients.@apps/backend/src/sync/sync.controller.ts#14-19 @apps/backend/src/sync/sync.service.ts#13-43

2. `GET /sync/pull-changes?device_id=&since=`
   - Returns array of `SyncEventDto`. If `since` omitted, defaults to last 7 days.
   - Currently emits `order.created` events retrieved via `OrdersRepository.list` filtered by device and date.@apps/backend/src/sync/sync.controller.ts#21-25 @apps/backend/src/sync/sync.service.ts#45-61

## Core logic (SyncService)

### pushChanges(dto)

1. Iterate incoming events, using `OrdersRepository.findByUuid` (via `findByUuid` in repo) to detect duplicates by event ID / order UUID.@apps/backend/src/sync/sync.service.ts#13-31
2. If unseen and type is `order.created`, call `processOrderEvent` (placeholder for future integration with `OrdersService.create`). Unknown types log warnings but don’t halt processing.
3. Track processed/failed counters to return summary to client (useful for retry logic).@apps/backend/src/sync/sync.service.ts#17-43

### pullChanges(deviceId, since?)

1. Converts `since` query to a Date (defaults to 7 days back).
2. Calls `ordersRepository.list` filtered by `deviceId` and `from` date to fetch relevant orders.
3. Maps each order to a `SyncEventDto` (`type='order.created'`, payload = order snapshot, timestamps derived from `createdAt`).@apps/backend/src/sync/sync.service.ts#45-61

### processOrderEvent

- Placeholder stub to future-proof event processing; currently just logs for `order.created` while actual order creation is handled elsewhere (OrdersService).@apps/backend/src/sync/sync.service.ts#63-71

## Persistence

- Relies entirely on `OrdersRepository`:
  - `findByUuid` for idempotency.
  - `list({ deviceId, from })` to serve change feed.
  - Underlying storage is Firestore `orders` collection with `uuid`, `deviceId`, `createdAt`, etc., enabling efficient device/date queries.@apps/backend/src/orders/orders.repository.ts#1-100
- No dedicated sync collection yet; design keeps sync lightweight and piggybacks on existing order data.

## DTOs

- `SyncEventDto`: client event descriptor with `id`, `type`, `payload`, `client_ts`.@apps/backend/src/sync/dto/push-changes.dto.ts#5-21
- `PushChangesDto`: contains `deviceId` and `events` array, ensures nested validation with `class-transformer` metadata.@apps/backend/src/sync/dto/push-changes.dto.ts#23-33

## Dependencies

- `OrdersService` (future use for processing events that need business logic).
- `OrdersRepository` (idempotency check + listing).@apps/backend/src/sync/sync.service.ts#13-61
- `JwtAuthGuard` for authentication.
- Potential downstream: Inventory/Payments once sync expands to include those event types.

## Operational notes

- **Idempotency**: Clients must send stable UUIDs per event so the server can avoid duplicates.
- **Event coverage**: Only `order.created` recognized today; additional event types will need explicit handling in `processOrderEvent`.
- **Retention**: Pull defaults to 7-day history; devices offline longer should pass explicit `since` timestamp.
- **Indexes**: Ensure Firestore has composite indexes for `orders` queries filtered by `deviceId` + `createdAt` if large datasets cause query warnings.
- **Error handling**: `pushChanges` continues processing after errors (increments `failed`) so clients can retry only failed events instead of the entire batch.
