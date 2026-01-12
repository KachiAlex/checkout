# POS Checkout MVP – Application Documentation Index

This folder contains developer-facing documentation for the POS Checkout MVP monorepo.

## 1) Quick navigation

- `ARCHITECTURE_OVERVIEW.md`
  - High-level architecture, runtime topology, and cross-cutting concerns.

- `BACKEND_OVERVIEW.md`
  - NestJS backend entrypoints, module map, request lifecycle, and shared conventions.

- `BACKEND_MODULES.md`
  - Module-by-module breakdown (controllers/services/repositories) and key responsibilities.

### Backend deep dives

- `backend/AUTH.md`
- `backend/TENANTS.md`
- `backend/PLATFORM.md`
- `backend/AUDIT.md`
- `backend/RECEIPTS.md`
- `backend/ACCOUNTING.md`
- `backend/ORDERS.md`
- `backend/PAYMENTS.md`
- `backend/PRODUCTS.md`
- `backend/INVENTORY.md`
- `backend/DEVICES.md`
- `backend/SYNC.md`
- `backend/REPORTS.md`
- `backend/EXPENSES.md`

- `FRONTEND_OVERVIEW.md`
  - React/Vite frontend structure, routing, auth bootstrapping, and conventions.

- `FRONTEND_PAGES.md`
  - Page-by-page breakdown and what each page does.

- `FRONTEND_STATE_AND_SERVICES.md`
  - Zustand stores + API service modules and how data flows.

- `DATA_MODEL_PRISMA.md`
  - Postgres/Prisma schema overview: core entities and relationships.

- `DEPLOYMENT_OPERATIONS.md`
  - Firebase Hosting deployment, Render backend deployment, env vars, and operational playbooks.

## 2) Repo map (high level)

- `apps/backend`
  - NestJS REST API (Swagger at `/api/docs` in non-prod).

- `apps/frontend`
  - React PWA (Vite), deployed to Firebase Hosting.

- `apps/desktop`
  - Desktop wrapper (Electron) – build/package scripts live here.

- `packages/shared`
  - Shared types/constants used by backend + frontend.

- `packages/payment-adapters`
  - Payment integration helpers/adapters.

- `functions/`
  - Firebase Functions (serverless) used for specific backend functionality.

## 3) How to use these docs

- Start with `ARCHITECTURE_OVERVIEW.md`.
- If you’re changing APIs, read `BACKEND_OVERVIEW.md` + the relevant section in `BACKEND_MODULES.md`.
- If you’re changing UI behavior, read `FRONTEND_OVERVIEW.md` + `FRONTEND_PAGES.md`.
- If you’re touching database constraints, read `DATA_MODEL_PRISMA.md`.
