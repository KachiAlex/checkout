# Offline Desktop Architecture Overview

## Goals
1. Bundle the existing NestJS backend, Prisma ORM, and React frontend inside a single Windows installer.
2. Operate fully offline using an embedded SQLite database, while syncing licenses/data whenever connectivity returns.
3. Enforce per-device licensing with 14-day offline grace, hardware binding, and encrypted local cache.
4. Provide auto-update capability plus a manual "Check for updates" option.

## High-Level Components

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Desktop Shell | Electron (apps/desktop) | Boots backend service, serves frontend via `app://`, bridges native features, handles auto-update.
| Backend Runtime | NestJS (apps/backend) packaged with Node runtime | Exposes REST API, auth/business logic, license validation via central API when online.
| Database | Prisma + SQLite (desktop) / Postgres (cloud) | Local `.db` file stored under `%ProgramData%/CheckoutApp/data/` for offline persistence.
| Frontend | Vite/React bundle reused from web | Renders UI inside Electron’s BrowserWindow; detects desktop mode for license onboarding and offline indicators.
| License Layer | Licensing module (backend) + Electron `LicenseManager` | Validates license keys, enforces hardware binding, encrypts cached payloads, tracks grace periods.

## Process Flow

```
[Electron Main Process]
   ├─ Launch bundled NestJS server (desktop mode)
   ├─ Ensure SQLite DB initialized (Prisma migrations + seed)
   ├─ Register IPC handlers for licensing, updates, native devices
   └─ Load frontend via custom app:// protocol

[Renderer / Frontend]
   ├─ Detect desktop environment (e.g., `window.desktopBridge`)
   ├─ Show license activation screen until `licenseManager` marks valid
   ├─ Call backend APIs via `http://localhost:<DESKTOP_BACKEND_PORT>/api/v1`
   └─ Display offline/online and grace period indicators

[Backend (Desktop Mode)]
   ├─ Uses SQLite datasource and desktop-friendly configs
   ├─ Skips cloud-only integrations (Render-specific webhooks, etc.)
   ├─ Offers `/licensing/validate` endpoint and device registration
   └─ Emits events/logs consumed by Electron for user feedback
```

## Environment Management
- `.env.desktop` (template now in repo) captures desktop-specific values: ports, SQLite `DATABASE_URL`, license secrets, auto-update feed.
- `DESKTOP_MODE=true` tells the backend + frontend to adapt behavior (different env file loading, skip cloud modules, enable device-first UX).
- Electron installer copies `.env.desktop` to the installation directory and sets `%APPDATA%/CheckoutApp/.env` if needed.

## Data & Storage
- SQLite DB file default path: `%ProgramData%/CheckoutApp/data/checkout-desktop.db` (create + migrate on first launch).
- License cache path: `%APPDATA%/CheckoutApp/license/license.enc` (AES-256-GCM encrypted, hardware-bound).
- Logs: `%APPDATA%/CheckoutApp/app.log` for Electron main + backend logs redirected.

## Deployment & Updates
- Build pipeline runs `npm run build:desktop` to compile frontend, backend, and Electron package.
  - `apps/backend` is compiled first so its `dist` output (with Prisma client + migrations) can be copied into the Electron app.
  - `npm run desktop:init-db` executes just before packaging, seeding the SQLite file that ships in `resources/app.asar.unpacked/data/`.
- Electron Builder (NSIS) produces installer with bundled resources under `resources/app.asar` plus unpacked assets (frontend dist, Prisma client, migrations, seeded `.db`).
- Auto updates via `electron-updater` hitting `AUTO_UPDATE_FEED_URL`; manual update UI hooks into existing IPC handlers (`app:check-for-updates`, etc.).

## Future Enhancements
- Add "desktop sync" service to push logs/backups to cloud when online.
- Support multi-tenant licensing (per store/location) by generating scoped SQLite DBs per tenant.
- Extend architecture doc with diagrams once initial prototype validated.
