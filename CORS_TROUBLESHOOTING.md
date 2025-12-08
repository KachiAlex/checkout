# CORS Troubleshooting Guide

## Current Issue
CORS errors persist after deployment. The error indicates that OPTIONS preflight requests are not getting CORS headers.

## Possible Causes

### 1. Service Not Running
**Check:** Go to Render Dashboard → Your Service → Check if status is "Live"

**Fix:** If service is down, check logs for startup errors

### 2. Deployment Not Complete
**Check:** Render Dashboard → Events tab → Look for latest deployment

**Fix:** Wait for deployment to complete (usually 2-5 minutes)

### 3. Environment Variable Not Set
**Check:** Render Dashboard → Environment tab → Verify `CORS_ORIGIN` is set

**Fix:** Set `CORS_ORIGIN` to:
```
https://checkout-77d99.web.app,https://checkout-77d99.firebaseapp.com,http://localhost:5173,http://localhost:5174
```

### 4. Service Crashed on Startup
**Check:** Render Dashboard → Logs tab → Look for error messages

**Common errors:**
- Missing environment variables (FIREBASE_PROJECT_ID, JWT_SECRET, etc.)
- Port conflict (should be 10000)
- Build errors

### 5. CORS Middleware Not Applied
**Check:** Render Logs → Look for:
```
✅ CORS middleware configured
✅ Global prefix set to: /api/v1
✅ CORS middleware active
🔧 CORS Configuration - Allowed Origins: [ 'https://checkout-77d99.web.app', ... ]
```

**If missing:** The service might not be starting correctly

## Quick Diagnostic Steps

### Step 1: Check Service Status
1. Go to Render Dashboard
2. Check if service is "Live" (green)
3. If not, check "Events" and "Logs" tabs

### Step 2: Test OPTIONS Request
```bash
curl -X OPTIONS https://pos-checkout-api.onrender.com/api/v1/auth/login \
  -H "Origin: https://checkout-77d99.web.app" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

**Expected response:**
```
< HTTP/1.1 204 No Content
< Access-Control-Allow-Origin: https://checkout-77d99.web.app
< Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD
< Access-Control-Allow-Headers: Content-Type,Authorization,Accept,...
```

**If you get 404 or no CORS headers:** Service might not be running or CORS not configured

### Step 3: Check Render Logs
Look for these log messages on startup:
- `🚀 Application is running on: http://localhost:10000`
- `🔧 CORS Configuration - Allowed Origins:`
- `✅ CORS middleware configured`

### Step 4: Verify Environment Variables
In Render Dashboard → Environment tab, ensure:
- `CORS_ORIGIN` is set correctly
- `PORT=10000`
- `NODE_ENV=production`
- `FIREBASE_PROJECT_ID` is set
- `JWT_SECRET` is set
- `FIREBASE_CLIENT_EMAIL` is set
- `FIREBASE_PRIVATE_KEY` is set

## Temporary Workaround

If CORS still doesn't work, temporarily allow all origins:

1. In Render Dashboard → Environment
2. Set `CORS_ORIGIN` to: `*`
3. Save and redeploy
4. Test your frontend
5. **IMPORTANT:** Change back to specific origins after testing

## Next Steps

1. **Check Render Logs** - Look for startup errors or CORS configuration logs
2. **Verify Deployment** - Ensure latest code is deployed
3. **Test OPTIONS Request** - Use curl to test CORS directly
4. **Check Service Status** - Ensure service is running

If the service is running but CORS still fails, the issue might be with NestJS CORS middleware configuration. We may need to add explicit OPTIONS route handling.


