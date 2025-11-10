const admin = require('firebase-admin');

const serviceAccountPath = 'C:/Users/user/Downloads/checkout-77d99-firebase-adminsdk-fbsvc-4501015022.json';

async function ensureInitialized() {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(require(serviceAccountPath)),
    });
  }
}

async function main() {
  await ensureInitialized();

  const db = admin.firestore();
  const snapshot = await db
    .collection('users')
    .where('email', '==', 'onyedika.akoma@gmail.com')
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.log('No user found');
    return;
  }

  const doc = snapshot.docs[0];
  console.log(JSON.stringify({ id: doc.id, data: doc.data() }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

