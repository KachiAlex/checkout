const admin = require("firebase-admin");
const bcrypt = require("bcrypt");
const readline = require("readline");

// Update this path to your Firebase service account JSON file
const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  "C:\\Users\\opdli\\Downloads\\checkout-77d99-firebase-adminsdk-fbsvc-6b1319bb97.json";

async function ensureInitialized() {
  if (admin.apps.length === 0) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath)),
      });
      console.log("✓ Firebase Admin initialized");
    } catch (error) {
      console.error("✗ Failed to initialize Firebase Admin:", error.message);
      console.error("\nPlease ensure the service account path is correct:");
      console.error(
        "  Set FIREBASE_SERVICE_ACCOUNT_PATH environment variable, or",
      );
      console.error("  Update the serviceAccountPath in the script");
      process.exit(1);
    }
  }
}

async function findSuperAdminUser(db, email) {
  const usersSnapshot = await db
    .collection("users")
    .where("email", "==", email.toLowerCase().trim())
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

  await db.collection("users").doc(userId).update({
    pinHash,
    updatedAt: now,
  });

  return pinHash;
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query) =>
    new Promise((resolve) => rl.question(query, resolve));

  try {
    await ensureInitialized();
    const db = admin.firestore();

    console.log("\n=== Reset Superadmin Password ===\n");

    // Get email
    const email =
      (await question(
        "Enter superadmin email (default: superadmin@checkouthq.com): ",
      )) || "superadmin@checkouthq.com";

    // Find user
    console.log(`\nLooking for user with email: ${email}...`);
    const user = await findSuperAdminUser(db, email);

    if (!user) {
      console.error(`\n✗ User not found with email: ${email}`);
      console.log("\nAvailable superadmin emails to try:");
      console.log("  - superadmin@checkouthq.com");
      console.log("  - onyedika.akoma@gmail.com");
      rl.close();
      process.exit(1);
    }

    if (!user.isPlatformAdmin) {
      console.error(
        `\n✗ User found but is not a platform admin: ${user.email}`,
      );
      rl.close();
      process.exit(1);
    }

    console.log(`✓ Found superadmin user: ${user.name || user.email}`);
    console.log(`  User ID: ${user.id}`);
    console.log(`  Tenant ID: ${user.tenantId}`);

    // Get new password
    const newPassword =
      (await question(
        '\nEnter new password (or press Enter for "superadmin123"): ',
      )) || "superadmin123";

    // Confirm
    const confirm = await question(
      `\nReset password to "${newPassword}"? (yes/no): `,
    );
    if (confirm.toLowerCase() !== "yes" && confirm.toLowerCase() !== "y") {
      console.log("\n✗ Password reset cancelled");
      rl.close();
      process.exit(0);
    }

    // Reset password
    console.log("\nResetting password...");
    await resetSuperAdminPassword(db, user.id, newPassword);
    console.log("✓ Password reset successfully!\n");

    // Get tenant info
    const tenantDoc = await db.collection("tenants").doc(user.tenantId).get();
    const tenant = tenantDoc.exists ? tenantDoc.data() : null;

    console.log("=== Login Credentials ===");
    console.log(`Email: ${user.email}`);
    console.log(`Password: ${newPassword}`);
    console.log(`Tenant Slug: ${tenant?.slug || "platform"}`);
    console.log("\n✓ You can now log in with these credentials\n");
  } catch (error) {
    console.error("\n✗ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
