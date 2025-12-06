# Login Authorization Header Fix

## Issue
After the security fix that removed JWT_SECRET default fallback, users reported "missing authorization header" error when trying to log in.

## Root Cause
The axios interceptor was clearing the Authorization header for login endpoints, but Supabase infrastructure may require the `apikey` header to be present. Additionally, if JWT_SECRET is not set in Supabase secrets, the login would fail with a generic error.

## Fix Applied

### 1. Improved Error Handling in Supabase Functions
- Changed JWT_SECRET check to return proper error response instead of throwing
- Better error messages when JWT_SECRET is missing
- Added check for JWT_REFRESH_SECRET

**File**: `supabase/functions/api/auth.ts`

### 2. Fixed Axios Interceptor
- Improved handling of login endpoints
- Ensured `apikey` header is always sent for Supabase requests
- Better logic for when to clear Authorization header

**File**: `apps/frontend/src/stores/authStore.ts`

## Verification Steps

1. **Check Supabase Secrets**:
   - Ensure `JWT_SECRET` is set in Supabase project secrets
   - Ensure `JWT_REFRESH_SECRET` is set (optional, falls back to JWT_SECRET)
   - Ensure `VITE_SUPABASE_ANON_KEY` is set in frontend `.env`

2. **Test Login**:
   - Try logging in with valid credentials
   - Check browser console for any errors
   - Verify token is received and stored

3. **Check Network Tab**:
   - Verify `apikey` header is sent with login request
   - Verify response contains `accessToken` and `refreshToken`

## If Login Still Fails

1. **Check Supabase Secrets**:
   ```bash
   # In Supabase Dashboard > Project Settings > Edge Functions > Secrets
   # Ensure these are set:
   - JWT_SECRET
   - JWT_REFRESH_SECRET (optional)
   - FIREBASE_PROJECT_ID
   - FIREBASE_CLIENT_EMAIL
   - FIREBASE_PRIVATE_KEY
   ```

2. **Check Frontend Environment**:
   ```bash
   # In apps/frontend/.env
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Check Browser Console**:
   - Look for specific error messages
   - Check network requests to see what headers are being sent
   - Verify the response from the login endpoint

## Deployment Status
- ✅ Frontend fix deployed
- ⏳ Supabase function fix needs deployment (Docker issue encountered)

## Next Steps
1. Deploy Supabase function fix when Docker issue is resolved
2. Verify login works after deployment
3. Monitor for any other authentication issues

