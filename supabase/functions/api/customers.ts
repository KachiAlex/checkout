// Customers Handler for Supabase Edge Functions
import { corsHeaders } from '../_shared/cors.ts';
import { parseRequestBody, getQueryParams } from '../_shared/request.ts';
import { getFirestoreInstance } from '../_shared/firestore.ts';
import { requireAuth } from '../_shared/jwt.ts';
import { FieldValue, Timestamp } from 'npm:firebase-admin@11.11.0/firestore';

interface CreateCustomerInput {
  name: string;
  phone?: string;
  email?: string;
  loyaltyId?: string;
  preferredPaymentMethod?: 'cash' | 'card' | 'qr' | 'transfer';
  dateOfBirth?: string;
  address?: string;
  notes?: string;
}

interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  email?: string;
  loyaltyId?: string;
  preferredPaymentMethod?: 'cash' | 'card' | 'qr' | 'transfer';
  dateOfBirth?: string;
  address?: string;
  notes?: string;
}

function toCustomerRecord(id: string, data: any) {
  return {
    id,
    tenantId: data.tenantId,
    name: data.name,
    phone: data.phone || undefined,
    email: data.email || undefined,
    loyaltyId: data.loyaltyId || undefined,
    loyaltyPoints: data.loyaltyPoints || 0,
    storeCreditCents: data.storeCreditCents || 0,
    preferredPaymentMethod: data.preferredPaymentMethod || undefined,
    dateOfBirth: data.dateOfBirth?.toDate?.()?.toISOString() || undefined,
    address: data.address || undefined,
    notes: data.notes || undefined,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}

export async function handleCustomers(req: Request, path: string, method: string): Promise<Response> {
  try {
    const user = await requireAuth(req);
    const db = getFirestoreInstance();

    // GET /customers - List all customers
    if (path === '/customers' && method === 'GET') {
      const params = getQueryParams(req);
      const search = params.get('search') || undefined;

      const snapshot = await db.collection('customers')
        .where('tenantId', '==', user.tenantId)
        .orderBy('name', 'asc')
        .get();

      let customers = snapshot.docs.map(doc => toCustomerRecord(doc.id, doc.data()));

      // Apply search filter if provided
      if (search) {
        const searchLower = search.toLowerCase();
        customers = customers.filter(
          (c) =>
            c.name.toLowerCase().includes(searchLower) ||
            c.phone?.toLowerCase().includes(searchLower) ||
            c.email?.toLowerCase().includes(searchLower) ||
            c.loyaltyId?.toLowerCase().includes(searchLower),
        );
      }

      return new Response(
        JSON.stringify(customers),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /customers/search - Search customers by phone or loyalty ID
    if (path === '/customers/search' && method === 'GET') {
      const params = getQueryParams(req);
      const phone = params.get('phone') || undefined;
      const loyaltyId = params.get('loyaltyId') || undefined;

      if (phone) {
        const snapshot = await db.collection('customers')
          .where('tenantId', '==', user.tenantId)
          .where('phone', '==', phone)
          .limit(1)
          .get();

        if (snapshot.empty) {
          return new Response(
            JSON.stringify(null),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify(toCustomerRecord(snapshot.docs[0].id, snapshot.docs[0].data())),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (loyaltyId) {
        const snapshot = await db.collection('customers')
          .where('tenantId', '==', user.tenantId)
          .where('loyaltyId', '==', loyaltyId)
          .limit(1)
          .get();

        if (snapshot.empty) {
          return new Response(
            JSON.stringify(null),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify(toCustomerRecord(snapshot.docs[0].id, snapshot.docs[0].data())),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(null),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /customers/:id - Get customer by ID
    if (path.startsWith('/customers/') && method === 'GET') {
      const customerId = path.split('/customers/')[1];
      if (!customerId) {
        return new Response(
          JSON.stringify({ error: 'Customer ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const doc = await db.collection('customers').doc(customerId).get();
      if (!doc.exists) {
        return new Response(
          JSON.stringify({ error: 'Customer not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = doc.data();
      if (data?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Customer not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(toCustomerRecord(doc.id, data)),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /customers - Create customer
    if (path === '/customers' && method === 'POST') {
      const body = await parseRequestBody<CreateCustomerInput>(req);
      
      if (!body || !body.name) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: name' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const now = FieldValue.serverTimestamp();
      const id = db.collection('customers').doc().id;

      // Generate loyalty ID if not provided
      const loyaltyId = body.loyaltyId || `LOY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      const doc: any = {
        tenantId: user.tenantId,
        name: body.name.trim(),
        loyaltyId,
        loyaltyPoints: 0,
        storeCreditCents: 0,
        ...(body.phone ? { phone: body.phone } : {}),
        ...(body.email ? { email: body.email.toLowerCase() } : {}),
        ...(body.preferredPaymentMethod ? { preferredPaymentMethod: body.preferredPaymentMethod } : {}),
        ...(body.dateOfBirth
          ? { dateOfBirth: Timestamp.fromDate(new Date(body.dateOfBirth)) }
          : {}),
        ...(body.address ? { address: body.address } : {}),
        ...(body.notes ? { notes: body.notes } : {}),
        createdAt: now,
        updatedAt: now,
      };

      await db.collection('customers').doc(id).set(doc);

      // Fetch created document
      const created = await db.collection('customers').doc(id).get();
      const createdData = created.data();

      return new Response(
        JSON.stringify(toCustomerRecord(id, createdData)),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH /customers/:id - Update customer
    if (path.startsWith('/customers/') && method === 'PATCH') {
      const customerId = path.split('/customers/')[1];
      if (!customerId) {
        return new Response(
          JSON.stringify({ error: 'Customer ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify customer exists and belongs to tenant
      const existingDoc = await db.collection('customers').doc(customerId).get();
      if (!existingDoc.exists) {
        return new Response(
          JSON.stringify({ error: 'Customer not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const existingData = existingDoc.data();
      if (existingData?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Customer not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await parseRequestBody<UpdateCustomerInput>(req);
      if (!body) {
        return new Response(
          JSON.stringify({ error: 'Request body is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const payload: any = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (body.name !== undefined) payload.name = body.name.trim();
      if (body.phone !== undefined) payload.phone = body.phone || undefined;
      if (body.email !== undefined) payload.email = body.email?.toLowerCase() || undefined;
      if (body.loyaltyId !== undefined) payload.loyaltyId = body.loyaltyId || undefined;
      if (body.preferredPaymentMethod !== undefined) payload.preferredPaymentMethod = body.preferredPaymentMethod || undefined;
      if (body.dateOfBirth !== undefined) {
        payload.dateOfBirth = body.dateOfBirth ? Timestamp.fromDate(new Date(body.dateOfBirth)) : undefined;
      }
      if (body.address !== undefined) payload.address = body.address || undefined;
      if (body.notes !== undefined) payload.notes = body.notes || undefined;

      await db.collection('customers').doc(customerId).set(payload, { merge: true });

      // Fetch updated document
      const updated = await db.collection('customers').doc(customerId).get();
      const updatedData = updated.data();

      return new Response(
        JSON.stringify(toCustomerRecord(customerId, updatedData)),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 404
    return new Response(
      JSON.stringify({ error: 'Not Found', path, method }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Customers] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

