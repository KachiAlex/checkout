const admin = require('firebase-admin');
const bcrypt = require('bcrypt');

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
  'C:/Users/opdli/Downloads/checkout-77d99-firebase-adminsdk-fbsvc-6b1319bb97.json';

const SUPERADMIN_EMAIL = 'onyedika.akoma@gmail.com';
const SUPERADMIN_NAME = 'Onyedika Akoma';
const SUPERADMIN_PASSWORD = 'admin123';
const PLATFORM_TENANT_SLUG = 'platform';

async function ensureInitialized() {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(require(serviceAccountPath)),
    });
    console.log('✓ Firebase Admin initialized');
  }
}

async function createPlatformTenant(db) {
  console.log('Creating platform tenant...');
  const now = admin.firestore.FieldValue.serverTimestamp();
  const tenantRef = await db.collection('tenants').add({
    name: 'Checkout Platform',
    slug: PLATFORM_TENANT_SLUG,
    plan: 'lifetime',
    status: 'active',
    seatLimit: 1000,
    contactEmail: SUPERADMIN_EMAIL,
    metadata: {
      notes: 'Platform tenant for multi-tenant administration',
      createdAt: new Date().toISOString(),
    },
    createdAt: now,
    updatedAt: now,
  });
  
  const tenant = (await tenantRef.get()).data();
  console.log(`✓ Platform tenant created: ${tenantRef.id}`);
  return tenantRef.id;
}

async function createSuperAdminUser(db, tenantId) {
  console.log('Creating superadmin user...');
  const pinHash = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);
  const now = admin.firestore.FieldValue.serverTimestamp();
  
  const userRef = await db.collection('users').add({
    name: SUPERADMIN_NAME,
    email: SUPERADMIN_EMAIL.toLowerCase(),
    role: 'admin',
    pinHash,
    tenantId,
    isPlatformAdmin: true,
    deviceId: null,
    locationId: null,
    publicKey: null,
    createdAt: now,
    updatedAt: now,
  });
  
  const user = (await userRef.get()).data();
  console.log(`✓ Superadmin user created: ${userRef.id}`);
  return userRef.id;
}

async function main() {
  try {
    await ensureInitialized();
    const db = admin.firestore();

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  Initialize Fresh Database                                ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    const tenantId = await createPlatformTenant(db);
    const userId = await createSuperAdminUser(db, tenantId);

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ Setup Complete!                                      ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    
    console.log('=== Login Credentials ===');
    console.log(`Email: ${SUPERADMIN_EMAIL}`);
    console.log(`Password: ${SUPERADMIN_PASSWORD}`);
    console.log(`Tenant Slug: ${PLATFORM_TENANT_SLUG}\n`);
    
    console.log('=== Account Details ===');
    console.log(`User ID: ${userId}`);
    console.log(`Tenant ID: ${tenantId}\n`);
    
    console.log('✓ Database initialized. You can now log in.\n');

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

