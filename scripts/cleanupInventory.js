const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

function getProjectId() {
  // Try environment variable first
  if (process.env.FIREBASE_PROJECT_ID) {
    return process.env.FIREBASE_PROJECT_ID;
  }

  // Try to read from .firebaserc
  try {
    const firebasercPath = path.join(__dirname, "..", ".firebaserc");
    if (fs.existsSync(firebasercPath)) {
      const firebaserc = JSON.parse(fs.readFileSync(firebasercPath, "utf8"));
      const defaultProject = firebaserc.projects?.default;
      const checkoutProject = firebaserc.projects?.checkout;
      return (
        defaultProject ||
        checkoutProject ||
        Object.values(firebaserc.projects || {})[0]
      );
    }
  } catch (error) {
    // Ignore errors reading .firebaserc
  }

  return null;
}

async function ensureInitialized() {
  if (admin.apps.length === 0) {
    // Try to use environment variables first
    let projectId = process.env.FIREBASE_PROJECT_ID || getProjectId();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    // Check for Firestore emulator
    const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

    if (emulatorHost) {
      // Use emulator
      if (!projectId) {
        projectId = "demo-pos-checkout";
      }
      process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
      process.env.GCLOUD_PROJECT = projectId;
      admin.initializeApp({
        projectId,
      });
      console.log(
        `Using Firestore emulator at ${emulatorHost} with project ${projectId}`,
      );
    } else if (projectId && clientEmail && privateKey) {
      // Use service account from environment variables
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
        projectId,
      });
      console.log(`Using Firebase project: ${projectId}`);
    } else {
      // Try to use default credentials (requires firebase login or service account)
      try {
        if (!projectId) {
          projectId = getProjectId() || "checkout-77d99";
        }
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId,
        });
        console.log(`Using default credentials with project: ${projectId}`);
      } catch (error) {
        console.error("Failed to initialize Firebase Admin SDK.");
        console.error("Please either:");
        console.error(
          "1. Set environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY",
        );
        console.error("2. Set FIRESTORE_EMULATOR_HOST to use the emulator");
        console.error('3. Run "firebase login" and use default credentials');
        throw error;
      }
    }
  }
}

async function getAllInventory(db) {
  const snapshot = await db.collection("inventory").get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

async function findDuplicates(db) {
  const allInventory = await getAllInventory(db);
  const groups = new Map();

  // Group by productId + locationId
  for (const record of allInventory) {
    const key = `${record.productId}:${record.locationId}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(record);
  }

  // Filter to only groups with duplicates
  const duplicates = [];
  for (const [key, records] of groups.entries()) {
    if (records.length > 1) {
      // Sort by createdAt to keep the first one
      records.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? a.createdAt?.seconds ?? 0;
        const bTime = b.createdAt?.toMillis?.() ?? b.createdAt?.seconds ?? 0;
        return aTime - bTime;
      });
      duplicates.push({ key, records });
    }
  }

  return duplicates;
}

async function removeDuplicates(db) {
  const duplicates = await findDuplicates(db);

  if (duplicates.length === 0) {
    console.log("No duplicates found.");
    return { removed: 0, kept: 0 };
  }

  console.log(`Found ${duplicates.length} duplicate groups.`);

  let removedCount = 0;
  let keptCount = 0;
  let batchCount = 0;
  let currentBatch = db.batch();
  let currentBatchOps = 0;

  for (const { records, key } of duplicates) {
    // Keep the first one (oldest), remove the rest
    const [keep, ...toRemove] = records;
    keptCount++;

    console.log(
      `Group ${key}: Keeping ${keep.id}, removing ${toRemove.length} duplicates`,
    );

    for (const record of toRemove) {
      if (currentBatchOps >= 500) {
        await currentBatch.commit();
        batchCount++;
        currentBatch = db.batch();
        currentBatchOps = 0;
      }
      currentBatch.delete(db.collection("inventory").doc(record.id));
      currentBatchOps++;
      removedCount++;
    }
  }

  if (currentBatchOps > 0) {
    await currentBatch.commit();
    batchCount++;
  }

  return { removed: removedCount, kept: keptCount, batches: batchCount };
}

async function clearAllInventory(db) {
  const snapshot = await db.collection("inventory").get();
  const totalCount = snapshot.size;

  if (totalCount === 0) {
    console.log("No inventory records to clear.");
    return 0;
  }

  console.log(`Clearing ${totalCount} inventory records...`);

  const batches = [];
  let currentBatch = db.batch();
  let currentBatchOps = 0;
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    if (currentBatchOps >= 500) {
      batches.push(currentBatch);
      currentBatch = db.batch();
      currentBatchOps = 0;
    }
    currentBatch.delete(doc.ref);
    currentBatchOps++;
  }

  if (currentBatchOps > 0) {
    batches.push(currentBatch);
  }

  // Commit all batches
  for (const batch of batches) {
    await batch.commit();
    batchCount++;
    console.log(`Committed batch ${batchCount}/${batches.length}`);
  }

  return totalCount;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "duplicates";

  await ensureInitialized();
  const db = admin.firestore();

  try {
    switch (command) {
      case "duplicates":
        console.log("Finding duplicates...");
        const duplicates = await findDuplicates(db);
        if (duplicates.length === 0) {
          console.log("No duplicates found.");
        } else {
          console.log(`Found ${duplicates.length} duplicate groups:`);
          duplicates.forEach(({ key, records }) => {
            console.log(`  ${key}: ${records.length} records`);
            records.forEach((r, i) => {
              console.log(
                `    ${i === 0 ? "[KEEP]" : "[REMOVE]"} ${r.id} - qty: ${r.quantity}, created: ${r.createdAt?.toDate?.() || r.createdAt || "unknown"}`,
              );
            });
          });
        }
        break;

      case "remove-duplicates":
        console.log("Removing duplicates...");
        const result = await removeDuplicates(db);
        console.log(
          `Removed ${result.removed} duplicate records, kept ${result.kept} records.`,
        );
        console.log(`Committed ${result.batches} batch(es).`);
        break;

      case "clear-all":
        console.log("WARNING: This will delete ALL inventory records!");
        const count = await clearAllInventory(db);
        console.log(`Cleared ${count} inventory records.`);
        break;

      default:
        console.log("Usage: node cleanupInventory.js [command]");
        console.log("Commands:");
        console.log(
          "  duplicates         - Find duplicate inventory entries (default)",
        );
        console.log(
          "  remove-duplicates  - Remove duplicate inventory entries",
        );
        console.log("  clear-all          - Clear ALL inventory records");
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("Done.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
