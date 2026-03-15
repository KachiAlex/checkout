# Offline Desktop Build & License TODO

## Phase 1 – Desktop Packaging Foundations
- [ ] Document app architecture (Electron + Nest + SQLite) in `docs/OFFLINE_DESKTOP_ARCHITECTURE.md`
- [ ] Add desktop-specific environment template (e.g., `.env.desktop`) with SQLite DB path, license secrets, and service ports
- [ ] Ensure backend boots in a "desktop" mode that skips cloud-only integrations and points to local DB/files
- [ ] Add npm script that launches the backend alongside the Electron shell for local desktop dev

## Phase 2 – Database Layer (SQLite)
- [ ] Enable Prisma schema to support both PostgreSQL (cloud) and SQLite (desktop) providers
- [ ] Introduce conditional `DATABASE_URL` resolver that points to a local `.db` file for desktop bundles
- [ ] Create migration workflow to initialize the SQLite database during install/first run
- [ ] Seed essential desktop data (admin user, sample tenant) whenever the DB is empty

## Phase 3 – License Enforcement
- [ ] Wire Electron renderer ↔ main IPC to block UI until the license is validated (reuse `LicenseManager`)
- [ ] Add a desktop-only onboarding screen in the frontend to collect the license key and call the IPC action
- [ ] Implement/confirm backend endpoint for license issuance & validation that the desktop app can hit when online
- [ ] Cache encrypted license payloads on disk with 14-day offline grace tracking and tamper detection
- [ ] Add manual "Sync License" action + status indicator (online/offline/grace days left) in the desktop UI

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
