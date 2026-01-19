# Login Authorization Header Fix

## Issue

After the security fix, users reported "missing authorization header status" error when trying to log in.

## Root Cause

The frontend axios interceptor was deleting the `Authorization` header for login endpoints, assuming that only the `apikey` header was needed. However, Supabase Edge Functions infrastructure requires the `Authorization: Bearer <anon-key>` header even for public login endpoints, not just the `apikey` header.

## Solution

Modified `apps/frontend/src/stores/authStore.ts` to ensure that for login endpoints (and any request without an app JWT token), we still send the Supabase anon key as the `Authorization` header:

### Changes Made

1. **Simplified interceptor logic** to make it more robust and easier to understand
2. **Ensured Authorization header is always sent** for Supabase requests:
   - For login endpoints: Send `Authorization: Bearer <anon-key>`
   - For OPTIONS requests: Send `Authorization: Bearer <anon-key>`
   - For authenticated requests: Send `Authorization: Bearer <app-jwt-token>`
3. **Enhanced error logging** to clearly identify when `VITE_SUPABASE_ANON_KEY` is not set:
   - Critical error messages in console when anon key is missing
   - Detailed logging for login requests showing which headers are present
   - Production-safe logging that still alerts on critical issues
4. **Added debug logging** in development mode for login requests with header details

### Key Changes in `authStore.ts`:

```typescript
// Before: Complex logic that could clear Authorization header in some cases
// After: Clear, simple logic that always sends the correct Authorization header

if (isSupabaseRequest && supabaseAnonKey) {
  if (accessToken && !isAuthEndpoint && !isOptionsRequest) {
    // Authenticated request: use app JWT token
    (config.headers as any).Authorization = `Bearer ${accessToken}`;
  } else {
    // Login endpoint, OPTIONS, or no app token: use anon key
    (config.headers as any).Authorization = `Bearer ${supabaseAnonKey}`;
  }
}
```

## Deployment

- ✅ Frontend built successfully
- ✅ Frontend deployed to Firebase Hosting
- ✅ Changes are live at: https://checkout-77d99.web.app

## Testing

Please test login functionality:

1. Navigate to the login page
2. Enter tenant slug and PIN
3. Verify that login succeeds without "missing authorization header" error

## Notes

- The `apikey` header is still sent for all Supabase requests (as before)
- The `Authorization` header now contains the anon key for login endpoints (new behavior)
- App JWT tokens are only sent for authenticated requests (not login endpoints)
- This fix maintains security while ensuring Supabase infrastructure requirements are met

## Environment Variable Required

Ensure `VITE_SUPABASE_ANON_KEY` is set in your environment or `.env` file. The interceptor will log a critical error if it's missing.

### How to Fix "Missing Authorization Header" Error

If you're seeing "missing authorization header" errors:

1. **Check if `VITE_SUPABASE_ANON_KEY` is set:**
   - Open browser console and look for `[Auth] CRITICAL: VITE_SUPABASE_ANON_KEY is not set!`
   - If you see this error, the environment variable is missing

2. **Set the environment variable:**
   - Create or update `apps/frontend/.env` file:
     ```
     VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
     ```
   - Get your Supabase anon key from: Supabase Dashboard → Project Settings → API → `anon` `public` key

3. **Rebuild and redeploy:**

   ```bash
   cd apps/frontend
   npm run build
   # Then deploy to Firebase Hosting
   ```

4. **Verify the fix:**
   - Check browser console for login requests
   - You should see `[Auth Interceptor] Login request:` logs showing `hasApikey: true` and `hasAuthorization: true`
   - Login should now work without "missing authorization header" errors
