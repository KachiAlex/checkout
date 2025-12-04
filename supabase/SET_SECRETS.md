# Setting Supabase Secrets

Secrets are set using the Supabase CLI in your terminal. They're stored securely in your Supabase project (not in local files).

## Step 1: Get Your Firebase Service Account Key

1. Go to Firebase Console: https://console.firebase.google.com/project/checkout-77d99/settings/serviceaccounts/adminsdk
2. Click **"Generate New Private Key"**
3. Save the JSON file (e.g., `firebase-service-account.json`)

The JSON file will look like this:
```json
{
  "type": "service_account",
  "project_id": "checkout-77d99",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@checkout-77d99.iam.gserviceaccount.com",
  ...
}
```

## Step 2: Extract Values

From the JSON file, you need:
- `project_id` → `FIREBASE_PROJECT_ID`
- `client_email` → `FIREBASE_CLIENT_EMAIL`
- `private_key` → `FIREBASE_PRIVATE_KEY`

## Step 3: Set Secrets in PowerShell

Run these commands in PowerShell (one at a time):

```powershell
# 1. Set Firebase Project ID
supabase secrets set FIREBASE_PROJECT_ID=checkout-77d99

# 2. Set Firebase Client Email (replace with your actual email from JSON)
supabase secrets set FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@checkout-77d99.iam.gserviceaccount.com

# 3. Set Firebase Private Key
# Copy the entire private_key value from JSON (including BEGIN/END lines)
# Replace actual newlines with \n
# Example:
supabase secrets set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"

# 4. Set JWT Secret (get this from your backend .env file)
supabase secrets set JWT_SECRET=your-actual-jwt-secret-from-backend-env
```

## Important Notes

### For FIREBASE_PRIVATE_KEY:
- The `private_key` in JSON is already a single line with `\n` characters
- You can copy it directly from the JSON file
- Make sure to include the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines
- Wrap the entire value in quotes

### Example of correct format:
```powershell
supabase secrets set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...very long key...-----END PRIVATE KEY-----\n"
```

## Step 4: Verify Secrets Are Set

```powershell
supabase secrets list
```

This will show you all the secrets (values are hidden for security).

## Where Are Secrets Stored?

- **Not** in your local files
- **Stored** securely in your Supabase project cloud
- **Accessed** by Edge Functions at runtime
- **Managed** via Supabase CLI or Dashboard

## Alternative: Set via Supabase Dashboard

You can also set secrets via the web dashboard:

1. Go to: https://supabase.com/dashboard/project/cdazlztdllykbtfnssma/settings/functions
2. Scroll to "Secrets" section
3. Add each secret manually

But using CLI is faster for multiple secrets.

