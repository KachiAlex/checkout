# Fix for esbuild Build Issues (Antivirus/Windows Defender)

## Problem

The esbuild service keeps crashing during frontend build with error:

```
[vite:esbuild] The service is no longer running
```

## Root Cause

Windows Defender or antivirus software is likely blocking/scanning esbuild processes, causing them to crash.

## Solution

### Option 1: Add Windows Defender Exclusions (Recommended)

**Run PowerShell as Administrator** and execute:

```powershell
# Add exclusions for node_modules and build caches
Add-MpPreference -ExclusionPath "D:\checkout\node_modules"
Add-MpPreference -ExclusionPath "D:\checkout\apps\frontend\node_modules"
Add-MpPreference -ExclusionPath "D:\checkout\apps\frontend\dist"
Add-MpPreference -ExclusionPath "D:\checkout\apps\frontend\.vite"
Add-MpPreference -ExclusionPath "$env:LOCALAPPDATA\npm-cache"
Add-MpPreference -ExclusionPath "$env:APPDATA\npm"
Add-MpPreference -ExclusionProcess "node.exe"
Add-MpPreference -ExclusionProcess "esbuild.exe"

# Verify exclusions were added
Get-MpPreference | Select-Object -ExpandProperty ExclusionPath
Get-MpPreference | Select-Object -ExpandProperty ExclusionProcess
```

### Option 2: Temporarily Disable Real-Time Protection

**Run PowerShell as Administrator**:

```powershell
# Disable real-time protection temporarily (for testing only!)
Set-MpPreference -DisableRealtimeMonitoring $true

# Build your project
cd D:\checkout\apps\frontend
npm run build

# Re-enable real-time protection
Set-MpPreference -DisableRealtimeMonitoring $false
```

### Option 3: Check Third-Party Antivirus

If you have third-party antivirus (Norton, McAfee, Avast, etc.):

1. Open your antivirus settings
2. Add exclusions for:
   - `D:\checkout` (entire directory)
   - `node.exe` process
   - `esbuild.exe` process

### Option 4: Clean Build

After adding exclusions, clean everything and rebuild:

```powershell
cd D:\checkout

# Kill all node processes
taskkill /F /IM node.exe /T

# Clean caches
Remove-Item -Recurse -Force apps/frontend/node_modules/.vite -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force apps/frontend/dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .turbo -ErrorAction SilentlyContinue

# Rebuild
cd apps/frontend
npm run build
```

### Option 5: Alternative Build with Babel (Slower but more reliable)

If esbuild continues to fail, we can switch to using Babel instead:

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: "automatic",
      babel: {
        configFile: false,
      },
    }),
  ],
  build: {
    minify: "terser", // Use terser instead of esbuild
  },
  esbuild: false, // Completely disable esbuild
});
```

## After Fixing

Once the build completes successfully, you can deploy:

```bash
# Deploy backend
cd D:\checkout\apps\backend
npm run deploy

# Deploy frontend
cd D:\checkout\apps\frontend
firebase deploy --only hosting
```

## Notes

- This is a common issue on Windows with aggressive antivirus settings
- The exclusions are safe as they only exclude development build tools
- You can remove exclusions after the build if concerned about security
- For production deployments, consider using CI/CD (GitHub Actions, etc.) which don't have this issue
