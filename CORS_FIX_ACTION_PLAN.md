# CORS Fix - Immediate Action Plan

## 🎯 The Real Problem

**Your backend service at `https://pos-checkout-api.onrender.com` is NOT responding.**

The `net::ERR_FAILED` error means the request isn't reaching the server. This is NOT a CORS configuration issue - it's a service availability issue.

## ✅ Immediate Actions (Do These Now)

### 1. Check Render Dashboard (2 minutes)

1. Go to: https://dashboard.render.com
2. Find service: `pos-checkout-api`
3. Check status:
   - **Green "Live"** → Go to step 2
   - **Yellow "Sleeping"** → Wake it up (make a request), then go to step 2
   - **Red "Failed"** → Go to step 3

### 2. Verify CORS_ORIGIN is Set (1 minute)

1. In Render Dashboard → Your Service → **Environment** tab
2. Find `CORS_ORIGIN` variable
3. Should be: `https://checkout-77d99.web.app,https://checkout-77d99.firebaseapp.com,http://localhost:5173,http://localhost:5174`
4. If missing/wrong:
   - Click "Add Environment Variable"
   - Key: `CORS_ORIGIN`
   - Value: `https://checkout-77d99.web.app,https://checkout-77d99.firebaseapp.com,http://localhost:5173,http://localhost:5174`
   - Click "Save Changes"
   - Wait 2-5 minutes for redeploy

### 3. If Service Failed - Check Logs (5 minutes)

1. Render Dashboard → Your Service → **Logs** tab
2. Look for errors:
   - ❌ "Missing environment variable" → Set it in Environment tab
   - ❌ "Port already in use" → Check PORT=10000 is set
   - ❌ "Cannot connect to database" → Check Firebase credentials
   - ❌ "JWT_SECRET is required" → Set JWT_SECRET in Environment tab
3. Fix the error
4. Service will auto-redeploy

### 4. Test Backend (1 minute)

Open PowerShell and run:
```powershell
Invoke-WebRequest -Uri "https://pos-checkout-api.onrender.com/api/v1/health" -Method GET
```

**Expected**: Returns JSON with `{"status":"ok",...}`
**If fails**: Service is not running - go back to step 1

### 5. Test CORS Preflight (1 minute)

```powershell
$headers = @{
    "Origin" = "https://checkout-77d99.web.app"
    "Access-Control-Request-Method" = "POST"
}
Invoke-WebRequest -Uri "https://pos-checkout-api.onrender.com/api/v1/auth/login" -Method OPTIONS -Headers $headers
```

**Expected**: Status 204 (No Content) with CORS headers
**If fails**: CORS_ORIGIN not set correctly - go back to step 2

### 6. Test Frontend (1 minute)

1. Open: https://checkout-77d99.web.app
2. Open browser console (F12)
3. Try to login
4. **If CORS error persists**: Check console for exact error message

## 🔧 What I Fixed in the Code

I added an explicit OPTIONS handler middleware in `apps/backend/src/app.bootstrap.ts` that:
- ✅ Always sets CORS headers on every request
- ✅ Handles OPTIONS preflight requests immediately
- ✅ Logs when OPTIONS requests are handled
- ✅ Works as a safety net if NestJS CORS middleware fails

**This ensures CORS headers are ALWAYS sent, even if something goes wrong.**

## 📋 Required Environment Variables

Make sure these are set in Render Dashboard → Environment:

| Variable | Required | Value |
|----------|----------|-------|
| `NODE_ENV` | Yes | `production` |
| `PORT` | Yes | `10000` |
| `CORS_ORIGIN` | **CRITICAL** | `https://checkout-77d99.web.app,https://checkout-77d99.firebaseapp.com,http://localhost:5173,http://localhost:5174` |
| `JWT_SECRET` | Yes | (your secret key) |
| `FIREBASE_PROJECT_ID` | Yes | `checkout-77d99` |
| `FIREBASE_CLIENT_EMAIL` | Yes | (your service account email) |
| `FIREBASE_PRIVATE_KEY` | Yes | (your private key) |

## 🚨 Most Common Issues

### Issue 1: Service Not Deployed
**Symptom**: 404 or connection refused
**Fix**: Deploy service in Render Dashboard

### Issue 2: Service Sleeping (Free Tier)
**Symptom**: First request fails, subsequent requests work
**Fix**: Wait 30-60 seconds after first request, or upgrade to paid tier

### Issue 3: CORS_ORIGIN Not Set
**Symptom**: CORS errors even when service is running
**Fix**: Set `CORS_ORIGIN` in Environment tab (see step 2)

### Issue 4: Service Crashed
**Symptom**: Service shows "Failed" status
**Fix**: Check logs, fix error, service will auto-redeploy

## ✅ Success Criteria

You'll know it's fixed when:

1. ✅ Render Dashboard shows service as "Live" (green)
2. ✅ `curl https://pos-checkout-api.onrender.com/api/v1/health` returns JSON
3. ✅ OPTIONS request returns 204 with CORS headers
4. ✅ Frontend login works without CORS errors
5. ✅ Browser console shows no CORS errors

## 📞 Still Not Working?

If you've done all steps and it's still not working:

1. **Check Render Logs** for startup errors
2. **Verify all environment variables** are set correctly
3. **Check service is not sleeping** (free tier limitation)
4. **Try temporarily setting `CORS_ORIGIN=*`** to test (then change back)
5. **Check frontend is using correct API URL** (should be `https://pos-checkout-api.onrender.com`)

## 🎯 Bottom Line

**The backend service must be running and `CORS_ORIGIN` must be set correctly.**

The code fix I made ensures CORS headers are always sent, but if the service isn't running, nothing will work.

**Next Step**: Go to Render Dashboard and verify service status + CORS_ORIGIN variable.

