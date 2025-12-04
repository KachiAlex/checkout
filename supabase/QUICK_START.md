# Supabase Migration Quick Start

This guide will help you quickly set up and deploy your functions to Supabase.

## Prerequisites

1. **Supabase Account**: Sign up at https://supabase.com
2. **Supabase CLI**: Install globally
   ```bash
   npm install -g supabase
   ```

## Step 1: Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate.

## Step 2: Create a New Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - **Name**: `checkout-pos` (or your choice)
   - **Database Password**: Save this securely
   - **Region**: Choose closest to your users
4. Wait for project creation (~2 minutes)

## Step 3: Link Your Project

Get your project reference ID from the Supabase dashboard, then:

```bash
supabase link --project-ref your-project-ref-id
```

## Step 4: Set Environment Variables (Secrets)

You need to configure Firebase credentials so Supabase functions can access Firestore:

### Get Firebase Service Account Key

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: `checkout-77d99`
3. Go to **Project Settings** > **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file

### Set Supabase Secrets

```bash
# Extract values from the service account JSON file
# Then set them as Supabase secrets:

supabase secrets set FIREBASE_PROJECT_ID=checkout-77d99

supabase secrets set FIREBASE_CLIENT_EMAIL=your-service-account@checkout-77d99.iam.gserviceaccount.com

# For the private key, you need to format it as a single line with \n for newlines
# Copy the entire private key including BEGIN/END lines
supabase secrets set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"

# Set your JWT secret (same as your backend)
supabase secrets set JWT_SECRET=your-jwt-secret-here
```

**Important**: The `FIREBASE_PRIVATE_KEY` must:
- Be wrapped in quotes
- Include `\n` characters for line breaks
- Include the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines

## Step 5: Deploy Functions

### Option A: Using the Script (Recommended)

**Windows:**
```powershell
.\scripts\deploy-supabase.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/deploy-supabase.sh
./scripts/deploy-supabase.sh
```

### Option B: Manual Deployment

```bash
supabase functions deploy api
```

## Step 6: Get Your Function URL

After deployment, you'll see output like:
```
Deployed Function api
https://your-project-ref.supabase.co/functions/v1/api
```

Save this URL - you'll need it for the frontend configuration.

## Step 7: Test the Function

```bash
# Test health endpoint
curl https://your-project-ref.supabase.co/functions/v1/api/health

# Should return: {"status":"ok","service":"supabase-edge-function","timestamp":"..."}
```

## Step 8: Update Frontend (When Ready)

Once you've tested and verified the functions work, update `apps/frontend/src/config.ts`:

```typescript
const DEFAULT_API_BASE = 'https://your-project-ref.supabase.co/functions/v1/api';
```

Or set environment variable:
```bash
VITE_API_URL=https://your-project-ref.supabase.co/functions/v1/api npm run build --workspace=apps/frontend
```

## Troubleshooting

### "Not logged in"
```bash
supabase login
```

### "Project not linked"
```bash
supabase link --project-ref your-project-ref-id
```

### "Function deployment failed"
- Check that you're in the project root directory
- Verify `supabase/functions/api/index.ts` exists
- Check Supabase dashboard for error logs

### "Firebase connection error"
- Verify `FIREBASE_PRIVATE_KEY` is correctly formatted with `\n`
- Check that service account has Firestore access
- Verify `FIREBASE_PROJECT_ID` matches your Firebase project

### "CORS errors"
- CORS is already configured in the function
- Check browser console for specific error
- Verify function URL is correct

## Next Steps

1. **Test all endpoints** - Use Postman or curl to test each endpoint
2. **Complete remaining handlers** - Products and Orders are done, implement others as needed
3. **Monitor usage** - Check Supabase dashboard for function invocations
4. **Switch production** - Once tested, update frontend and deploy

## Cost Monitoring

- Check Supabase dashboard: https://supabase.com/dashboard/project/your-project/settings/billing
- Free tier: 500K function invocations/month
- Monitor usage to avoid surprises

## Rollback

If you need to rollback to Firebase Functions:

1. Update `apps/frontend/src/config.ts` back to Firebase URL
2. Redeploy frontend: `npm run deploy:web`
3. Your Supabase functions will remain (no cost if unused)

