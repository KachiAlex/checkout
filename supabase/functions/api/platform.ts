// Platform Management Handler for Supabase Edge Functions
import { corsHeaders } from '../_shared/cors.ts';
import { parseRequestBody } from '../_shared/request.ts';
import { getFirestoreInstance } from '../_shared/firestore.ts';
import bcrypt from 'npm:bcryptjs@2.4.3';
import { Timestamp, FieldValue } from 'npm:firebase-admin@11.11.0/firestore';

interface CreateTenantPayload {
  name: string;
  slug: string;
  plan: string;
  seatLimit?: number;
  adminEmail: string;
  adminName?: string;
  adminPassword: string;
  billingCycleStart?: string;
  billingCycleEnd?: string;
}

interface UpdateSubscriptionPayload {
  plan?: string;
  seatLimit?: number;
  billingCycleStart?: string | null;
  billingCycleEnd?: string | null;
}

// Helper to normalize slug
function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Helper to generate a random PIN
function generateDefaultPin(): string {
  return Math.random().toString().slice(2, 8).padStart(6, '0');
}

// Public registration handler - creates tenant with FREE tier (14-day trial)
async function handlePublicRegistration(req: Request): Promise<Response> {
  try {
    const body = await parseRequestBody<{
      companyName: string;
      companySlug: string;
      adminName: string;
      adminEmail: string;
      adminPassword: string;
    }>(req);
    
    if (!body || !body.companyName || !body.companySlug || !body.adminName || !body.adminEmail || !body.adminPassword) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: companyName, companySlug, adminName, adminEmail, adminPassword' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const db = getFirestoreInstance();
    const normalizedSlug = normalizeSlug(body.companySlug);

    // Check if slug already exists
    const existingSnapshot = await db.collection('tenants')
      .where('slug', '==', normalizedSlug)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      return new Response(
        JSON.stringify({ error: 'Company slug already in use. Please choose a different one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set FREE tier with 14-day expiration
    const now = new Date();
    const billingCycleStart = Timestamp.fromDate(now);
    const billingCycleEnd = Timestamp.fromDate(new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)); // 14 days

    const tenantData: any = {
      name: body.companyName.trim(),
      slug: normalizedSlug,
      plan: 'free', // FREE tier
      status: 'active', // Auto-activate for free tier
      seatLimit: 1, // Free tier: 1 location
      contactEmail: body.adminEmail.toLowerCase(),
      billingCycleStart,
      billingCycleEnd,
      metadata: {
        registrationSource: 'public',
        registeredAt: now.toISOString(),
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const tenantRef = await db.collection('tenants').add(tenantData);
    const tenantDoc = await tenantRef.get();
    const tenant = tenantDoc.data();

    // Create admin user
    const pinHash = await bcrypt.hash(body.adminPassword, 10);
    const adminData = {
      name: body.adminName.trim(),
      email: body.adminEmail.toLowerCase(),
      role: 'admin',
      pinHash,
      tenantId: tenantRef.id,
      isPlatformAdmin: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const adminRef = await db.collection('users').add(adminData);
    const adminDoc = await adminRef.get();
    const admin = adminDoc.data();

    return new Response(
      JSON.stringify({
        success: true,
        tenant: {
          id: tenantRef.id,
          name: tenant?.name || body.companyName,
          slug: tenant?.slug || normalizedSlug,
          plan: 'free',
          status: 'active',
          billingCycleEnd: billingCycleEnd.toDate().toISOString(),
        },
        admin: {
          id: adminRef.id,
          email: admin?.email || body.adminEmail,
        },
        message: 'Registration successful! Your 14-day free trial has started.',
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Platform] Public registration error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to register', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

export async function handlePlatform(req: Request, path: string, method: string): Promise<Response> {
  console.log('[Platform] Request:', { path, method });

  // Handle public registration (no auth required)
  if (path === '/platform/register' && method === 'POST') {
    return handlePublicRegistration(req);
  }

  // Handle tenant listing
  if (path === '/platform/tenants' && method === 'GET') {
    return handleListTenants(req);
  }

  // Handle tenant creation
  if (path === '/platform/tenants' && method === 'POST') {
    return handleCreateTenant(req);
  }

  // Handle tenant-specific operations
  const tenantMatch = path.match(/^\/platform\/tenants\/([^\/]+)(?:\/(.+))?$/);
  if (tenantMatch) {
    const tenantId = tenantMatch[1];
    const action = tenantMatch[2];

    if (action === 'subscription' && method === 'PUT') {
      return handleUpdateSubscription(req, tenantId);
    }
    if (action === 'reset-admin-pin' && method === 'POST') {
      return handleResetAdminPin(req, tenantId);
    }
    if (action === 'suspend' && method === 'POST') {
      return handleSuspendTenant(req, tenantId);
    }
    if (action === 'activate' && method === 'POST') {
      return handleActivateTenant(req, tenantId);
    }
    if (!action && method === 'DELETE') {
      return handleDeleteTenant(req, tenantId);
    }
  }

  return new Response(
    JSON.stringify({ error: 'Not Found', path }),
    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleListTenants(req: Request): Promise<Response> {
  try {
    const db = getFirestoreInstance();
    const tenantsSnapshot = await db.collection('tenants').get();

    const tenants = tenantsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        slug: data.slug || '',
        plan: data.plan || 'free',
        status: data.status || 'inactive',
        seatLimit: data.seatLimit || 1,
        contactEmail: data.contactEmail || undefined,
        billingCycleStart: data.billingCycleStart?.toDate?.()?.toISOString(),
        billingCycleEnd: data.billingCycleEnd?.toDate?.()?.toISOString(),
        metadata: data.metadata || {},
      };
    });

    return new Response(
      JSON.stringify(tenants),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Platform] List tenants error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to list tenants', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleCreateTenant(req: Request): Promise<Response> {
  try {
    const body = await parseRequestBody<CreateTenantPayload>(req);
    
    if (!body || !body.name || !body.slug || !body.adminEmail || !body.adminPassword) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, slug, adminEmail, adminPassword' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const db = getFirestoreInstance();
    const normalizedSlug = normalizeSlug(body.slug);

    // Check if slug already exists
    const existingSnapshot = await db.collection('tenants')
      .where('slug', '==', normalizedSlug)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      return new Response(
        JSON.stringify({ error: 'Tenant slug already in use' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create tenant
    const billingCycleStart = body.billingCycleStart ? new Date(body.billingCycleStart) : undefined;
    const billingCycleEnd = body.billingCycleEnd && body.plan !== 'lifetime' ? new Date(body.billingCycleEnd) : undefined;

    const tenantData: any = {
      name: body.name.trim(),
      slug: normalizedSlug,
      plan: body.plan || 'monthly',
      status: 'pending',
      seatLimit: body.seatLimit || 1,
      contactEmail: body.adminEmail.toLowerCase(),
      metadata: {},
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (billingCycleStart) {
      tenantData.billingCycleStart = Timestamp.fromDate(billingCycleStart);
    }
    if (billingCycleEnd) {
      tenantData.billingCycleEnd = Timestamp.fromDate(billingCycleEnd);
    }

    const tenantRef = await db.collection('tenants').add(tenantData);
    const tenantDoc = await tenantRef.get();
    const tenant = tenantDoc.data();

    // Create admin user
    const pinHash = await bcrypt.hash(body.adminPassword, 10);
    const adminData = {
      name: body.adminName?.trim() || `${body.name.trim()} Admin`,
      email: body.adminEmail.toLowerCase(),
      role: 'admin',
      pinHash,
      tenantId: tenantRef.id,
      isPlatformAdmin: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const adminRef = await db.collection('users').add(adminData);
    const adminDoc = await adminRef.get();
    const admin = adminDoc.data();

    return new Response(
      JSON.stringify({
        tenant: {
          id: tenantRef.id,
          name: tenant?.name || body.name,
          slug: tenant?.slug || normalizedSlug,
          plan: tenant?.plan || body.plan,
          status: tenant?.status || 'pending',
          seatLimit: tenant?.seatLimit || body.seatLimit || 1,
          contactEmail: tenant?.contactEmail || body.adminEmail,
          billingCycleStart: tenant?.billingCycleStart?.toDate?.()?.toISOString(),
          billingCycleEnd: tenant?.billingCycleEnd?.toDate?.()?.toISOString(),
        },
        admin: {
          id: adminRef.id,
          email: admin?.email || body.adminEmail,
        },
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Platform] Create tenant error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create tenant', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleUpdateSubscription(req: Request, tenantId: string): Promise<Response> {
  try {
    const body = await parseRequestBody<UpdateSubscriptionPayload>(req);
    const db = getFirestoreInstance();

    const tenantRef = db.collection('tenants').doc(tenantId);
    const tenantDoc = await tenantRef.get();

    if (!tenantDoc.exists) {
      return new Response(
        JSON.stringify({ error: 'Tenant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const update: any = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (body.plan !== undefined) update.plan = body.plan;
    if (body.seatLimit !== undefined) update.seatLimit = body.seatLimit;
    if (body.billingCycleStart !== undefined) {
      update.billingCycleStart = body.billingCycleStart 
        ? Timestamp.fromDate(new Date(body.billingCycleStart))
        : null;
    }
    if (body.billingCycleEnd !== undefined) {
      update.billingCycleEnd = body.billingCycleEnd 
        ? Timestamp.fromDate(new Date(body.billingCycleEnd))
        : null;
    }

    await tenantRef.update(update);
    const updatedDoc = await tenantRef.get();
    const updated = updatedDoc.data();

    return new Response(
      JSON.stringify({
        id: tenantId,
        name: updated?.name || '',
        slug: updated?.slug || '',
        plan: updated?.plan || 'free',
        status: updated?.status || 'inactive',
        seatLimit: updated?.seatLimit || 1,
        contactEmail: updated?.contactEmail || undefined,
        billingCycleStart: updated?.billingCycleStart?.toDate?.()?.toISOString(),
        billingCycleEnd: updated?.billingCycleEnd?.toDate?.()?.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Platform] Update subscription error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update subscription', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleResetAdminPin(req: Request, tenantId: string): Promise<Response> {
  try {
    const body = await parseRequestBody<{ adminEmail?: string }>(req);
    const db = getFirestoreInstance();

    // Find admin user for tenant
    let usersQuery = db.collection('users')
      .where('tenantId', '==', tenantId)
      .where('role', '==', 'admin');

    if (body?.adminEmail) {
      usersQuery = usersQuery.where('email', '==', body.adminEmail.toLowerCase());
    }

    const usersSnapshot = await usersQuery.limit(1).get();

    if (usersSnapshot.empty) {
      return new Response(
        JSON.stringify({ error: 'Admin user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminDoc = usersSnapshot.docs[0];
    const admin = adminDoc.data();
    const temporaryPin = generateDefaultPin();
    const pinHash = await bcrypt.hash(temporaryPin, 10);

    await db.collection('users').doc(adminDoc.id).update({
      pinHash,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return new Response(
      JSON.stringify({
        tenantId,
        adminUserId: adminDoc.id,
        adminEmail: admin?.email || undefined,
        temporaryPin,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Platform] Reset admin PIN error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to reset admin PIN', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleSuspendTenant(req: Request, tenantId: string): Promise<Response> {
  try {
    const db = getFirestoreInstance();
    const tenantRef = db.collection('tenants').doc(tenantId);
    const tenantDoc = await tenantRef.get();

    if (!tenantDoc.exists) {
      return new Response(
        JSON.stringify({ error: 'Tenant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await tenantRef.update({
      status: 'suspended',
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updatedDoc = await tenantRef.get();
    const updated = updatedDoc.data();

    return new Response(
      JSON.stringify({
        id: tenantId,
        name: updated?.name || '',
        slug: updated?.slug || '',
        plan: updated?.plan || 'free',
        status: 'suspended',
        seatLimit: updated?.seatLimit || 1,
        contactEmail: updated?.contactEmail || undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Platform] Suspend tenant error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to suspend tenant', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleActivateTenant(req: Request, tenantId: string): Promise<Response> {
  try {
    const db = getFirestoreInstance();
    const tenantRef = db.collection('tenants').doc(tenantId);
    const tenantDoc = await tenantRef.get();

    if (!tenantDoc.exists) {
      return new Response(
        JSON.stringify({ error: 'Tenant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await tenantRef.update({
      status: 'active',
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updatedDoc = await tenantRef.get();
    const updated = updatedDoc.data();

    return new Response(
      JSON.stringify({
        id: tenantId,
        name: updated?.name || '',
        slug: updated?.slug || '',
        plan: updated?.plan || 'free',
        status: 'active',
        seatLimit: updated?.seatLimit || 1,
        contactEmail: updated?.contactEmail || undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Platform] Activate tenant error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to activate tenant', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleDeleteTenant(req: Request, tenantId: string): Promise<Response> {
  try {
    const db = getFirestoreInstance();
    const tenantRef = db.collection('tenants').doc(tenantId);
    const tenantDoc = await tenantRef.get();

    if (!tenantDoc.exists) {
      return new Response(
        JSON.stringify({ error: 'Tenant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete all users for this tenant
    const usersSnapshot = await db.collection('users')
      .where('tenantId', '==', tenantId)
      .get();

    const deletePromises = usersSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);

    // Delete the tenant
    await tenantRef.delete();

    return new Response(
      JSON.stringify({
        tenantId,
        removedUsers: usersSnapshot.size,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Platform] Delete tenant error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete tenant', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

