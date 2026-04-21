# Vercel Deployment Checklist

## Status: In Progress

Changes pushed to GitHub and GitLab. Vercel build should be triggered automatically.

## Step 1: Monitor Vercel Build

1. Go to Vercel Dashboard
2. Select "checkout" project
3. Watch build logs
4. Expected: Build completes in 2-5 minutes

## Step 2: Configure Environment Variables

Once build succeeds, add these to Vercel project settings:

**Database:**
- DATABASE_URL
- PRISMA_DATABASE_URL

**Authentication:**
- JWT_SECRET
- JWT_EXPIRATION

**Firebase:**
- FIREBASE_PROJECT_ID
- FIREBASE_PRIVATE_KEY
- FIREBASE_CLIENT_EMAIL

**Email (SendGrid):**
- SENDGRID_API_KEY
- SENDGRID_FROM_EMAIL

**Payment (Flutterwave):**
- FLUTTERWAVE_PUBLIC_KEY
- FLUTTERWAVE_SECRET_KEY
- FLUTTERWAVE_WEBHOOK_SECRET

**CORS:**
- CORS_ORIGIN=https://checkout.vercel.app
- FRONTEND_URL=https://checkout.vercel.app

## Step 3: Test Deployment

1. Visit health endpoint: `https://checkout.vercel.app/api/v1/health`
2. Should return: `{"status":"ok","service":"platform"}`

## Step 4: Test Registration Flow

1. Go to frontend
2. Fill registration form
3. Submit
4. Should redirect to login with tenant slug

## Step 5: Verify Email Notifications

1. Check admin email for welcome email
2. Verify email contains tenant slug and login link
3. Verify login works with provided credentials
