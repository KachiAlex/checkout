# Vercel Deployment Guide for POS Checkout Backend

This guide explains how to deploy the NestJS backend to Vercel.

## Prerequisites

1. **Vercel Account**: Create a free account at https://vercel.com
2. **GitHub Repository**: Your code must be on GitHub (already done)
3. **Vercel CLI** (optional): `npm install -g vercel`

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Click "Add New..." → "Project"

2. **Import GitHub Repository**
   - Select "Import Git Repository"
   - Search for and select `KachiAlex/checkout`
   - Click "Import"

3. **Configure Project**
   - **Project Name**: `checkout-backend` (or your preferred name)
   - **Framework Preset**: Select "Other" (NestJS)
   - **Root Directory**: Leave as default (Vercel will auto-detect)
   - **Build Command**: `npm run build:backend`
   - **Output Directory**: `apps/backend/dist`
   - **Install Command**: `npm install`

4. **Environment Variables**
   Add the following environment variables in the Vercel dashboard:
   
   ```
   NODE_ENV=production
   CORS_ORIGIN=https://checkout-77d99.web.app,https://checkout-77d99.firebaseapp.com,https://checkoutpos.online
   JWT_SECRET=your-jwt-secret-key
   JWT_EXPIRY=15m
   JWT_REFRESH_EXPIRY=7d
   FIREBASE_PROJECT_ID=checkout-77d99
   FIREBASE_PRIVATE_KEY=your-firebase-private-key
   FIREBASE_CLIENT_EMAIL=your-firebase-client-email
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete (usually 2-5 minutes)
   - You'll get a URL like `https://checkout-backend.vercel.app`

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Follow the prompts to configure your project
```

## Configuration Files

### vercel.json
- Defines build command, output directory, and routes
- Configures serverless function settings
- Sets up CORS headers

### .vercelignore
- Specifies files to exclude from deployment
- Reduces deployment size and build time

### api/index.ts
- Serverless function entry point
- Initializes NestJS app for Vercel
- Handles incoming requests

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `CORS_ORIGIN` | Allowed CORS origins | `https://checkout-77d99.web.app` |
| `JWT_SECRET` | JWT signing key | `your-secret-key` |
| `FIREBASE_PROJECT_ID` | Firebase project ID | `checkout-77d99` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_EXPIRY` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry | `7d` |
| `LOG_LEVEL` | Logging level | `log` |

## Updating Frontend API URL

After deployment, update the frontend to use the new Vercel backend URL:

### Option 1: Environment Variable
Create `.env` in `apps/frontend/`:
```
VITE_API_URL=https://checkout-backend.vercel.app
```

### Option 2: Update config.ts
Edit `apps/frontend/src/config.ts`:
```typescript
const DEFAULT_API_BASE = 'https://checkout-backend.vercel.app';
```

## Monitoring and Debugging

### View Logs
```bash
vercel logs checkout-backend
```

### View Deployments
- Go to https://vercel.com/dashboard
- Select your project
- View deployment history and logs

### Common Issues

#### 1. Build Fails with TypeScript Errors
- Ensure `tsconfig.build.json` exists in `apps/backend/`
- Check that all dependencies are installed
- Verify Node.js version compatibility

#### 2. CORS Errors
- Update `CORS_ORIGIN` environment variable
- Ensure frontend URL is included in allowed origins
- Check `app.bootstrap.ts` CORS configuration

#### 3. Firebase Connection Issues
- Verify Firebase credentials in environment variables
- Check Firebase project permissions
- Ensure Firestore is enabled in Firebase console

#### 4. Timeout Errors
- Increase function timeout in `vercel.json` (max 60 seconds for Pro plan)
- Optimize database queries
- Consider using caching

## Performance Optimization

### 1. Cold Start Optimization
- Minimize dependencies
- Use tree-shaking in build
- Consider using `@vercel/node` utilities

### 2. Database Optimization
- Use connection pooling
- Implement caching strategies
- Optimize Firestore queries

### 3. Function Size
- Keep function size under 50MB
- Remove unnecessary dependencies
- Use dynamic imports for large modules

## Scaling Considerations

### Vercel Pricing
- **Hobby Plan**: Free tier with limitations
- **Pro Plan**: $20/month with better performance
- **Enterprise**: Custom pricing

### Scaling Options
1. **Automatic Scaling**: Vercel handles scaling automatically
2. **Regional Deployment**: Deploy to multiple regions
3. **Edge Functions**: Use Edge Network for lower latency

## Rollback

To rollback to a previous deployment:

1. Go to Vercel Dashboard
2. Select your project
3. Go to "Deployments" tab
4. Find the previous deployment
5. Click "Promote to Production"

## Next Steps

1. **Test the deployment**
   - Use the test pages created earlier
   - Verify registration and login work
   - Check CORS configuration

2. **Update DNS** (if using custom domain)
   - Add CNAME record pointing to Vercel
   - Update frontend API URL

3. **Monitor performance**
   - Check Vercel analytics
   - Monitor error rates
   - Optimize as needed

## Support

- **Vercel Docs**: https://vercel.com/docs
- **NestJS Docs**: https://docs.nestjs.com
- **Firebase Docs**: https://firebase.google.com/docs

## Comparison: Render vs Vercel

| Feature | Render | Vercel |
|---------|--------|--------|
| **Pricing** | Free tier available | Free tier available |
| **Scaling** | Manual/Auto | Automatic |
| **Cold Start** | ~5-10s | ~1-2s |
| **Max Function Size** | Unlimited | 50MB |
| **Max Timeout** | 30s | 60s (Pro) |
| **Database Support** | PostgreSQL, Redis | Any (external) |
| **Ease of Use** | Easy | Very Easy |

## Troubleshooting Checklist

- [ ] Vercel account created and project imported
- [ ] Environment variables configured
- [ ] Build command set to `npm run build:backend`
- [ ] Output directory set to `apps/backend/dist`
- [ ] Deployment successful (no build errors)
- [ ] API endpoint accessible
- [ ] CORS headers present in responses
- [ ] Frontend API URL updated
- [ ] Registration form works
- [ ] Login works
- [ ] Health check endpoint responds

## Additional Resources

- [Vercel NestJS Example](https://github.com/vercel/examples/tree/main/solutions/nestjs)
- [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
- [NestJS Deployment Guide](https://docs.nestjs.com/deployment)
