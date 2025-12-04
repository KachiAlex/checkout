# Quick Setup Guide - Supabase Migration

Your Supabase Project ID: **cdazlztdllykbtfnssma**

## Step 1: Install Supabase CLI (Windows)

Choose one method:

### Method A: Using Scoop (Recommended)
```powershell
# Install Scoop (if not already installed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# Install Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Method B: Using Chocolatey
```powershell
choco install supabase
```

### Method C: Manual Download
1. Download from: https://github.com/supabase/cli/releases
2. Get `supabase_windows_amd64.zip`
3. Extract and add to PATH

## Step 2: Login to Supabase

```powershell
supabase login
```

This opens your browser for authentication.

## Step 3: Link Your Project

```powershell
supabase link --project-ref cdazlztdllykbtfnssma
```

## Step 4: Get Firebase Service Account Key

1. Go to: https://console.firebase.google.com/project/checkout-77d99/settings/serviceaccounts/adminsdk
2. Click **Generate New Private Key**
3. Save the JSON file
4. Extract these values:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

## Step 5: Set Supabase Secrets

```powershell
# Set Firebase Project ID
supabase secrets set FIREBASE_PROJECT_ID=checkout-77d99

# Set Firebase Client Email (from service account JSON)
supabase secrets set FIREBASE_CLIENT_EMAIL=your-service-account@checkout-77d99.iam.gserviceaccount.com

# Set Firebase Private Key (format as single line with \n)
# Copy the entire private key from JSON, including BEGIN/END lines
supabase secrets set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"

# Set JWT Secret (same as your backend .env file)
supabase secrets set JWT_SECRET=your-jwt-secret-here
```

**Important**: For `FIREBASE_PRIVATE_KEY`:
- Wrap entire key in quotes
- Replace actual newlines with `\n`
- Include `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines

## Step 6: Deploy Functions

```powershell
supabase functions deploy api
```

## Step 7: Test Deployment

```powershell
# Test health endpoint
curl https://cdazlztdllykbtfnssma.supabase.co/functions/v1/api/health
```

Should return:
```json
{"status":"ok","service":"supabase-edge-function","timestamp":"..."}
```

## Step 8: Update Frontend (When Ready)

Once tested, update `apps/frontend/src/config.ts`:

```typescript
const DEFAULT_API_BASE = 'https://cdazlztdllykbtfnssma.supabase.co/functions/v1/api';
```

Or set environment variable:
```powershell
$env:VITE_API_URL="https://cdazlztdllykbtfnssma.supabase.co/functions/v1/api"
npm run build --workspace=apps/frontend
```

## Your Function URL

```
https://cdazlztdllykbtfnssma.supabase.co/functions/v1/api
```

## Troubleshooting

### "supabase: command not found"
- Make sure Supabase CLI is installed and in PATH
- Restart PowerShell after installation

### "Not logged in"
```powershell
supabase login
```

### "Project not linked"
```powershell
supabase link --project-ref cdazlztdllykbtfnssma
```

### "Firebase connection error"
- Verify `FIREBASE_PRIVATE_KEY` has `\n` for newlines
- Check service account has Firestore access
- Verify all secrets are set correctly

### Check secrets
```powershell
supabase secrets list
```

## Next Steps

1. ✅ Install Supabase CLI
2. ✅ Login and link project
3. ✅ Set secrets
4. ✅ Deploy functions
5. ✅ Test endpoints
6. ⏳ Update frontend config
7. ⏳ Deploy frontend
8. ⏳ Monitor usage

## Cost Monitoring

- Dashboard: https://supabase.com/dashboard/project/cdazlztdllykbtfnssma/settings/billing
- Free tier: 500K function invocations/month
- Monitor to avoid surprises

