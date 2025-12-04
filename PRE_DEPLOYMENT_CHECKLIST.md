# Pre-Deployment Checklist

Before deploying hosting, let's make sure everything is ready:

## ✅ Completed
- [x] Supabase CLI installed
- [x] Project linked
- [x] Functions deployed
- [x] Frontend code updated (axios interceptor)

## ⏳ Before Deploying Hosting

### 1. Get Supabase Anon Key
- [ ] Go to: https://supabase.com/dashboard/project/cdazlztdllykbtfnssma/settings/api
- [ ] Copy the "anon public" key

### 2. Test Supabase Function
- [ ] Test health endpoint with API key
- [ ] Test login endpoint
- [ ] Verify it works before switching

### 3. Update Frontend Config
- [ ] Update `apps/frontend/src/config.ts` to use Supabase URL
- [ ] Set `VITE_SUPABASE_ANON_KEY` environment variable

### 4. Test Locally
- [ ] Build frontend: `npm run build --workspace=apps/frontend`
- [ ] Test locally to ensure everything works

### 5. Deploy Hosting
- [ ] Deploy frontend: `npm run deploy:web`

## Option A: Test First (Recommended)

Test the Supabase function before switching production traffic.

## Option B: Deploy Now

If you're confident, we can update config and deploy now.

