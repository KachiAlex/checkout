// Orders Handler for Supabase Edge Functions
import { corsHeaders } from '../_shared/cors.ts';
import { parseRequestBody, getQueryParams } from '../_shared/request.ts';
import { getFirestoreInstance } from '../_shared/firestore.ts';
import { requireAuth } from '../_shared/jwt.ts';
import { FieldValue, Timestamp } from 'npm:firebase-admin@11.11.0/firestore';
import { v4 as uuid } from 'npm:uuid@9.0.0';

interface OrderItem {
  productId: string;
  quantity: number;
  priceCents: number;
  taxCents: number;
  discountCents?: number;
}

interface CreateOrderInput {
  uuid: string;
  locationId?: string;
  customerId?: string;
  items: OrderItem[];
  subtotalCents: number;
  taxCents: number;
  discountCents?: number;
  totalCents: number;
  deviceId?: string;
  notes?: string;
  isHeld?: boolean;
}

interface UpdateOrderInput {
  status?: string;
  notes?: string;
}

function toOrderRecord(id: string, data: any) {
  return {
    id,
    uuid: data.uuid,
    orderNumber: data.orderNumber,
    locationId: data.locationId,
    customerId: data.customerId || undefined,
    items: data.items.map((item: any) => ({
      productId: item.productId,
      quantity: item.quantity,
      priceCents: item.priceCents,
      taxCents: item.taxCents,
      discountCents: item.discountCents || undefined,
    })),
    subtotalCents: data.subtotalCents,
    taxCents: data.taxCents,
    discountCents: data.discountCents || 0,
    totalCents: data.totalCents,
    status: data.status,
    createdBy: data.createdBy,
    deviceId: data.deviceId || undefined,
    completedAt: data.completedAt?.toDate?.()?.toISOString() || undefined,
    notes: data.notes || undefined,
    synced: data.synced !== undefined ? data.synced : true,
    isHeld: data.isHeld || false,
    heldAt: data.heldAt?.toDate?.()?.toISOString() || undefined,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}

// Helper: Get inventory stock for a product at a location
async function getStockByProduct(db: any, productId: string, locationId: string): Promise<number> {
  const snapshot = await db.collection('inventory')
    .where('productId', '==', productId)
    .where('locationId', '==', locationId)
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    return 0;
  }
  
  return snapshot.docs[0].data().quantity || 0;
}

// Helper: Get inventory record (for price validation)
async function getInventoryRecord(db: any, productId: string, locationId: string) {
  const snapshot = await db.collection('inventory')
    .where('productId', '==', productId)
    .where('locationId', '==', locationId)
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    return null;
  }
  
  const data = snapshot.docs[0].data();
  return {
    id: snapshot.docs[0].id,
    productId: data.productId,
    locationId: data.locationId,
    quantity: data.quantity || 0,
    salesPriceCents: data.salesPriceCents || undefined,
  };
}

// Helper: Decrement inventory for sale
async function decrementForSale(
  db: any,
  productId: string,
  locationId: string,
  quantity: number,
  orderId: string,
  userId?: string,
): Promise<void> {
  // Get current inventory
  const inventorySnapshot = await db.collection('inventory')
    .where('productId', '==', productId)
    .where('locationId', '==', locationId)
    .limit(1)
    .get();

  let inventoryId: string;
  let currentQuantity: number;
  let inventoryData: any;

  if (inventorySnapshot.empty) {
    // Create new inventory record with negative quantity (shouldn't happen, but handle gracefully)
    inventoryId = uuid();
    currentQuantity = 0;
    inventoryData = {
      productId,
      locationId,
      quantity: -quantity,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await db.collection('inventory').doc(inventoryId).set(inventoryData);
  } else {
    inventoryId = inventorySnapshot.docs[0].id;
    inventoryData = inventorySnapshot.docs[0].data();
    currentQuantity = inventoryData.quantity || 0;
    
    // Update inventory
    await db.collection('inventory').doc(inventoryId).update({
      quantity: Math.max(0, currentQuantity - quantity),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // Create transaction record
  const transactionId = uuid();
  await db.collection('inventoryTransactions').doc(transactionId).set({
    productId,
    locationId,
    delta: -quantity,
    type: 'SALE',
    referenceId: orderId,
    userId: userId || undefined,
    ts: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// Helper: Generate order number
async function generateOrderNumber(db: any, locationId: string): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
  const locationPrefix = locationId.length >= 4 ? locationId.substring(0, 4).toUpperCase() : 'DEFT';
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  // Query orders for the location only (no date filter to avoid index requirement)
  // Then filter by date in memory. This works without a composite index.
  const ordersSnapshot = await db.collection('orders')
    .where('locationId', '==', locationId)
    .get();

  // Filter orders created today in memory
  const todayOrders = ordersSnapshot.docs.filter(doc => {
    const createdAt = doc.data().createdAt;
    if (!createdAt) return false;
    const createdDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    return createdDate >= startOfDay && createdDate <= endOfDay;
  });

  const orderNumber = `ORD-${locationPrefix}-${dateStr}-${String(todayOrders.length + 1).padStart(6, '0')}`;
  return orderNumber;
}

// Helper: Award loyalty points
async function awardLoyaltyPoints(
  db: any,
  customerId: string,
  tenantId: string,
  totalCents: number,
  orderId: string,
): Promise<void> {
  // Calculate points (1 point per 100 cents, or customize as needed)
  const points = Math.floor(totalCents / 100);

  if (points <= 0) {
    return;
  }

  // Get customer
  const customerDoc = await db.collection('customers').doc(customerId).get();
  if (!customerDoc.exists) {
    return;
  }

  const customerData = customerDoc.data();
  if (customerData.tenantId !== tenantId) {
    return;
  }

  const currentPoints = customerData.loyaltyPoints || 0;
  const newPoints = currentPoints + points;

  // Update customer loyalty points
  await db.collection('customers').doc(customerId).update({
    loyaltyPoints: newPoints,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Record loyalty transaction
  const transactionId = uuid();
  await db.collection('loyaltyTransactions').doc(transactionId).set({
    customerId,
    tenantId,
    type: 'EARNED',
    points,
    balanceAfter: newPoints,
    orderId,
    reason: 'Points earned from purchase',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function handleOrders(req: Request, path: string, method: string): Promise<Response> {
  try {
    const user = await requireAuth(req);
    const db = getFirestoreInstance();

    // POST /orders - Create order (idempotent)
    if (path === '/orders' && method === 'POST') {
      const body = await parseRequestBody<CreateOrderInput>(req);
      
      if (!body || !body.uuid || !body.items || body.items.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: uuid, items' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check for existing order by UUID (idempotency)
      const existingSnapshot = await db.collection('orders')
        .where('uuid', '==', body.uuid)
        .limit(1)
        .get();

      if (!existingSnapshot.empty) {
        const existingDoc = existingSnapshot.docs[0];
        return new Response(
          JSON.stringify(toOrderRecord(existingDoc.id, existingDoc.data())),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Resolve locationId
      let locationId = body.locationId;
      if (!locationId) {
        locationId = user.locationId || undefined;
      }
      if (!locationId) {
        // Get first location for tenant
        const locationsSnapshot = await db.collection('locations')
          .where('tenantId', '==', user.tenantId)
          .limit(1)
          .get();
        
        if (locationsSnapshot.empty) {
          // Use tenantId as fallback
          locationId = user.tenantId;
        } else {
          locationId = locationsSnapshot.docs[0].id;
        }
      }

      // Validate prices against product catalog and inventory
      for (const item of body.items) {
        // Get product
        const productDoc = await db.collection('products').doc(item.productId).get();
        if (!productDoc.exists) {
          return new Response(
            JSON.stringify({ error: `Product ${item.productId} not found` }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const productData = productDoc.data();
        if (productData?.tenantId !== user.tenantId) {
          return new Response(
            JSON.stringify({ error: `Product ${item.productId} not found` }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get inventory record for price check
        const inventoryRecord = await getInventoryRecord(db, item.productId, locationId);
        const expectedPriceCents = inventoryRecord?.salesPriceCents ?? productData.priceCents;
        
        // Allow small tolerance for rounding (1 cent)
        const priceDifference = Math.abs(item.priceCents - expectedPriceCents);
        if (priceDifference > 1) {
          console.warn(
            `Price mismatch for product ${item.productId}: expected ${expectedPriceCents}, got ${item.priceCents}. Order UUID: ${body.uuid}`,
          );
        }
      }

      // Generate order number and order ID first (needed for inventory transactions)
      const orderId = uuid();
      const orderNumber = await generateOrderNumber(db, locationId);

      // Validate and decrement inventory if not held
      if (!body.isHeld) {
        for (const item of body.items) {
          const stock = await getStockByProduct(db, item.productId, locationId);
          if (stock < item.quantity) {
            return new Response(
              JSON.stringify({
                error: 'Insufficient inventory',
                message: `Insufficient stock for product ${item.productId}. Available: ${stock}, Requested: ${item.quantity}`,
              }),
              { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          try {
            await decrementForSale(db, item.productId, locationId, item.quantity, orderId, user.sub);
          } catch (inventoryError) {
            console.error('[Orders] Inventory decrement error:', inventoryError);
            return new Response(
              JSON.stringify({
                error: 'Failed to update inventory',
                message: inventoryError instanceof Error ? inventoryError.message : 'Unknown error',
              }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      // Create order
      const now = FieldValue.serverTimestamp();
      const orderStatus = body.isHeld ? 'PENDING' : 'COMPLETED';

      const orderDoc: any = {
        uuid: body.uuid,
        orderNumber,
        tenantId: user.tenantId,
        locationId,
        items: body.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          priceCents: item.priceCents,
          taxCents: item.taxCents,
          discountCents: item.discountCents || 0,
        })),
        subtotalCents: body.subtotalCents,
        taxCents: body.taxCents,
        discountCents: body.discountCents || 0,
        totalCents: body.totalCents,
        status: orderStatus,
        createdBy: user.sub,
        synced: true,
        isHeld: body.isHeld || false,
        createdAt: now,
        updatedAt: now,
      };

      // Only include optional fields if they have values (Firestore doesn't allow undefined)
      if (body.customerId) {
        orderDoc.customerId = body.customerId;
      }
      if (body.deviceId) {
        orderDoc.deviceId = body.deviceId;
      }
      if (body.notes) {
        orderDoc.notes = body.notes;
      }
      if (body.isHeld) {
        orderDoc.heldAt = now;
      } else {
        orderDoc.completedAt = now;
      }

      await db.collection('orders').doc(orderId).set(orderDoc);

      // Award loyalty points if order is completed and has a customer
      if (!body.isHeld && orderStatus === 'COMPLETED' && body.customerId) {
        try {
          await awardLoyaltyPoints(db, body.customerId, user.tenantId, body.totalCents, orderId);
        } catch (loyaltyError) {
          // Log but don't fail the order if loyalty points fail
          console.error('[Orders] Loyalty points error:', loyaltyError);
        }
      }

      // Fetch created order
      const createdDoc = await db.collection('orders').doc(orderId).get();
      const createdData = createdDoc.data();

      return new Response(
        JSON.stringify(toOrderRecord(orderId, createdData)),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /orders/:id - Get order by ID
    if (path.startsWith('/orders/') && method === 'GET') {
      const orderId = path.split('/orders/')[1];
      if (!orderId) {
        return new Response(
          JSON.stringify({ error: 'Order ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const orderDoc = await db.collection('orders').doc(orderId).get();
      if (!orderDoc.exists) {
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const orderData = orderDoc.data();
      
      // Verify tenant access via location
      const locationDoc = await db.collection('locations').doc(orderData.locationId).get();
      if (!locationDoc.exists || locationDoc.data()?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Access denied to this order' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(toOrderRecord(orderId, orderData)),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH /orders/:id - Update order status
    if (path.startsWith('/orders/') && method === 'PATCH') {
      const orderId = path.split('/orders/')[1];
      if (!orderId) {
        return new Response(
          JSON.stringify({ error: 'Order ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const orderDoc = await db.collection('orders').doc(orderId).get();
      if (!orderDoc.exists) {
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const orderData = orderDoc.data();
      
      // Verify tenant access
      const locationDoc = await db.collection('locations').doc(orderData.locationId).get();
      if (!locationDoc.exists || locationDoc.data()?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Access denied to this order' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await parseRequestBody<UpdateOrderInput>(req);
      if (!body) {
        return new Response(
          JSON.stringify({ error: 'Request body is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const updateDoc: any = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (body.status !== undefined) {
        updateDoc.status = body.status;
      }
      if (body.notes !== undefined) {
        updateDoc.notes = body.notes;
      }

      await db.collection('orders').doc(orderId).set(updateDoc, { merge: true });

      // Fetch updated order
      const updatedDoc = await db.collection('orders').doc(orderId).get();
      const updatedData = updatedDoc.data();

      return new Response(
        JSON.stringify(toOrderRecord(orderId, updatedData)),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /orders - List orders
    if (path === '/orders' && method === 'GET') {
      const params = getQueryParams(req);
      const locationId = params.get('location_id') || undefined;
      const from = params.get('from') ? new Date(params.get('from')!) : undefined;
      const to = params.get('to') ? new Date(params.get('to')!) : undefined;
      const status = params.get('status') || undefined;

      let query = db.collection('orders').orderBy('createdAt', 'desc');

      if (locationId) {
        query = query.where('locationId', '==', locationId);
      }
      if (status) {
        query = query.where('status', '==', status);
      }
      if (from) {
        query = query.where('createdAt', '>=', Timestamp.fromDate(from));
      }
      if (to) {
        query = query.where('createdAt', '<=', Timestamp.fromDate(to));
      }

      const snapshot = await query.get();
      let orders = snapshot.docs.map(doc => toOrderRecord(doc.id, doc.data()));

      // Filter by tenant if no locationId specified
      if (!locationId) {
        const locationsSnapshot = await db.collection('locations')
          .where('tenantId', '==', user.tenantId)
          .get();
        const locationIds = new Set(locationsSnapshot.docs.map(doc => doc.id));
        orders = orders.filter(order => locationIds.has(order.locationId));
      }

      return new Response(
        JSON.stringify(orders),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 404
    return new Response(
      JSON.stringify({ error: 'Not Found', path, method }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Orders] Error:', error);
    console.error('[Orders] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

