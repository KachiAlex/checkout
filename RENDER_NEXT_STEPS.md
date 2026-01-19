# Render Backend Deployment - Next Steps

## ✅ Completed

- Backend is live on Render at `https://pos-checkout-api.onrender.com`
- Frontend configuration updated to use Render backend
- Build scripts fixed and optimized

## 🚀 Next Steps

### 1. Verify Render Backend URL

First, confirm your actual Render service URL. It should be:

- `https://pos-checkout-api.onrender.com` (if you used the name from render.yaml)
- Or check your Render dashboard for the actual URL

**Test the backend is working:**

```bash
# Test health endpoint (if available)
curl https://pos-checkout-api.onrender.com/api/v1/health

# Or test in browser
# Open: https://pos-checkout-api.onrender.com/api/v1/health
```

### 2. Update Frontend Config (if needed)

If your Render URL is different from `pos-checkout-api.onrender.com`, update it:

**Option A: Update config.ts directly**

```typescript
// In apps/frontend/src/config.ts
const DEFAULT_API_BASE = "https://your-actual-render-url.onrender.com";
```

**Option B: Use environment variable (recommended)**

```bash
# Create apps/frontend/.env.production
VITE_API_URL=https://your-actual-render-url.onrender.com
```

### 3. Rebuild and Deploy Frontend

Deploy the updated frontend to Firebase Hosting:

```bash
# From project root
npm run deploy:web
```

This will:

1. Build the frontend with the Render backend URL
2. Deploy to Firebase Hosting

### 4. Verify CORS Configuration

Ensure your Render backend has the frontend URL in CORS_ORIGIN:

**In Render Dashboard → Environment Variables:**

```
CORS_ORIGIN=https://checkout-77d99.web.app,https://checkout-77d99.firebaseapp.com,http://localhost:5173,http://localhost:5174
```

Make sure your Firebase Hosting URL is included in this list.

### 5. Test the Application

**A. Test Backend API directly:**

```bash
# Test login endpoint (replace with actual credentials)
curl -X POST https://pos-checkout-api.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

**B. Test Frontend Connection:**

1. Open your deployed frontend: `https://checkout-77d99.web.app`
2. Open browser DevTools (F12) → Network tab
3. Try to login
4. Check that API requests go to `https://pos-checkout-api.onrender.com/api/v1/...`
5. Verify responses are successful (status 200)

**C. Test Key Features:**

- [ ] User login
- [ ] Product search
- [ ] Inventory management
- [ ] Sales/checkout
- [ ] Reports

### 6. Monitor and Debug

**Render Dashboard:**

- Check logs for any errors
- Monitor service health
- Verify environment variables are set

**Firebase Console:**

- Check hosting deployment status
- View frontend logs if available

**Browser Console:**

- Check for CORS errors
- Verify API requests are going to Render
- Check for any JavaScript errors

## 🔧 Troubleshooting

### CORS Errors

**Symptom:** Browser shows CORS policy errors

**Solution:**

1. Verify `CORS_ORIGIN` in Render includes your frontend URL
2. Check for trailing slashes in URLs
3. Ensure backend is responding (check Render logs)

### API Connection Failed

**Symptom:** Frontend can't reach backend

**Solution:**

1. Verify Render service is running (check dashboard)
2. Test backend URL directly in browser
3. Check firewall/network settings
4. Verify API_URL in frontend config

### 401 Unauthorized

**Symptom:** Login fails or requests return 401

**Solution:**

1. Verify JWT_SECRET is set in Render
2. Check token is being sent in Authorization header
3. Verify token format: `Bearer <token>`

### 500 Internal Server Error

**Symptom:** Backend returns 500 errors

**Solution:**

1. Check Render logs for detailed error messages
2. Verify all environment variables are set correctly
3. Check Firebase credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)

## 📝 Environment Variables Checklist

Ensure these are set in Render Dashboard:

- [x] `NODE_ENV=production`
- [x] `PORT=10000`
- [x] `API_PREFIX=api/v1`
- [x] `CORS_ORIGIN` (includes frontend URLs)
- [x] `JWT_SECRET` (strong secret key)
- [x] `JWT_EXPIRES_IN=24h`
- [x] `REFRESH_TOKEN_EXPIRES_IN=7d`
- [x] `FIREBASE_PROJECT_ID`
- [x] `FIREBASE_CLIENT_EMAIL`
- [x] `FIREBASE_PRIVATE_KEY`

## 🎯 Quick Deploy Command

```bash
# Deploy frontend to Firebase Hosting
npm run deploy:web
```

## 📞 Support

If you encounter issues:

1. Check Render logs: Dashboard → Logs
2. Check browser console for frontend errors
3. Test backend directly with curl/Postman
4. Verify all environment variables are set

---

**Status:** Ready to deploy frontend ✅
