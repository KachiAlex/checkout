# Desktop SQLite Initialization Guide

Use this process whenever preparing a new offline desktop build or resetting the bundled local database.

## Prerequisites
- Node.js ≥ 20 and npm ≥ 10 (already required for repo)
- `.env.desktop` (or `.env`) with SQLite path + license secrets
- Prisma CLI (installed automatically via npm scripts)

## Command
```bash
npm run desktop:init-db
```
This wrapper executes `npm run prisma:init-desktop --workspace=apps/backend` and performs:
1. Loads `.env.desktop` first, then `.env`
2. Resolves `DESKTOP_SQLITE_PATH` / `DATABASE_URL` (default `file:../data/checkout-desktop.db`)
3. Ensures the SQLite directory exists
4. Runs `prisma migrate deploy` using `apps/backend/prisma/schema.prisma`
5. Seeds demo tenant/location/admin records for immediate login

## Seeded Defaults
| Item | Value |
| --- | --- |
| Tenant Name | Demo Retail Co. |
| Tenant Slug | `demo-retail` |
| Location | Main Store (timezone: Africa/Lagos) |
| Admin Email | `admin@demo-retail.local` |
| Admin PIN | `1234` (force change after install) |

> **Security note:** Instruct customers to change the admin PIN immediately after first login.

## When to Run
- Before packaging/installing a new desktop build (already runs automatically via `npm run build:desktop` and `apps/desktop` prepackage scripts)
- After deleting/corrupting the local DB
- Any time new Prisma migrations are added

## Build Integration
- `npm run build:desktop` (repo root) now calls `npm run desktop:init-db` before Electron packaging.
- `apps/desktop` `prepackage` + `prepackage:installer` invoke `npm run prepare:desktop-db`, which delegates to the root init command via `npm --prefix ../.. run desktop:init-db`.
- These hooks guarantee the bundled installer/portable build ships with a migrated + seeded SQLite file without extra manual steps.

## Troubleshooting
| Symptom | Fix |
| --- | --- |
| `DATABASE_URL must be set` | Ensure `.env.desktop` defines `DESKTOP_SQLITE_PATH` or `DATABASE_URL` before running.| 
| `sqlite` path permission errors | Run shell as Administrator or select a writable path (e.g., `%ProgramData%/CheckoutApp/data`). |
| `prisma migrate` fails due to schema mismatch | Pull latest migrations and rerun `npm run desktop:init-db`. |
