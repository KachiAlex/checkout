# How to Run Product ID Migration Script

## Prerequisites

1. **Node.js** (v20 or higher) - Already installed ✅
2. **Firebase Admin SDK dependencies** - Need to install if not available
3. **Firebase credentials** - Environment variables or service account

## Step 1: Install Dependencies (if needed)

The script requires `firebase-admin` and `uuid` packages. Since this is a monorepo, you can either:

### Option A: Install at root level (Recommended)

```powershell
npm install firebase-admin uuid
```

### Option B: Use backend's dependencies

The backend already has these packages. You can run the script from the backend directory:

```powershell
cd apps/backend
node ../../scripts/migrateProductIdsToUUID.js
```

## Step 2: Set Up Firebase Credentials

You have three options:

### Option 1: Use Environment Variables (Recommended for production)

Set these environment variables (same as your Render backend):

```powershell
$env:FIREBASE_PROJECT_ID = "checkout-77d99"
$env:FIREBASE_CLIENT_EMAIL = "your-client-email@checkout-77d99.iam.gserviceaccount.com"
$env:FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Option 2: Use Firebase Login (for local development)

```powershell
firebase login
```

This will use application default credentials.

### Option 3: Use Service Account JSON File

If you have a service account JSON file, you can modify the script to use it, or set:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "path\to\your\service-account-key.json"
```

## Step 3: Run the Migration Script

### Migrate All Tenants

```powershell
npm run migrate:product-ids
```

Or directly:

```powershell
node scripts/migrateProductIdsToUUID.js
```

### Migrate Specific Tenant

```powershell
node scripts/migrateProductIdsToUUID.js YOUR_TENANT_ID
```

## What the Script Does

1. ✅ Finds all products with non-UUID IDs
2. ✅ For each product:
   - Creates a new product document with a UUID ID
   - Updates all references in:
     - `inventory` collection
     - `batch_inventory` collection
     - `orders` collection (items array)
     - `purchase_orders` collection (items array)
     - `grn` collection (items array)
     - `returns` collection (items array)
   - Deletes the old product document
3. ✅ Reports progress and summary

## Example Output

```
🚀 Starting Product ID Migration
================================

Using Firebase project: checkout-77d99
Found 1 tenant(s) to process

🔍 Processing tenant: tenant-abc123
   Found 5 products with valid UUIDs
   Found 10 products with invalid IDs

   📦 Migrating product: iPhone 17 (old-id-123)
      New ID: 550e8400-e29b-41d4-a716-446655440000
      ✅ Created new product document
      ✅ Updated 3 inventory records
      ✅ Updated 1 batch inventory records
      ✅ Updated 5 order records
      ✅ Updated 2 purchase order records
      ✅ Updated 0 GRN records
      ✅ Updated 0 return records
      ✅ Deleted old product document
      ✨ Successfully migrated: iPhone 17

================================
✨ Migration Complete!
   Total products migrated: 10
   Total errors: 0
================================
```

## Troubleshooting

### Error: "Cannot find module 'firebase-admin'"

**Solution:** Install dependencies:

```powershell
npm install firebase-admin uuid
```

### Error: "Failed to initialize Firebase Admin SDK"

**Solution:** Make sure environment variables are set correctly, or run `firebase login`

### Error: "Permission denied"

**Solution:** Ensure your Firebase credentials have Firestore read/write permissions

## Important Notes

⚠️ **Backup First**: Consider backing up your Firestore database before running the migration

⚠️ **Test First**: If possible, test on a single tenant first:

```powershell
node scripts/migrateProductIdsToUUID.js YOUR_TEST_TENANT_ID
```

⚠️ **One-Time Operation**: This script is designed to be run once. After migration, all products will have valid UUID IDs.
