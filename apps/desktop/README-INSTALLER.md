# Desktop App Installer Setup

## Current Status

The desktop app has been successfully built and packaged. However, creating an NSIS installer using `electron-builder` requires administrator privileges due to code signing tool extraction issues on Windows.

## Available Builds

### Portable Build (Ready to Use)

Location: `apps/desktop/release/Checkout POS-win32-x64/`

This is a fully functional portable version that can be:

- Run directly by double-clicking `Checkout POS.exe`
- Distributed as a ZIP file
- Copied to any location on the system

### Creating an Installer

#### Option 1: Use NSIS Directly (Recommended)

1. Install NSIS from https://nsis.sourceforge.io/Download
2. Run the NSIS script:
   ```powershell
   cd apps/desktop
   makensis scripts/create-installer.nsh
   ```

#### Option 2: Use electron-builder with Admin Privileges

Run PowerShell as Administrator and execute:

```powershell
cd apps/desktop
npm run package:installer
```

#### Option 3: Manual Installer Creation

Use any installer creation tool (Inno Setup, Advanced Installer, etc.) to package the portable build.

## Bundled Backend & Database Artifacts

- The backend (NestJS) is built via `npm run build --workspace=apps/backend` as part of `npm run build:desktop`.
- Prisma client + migrations ship within the backend `dist` folder so the desktop runtime can run migrations locally.
- Before any packaging step, `npm run desktop:init-db` executes (via `prepare:desktop-db`) to create/update the SQLite file defined by `DESKTOP_SQLITE_PATH`.
- Electron packaging copies the seeded `.db` into `resources/app.asar.unpacked/data/` (matching Prisma path) so every installer contains ready-to-use data (Demo Retail tenant + admin PIN 1234).
- When the installer runs, the SQLite file is placed under `%ProgramData%/CheckoutApp/data/` (or configured path) and reused across app updates.

## Auto-Update Configuration

The app is configured for auto-updates via GitHub Releases. To enable:

1. Create a GitHub Personal Access Token with `repo` scope
2. Set it as an environment variable: `GH_TOKEN=your_token_here`
3. When publishing releases, electron-builder will automatically upload the installer and update files

The app will:

- Check for updates on startup (after 3 seconds)
- Check for updates every 4 hours
- Show update notifications to users
- Download and install updates automatically

## Features Implemented

✅ Application icon (ICO format)
✅ Auto-update system (electron-updater)
✅ NSIS installer configuration
✅ Portable build
✅ Update checking and downloading
✅ User-friendly update dialogs

## Next Steps

1. **For Production**: Obtain a code signing certificate to sign the installer
2. **For Distribution**: Upload releases to GitHub to enable auto-updates
3. **For Testing**: Use the portable build for immediate testing
