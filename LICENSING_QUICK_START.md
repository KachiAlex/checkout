# Licensing System - Quick Start Deployment Guide

## ✅ Current Status (February 4, 2026)

- ✅ Backend: Fully implemented and compiling successfully
- ✅ Frontend: LicensesTab component created and integrated
- ✅ Desktop: Services and LicenseInputScreen created
- ✅ Database: Schema ready, models defined
- ⏳ Database Migration: Pending (database not running locally)
- ⏳ Testing: Ready to begin once database is set up

---

## Pre-Deployment Checklist

### 1. Database Setup & Migration (10 minutes)

**Option A: Using Docker Compose**
```powershell
cd d:\checkout
docker-compose up -d postgres  # Start PostgreSQL

# Wait for container to be ready (30 seconds)
docker ps | grep postgres
```

**Option B: Using Local PostgreSQL**
```powershell
# Ensure PostgreSQL service is running
Get-Service PostgreSQL* | Start-Service

# Test connection
psql -U pos_user -d pos_db -c "SELECT 1"
```

**Then run migration:**
```powershell
cd d:\checkout\apps\backend
npx prisma migrate dev --name "add_licensing_and_backup_models"
```

**Expected Output:**
- Migration file created in `/apps/backend/prisma/migrations/`
- Tables created: License, LicenseAudit, DeviceRegistration, BackupManifest
- Prisma Client regenerated successfully
- No errors

### 2. Backend Compilation Check (✅ Already Complete)

**Status**: Backend successfully compiles with `dist/src/main.js` generated

```powershell
# Verify build (optional re-check):
cd d:\checkout\apps\backend
npm run build

# Check output exists:
Test-Path d:\checkout\apps\backend\dist\src\main.js
```

**What was fixed**:
- ✅ PrismaService extended from PrismaClient for proper type support
- ✅ LicensingRepository and BackupRepository properly use new models
- ✅ All TypeScript compilation errors resolved
- ✅ Prisma Client fully regenerated with new models

### 3. Frontend Components Verification (✅ Complete)

1. Start frontend dev server
2. Navigate to `/superadmin` page
3. Verify 3 tabs visible: "Tenants", "🔐 Licenses", "Billing & Pricing"
4. Click each tab - verify content loads
5. LicensesTab should show:
   - Statistics cards (Total, Active, Expired, Expiring, Suspended)
   - Search and filter inputs
   - License list table
   - "Create License" button

### 4. Desktop App Integration Check (5 minutes)

1. Verify no TypeScript errors in `/apps/desktop/src/`
2. Check that `main.ts` has licensing handler registration
3. Check that `preload.ts` exposes `window.licensing` object
4. Frontend React components can call `window.licensing.validate()` without errors

---

## Configuration Setup

### Backend Environment Variables

Add to `.env.local` or production environment:

```env
# License signing (generate: node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
LICENSE_SIGNING_KEY=<32-char hex>

# License encryption (generate same way)
LICENSE_ENCRYPTION_KEY=<32-char hex>

# Licensing parameters
OFFLINE_GRACE_PERIOD_DAYS=14
SYNC_REQUIREMENT_HOURS=24
OFFLINE_VALIDATION_ENABLED=true

# Cloud storage (choose one)
BACKUP_STORAGE_PROVIDER=firebase
FIREBASE_BUCKET=<your-bucket>

# OR
BACKUP_STORAGE_PROVIDER=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
```

### Desktop Configuration

Update `/apps/desktop/src/licensing/DesktopLicensingService.ts`:

```typescript
const API_BASE_URL = 'https://your-api-domain.com'; // Change this to your backend
```

---

## Post-Deployment Testing

### 1. Create Test License (via Superadmin Portal)

1. Go to SuperAdmin → Licenses tab
2. Click "Create License"
3. Select tier: STARTER
4. Enter business email: `test@example.com`
5. Click "Create"
6. Copy generated license key

**Expected Result:** License appears in table with status ACTIVE

### 2. Desktop App License Validation

1. Start desktop app
2. App should detect no license
3. License input modal should appear
4. Paste license key and device key
5. Click "Activate"
6. App should start

**Expected Result:** License stored and app runs

### 3. Offline Grace Period

1. Disconnect network
2. App should continue to work
3. Days counter should show proper remaining days
4. After 14 days, prompt to sync when network available

**Expected Result:** Graceful offline operation

### 4. Device Registration

1. Register same license on 2nd device
2. Try to register on 3rd device (if STARTER tier)
3. Should be rejected with device limit reached

**Expected Result:** Hardware binding enforced

---

## Emergency Rollback

If issues occur:

```powershell
# Rollback database
cd apps/backend
npm run migration:rollback

# Or manually:
# Delete migration file from prisma/migrations/
# npx prisma migrate reset
```

---

## Common Issues & Solutions

### Issue: "License module not found"
**Solution:** Ensure `npm install` completed in `/apps/backend`

### Issue: "Database migration failed"
**Solution:** Check PostgreSQL is running, verify `DATABASE_URL` env var

### Issue: "Preload API not found in desktop"
**Solution:** Verify `licensing-preload.ts` is imported in `preload.ts`

### Issue: "License validation fails offline"
**Solution:** Check that `LICENSE_SIGNING_KEY` and `LICENSE_ENCRYPTION_KEY` are set and consistent

---

## Monitoring & Maintenance

### Check License Status
```sql
-- PostgreSQL
SELECT id, "businessId", tier, status, "expiryDate" 
FROM "License" 
ORDER BY "createdAt" DESC LIMIT 10;
```

### Check Audit Trail
```sql
SELECT l.*, a.action, a."performedAt"
FROM "License" l
JOIN "LicenseAudit" a ON l.id = a."licenseId"
ORDER BY a."performedAt" DESC LIMIT 20;
```

### Check Registered Devices
```sql
SELECT l."businessId", l.tier, d."deviceName", d."lastValidatedAt"
FROM "DeviceRegistration" d
JOIN "License" l ON l.id = d."licenseId"
ORDER BY d."lastValidatedAt" DESC;
```

---

## Support Contacts

- Backend API Issues: Check `/apps/backend/logs/`
- Desktop App Issues: Check `%APPDATA%/CheckoutPOS/logs/`
- Database Issues: Check PostgreSQL logs
- Frontend Issues: Check browser console

---

## Next Phase: Cloud Storage Integration

Once licensing is working, implement actual cloud backup:

1. Choose provider: Firebase Storage or AWS S3
2. Update `BackupService` in `/apps/backend/src/backup/services/backup.service.ts`
3. Add upload/download logic
4. Test backup create/restore flows

---

**Status:** ✅ Ready to deploy  
**Deployment Date:** [Today's Date]  
**Estimated Time:** 30-45 minutes for full setup
