import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { Client } from 'pg';

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

/**
 * Map each Firestore collection to its Prisma table and the columns you want to populate.
 * Add/remove entries here as needed for the rest of your schema (devices, locations, etc.).
 */
type CollectionConfig = {
  name: string;
  table: string;
  columns: string[];
};

const collections: CollectionConfig[] = [
  {
    name: 'tenants',
    table: '"Tenant"',
    columns: [
      'id',
      'name',
      'slug',
      'plan',
      'status',
      'industry',
      'featureFlags',
      'seatLimit',
      'contactEmail',
      'billingCycleStart',
      'billingCycleEnd',
      'metadata',
    ],
  },
  {
    name: 'users',
    table: '"User"',
    columns: [
      'id',
      'name',
      'email',
      'role',
      'pinHash',
      'tenantId',
      'deviceId',
      'locationId',
      'isPlatformAdmin',
    ],
  },
  {
    name: 'locations',
    table: '"Location"',
    columns: ['id', 'tenantId', 'name', 'address', 'phone', 'isDefault', 'metadata'],
  },
  {
    name: 'devices',
    table: '"Device"',
    columns: ['id', 'tenantId', 'locationId', 'name', 'type', 'status', 'lastSeenAt', 'metadata'],
  },
  {
    name: 'brands',
    table: '"Brand"',
    columns: ['id', 'tenantId', 'name', 'description', 'metadata'],
  },
  {
    name: 'categories',
    table: '"Category"',
    columns: ['id', 'tenantId', 'name', 'description', 'parentId', 'metadata'],
  },
  {
    name: 'products',
    table: '"Product"',
    columns: [
      'id',
      'tenantId',
      'brandId',
      'categoryId',
      'sku',
      'name',
      'description',
      'priceCents',
      'taxRate',
      'trackInventory',
      'barcode',
      'metadata',
    ],
  },
  {
    name: 'orders',
    table: '"Order"',
    columns: [
      'id',
      'tenantId',
      'locationId',
      'customerId',
      'status',
      'subtotalCents',
      'taxCents',
      'totalCents',
      'paymentStatus',
      'items',
      'metadata',
    ],
  },
  {
    name: 'suppliers',
    table: '"Supplier"',
    columns: [
      'id',
      'tenantId',
      'name',
      'contactName',
      'email',
      'phone',
      'address',
      'taxId',
      'paymentTerms',
      'notes',
      'active',
    ],
  },
  {
    name: 'purchaseOrders',
    table: '"PurchaseOrder"',
    columns: [
      'id',
      'tenantId',
      'locationId',
      'supplierId',
      'supplierName',
      'orderNumber',
      'status',
      'items',
      'subtotalCents',
      'taxCents',
      'totalCents',
      'expectedDeliveryDate',
      'notes',
      'createdBy',
      'approvedBy',
      'approvedAt',
    ],
  },
  {
    name: 'grns',
    table: '"GRN"',
    columns: [
      'id',
      'tenantId',
      'locationId',
      'purchaseOrderId',
      'purchaseOrderNumber',
      'supplierId',
      'supplierName',
      'grnNumber',
      'status',
      'items',
      'subtotalCents',
      'taxCents',
      'totalCents',
      'receivedBy',
      'receivedAt',
      'notes',
    ],
  },
];

const transformers: Record<string, Record<string, (value: any) => any>> = {
  '"Tenant"': {
    plan: (value: string | null) => (value ? value.toUpperCase() : 'FREE'),
    status: (value: string | null) => (value ? value.toUpperCase() : 'ACTIVE'),
  },
  '"User"': {
    role: (value: string | null) => (value ? value.toUpperCase() : 'CASHIER'),
    isPlatformAdmin: (value: any) => Boolean(value),
  },
  '"Device"': {
    status: (value: string | null) => (value ? value.toUpperCase() : 'ACTIVE'),
  },
  '"Order"': {
    status: (value: string | null) => (value ? value.toUpperCase() : 'PENDING'),
    paymentStatus: (value: string | null) => (value ? value.toUpperCase() : 'PENDING'),
  },
  '"Supplier"': {
    active: (value: any) => Boolean(value ?? true),
  },
  '"PurchaseOrder"': {
    status: (value: string | null) => (value ? value.toUpperCase() : 'PENDING'),
  },
  '"GRN"': {
    status: (value: string | null) => (value ? value.toUpperCase() : 'DRAFT'),
  },
};

async function main() {
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error('FIREBASE_* env vars are missing. Make sure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set.');
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL env var is missing. Set it to your Neon connection string before running this script.');
  }

  initializeApp({ credential: cert(serviceAccount) });
  const firestore = getFirestore();

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const targetCollectionName = process.argv[2];
  const selectedCollections =
    targetCollectionName && targetCollectionName !== 'all'
      ? collections.filter((collection) => collection.name === targetCollectionName)
      : collections;

  if (targetCollectionName && selectedCollections.length === 0) {
    throw new Error(
      `Unknown collection "${targetCollectionName}". Available options: ${collections
        .map((collection) => collection.name)
        .join(', ')}`,
    );
  }

  for (const { name, table, columns } of selectedCollections) {
    console.log(`Migrating collection "${name}" → table ${table}`);
    const snapshot = await firestore.collection(name).get();
    console.log(` • ${snapshot.size} documents found`);

    for (const doc of snapshot.docs) {
      const data = columns.map((column) => {
        const rawValue = column === 'id' ? doc.id : doc.get(column);
        let value = rawValue ?? null;

        if (value instanceof Timestamp) {
          value = value.toDate();
        }

        if (Array.isArray(value) || typeof value === 'object') {
          value = value;
        }

        const transformer = transformers[table]?.[column];
        if (transformer) {
          value = transformer(value);
        }

        return value;
      });

      const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
      const quotedColumns = columns.map((column) => `"${column}"`).join(', ');
      const updates = columns
        .filter((column) => column !== 'id')
        .map((column) => `"${column}" = EXCLUDED."${column}"`)
        .join(', ');

      await client.query(
        `INSERT INTO ${table} (${quotedColumns})
         VALUES (${placeholders})
         ON CONFLICT (id) DO UPDATE SET ${updates}`,
        data,
      );
    }
  }

  await client.end();
  console.log('Migration complete ✅');
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
