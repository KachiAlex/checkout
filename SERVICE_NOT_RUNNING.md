# Service Not Running - Immediate Fix

## 🚨 Problem Confirmed

The backend service at `https://pos-checkout-api.onrender.com` is **NOT running**.

The "Not Found" error means:
- Service is not deployed, OR
- Service crashed, OR  
- Service is sleeping (free tier), OR
- Service failed to start

## ✅ Immediate Fix Steps

### Step 1: Check Render Dashboard

1. **Go to**: https://dashboard.render.com
2. **Find service**: `pos-checkout-api`
3. **Check status**:
   - ❌ **No service found** → Service was never deployed (go to Step 2)
   - ⚠️ **Yellow "Sleeping"** → Service is sleeping, wake it up (go to Step 3)
   - ❌ **Red "Failed"** → Service crashed (go to Step 4)
   - ✅ **Green "Live"** → Service is running but route issue (go to Step 5)

### Step 2: Deploy Service (If Not Deployed)

**Option A: Deploy from GitHub (Recommended)**

1. **Render Dashboard** → Click "New" → "Web Service"
2. **Connect your GitHub repository**
3. **Configure**:
   - **Name**: `pos-checkout-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install --no-optional --include=dev && npm run build --workspace=packages/shared && npm run build --workspace=packages/payment-adapters && npm run build --workspace=apps/backend`
   - **Start Command**: `cd apps/backend && node dist/src/main.js`
4. **Set Environment Variables** (see Step 6)
5. **Click "Create Web Service"**
6. **Wait for deployment** (5-10 minutes)

**Option B: Deploy from render.yaml**

If you have `render.yaml` in your repo:
1. **Render Dashboard** → "New" → "Blueprint"
2. **Connect repository**
3. **Render will auto-detect `render.yaml`**
4. **Review and deploy**

### Step 3: Wake Up Sleeping Service (Free Tier)

If service shows "Sleeping":
1. **Make a request** to wake it up:
   ```powershell
   Invoke-WebRequest -Uri "https://pos-checkout-api.onrender.com/api/v1/health"
   ```
2. **Wait 30-60 seconds** for service to start
3. **Try again**

**Note**: First request after sleep may fail. Wait and retry.

### Step 4: Fix Crashed Service

If service shows "Failed":

1. **Check Logs**:
   - Render Dashboard → Your Service → **Logs** tab
   - Look for error messages

2. **Common Errors & Fixes**:

   **Error: "Missing environment variable"**
   - Go to Environment tab
   - Add missing variable
   - Service will auto-redeploy

   **Error: "Cannot find module"**
   - Check build command is correct
   - Verify `node_modules` are installed
   - Check `package.json` exists

   **Error: "Port already in use"**
   - Verify `PORT=10000` is set
   - Check no other service uses port 10000

   **Error: "JWT_SECRET is required"**
   - Set `JWT_SECRET` in Environment tab

   **Error: "Firebase credentials missing"**
   - Set `FIREBASE_PROJECT_ID`
   - Set `FIREBASE_CLIENT_EMAIL`
   - Set `FIREBASE_PRIVATE_KEY`

3. **After fixing error**:
   - Service will auto-redeploy
   - Wait 2-5 minutes
   - Check status becomes "Live"

### Step 5: Verify Service is Running

Once service shows "Live":

1. **Test health endpoint**:
   ```powershell
   Invoke-WebRequest -Uri "https://pos-checkout-api.onrender.com/api/v1/health" -UseBasicParsing
   ```

2. **Expected response**:
   ```json
   {
     "status": "ok",
     "timestamp": "2024-...",
     "service": "pos-backend"
   }
   ```

3. **If still "Not Found"**:
   - Check logs for route registration
   - Verify `API_PREFIX=api/v1` is set
   - Check if service started successfully

### Step 6: Required Environment Variables

**Set these in Render Dashboard → Environment tab**:

| Variable | Value | Required |
|----------|-------|----------|
| `NODE_ENV` | `production` | ✅ Yes |
| `PORT` | `10000` | ✅ Yes |
| `API_PREFIX` | `api/v1` | ✅ Yes |
| `CORS_ORIGIN` | `https://checkout-77d99.web.app,https://checkout-77d99.firebaseapp.com,http://localhost:5173,http://localhost:5174` | ✅ Yes |
| `JWT_SECRET` | (your secret key) | ✅ Yes |
| `JWT_EXPIRES_IN` | `24h` | ⚠️ Optional |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d` | ⚠️ Optional |
| `FIREBASE_PROJECT_ID` | `checkout-77d99` | ✅ Yes |
| `FIREBASE_CLIENT_EMAIL` | (service account email) | ✅ Yes |
| `FIREBASE_PRIVATE_KEY` | (private key) | ✅ Yes |

### Step 7: Check Service Logs

**After deployment, check logs for**:

✅ **Success indicators**:
```
🔧 Bootstrap - NODE_ENV: production, Prefix: /api/v1, Origin: ...
🔧 CORS Configuration - Allowed Origins: [ 'https://checkout-77d99.web.app', ... ]
✅ CORS middleware configured
✅ Global prefix set to: /api/v1
✅ CORS middleware active
🚀 Application is running on: http://localhost:10000
```

❌ **Error indicators**:
- `❌ Failed to start application`
- `❌ CORS blocked origin`
- `Error: Missing environment variable`
- `Error: Cannot connect to database`

## 🎯 Quick Diagnostic

Run these commands to diagnose:

```powershell
# Test 1: Root endpoint
Invoke-WebRequest -Uri "https://pos-checkout-api.onrender.com" -UseBasicParsing

# Test 2: Health endpoint
Invoke-WebRequest -Uri "https://pos-checkout-api.onrender.com/api/v1/health" -UseBasicParsing

# Test 3: Check response headers
$response = Invoke-WebRequest -Uri "https://pos-checkout-api.onrender.com/api/v1/health" -UseBasicParsing
$response.Headers
```

**Expected**:
- Test 1: May return 404 (normal if no root route)
- Test 2: Should return JSON with `{"status":"ok",...}`
- Test 3: Should show response headers

**If all fail**: Service is not running or not deployed

## 📋 Deployment Checklist

Before deploying, ensure:

- [ ] Repository is connected to Render
- [ ] `render.yaml` exists OR service is configured manually
- [ ] Build command is correct
- [ ] Start command is correct
- [ ] All environment variables are set
- [ ] Service name is `pos-checkout-api`
- [ ] Port is set to `10000`

## 🚀 After Service is Running

Once service shows "Live" and health endpoint works:

1. **Test CORS**:
   ```powershell
   $headers = @{
       "Origin" = "https://checkout-77d99.web.app"
       "Access-Control-Request-Method" = "POST"
   }
   Invoke-WebRequest -Uri "https://pos-checkout-api.onrender.com/api/v1/auth/login" -Method OPTIONS -Headers $headers
   ```

2. **Test Frontend**:
   - Open: https://checkout-77d99.web.app
   - Try to login
   - Check browser console for errors

3. **Verify CORS_ORIGIN**:
   - Render Dashboard → Environment
   - Verify `CORS_ORIGIN` includes your frontend URL

## 💡 Most Likely Issue

**The service was never deployed to Render, or the deployment failed.**

**Solution**: Deploy the service using the steps above.

## 📞 Still Not Working?

If service is deployed and still not responding:

1. **Check Render Dashboard** → Events tab for deployment errors
2. **Check Logs** tab for startup errors
3. **Verify all environment variables** are set correctly
4. **Try manual redeploy**: Render Dashboard → Manual Deploy → "Deploy latest commit"
5. **Check service is not sleeping**: Free tier services sleep after 15 min inactivity

---

**Bottom Line**: The service must be deployed and running in Render before CORS or any other functionality will work.

