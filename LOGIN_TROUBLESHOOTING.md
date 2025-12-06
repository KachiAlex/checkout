# Login Troubleshooting Guide

## Issue: "Missing Authorization Header" Error

If you're seeing "missing authorization header status" errors when trying to log in, follow these steps:

### Step 1: Check Browser Console

Open your browser's developer console (F12) and look for these error messages:

- `[Auth] CRITICAL: VITE_SUPABASE_ANON_KEY is not set!`
- `[Auth] Login request missing apikey header - this will fail!`
- `[Auth] Login request missing Authorization header - this will fail!`

If you see any of these, the `VITE_SUPABASE_ANON_KEY` environment variable is not set.

### Step 2: Get Your Supabase Anon Key

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (checkout-77d99)
3. Go to **Settings** → **API**
4. Find the **`anon` `public`** key (it's a long string starting with `eyJ...`)
5. Copy this key

### Step 3: Set the Environment Variable

#### Option A: For Local Development

Create or update `apps/frontend/.env`:

```env
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace `your-anon-key-here` with the actual anon key from Step 2.

#### Option B: For Production Build

If you're building for production, you need to set the environment variable before building:

**Windows PowerShell:**
```powershell
$env:VITE_SUPABASE_ANON_KEY="your-anon-key-here"
cd apps/frontend
npm run build
```

**Linux/Mac:**
```bash
export VITE_SUPABASE_ANON_KEY="your-anon-key-here"
cd apps/frontend
npm run build
```

#### Option C: For Firebase Hosting (CI/CD)

If you're using Firebase Hosting with CI/CD, set the environment variable in your build environment:

- **GitHub Actions**: Add to repository secrets
- **GitLab CI**: Add to CI/CD variables
- **Other CI/CD**: Set as build-time environment variable

### Step 4: Rebuild and Redeploy

After setting the environment variable:

```bash
cd apps/frontend
npm run build
cd ../..
npx firebase deploy --only hosting
```

### Step 5: Verify the Fix

1. Open the login page
2. Open browser console (F12)
3. Try to log in
4. Look for `[Auth Interceptor] Login request:` logs
5. You should see:
   - `hasApikey: true`
   - `hasAuthorization: true`
   - `hasAnonKey: true`

If all three are `true`, the fix is working!

## What Changed

The frontend interceptor was updated to:

1. **Always send required headers** for Supabase requests:
   - `apikey` header (required by Supabase infrastructure)
   - `Authorization: Bearer <anon-key>` header (required for login endpoints)

2. **Better error logging** to help diagnose issues:
   - Critical errors when `VITE_SUPABASE_ANON_KEY` is missing
   - Detailed logging for login requests
   - Production-safe logging that still alerts on critical issues

3. **Clearer error messages** in the console to help identify the problem

## Still Having Issues?

If you've followed all steps and still can't log in:

1. **Check Supabase Dashboard**:
   - Verify your project is active
   - Check that Edge Functions are enabled
   - Verify "Verify JWT with legacy secret" is **OFF** (Settings → Edge Functions)

2. **Check Network Tab**:
   - Open browser DevTools → Network tab
   - Try to log in
   - Look for the login request (`/api/v1/auth/login`)
   - Check the **Request Headers**:
     - Should have `apikey: <your-anon-key>`
     - Should have `Authorization: Bearer <your-anon-key>`
   - Check the **Response**:
     - If 401, check the error message
     - If 500, check Supabase function logs

3. **Check Supabase Function Logs**:
   - Go to Supabase Dashboard → Edge Functions → Logs
   - Look for errors related to authentication
   - Check for JWT_SECRET or Firebase credential errors

4. **Verify Environment Variables**:
   - Make sure `VITE_SUPABASE_ANON_KEY` is set correctly
   - Make sure there are no extra spaces or quotes
   - Make sure the key is the full anon key (starts with `eyJ...`)

## Quick Test

To quickly test if the anon key is set correctly, open browser console and run:

```javascript
console.log('Anon Key Set:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
console.log('Anon Key Prefix:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) || 'NOT SET');
```

If the first line shows `false` or the second shows `NOT SET`, the environment variable is not set correctly.

