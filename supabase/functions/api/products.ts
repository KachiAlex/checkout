// Products Handler for Supabase Edge Functions
import { corsHeaders } from '../_shared/cors.ts';
import { parseRequestBody, getQueryParams } from '../_shared/request.ts';
import { getFirestoreInstance } from '../_shared/firestore.ts';
import { requireAuth } from '../_shared/jwt.ts';
import { FieldValue, Timestamp } from 'npm:firebase-admin@11.11.0/firestore';
import { v4 as uuid } from 'npm:uuid@9.0.0';

interface CreateProductInput {
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  brandId?: string;
  brandName?: string;
  priceCents: number;
  costCents?: number;
  taxRate?: number;
  variants?: Record<string, unknown>;
  images?: string[];
  active?: boolean;
}

interface UpdateProductInput {
  sku?: string;
  barcode?: string;
  name?: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  brandId?: string;
  brandName?: string;
  priceCents?: number;
  costCents?: number;
  taxRate?: number;
  variants?: Record<string, unknown>;
  images?: string[];
  active?: boolean;
}

function toProductRecord(id: string, data: any) {
  return {
    id,
    tenantId: data.tenantId,
    sku: data.sku,
    barcode: data.barcode || undefined,
    name: data.name,
    description: data.description || undefined,
    categoryId: data.categoryId || undefined,
    categoryName: data.categoryName || undefined,
    brandId: data.brandId || undefined,
    brandName: data.brandName || undefined,
    priceCents: data.priceCents,
    costCents: data.costCents || undefined,
    taxRate: data.taxRate || 0,
    variants: data.variants || undefined,
    images: data.images || undefined,
    active: data.active !== undefined ? data.active : true,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}

export async function handleProducts(req: Request, path: string, method: string): Promise<Response> {
  try {
    const user = await requireAuth(req);
    const db = getFirestoreInstance();

    // GET /products - List products with optional search and location filter
    if (path === '/products' && method === 'GET') {
      const params = getQueryParams(req);
      const query = params.get('query') || undefined;
      const locationId = params.get('location_id') || undefined;

      // Get all products for tenant
      let snapshot = await db.collection('products')
        .where('tenantId', '==', user.tenantId)
        .where('active', '==', true)
        .get();

      let products = snapshot.docs.map(doc => toProductRecord(doc.id, doc.data()));

      // Apply search filter if provided
      if (query) {
        const normalized = query.trim().toLowerCase();
        products = products.filter((product) => {
          const { name, sku, barcode } = product;
          return (
            name.toLowerCase().includes(normalized) ||
            sku.toLowerCase().includes(normalized) ||
            (barcode && barcode.toLowerCase().includes(normalized))
          );
        });
      }

      // Location filtering is a placeholder - products are global per tenant
      // In the future, this could filter by inventory availability at location

      return new Response(
        JSON.stringify(products),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /products/:id - Get product by ID
    if (path.startsWith('/products/') && method === 'GET') {
      const productId = path.split('/products/')[1];
      if (!productId) {
        return new Response(
          JSON.stringify({ error: 'Product ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const doc = await db.collection('products').doc(productId).get();
      if (!doc.exists) {
        return new Response(
          JSON.stringify({ error: 'Product not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = doc.data();
      if (data?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Product not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(toProductRecord(doc.id, data)),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /products - Create product
    if (path === '/products' && method === 'POST') {
      const body = await parseRequestBody<CreateProductInput>(req);
      
      if (!body || !body.sku || !body.name) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: sku, name' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (body.priceCents === undefined || body.priceCents < 0) {
        return new Response(
          JSON.stringify({ error: 'priceCents must be a non-negative number' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const now = FieldValue.serverTimestamp();
      const id = uuid();

      const doc: any = {
        tenantId: user.tenantId,
        sku: body.sku,
        name: body.name,
        priceCents: body.priceCents,
        taxRate: body.taxRate ?? 0,
        active: body.active !== undefined ? body.active : true,
        ...(body.barcode ? { barcode: body.barcode } : {}),
        ...(body.description ? { description: body.description } : {}),
        ...(body.categoryId ? { categoryId: body.categoryId } : {}),
        ...(body.categoryName ? { categoryName: body.categoryName } : {}),
        ...(body.brandId ? { brandId: body.brandId } : {}),
        ...(body.brandName ? { brandName: body.brandName } : {}),
        ...(body.costCents !== undefined ? { costCents: body.costCents } : {}),
        ...(body.variants ? { variants: body.variants } : {}),
        ...(body.images ? { images: body.images } : {}),
        createdAt: now,
        updatedAt: now,
      };

      await db.collection('products').doc(id).set(doc);

      // Fetch created document
      const created = await db.collection('products').doc(id).get();
      const createdData = created.data();
      
      return new Response(
        JSON.stringify(toProductRecord(id, createdData)),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /products/:id - Update product
    if (path.startsWith('/products/') && method === 'PUT') {
      const productId = path.split('/products/')[1];
      if (!productId) {
        return new Response(
          JSON.stringify({ error: 'Product ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify product exists and belongs to tenant
      const existingDoc = await db.collection('products').doc(productId).get();
      if (!existingDoc.exists) {
        return new Response(
          JSON.stringify({ error: 'Product not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const existingData = existingDoc.data();
      if (existingData?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Product not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await parseRequestBody<UpdateProductInput>(req);
      if (!body) {
        return new Response(
          JSON.stringify({ error: 'Request body is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const payload: any = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (body.name !== undefined) payload.name = body.name;
      if (body.description !== undefined) payload.description = body.description;
      if (body.categoryId !== undefined) payload.categoryId = body.categoryId;
      if (body.categoryName !== undefined) payload.categoryName = body.categoryName;
      if (body.brandId !== undefined) payload.brandId = body.brandId;
      if (body.brandName !== undefined) payload.brandName = body.brandName;
      if (body.priceCents !== undefined) payload.priceCents = body.priceCents;
      if (body.costCents !== undefined) payload.costCents = body.costCents;
      if (body.taxRate !== undefined) payload.taxRate = body.taxRate;
      if (body.variants !== undefined) payload.variants = body.variants;
      if (body.images !== undefined) payload.images = body.images;
      if (body.active !== undefined) payload.active = body.active;
      if (body.barcode !== undefined) payload.barcode = body.barcode;
      if (body.sku !== undefined) payload.sku = body.sku;

      await db.collection('products').doc(productId).set(payload, { merge: true });

      // Fetch updated document
      const updated = await db.collection('products').doc(productId).get();
      const updatedData = updated.data();

      return new Response(
        JSON.stringify(toProductRecord(productId, updatedData)),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 404
    return new Response(
      JSON.stringify({ error: 'Not Found', path, method }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Products] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

