// Returns Handler for Supabase Edge Functions
import { corsHeaders } from '../_shared/cors.ts';
import { parseRequestBody, getQueryParams } from '../_shared/request.ts';
import { getFirestoreInstance } from '../_shared/firestore.ts';
import { requireAuth } from '../_shared/jwt.ts';
import { FieldValue, Timestamp } from 'npm:firebase-admin@11.11.0/firestore';
import { v4 as uuid } from 'npm:uuid@9.0.0';

interface ReturnItem {
  productId: string;
  quantity: number;
  priceCents: number;
  reason: string;
  notes?: string;
}

interface CreateReturnInput {
  orderId: string;
  items: ReturnItem[];
  totalRefundCents: number;
  reason: string;
  notes?: string;
}

enum ReturnStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
}

function toReturnRecord(id: string, data: any) {
  return {
    id,
    returnNumber: data.returnNumber,
    orderId: data.orderId,
    orderNumber: data.orderNumber,
    locationId: data.locationId,
    customerId: data.customerId || undefined,
    items: data.items,
    totalRefundCents: data.totalRefundCents,
    status: data.status,
    reason: data.reason,
    notes: data.notes || undefined,
    processedBy: data.processedBy || undefined,
    processedAt: data.processedAt?.toDate?.()?.toISOString() || undefined,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}

// Helper: Generate return number
async function generateReturnNumber(db: any, locationId: string): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
  const locationPrefix = locationId.length >= 4 ? locationId.substring(0, 4).toUpperCase() : 'DEFT';
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));

  const returnsSnapshot = await db.collection('returns')
    .where('locationId', '==', locationId)
    .where('createdAt', '>=', Timestamp.fromDate(startOfDay))
    .get();

  return `RET-${locationPrefix}-${dateStr}-${String(returnsSnapshot.size + 1).padStart(6, '0')}`;
}

// Helper: Increment inventory for return
async function incrementForReturn(
  db: any,
  productId: string,
  locationId: string,
  quantity: number,
  returnId: string,
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

  if (inventorySnapshot.empty) {
    // Create new inventory record
    inventoryId = uuid();
    currentQuantity = 0;
    await db.collection('inventory').doc(inventoryId).set({
      productId,
      locationId,
      quantity: quantity,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    inventoryId = inventorySnapshot.docs[0].id;
    const inventoryData = inventorySnapshot.docs[0].data();
    currentQuantity = inventoryData.quantity || 0;
    
    // Update inventory
    await db.collection('inventory').doc(inventoryId).update({
      quantity: currentQuantity + quantity,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // Create transaction record
  const transactionId = uuid();
  await db.collection('inventoryTransactions').doc(transactionId).set({
    productId,
    locationId,
    delta: quantity,
    type: 'RETURN',
    referenceId: returnId,
    ...(userId ? { userId } : {}),
    ts: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// Helper: Process refund (simplified - just update payment status)
async function processRefund(db: any, orderId: string, refundAmountCents: number): Promise<void> {
  // Get payments for order
  const paymentsSnapshot = await db.collection('payments')
    .where('orderId', '==', orderId)
    .get();

  if (paymentsSnapshot.empty) {
    return; // No payments to refund
  }

  // Find completed payment
  for (const doc of paymentsSnapshot.docs) {
    const payment = doc.data();
    if (payment.status === 'COMPLETED') {
      // Update payment to reflect refund
      await db.collection('payments').doc(doc.id).update({
        processorData: {
          ...(payment.processorData || {}),
          refund_amount: refundAmountCents,
          refunded_at: new Date().toISOString(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      });
      break; // Only refund first completed payment
    }
  }
}

export async function handleReturns(req: Request, path: string, method: string): Promise<Response> {
  try {
    const user = await requireAuth(req);
    const db = getFirestoreInstance();

    // POST /returns - Create return
    if (path === '/returns' && method === 'POST') {
      const body = await parseRequestBody<CreateReturnInput>(req);
      
      if (!body || !body.orderId || !body.items || body.items.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: orderId, items' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify order exists
      const orderDoc = await db.collection('orders').doc(body.orderId).get();
      if (!orderDoc.exists) {
        return new Response(
          JSON.stringify({ error: `Order ${body.orderId} not found` }),
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

      // Validate return items exist in order
      for (const returnItem of body.items) {
        const orderItem = orderData.items.find((item: any) => item.productId === returnItem.productId);
        if (!orderItem) {
          return new Response(
            JSON.stringify({ error: `Product ${returnItem.productId} not found in order` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (returnItem.quantity > orderItem.quantity) {
          return new Response(
            JSON.stringify({ error: `Return quantity (${returnItem.quantity}) exceeds ordered quantity (${orderItem.quantity})` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Generate return number
      const returnNumber = await generateReturnNumber(db, orderData.locationId);

      // Create return record
      const returnId = uuid();
      const now = FieldValue.serverTimestamp();

      const returnDoc: any = {
        returnNumber,
        orderId: body.orderId,
        orderNumber: orderData.orderNumber,
        locationId: orderData.locationId,
        items: body.items,
        totalRefundCents: body.totalRefundCents,
        status: ReturnStatus.PENDING,
        reason: body.reason,
        ...(orderData.customerId ? { customerId: orderData.customerId } : {}),
        ...(body.notes ? { notes: body.notes } : {}),
        createdAt: now,
        updatedAt: now,
      };

      await db.collection('returns').doc(returnId).set(returnDoc);

      // Fetch created return
      const createdDoc = await db.collection('returns').doc(returnId).get();
      const createdData = createdDoc.data();

      return new Response(
        JSON.stringify(toReturnRecord(returnId, createdData)),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /returns - List returns
    if (path === '/returns' && method === 'GET') {
      const params = getQueryParams(req);
      const locationId = params.get('location_id') || undefined;
      const from = params.get('from') ? new Date(params.get('from')!) : undefined;
      const to = params.get('to') ? new Date(params.get('to')!) : undefined;
      const status = params.get('status') || undefined;

      let query = db.collection('returns').orderBy('createdAt', 'desc');

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
      let returns = snapshot.docs.map(doc => toReturnRecord(doc.id, doc.data()));

      // Filter by tenant if no locationId specified
      if (!locationId) {
        const locationsSnapshot = await db.collection('locations')
          .where('tenantId', '==', user.tenantId)
          .get();
        const locationIds = new Set(locationsSnapshot.docs.map(doc => doc.id));
        returns = returns.filter(ret => locationIds.has(ret.locationId));
      }

      return new Response(
        JSON.stringify(returns),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /returns/search - Search by return number
    if (path === '/returns/search' && method === 'GET') {
      const params = getQueryParams(req);
      const returnNumber = params.get('returnNumber') || undefined;

      if (!returnNumber) {
        return new Response(
          JSON.stringify(null),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const snapshot = await db.collection('returns')
        .where('returnNumber', '==', returnNumber)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return new Response(
          JSON.stringify(null),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const returnData = snapshot.docs[0].data();
      
      // Verify tenant access
      const locationDoc = await db.collection('locations').doc(returnData.locationId).get();
      if (!locationDoc.exists || locationDoc.data()?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(toReturnRecord(snapshot.docs[0].id, returnData)),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /returns/order/:orderId - Get returns for an order
    if (path.startsWith('/returns/order/') && method === 'GET') {
      const orderId = path.split('/returns/order/')[1];
      if (!orderId) {
        return new Response(
          JSON.stringify({ error: 'Order ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify order exists and tenant access
      const orderDoc = await db.collection('orders').doc(orderId).get();
      if (!orderDoc.exists) {
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const orderData = orderDoc.data();
      const locationDoc = await db.collection('locations').doc(orderData.locationId).get();
      if (!locationDoc.exists || locationDoc.data()?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const snapshot = await db.collection('returns')
        .where('orderId', '==', orderId)
        .get();

      const returns = snapshot.docs.map(doc => toReturnRecord(doc.id, doc.data()));

      return new Response(
        JSON.stringify(returns),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /returns/:id - Get return by ID
    if (path.startsWith('/returns/') && !path.includes('/order/') && !path.includes('/search') && !path.includes('/approve') && !path.includes('/reject') && !path.includes('/complete') && method === 'GET') {
      const returnId = path.split('/returns/')[1];
      if (!returnId) {
        return new Response(
          JSON.stringify({ error: 'Return ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const returnDoc = await db.collection('returns').doc(returnId).get();
      if (!returnDoc.exists) {
        return new Response(
          JSON.stringify({ error: 'Return not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const returnData = returnDoc.data();
      
      // Verify tenant access
      const locationDoc = await db.collection('locations').doc(returnData.locationId).get();
      if (!locationDoc.exists || locationDoc.data()?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(toReturnRecord(returnId, returnData)),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /returns/:id/approve - Approve return
    if (path.includes('/approve') && method === 'POST') {
      const returnId = path.split('/returns/')[1]?.split('/approve')[0];
      if (!returnId) {
        return new Response(
          JSON.stringify({ error: 'Return ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const returnDoc = await db.collection('returns').doc(returnId).get();
      if (!returnDoc.exists) {
        return new Response(
          JSON.stringify({ error: 'Return not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const returnData = returnDoc.data();
      
      // Verify tenant access
      const locationDoc = await db.collection('locations').doc(returnData.locationId).get();
      if (!locationDoc.exists || locationDoc.data()?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (returnData.status !== ReturnStatus.PENDING) {
        return new Response(
          JSON.stringify({ error: `Return is already ${returnData.status}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Restore inventory
      for (const item of returnData.items) {
        await incrementForReturn(
          db,
          item.productId,
          returnData.locationId,
          item.quantity,
          returnId,
          user.sub,
        );
      }

      // Process refund
      await processRefund(db, returnData.orderId, returnData.totalRefundCents);

      // Update return status
      await db.collection('returns').doc(returnId).update({
        status: ReturnStatus.APPROVED,
        processedBy: user.sub,
        processedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Fetch updated return
      const updatedDoc = await db.collection('returns').doc(returnId).get();
      const updatedData = updatedDoc.data();

      return new Response(
        JSON.stringify(toReturnRecord(returnId, updatedData)),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /returns/:id/reject - Reject return
    if (path.includes('/reject') && method === 'POST') {
      const returnId = path.split('/returns/')[1]?.split('/reject')[0];
      if (!returnId) {
        return new Response(
          JSON.stringify({ error: 'Return ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const returnDoc = await db.collection('returns').doc(returnId).get();
      if (!returnDoc.exists) {
        return new Response(
          JSON.stringify({ error: 'Return not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const returnData = returnDoc.data();
      
      // Verify tenant access
      const locationDoc = await db.collection('locations').doc(returnData.locationId).get();
      if (!locationDoc.exists || locationDoc.data()?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (returnData.status !== ReturnStatus.PENDING) {
        return new Response(
          JSON.stringify({ error: `Return is already ${returnData.status}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await parseRequestBody<{ reason?: string }>(req);
      const rejectionReason = body?.reason;

      await db.collection('returns').doc(returnId).update({
        status: ReturnStatus.REJECTED,
        processedBy: user.sub,
        processedAt: FieldValue.serverTimestamp(),
        notes: rejectionReason ? `${returnData.notes || ''}\nRejection reason: ${rejectionReason}`.trim() : returnData.notes,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Fetch updated return
      const updatedDoc = await db.collection('returns').doc(returnId).get();
      const updatedData = updatedDoc.data();

      return new Response(
        JSON.stringify(toReturnRecord(returnId, updatedData)),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /returns/:id/complete - Complete return
    if (path.includes('/complete') && method === 'POST') {
      const returnId = path.split('/returns/')[1]?.split('/complete')[0];
      if (!returnId) {
        return new Response(
          JSON.stringify({ error: 'Return ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const returnDoc = await db.collection('returns').doc(returnId).get();
      if (!returnDoc.exists) {
        return new Response(
          JSON.stringify({ error: 'Return not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const returnData = returnDoc.data();
      
      // Verify tenant access
      const locationDoc = await db.collection('locations').doc(returnData.locationId).get();
      if (!locationDoc.exists || locationDoc.data()?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (returnData.status !== ReturnStatus.APPROVED) {
        return new Response(
          JSON.stringify({ error: `Return must be APPROVED before completion. Current status: ${returnData.status}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await db.collection('returns').doc(returnId).update({
        status: ReturnStatus.COMPLETED,
        processedBy: user.sub,
        processedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Fetch updated return
      const updatedDoc = await db.collection('returns').doc(returnId).get();
      const updatedData = updatedDoc.data();

      return new Response(
        JSON.stringify(toReturnRecord(returnId, updatedData)),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 404
    return new Response(
      JSON.stringify({ error: 'Not Found', path, method }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Returns] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

