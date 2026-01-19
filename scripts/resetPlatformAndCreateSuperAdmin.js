const admin = require("firebase-admin");
const bcrypt = require("bcrypt");
const readline = require("readline");

// Update this path to your Firebase service account JSON file
const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  "C:/Users/opdli/Downloads/checkout-77d99-firebase-adminsdk-fbsvc-6b1319bb97.json";

const SUPERADMIN_EMAIL = "onyedika.akoma@gmail.com";
const SUPERADMIN_NAME = "Onyedika Akoma";
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || "admin123";
const PLATFORM_TENANT_SLUG = "platform";

async function ensureInitialized() {
  if (admin.apps.length === 0) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath)),
      });
      console.log("✓ Firebase Admin initialized");
    } catch (error) {
      console.error("✗ Failed to initialize Firebase Admin:", error.message);
      process.exit(1);
    }
  }
}

async function clearPlatformData(db) {
  console.log("\n=== Clearing Platform Data ===\n");

  // Find platform tenant
  const platformTenants = await db
    .collection("tenants")
    .where("slug", "==", PLATFORM_TENANT_SLUG)
    .get();

  let platformTenantId = null;
  if (!platformTenants.empty) {
    platformTenantId = platformTenants.docs[0].id;
    console.log(`Found platform tenant: ${platformTenantId}`);

    // Delete all platform admin users
    const platformUsers = await db
      .collection("users")
      .where("tenantId", "==", platformTenantId)
      .get();

    console.log(`Found ${platformUsers.size} platform users to delete`);
    for (const userDoc of platformUsers.docs) {
      await userDoc.ref.delete();
      console.log(`  Deleted user: ${userDoc.id}`);
    }

    // Delete the platform tenant
    await platformTenants.docs[0].ref.delete();
    console.log(`Deleted platform tenant: ${platformTenantId}`);
  } else {
    console.log("No platform tenant found");
  }

  // Also delete any users with isPlatformAdmin flag (in case tenantId is missing)
  const allPlatformAdmins = await db
    .collection("users")
    .where("isPlatformAdmin", "==", true)
    .get();

  if (allPlatformAdmins.size > 0) {
    console.log(
      `Found ${allPlatformAdmins.size} additional platform admin users to delete`,
    );
    for (const userDoc of allPlatformAdmins.docs) {
      await userDoc.ref.delete();
      console.log(`  Deleted platform admin user: ${userDoc.id}`);
    }
  }

  console.log("✓ Platform data cleared\n");
}

async function createPlatformTenant(db) {
  console.log("=== Creating Platform Tenant ===\n");

  const now = admin.firestore.FieldValue.serverTimestamp();
  const tenantRef = await db.collection("tenants").add({
    name: "Checkout Platform",
    slug: PLATFORM_TENANT_SLUG,
    plan: "lifetime",
    status: "active",
    seatLimit: 1000,
    contactEmail: SUPERADMIN_EMAIL,
    metadata: {
      notes: "Platform tenant for multi-tenant administration",
      createdAt: new Date().toISOString(),
    },
    createdAt: now,
    updatedAt: now,
  });

  const tenantDoc = await tenantRef.get();
  const tenant = tenantDoc.data();

  console.log("✓ Platform tenant created:");
  console.log(`  ID: ${tenantRef.id}`);
  console.log(`  Name: ${tenant.name}`);
  console.log(`  Slug: ${tenant.slug}`);
  console.log(`  Status: ${tenant.status}\n`);

  return tenantRef.id;
}

async function createSuperAdminUser(db, tenantId) {
  console.log("=== Creating Superadmin User ===\n");

  const pinHash = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);
  const now = admin.firestore.FieldValue.serverTimestamp();

  const userRef = await db.collection("users").add({
    name: SUPERADMIN_NAME,
    email: SUPERADMIN_EMAIL.toLowerCase(),
    role: "admin",
    pinHash,
    tenantId,
    isPlatformAdmin: true,
    deviceId: null,
    locationId: null,
    publicKey: null,
    createdAt: now,
    updatedAt: now,
  });

  const userDoc = await userRef.get();
  const user = userDoc.data();

  console.log("✓ Superadmin user created:");
  console.log(`  ID: ${userRef.id}`);
  console.log(`  Name: ${user.name}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Role: ${user.role}`);
  console.log(`  isPlatformAdmin: ${user.isPlatformAdmin}`);
  console.log(`  Tenant ID: ${user.tenantId}\n`);

  return userRef.id;
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

    console.log(
      "\n╔══════════════════════════════════════════════════════════╗",
    );
    console.log("║  Reset Platform & Create Superadmin Account             ║");
    console.log(
      "╚══════════════════════════════════════════════════════════╝\n",
    );

    console.log("This will:");
    console.log("  1. Delete all platform admin users");
    console.log("  2. Delete the platform tenant");
    console.log("  3. Create a new platform tenant");
    console.log("  4. Create a new superadmin user with your email\n");

    console.log("Configuration:");
    console.log(`  Email: ${SUPERADMIN_EMAIL}`);
    console.log(`  Name: ${SUPERADMIN_NAME}`);
    console.log(`  Password: ${SUPERADMIN_PASSWORD}`);
    console.log(`  Tenant Slug: ${PLATFORM_TENANT_SLUG}\n`);

    const confirm = await question(
      "⚠️  This will DELETE existing platform data. Continue? (yes/no): ",
    );
    if (confirm.toLowerCase() !== "yes" && confirm.toLowerCase() !== "y") {
      console.log("\n✗ Operation cancelled");
      rl.close();
      process.exit(0);
    }

    // Clear platform data
    await clearPlatformData(db);

    // Create new platform tenant
    const tenantId = await createPlatformTenant(db);

    // Create new superadmin user
    const userId = await createSuperAdminUser(db, tenantId);

    console.log("╔══════════════════════════════════════════════════════════╗");
    console.log("║  ✅ Setup Complete!                                      ║");
    console.log(
      "╚══════════════════════════════════════════════════════════╝\n",
    );

    console.log("=== Login Credentials ===");
    console.log(`Email: ${SUPERADMIN_EMAIL}`);
    console.log(`Password: ${SUPERADMIN_PASSWORD}`);
    console.log(`Tenant Slug: ${PLATFORM_TENANT_SLUG}\n`);

    console.log("=== Account Details ===");
    console.log(`User ID: ${userId}`);
    console.log(`Tenant ID: ${tenantId}\n`);

    console.log("✓ You can now log in with these credentials\n");
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
