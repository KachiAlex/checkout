# Supabase Edge Functions Migration

This directory contains the Supabase Edge Functions implementation for migrating from Firebase Cloud Functions.

## Structure

```
supabase/
├── functions/
│   ├── api/              # Main API function
│   │   └── index.ts      # Entry point
│   ├── handlers/         # Route handlers
│   │   ├── auth.ts
│   │   ├── products.ts
│   │   ├── orders.ts
│   │   ├── inventory.ts
│   │   └── reports.ts
│   └── _shared/          # Shared utilities
│       ├── cors.ts
│       ├── firebase.ts
│       ├── firestore.ts
│       ├── auth.ts
│       └── request.ts
└── config.toml           # Supabase configuration
```

## Setup

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link to your project

```bash
supabase link --project-ref your-project-id
```

### 4. Set environment variables (secrets)

```bash
# Firebase credentials
supabase secrets set FIREBASE_PROJECT_ID=checkout-77d99
supabase secrets set FIREBASE_CLIENT_EMAIL=your-service-account@checkout-77d99.iam.gserviceaccount.com
supabase secrets set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# JWT secret
supabase secrets set JWT_SECRET=your-jwt-secret
```

### 5. Deploy functions

```bash
supabase functions deploy api
```

## Local Development

### Start Supabase locally

```bash
supabase start
```

### Test functions locally

```bash
supabase functions serve api
```

## Migration Status

- [x] Project structure created
- [x] CORS configuration
- [x] Firebase Admin SDK setup
- [x] Auth handler (login implemented)
- [x] Products handler (full CRUD)
- [x] Orders handler (create, list, get, update)
- [ ] Inventory handler (placeholder)
- [ ] Reports handler (placeholder)
- [ ] All other handlers (Users, Customers, Suppliers, etc.)
- [ ] Frontend configuration update
- [ ] Testing and deployment

## Notes

- Supabase Edge Functions use Deno, not Node.js
- We're using Firebase Admin SDK via ESM imports
- All handlers need to be ported from NestJS controllers
- Authentication uses JWT tokens (same as before)

## Next Steps

1. ✅ Install Supabase CLI
2. ✅ Login and link project (`cdazlztdllykbtfnssma`)
3. ⏳ Set secrets (Firebase credentials, JWT secret)
4. ⏳ Deploy functions
5. ⏳ Test endpoints
6. ⏳ Update frontend config
7. ⏳ Deploy frontend
8. ⏳ Monitor usage

## Your Function URL

After deployment, your function will be available at:
```
https://cdazlztdllykbtfnssma.supabase.co/functions/v1/api
```

See `SETUP_SUPABASE.md` for complete setup instructions.

