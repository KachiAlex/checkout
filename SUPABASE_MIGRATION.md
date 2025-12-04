# Supabase Migration Guide

This guide walks you through migrating from Firebase Cloud Functions to Supabase Edge Functions.

## Overview

- **Current**: Firebase Cloud Functions (Node.js) → $33.60/month
- **Target**: Supabase Edge Functions (Deno) → $0-25/month
- **Database**: Firestore (stays on Firebase)
- **Hosting**: Firebase Hosting (stays on Firebase)

## Prerequisites

1. **Supabase Account**: Sign up at https://supabase.com (free tier available)
2. **Supabase CLI**: Install globally
   ```bash
   npm install -g supabase
   ```
3. **Firebase Service Account**: You'll need your Firebase service account credentials

## Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - **Name**: `checkout-pos` (or your preferred name)
   - **Database Password**: Save this securely
   - **Region**: Choose closest to your users
4. Wait for project to be created (~2 minutes)

## Step 2: Install and Link Supabase CLI

```bash
# Login to Supabase
supabase login

# Link to your project (get project ref from Supabase dashboard)
supabase link --project-ref your-project-ref
```

## Step 3: Set Environment Variables (Secrets)

You need to set these secrets in Supabase for the functions to access Firebase:

```bash
# Get your Firebase service account key from Firebase Console
# Go to: Project Settings > Service Accounts > Generate New Private Key

# Set Firebase credentials
supabase secrets set FIREBASE_PROJECT_ID=checkout-77d99
supabase secrets set FIREBASE_CLIENT_EMAIL=your-service-account@checkout-77d99.iam.gserviceaccount.com
supabase secrets set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"

# Set JWT secret (same as your current backend)
supabase secrets set JWT_SECRET=your-jwt-secret-here
```

**Important**: 
- The `FIREBASE_PRIVATE_KEY` must include the `\n` characters for newlines
- Wrap the entire key in quotes
- The key should be on a single line with `\n` for line breaks

## Step 4: Deploy Functions

```bash
# Navigate to project root
cd /path/to/checkout

# Deploy the API function
supabase functions deploy api
```

## Step 5: Get Your Supabase Function URL

After deployment, you'll get a URL like:
```
https://your-project-ref.supabase.co/functions/v1/api
```

## Step 6: Update Frontend Configuration

Update `apps/frontend/src/config.ts`:

```typescript
// Change from:
const DEFAULT_API_BASE = 'https://us-central1-checkout-77d99.cloudfunctions.net';

// To:
const DEFAULT_API_BASE = 'https://your-project-ref.supabase.co/functions/v1/api';
```

Or set environment variable during build:
```bash
VITE_API_URL=https://your-project-ref.supabase.co/functions/v1/api npm run build --workspace=apps/frontend
```

## Step 7: Test Locally (Optional)

```bash
# Start Supabase locally
supabase start

# Serve functions locally
supabase functions serve api --env-file .env.local
```

## Step 8: Deploy Frontend

```bash
# Build and deploy frontend (still using Firebase Hosting)
npm run deploy:web
```

## Migration Status

### ✅ Completed
- [x] Project structure created
- [x] CORS configuration
- [x] Firebase Admin SDK setup
- [x] Auth handler (login implemented)
- [x] Basic routing structure

### 🚧 In Progress
- [ ] Complete all route handlers (products, orders, inventory, reports, etc.)
- [ ] Port all NestJS controller logic to Deno handlers
- [ ] Testing

### 📋 Remaining Handlers to Implement

Based on your NestJS controllers, you need to implement:

1. **Auth** ✅ (login done, need refresh, verify-manager, superadmin)
2. **Products** ❌
3. **Orders** ❌
4. **Inventory** ❌
5. **Reports** ❌
6. **Users** ❌
7. **Customers** ❌
8. **Suppliers** ❌
9. **Categories** ❌
10. **Brands** ❌
11. **Locations** ❌
12. **Payments** ❌
13. **Returns** ❌
14. **Purchase Orders** ❌
15. **GRN** ❌
16. **Devices** ❌
17. **Sync** ❌
18. **Receipts** ❌
19. **Health** ✅ (basic health check done)

## Implementation Strategy

Since porting all handlers at once is a large task, here's a recommended approach:

### Phase 1: Critical Routes (Week 1)
1. Complete Auth (refresh, verify-manager)
2. Products (CRUD)
3. Orders (create, list, get)
4. Inventory (basic operations)

### Phase 2: Secondary Routes (Week 2)
5. Payments
6. Customers
7. Reports (basic)
8. Sync

### Phase 3: Remaining Routes (Week 3)
9. All other handlers
10. Testing and optimization

## Cost Comparison

### Before (Firebase Functions)
- Functions: $33.60/month
- Hosting: Free
- Firestore: ~$0.06/GB

### After (Supabase Functions)
- Functions: $0/month (free tier: 500K invocations)
- Hosting: Free (Firebase)
- Firestore: ~$0.06/GB (unchanged)

**Savings**: ~$33.60/month

## Troubleshooting

### CORS Errors
- Ensure `corsHeaders` are set in all responses
- Check that frontend URL is allowed

### Firebase Connection Errors
- Verify service account credentials are correct
- Check that `FIREBASE_PRIVATE_KEY` has proper `\n` characters
- Ensure Firebase project allows access from Supabase

### Function Not Found (404)
- Check that path routing is correct
- Verify Supabase adds `/functions/v1/api` prefix
- Check function logs: `supabase functions logs api`

### Authentication Errors
- Verify `JWT_SECRET` matches your backend
- Check token expiration
- Ensure auth middleware is working

## Rollback Plan

If you need to rollback:

1. Update frontend config back to Firebase Functions URL
2. Redeploy frontend
3. Keep Supabase functions running (no cost if unused)
4. Or delete Supabase functions if not needed

## Next Steps

1. **Complete Auth handler** - Add refresh token, verify-manager, superadmin login
2. **Port Products handler** - Start with GET /products
3. **Port Orders handler** - Critical for checkout
4. **Test incrementally** - Deploy and test each handler as you complete it
5. **Update frontend** - Point to Supabase once critical routes work
6. **Monitor** - Check Supabase dashboard for usage and errors

## Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Documentation](https://deno.land/docs)
- [Firebase Admin SDK for Node.js](https://firebase.google.com/docs/admin/setup)

