# Vercel Deployment Setup Guide

## Overview
This guide provides step-by-step instructions for deploying the Checkout POS backend to Vercel with proper configuration.

## Vercel Configuration Settings

### Root Directory
```
.
```
(Root of the repository - Vercel will auto-detect monorepo structure)

### Build Command
```
npm run build:backend
```
This command:
- Builds the shared packages
- Builds payment adapters
- Builds the NestJS backend
- Outputs to `apps/backend/dist`

### Install Command
```
npm install
```
Standard npm install for monorepo workspace setup

### Output Directory
```
apps/backend/dist
```
The compiled backend output directory

## Step-by-Step Setup

### 1. Vercel Project Configuration

**In Vercel Dashboard:**

1. Go to https://vercel.com/dashboard
2. Select your "checkout" project
3. Go to **Settings** → **Build & Development Settings**

### 2. Configure Build Settings

Set the following values:

| Setting | Value |
|---------|-------|
| **Root Directory** | `.` (leave empty or use root) |
| **Build Command** | `npm run build:backend` |
| **Install Command** | `npm install` |
| **Output Directory** | `apps/backend/dist` |
| **Node.js Version** | 20.x |

### 3. Environment Variables

Go to **Settings** → **Environment Variables** and add:

#### Database
```
DATABASE_URL=postgresql://user:password@host:5432/checkout
```

#### Authentication
```
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRATION=7d
```

#### Firebase
```
FIREBASE_PROJECT_ID=checkout-77d99
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@checkout-77d99.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://checkout-77d99.firebaseio.com
```

#### Email (SMTP)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@checkout.com
SMTP_SECURE=false
```

#### Payment Processing (Flutterwave)
```
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST_xxxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST_xxxxx
FLUTTERWAVE_WEBHOOK_SECRET=your-webhook-secret
FLUTTERWAVE_BASE_URL=https://api.flutterwave.com/v3
```

#### CORS Configuration
```
CORS_ORIGIN=https://your-frontend-url.vercel.app,https://checkout-77d99.web.app
```

#### Frontend URL
```
FRONTEND_URL=https://your-frontend-url.vercel.app
API_PREFIX=api/v1
NODE_ENV=production
```

### 4. Deployment Trigger

The deployment is automatically triggered when you push to GitLab:

```bash
git push gitlab main
```

Vercel will:
1. Detect the push from GitLab
2. Run the build command: `npm run build:backend`
3. Deploy to `https://checkout.vercel.app`

## Vercel Configuration Files

### vercel.json
Located at root of repository:
```json
{
  "version": 2,
  "buildCommand": "npm run build:backend",
  "installCommand": "npm install",
  "outputDirectory": "apps/backend/dist",
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "api/index.ts": {
      "memory": 1024,
      "maxDuration": 60
    }
  },
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/api/index.ts",
      "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]
    }
  ]
}
```

### api/index.ts
Serverless function entry point that initializes NestJS app for Vercel.

## Deployment Checklist

- [ ] Vercel project created and connected to GitLab
- [ ] Root Directory set to `.`
- [ ] Build Command set to `npm run build:backend`
- [ ] Install Command set to `npm install`
- [ ] Output Directory set to `apps/backend/dist`
- [ ] Node.js version set to 20.x
- [ ] All environment variables configured
- [ ] Database is accessible from Vercel
- [ ] SMTP credentials are valid
- [ ] Flutterwave API keys are correct
- [ ] CORS origins include your frontend URL
- [ ] vercel.json is in repository root
- [ ] api/index.ts exists in repository root

## Testing Deployment

### 1. Check Build Status
- Go to Vercel dashboard
- Click on "checkout" project
- View deployment logs

### 2. Test Health Endpoint
```bash
curl https://checkout.vercel.app/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "platform",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "endpoints": {
    "register": "/api/v1/platform/register",
    "paymentStatus": "/api/v1/platform/subscriptions/:tenantId/payment/status/:paymentId"
  }
}
```

### 3. Test Registration Endpoint
```bash
curl -X POST https://checkout.vercel.app/api/v1/platform/register \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Company",
    "companySlug": "test-company",
    "adminName": "Admin User",
    "adminEmail": "admin@test.com",
    "adminPassword": "password123",
    "plan": "free",
    "industry": "retail"
  }'
```

### 4. Update Frontend Config
Update `apps/frontend/src/config.ts`:
```typescript
const DEFAULT_API_BASE = "https://checkout.vercel.app";
```

## Troubleshooting

### Build Fails with "Cannot find module"
- Check that all dependencies are in root `package.json`
- Verify workspace configuration in `package.json`
- Check that `npm run build:backend` works locally

### Environment Variables Not Found
- Verify variables are set in Vercel dashboard
- Check variable names match exactly (case-sensitive)
- Redeploy after adding new variables

### Database Connection Fails
- Verify DATABASE_URL is correct
- Check database is accessible from Vercel IP range
- Test connection string locally first

### CORS Errors
- Add frontend URL to CORS_ORIGIN environment variable
- Restart deployment after updating CORS_ORIGIN
- Check that origin includes protocol (https://)

### Email Not Sending
- Verify SMTP credentials are correct
- Check SMTP_PORT matches your provider (usually 587 or 465)
- Test SMTP connection locally first
- Check email logs in Vercel dashboard

## Monitoring

### View Logs
1. Go to Vercel dashboard
2. Click on "checkout" project
3. Click on latest deployment
4. View "Function Logs" tab

### Set Up Alerts
1. Go to **Settings** → **Notifications**
2. Enable deployment notifications
3. Set up email alerts for failures

## Rollback

If deployment fails:
1. Go to Vercel dashboard
2. Click on "checkout" project
3. Find previous successful deployment
4. Click "Redeploy" button

## Next Steps

1. Deploy to Vercel using this configuration
2. Test all endpoints
3. Update frontend to use Vercel URL
4. Monitor logs for errors
5. Set up continuous monitoring

## Support

For issues:
- Check Vercel documentation: https://vercel.com/docs
- Review deployment logs in Vercel dashboard
- Check NestJS documentation: https://docs.nestjs.com
- Review error messages in Function Logs
