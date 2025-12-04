# Frontend Setup for Supabase

## Step 1: Get Your Supabase Anon Key

1. Go to: https://supabase.com/dashboard/project/cdazlztdllykbtfnssma/settings/api
2. Copy the **anon public** key (starts with `eyJ...`)

## Step 2: Update Frontend Config

Update `apps/frontend/src/config.ts`:

```typescript
const DEFAULT_API_BASE = 'https://cdazlztdllykbtfnssma.supabase.co/functions/v1/api';
```

## Step 3: Add Environment Variable

Create or update `.env` file in `apps/frontend/`:

```env
VITE_API_URL=https://cdazlztdllykbtfnssma.supabase.co/functions/v1/api
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Or set during build:

```powershell
$env:VITE_API_URL="https://cdazlztdllykbtfnssma.supabase.co/functions/v1/api"
$env:VITE_SUPABASE_ANON_KEY="your-anon-key-here"
npm run build --workspace=apps/frontend
```

## Step 4: Test Locally

```powershell
npm run dev --workspace=apps/frontend
```

Visit http://localhost:5173 and test login.

## Step 5: Deploy

```powershell
npm run build --workspace=apps/frontend
npm run deploy:web
```

## What Changed

The axios interceptor in `apps/frontend/src/stores/authStore.ts` now automatically adds the `apikey` header when:
- `VITE_API_URL` contains `supabase.co`
- `VITE_SUPABASE_ANON_KEY` is set

This means all API requests will include the required Supabase API key header automatically.

## Testing

After deployment, test:
1. Login functionality
2. Product listing
3. Order creation
4. All other API endpoints

## Rollback

If you need to rollback:

1. Update `apps/frontend/src/config.ts`:
   ```typescript
   const DEFAULT_API_BASE = 'https://us-central1-checkout-77d99.cloudfunctions.net';
   ```

2. Remove `VITE_SUPABASE_ANON_KEY` from environment

3. Redeploy:
   ```powershell
   npm run build --workspace=apps/frontend
   npm run deploy:web
   ```

