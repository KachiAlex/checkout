# Testing Your Supabase Function

Your function is deployed and active! Here's how to test it:

## Function URL

```
https://cdazlztdllykbtfnssma.supabase.co/functions/v1/api
```

## Get Your API Keys

1. Go to: https://supabase.com/dashboard/project/cdazlztdllykbtfnssma/settings/api
2. Find the **anon/public** key (starts with `eyJ...`)

## Test Health Endpoint

### Using PowerShell:

```powershell
# Replace YOUR_ANON_KEY with your actual anon key
$anonKey = "YOUR_ANON_KEY"
$headers = @{
    "apikey" = $anonKey
    "Authorization" = "Bearer $anonKey"
}
Invoke-RestMethod -Uri "https://cdazlztdllykbtfnssma.supabase.co/functions/v1/api/health" -Headers $headers
```

### Using curl:

```powershell
curl -H "apikey: YOUR_ANON_KEY" -H "Authorization: Bearer YOUR_ANON_KEY" https://cdazlztdllykbtfnssma.supabase.co/functions/v1/api/health
```

### Using Browser (with extension):

Install a browser extension like "ModHeader" and add:
- Header: `apikey`
- Value: Your anon key

Then visit: https://cdazlztdllykbtfnssma.supabase.co/functions/v1/api/health

## Expected Response

```json
{
  "status": "ok",
  "service": "supabase-edge-function",
  "timestamp": "2025-12-03T07:07:27.000Z"
}
```

## Test Login Endpoint

```powershell
$body = @{
    tenantSlug = "kreatix"
    pin = "admin123"
    deviceId = "test-device-123"
} | ConvertTo-Json

$headers = @{
    "apikey" = "YOUR_ANON_KEY"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "https://cdazlztdllykbtfnssma.supabase.co/functions/v1/api/auth/login" -Method POST -Body $body -Headers $headers
```

## Update Frontend Config

Once tested, update `apps/frontend/src/config.ts`:

```typescript
const DEFAULT_API_BASE = 'https://cdazlztdllykbtfnssma.supabase.co/functions/v1/api';
```

The frontend will automatically include the API key when making requests if configured properly.

## Troubleshooting

### 401 Unauthorized
- Make sure you're including the `apikey` header
- Verify the anon key is correct

### CORS Errors
- CORS is configured in the function
- Make sure frontend includes proper headers

### Function Not Found
- Check function is deployed: `supabase functions list`
- Verify the URL path is correct

