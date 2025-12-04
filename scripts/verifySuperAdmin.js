const admin = require('firebase-admin');
const bcrypt = require('bcrypt');

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
  'C:/Users/opdli/Downloads/checkout-77d99-firebase-adminsdk-fbsvc-6b1319bb97.json';

const SUPERADMIN_EMAIL = 'onyedika.akoma@gmail.com';

async function ensureInitialized() {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(require(serviceAccountPath)),
    });
    console.log('✓ Firebase Admin initialized');
  }
}

async function verifySuperAdmin() {
  await ensureInitialized();
  const db = admin.firestore();

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  Verify Superadmin User                                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Find all platform admins
  const platformAdmins = await db.collection('users')
    .where('isPlatformAdmin', '==', true)
    .get();

  console.log(`Found ${platformAdmins.size} platform admin user(s):\n`);

  if (platformAdmins.empty) {
    console.log('❌ No platform admin users found!');
    return;
  }

  platformAdmins.docs.forEach((doc, index) => {
    const user = doc.data();
    console.log(`${index + 1}. User ID: ${doc.id}`);
    console.log(`   Name: ${user.name || 'N/A'}`);
    console.log(`   Email: ${user.email || 'MISSING'}`);
    console.log(`   isPlatformAdmin: ${user.isPlatformAdmin}`);
    console.log(`   Tenant ID: ${user.tenantId || 'MISSING'}`);
    console.log(`   Has Password: ${!!user.pinHash}`);
    console.log('');
  });

  // Check for the specific email
  const emailQuery = await db.collection('users')
    .where('email', '==', SUPERADMIN_EMAIL.toLowerCase())
    .get();

  console.log(`\nSearching for email: ${SUPERADMIN_EMAIL.toLowerCase()}`);
  if (emailQuery.empty) {
    console.log('❌ No user found with this email!');
    console.log('\nTo fix this, run: node scripts/initializeFreshDatabase.js');
  } else {
    const userDoc = emailQuery.docs[0];
    const user = userDoc.data();
    console.log('✓ User found:');
    console.log(`  ID: ${userDoc.id}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  isPlatformAdmin: ${user.isPlatformAdmin}`);
    console.log(`  Tenant ID: ${user.tenantId}`);
    
    if (!user.isPlatformAdmin) {
      console.log('\n⚠️  User exists but isPlatformAdmin is false!');
      console.log('Updating...');
      await db.collection('users').doc(userDoc.id).update({
        isPlatformAdmin: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('✓ Updated isPlatformAdmin to true');
    }
  }
}

verifySuperAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n✗ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  });

