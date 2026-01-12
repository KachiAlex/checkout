# Backend – Tenants Module

## Location

- `apps/backend/src/tenants/tenants.module.ts`

## Purpose

The Tenants module provides platform-admin management of tenants (companies) and the associated initial tenant admin user.

It also centralizes tenant persistence and abstracts whether tenants are stored in:

- **Postgres (Prisma)** when `DB_PROVIDER=postgres`, or
- **Firestore** when `DB_PROVIDER` is not `postgres`.

## Key files

- `tenants.module.ts`
  - Registers `TenantsRepository`, `TenantsService`, `IndustryFeaturesService`.
  - Imports `UsersModule`.

- `tenants.controller.ts`
  - Platform admin endpoints under `/api/v1/platform/tenants/*`.

- `tenants.service.ts`
  - Business logic for creating/updating tenants and operational admin actions.

- `tenants.repository.ts`
  - Persistence layer. Switches between Prisma and Firestore based on `DB_PROVIDER`.

- `industry-features.service.ts`
  - Merges industry defaults with tenant overrides.

## Security model

- All endpoints in `TenantsController` are protected by `JwtAuthGuard`.
- Every endpoint additionally requires `req.user.isPlatformAdmin === true`.

## Public API (Controller)

Controller base route: `@Controller('platform/tenants')`

### `POST /platform/tenants`

- **Handler**: `TenantsController.create(req, dto: CreateTenantDto)`
- **Auth**: platform admin only
- **Purpose**: create a new tenant + create an initial tenant admin user.
- **Output**: `{ tenant, admin }` where `admin.temporaryPin` is generated.

### `GET /platform/tenants`

- **Handler**: `TenantsController.findAll(req)`
- **Auth**: platform admin only
- **Purpose**: list tenants.

### `GET /platform/tenants/:id`

- **Handler**: `TenantsController.findById(req, id)`
- **Auth**: platform admin only
- **Purpose**: fetch tenant by id.

### `PATCH /platform/tenants/:id`

- **Handler**: `TenantsController.update(req, id, dto: UpdateTenantDto)`
- **Auth**: platform admin only
- **Purpose**: update tenant fields (name/slug/plan/status/etc).

### `POST /platform/tenants/:id/subscription`

- **Handler**: `TenantsController.updateSubscription(req, id, dto: UpdateSubscriptionDto)`
- **Auth**: platform admin only
- **Purpose**: adjust subscription fields (plan, billing window, seat limit).

### `POST /platform/tenants/:id/reset-admin-pin`

- **Handler**: `TenantsController.resetAdminPin(req, id, dto: ResetTenantAdminPinDto)`
- **Auth**: platform admin only
- **Purpose**: regenerate an admin PIN for a tenant admin.
- **Output**: `{ tenantId, adminUserId, adminEmail?, temporaryPin }`

### `POST /platform/tenants/:id/suspend`

- **Handler**: `TenantsController.suspend(req, id, dto: SuspendTenantDto)`
- **Auth**: platform admin only
- **Purpose**: suspend a tenant and record reason in metadata.

### `POST /platform/tenants/:id/activate`

- **Handler**: `TenantsController.activate(req, id)`
- **Auth**: platform admin only
- **Purpose**: reactivate a previously suspended tenant.

### `DELETE /platform/tenants/:id`

- **Handler**: `TenantsController.delete(req, id)`
- **Auth**: platform admin only
- **Purpose**: delete tenant and delete associated users.

## Core logic (Service)

### `create(dto: CreateTenantDto)`

- **Normalizes** `dto.slug` to lowercase.
- **Checks** uniqueness via `TenantsRepository.findBySlug`.
- **Calculates** billing window (`billingCycleStart`, `billingCycleEnd`).
- **Builds** effective feature flags by:
  - choosing industry default (`Industry.GENERAL` fallback)
  - merging defaults with optional tenant overrides
- **Sets** tenant status:
  - `FREE` → `ACTIVE`
  - paid plans → `PENDING`
- **Creates** tenant via `TenantsRepository.create(...)`.
- **Creates** initial tenant admin user via `UsersRepository.save(...)`:
  - generates `temporaryPin` and hashes it into `pinHash`

### `findAll()`, `findById(id)`, `findBySlug(slug)`

- Fetch methods that translate “missing” into `NotFoundException` at the service layer.

### `update(id, dto: UpdateTenantDto)`

- Validates slug uniqueness if slug changes.
- Converts date strings to `Date` where relevant.
- Delegates persistence to `TenantsRepository.update(id, payload)`.

### `updateSubscription(id, dto: UpdateSubscriptionDto)`

- Adjusts plan/seat limit/billing dates.
- Special case: `LIFETIME` plan clears `billingCycleEnd`.

### `resetAdminPin(id, dto)`

- Picks an admin user by:
  - preferred: `dto.adminEmail` (if provided)
  - fallback: first user with `UserRole.ADMIN` for that tenant
- Generates a new PIN, hashes it, and updates user `pinHash`.

### `suspend(id, dto)` / `activate(id)`

- Writes tenant status changes and updates metadata keys:
  - `suspensionReason`, `suspendedAt`.

### `deleteTenant(id)`

- Deletes users by tenant id via `UsersRepository.deleteByTenantId`.
- Deletes tenant via `TenantsRepository.delete`.

### `getFeatureFlags(tenantId)`

- Loads tenant and merges feature flags using `IndustryFeaturesService`.

## Persistence (Repository)

### Storage routing (`isPostgresEnabled`)

- `DB_PROVIDER=postgres` → Prisma tenant table.
- Otherwise → Firestore collection `tenants`.

### Key methods

- `findAll()`, `findById(id)`, `findBySlug(slug)`
- `create(data)`
- `update(id, update)`
- `delete(id)`

## Dependencies

- `UsersRepository`
- `FirestoreService` and/or `PrismaService`
- `IndustryFeaturesService`

## Operational notes

- Since many tables FK to `Tenant`, keeping tenant ids consistent across identity/auth flows is critical.
- When `DB_PROVIDER` is toggled, ensure the corresponding datastore has the authoritative tenant records.
