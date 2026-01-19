const admin = require("firebase-admin");
const serviceAccountPath =
  "C:/Users/opdli/Downloads/checkout-77d99-firebase-adminsdk-fbsvc-6b1319bb97.json";

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
});

const db = admin.firestore();

async function checkSuperAdmin() {
  try {
    console.log("Checking platform admin users...\n");

    const snapshot = await db
      .collection("users")
      .where("isPlatformAdmin", "==", true)
      .get();

    if (snapshot.empty) {
      console.log("No platform admin users found.");
      return;
    }

    console.log(`Found ${snapshot.size} platform admin user(s):\n`);

    for (const doc of snapshot.docs) {
      const user = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`Email: ${user.email || "NOT SET"}`);
      console.log(`Name: ${user.name || "NOT SET"}`);
      console.log(`isPlatformAdmin: ${user.isPlatformAdmin}`);
      console.log(`Has pinHash: ${!!user.pinHash}`);
      if (user.pinHash) {
        console.log(`pinHash length: ${user.pinHash.length}`);
        console.log(`pinHash prefix: ${user.pinHash.substring(0, 30)}...`);
      }
      console.log(`Tenant ID: ${user.tenantId || "NOT SET"}`);
      console.log("---\n");
    }

    // Also check by email
    console.log("\nChecking specific email: superadmin@checkouthq.com");
    const emailSnapshot = await db
      .collection("users")
      .where("email", "==", "superadmin@checkouthq.com")
      .get();

    if (emailSnapshot.empty) {
      console.log("  NOT FOUND");
    } else {
      const user = emailSnapshot.docs[0].data();
      console.log("  FOUND:", {
        id: emailSnapshot.docs[0].id,
        email: user.email,
        isPlatformAdmin: user.isPlatformAdmin,
        hasPinHash: !!user.pinHash,
      });
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

checkSuperAdmin();
