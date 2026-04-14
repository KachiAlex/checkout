# Offline Desktop Build & License TODO

## Phase 1 – Desktop Packaging Foundations
- [x] Document app architecture (Electron + Nest + SQLite) in `docs/OFFLINE_DESKTOP_ARCHITECTURE.md`
- [x] Add desktop-specific environment template (e.g., `.env.desktop`) with SQLite DB path, license secrets, and service ports
- [x] Ensure backend boots in a "desktop" mode that skips cloud-only integrations and points to local DB/files
- [x] Add npm script that launches the backend alongside the Electron shell for local desktop dev

## Phase 2 – Database Layer (SQLite)
- [x] Enable Prisma schema to support both PostgreSQL (cloud) and SQLite (desktop) providers
- [x] Introduce conditional `DATABASE_URL` resolver that points to a local `.db` file for desktop bundles
- [x] Create migration workflow to initialize the SQLite database during install/first run (`npm run prisma:init-desktop`)
- [x] Seed essential desktop data (admin user, sample tenant) whenever the DB is empty
- [x] Integrate desktop DB init into root + Electron packaging flows (`npm run desktop:init-db` + `apps/desktop` prepackage)
- [x] Document bundling of backend + SQLite template within installer artifacts (see `docs/OFFLINE_DESKTOP_ARCHITECTURE.md` + `docs/DESKTOP_DB_INIT.md` + `apps/desktop/README-INSTALLER.md`)

## Phase 3 – License Enforcement
- [ ] Wire Electron renderer ↔ main IPC to block UI until the license is validated (reuse `LicenseManager`)
  - Expose `license:status`, `license:activate`, and `license:sync` IPC handlers that wrap `DesktopLicensingService`.
  - Main process should broadcast status changes so the renderer can react without polling.
- [ ] Add a desktop-only onboarding screen in the frontend to collect the license key and call the IPC action
  - Gate all routes behind the onboarding modal until `license.status === "VALID"`.
  - Capture device nickname + tenant slug to send alongside the activation payload.
- [ ] Implement/confirm backend endpoint for license issuance & validation that the desktop app can hit when online
  - Ensure NestJS controller accepts `desktopKey`, `deviceFingerprint`, `tenantSlug` and returns expiry/grace metadata.
  - Add e2e test that simulates license activation from the desktop client.
- [ ] Cache encrypted license payloads on disk with 14-day offline grace tracking and tamper detection
  - Reuse `LicenseManager` helpers to encrypt payload under hardware-derived key.
  - Track last-successful-sync timestamp + monotonic clock guard to detect system clock tampering.
- [ ] Add manual "Sync License" action + status indicator (online/offline/grace days left) in the desktop UI
  - Present status chip in the header (Valid, Offline, Grace N days).
  - Trigger `license:sync` IPC + toast results; disable when already syncing.

## Phase 4 – Installer & Updates
- [ ] Extend `apps/desktop` build scripts to bundle backend output, Prisma client, and SQLite DB template
- [ ] Configure `electron-builder` (NSIS) for a single bundled installer plus auto-update channel
- [ ] Surface manual update controls in the UI (hook existing `autoUpdater` IPC to renderer buttons)
- [ ] Create a smoke-test checklist for the installer (install → activate license → go offline → relaunch)

## Phase 5 – QA & Release
- [ ] Automated test plan for offline grace period, hardware binding, and time-tamper detection
- [ ] CI job that builds the desktop installer artifact on tagged releases
- [ ] Field deployment documentation (install steps, license activation, troubleshooting)
- [ ] Handoff checklist before shipping to the first pilot client
