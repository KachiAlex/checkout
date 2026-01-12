# Architecture Overview

This document explains how the POS Checkout MVP is structured at a high level: runtime topology, major subsystems, and cross-cutting concerns.

## Runtime topology

- **Frontend (PWA)**
  - Location: `apps/frontend`
  - Built with Vite + React.
  - Deployed to Firebase Hosting.
  - Talks to the backend over HTTPS (default: `https://checkout-45tb.onrender.com`).

- **Backend (REST API)**
  - Location: `apps/backend`
  - NestJS application.
  - Exposes REST endpoints under the global prefix (default: `/api/v1`).
  - Uses JWT auth for protected endpoints.

- **Database / Storage**
  - **Postgres via Prisma** (authoritative for many operational entities)
    - Prisma schema: `apps/backend/prisma/schema.prisma`.
    - Prisma client: provided via `DatabaseModule` / `PrismaService`.
  - **Firestore** (used by some repositories depending on configuration)
    - Firestore integration: `FirestoreModule`.

- **Optional serverless runtime**
  - Firebase Functions entry: `apps/backend/src/serverless.ts` (wraps Nest app in Express adapter).

## Key cross-cutting concerns

### Authentication & authorization

- **JWT** is used for authenticated API requests.
- Role checks are enforced via guards/decorators in the backend.
- Frontend stores tokens in `useAuthStore` and attaches them via Axios interceptors.

### Multi-tenancy

- Requests are scoped by `tenantId` (typically carried in the JWT payload).
- Many Postgres tables reference `Tenant` via a foreign key.
- Some flows also use the tenant **slug** during login/registration.

### CORS

- CORS is configured centrally in `apps/backend/src/app.bootstrap.ts`.
- Allowed origins include localhost and production hosts.
- Custom headers (e.g., `x-tenant-slug`) must be whitelisted or browser preflight will fail.

### Validation

- Backend uses Nest `ValidationPipe` with:
  - `whitelist: true`
  - `forbidNonWhitelisted: true`
  - `transform: true`

### Error handling

- Backend registers a global exception filter: `AllExceptionsFilter`.

### Observability / audit logging

- The backend includes an audit module which logs authenticated write requests.
- This is used for compliance and internal diagnostics.

## Conventions

- **API prefix**: default `/api/v1`.
- **Swagger**: enabled in non-production (and explicitly enabled in `main.ts` bootstrap).
- **Environment configuration**: `ConfigModule` reads `.env`.

## Where to look next

- Backend request lifecycle: `BACKEND_OVERVIEW.md`
- Backend module map: `BACKEND_MODULES.md`
- Frontend routing/state: `FRONTEND_OVERVIEW.md` + `FRONTEND_STATE_AND_SERVICES.md`
- Data model: `DATA_MODEL_PRISMA.md`
