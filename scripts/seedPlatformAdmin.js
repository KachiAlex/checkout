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

async function ensurePlatformTenant(db) {
  const tenantsCollection = db.collection('tenants');
  const existing = await tenantsCollection.where('slug', '==', 'platform').limit(1).get();

  if (!existing.empty) {
    const doc = existing.docs[0];
    return { id: doc.id, created: false };
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const docRef = await tenantsCollection.add({
    name: 'Checkout Platform',
    slug: 'platform',
    plan: 'lifetime',
    status: 'active',
    seatLimit: 1000,
    contactEmail: 'onyedika.akoma@gmail.com',
    metadata: {
      notes: 'Seeded platform tenant for multi-tenant administration',
    },
    createdAt: now,
    updatedAt: now,
  });

  return { id: docRef.id, created: true };
}

async function ensurePlatformAdminUser(db, tenantId) {
  const usersCollection = db.collection('users');
  const existing = await usersCollection
    .where('tenantId', '==', tenantId)
    .where('email', '==', 'onyedika.akoma@gmail.com')
    .limit(1)
    .get();

  if (!existing.empty) {
    const doc = existing.docs[0];
    await usersCollection.doc(doc.id).set(
      {
        isPlatformAdmin: true,
        role: 'admin',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return { id: doc.id, created: false };
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const pinHash = await bcrypt.hash('dikaoliver', 10);

  const docRef = await usersCollection.add({
    name: 'Onyedika Akoma',
    email: 'onyedika.akoma@gmail.com',
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

  return { id: docRef.id, created: true };
}

async function main() {
  await ensureInitialized();
  const db = admin.firestore();

  const tenantResult = await ensurePlatformTenant(db);
  const userResult = await ensurePlatformAdminUser(db, tenantResult.id);

  console.log(
    JSON.stringify(
      {
        tenantId: tenantResult.id,
        tenantCreated: tenantResult.created,
        userId: userResult.id,
        userCreated: userResult.created,
        tenantSlug: 'platform',
        pin: 'dikaoliver',
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

