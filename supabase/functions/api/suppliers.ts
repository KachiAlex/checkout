// Suppliers Handler for Supabase Edge Functions
import { corsHeaders } from '../_shared/cors.ts';
import { parseRequestBody } from '../_shared/request.ts';
import { getFirestoreInstance } from '../_shared/firestore.ts';
import { requireAuth } from '../_shared/jwt.ts';
import { FieldValue, Timestamp } from 'npm:firebase-admin@11.11.0/firestore';

interface CreateSupplierInput {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  paymentTerms?: string;
  notes?: string;
  active?: boolean;
}

interface UpdateSupplierInput extends Partial<CreateSupplierInput> {}

type TimestampField = Timestamp | typeof FieldValue | null | undefined;

function timestampToIso(ts?: TimestampField): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  return new Date().toISOString();
}

function toSupplierRecord(id: string, data: any) {
  return {
    id,
    tenantId: data.tenantId,
    name: data.name,
    contactName: data.contactName || undefined,
    email: data.email || undefined,
    phone: data.phone || undefined,
    address: data.address || undefined,
    taxId: data.taxId || undefined,
    paymentTerms: data.paymentTerms || undefined,
    notes: data.notes || undefined,
    active: data.active ?? true,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

export async function handleSuppliers(req: Request, path: string, method: string): Promise<Response> {
  try {
    const user = await requireAuth(req);
    const db = getFirestoreInstance();

    // GET /suppliers - list all suppliers for tenant
    if (path === '/suppliers' && method === 'GET') {
      try {
        let snapshot;
        try {
          // Try to order by name (requires composite index)
          snapshot = await db
            .collection('suppliers')
            .where('tenantId', '==', user.tenantId)
            .orderBy('name', 'asc')
            .get();
        } catch (orderError: any) {
          // If orderBy fails (likely missing index), fetch without ordering and sort in memory
          console.warn('[Suppliers] orderBy failed, fetching without order:', orderError.message);
          snapshot = await db
            .collection('suppliers')
            .where('tenantId', '==', user.tenantId)
            .get();
        }

        let suppliers = snapshot.docs.map((doc) => {
          try {
            return toSupplierRecord(doc.id, doc.data());
          } catch (err: any) {
            console.error(`[Suppliers] Error converting doc ${doc.id}:`, err);
            return null;
          }
        }).filter((supplier): supplier is ReturnType<typeof toSupplierRecord> => supplier !== null);

        // Sort in memory if orderBy failed
        if (suppliers.length > 0) {
          suppliers.sort((a, b) => a.name.localeCompare(b.name));
        }

        return new Response(JSON.stringify(suppliers), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error: any) {
        console.error('[Suppliers] Error fetching suppliers:', error);
        return new Response(
          JSON.stringify({
            error: 'Failed to fetch suppliers',
            message: error.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
    }

    // GET /suppliers/:id - get supplier by id
    if (path.startsWith('/suppliers/') && method === 'GET') {
      const supplierId = path.split('/suppliers/')[1];
      if (!supplierId) {
        return new Response(JSON.stringify({ error: 'Supplier ID is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const doc = await db.collection('suppliers').doc(supplierId).get();
      if (!doc.exists) {
        return new Response(JSON.stringify({ error: 'Supplier not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = doc.data();
      if (data?.tenantId !== user.tenantId) {
        return new Response(JSON.stringify({ error: 'Supplier not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(toSupplierRecord(doc.id, data)), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /suppliers - create supplier
    if (path === '/suppliers' && method === 'POST') {
      const body = await parseRequestBody<CreateSupplierInput>(req);

      if (!body || !body.name) {
        return new Response(JSON.stringify({ error: 'Missing required field: name' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const now = FieldValue.serverTimestamp();
      const docRef = db.collection('suppliers').doc();

      const doc: any = {
        tenantId: user.tenantId,
        name: body.name.trim(),
        active: body.active ?? true,
        ...(body.contactName ? { contactName: body.contactName } : {}),
        ...(body.email ? { email: body.email } : {}),
        ...(body.phone ? { phone: body.phone } : {}),
        ...(body.address ? { address: body.address } : {}),
        ...(body.taxId ? { taxId: body.taxId } : {}),
        ...(body.paymentTerms ? { paymentTerms: body.paymentTerms } : {}),
        ...(body.notes ? { notes: body.notes } : {}),
        createdAt: now,
        updatedAt: now,
      };

      await docRef.set(doc);
      const created = await docRef.get();

      return new Response(JSON.stringify(toSupplierRecord(created.id, created.data())), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PATCH /suppliers/:id - update supplier
    if (path.startsWith('/suppliers/') && method === 'PATCH') {
      const supplierId = path.split('/suppliers/')[1];
      if (!supplierId) {
        return new Response(JSON.stringify({ error: 'Supplier ID is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const existing = await db.collection('suppliers').doc(supplierId).get();
      if (!existing.exists) {
        return new Response(JSON.stringify({ error: 'Supplier not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const existingData = existing.data();
      if (existingData?.tenantId !== user.tenantId) {
        return new Response(JSON.stringify({ error: 'Supplier not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await parseRequestBody<UpdateSupplierInput>(req);
      if (!body) {
        return new Response(JSON.stringify({ error: 'Request body is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const payload: any = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (body.name !== undefined) payload.name = body.name.trim();
      if (body.contactName !== undefined) payload.contactName = body.contactName || undefined;
      if (body.email !== undefined) payload.email = body.email || undefined;
      if (body.phone !== undefined) payload.phone = body.phone || undefined;
      if (body.address !== undefined) payload.address = body.address || undefined;
      if (body.taxId !== undefined) payload.taxId = body.taxId || undefined;
      if (body.paymentTerms !== undefined) payload.paymentTerms = body.paymentTerms || undefined;
      if (body.notes !== undefined) payload.notes = body.notes || undefined;
      if (body.active !== undefined) payload.active = body.active;

      await db.collection('suppliers').doc(supplierId).set(payload, { merge: true });

      const updated = await db.collection('suppliers').doc(supplierId).get();

      return new Response(JSON.stringify(toSupplierRecord(supplierId, updated.data())), {
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
    console.error('[Suppliers] Error:', error);
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


