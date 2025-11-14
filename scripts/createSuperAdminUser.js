const admin = require('firebase-admin');
const bcrypt = require('bcrypt');

const serviceAccountPath = 'C:/Users/user/Downloads/checkout-77d99-firebase-adminsdk-fbsvc-4501015022.json';

async function ensureInitialized() {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(require(serviceAccountPath)),
    });
  }
}

async function getPlatformTenantId(db) {
  const snapshot = await db.collection('tenants').where('slug', '==', 'platform').limit(1).get();
  if (snapshot.empty) {
    throw new Error('Platform tenant not found. Seed the platform tenant before creating a super admin.');
  }
  return snapshot.docs[0].id;
}

async function upsertSuperAdminUser(db, tenantId, email, name, pin) {
  const usersCollection = db.collection('users');
  const existing = await usersCollection.where('email', '==', email).limit(1).get();
  const pinHash = await bcrypt.hash(pin, 10);
  const now = admin.firestore.FieldValue.serverTimestamp();

  if (!existing.empty) {
    const doc = existing.docs[0];
    await usersCollection.doc(doc.id).set(
      {
        name,
        pinHash,
        tenantId,
        isPlatformAdmin: true,
        role: 'admin',
        updatedAt: now,
      },
      { merge: true },
    );
    return {
      id: doc.id,
      created: false,
    };
  }

  const docRef = await usersCollection.add({
    name,
    email,
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

  return {
    id: docRef.id,
    created: true,
  };
}

async function main() {
  await ensureInitialized();
  const db = admin.firestore();

  const tenantId = await getPlatformTenantId(db);
  const email = 'superadmin@checkouthq.com';
  const name = 'Checkout Platform Super Admin';
  const pin = 'superadmin';

  const result = await upsertSuperAdminUser(db, tenantId, email, name, pin);

  console.log(
    JSON.stringify(
      {
        tenantSlug: 'platform',
        superAdminEmail: email,
        superAdminPin: pin,
        userId: result.id,
        created: result.created,
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

