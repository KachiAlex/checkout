# Backend – Audit Module

## Location

- `apps/backend/src/audit/audit.module.ts`

## Purpose

The Audit module provides **tenant-scoped compliance audit logging** for API requests and exposes endpoints for admins/managers to:

- List audit log entries
- Retrieve a single audit log
- Purge older audit logs by retention window

It is registered as a **global module** and installs a global interceptor to record mutating requests.

## Key files

- `audit.module.ts`
  - Marks the module `@Global()`.
  - Registers `AuditLogService`.
  - Registers `AuditLogInterceptor` as a global `APP_INTERCEPTOR`.
  - Exports `AuditLogService`.

- `audit-log.interceptor.ts`
  - Global request interceptor that records audit logs for mutating requests.

- `audit-log.service.ts`
  - Prisma-backed storage and query APIs for audit log rows.

- `audit-logs.controller.ts`
  - REST endpoints for listing/getting/purging logs (admin/manager access).

- `dto/list-audit-logs.dto.ts`
  - Query DTO for list filters.

- `dto/purge-audit-logs.dto.ts`
  - Query DTO for retention window.

## Data model

Audit writes are stored in the Prisma model `ComplianceAuditLog` (table backing `prisma.complianceAuditLog`).

Each row includes:

- `tenantId`
- `actorId` (user id)
- `action` (e.g. `POST /orders`)
- `entity` (guessed from URL path)
- `entityId` (guessed from params)
- `beforeJson`, `afterJson` (JSON snapshots)
- `deviceId`
- `metadata` (JSON)
- `createdAt`

## Public API (Controller)

Controller base route: `@Controller('audit-logs')`

Guards/roles:

- `@UseGuards(JwtAuthGuard, RolesGuard)`
- Default: `@Roles(UserRole.ADMIN, UserRole.MANAGER)`

### `GET /audit-logs`

- **Handler**: `AuditLogsController.list(req, query: ListAuditLogsQueryDto)`
- **Role**: ADMIN or MANAGER
- **Query**:
  - `take` (1..200)
  - `skip` (>=0)
  - `from` / `to` (ISO date strings)
  - `entity`, `entityId`, `action`, `actorId`
- **Result**: `{ items, total, take, skip }`

### `GET /audit-logs/:id`

- **Handler**: `AuditLogsController.get(req, id)`
- **Role**: ADMIN or MANAGER
- **Result**: a single audit log row or `null`.

### `POST /audit-logs/purge`

- **Handler**: `AuditLogsController.purge(req, query: PurgeAuditLogsDto)`
- **Role**: ADMIN only (overrides controller default roles)
- **Query**:
  - `retentionDays` (1..3650, default 90)
- **Result**: `{ deletedCount, cutoff, retentionDays }`

## Core logic

### Global auditing behavior (`AuditLogInterceptor`)

- Only audits HTTP methods:
  - `POST`, `PUT`, `PATCH`, `DELETE`
- Requires `req.user.tenantId`.
- Derives:
  - `entity` from the first URL segment (e.g. `/orders/...` → `orders`)
  - `entityId` from route params (prefers `id`, otherwise any first string param)
  - `action` from `METHOD + path` (query string removed)
- Captures `afterJson` as a sanitized JSON object:
  - `{ params, query, body }`
  - redacts sensitive keys containing: password/token/secret/authorization/apikey/card/pan/cvv/pin
  - truncates depth and size
- Writes log on both:
  - successful response (`tap.next`)
  - thrown error (`tap.error`)

### Storage and querying (`AuditLogService`)

- `list(tenantId, query)`
  - Applies `take` bounds (default 50, max 200) and `skip`.
  - Supports date range `from/to`.
  - Returns both `items` and `total` count.
  - On Prisma errors: returns empty results.

- `getById(tenantId, id)`
  - Uses `findFirst({ where: { id, tenantId } })`.
  - On error: returns `null`.

- `purgeOlderThanDays(tenantId, retentionDays)`
  - Clamps `retentionDays` to `1..3650` (default 90).
  - Deletes rows with `createdAt < cutoff`.
  - On error: returns `{ deletedCount: 0, ... }`.

## Dependencies

- `PrismaService`
- Auth guards: `JwtAuthGuard`, `RolesGuard`
- Shared enum: `UserRole` from `@pos-checkout/shared`

## Operational notes

- Audit logging is best-effort: failures are logged as warnings and do not block requests.
- The interceptor currently uses `getRequest<any>()`/`getResponse<any>()` for HTTP context access.
