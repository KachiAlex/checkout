// Purchase Orders Handler for Supabase Edge Functions
import { corsHeaders } from '../_shared/cors.ts';
import { parseRequestBody, getQueryParams } from '../_shared/request.ts';
import { getFirestoreInstance } from '../_shared/firestore.ts';
import { requireAuth } from '../_shared/jwt.ts';
import { FieldValue, Timestamp } from 'npm:firebase-admin@11.11.0/firestore';

type TimestampField = Timestamp | typeof FieldValue | null | undefined;

type PurchaseOrderStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'partially_received'
  | 'received'
  | 'cancelled';

interface PurchaseOrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCostCents: number;
  totalCostCents: number;
  receivedQuantity?: number;
}

interface CreatePurchaseOrderInput {
  locationId: string;
  supplierId: string;
  items: PurchaseOrderItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  expectedDeliveryDate?: string;
  notes?: string;
}

function tsToDate(ts?: TimestampField): Date {
  if (!ts) return new Date();
  if (ts instanceof Timestamp) return ts.toDate();
  return new Date();
}

function tsToIso(ts?: TimestampField): string {
  return tsToDate(ts).toISOString();
}

function toPurchaseOrderRecord(id: string, data: any) {
  return {
    id,
    tenantId: data.tenantId,
    locationId: data.locationId,
    supplierId: data.supplierId,
    supplierName: data.supplierName,
    orderNumber: data.orderNumber,
    status: data.status as PurchaseOrderStatus,
    items: data.items || [],
    subtotalCents: data.subtotalCents,
    taxCents: data.taxCents,
    totalCents: data.totalCents,
    expectedDeliveryDate: data.expectedDeliveryDate
      ? tsToIso(data.expectedDeliveryDate)
      : undefined,
    notes: data.notes || undefined,
    createdBy: data.createdBy,
    approvedBy: data.approvedBy || undefined,
    approvedAt: data.approvedAt ? tsToIso(data.approvedAt) : undefined,
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

export async function handlePurchaseOrders(
  req: Request,
  path: string,
  method: string,
): Promise<Response> {
  try {
    const user = await requireAuth(req);
    const db = getFirestoreInstance();

    // GET /purchase-orders - list all purchase orders for tenant (optional location_id)
    if (path === '/purchase-orders' && method === 'GET') {
      const params = getQueryParams(req);
      const locationId = params.get('location_id') || undefined;

      try {
        let query = db
          .collection('purchase_orders')
          .where('tenantId', '==', user.tenantId);

        if (locationId) {
          query = query.where('locationId', '==', locationId);
        }

        // Try to order by createdAt, but handle if index doesn't exist
        let snapshot;
        try {
          snapshot = await query.orderBy('createdAt', 'desc').get();
        } catch (orderError: any) {
          // If orderBy fails (likely missing index), fetch without ordering and sort in memory
          console.warn('[PurchaseOrders] orderBy failed, fetching without order:', orderError.message);
          snapshot = await query.get();
        }

        let orders = snapshot.docs.map((doc) => {
          try {
            return toPurchaseOrderRecord(doc.id, doc.data());
          } catch (err: any) {
            console.error(`[PurchaseOrders] Error converting doc ${doc.id}:`, err);
            return null;
          }
        }).filter((order): order is ReturnType<typeof toPurchaseOrderRecord> => order !== null);

        // Sort in memory if orderBy failed
        if (orders.length > 0 && orders[0]) {
          orders.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA; // Descending
          });
        }

        return new Response(JSON.stringify(orders), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error: any) {
        console.error('[PurchaseOrders] Error fetching purchase orders:', error);
        return new Response(
          JSON.stringify({
            error: 'Failed to fetch purchase orders',
            message: error.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
    }

    // GET /purchase-orders/:id - get purchase order by id
    if (path.startsWith('/purchase-orders/') && !path.includes('/approve') && !path.includes('/cancel') && method === 'GET') {
      const id = path.split('/purchase-orders/')[1];
      if (!id) {
        return new Response(JSON.stringify({ error: 'Purchase order ID is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const doc = await db.collection('purchase_orders').doc(id).get();
      if (!doc.exists) {
        return new Response(JSON.stringify({ error: 'Purchase order not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = doc.data();
      if (data?.tenantId !== user.tenantId) {
        return new Response(JSON.stringify({ error: 'Purchase order not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(toPurchaseOrderRecord(doc.id, data)), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /purchase-orders - create purchase order
    if (path === '/purchase-orders' && method === 'POST') {
      const body = await parseRequestBody<CreatePurchaseOrderInput>(req);

      if (
        !body ||
        !body.locationId ||
        !body.supplierId ||
        !body.items ||
        body.items.length === 0
      ) {
        return new Response(
          JSON.stringify({
            error:
              'Missing required fields: locationId, supplierId, items',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      // Verify supplier exists and belongs to tenant
      const supplierDoc = await db.collection('suppliers').doc(body.supplierId).get();
      if (!supplierDoc.exists || supplierDoc.data()?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: `Supplier with ID ${body.supplierId} not found` }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      const supplierName = supplierDoc.data()?.name || '';

      const now = FieldValue.serverTimestamp();
      const docRef = db.collection('purchase_orders').doc();
      const orderNumber = `PO-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 6)
        .toUpperCase()}`;

      await docRef.set({
        tenantId: user.tenantId,
        locationId: body.locationId,
        supplierId: body.supplierId,
        supplierName,
        orderNumber,
        status: 'draft',
        items: body.items,
        subtotalCents: body.subtotalCents,
        taxCents: body.taxCents,
        totalCents: body.totalCents,
        ...(body.expectedDeliveryDate
          ? { expectedDeliveryDate: Timestamp.fromDate(new Date(body.expectedDeliveryDate)) }
          : {}),
        ...(body.notes ? { notes: body.notes } : {}),
        createdBy: user.sub,
        createdAt: now,
        updatedAt: now,
      });

      const created = await docRef.get();
      return new Response(JSON.stringify(toPurchaseOrderRecord(created.id, created.data())), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT /purchase-orders/:id - update purchase order (only if draft or pending)
    if (path.startsWith('/purchase-orders/') && !path.includes('/approve') && !path.includes('/cancel') && method === 'PUT') {
      const id = path.split('/purchase-orders/')[1];
      if (!id) {
        return new Response(JSON.stringify({ error: 'Purchase order ID is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await parseRequestBody<CreatePurchaseOrderInput>(req);

      if (
        !body ||
        !body.locationId ||
        !body.supplierId ||
        !body.items ||
        body.items.length === 0
      ) {
        return new Response(
          JSON.stringify({
            error: 'Missing required fields: locationId, supplierId, items',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      const docRef = db.collection('purchase_orders').doc(id);
      const existing = await docRef.get();
      if (!existing.exists) {
        return new Response(JSON.stringify({ error: 'Purchase order not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const existingData = existing.data();
      if (existingData?.tenantId !== user.tenantId) {
        return new Response(JSON.stringify({ error: 'Purchase order not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const status = existingData.status as PurchaseOrderStatus;
      if (status !== 'draft' && status !== 'pending') {
        return new Response(
          JSON.stringify({
            error: `Cannot edit purchase order with status ${status}. Only draft or pending orders can be edited.`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      // Verify supplier exists and belongs to tenant
      const supplierDoc = await db.collection('suppliers').doc(body.supplierId).get();
      if (!supplierDoc.exists || supplierDoc.data()?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: `Supplier with ID ${body.supplierId} not found` }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      const supplierName = supplierDoc.data()?.name || '';

      await docRef.set(
        {
          locationId: body.locationId,
          supplierId: body.supplierId,
          supplierName,
          items: body.items,
          subtotalCents: body.subtotalCents,
          taxCents: body.taxCents,
          totalCents: body.totalCents,
          ...(body.expectedDeliveryDate
            ? { expectedDeliveryDate: Timestamp.fromDate(new Date(body.expectedDeliveryDate)) }
            : {}),
          ...(body.notes !== undefined ? { notes: body.notes || null } : {}),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      const updated = await docRef.get();
      return new Response(JSON.stringify(toPurchaseOrderRecord(updated.id, updated.data())), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PATCH /purchase-orders/:id/approve - approve PO
    if (path.startsWith('/purchase-orders/') && path.endsWith('/approve') && method === 'PATCH') {
      const id = path.split('/purchase-orders/')[1].replace('/approve', '');
      if (!id) {
        return new Response(JSON.stringify({ error: 'Purchase order ID is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const docRef = db.collection('purchase_orders').doc(id);
      const existing = await docRef.get();
      if (!existing.exists) {
        return new Response(JSON.stringify({ error: 'Purchase order not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = existing.data();
      if (data?.tenantId !== user.tenantId) {
        return new Response(JSON.stringify({ error: 'Purchase order not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const status = data.status as PurchaseOrderStatus;
      if (status !== 'draft' && status !== 'pending') {
        return new Response(
          JSON.stringify({
            error: `Cannot approve purchase order with status ${status}`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      await docRef.set(
        {
          status: 'approved',
          approvedBy: user.sub,
          approvedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      const updated = await docRef.get();
      return new Response(JSON.stringify(toPurchaseOrderRecord(updated.id, updated.data())), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PATCH /purchase-orders/:id/cancel - cancel PO
    if (path.startsWith('/purchase-orders/') && path.endsWith('/cancel') && method === 'PATCH') {
      const id = path.split('/purchase-orders/')[1].replace('/cancel', '');
      if (!id) {
        return new Response(JSON.stringify({ error: 'Purchase order ID is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const docRef = db.collection('purchase_orders').doc(id);
      const existing = await docRef.get();
      if (!existing.exists) {
        return new Response(JSON.stringify({ error: 'Purchase order not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = existing.data();
      if (data?.tenantId !== user.tenantId) {
        return new Response(JSON.stringify({ error: 'Purchase order not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const status = data.status as PurchaseOrderStatus;
      if (status === 'received') {
        return new Response(
          JSON.stringify({ error: 'Cannot cancel a fully received purchase order' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      await docRef.set(
        {
          status: 'cancelled',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      const updated = await docRef.get();
      return new Response(JSON.stringify(toPurchaseOrderRecord(updated.id, updated.data())), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 404
    return new Response(JSON.stringify({ error: 'Not Found', path, method }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[PurchaseOrders] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
}


