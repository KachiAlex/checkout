// Locations Handler for Supabase Edge Functions
import { corsHeaders } from '../_shared/cors.ts';
import { parseRequestBody } from '../_shared/request.ts';
import { getFirestoreInstance } from '../_shared/firestore.ts';
import { requireAuth } from '../_shared/jwt.ts';
import { FieldValue } from 'npm:firebase-admin@11.11.0/firestore';

interface CreateLocationInput {
  name: string;
  address?: string;
  timezone?: string;
  defaultPrinter?: string;
}

export async function handleLocations(req: Request, path: string, method: string): Promise<Response> {
  try {
    const user = await requireAuth(req);
    const db = getFirestoreInstance();

    // GET /locations - List all locations for tenant
    if (path === '/locations' && method === 'GET') {
      const snapshot = await db.collection('locations')
        .where('tenantId', '==', user.tenantId)
        .get();

      const locations = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          address: data.address || undefined,
          timezone: data.timezone || 'UTC',
          defaultPrinter: data.defaultPrinter || undefined,
          tenantId: data.tenantId || undefined,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
      }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      return new Response(
        JSON.stringify(locations),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /locations - Create location
    if (path === '/locations' && method === 'POST') {
      const body = await parseRequestBody<CreateLocationInput>(req);
      
      if (!body || !body.name) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: name' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const locationRef = db.collection('locations').doc();
      const now = FieldValue.serverTimestamp();

      await locationRef.set({
        name: body.name.trim(),
        // Firestore does not allow undefined values; use null when not provided
        address: body.address ? body.address.trim() : null,
        timezone: body.timezone || 'UTC',
        defaultPrinter: body.defaultPrinter ?? null,
        tenantId: user.tenantId,
        createdAt: now,
        updatedAt: now,
      });

      const created = await locationRef.get();
      const data = created.data();

      return new Response(
        JSON.stringify({
          id: created.id,
          name: data?.name,
          address: data?.address || undefined,
          timezone: data?.timezone || 'UTC',
          defaultPrinter: data?.defaultPrinter || undefined,
          tenantId: data?.tenantId || undefined,
          createdAt: data?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH /locations/:id - Update location
    const patchMatch = path.match(/^\/locations\/([^\/]+)$/);
    if (patchMatch && method === 'PATCH') {
      const locationId = patchMatch[1];
      const body = await parseRequestBody<Partial<CreateLocationInput>>(req);

      const locationRef = db.collection('locations').doc(locationId);
      const existing = await locationRef.get();

      if (!existing.exists) {
        return new Response(
          JSON.stringify({ error: 'Location not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const existingData = existing.data();
      if (existingData?.tenantId && existingData.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const update: any = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (body.name !== undefined) update.name = body.name.trim();
      if (body.address !== undefined) update.address = body.address?.trim();
      if (body.timezone !== undefined) update.timezone = body.timezone;
      if (body.defaultPrinter !== undefined) update.defaultPrinter = body.defaultPrinter;

      await locationRef.update(update);
      const updated = await locationRef.get();
      const updatedData = updated.data();

      return new Response(
        JSON.stringify({
          id: updated.id,
          name: updatedData?.name,
          address: updatedData?.address || undefined,
          timezone: updatedData?.timezone || 'UTC',
          defaultPrinter: updatedData?.defaultPrinter || undefined,
          tenantId: updatedData?.tenantId || undefined,
          createdAt: updatedData?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: updatedData?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /locations/:id - Delete location
    const deleteMatch = path.match(/^\/locations\/([^\/]+)$/);
    if (deleteMatch && method === 'DELETE') {
      const locationId = deleteMatch[1];

      const locationRef = db.collection('locations').doc(locationId);
      const existing = await locationRef.get();

      if (!existing.exists) {
        return new Response(
          JSON.stringify({ error: 'Location not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const existingData = existing.data();
      if (existingData?.tenantId && existingData.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await locationRef.delete();

      return new Response(
        JSON.stringify({ success: true, message: 'Location deleted' }),
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
    console.error('[Locations] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

