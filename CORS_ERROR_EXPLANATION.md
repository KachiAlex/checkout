# Understanding the CORS Error

## What is CORS?

**CORS (Cross-Origin Resource Sharing)** is a browser security mechanism that restricts web pages from making requests to a different domain, protocol, or port than the one serving the web page.

## Your Specific Error

```
Access to XMLHttpRequest at 'https://pos-checkout-api.onrender.com/api/v1/auth/login'
from origin 'https://checkout-77d99.web.app' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### What's Happening:

1. **Frontend Origin**: `https://checkout-77d99.web.app` (Firebase-hosted frontend)
2. **Backend API**: `https://pos-checkout-api.onrender.com` (Render-hosted backend)
3. **Request Type**: POST to `/api/v1/auth/login`

### The CORS Flow:

When your frontend makes a cross-origin request, the browser automatically:

1. **Sends a Preflight Request (OPTIONS)**: Before the actual POST request, the browser sends an OPTIONS request to check if the server allows the cross-origin request.

2. **Checks Response Headers**: The browser looks for these headers in the OPTIONS response:
   - `Access-Control-Allow-Origin`: Must include your frontend origin
   - `Access-Control-Allow-Methods`: Must include POST
   - `Access-Control-Allow-Headers`: Must include headers you're sending (Content-Type, etc.)

3. **Blocks if Missing**: If these headers are missing or incorrect, the browser blocks the actual request and shows the CORS error.

### Why It's Failing:

The error `No 'Access-Control-Allow-Origin' header is present` means:

- The OPTIONS preflight request is either:
  - **Not reaching the server** (service down, network issue)
  - **Reaching the server but not getting CORS headers back** (CORS not configured)
  - **Being blocked before reaching your app** (proxy/firewall issue)

The `net::ERR_FAILED` error suggests the request might not even be reaching the server, which could indicate:

- The Render service is down or sleeping (free tier)
- The service crashed on startup
- Network connectivity issues

## Root Causes

### 1. Service Not Running (Most Likely)

**Symptom**: `net::ERR_FAILED`

**Check**:

- Go to Render Dashboard → Your Service
- Check if status is "Live" (green)
- Check "Logs" tab for errors
- Check "Events" tab for deployment status

**Fix**:

- If service is down, check logs for startup errors
- If on free tier, service might have spun down - it will wake up on next request (but first request may fail)

### 2. CORS_ORIGIN Environment Variable Not Set

**Symptom**: Service is running but CORS errors persist

**Check**:

- Render Dashboard → Environment tab
- Verify `CORS_ORIGIN` is set to: `https://checkout-77d99.web.app,https://checkout-77d99.firebaseapp.com,http://localhost:5173,http://localhost:5174`
- Check service logs for: `🔧 CORS Configuration - Allowed Origins:`

**Fix**:

- Set `CORS_ORIGIN` in Render Dashboard
- Save changes (triggers auto-redeploy)
- Wait for redeploy to complete (2-5 minutes)

### 3. Service Crashed on Startup

**Symptom**: Service shows as "Live" but requests fail

**Check**:

- Render Dashboard → Logs tab
- Look for error messages like:
  - Missing environment variables
  - Port conflicts
  - Build errors
  - Database connection errors

**Fix**:

- Fix the error shown in logs
- Service will auto-redeploy after fix

### 4. CORS Middleware Not Applied

**Symptom**: Service running, CORS_ORIGIN set, but still failing

**Check**:

- Render Logs should show:
  ```
  ✅ CORS middleware configured
  🔧 CORS Configuration - Allowed Origins: [ 'https://checkout-77d99.web.app', ... ]
  ```

**Fix**:

- If these logs are missing, the service might not be starting correctly
- Check for errors in logs before these messages

## How to Fix

### Step 1: Verify Service Status

1. Go to https://dashboard.render.com
2. Select `pos-checkout-api` service
3. Check status is "Live"
4. If not, check "Events" and "Logs" tabs

### Step 2: Verify CORS Configuration

1. Go to Render Dashboard → Environment tab
2. Verify `CORS_ORIGIN` is set to:
   ```
   https://checkout-77d99.web.app,https://checkout-77d99.firebaseapp.com,http://localhost:5173,http://localhost:5174
   ```
3. If missing or incorrect, update it and save

### Step 3: Check Service Logs

1. Go to Render Dashboard → Logs tab
2. Look for startup messages:
   ```
   🔧 CORS Configuration - Allowed Origins: [ 'https://checkout-77d99.web.app', ... ]
   ✅ CORS middleware configured
   ```
3. If you see `❌ CORS blocked origin:`, add that origin to `CORS_ORIGIN`

### Step 4: Test OPTIONS Request

Test if the preflight request works:

```bash
curl -X OPTIONS https://pos-checkout-api.onrender.com/api/v1/auth/login \
  -H "Origin: https://checkout-77d99.web.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

**Expected Response**:

```
< HTTP/1.1 204 No Content
< Access-Control-Allow-Origin: https://checkout-77d99.web.app
< Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD
< Access-Control-Allow-Headers: Content-Type,Authorization,Accept,...
```

**If this fails**: The service might not be running or CORS is not configured.

### Step 5: Test Actual Request

Once OPTIONS works, test the actual login:

```bash
curl -X POST https://pos-checkout-api.onrender.com/api/v1/auth/login \
  -H "Origin: https://checkout-77d99.web.app" \
  -H "Content-Type: application/json" \
  -d '{"tenantSlug":"test","pin":"1234","deviceId":"test-device"}' \
  -v
```

## Quick Diagnostic Checklist

- [ ] Service status is "Live" in Render Dashboard
- [ ] `CORS_ORIGIN` environment variable is set correctly
- [ ] Service has been redeployed after setting CORS_ORIGIN
- [ ] Logs show CORS configuration on startup
- [ ] OPTIONS request returns CORS headers
- [ ] No errors in Render logs
- [ ] Service is not sleeping (free tier limitation)

## Common Solutions

### Solution 1: Service Sleeping (Free Tier)

**Problem**: Render free tier services spin down after 15 minutes of inactivity.

**Fix**:

- First request after spin-down will fail
- Service wakes up automatically
- Wait 30-60 seconds and try again
- Consider upgrading to paid tier for always-on service

### Solution 2: Environment Variable Not Applied

**Problem**: Set CORS_ORIGIN but still getting errors.

**Fix**:

1. Double-check variable name: `CORS_ORIGIN` (not `CORS_ORIGINS`)
2. Ensure no trailing spaces or commas
3. Save changes (triggers redeploy)
4. Wait for redeploy to complete
5. Check logs to verify it's being read

### Solution 3: Origin Mismatch

**Problem**: Origin in error doesn't match what's configured.

**Fix**:

- Check exact origin in browser console error
- Add that exact origin to `CORS_ORIGIN`
- Ensure no trailing slashes: `https://checkout-77d99.web.app` (not `https://checkout-77d99.web.app/`)

## Technical Details

### Your Backend CORS Configuration

The backend uses NestJS CORS middleware configured in `apps/backend/src/app.bootstrap.ts`:

```typescript
const corsConfig = {
  origin: originHandler, // Checks against CORS_ORIGIN env var
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', ...],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
```

The `originHandler` function:

- Reads `CORS_ORIGIN` environment variable
- Splits by comma to get allowed origins
- Normalizes and compares origins (case-insensitive)
- Allows localhost and capacitor origins by prefix

### Why Preflight is Required

Your POST request includes:

- Custom headers (Authorization, Content-Type)
- Credentials (cookies/auth tokens)

This triggers a "preflight" OPTIONS request that must succeed before the actual POST.

## Next Steps

1. **Check Render Dashboard** - Verify service is running
2. **Verify CORS_ORIGIN** - Ensure it's set correctly
3. **Check Logs** - Look for CORS configuration messages
4. **Test OPTIONS** - Use curl to test preflight request
5. **Wait for Redeploy** - If you changed environment variables, wait for redeploy
6. **Try Again** - Test login in browser after fixes

If issues persist, check the `CORS_TROUBLESHOOTING.md` file for more detailed troubleshooting steps.
