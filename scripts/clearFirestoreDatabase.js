const admin = require('firebase-admin');
const readline = require('readline');

// Update this path to your Firebase service account JSON file
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
  'C:/Users/opdli/Downloads/checkout-77d99-firebase-adminsdk-fbsvc-6b1319bb97.json';

async function ensureInitialized() {
  if (admin.apps.length === 0) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath)),
      });
      console.log('✓ Firebase Admin initialized');
    } catch (error) {
      console.error('✗ Failed to initialize Firebase Admin:', error.message);
      process.exit(1);
    }
  }
}

async function deleteCollection(db, collectionPath, batchSize = 100) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve, reject);
  });
}

async function deleteQueryBatch(db, query, resolve, reject) {
  query.get()
    .then((snapshot) => {
      // When there are no documents left, we are done
      if (snapshot.size === 0) {
        return 0;
      }

      // Delete documents in a batch
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      return batch.commit().then(() => {
        return snapshot.size;
      });
    })
    .then((numDeleted) => {
      if (numDeleted === 0) {
        resolve();
        return;
      }
      // Recurse on the next process tick, to avoid
      // exploding the stack.
      process.nextTick(() => {
        deleteQueryBatch(db, query, resolve, reject);
      });
    })
    .catch(reject);
}

async function clearDatabase() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  try {
    await ensureInitialized();
    const db = admin.firestore();

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  ⚠️  CLEAR FIRESTORE DATABASE                            ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    
    console.log('⚠️  WARNING: This will DELETE ALL DATA from Firestore!');
    console.log('   This includes:');
    console.log('   - All users');
    console.log('   - All tenants');
    console.log('   - All products');
    console.log('   - All orders');
    console.log('   - All inventory');
    console.log('   - All customers');
    console.log('   - All suppliers');
    console.log('   - All locations');
    console.log('   - ALL OTHER COLLECTIONS\n');

    const confirm1 = await question('Type "DELETE ALL" to confirm: ');
    if (confirm1 !== 'DELETE ALL') {
      console.log('\n✗ Operation cancelled - confirmation text did not match');
      rl.close();
      process.exit(0);
    }

    const confirm2 = await question('\n⚠️  Are you ABSOLUTELY SURE? Type "YES" to proceed: ');
    if (confirm2 !== 'YES') {
      console.log('\n✗ Operation cancelled');
      rl.close();
      process.exit(0);
    }

    console.log('\n=== Clearing Firestore Database ===\n');

    // List of collections to clear
    const collections = [
      'users',
      'tenants',
      'products',
      'orders',
      'inventory',
      'customers',
      'suppliers',
      'locations',
      'purchaseOrders',
      'grn',
      'reports',
      'settings',
      'notifications',
    ];

    for (const collection of collections) {
      try {
        console.log(`Deleting collection: ${collection}...`);
        await deleteCollection(db, collection);
        console.log(`✓ Deleted collection: ${collection}`);
      } catch (error) {
        console.error(`✗ Error deleting ${collection}:`, error.message);
        // Continue with other collections even if one fails
      }
    }

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ Database Cleared Successfully                        ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    
    console.log('All collections have been cleared.');
    console.log('You can now rebuild your database from scratch.\n');

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    rl.close();
  }
}

clearDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

