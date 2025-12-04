// Inventory Handler for Supabase Edge Functions
import { corsHeaders } from '../_shared/cors.ts';
import { parseRequestBody } from '../_shared/request.ts';
import { getFirestoreInstance } from '../_shared/firestore.ts';
import { requireAuth } from '../_shared/jwt.ts';
import { FieldValue, Timestamp } from 'npm:firebase-admin@11.11.0/firestore';

interface CreateInventoryItemInput {
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  quantity: number;
  priceCents: number;
  costCents?: number;
  taxRate?: number;
  categoryId?: string;
  categoryName?: string;
  brandId?: string;
  brandName?: string;
}

interface AdjustInventoryInput {
  productId: string;
  locationId: string;
  delta: number;
  type: string;
  reason?: string;
  notes?: string;
  supplierId?: string;
}

// Helper to find or create category
async function findOrCreateCategory(db: any, name: string, tenantId: string): Promise<string> {
  const snapshot = await db.collection('categories')
    .where('tenantId', '==', tenantId)
    .where('name', '==', name)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  }

  const categoryRef = db.collection('categories').doc();
  const now = FieldValue.serverTimestamp();
  await categoryRef.set({
    tenantId,
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
  });

  return categoryRef.id;
}

// Helper to find or create brand
async function findOrCreateBrand(db: any, name: string, tenantId: string): Promise<string> {
  const snapshot = await db.collection('brands')
    .where('tenantId', '==', tenantId)
    .where('name', '==', name)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  }

  const brandRef = db.collection('brands').doc();
  const now = FieldValue.serverTimestamp();
  await brandRef.set({
    tenantId,
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
  });

  return brandRef.id;
}

export async function handleInventory(req: Request, path: string, method: string): Promise<Response> {
  try {
    const user = await requireAuth(req);
    const db = getFirestoreInstance();

    // GET /inventory/:location_id/stock - Get stock for location
    const stockMatch = path.match(/^\/inventory\/([^\/]+)\/stock$/);
    if (stockMatch && method === 'GET') {
      const locationId = stockMatch[1];

      // Get inventory records
      const inventorySnapshot = await db.collection('inventory')
        .where('locationId', '==', locationId)
        .get();

      if (inventorySnapshot.empty) {
        return new Response(
          JSON.stringify([]),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Batch fetch products
      const productIds = inventorySnapshot.docs.map(doc => doc.data().productId);
      const productsMap = new Map();

      // Fetch products in chunks of 10 (Firestore getAll limit)
      const chunks: string[][] = [];
      for (let i = 0; i < productIds.length; i += 10) {
        chunks.push(productIds.slice(i, i + 10));
      }

      for (const chunk of chunks) {
        const productRefs = chunk.map(id => db.collection('products').doc(id));
        const products = await db.getAll(...productRefs);
        for (const productDoc of products) {
          if (productDoc.exists) {
            const productData = productDoc.data();
            if (productData?.tenantId === user.tenantId) {
              productsMap.set(productDoc.id, {
                id: productDoc.id,
                name: productData.name,
                sku: productData.sku,
                barcode: productData.barcode,
                description: productData.description,
                priceCents: productData.priceCents,
              });
            }
          }
        }
      }

      // Build response with enriched data
      const stock = inventorySnapshot.docs.map(doc => {
        const invData = doc.data();
        const product = productsMap.get(invData.productId);

        return {
          id: doc.id,
          productId: invData.productId,
          locationId: invData.locationId,
          quantity: invData.quantity || 0,
          reorderPoint: invData.reorderPoint || undefined,
          maxStock: invData.maxStock || undefined,
          costCents: invData.costCents || undefined,
          salesPriceCents: invData.salesPriceCents || undefined,
          product: product || {
            id: invData.productId,
            name: 'Unknown product',
            sku: '—',
            barcode: undefined,
          },
          isProductMissing: !product,
        };
      });

      return new Response(
        JSON.stringify(stock),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /inventory/:location_id/transactions - Get transactions
    const transactionsMatch = path.match(/^\/inventory\/([^\/]+)\/transactions$/);
    if (transactionsMatch && method === 'GET') {
      const locationId = transactionsMatch[1];
      const url = new URL(req.url);
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');

      let query = db.collection('inventoryTransactions')
        .where('locationId', '==', locationId)
        .orderBy('ts', 'desc')
        .limit(100);

      if (from) {
        query = query.where('ts', '>=', Timestamp.fromDate(new Date(from)));
      }
      if (to) {
        query = query.where('ts', '<=', Timestamp.fromDate(new Date(to)));
      }

      const snapshot = await query.get();
      const transactions = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          productId: data.productId,
          locationId: data.locationId,
          delta: data.delta,
          type: data.type,
          referenceId: data.referenceId || undefined,
          userId: data.userId || undefined,
          notes: data.notes || undefined,
          reason: data.reason || undefined,
          ts: data.ts?.toDate?.()?.toISOString() || new Date().toISOString(),
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
      });

      return new Response(
        JSON.stringify(transactions),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /inventory/create-item - Create product and inventory
    if (path === '/inventory/create-item' && method === 'POST') {
      const body = await parseRequestBody<CreateInventoryItemInput>(req);

      if (!body || !body.name || body.quantity === undefined || body.priceCents === undefined) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: name, quantity, priceCents' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Determine locationId
      let locationId = user.locationId;
      if (!locationId) {
        // Get first location for tenant
        const locationsSnapshot = await db.collection('locations')
          .where('tenantId', '==', user.tenantId)
          .limit(1)
          .get();

        if (locationsSnapshot.empty) {
          // Auto-create a default location so inventory can be attached
          const defaultLocationRef = db.collection('locations').doc();
          const nowTs = FieldValue.serverTimestamp();
          await defaultLocationRef.set({
            name: 'Main Store',
            address: '',
            timezone: 'UTC',
            defaultPrinter: null,
            tenantId: user.tenantId,
            createdAt: nowTs,
            updatedAt: nowTs,
          });
          locationId = defaultLocationRef.id;
        } else {
          locationId = locationsSnapshot.docs[0].id;
        }
      }

      // Handle category
      let categoryId = body.categoryId;
      if (!categoryId && body.categoryName) {
        categoryId = await findOrCreateCategory(db, body.categoryName, user.tenantId);
      }

      // Handle brand
      let brandId = body.brandId;
      if (!brandId && body.brandName) {
        brandId = await findOrCreateBrand(db, body.brandName, user.tenantId);
      }

      // Generate SKU if not provided
      const sku = body.sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create product
      const productRef = db.collection('products').doc();
      const now = FieldValue.serverTimestamp();
      await productRef.set({
        tenantId: user.tenantId,
        sku,
        name: body.name.trim(),
        priceCents: body.priceCents,
        taxRate: body.taxRate ?? 0.075,
        active: true,
        ...(body.barcode ? { barcode: body.barcode } : {}),
        ...(body.description ? { description: body.description.trim() } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(brandId ? { brandId } : {}),
        ...(body.costCents !== undefined ? { costCents: body.costCents } : {}),
        createdAt: now,
        updatedAt: now,
      });

      const productDoc = await productRef.get();
      const productData = productDoc.data();

      // Create inventory record
      const inventoryRef = db.collection('inventory').doc();
      await inventoryRef.set({
        productId: productRef.id,
        locationId,
        quantity: body.quantity,
        salesPriceCents: body.priceCents,
        ...(body.costCents !== undefined ? { costCents: body.costCents } : {}),
        createdAt: now,
        updatedAt: now,
      });

      const inventoryDoc = await inventoryRef.get();
      const inventoryData = inventoryDoc.data();

      // Create transaction
      const transactionRef = db.collection('inventoryTransactions').doc();
      await transactionRef.set({
        productId: productRef.id,
        locationId,
        delta: body.quantity,
        type: 'received',
        userId: user.sub,
        notes: `Initial inventory entry - ${body.quantity} units`,
        ts: Timestamp.now(),
        createdAt: now,
        updatedAt: now,
      });

      return new Response(
        JSON.stringify({
          product: {
            id: productRef.id,
            tenantId: productData?.tenantId,
            sku: productData?.sku,
            barcode: productData?.barcode,
            name: productData?.name,
            description: productData?.description,
            categoryId: productData?.categoryId,
            brandId: productData?.brandId,
            priceCents: productData?.priceCents,
            costCents: productData?.costCents,
            taxRate: productData?.taxRate,
            active: productData?.active,
            createdAt: productData?.createdAt?.toDate?.()?.toISOString(),
            updatedAt: productData?.updatedAt?.toDate?.()?.toISOString(),
          },
          inventory: {
            id: inventoryRef.id,
            productId: inventoryData?.productId,
            locationId: inventoryData?.locationId,
            quantity: inventoryData?.quantity,
            costCents: inventoryData?.costCents,
            salesPriceCents: inventoryData?.salesPriceCents,
          },
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /inventory/adjust - Adjust inventory
    if (path === '/inventory/adjust' && method === 'POST') {
      const body = await parseRequestBody<AdjustInventoryInput>(req);

      if (!body || !body.productId || !body.locationId || body.delta === undefined) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: productId, locationId, delta' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get current inventory
      const inventorySnapshot = await db.collection('inventory')
        .where('productId', '==', body.productId)
        .where('locationId', '==', body.locationId)
        .limit(1)
        .get();

      let currentQuantity = 0;
      let inventoryRef;
      let inventoryData: any = {};

      if (inventorySnapshot.empty) {
        // Create new inventory record
        inventoryRef = db.collection('inventory').doc();
        inventoryData = {
          productId: body.productId,
          locationId: body.locationId,
          quantity: 0,
        };
      } else {
        inventoryRef = db.collection('inventory').doc(inventorySnapshot.docs[0].id);
        inventoryData = inventorySnapshot.docs[0].data();
        currentQuantity = inventoryData.quantity || 0;
      }

      const newQuantity = Math.max(0, currentQuantity + body.delta);
      const now = FieldValue.serverTimestamp();

      await inventoryRef.set({
        ...inventoryData,
        quantity: newQuantity,
        updatedAt: now,
      }, { merge: true });

      // Create transaction
      const transactionRef = db.collection('inventoryTransactions').doc();
      await transactionRef.set({
        productId: body.productId,
        locationId: body.locationId,
        delta: body.delta,
        type: body.type || 'adjust',
        userId: user.sub,
        reason: body.reason,
        notes: body.notes,
        ...(body.supplierId ? { supplierId: body.supplierId } : {}),
        ts: Timestamp.now(),
        createdAt: now,
        updatedAt: now,
      });

      const transactionDoc = await transactionRef.get();
      const transactionData = transactionDoc.data();

      return new Response(
        JSON.stringify({
          id: transactionRef.id,
          productId: transactionData?.productId,
          locationId: transactionData?.locationId,
          delta: transactionData?.delta,
          type: transactionData?.type,
          userId: transactionData?.userId,
          reason: transactionData?.reason,
          notes: transactionData?.notes,
          ts: transactionData?.ts?.toDate?.()?.toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not Found', path }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('[Inventory] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

