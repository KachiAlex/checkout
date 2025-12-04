// Categories Handler for Supabase Edge Functions
import { corsHeaders } from '../_shared/cors.ts';
import { parseRequestBody } from '../_shared/request.ts';
import { getFirestoreInstance } from '../_shared/firestore.ts';
import { requireAuth } from '../_shared/jwt.ts';
import { FieldValue, Timestamp } from 'npm:firebase-admin@11.11.0/firestore';

interface CreateCategoryInput {
  name: string;
  description?: string;
  parentId?: string;
}

export async function handleCategories(req: Request, path: string, method: string): Promise<Response> {
  try {
    const user = await requireAuth(req);
    const db = getFirestoreInstance();

    // GET /categories - List all categories
    if (path === '/categories' && method === 'GET') {
      const snapshot = await db.collection('categories')
        .where('tenantId', '==', user.tenantId)
        .get();

      const categories = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          tenantId: data.tenantId,
          name: data.name,
          description: data.description || undefined,
          parentId: data.parentId || undefined,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
      }).sort((a, b) => a.name.localeCompare(b.name));

      return new Response(
        JSON.stringify(categories),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /categories - Create category
    if (path === '/categories' && method === 'POST') {
      const body = await parseRequestBody<CreateCategoryInput>(req);
      
      if (!body || !body.name) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: name' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const categoryRef = db.collection('categories').doc();
      const now = FieldValue.serverTimestamp();

      await categoryRef.set({
        tenantId: user.tenantId,
        name: body.name.trim(),
        ...(body.description ? { description: body.description.trim() } : {}),
        ...(body.parentId ? { parentId: body.parentId } : {}),
        createdAt: now,
        updatedAt: now,
      });

      const created = await categoryRef.get();
      const data = created.data();

      return new Response(
        JSON.stringify({
          id: created.id,
          tenantId: data?.tenantId,
          name: data?.name,
          description: data?.description || undefined,
          parentId: data?.parentId || undefined,
          createdAt: data?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH /categories/:id - Update category
    const patchMatch = path.match(/^\/categories\/([^\/]+)$/);
    if (patchMatch && method === 'PATCH') {
      const categoryId = patchMatch[1];
      const body = await parseRequestBody<Partial<CreateCategoryInput>>(req);

      const categoryRef = db.collection('categories').doc(categoryId);
      const existing = await categoryRef.get();

      if (!existing.exists) {
        return new Response(
          JSON.stringify({ error: 'Category not found' }),
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
      if (body.parentId !== undefined) update.parentId = body.parentId;

      await categoryRef.update(update);
      const updated = await categoryRef.get();
      const updatedData = updated.data();

      return new Response(
        JSON.stringify({
          id: updated.id,
          tenantId: updatedData?.tenantId,
          name: updatedData?.name,
          description: updatedData?.description || undefined,
          parentId: updatedData?.parentId || undefined,
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
    console.error('[Categories] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

