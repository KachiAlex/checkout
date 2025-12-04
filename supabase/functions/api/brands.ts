// Brands Handler for Supabase Edge Functions
import { corsHeaders } from '../_shared/cors.ts';
import { parseRequestBody } from '../_shared/request.ts';
import { getFirestoreInstance } from '../_shared/firestore.ts';
import { requireAuth } from '../_shared/jwt.ts';
import { FieldValue } from 'npm:firebase-admin@11.11.0/firestore';

interface CreateBrandInput {
  name: string;
  description?: string;
  logoUrl?: string;
}

export async function handleBrands(req: Request, path: string, method: string): Promise<Response> {
  try {
    const user = await requireAuth(req);
    const db = getFirestoreInstance();

    // GET /brands - List all brands
    if (path === '/brands' && method === 'GET') {
      const snapshot = await db.collection('brands')
        .where('tenantId', '==', user.tenantId)
        .get();

      const brands = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          tenantId: data.tenantId,
          name: data.name,
          description: data.description || undefined,
          logoUrl: data.logoUrl || undefined,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
      }).sort((a, b) => a.name.localeCompare(b.name));

      return new Response(
        JSON.stringify(brands),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /brands - Create brand
    if (path === '/brands' && method === 'POST') {
      const body = await parseRequestBody<CreateBrandInput>(req);
      
      if (!body || !body.name) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: name' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const brandRef = db.collection('brands').doc();
      const now = FieldValue.serverTimestamp();

      await brandRef.set({
        tenantId: user.tenantId,
        name: body.name.trim(),
        ...(body.description ? { description: body.description.trim() } : {}),
        ...(body.logoUrl ? { logoUrl: body.logoUrl } : {}),
        createdAt: now,
        updatedAt: now,
      });

      const created = await brandRef.get();
      const data = created.data();

      return new Response(
        JSON.stringify({
          id: created.id,
          tenantId: data?.tenantId,
          name: data?.name,
          description: data?.description || undefined,
          logoUrl: data?.logoUrl || undefined,
          createdAt: data?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH /brands/:id - Update brand
    const patchMatch = path.match(/^\/brands\/([^\/]+)$/);
    if (patchMatch && method === 'PATCH') {
      const brandId = patchMatch[1];
      const body = await parseRequestBody<Partial<CreateBrandInput>>(req);

      const brandRef = db.collection('brands').doc(brandId);
      const existing = await brandRef.get();

      if (!existing.exists) {
        return new Response(
          JSON.stringify({ error: 'Brand not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const existingData = existing.data();
      if (existingData?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const update: any = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (body.name !== undefined) update.name = body.name.trim();
      if (body.description !== undefined) update.description = body.description?.trim();
      if (body.logoUrl !== undefined) update.logoUrl = body.logoUrl;

      await brandRef.update(update);
      const updated = await brandRef.get();
      const updatedData = updated.data();

      return new Response(
        JSON.stringify({
          id: updated.id,
          tenantId: updatedData?.tenantId,
          name: updatedData?.name,
          description: updatedData?.description || undefined,
          logoUrl: updatedData?.logoUrl || undefined,
          createdAt: updatedData?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: updatedData?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
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
    console.error('[Brands] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

