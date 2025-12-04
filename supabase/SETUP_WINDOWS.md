# Supabase CLI Setup for Windows

## Installation Options

### Option 1: Using Scoop (Recommended)

1. Install Scoop if you don't have it:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
   ```

2. Install Supabase CLI:
   ```powershell
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```

### Option 2: Using Chocolatey

```powershell
choco install supabase
```

### Option 3: Download Binary

1. Go to: https://github.com/supabase/cli/releases
2. Download the Windows binary (`supabase_windows_amd64.zip`)
3. Extract and add to PATH

## Verify Installation

```powershell
supabase --version
```

## Login

```powershell
supabase login
```

This will open your browser to authenticate.

## Link Your Project

```powershell
supabase link --project-ref cdazlztdllykbtfnssma
```

## Set Secrets

You'll need your Firebase service account credentials:

```powershell
# Get these from Firebase Console > Project Settings > Service Accounts
supabase secrets set FIREBASE_PROJECT_ID=checkout-77d99
supabase secrets set FIREBASE_CLIENT_EMAIL=your-service-account@checkout-77d99.iam.gserviceaccount.com
supabase secrets set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
supabase secrets set JWT_SECRET=your-jwt-secret
```

## Deploy

```powershell
supabase functions deploy api
```

## Your Function URL

After deployment, your function will be available at:
```
https://cdazlztdllykbtfnssma.supabase.co/functions/v1/api
```

