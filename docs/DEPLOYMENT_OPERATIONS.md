# Deployment & Operations

This document explains the day-to-day operational workflows: deployments, environment variables, and common troubleshooting.

## Frontend (Firebase Hosting)

### Config

- `firebase.json`:
  - `hosting.public`: `apps/frontend/dist`
  - `hosting.predeploy`: runs `scripts/build-frontend-with-env.ps1`

### Deploy hosting only

- Command:
  - `npx firebase deploy --only hosting --project checkout-77d99`

### Typical hosting URL

- `https://checkout-77d99.web.app`

## Backend (Render)

### Where it runs

- Default production API base:
  - `https://checkout-45tb.onrender.com`

### Start / build

- Backend entry: `apps/backend/src/main.ts`
- Build compiles to `apps/backend/dist/...`

### CORS

- Configured in `apps/backend/src/app.bootstrap.ts`.
- If browsers show preflight errors, update:
  - `allowedHeaders`
  - allowed origins

### Common production issues

- **500 + Prisma FK errors**:
  - Usually indicates missing parent rows (e.g., `Tenant`) or inconsistent tenant IDs.

## Environment variables (high level)

- Backend reads `.env` via `ConfigModule`.
- Important vars typically include:
  - `DATABASE_URL`
  - `JWT_SECRET`, `JWT_REFRESH_SECRET`
  - `DB_PROVIDER` (affects some repos that can switch between Firestore/Postgres)
  - SendGrid vars for support/demo emails

## Release checklist

- Ensure backend deploy is updated.
- Deploy hosting after frontend changes.
- Smoke-test:
  - login
  - device registration
  - checkout
  - tax rule creation
