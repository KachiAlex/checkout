# Render Deployment Guide

## ⚠️ IMPORTANT: Manual Configuration Required

Render may not automatically use `render.yaml`. You **MUST** manually set the build command in the Render dashboard.

## Quick Start

1. **Sign up at [render.com](https://render.com)** (or log in)

2. **Create a New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the `checkout` repository

3. **Configure the Service** (CRITICAL - Set these manually!)
   - **Name:** `pos-checkout-api`
   - **Environment:** `Node`
   - **Root Directory:** Leave empty (root of repo)
   - **Build Command:** `npm install --no-optional --include=dev --workspace=packages/shared --workspace=packages/payment-adapters --workspace=apps/backend && npm run build --workspace=packages/shared && npm run build --workspace=packages/payment-adapters && npm run build --workspace=apps/backend`
   - **Start Command:** `cd apps/backend && node dist/src/main.js`
   - **⚠️ CRITICAL:** Copy the build command exactly as shown above and paste it into the Render dashboard. Do NOT use the default `npm install; npm run build` command!

4. **Set Environment Variables**
   Go to the "Environment" tab and add:
   
   ```
   NODE_ENV=production
   PORT=10000
   API_PREFIX=api/v1
   CORS_ORIGIN=https://checkout-77d99.web.app,https://checkout-77d99.firebaseapp.com,http://localhost:5173,http://localhost:5174
   JWT_SECRET=<your-jwt-secret-here>
   JWT_EXPIRES_IN=24h
   REFRESH_TOKEN_EXPIRES_IN=7d
   FIREBASE_PROJECT_ID=<your-firebase-project-id>
   FIREBASE_CLIENT_EMAIL=<your-firebase-client-email>
   FIREBASE_PRIVATE_KEY=<your-firebase-private-key>
   ```

   **Important:** 
   - For `FIREBASE_PRIVATE_KEY`, paste the entire key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
   - Render will handle newlines automatically
   - Get these values from Firebase Console → Project Settings → Service Accounts

5. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy automatically
   - Wait for deployment to complete (usually 2-5 minutes)

6. **Get Your API URL**
   - Once deployed, Render will give you a URL like: `https://pos-checkout-api.onrender.com`
   - Your API will be available at: `https://pos-checkout-api.onrender.com/api/v1`

## Update Frontend

After deployment, update your frontend to use the Render backend:

1. **Update `apps/frontend/src/config.ts`:**
   ```typescript
   const DEFAULT_API_BASE = 'https://pos-checkout-api.onrender.com';
   ```

2. **Or set environment variable:**
   ```bash
   # In apps/frontend/.env
   VITE_API_URL=https://pos-checkout-api.onrender.com
   ```

3. **Rebuild and deploy frontend:**
   ```bash
   npm run deploy:web
   ```

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment | `production` |
| `PORT` | Yes | Port to listen on | `10000` |
| `API_PREFIX` | No | API prefix | `api/v1` |
| `CORS_ORIGIN` | Yes | Allowed origins (comma-separated) | `https://checkout-77d99.web.app` |
| `JWT_SECRET` | Yes | Secret for JWT tokens | `your-secret-key` |
| `JWT_EXPIRES_IN` | No | JWT expiration | `24h` |
| `REFRESH_TOKEN_EXPIRES_IN` | No | Refresh token expiration | `7d` |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID | `checkout-77d99` |
| `FIREBASE_CLIENT_EMAIL` | Yes | Firebase service account email | `firebase-adminsdk-...@...iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | Yes | Firebase private key | `-----BEGIN PRIVATE KEY-----...` |

## Benefits of Render

✅ **No CORS issues** - Full control over CORS headers
✅ **No infrastructure-level checks** - Your code runs first
✅ **Better performance** - No cold starts (with paid plan)
✅ **Easy deployment** - Automatic deployments from GitHub
✅ **Free tier available** - $7/month for better performance
✅ **Better debugging** - Standard Node.js logging
✅ **Full control** - You control everything

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure Node.js version is compatible (Render uses Node 20 by default)

### Service Won't Start
- Check logs in Render dashboard
- Verify all environment variables are set
- Ensure `PORT` is set to `10000` (Render requirement)

### CORS Errors
- Add your frontend URL to `CORS_ORIGIN`
- Ensure no trailing slashes in URLs

### Database Connection Issues
- Verify Firebase credentials are correct
- Check that Firestore is enabled in Firebase Console

## Next Steps

1. Deploy backend to Render
2. Update frontend config to point to Render
3. Test the application
4. Remove Supabase dependencies (optional)

