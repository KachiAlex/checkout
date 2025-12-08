# Service URL and Port Fix

## 🚨 Issues Found

### Issue 1: Wrong Service URL
**Problem**: You've been trying to access `https://pos-checkout-api.onrender.com` but your actual service is at `https://checkout-45tb.onrender.com`

**From the logs**:
```
Available at your primary URL https://checkout-45tb.onrender.com
```

### Issue 2: Wrong Port
**Problem**: App is listening on port 1000, but Render expects port 10000

**From the logs**:
```
🚀 Application is running on: http://localhost:1000
```

**Should be**:
```
🚀 Application is running on: http://localhost:10000
```

## ✅ Fixes Applied

1. **Fixed PORT reading** - Now correctly reads from `process.env.PORT` (Render sets this automatically)
2. **Added fallback** - Defaults to 10000 if PORT is not set

## 🎯 Immediate Actions

### Option 1: Use the Correct Service URL (Quick Fix)

**Update your frontend to use the correct URL**:

1. **Update `apps/frontend/src/config.ts`**:
   ```typescript
   const DEFAULT_API_BASE = import.meta.env.VITE_API_URL || 'https://checkout-45tb.onrender.com';
   ```

2. **Rebuild and redeploy frontend**:
   ```powershell
   npm run build --workspace=apps/frontend
   npm run deploy:web
   ```

3. **Test the correct URL**:
   ```powershell
   Invoke-WebRequest -Uri "https://checkout-45tb.onrender.com/api/v1/health" -UseBasicParsing
   ```

### Option 2: Rename Service to Match (Better Long-term)

1. **Go to Render Dashboard** → Your Service → Settings
2. **Change service name** from `checkout-45tb` to `pos-checkout-api`
3. **Wait for redeploy**
4. **New URL will be**: `https://pos-checkout-api.onrender.com`

**Note**: This will change your service URL, so you'll need to update frontend after.

### Option 3: Fix PORT Environment Variable

1. **Go to Render Dashboard** → Your Service → Environment
2. **Verify `PORT` is set to `10000`**
3. **If missing or wrong**, set it to `10000`
4. **Save and wait for redeploy**

## 🧪 Test the Correct Service

After fixing, test with the correct URL:

```powershell
# Test health endpoint
Invoke-WebRequest -Uri "https://checkout-45tb.onrender.com/api/v1/health" -UseBasicParsing

# Test root endpoint
Invoke-WebRequest -Uri "https://checkout-45tb.onrender.com" -UseBasicParsing

# Test CORS preflight
$headers = @{
    "Origin" = "https://checkout-77d99.web.app"
    "Access-Control-Request-Method" = "POST"
}
Invoke-WebRequest -Uri "https://checkout-45tb.onrender.com/api/v1/auth/login" -Method OPTIONS -Headers $headers
```

## 📋 Summary

**The service IS running and routes ARE registered**, but:
1. ✅ You're using the wrong URL (`pos-checkout-api` vs `checkout-45tb`)
2. ✅ PORT might not be set correctly (showing 1000 instead of 10000)

**Quick Fix**: Use `https://checkout-45tb.onrender.com` instead of `https://pos-checkout-api.onrender.com`

**After fixing**: Your CORS errors should be resolved because:
- ✅ Service is running
- ✅ Routes are registered (logs show `/api/v1/health` is mapped)
- ✅ CORS is configured
- ✅ You just need to use the correct URL

