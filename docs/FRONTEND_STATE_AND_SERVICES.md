# Frontend State (Zustand) and Services (API)

This document explains how frontend state and API calls are organized.

## Stores (`apps/frontend/src/stores`)

### `authStore.ts`

- **Purpose**: authentication lifecycle
- **Key state**:
  - `accessToken`, `refreshToken`
  - `user`, `tenant`, `tenantSlug`
  - `isAuthenticated`
- **Key functions**:
  - `login(tenantSlug, pin, deviceId?)`
  - `loginSuperAdmin(email, password)`
  - `refresh()`
  - `logout()`
- **Cross-cutting behavior**:
  - Axios request interceptor attaches JWT
  - Axios response interceptor triggers refresh/logout on 401 patterns

### `cartStore.ts`

- **Purpose**: local cart state for checkout.

### `scannerDeviceStore.ts`

- **Purpose**: scanner device state and integration.

### `debugLogStore.ts`

- **Purpose**: debug logs for native/mobile diagnostics.

### `themeStore.ts`

- **Purpose**: theme toggling/persistence.

## Services (`apps/frontend/src/services`)

Services are thin wrappers around API endpoints. They typically:

- Use `API_URL` from `config.ts`.
- Use Axios.

### Accounting

- `accountingService.ts`
- `adminTaxRulesService.ts`
- `taxRulesService.ts`

### Audit / Support

- `auditLogsService.ts`
- `supportService.ts`

### Devices / Receipt / Sync

- `scannerDeviceService.ts`, `scannerService.ts`
- `printerDeviceService.ts`
- `receiptService.ts`
- `syncService.ts`

### Platform / Billing

- `platformTenantService.ts`
- `subscriptionPricingService.ts`
- `paymentService.ts`
- `paymentSettingsService.ts`

### Users

- `userService.ts`
- `userManagementService.ts`

## Patterns & conventions

- **Auth**: tokens are managed centrally in `authStore`.
- **API errors**: pages generally catch and show toast notifications.
