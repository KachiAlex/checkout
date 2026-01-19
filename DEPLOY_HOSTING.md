# Deploy Hosting with Supabase

## ✅ Already Done

- Frontend config updated to use Supabase URL
- Axios interceptor updated to include API key

## Step 1: Get Your Supabase Anon Key

1. Go to: https://supabase.com/dashboard/project/cdazlztdllykbtfnssma/settings/api
2. Copy the **anon public** key (starts with `eyJ...`)

## Step 2: Build and Deploy

You have two options:

### Option A: Set Environment Variable During Build (Recommended)

```powershell
# Set the anon key
$env:VITE_SUPABASE_ANON_KEY="your-anon-key-here"

# Build and deploy
npm run build --workspace=apps/frontend
npm run deploy:web
```

### Option B: Create .env.production File

Create `apps/frontend/.env.production`:

```env
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Then build and deploy:

```powershell
npm run build --workspace=apps/frontend
npm run deploy:web
```

## Step 3: Verify Deployment

After deployment:

1. Visit your site: https://checkout-77d99.web.app
2. Test login
3. Test product listing
4. Test order creation

## What Changed

- **Frontend config**: Now points to Supabase instead of Firebase Functions
- **API URL**: `https://cdazlztdllykbtfnssma.supabase.co/functions/v1/api`
- **Axios**: Automatically adds `apikey` header when using Supabase

## Rollback Plan

If something goes wrong, rollback:

1. Update `apps/frontend/src/config.ts`:

   ```typescript
   const DEFAULT_API_BASE =
     "https://us-central1-checkout-77d99.cloudfunctions.net";
   ```

2. Remove `VITE_SUPABASE_ANON_KEY` from environment

3. Redeploy:
   ```powershell
   npm run build --workspace=apps/frontend
   npm run deploy:web
   ```

## Cost Impact

- **Before**: $33.60/month (Firebase Functions)
- **After**: $0/month (Supabase free tier)
- **Savings**: $33.60/month
