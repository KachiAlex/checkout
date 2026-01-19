# CORS Error - Definitive Fix Guide

## The Problem

You're getting CORS errors because:

1. **The backend service at `https://pos-checkout-api.onrender.com` is NOT responding**
2. The `net::ERR_FAILED` error means the request isn't even reaching the server
3. This could mean: service is down, sleeping (free tier), or crashed

## Root Cause Analysis

### Error Breakdown:

```
Access to XMLHttpRequest at 'https://pos-checkout-api.onrender.com/api/v1/auth/login'
from origin 'https://checkout-77d99.web.app' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Translation**: The browser sent an OPTIONS preflight request, but got no response (or a response without CORS headers).

### Why This Happens:

1. **Service Not Running**: Render service is down or crashed
2. **Service Sleeping**: Free tier services spin down after 15 min inactivity
3. **Service Not Deployed**: Service was never deployed or deployment failed
4. **Wrong URL**: Frontend pointing to wrong backend URL

## Step-by-Step Fix

### Step 1: Verify Backend Service Status

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Find your service**: `pos-checkout-api`
3. **Check Status**:
   - ✅ **Green "Live"** = Service is running
   - ⚠️ **Yellow "Sleeping"** = Service spun down (free tier)
   - ❌ **Red "Failed"** = Service crashed

### Step 2: If Service is Down or Failed

**Check Logs**:

1. Click on your service → "Logs" tab
2. Look for error messages:
   - Missing environment variables
   - Port conflicts
   - Build errors
   - Database connection errors

**Common Fixes**:

- **Missing `CORS_ORIGIN`**: Set it in Environment tab
- **Missing `JWT_SECRET`**: Set it in Environment tab
- **Missing Firebase credentials**: Set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- **Port conflict**: Ensure `PORT=10000` is set

### Step 3: Verify CORS Configuration

1. **Go to Render Dashboard** → Your Service → **Environment** tab
2. **Verify `CORS_ORIGIN` is set to**:
   ```
   https://checkout-77d99.web.app,https://checkout-77d99.firebaseapp.com,http://localhost:5173,http://localhost:5174
   ```
3. **If missing or wrong**:
   - Add/update the variable
   - Click "Save Changes"
   - Wait for auto-redeploy (2-5 minutes)

### Step 4: Verify Frontend Configuration

**Check `apps/frontend/src/config.ts`**:

```typescript
// Should be:
const DEFAULT_API_BASE =
  import.meta.env.VITE_API_URL || "https://pos-checkout-api.onrender.com";
```

**Verify Production Build**:

1. Check your deployed frontend at `https://checkout-77d99.web.app`
2. Open browser console (F12)
3. Look for: `[config] API_URL (prod) https://pos-checkout-api.onrender.com`
4. If it shows a different URL, rebuild and redeploy frontend

### Step 5: Test Backend Directly

**Test Health Endpoint**:

```bash
# Should return: {"status":"ok","timestamp":"...","service":"pos-backend"}
curl https://pos-checkout-api.onrender.com/api/v1/health
```

**Test OPTIONS Request** (CORS Preflight):

```bash
curl -X OPTIONS https://pos-checkout-api.onrender.com/api/v1/auth/login \
  -H "Origin: https://checkout-77d99.web.app" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

**Expected Response**:

```
< HTTP/1.1 204 No Content
< Access-Control-Allow-Origin: https://checkout-77d99.web.app
< Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD
< Access-Control-Allow-Headers: Content-Type,Authorization,Accept,...
```

**If you get 404 or connection refused**: Service is not running

### Step 6: Wake Up Sleeping Service (Free Tier)

If service is sleeping:

1. Make a request to wake it up: `curl https://pos-checkout-api.onrender.com/api/v1/health`
2. Wait 30-60 seconds for service to start
3. Try your frontend again

**Note**: First request after sleep may fail. Wait and retry.

### Step 7: Check Backend Logs

1. **Go to Render Dashboard** → Your Service → **Logs** tab
2. **Look for these messages on startup**:

   ```
   🔧 Bootstrap - NODE_ENV: production, Prefix: /api/v1, Origin: https://checkout-77d99.web.app,...
   🔧 CORS Configuration - Allowed Origins: [ 'https://checkout-77d99.web.app', ... ]
   ✅ CORS middleware configured
   🚀 Application is running on: http://localhost:10000
   ```

3. **If you see `❌ CORS blocked origin:`**: Add that origin to `CORS_ORIGIN`

## Quick Diagnostic Checklist

Run through this checklist:

- [ ] **Service Status**: Render Dashboard shows "Live" (green)
- [ ] **CORS_ORIGIN Set**: Environment tab has `CORS_ORIGIN` with your frontend URL
- [ ] **Service Redeployed**: After setting `CORS_ORIGIN`, service redeployed
- [ ] **Backend Responds**: `curl https://pos-checkout-api.onrender.com/api/v1/health` returns JSON
- [ ] **OPTIONS Works**: OPTIONS request returns CORS headers
- [ ] **Frontend URL**: Frontend console shows correct API URL
- [ ] **No Errors in Logs**: Render logs show no startup errors
- [ ] **Service Not Sleeping**: If free tier, service is awake

## If Still Not Working

### Option 1: Temporarily Allow All Origins (Testing Only)

1. **Render Dashboard** → Environment tab
2. **Set `CORS_ORIGIN` to**: `*`
3. **Save and wait for redeploy**
4. **Test your frontend**
5. **IMPORTANT**: Change back to specific origins after testing

### Option 2: Check Service Deployment

1. **Render Dashboard** → Your Service → **Events** tab
2. **Check latest deployment**:
   - ✅ **Success** = Deployment completed
   - ❌ **Failed** = Check build logs
   - ⏳ **In Progress** = Wait for completion

### Option 3: Verify Environment Variables

**Required Variables** (check in Render Dashboard → Environment):

- `NODE_ENV` = `production`
- `PORT` = `10000`
- `CORS_ORIGIN` = `https://checkout-77d99.web.app,https://checkout-77d99.firebaseapp.com,http://localhost:5173,http://localhost:5174`
- `JWT_SECRET` = (your secret key)
- `FIREBASE_PROJECT_ID` = `checkout-77d99`
- `FIREBASE_CLIENT_EMAIL` = (your service account email)
- `FIREBASE_PRIVATE_KEY` = (your private key)

### Option 4: Rebuild and Redeploy

If nothing works, trigger a manual redeploy:

1. **Render Dashboard** → Your Service → **Manual Deploy** tab
2. **Click "Deploy latest commit"**
3. **Wait for deployment** (2-5 minutes)
4. **Check logs** for errors
5. **Test again**

## Expected Behavior After Fix

✅ **Backend Health Check**:

```bash
curl https://pos-checkout-api.onrender.com/api/v1/health
# Returns: {"status":"ok","timestamp":"2024-...","service":"pos-backend"}
```

✅ **OPTIONS Request**:

```bash
curl -X OPTIONS https://pos-checkout-api.onrender.com/api/v1/auth/login \
  -H "Origin: https://checkout-77d99.web.app" \
  -H "Access-Control-Request-Method: POST" \
  -v
# Returns: 204 with CORS headers
```

✅ **Frontend Login**:

- No CORS errors in browser console
- Login request succeeds
- User is authenticated

## Prevention

To prevent this in the future:

1. **Upgrade to Paid Tier**: Prevents service from sleeping
2. **Set Up Health Checks**: Use Render's health check feature
3. **Monitor Logs**: Set up alerts for service failures
4. **Test After Deployment**: Always test CORS after deploying

## Summary

**The fix is simple**:

1. ✅ Ensure backend service is running in Render
2. ✅ Set `CORS_ORIGIN` environment variable correctly
3. ✅ Wait for service to redeploy
4. ✅ Verify backend responds to requests
5. ✅ Test frontend login

**Most common issue**: Service is not running or `CORS_ORIGIN` is not set.
