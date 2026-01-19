const admin = require("firebase-admin");
const serviceAccount = require("C:/Users/user/Downloads/checkout-77d99-firebase-adminsdk-fbsvc-4501015022.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function main() {
  try {
    const snapshot = await db.collection("tenants").get();
    snapshot.forEach((doc) => {
      console.log(doc.id, doc.data());
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main().then(() => process.exit(0));
