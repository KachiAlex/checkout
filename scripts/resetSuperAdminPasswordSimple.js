const admin = require('firebase-admin');
const bcrypt = require('bcrypt');

// Update this path to your Firebase service account JSON file
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
  'C:/Users/opdli/Downloads/checkout-77d99-firebase-adminsdk-fbsvc-6b1319bb97.json';

// Default password to set (change this if needed)
const NEW_PASSWORD = process.env.NEW_PASSWORD || 'superadmin123';

// Superadmin email to reset
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'superadmin@checkouthq.com';

async function ensureInitialized() {
  if (admin.apps.length === 0) {
    try {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✓ Firebase Admin initialized');
    } catch (error) {
      console.error('✗ Failed to initialize Firebase Admin:', error.message);
      console.error('\nPlease ensure the service account path is correct:');
      console.error('  Path:', serviceAccountPath);
      console.error('  You can set FIREBASE_SERVICE_ACCOUNT_PATH environment variable.');
      process.exit(1);
    }
  }
}

async function findSuperAdminUser(db, email) {
  const usersSnapshot = await db.collection('users')
    .where('email', '==', email.toLowerCase().trim())
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    return null;
  }

  const doc = usersSnapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  };
}

async function resetSuperAdminPassword(db, userId, newPassword) {
  const pinHash = await bcrypt.hash(newPassword, 10);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.collection('users').doc(userId).update({
    pinHash,
    updatedAt: now,
  });

  return pinHash;
}

async function main() {
  try {
    await ensureInitialized();
    const db = admin.firestore();

    console.log('\n=== Reset Superadmin Password ===\n');
    console.log(`Looking for user with email: ${SUPERADMIN_EMAIL}...`);

    // Find user
    const user = await findSuperAdminUser(db, SUPERADMIN_EMAIL);

    if (!user) {
      console.error(`\n✗ User not found with email: ${SUPERADMIN_EMAIL}`);
      console.log('\nTrying alternative email: onyedika.akoma@gmail.com...');
      
      const altUser = await findSuperAdminUser(db, 'onyedika.akoma@gmail.com');
      if (!altUser) {
        console.error('✗ No superadmin users found.');
        console.log('\nAvailable superadmin emails to try:');
        console.log('  - superadmin@checkouthq.com');
        console.log('  - onyedika.akoma@gmail.com');
        process.exit(1);
      }
      
      // Use the alternative user
      const altUserId = altUser.id;
      console.log(`✓ Found superadmin user: ${altUser.name || altUser.email}`);
      console.log(`  User ID: ${altUserId}`);
      console.log(`  Tenant ID: ${altUser.tenantId}`);
      
      console.log(`\nResetting password to: ${NEW_PASSWORD}...`);
      await resetSuperAdminPassword(db, altUserId, NEW_PASSWORD);
      console.log('✓ Password reset successfully!\n');

      // Get tenant info
      const tenantDoc = await db.collection('tenants').doc(altUser.tenantId).get();
      const tenant = tenantDoc.exists ? tenantDoc.data() : null;

      console.log('=== Login Credentials ===');
      console.log(`Email: ${altUser.email}`);
      console.log(`Password: ${NEW_PASSWORD}`);
      console.log(`Tenant Slug: ${tenant?.slug || 'platform'}`);
      console.log('\n✓ You can now log in with these credentials\n');
      return;
    }

    if (!user.isPlatformAdmin) {
      console.error(`\n✗ User found but is not a platform admin: ${user.email}`);
      process.exit(1);
    }

    console.log(`✓ Found superadmin user: ${user.name || user.email}`);
    console.log(`  User ID: ${user.id}`);
    console.log(`  Tenant ID: ${user.tenantId}`);

    // Reset password
    console.log(`\nResetting password to: ${NEW_PASSWORD}...`);
    await resetSuperAdminPassword(db, user.id, NEW_PASSWORD);
    console.log('✓ Password reset successfully!\n');

    // Get tenant info
    const tenantDoc = await db.collection('tenants').doc(user.tenantId).get();
    const tenant = tenantDoc.exists ? tenantDoc.data() : null;

    console.log('=== Login Credentials ===');
    console.log(`Email: ${user.email}`);
    console.log(`Password: ${NEW_PASSWORD}`);
    console.log(`Tenant Slug: ${tenant?.slug || 'platform'}`);
    console.log('\n✓ You can now log in with these credentials\n');

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

