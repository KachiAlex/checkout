import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

async function main() {
  const databaseUrl = requireEnv('DATABASE_URL');
  const projectId = requireEnv('FIREBASE_PROJECT_ID');
  const clientEmail = optionalEnv('FIREBASE_CLIENT_EMAIL');
  const privateKeyRaw = optionalEnv('FIREBASE_PRIVATE_KEY');
  const adcPath = optionalEnv('GOOGLE_APPLICATION_CREDENTIALS');

  if (getApps().length === 0) {
    // Prefer GOOGLE_APPLICATION_CREDENTIALS when provided to avoid hidden FIREBASE_* env injection
    if (adcPath) {
      if (!fs.existsSync(adcPath)) {
        throw new Error(`GOOGLE_APPLICATION_CREDENTIALS points to a missing file: ${adcPath}`);
      }

      console.log(`Using GOOGLE_APPLICATION_CREDENTIALS for Firestore auth (${adcPath})`);

      const raw = fs.readFileSync(adcPath, 'utf8');
      const json = JSON.parse(raw) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };

      if (!json.client_email || !json.private_key) {
        throw new Error(
          'GOOGLE_APPLICATION_CREDENTIALS JSON is missing client_email/private_key',
        );
      }

      console.log(`Service account from JSON: ${json.client_email}`);

      initializeApp({
        credential: cert({
          projectId: json.project_id ?? projectId,
          clientEmail: json.client_email,
          privateKey: json.private_key,
        }),
        projectId,
      });
    } else if (clientEmail && privateKeyRaw) {
      console.log(
        `Using FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY for Firestore auth (${clientEmail})`,
      );
      const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        projectId,
      });
    } else {
      throw new Error(
        'GOOGLE_APPLICATION_CREDENTIALS is required (or FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY)',
      );
    }
  }

  const firestore = getFirestore();
  firestore.settings({ preferRest: true });
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  try {
    let tenantsUpserted = 0;
    let tenantsEnsuredFromReferences = 0;
    let usersUpserted = 0;
    let usersSkippedMissingTenant = 0;
    let usersSkippedUnknownTenant = 0;

    let brandsUpserted = 0;
    let categoriesUpserted = 0;
    let locationsUpserted = 0;
    let productsUpserted = 0;
    let inventoryUpserted = 0;
    let ordersUpserted = 0;
    let orderItemsUpserted = 0;

    let suppliersUpserted = 0;
    let purchaseOrdersUpserted = 0;
    let grnsUpserted = 0;

    let brandsSkipped = 0;
    let categoriesSkipped = 0;
    let locationsSkipped = 0;
    let productsSkipped = 0;
    let inventorySkipped = 0;
    let ordersSkipped = 0;

    let suppliersSkipped = 0;
    let purchaseOrdersSkipped = 0;
    let grnsSkipped = 0;

    const upsertTenant = async (tenantId: string, data: any) => {
      await prisma.tenant.upsert({
        where: { id: tenantId },
        update: {
          name: data.name,
          slug: data.slug,
          plan: String(data.plan || '').toUpperCase() as any,
          status: String(data.status || '').toUpperCase() as any,
          industry: data.industry ?? null,
          featureFlags: data.featureFlags ?? null,
          seatLimit: data.seatLimit ?? null,
          contactEmail: data.contactEmail ?? null,
          billingCycleStart: data.billingCycleStart?.toDate?.() ?? null,
          billingCycleEnd: data.billingCycleEnd?.toDate?.() ?? null,
          metadata: data.metadata ?? null,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
        create: {
          id: tenantId,
          name: data.name,
          slug: data.slug,
          plan: String(data.plan || '').toUpperCase() as any,
          status: String(data.status || '').toUpperCase() as any,
          industry: data.industry ?? null,
          featureFlags: data.featureFlags ?? null,
          seatLimit: data.seatLimit ?? null,
          contactEmail: data.contactEmail ?? null,
          billingCycleStart: data.billingCycleStart?.toDate?.() ?? null,
          billingCycleEnd: data.billingCycleEnd?.toDate?.() ?? null,
          metadata: data.metadata ?? null,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
      });
    };

    const ensureTenant = async (
      tenantId: string | null | undefined,
      reason: string,
    ): Promise<boolean> => {
      if (!tenantId) return false;
      if (tenantIds.has(tenantId)) return true;

      const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();
      if (tenantDoc.exists) {
        const data = tenantDoc.data() as any;
        await upsertTenant(tenantId, data);
        tenantIds.add(tenantId);
        tenantsUpserted += 1;
        tenantsEnsuredFromReferences += 1;
        console.log(`Ensured tenant ${tenantId} from ${reason}`);
        return true;
      }

      const placeholder = {
        name: `Unknown Tenant ${tenantId}`,
        slug: `unknown-${tenantId}`,
        plan: 'FREE',
        status: 'ACTIVE',
        industry: null,
        featureFlags: null,
        seatLimit: null,
        contactEmail: null,
        billingCycleStart: null,
        billingCycleEnd: null,
        metadata: {
          placeholder: true,
          reason,
        },
      };

      await upsertTenant(tenantId, placeholder);
      tenantIds.add(tenantId);
      tenantsUpserted += 1;
      tenantsEnsuredFromReferences += 1;
      console.warn(
        `Created placeholder tenant ${tenantId} (not found in Firestore tenants) from ${reason}`,
      );
      return true;
    };

    const tenantsSnap = await firestore.collection('tenants').get();
    const tenantIds = new Set<string>();
    for (const doc of tenantsSnap.docs) {
      const data = doc.data() as any;

      tenantIds.add(doc.id);

      await upsertTenant(doc.id, data);

      tenantsUpserted += 1;
    }

    const brandsSnap = await firestore.collection('brands').get();
    const brandIds = new Set<string>();
    for (const doc of brandsSnap.docs) {
      const data = doc.data() as any;

      await ensureTenant(data.tenantId, `brand ${doc.id}`);
      if (!data.tenantId || !tenantIds.has(data.tenantId)) {
        brandsSkipped += 1;
        console.warn(`Skipping brand ${doc.id}: missing/unknown tenantId`);
        continue;
      }

      brandIds.add(doc.id);

      await prisma.brand.upsert({
        where: { id: doc.id },
        update: {
          tenantId: data.tenantId,
          name: data.name,
          description: data.description ?? null,
          logoUrl: data.logoUrl ?? null,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
        create: {
          id: doc.id,
          tenantId: data.tenantId,
          name: data.name,
          description: data.description ?? null,
          logoUrl: data.logoUrl ?? null,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
      });

      brandsUpserted += 1;
    }

    const categoriesSnap = await firestore.collection('categories').get();
    const categoryIds = new Set<string>();
    for (const doc of categoriesSnap.docs) {
      const data = doc.data() as any;

      await ensureTenant(data.tenantId, `category ${doc.id}`);
      if (!data.tenantId || !tenantIds.has(data.tenantId)) {
        categoriesSkipped += 1;
        console.warn(`Skipping category ${doc.id}: missing/unknown tenantId`);
        continue;
      }

      categoryIds.add(doc.id);

      await prisma.category.upsert({
        where: { id: doc.id },
        update: {
          tenantId: data.tenantId,
          name: data.name,
          description: data.description ?? null,
          parentId: data.parentId ?? null,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
        create: {
          id: doc.id,
          tenantId: data.tenantId,
          name: data.name,
          description: data.description ?? null,
          parentId: data.parentId ?? null,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
      });

      categoriesUpserted += 1;
    }

    const locationsSnap = await firestore.collection('locations').get();
    const locationIds = new Set<string>();
    const locationTenantById = new Map<string, string | null>();
    for (const doc of locationsSnap.docs) {
      const data = doc.data() as any;

      await ensureTenant(data.tenantId, `location ${doc.id}`);
      const tenantId = data.tenantId && tenantIds.has(data.tenantId) ? data.tenantId : null;
      if (data.tenantId && !tenantId) {
        locationsSkipped += 1;
        console.warn(`Skipping location ${doc.id}: tenantId ${data.tenantId} not found in migrated tenants`);
        continue;
      }

      locationIds.add(doc.id);
      locationTenantById.set(doc.id, tenantId);

      await prisma.location.upsert({
        where: { id: doc.id },
        update: {
          tenantId,
          name: data.name,
          address: data.address ?? null,
          timezone: data.timezone ?? 'UTC',
          defaultPrinter: data.defaultPrinter ?? null,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
        create: {
          id: doc.id,
          tenantId,
          name: data.name,
          address: data.address ?? null,
          timezone: data.timezone ?? 'UTC',
          defaultPrinter: data.defaultPrinter ?? null,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
      });

      locationsUpserted += 1;
    }

    const productsSnap = await firestore.collection('products').get();
    const productIds = new Set<string>();
    for (const doc of productsSnap.docs) {
      const data = doc.data() as any;

      await ensureTenant(data.tenantId, `product ${doc.id}`);
      if (!data.tenantId || !tenantIds.has(data.tenantId)) {
        productsSkipped += 1;
        console.warn(`Skipping product ${doc.id}: missing/unknown tenantId`);
        continue;
      }
      if (!data.sku || !data.name || data.priceCents === undefined || data.priceCents === null) {
        productsSkipped += 1;
        console.warn(`Skipping product ${doc.id}: missing sku/name/priceCents`);
        continue;
      }

      const brandId = data.brandId && brandIds.has(data.brandId) ? data.brandId : null;
      const categoryId = data.categoryId && categoryIds.has(data.categoryId) ? data.categoryId : null;

      productIds.add(doc.id);

      await prisma.product.upsert({
        where: { id: doc.id },
        update: {
          tenantId: data.tenantId,
          sku: data.sku,
          barcode: data.barcode ?? null,
          name: data.name,
          description: data.description ?? null,
          categoryId,
          categoryName: data.categoryName ?? null,
          brandId,
          brandName: data.brandName ?? null,
          priceCents: Number(data.priceCents),
          costCents: data.costCents ?? null,
          taxRate: typeof data.taxRate === 'number' ? data.taxRate : 0,
          variants: data.variants ?? null,
          images: Array.isArray(data.images) ? data.images : [],
          active: data.active !== undefined ? Boolean(data.active) : true,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
        create: {
          id: doc.id,
          tenantId: data.tenantId,
          sku: data.sku,
          barcode: data.barcode ?? null,
          name: data.name,
          description: data.description ?? null,
          categoryId,
          categoryName: data.categoryName ?? null,
          brandId,
          brandName: data.brandName ?? null,
          priceCents: Number(data.priceCents),
          costCents: data.costCents ?? null,
          taxRate: typeof data.taxRate === 'number' ? data.taxRate : 0,
          variants: data.variants ?? null,
          images: Array.isArray(data.images) ? data.images : [],
          active: data.active !== undefined ? Boolean(data.active) : true,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
      });

      productsUpserted += 1;
    }

    const inventorySnap = await firestore.collection('inventory').get();
    for (const doc of inventorySnap.docs) {
      const data = doc.data() as any;

      if (!data.productId || !productIds.has(data.productId)) {
        inventorySkipped += 1;
        console.warn(`Skipping inventory ${doc.id}: missing/unknown productId ${data.productId}`);
        continue;
      }
      if (!data.locationId || !locationIds.has(data.locationId)) {
        inventorySkipped += 1;
        console.warn(`Skipping inventory ${doc.id}: missing/unknown locationId ${data.locationId}`);
        continue;
      }
      if (data.quantity === undefined || data.quantity === null) {
        inventorySkipped += 1;
        console.warn(`Skipping inventory ${doc.id}: missing quantity`);
        continue;
      }

      await prisma.inventory.upsert({
        where: {
          productId_locationId: {
            productId: data.productId,
            locationId: data.locationId,
          },
        },
        update: {
          quantity: Number(data.quantity),
          reorderPoint: data.reorderPoint ?? null,
          maxStock: data.maxStock ?? null,
          costCents: data.costCents ?? null,
          salesPriceCents: data.salesPriceCents ?? null,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
        create: {
          id: doc.id,
          productId: data.productId,
          locationId: data.locationId,
          quantity: Number(data.quantity),
          reorderPoint: data.reorderPoint ?? null,
          maxStock: data.maxStock ?? null,
          costCents: data.costCents ?? null,
          salesPriceCents: data.salesPriceCents ?? null,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
      });

      inventoryUpserted += 1;
    }

    const ordersSnap = await firestore.collection('orders').get();
    for (const doc of ordersSnap.docs) {
      const data = doc.data() as any;

      const inferredTenantId =
        data.tenantId ??
        (data.locationId ? locationTenantById.get(String(data.locationId)) : null);

      await ensureTenant(inferredTenantId, `order ${doc.id}`);
      if (!inferredTenantId || !tenantIds.has(inferredTenantId)) {
        ordersSkipped += 1;
        console.warn(
          `Skipping order ${doc.id}: missing/unknown tenantId (order tenantId: ${data.tenantId ?? 'null'}, inferred from location: ${inferredTenantId ?? 'null'})`,
        );
        continue;
      }
      if (!data.locationId || !locationIds.has(data.locationId)) {
        ordersSkipped += 1;
        console.warn(`Skipping order ${doc.id}: missing/unknown locationId ${data.locationId}`);
        continue;
      }
      if (!data.uuid || !data.orderNumber) {
        ordersSkipped += 1;
        console.warn(`Skipping order ${doc.id}: missing uuid/orderNumber`);
        continue;
      }

      const status = String(data.status || '').toUpperCase();
      const paymentStatus = data.paymentStatus ? String(data.paymentStatus).toUpperCase() : null;

      await prisma.order.upsert({
        where: { id: doc.id },
        update: {
          uuid: data.uuid,
          orderNumber: data.orderNumber,
          tenantId: inferredTenantId,
          locationId: data.locationId,
          customerId: data.customerId ?? null,
          subtotalCents: Number(data.subtotalCents ?? 0),
          taxCents: Number(data.taxCents ?? 0),
          discountCents: Number(data.discountCents ?? 0),
          totalCents: Number(data.totalCents ?? 0),
          status: status as any,
          paymentStatus: paymentStatus as any,
          isCreditOrder: Boolean(data.isCreditOrder),
          paidAt: data.paidAt?.toDate?.() ?? null,
          returnedAt: data.returnedAt?.toDate?.() ?? null,
          createdBy: data.createdBy,
          deviceId: data.deviceId ?? null,
          completedAt: data.completedAt?.toDate?.() ?? null,
          notes: data.notes ?? null,
          synced: Boolean(data.synced),
          isHeld: Boolean(data.isHeld),
          heldAt: data.heldAt?.toDate?.() ?? null,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
        create: {
          id: doc.id,
          uuid: data.uuid,
          orderNumber: data.orderNumber,
          tenantId: inferredTenantId,
          locationId: data.locationId,
          customerId: data.customerId ?? null,
          subtotalCents: Number(data.subtotalCents ?? 0),
          taxCents: Number(data.taxCents ?? 0),
          discountCents: Number(data.discountCents ?? 0),
          totalCents: Number(data.totalCents ?? 0),
          status: status as any,
          paymentStatus: paymentStatus as any,
          isCreditOrder: Boolean(data.isCreditOrder),
          paidAt: data.paidAt?.toDate?.() ?? null,
          returnedAt: data.returnedAt?.toDate?.() ?? null,
          createdBy: data.createdBy,
          deviceId: data.deviceId ?? null,
          completedAt: data.completedAt?.toDate?.() ?? null,
          notes: data.notes ?? null,
          synced: Boolean(data.synced),
          isHeld: Boolean(data.isHeld),
          heldAt: data.heldAt?.toDate?.() ?? null,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
      });

      ordersUpserted += 1;

      const items = Array.isArray(data.items) ? (data.items as any[]) : [];
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        if (!item?.productId || !productIds.has(item.productId)) {
          console.warn(`Skipping order item ${doc.id}#${i}: missing/unknown productId ${item?.productId}`);
          continue;
        }

        await prisma.orderItem.upsert({
          where: {
            orderId_lineNumber: {
              orderId: doc.id,
              lineNumber: i,
            },
          },
          update: {
            productId: item.productId,
            quantity: Number(item.quantity ?? 0),
            priceCents: Number(item.priceCents ?? 0),
            taxCents: Number(item.taxCents ?? 0),
            discountCents: Number(item.discountCents ?? 0),
          },
          create: {
            id: `${doc.id}:${i}`,
            orderId: doc.id,
            lineNumber: i,
            productId: item.productId,
            quantity: Number(item.quantity ?? 0),
            priceCents: Number(item.priceCents ?? 0),
            taxCents: Number(item.taxCents ?? 0),
            discountCents: Number(item.discountCents ?? 0),
          },
        });

        orderItemsUpserted += 1;
      }
    }

    const suppliersSnap = await firestore.collection('suppliers').get();
    const supplierIds = new Set<string>();
    for (const doc of suppliersSnap.docs) {
      const data = doc.data() as any;

      await ensureTenant(data.tenantId, `supplier ${doc.id}`);
      if (!data.tenantId || !tenantIds.has(data.tenantId)) {
        suppliersSkipped += 1;
        console.warn(`Skipping supplier ${doc.id}: missing/unknown tenantId`);
        continue;
      }
      if (!data.name) {
        suppliersSkipped += 1;
        console.warn(`Skipping supplier ${doc.id}: missing name`);
        continue;
      }

      supplierIds.add(doc.id);

      await prisma.supplier.upsert({
        where: { id: doc.id },
        update: {
          tenantId: data.tenantId,
          name: String(data.name).trim(),
          contactName: data.contactName ?? null,
          email: data.email ?? null,
          phone: data.phone ?? null,
          address: data.address ?? null,
          taxId: data.taxId ?? null,
          paymentTerms: data.paymentTerms ?? null,
          notes: data.notes ?? null,
          active: data.active !== undefined ? Boolean(data.active) : true,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
        create: {
          id: doc.id,
          tenantId: data.tenantId,
          name: String(data.name).trim(),
          contactName: data.contactName ?? null,
          email: data.email ?? null,
          phone: data.phone ?? null,
          address: data.address ?? null,
          taxId: data.taxId ?? null,
          paymentTerms: data.paymentTerms ?? null,
          notes: data.notes ?? null,
          active: data.active !== undefined ? Boolean(data.active) : true,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
      });

      suppliersUpserted += 1;
    }

    const ensureSupplier = async (
      supplierId: string | null | undefined,
      tenantId: string,
      reason: string,
    ): Promise<boolean> => {
      if (!supplierId) return false;
      if (supplierIds.has(supplierId)) return true;

      const supplierDoc = await firestore.collection('suppliers').doc(supplierId).get();
      if (supplierDoc.exists) {
        const data = supplierDoc.data() as any;
        await prisma.supplier.upsert({
          where: { id: supplierId },
          update: {
            tenantId,
            name: String(data?.name || `Unknown Supplier ${supplierId}`).trim(),
            contactName: data?.contactName ?? null,
            email: data?.email ?? null,
            phone: data?.phone ?? null,
            address: data?.address ?? null,
            taxId: data?.taxId ?? null,
            paymentTerms: data?.paymentTerms ?? null,
            notes: data?.notes ?? null,
            active: data?.active !== undefined ? Boolean(data.active) : true,
            createdAt: data?.createdAt?.toDate?.() ?? undefined,
            updatedAt: data?.updatedAt?.toDate?.() ?? undefined,
          },
          create: {
            id: supplierId,
            tenantId,
            name: String(data?.name || `Unknown Supplier ${supplierId}`).trim(),
            contactName: data?.contactName ?? null,
            email: data?.email ?? null,
            phone: data?.phone ?? null,
            address: data?.address ?? null,
            taxId: data?.taxId ?? null,
            paymentTerms: data?.paymentTerms ?? null,
            notes: data?.notes ?? null,
            active: data?.active !== undefined ? Boolean(data.active) : true,
            createdAt: data?.createdAt?.toDate?.() ?? undefined,
            updatedAt: data?.updatedAt?.toDate?.() ?? undefined,
          },
        });

        supplierIds.add(supplierId);
        suppliersUpserted += 1;
        console.log(`Ensured supplier ${supplierId} from ${reason}`);
        return true;
      }

      await prisma.supplier.upsert({
        where: { id: supplierId },
        update: {
          tenantId,
          name: `Unknown Supplier ${supplierId}`,
          active: true,
          notes: `Placeholder created from ${reason}`,
        },
        create: {
          id: supplierId,
          tenantId,
          name: `Unknown Supplier ${supplierId}`,
          active: true,
          notes: `Placeholder created from ${reason}`,
        },
      });
      supplierIds.add(supplierId);
      suppliersUpserted += 1;
      console.warn(`Created placeholder supplier ${supplierId} from ${reason}`);
      return true;
    };

    const purchaseOrdersSnap = await firestore.collection('purchase_orders').get();
    const purchaseOrderIds = new Set<string>();
    for (const doc of purchaseOrdersSnap.docs) {
      const data = doc.data() as any;

      await ensureTenant(data.tenantId, `purchase_order ${doc.id}`);
      if (!data.tenantId || !tenantIds.has(data.tenantId)) {
        purchaseOrdersSkipped += 1;
        console.warn(`Skipping purchase_order ${doc.id}: missing/unknown tenantId`);
        continue;
      }
      if (!data.locationId || !locationIds.has(data.locationId)) {
        purchaseOrdersSkipped += 1;
        console.warn(`Skipping purchase_order ${doc.id}: missing/unknown locationId ${data.locationId}`);
        continue;
      }
      if (!data.supplierId) {
        purchaseOrdersSkipped += 1;
        console.warn(`Skipping purchase_order ${doc.id}: missing supplierId`);
        continue;
      }

      await ensureSupplier(String(data.supplierId), data.tenantId, `purchase_order ${doc.id}`);

      const status = String(data.status || 'draft').toUpperCase();
      const items = Array.isArray(data.items) ? data.items : [];

      purchaseOrderIds.add(doc.id);

      await prisma.purchaseOrder.upsert({
        where: { id: doc.id },
        update: {
          tenantId: data.tenantId,
          locationId: data.locationId,
          supplierId: String(data.supplierId),
          supplierName: data.supplierName ?? '',
          orderNumber: data.orderNumber ?? `PO-${doc.id}`,
          status: status as any,
          items: items as any,
          subtotalCents: Number(data.subtotalCents ?? 0),
          taxCents: Number(data.taxCents ?? 0),
          totalCents: Number(data.totalCents ?? 0),
          expectedDeliveryDate: data.expectedDeliveryDate?.toDate?.() ?? null,
          notes: data.notes ?? null,
          createdBy: data.createdBy ?? 'system',
          approvedBy: data.approvedBy ?? null,
          approvedAt: data.approvedAt?.toDate?.() ?? null,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
        create: {
          id: doc.id,
          tenantId: data.tenantId,
          locationId: data.locationId,
          supplierId: String(data.supplierId),
          supplierName: data.supplierName ?? '',
          orderNumber: data.orderNumber ?? `PO-${doc.id}`,
          status: status as any,
          items: items as any,
          subtotalCents: Number(data.subtotalCents ?? 0),
          taxCents: Number(data.taxCents ?? 0),
          totalCents: Number(data.totalCents ?? 0),
          expectedDeliveryDate: data.expectedDeliveryDate?.toDate?.() ?? null,
          notes: data.notes ?? null,
          createdBy: data.createdBy ?? 'system',
          approvedBy: data.approvedBy ?? null,
          approvedAt: data.approvedAt?.toDate?.() ?? null,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
      });

      purchaseOrdersUpserted += 1;
    }

    const grnSnap = await firestore.collection('grn').get();
    for (const doc of grnSnap.docs) {
      const data = doc.data() as any;

      await ensureTenant(data.tenantId, `grn ${doc.id}`);
      if (!data.tenantId || !tenantIds.has(data.tenantId)) {
        grnsSkipped += 1;
        console.warn(`Skipping grn ${doc.id}: missing/unknown tenantId`);
        continue;
      }
      if (!data.locationId || !locationIds.has(data.locationId)) {
        grnsSkipped += 1;
        console.warn(`Skipping grn ${doc.id}: missing/unknown locationId ${data.locationId}`);
        continue;
      }
      if (!data.purchaseOrderId || !purchaseOrderIds.has(String(data.purchaseOrderId))) {
        grnsSkipped += 1;
        console.warn(`Skipping grn ${doc.id}: missing/unknown purchaseOrderId ${data.purchaseOrderId}`);
        continue;
      }
      if (!data.supplierId) {
        grnsSkipped += 1;
        console.warn(`Skipping grn ${doc.id}: missing supplierId`);
        continue;
      }

      await ensureSupplier(String(data.supplierId), data.tenantId, `grn ${doc.id}`);

      const status = String(data.status || 'completed').toUpperCase();
      const items = Array.isArray(data.items) ? data.items : [];
      const receivedAt = data.receivedAt?.toDate?.() ?? new Date();

      await prisma.gRN.upsert({
        where: { id: doc.id },
        update: {
          tenantId: data.tenantId,
          locationId: data.locationId,
          purchaseOrderId: String(data.purchaseOrderId),
          purchaseOrderNumber: data.purchaseOrderNumber ?? '',
          supplierId: String(data.supplierId),
          supplierName: data.supplierName ?? '',
          grnNumber: data.grnNumber ?? `GRN-${doc.id}`,
          status: status as any,
          items: items as any,
          subtotalCents: Number(data.subtotalCents ?? 0),
          taxCents: Number(data.taxCents ?? 0),
          totalCents: Number(data.totalCents ?? 0),
          receivedBy: data.receivedBy ?? 'system',
          receivedAt,
          notes: data.notes ?? null,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
        create: {
          id: doc.id,
          tenantId: data.tenantId,
          locationId: data.locationId,
          purchaseOrderId: String(data.purchaseOrderId),
          purchaseOrderNumber: data.purchaseOrderNumber ?? '',
          supplierId: String(data.supplierId),
          supplierName: data.supplierName ?? '',
          grnNumber: data.grnNumber ?? `GRN-${doc.id}`,
          status: status as any,
          items: items as any,
          subtotalCents: Number(data.subtotalCents ?? 0),
          taxCents: Number(data.taxCents ?? 0),
          totalCents: Number(data.totalCents ?? 0),
          receivedBy: data.receivedBy ?? 'system',
          receivedAt,
          notes: data.notes ?? null,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
      });

      grnsUpserted += 1;
    }

    const usersSnap = await firestore.collection('users').get();
    for (const doc of usersSnap.docs) {
      const data = doc.data() as any;

      if (!data.tenantId) {
        usersSkippedMissingTenant += 1;
        console.warn(`Skipping user ${doc.id}: missing tenantId`);
        continue;
      }

      if (!tenantIds.has(data.tenantId)) {
        usersSkippedUnknownTenant += 1;
        console.warn(
          `Skipping user ${doc.id}: tenantId ${data.tenantId} not found in migrated tenants`,
        );
        continue;
      }

      await prisma.user.upsert({
        where: { id: doc.id },
        update: {
          name: data.name,
          email: data.email ? String(data.email).toLowerCase() : null,
          role: String(data.role || '').toUpperCase() as any,
          pinHash: data.pinHash,
          tenantId: data.tenantId,
          isPlatformAdmin: Boolean(data.isPlatformAdmin),
          deviceId: data.deviceId ?? null,
          locationId: data.locationId ?? null,
          publicKey: data.publicKey ?? null,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
        create: {
          id: doc.id,
          name: data.name,
          email: data.email ? String(data.email).toLowerCase() : null,
          role: String(data.role || '').toUpperCase() as any,
          pinHash: data.pinHash,
          tenantId: data.tenantId,
          isPlatformAdmin: Boolean(data.isPlatformAdmin),
          deviceId: data.deviceId ?? null,
          locationId: data.locationId ?? null,
          publicKey: data.publicKey ?? null,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
      });

      usersUpserted += 1;
    }

    const pricingDoc = await firestore.collection('subscription_pricing').doc('default').get();
    if (pricingDoc.exists) {
      const data = pricingDoc.data() as any;
      await prisma.subscriptionPricing.upsert({
        where: { id: 'default' },
        update: {
          free: data.free,
          starter: data.starter,
          professional: data.professional,
          enterprise: data.enterprise,
          lifetime: data.lifetime,
          updatedAt: data.updatedAt ? new Date(String(data.updatedAt)) : null,
          updatedBy: data.updatedBy ?? null,
        },
        create: {
          id: 'default',
          free: data.free,
          starter: data.starter,
          professional: data.professional,
          enterprise: data.enterprise,
          lifetime: data.lifetime,
          updatedAt: data.updatedAt ? new Date(String(data.updatedAt)) : null,
          updatedBy: data.updatedBy ?? null,
        },
      });
    }

    console.log(
      `✅ Migration complete. Tenants: ${tenantsUpserted} (ensured from references: ${tenantsEnsuredFromReferences}). Users: ${usersUpserted} (skipped missing tenantId: ${usersSkippedMissingTenant}, skipped unknown tenantId: ${usersSkippedUnknownTenant}). Brands: ${brandsUpserted} (skipped: ${brandsSkipped}). Categories: ${categoriesUpserted} (skipped: ${categoriesSkipped}). Locations: ${locationsUpserted} (skipped: ${locationsSkipped}). Products: ${productsUpserted} (skipped: ${productsSkipped}). Inventory: ${inventoryUpserted} (skipped: ${inventorySkipped}). Orders: ${ordersUpserted} (skipped: ${ordersSkipped}). OrderItems: ${orderItemsUpserted}. Suppliers: ${suppliersUpserted} (skipped: ${suppliersSkipped}). PurchaseOrders: ${purchaseOrdersUpserted} (skipped: ${purchaseOrdersSkipped}). GRNs: ${grnsUpserted} (skipped: ${grnsSkipped}).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
