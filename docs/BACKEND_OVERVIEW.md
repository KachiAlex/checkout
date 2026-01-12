# Backend Overview (NestJS)

This document describes how the backend is bootstrapped, how requests flow through the system, and shared backend conventions.

## Entry points

- **Primary entry point**: `apps/backend/src/main.ts`
  - Creates Nest app from `AppModule`.
  - Registers global exception filter (`AllExceptionsFilter`).
  - Calls `configureApp(...)` for CORS, middleware, global pipes, and Swagger.
  - Starts server on `process.env.PORT` (Render) or configured default.

- **Bootstrap config**: `apps/backend/src/app.bootstrap.ts`
  - Sets global prefix (default `api/v1`).
  - Configures CORS (origins/headers/methods) and a safety-net OPTIONS handler.
  - Adds `helmet` security middleware.
  - Adds compression.
  - Sets up `ValidationPipe`.
  - Configures Swagger.

## AppModule wiring

- Root module: `apps/backend/src/app.module.ts`
- Imports feature modules (Auth, Orders, Inventory, Accounting, etc.).
- Includes both `DatabaseModule` (Prisma/Postgres) and `FirestoreModule`.

## Request lifecycle (typical)

1. **Incoming HTTP request** hits NestJS/Express.
2. **CORS** evaluated (preflight OPTIONS may be responded to before controller).
3. **Global middleware** (helmet/compression) executes.
4. **Guards** execute (e.g., `JwtAuthGuard`).
5. **ValidationPipe** transforms + validates DTOs.
6. **Controller** handles route.
7. **Service/Repository** executes business logic and persistence.
8. **Interceptors** may run (audit logging).
9. Response is returned.

## Auth conventions

- Auth endpoints live under `AuthModule`.
- JWT payload includes `tenantId` and user context.

## Data access patterns

- Prisma access via `PrismaService` (from `DatabaseModule`).
- Some repositories dynamically switch between Postgres and Firestore based on configuration.

## Common failure modes

- **CORS preflight failures**: custom headers must be added to allowed headers.
- **Foreign key errors**: tenant-scoped tables require a matching `Tenant` row.
- **DTO validation**: `forbidNonWhitelisted` will reject unexpected fields.

## Swagger

- Swagger is configured in `configureApp`.
- In local dev, typically available at `/api/docs`.
