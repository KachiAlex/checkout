# Deployment Setup Guide

This guide ensures all required configuration is set up correctly to prevent authentication and CORS issues.

## Prerequisites

1. **Supabase Project**: https://supabase.com/dashboard/project/lyxwslsckkbcpepxigdx
2. **Firebase Project**: checkout-77d99
3. **Firebase Service Account JSON**: Required for Firestore access

## Critical Supabase Settings

### 1. Edge Function Configuration

**Location**: Supabase Dashboard → Edge Functions → `api` function → Details

**Required Setting**:

- ✅ **"Verify JWT with legacy secret"** must be **OFF** (gray toggle)
  - This prevents Supabase from blocking OPTIONS preflight requests
  - Our code handles JWT verification internally

**Why**: If this is ON, Supabase infrastructure blocks OPTIONS requests before they reach our code, causing "Missing authorization header" errors.

### 2. Supabase Secrets

**Location**: Supabase Dashboard → Project Settings → Edge Functions → Secrets

**Required Secrets** (set via CLI):

```bash
supabase secrets set JWT_SECRET='Dabonega$reus2660'
supabase secrets set JWT_REFRESH_SECRET='Dabonega$reus-refresh-2660'
supabase secrets set FIREBASE_PROJECT_ID='checkout-77d99'
supabase secrets set FIREBASE_CLIENT_EMAIL='firebase-adminsdk-fbsvc@checkout-77d99.iam.gserviceaccount.com'
supabase secrets set FIREBASE_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----
... (full private key from Firebase service account JSON)
-----END PRIVATE KEY-----'
```

**To verify secrets are set**:

```bash
supabase secrets list
```

## Frontend Environment Variables

### Required: Supabase Anon Key

**Location**: `apps/frontend/.env` (create if it doesn't exist)

**Required Variable**:

```env
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5eHdzbHNja2tiY3BlcHhpZ2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4Nzc5MjgsImV4cCI6MjA4MDQ1MzkyOH0._pvGgNnHZcu2cbTabLxnF6rv0Omrgg_3pUHDXEkxd7A
```

**How to get it**:

1. Go to: https://supabase.com/dashboard/project/lyxwslsckkbcpepxigdx/settings/api
2. Copy the `anon` / `public` key (the full JWT token)

**Important**:

- This file is gitignored (`.env` is in `.gitignore`)
- Must be set before building the frontend
- Without this, you'll get "Missing authorization header" errors

## Build and Deploy Checklist

### Before Building Frontend:

1. ✅ Verify `apps/frontend/.env` exists with `VITE_SUPABASE_ANON_KEY`
2. ✅ Verify Supabase Edge Function "Verify JWT with legacy secret" is OFF
3. ✅ Verify all Supabase secrets are set

### Build Frontend:

```bash
cd apps/frontend
npm run build
```

### Deploy:

```bash
# Deploy frontend
firebase deploy --only hosting

# Deploy Supabase functions
supabase functions deploy api
```

## Common Issues and Solutions

### Issue: "Missing authorization header" (401)

**Causes**:

1. `VITE_SUPABASE_ANON_KEY` not set in `.env` file
2. "Verify JWT with legacy secret" is ON in Supabase dashboard
3. Frontend not rebuilt after setting environment variable

**Solution**:

1. Check `apps/frontend/.env` exists and has the anon key
2. Check Supabase dashboard: Edge Functions → `api` → "Verify JWT with legacy secret" should be OFF
3. Rebuild frontend: `cd apps/frontend && npm run build`
4. Redeploy: `firebase deploy --only hosting`

### Issue: "Invalid JWT" (401)

**Causes**:

1. JWT_SECRET mismatch between backend and Supabase
2. Old tokens in browser storage

**Solution**:

1. Verify JWT_SECRET matches in both places:
   - Backend `.env`: `JWT_SECRET=Dabonega$reus2660`
   - Supabase secrets: `supabase secrets set JWT_SECRET='Dabonega$reus2660'`
2. Clear browser storage and log in again

### Issue: "UNAUTHENTICATED: Request had invalid authentication credentials" (Firestore)

**Causes**:

1. Firebase credentials not set in Supabase secrets
2. Incorrect Firebase service account email or private key

**Solution**:

1. Get Firebase service account JSON from Firebase Console
2. Set secrets:
   ```bash
   supabase secrets set FIREBASE_PROJECT_ID='checkout-77d99'
   supabase secrets set FIREBASE_CLIENT_EMAIL='firebase-adminsdk-fbsvc@checkout-77d99.iam.gserviceaccount.com'
   supabase secrets set FIREBASE_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----
   ... (full key from JSON)
   -----END PRIVATE KEY-----'
   ```

### Issue: CORS errors

**Causes**:

1. CORS headers not set correctly
2. Origin not in allowed list

**Solution**:

- CORS is handled automatically in the code
- If issues persist, check `supabase/functions/_shared/cors.ts` and add your domain to `allowedOrigins`

## Quick Verification Commands

```bash
# Check Supabase secrets
supabase secrets list

# Check if .env file exists
ls apps/frontend/.env

# Verify anon key is in build (grep for it)
cd apps/frontend
grep -r "VITE_SUPABASE_ANON_KEY" dist/ || echo "Not found - rebuild needed"
```

## Deployment Workflow

1. **Update Supabase secrets** (if needed):

   ```bash
   supabase secrets set KEY='value'
   ```

2. **Update frontend .env** (if needed):

   ```bash
   # Edit apps/frontend/.env
   VITE_SUPABASE_ANON_KEY=your-key-here
   ```

3. **Build frontend**:

   ```bash
   cd apps/frontend
   npm run build
   ```

4. **Deploy**:

   ```bash
   # Frontend
   firebase deploy --only hosting

   # Supabase functions
   supabase functions deploy api
   ```

5. **Verify**:
   - Check Supabase dashboard: Edge Functions → `api` → "Verify JWT with legacy secret" is OFF
   - Test login on deployed site
   - Check Network tab for successful requests

## Notes

- The `.env` file is gitignored for security
- JWT secrets should match between backend and Supabase
- Firebase credentials must be from the correct service account
- Supabase anon key is safe to expose in frontend (it's public by design)
- Always verify "Verify JWT with legacy secret" is OFF after Supabase dashboard changes
