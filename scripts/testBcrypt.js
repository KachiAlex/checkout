const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const serviceAccountPath = 'C:/Users/opdli/Downloads/checkout-77d99-firebase-adminsdk-fbsvc-6b1319bb97.json';

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
});

const db = admin.firestore();

async function testBcrypt() {
  try {
    console.log('Testing bcrypt comparison...\n');
    
    const snapshot = await db.collection('users')
      .where('email', '==', 'superadmin@checkouthq.com')
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      console.log('User not found');
      return;
    }
    
    const user = snapshot.docs[0].data();
    const pinHash = user.pinHash;
    
    console.log('User found:');
    console.log(`  Email: ${user.email}`);
    console.log(`  pinHash: ${pinHash.substring(0, 30)}...`);
    console.log(`  pinHash length: ${pinHash.length}\n`);
    
    // Test with the password we set
    const testPassword = 'superadmin123';
    console.log(`Testing password: "${testPassword}"`);
    
    // Test with Node.js bcrypt (what we used to create it)
    const isValidNode = await bcrypt.compare(testPassword, pinHash);
    console.log(`Node.js bcrypt result: ${isValidNode ? '✓ VALID' : '✗ INVALID'}\n`);
    
    // Test with bcryptjs (what Supabase uses)
    const bcryptjs = require('bcryptjs');
    const isValidJS = await bcryptjs.compare(testPassword, pinHash);
    console.log(`bcryptjs result: ${isValidJS ? '✓ VALID' : '✗ INVALID'}\n`);
    
    if (!isValidJS) {
      console.log('⚠️  WARNING: bcryptjs comparison failed!');
      console.log('This means the Supabase function will fail to authenticate.');
      console.log('\nPossible solutions:');
      console.log('1. Re-hash the password using bcryptjs');
      console.log('2. Check if there are any encoding issues');
    } else {
      console.log('✓ Both bcrypt implementations work correctly');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testBcrypt();

