# Backend – Devices Module

## Location

- `apps/backend/src/devices/devices.module.ts`

## Purpose

Manages **physical scanners/terminals** that interact with the POS app. Provides APIs to:

- Register or update device metadata (identifier, hardware info, location)
- List devices per tenant/location
- Patch device details (activation, metadata, last used user)
- Record heartbeat pings to track use/availability

These records feed audit trails, device provisioning flows, and location-based access.

## Key files

- `devices.module.ts` – Registers controller/service/repository and exports them for other modules referencing device data.@apps/backend/src/devices/devices.module.ts#1-11
- `devices.controller.ts` – Authenticated REST endpoints (`/devices`) for register/list/update/heartbeat.@apps/backend/src/devices/devices.controller.ts#1-50
- `devices.service.ts` – Tenant-aware business logic for registration, updates, and heartbeat handling.@apps/backend/src/devices/devices.service.ts#1-111
- `devices.repository.ts` – Firestore DAO with normalized identifiers and timestamp conversions.@apps/backend/src/devices/devices.repository.ts#1-239
- DTOs: `register-device.dto.ts`, `update-device.dto.ts`, `device-heartbeat.dto.ts`.

## Security model

- `DevicesController` guarded by `JwtAuthGuard` with `@ApiBearerAuth('JWT-auth')`; only authenticated tenant users can access endpoints.@apps/backend/src/devices/devices.controller.ts#17-50
- Each handler pulls `tenantId` (and optionally `user.id`) from `req.user`. Service+repository enforce tenant isolation by checking `device.tenantId`.@apps/backend/src/devices/devices.service.ts#11-75
- Device identifiers are normalized (lowercased/trimmed) to avoid duplicates or spoofing.

## Public API (DevicesController)

Base route: `@Controller('devices')`.

1. `POST /devices/register`
   - Body: `RegisterDeviceDto`
   - Creates a new device (if identifier unused) or updates the existing record with latest metadata, location, activation state, and actor info.@apps/backend/src/devices/devices.controller.ts#26-31 @apps/backend/src/devices/devices.service.ts#17-62

2. `GET /devices?location_id=`
   - Lists all devices in tenant, optionally filtering by location. Results sorted by `updatedAt` (server-side, or in-memory fallback when per-field Firestore index missing).@apps/backend/src/devices/devices.controller.ts#33-37 @apps/backend/src/devices/devices.repository.ts#62-90

3. `PATCH /devices/:id`
   - Body: `UpdateDeviceDto`
   - Updates mutable fields (name/type/location metadata, active flag, last used by) after verifying tenant ownership.@apps/backend/src/devices/devices.controller.ts#39-43 @apps/backend/src/devices/devices.service.ts#68-90

4. `POST /devices/:id/heartbeat`
   - Body: `DeviceHeartbeatDto`
   - Records heartbeat/usage event, updating last seen/used timestamps, active flag, and user context.@apps/backend/src/devices/devices.controller.ts#45-49 @apps/backend/src/devices/devices.service.ts#91-111

## Core logic (DevicesService)

- **Registration**: Normalizes identifier, upserts device with metadata and location, and records `lastSeenAt/lastUsedAt`. Provides idempotent update so repeated register calls refresh heartbeat/ownership.@apps/backend/src/devices/devices.service.ts#17-62
- **Listing**: Delegates to repository `findAll`, optionally scoped by location ID, ensuring tenant filtering occurs at query level.@apps/backend/src/devices/devices.service.ts#64-66
- **Updating**: Loads device by ID, enforces tenant match, and merges new metadata (including `lastUsedById` and `isActive`).@apps/backend/src/devices/devices.service.ts#68-90
- **Heartbeat**: Updates last seen/used timestamps plus user context to monitor device health and usage frequency.@apps/backend/src/devices/devices.service.ts#91-111

## Persistence (DevicesRepository)

- Collection: `devices` (Firestore).@apps/backend/src/devices/devices.repository.ts#56-90
- Stores `identifierNormalized` to support case-insensitive lookups and prevent duplicates.
- `findAll` tries `orderBy('updatedAt','desc')`; if Firestore index missing, falls back to unsorted query plus in-memory sort, logging expectation for index creation.@apps/backend/src/devices/devices.repository.ts#62-89
- `findByIdentifier` filters by tenant + normalized identifier for quick idempotent register flow.@apps/backend/src/devices/devices.repository.ts#100-112
- `create/update` convert JS dates to Firestore timestamps and back for `lastSeenAt`, `lastUsedAt`, `createdAt`, `updatedAt`.@apps/backend/src/devices/devices.repository.ts#114-202

## DTOs

- `RegisterDeviceDto`: validates identifier/name/type plus optional hardware/vendor/product/location metadata and active flag.@apps/backend/src/devices/dto/register-device.dto.ts#1-55
- `UpdateDeviceDto`: `PartialType` of register DTO plus optional `lastUsedById` for audit accuracy.@apps/backend/src/devices/dto/update-device.dto.ts#1-9
- `DeviceHeartbeatDto`: accepts optional `userId` and `isActive` toggle for heartbeat pings.@apps/backend/src/devices/dto/device-heartbeat.dto.ts#1-12

## Dependencies

- `JwtAuthGuard` for authentication context injection.
- `FirestoreService` for persistence (through `DevicesRepository`).
- Indirectly tied to `Users` (via `registeredById`/`lastUsedById`) and `Locations` (locationId stored on devices), though no direct imports beyond DTO validation.

## Operational notes

- **Identifier normalization** prevents duplicates; ensure any external provisioning uses same lowercasing to avoid re-registering distinct entries.
- **FireStore indexes**: create composite indexes for `tenantId + updatedAt` and `tenantId + locationId + updatedAt` to keep list queries efficient. Watch for Firestore console warnings.
- **Heartbeats**: Frequent heartbeat calls update `lastSeenAt`/`lastUsedAt`; ensure clients throttle appropriately to avoid write costs.
- **Activation**: `isActive` toggles allow temporarily disabling devices without deleting records; register/heartbeat keep status up-to-date automatically.
