// GRN (Goods Received Note) Handler for Supabase Edge Functions
import { corsHeaders } from '../_shared/cors.ts';
import { parseRequestBody, getQueryParams } from '../_shared/request.ts';
import { getFirestoreInstance } from '../_shared/firestore.ts';
import { requireAuth } from '../_shared/jwt.ts';
import { FieldValue, Timestamp } from 'npm:firebase-admin@11.11.0/firestore';

type TimestampField = Timestamp | typeof FieldValue | null | undefined;

type GRNStatus = 'draft' | 'completed' | 'cancelled';

interface GRNItem {
  productId: string;
  productName: string;
  sku: string;
  orderedQuantity: number;
  receivedQuantity: number;
  batchNumber?: string;
  expiryDate?: string;
  unitCostCents: number;
  totalCostCents: number;
}

interface CreateGRNInput {
  purchaseOrderId: string;
  items: GRNItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
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

function parseExpiryDate(value?: string | number | Date | TimestampField): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return undefined;
}

function toGRNRecord(id: string, data: any) {
  return {
    id,
    tenantId: data.tenantId,
    locationId: data.locationId,
    purchaseOrderId: data.purchaseOrderId,
    purchaseOrderNumber: data.purchaseOrderNumber,
    supplierId: data.supplierId,
    supplierName: data.supplierName,
    grnNumber: data.grnNumber,
    status: data.status as GRNStatus,
    items: (data.items || []).map((item: any) => ({
      ...item,
      expiryDate: item.expiryDate ? tsToIso(item.expiryDate) : undefined,
    })),
    subtotalCents: data.subtotalCents,
    taxCents: data.taxCents,
    totalCents: data.totalCents,
    receivedBy: data.receivedBy,
    receivedAt: tsToIso(data.receivedAt),
    notes: data.notes || undefined,
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

export async function handleGRN(
  req: Request,
  path: string,
  method: string,
): Promise<Response> {
  try {
    const user = await requireAuth(req);
    const db = getFirestoreInstance();

    // GET /grn - list all GRNs for tenant (optional location_id)
    if (path === '/grn' && method === 'GET') {
      const params = getQueryParams(req);
      const locationId = params.get('location_id') || undefined;

      let query = db.collection('grn').where('tenantId', '==', user.tenantId);
      if (locationId) {
        query = query.where('locationId', '==', locationId);
      }

      const snapshot = await query.orderBy('receivedAt', 'desc').get();
      const grns = snapshot.docs.map((doc) => toGRNRecord(doc.id, doc.data()));

      return new Response(JSON.stringify(grns), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /grn/:id - get GRN by id
    if (path.startsWith('/grn/') && !path.includes('/purchase-order/') && method === 'GET') {
      const id = path.split('/grn/')[1];
      if (!id) {
        return new Response(JSON.stringify({ error: 'GRN ID is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const doc = await db.collection('grn').doc(id).get();
      if (!doc.exists) {
        return new Response(JSON.stringify({ error: 'GRN not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = doc.data();
      if (data?.tenantId !== user.tenantId) {
        return new Response(JSON.stringify({ error: 'GRN not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(toGRNRecord(doc.id, data)), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /grn/purchase-order/:poId - GRNs for a purchase order
    if (path.startsWith('/grn/purchase-order/') && method === 'GET') {
      const poId = path.split('/grn/purchase-order/')[1];
      if (!poId) {
        return new Response(JSON.stringify({ error: 'Purchase order ID is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify PO belongs to tenant
      const poDoc = await db.collection('purchase_orders').doc(poId).get();
      if (!poDoc.exists || poDoc.data()?.tenantId !== user.tenantId) {
        return new Response(JSON.stringify({ error: 'Purchase order not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const poData = poDoc.data();

      const grnSnapshot = await db
        .collection('grn')
        .where('tenantId', '==', user.tenantId)
        .where('purchaseOrderId', '==', poId)
        .orderBy('receivedAt', 'desc')
        .get();

      const grns = grnSnapshot.docs.map((doc) => toGRNRecord(doc.id, doc.data()));

      return new Response(
        JSON.stringify({
          purchaseOrder: toPurchaseOrderSummary(poDoc.id, poData),
          grns,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // POST /grn - create GRN
    if (path === '/grn' && method === 'POST') {
      const body = await parseRequestBody<CreateGRNInput>(req);

      if (!body || !body.purchaseOrderId || !body.items || body.items.length === 0) {
        return new Response(
          JSON.stringify({
            error: 'Missing required fields: purchaseOrderId, items',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      const locationId = user.locationId;
      if (!locationId) {
        return new Response(JSON.stringify({ error: 'Location ID is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify PO exists and is approved or partially_received
      const poDoc = await db.collection('purchase_orders').doc(body.purchaseOrderId).get();
      if (!poDoc.exists || poDoc.data()?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({
            error: `Purchase order with ID ${body.purchaseOrderId} not found`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      const po = poDoc.data()!;
      const poStatus = po.status as
        | 'draft'
        | 'pending'
        | 'approved'
        | 'partially_received'
        | 'received'
        | 'cancelled';
      if (poStatus !== 'approved' && poStatus !== 'partially_received') {
        return new Response(
          JSON.stringify({
            error: `Cannot create GRN for purchase order with status ${poStatus}`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      // Create GRN document
      const now = FieldValue.serverTimestamp();
      const grnRef = db.collection('grn').doc();
      const grnNumber = `GRN-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 6)
        .toUpperCase()}`;

      const grnDoc: any = {
        tenantId: user.tenantId,
        locationId,
        purchaseOrderId: body.purchaseOrderId,
        purchaseOrderNumber: po.orderNumber,
        supplierId: po.supplierId,
        supplierName: po.supplierName,
        grnNumber,
        status: 'completed' as GRNStatus,
        items: body.items.map((item) => ({
          ...item,
          ...(item.expiryDate
            ? { expiryDate: Timestamp.fromDate(parseExpiryDate(item.expiryDate)!) }
            : {}),
        })),
        subtotalCents: body.subtotalCents,
        taxCents: body.taxCents,
        totalCents: body.totalCents,
        receivedBy: user.sub,
        receivedAt: now,
        ...(body.notes ? { notes: body.notes } : {}),
        createdAt: now,
        updatedAt: now,
      };

      await grnRef.set(grnDoc);

      // Track new vs restocked products
      const newProducts: string[] = [];
      const restockedProducts: string[] = [];

      // Update inventory & batch inventory
      for (const item of body.items) {
        if (item.receivedQuantity > 0) {
          // Check if product exists, create if it doesn't
          let productId = item.productId;
          let productExists = false;
          
          // Only check if productId is provided and not empty
          if (productId && typeof productId === 'string' && productId.trim() !== '') {
            try {
              const productDoc = await db.collection('products').doc(productId).get();
              productExists = productDoc.exists;
            } catch (err) {
              console.warn(`[GRN] Error checking product ${productId}:`, err);
              productExists = false;
            }
          }
          
          if (!productExists) {
            // Product doesn't exist or productId is empty, create it from PO item data
            if (!item.productName || item.productName.trim() === '') {
              throw new Error(`Product name is required for item with SKU: ${item.sku || 'unknown'}`);
            }
            
            const newProductRef = db.collection('products').doc();
            productId = newProductRef.id;
            
            // Generate SKU if not provided
            const sku = item.sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Validate unitCostCents
            const unitCostCents = item.unitCostCents || 0;
            if (unitCostCents <= 0) {
              throw new Error(`Unit cost must be greater than 0 for product: ${item.productName}`);
            }
            
            // Create product with cost as base price (can be adjusted later)
            // Use 50% markup: selling price = cost * 1.5
            const salesPriceCents = Math.round(unitCostCents * 1.5); // Default markup 50%
            
            await newProductRef.set({
              tenantId: user.tenantId,
              sku,
              name: item.productName.trim(),
              priceCents: salesPriceCents,
              costCents: unitCostCents,
              taxRate: 0.075,
              active: true,
              createdAt: now,
              updatedAt: now,
            });
            
            console.log(`[GRN] Created new product ${productId} from PO item: ${item.productName} (SKU: ${sku})`);
            
            // Track as new product
            newProducts.push(productId);
          } else {
            // Track as restocked product
            restockedProducts.push(productId);
          }

          // Inventory record
          const invSnapshot = await db
            .collection('inventory')
            .where('productId', '==', productId)
            .where('locationId', '==', locationId)
            .limit(1)
            .get();

          let inventoryId: string;
          let currentQuantity = 0;
          let currentData: any | null = null;

          if (invSnapshot.empty) {
            inventoryId = db.collection('inventory').doc().id;
          } else {
            inventoryId = invSnapshot.docs[0].id;
            currentData = invSnapshot.docs[0].data();
            currentQuantity = currentData.quantity || 0;
          }

          const isNewProduct = !currentData;
          const newQuantity = currentQuantity + item.receivedQuantity;

          // Get product price if not in current inventory data
          let salesPriceCents = currentData?.salesPriceCents;
          if (!salesPriceCents) {
            try {
              const productDoc = await db.collection('products').doc(productId).get();
              salesPriceCents = productDoc.data()?.priceCents || item.unitCostCents * 1.5;
            } catch (err) {
              console.warn(`[GRN] Error fetching product price for ${productId}:`, err);
              salesPriceCents = item.unitCostCents * 1.5; // Fallback to 50% markup
            }
          }

          const inventoryPayload: any = {
            productId: productId, // Use potentially new productId
            locationId,
            quantity: newQuantity,
            costCents: item.unitCostCents,
            salesPriceCents: salesPriceCents,
            updatedAt: now,
          };

          // Only include optional fields if they have values (not undefined)
          if (currentData?.reorderPoint !== undefined) {
            inventoryPayload.reorderPoint = currentData.reorderPoint;
          }
          if (currentData?.maxStock !== undefined) {
            inventoryPayload.maxStock = currentData.maxStock;
          }

          if (!currentData) {
            inventoryPayload.createdAt = now;
          }

          await db.collection('inventory').doc(inventoryId).set(inventoryPayload, {
            merge: true,
          });


          // Batch inventory
          if (item.batchNumber) {
            const batchRef = db.collection('batchInventory').doc();
            await batchRef.set({
              productId: productId, // Use potentially new productId
              locationId,
              batchNumber: item.batchNumber,
              quantity: item.receivedQuantity,
              unitCostCents: item.unitCostCents,
              purchaseOrderId: body.purchaseOrderId,
              grnId: grnRef.id,
              ...(item.expiryDate
                ? { expiryDate: Timestamp.fromDate(parseExpiryDate(item.expiryDate)!) }
                : {}),
              createdAt: now,
              updatedAt: now,
            });
          }

          // Inventory transaction
          const txRef = db.collection('inventoryTransactions').doc();
          await txRef.set({
            productId: productId, // Use potentially new productId
            locationId,
            delta: item.receivedQuantity,
            type: 'RECEIVED',
            referenceId: body.purchaseOrderId,
            userId: user.sub,
            notes: `GRN ${grnNumber} - Received from PO ${po.orderNumber}`,
            ts: now,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      // Update purchase order status & received quantities
      const totalReceived = body.items.reduce(
        (sum, item) => sum + (item.receivedQuantity || 0),
        0,
      );
      const totalOrdered = (po.items || []).reduce(
        (sum: number, item: any) => sum + (item.quantity || 0),
        0,
      );

      let newStatus: PurchaseOrderStatus = poStatus;
      if (totalReceived >= totalOrdered) {
        newStatus = 'received';
      } else if (totalReceived > 0) {
        newStatus = 'partially_received';
      }

      const updatedItems = (po.items || []).map((poItem: any) => {
        const grnItem = body.items.find((i) => i.productId === poItem.productId);
        return {
          ...poItem,
          receivedQuantity:
            (poItem.receivedQuantity || 0) + (grnItem?.receivedQuantity || 0),
        };
      });

      await db.collection('purchase_orders').doc(body.purchaseOrderId).set(
        {
          status: newStatus,
          items: updatedItems,
          updatedAt: now,
        },
        { merge: true },
      );

      const createdGrn = await grnRef.get();
      return new Response(
        JSON.stringify({
          ...toGRNRecord(createdGrn.id, createdGrn.data()),
          metadata: {
            newProductsCount: newProducts.length,
            restockedProductsCount: restockedProducts.length,
            newProductIds: newProducts,
            restockedProductIds: restockedProducts,
          },
        }),
        {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // 404
    return new Response(JSON.stringify({ error: 'Not Found', path, method }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[GRN] Error:', error);
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

function toPurchaseOrderSummary(id: string, data: any) {
  return {
    id,
    tenantId: data.tenantId,
    locationId: data.locationId,
    supplierId: data.supplierId,
    supplierName: data.supplierName,
    orderNumber: data.orderNumber,
    status: data.status,
    subtotalCents: data.subtotalCents,
    taxCents: data.taxCents,
    totalCents: data.totalCents,
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}


