# Backend – Auth Module

## Location

- `apps/backend/src/auth/auth.module.ts`

## Purpose

The Auth module handles:

- Tenant-scoped login using **tenant slug + PIN**.
- Super-admin login using **email + password**.
- JWT issuance and JWT validation.
- Refresh token flow.
- Manager PIN verification (for price override authorization).

## Key files

- `auth.module.ts`
  - Wires dependencies: `UsersModule`, `TenantsModule`, `PassportModule`, `JwtModule`.
  - Configures JWT signing secret from `JWT_SECRET`.

- `auth.controller.ts`
  - REST endpoints under `/api/v1/auth/*`.

- `auth.service.ts`
  - Implements all auth flows.

- `strategies/jwt.strategy.ts`
  - Passport strategy used by `JwtAuthGuard`.

- `guards/jwt-auth.guard.ts`
  - Thin wrapper around `AuthGuard('jwt')`.

- `guards/roles.guard.ts`
  - Role enforcement guard (used by modules that restrict actions by role).

## Public API (Controller)

### `POST /auth/login`

- **Handler**: `AuthController.login(loginDto: LoginDto)`
- **Inputs**:
  - `tenantSlug`: string
  - `pin`: string
  - `deviceId?`: string
- **Flow**:
  1. Resolve tenant via `TenantsRepository.findBySlug(tenantSlug)`.
  2. Validate tenant status (`ACTIVE`).
  3. Validate PIN via `AuthService.validateUser(pin, tenant.id, deviceId)`.
  4. Issue JWT access + refresh tokens.
- **Outputs**: `AuthResponseDto` including tokens, user, tenant.

### `POST /auth/superadmin/login`

- **Handler**: `AuthController.superAdminLogin(dto: SuperAdminLoginDto)`
- **Inputs**: `email`, `password`
- **Flow**:
  - Looks up user by email; verifies `isPlatformAdmin`.
  - Compares password against `pinHash`.
  - Issues JWT.

### `POST /auth/verify-manager`

- **Handler**: `AuthController.verifyManager(verifyDto, req)`
- **Auth**: `JwtAuthGuard` required.
- **Purpose**: verify that a manager/admin PIN authorizes a privileged action.

### `POST /auth/refresh`

- **Handler**: `AuthController.refresh({ refreshToken })`
- **Purpose**: exchange refresh token for a new access token.

## Core logic (Service)

### `getTenantUsers(tenantId, limit?)`

- **Role**: reads all users for a tenant.
- **Optimization**: short-lived in-memory cache (`userCache`) to reduce repeated reads.

### `validateUser(pin, tenantId, deviceId?)`

- **Role**: authenticate a user by PIN.
- **Algorithm**:
  1. If `deviceId` exists, try `UsersRepository.findByDeviceId(deviceId, tenantId)` first.
  2. Otherwise fetch all tenant users (`getTenantUsers`).
  3. Sequentially `bcrypt.compare(pin, user.pinHash)` until match.
  4. If match and `deviceId` provided, update the user to store that device id.

### `login(loginDto)`

- **Role**: tenant slug + PIN login.
- **Important invariants**:
  - Tenant must exist and be `ACTIVE`.
  - Returned JWT payload includes `tenantId` and `sub` (user id).

### `loginSuperAdmin(dto)`

- **Role**: superadmin login.
- **Important invariants**:
  - User must have `isPlatformAdmin`.

### `registerDevice(dto: DeviceRegisterDto)`

- **Role**: associates a device with a tenant user (MVP behavior).
- **Note**: this logic exists in AuthService, but the device registration endpoint may be exposed elsewhere (e.g. `DevicesModule`).

### `refreshToken(refreshToken)`

- **Role**: refresh flow.
- **Validation**:
  - JWT must verify against `JWT_REFRESH_SECRET`.
  - User must exist.
  - User tenant must match payload tenant.
  - Tenant must still exist.

## JWT payload

Defined in `JwtPayload` (in `jwt.strategy.ts`):

- `sub`: user id
- `tenantId`: tenant id
- `role`: user role
- `locationId?`
- `deviceId?`
- `isPlatformAdmin?`

## Dependencies

- `UsersRepository`
- `TenantsRepository`
- `JwtService`
- `ConfigService`

## Operational notes

- PIN auth does a sequential scan across tenant users (with caching). Tenants with very large user counts may require optimization.
