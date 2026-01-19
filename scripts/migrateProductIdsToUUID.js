/**
 * Migration script to fix product IDs that are not UUIDs
 *
 * This script:
 * 1. Finds all products with non-UUID IDs
 * 2. Creates new product documents with UUID IDs
 * 3. Updates all references in inventory, orders, purchase_orders, grn, returns
 * 4. Deletes old product documents
 *
 * Usage:
 *   node scripts/migrateProductIdsToUUID.js [tenantId]
 *
 * If tenantId is not provided, it will process all tenants
 */

const admin = require("firebase-admin");
const { v4: uuid } = require("uuid");
const path = require("path");
const fs = require("fs");

// Initialize Firebase Admin (similar to cleanupInventory.js)
function getProjectId() {
  if (process.env.FIREBASE_PROJECT_ID) {
    return process.env.FIREBASE_PROJECT_ID;
  }

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
  } catch (e) {
    // Ignore errors reading .firebaserc
  }

  return null;
}

async function ensureInitialized() {
  if (admin.apps.length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID || getProjectId();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

    if (emulatorHost) {
      const projId = projectId || "demo-pos-checkout";
      process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
      process.env.GCLOUD_PROJECT = projId;
      admin.initializeApp({ projectId: projId });
      console.log(
        `Using Firestore emulator at ${emulatorHost} with project ${projId}`,
      );
    } else if (projectId && clientEmail && privateKey) {
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
      try {
        const projId = projectId || getProjectId() || "checkout-77d99";
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: projId,
        });
        console.log(`Using default credentials with project: ${projId}`);
      } catch (error) {
        console.error("Failed to initialize Firebase Admin SDK.");
        console.error(
          "Please set: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY",
        );
        throw error;
      }
    }
  }
}

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(str) {
  return UUID_REGEX.test(str);
}

async function migrateProductsForTenant(tenantId, db) {
  console.log(`\n🔍 Processing tenant: ${tenantId}`);

  const productsRef = db.collection("products");
  const productsSnapshot = await productsRef
    .where("tenantId", "==", tenantId)
    .get();

  const invalidProducts = [];
  const validProducts = [];

  productsSnapshot.forEach((doc) => {
    const productId = doc.id;
    if (!isValidUUID(productId)) {
      invalidProducts.push({ id: productId, data: doc.data() });
    } else {
      validProducts.push(productId);
    }
  });

  console.log(`   Found ${validProducts.length} products with valid UUIDs`);
  console.log(`   Found ${invalidProducts.length} products with invalid IDs`);

  if (invalidProducts.length === 0) {
    console.log(`   ✅ No migration needed for tenant ${tenantId}`);
    return { migrated: 0, errors: 0 };
  }

  let migrated = 0;
  let errors = 0;

  for (const oldProduct of invalidProducts) {
    try {
      console.log(
        `\n   📦 Migrating product: ${oldProduct.data.name} (${oldProduct.id})`,
      );

      // Generate new UUID
      const newProductId = uuid();
      console.log(`      New ID: ${newProductId}`);

      // Create new product document
      const newProductRef = productsRef.doc(newProductId);
      await newProductRef.set({
        ...oldProduct.data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`      ✅ Created new product document`);

      // Update inventory references
      const inventorySnapshot = await db
        .collection("inventory")
        .where("productId", "==", oldProduct.id)
        .get();

      const inventoryUpdates = [];
      inventorySnapshot.forEach((doc) => {
        inventoryUpdates.push(doc.ref.update({ productId: newProductId }));
      });

      if (inventoryUpdates.length > 0) {
        await Promise.all(inventoryUpdates);
        console.log(
          `      ✅ Updated ${inventoryUpdates.length} inventory records`,
        );
      }

      // Update batch_inventory references
      const batchInventorySnapshot = await db
        .collection("batch_inventory")
        .where("productId", "==", oldProduct.id)
        .get();

      const batchInventoryUpdates = [];
      batchInventorySnapshot.forEach((doc) => {
        batchInventoryUpdates.push(doc.ref.update({ productId: newProductId }));
      });

      if (batchInventoryUpdates.length > 0) {
        await Promise.all(batchInventoryUpdates);
        console.log(
          `      ✅ Updated ${batchInventoryUpdates.length} batch inventory records`,
        );
      }

      // Update order item references
      const ordersSnapshot = await db.collection("orders").get();
      const orderUpdates = [];

      ordersSnapshot.forEach((orderDoc) => {
        const orderData = orderDoc.data();
        if (orderData.items && Array.isArray(orderData.items)) {
          let needsUpdate = false;
          const updatedItems = orderData.items.map((item) => {
            if (item.productId === oldProduct.id) {
              needsUpdate = true;
              return { ...item, productId: newProductId };
            }
            return item;
          });

          if (needsUpdate) {
            orderUpdates.push(orderDoc.ref.update({ items: updatedItems }));
          }
        }
      });

      if (orderUpdates.length > 0) {
        await Promise.all(orderUpdates);
        console.log(`      ✅ Updated ${orderUpdates.length} order records`);
      }

      // Update purchase order item references
      const poSnapshot = await db.collection("purchase_orders").get();
      const poUpdates = [];

      poSnapshot.forEach((poDoc) => {
        const poData = poDoc.data();
        if (poData.items && Array.isArray(poData.items)) {
          let needsUpdate = false;
          const updatedItems = poData.items.map((item) => {
            if (item.productId === oldProduct.id) {
              needsUpdate = true;
              return { ...item, productId: newProductId };
            }
            return item;
          });

          if (needsUpdate) {
            poUpdates.push(poDoc.ref.update({ items: updatedItems }));
          }
        }
      });

      if (poUpdates.length > 0) {
        await Promise.all(poUpdates);
        console.log(
          `      ✅ Updated ${poUpdates.length} purchase order records`,
        );
      }

      // Update GRN item references
      const grnSnapshot = await db.collection("grn").get();
      const grnUpdates = [];

      grnSnapshot.forEach((grnDoc) => {
        const grnData = grnDoc.data();
        if (grnData.items && Array.isArray(grnData.items)) {
          let needsUpdate = false;
          const updatedItems = grnData.items.map((item) => {
            if (item.productId === oldProduct.id) {
              needsUpdate = true;
              return { ...item, productId: newProductId };
            }
            return item;
          });

          if (needsUpdate) {
            grnUpdates.push(grnDoc.ref.update({ items: updatedItems }));
          }
        }
      });

      if (grnUpdates.length > 0) {
        await Promise.all(grnUpdates);
        console.log(`      ✅ Updated ${grnUpdates.length} GRN records`);
      }

      // Update return item references
      const returnsSnapshot = await db.collection("returns").get();
      const returnUpdates = [];

      returnsSnapshot.forEach((returnDoc) => {
        const returnData = returnDoc.data();
        if (returnData.items && Array.isArray(returnData.items)) {
          let needsUpdate = false;
          const updatedItems = returnData.items.map((item) => {
            if (item.productId === oldProduct.id) {
              needsUpdate = true;
              return { ...item, productId: newProductId };
            }
            return item;
          });

          if (needsUpdate) {
            returnUpdates.push(returnDoc.ref.update({ items: updatedItems }));
          }
        }
      });

      if (returnUpdates.length > 0) {
        await Promise.all(returnUpdates);
        console.log(`      ✅ Updated ${returnUpdates.length} return records`);
      }

      // Delete old product document
      await productsRef.doc(oldProduct.id).delete();
      console.log(`      ✅ Deleted old product document`);

      migrated++;
      console.log(`      ✨ Successfully migrated: ${oldProduct.data.name}`);
    } catch (error) {
      errors++;
      console.error(
        `      ❌ Error migrating product ${oldProduct.id}:`,
        error.message,
      );
    }
  }

  return { migrated, errors };
}

async function getAllTenants(db) {
  const tenantsSnapshot = await db.collection("tenants").get();
  return tenantsSnapshot.docs.map((doc) => doc.id);
}

async function main() {
  await ensureInitialized();
  const db = admin.firestore();

  const tenantId = process.argv[2];

  console.log("🚀 Starting Product ID Migration");
  console.log("================================\n");

  let tenants;
  if (tenantId) {
    tenants = [tenantId];
    console.log(`Target tenant: ${tenantId}`);
  } else {
    tenants = await getAllTenants(db);
    console.log(`Found ${tenants.length} tenant(s) to process`);
  }

  let totalMigrated = 0;
  let totalErrors = 0;

  for (const tenant of tenants) {
    const result = await migrateProductsForTenant(tenant, db);
    totalMigrated += result.migrated;
    totalErrors += result.errors;
  }

  console.log("\n================================");
  console.log("✨ Migration Complete!");
  console.log(`   Total products migrated: ${totalMigrated}`);
  console.log(`   Total errors: ${totalErrors}`);
  console.log("================================\n");

  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
