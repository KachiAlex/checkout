# CORS Fix for Render Deployment

## Problem

CORS errors when accessing Render backend from Firebase-hosted frontend:

```
Access to XMLHttpRequest at 'https://pos-checkout-api.onrender.com/api/v1/auth/login'
from origin 'https://checkout-77d99.web.app' has been blocked by CORS policy
```

## Solution

### Step 1: Set CORS_ORIGIN in Render Dashboard

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Select your service**: `pos-checkout-api`
3. **Click "Environment" tab** (left sidebar)
4. **Find or add** the `CORS_ORIGIN` variable
5. **Set the value to**:
   ```
   https://checkout-77d99.web.app,https://checkout-77d99.firebaseapp.com,http://localhost:5173,http://localhost:5174
   ```
6. **Click "Save Changes"**
7. **Wait for automatic redeploy** (Render will redeploy automatically)

### Step 2: Verify the Fix

After redeployment:

1. **Check Render Logs**:
   - Go to your service → "Logs" tab
   - Look for: `🔧 CORS Configuration - Allowed Origins:`
   - Should show: `https://checkout-77d99.web.app,https://checkout-77d99.firebaseapp.com,...`

2. **Test the API**:

   ```bash
   curl -X OPTIONS https://pos-checkout-api.onrender.com/api/v1/auth/login \
     -H "Origin: https://checkout-77d99.web.app" \
     -H "Access-Control-Request-Method: POST" \
     -v
   ```

   Should return headers:

   ```
   Access-Control-Allow-Origin: https://checkout-77d99.web.app
   Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD
   ```

3. **Test in Browser**:
   - Open: https://checkout-77d99.web.app
   - Try to login
   - Check browser console - CORS errors should be gone

### Step 3: If Still Not Working

#### Option A: Temporarily Allow All Origins (Testing Only)

1. In Render Dashboard → Environment
2. Set `CORS_ORIGIN` to: `*`
3. Save and redeploy
4. Test your login
5. **IMPORTANT**: Change back to specific origins after testing

#### Option B: Check Backend Logs

1. Go to Render Dashboard → Your Service → Logs
2. Look for:
   - `❌ CORS blocked origin:` - means origin not in allowed list
   - `🔧 CORS Configuration` - shows what origins are configured
3. If you see blocked origin warnings, add that origin to `CORS_ORIGIN`

#### Option C: Verify Service is Running

1. Check Render Dashboard → Your Service
2. Status should be "Live" (green)
3. Check "Events" tab for any deployment errors
4. Check "Logs" tab for startup errors

### Common Issues

#### Issue 1: Environment Variable Not Set

**Symptom**: CORS errors persist after setting variable
**Fix**:

- Make sure you clicked "Save Changes"
- Wait for redeploy to complete
- Check logs to verify variable is being read

#### Issue 2: Wrong Origin Format

**Symptom**: Still getting CORS errors
**Fix**:

- Ensure no trailing slashes: `https://checkout-77d99.web.app` (not `https://checkout-77d99.web.app/`)
- Ensure comma-separated with no spaces: `origin1,origin2` (not `origin1, origin2`)
- Check exact URL in browser console error message

#### Issue 3: Service Not Responding

**Symptom**: `net::ERR_FAILED` errors
**Fix**:

- Check if service is running in Render dashboard
- Check service logs for errors
- Verify PORT is set to 10000
- Check if service spun down (free tier)

### Verification Checklist

- [ ] `CORS_ORIGIN` environment variable is set in Render
- [ ] Value includes `https://checkout-77d99.web.app`
- [ ] Service has been redeployed after setting variable
- [ ] Service status is "Live" in Render dashboard
- [ ] Logs show CORS configuration on startup
- [ ] OPTIONS request returns CORS headers
- [ ] Browser console shows no CORS errors

### Expected Log Output

When backend starts, you should see:

```
🔧 Bootstrap - NODE_ENV: production, Prefix: /api/v1, Origin: https://checkout-77d99.web.app,https://checkout-77d99.firebaseapp.com,http://localhost:5173,http://localhost:5174
🔧 CORS Configuration - Allowed Origins: [ 'https://checkout-77d99.web.app', 'https://checkout-77d99.firebaseapp.com', 'http://localhost:5173', 'http://localhost:5174' ]
🔧 CORS Configuration - CORS_ORIGIN env var: https://checkout-77d99.web.app,https://checkout-77d99.firebaseapp.com,http://localhost:5173,http://localhost:5174
```

If you see different origins or "ALL (\*)", the environment variable isn't being read correctly.

---

**Quick Fix**: Set `CORS_ORIGIN` in Render Dashboard → Environment tab → Save → Wait for redeploy
