// Fresh Auth Handler - Simple and Clean
import { corsHeaders } from '../_shared/cors.ts';
import { getFirestoreInstance } from '../_shared/firestore.ts';
import { parseRequestBody } from '../_shared/request.ts';
import bcrypt from 'npm:bcryptjs@2.4.3';

// Simple JWT creation using Web Crypto API (native to Deno, no external library needed)
export async function createJWT(payload: Record<string, any>, secret: string, expiresIn: number): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  // Encode header and payload
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(jwtPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  // Create signature using Web Crypto API
  const keyData = new TextEncoder().encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  );

  // Convert signature to base64url
  const signatureArray = new Uint8Array(signature);
  const signatureString = String.fromCharCode.apply(null, Array.from(signatureArray));
  const encodedSignature = btoa(signatureString)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

interface LoginRequest {
  tenantSlug: string;
  pin: string;
  deviceId: string;
}

interface SuperAdminLoginRequest {
  email: string;
  password: string;
}

export async function handleAuth(req: Request, path: string, method: string): Promise<Response> {
  console.log('[Auth] handleAuth called:', { path, method });
  if (path === '/auth/login' && method === 'POST') {
    console.log('[Auth] Routing to handleTenantLogin');
    return handleTenantLogin(req);
  }
  if (path === '/auth/superadmin/login' && method === 'POST') {
    return handleSuperAdminLogin(req);
  }
  if (path === '/auth/change-password' && method === 'POST') {
    return handleChangePassword(req);
  }
  return new Response(
    JSON.stringify({ error: 'Not Found' }),
    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleTenantLogin(req: Request): Promise<Response> {
  try {
    console.log('[Auth] Login request received');
    const body = await parseRequestBody<LoginRequest>(req);
    console.log('[Auth] Parsed body:', { tenantSlug: body?.tenantSlug, hasPin: !!body?.pin, hasDeviceId: !!body?.deviceId });
    
    if (!body?.tenantSlug || !body?.pin || !body?.deviceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Auth] Getting Firestore instance...');
    let db;
    try {
      db = getFirestoreInstance();
      console.log('[Auth] Firestore instance obtained');
    } catch (firestoreError) {
      console.error('[Auth] Firestore initialization error:', firestoreError);
      throw new Error(`Firestore initialization failed: ${firestoreError instanceof Error ? firestoreError.message : 'Unknown error'}`);
    }
    
    // Find tenant
    console.log('[Auth] Querying tenants with slug:', body.tenantSlug);
    let tenants;
    try {
      tenants = await db.collection('tenants')
        .where('slug', '==', body.tenantSlug)
        .limit(1)
        .get();
      console.log('[Auth] Tenant query result:', { empty: tenants.empty, count: tenants.docs.length });
    } catch (queryError) {
      console.error('[Auth] Tenant query error:', queryError);
      throw new Error(`Tenant query failed: ${queryError instanceof Error ? queryError.message : 'Unknown error'}`);
    }
    
    if (tenants.empty) {
      console.log('[Auth] Tenant not found for slug:', body.tenantSlug);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid tenant', 
          message: `No tenant found with slug: ${body.tenantSlug}`,
          receivedSlug: body.tenantSlug
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tenant = tenants.docs[0].data();
    const tenantId = tenants.docs[0].id;
    
    if (String(tenant.status || '').toUpperCase() !== 'ACTIVE') {
      return new Response(
        JSON.stringify({ error: 'Tenant not active' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find user
    const users = await db.collection('users')
      .where('tenantId', '==', tenantId)
      .get();

    let userDoc = null;
    let user = null;

    for (const doc of users.docs) {
      const u = doc.data();
      if (u.pinHash) {
        const isValid = await bcrypt.compare(body.pin, u.pinHash);
        if (isValid) {
          userDoc = doc;
          user = u;
          if (body.deviceId && u.deviceId !== body.deviceId) {
            await db.collection('users').doc(doc.id).update({ deviceId: body.deviceId });
            user.deviceId = body.deviceId;
          }
          break;
        }
      }
    }

    if (!userDoc || !user) {
      console.log('[Auth] Invalid credentials - no matching user found');
      console.log('[Auth] Debug info:', {
        tenantId,
        usersFound: users.docs.length,
        usersChecked: users.docs.map(d => ({ id: d.id, hasPinHash: !!d.data().pinHash }))
      });
      return new Response(
        JSON.stringify({ 
          error: 'Invalid credentials', 
          message: 'PIN does not match any user for this tenant',
          debug: {
            tenantId,
            usersFound: users.docs.length,
          }
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create JWT tokens using simple Web Crypto API
    const jwtSecret = Deno.env.get('JWT_SECRET');
    if (!jwtSecret) {
      console.error('[Auth] JWT_SECRET not configured in Supabase secrets');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error', 
          message: 'JWT_SECRET is not configured. Please contact support.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Auth] Creating access token...');
    let accessToken;
    try {
      accessToken = await createJWT(
        {
          sub: userDoc.id,
          tenantId,
          role: user.role || 'cashier',
          locationId: user.locationId || null,
          deviceId: user.deviceId || null,
          isPlatformAdmin: user.isPlatformAdmin || false,
        },
        jwtSecret,
        60 * 60 * 24 // 24 hours
      );
      console.log('[Auth] Access token created');
    } catch (tokenError) {
      console.error('[Auth] Access token creation error:', tokenError);
      throw new Error(`Access token creation failed: ${tokenError instanceof Error ? tokenError.message : 'Unknown error'}`);
    }

    console.log('[Auth] Creating refresh token...');
    let refreshToken;
    try {
      // Use JWT_REFRESH_SECRET if available, otherwise fall back to JWT_SECRET
      const refreshSecret = Deno.env.get('JWT_REFRESH_SECRET') || jwtSecret;
      if (!refreshSecret) {
        console.error('[Auth] JWT_REFRESH_SECRET and JWT_SECRET not configured');
        return new Response(
          JSON.stringify({ 
            error: 'Server configuration error', 
            message: 'JWT secrets are not configured. Please contact support.',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      refreshToken = await createJWT(
        {
          sub: userDoc.id,
          tenantId,
          role: user.role || 'cashier',
          locationId: user.locationId || null,
          deviceId: user.deviceId || null,
          isPlatformAdmin: user.isPlatformAdmin || false,
        },
        refreshSecret,
        60 * 60 * 24 * 7 // 7 days
      );
      console.log('[Auth] Refresh token created');
    } catch (tokenError) {
      console.error('[Auth] Refresh token creation error:', tokenError);
      throw new Error(`Refresh token creation failed: ${tokenError instanceof Error ? tokenError.message : 'Unknown error'}`);
    }

    return new Response(
      JSON.stringify({
        accessToken,
        refreshToken,
        user: {
          id: userDoc.id,
          name: user.name || 'User',
          role: user.role || 'cashier',
          locationId: user.locationId || undefined,
          tenantId,
          isPlatformAdmin: user.isPlatformAdmin || false,
        },
        tenant: {
          id: tenantId,
          name: tenant.name || 'Tenant',
          slug: tenant.slug,
          plan: tenant.plan || 'basic',
          status: tenant.status || 'active',
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Auth] Login error:', error);
    console.error('[Auth] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[Auth] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return new Response(
      JSON.stringify({ 
        error: 'Login failed', 
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : typeof error
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleSuperAdminLogin(req: Request): Promise<Response> {
  try {
    console.log('[Auth] SuperAdmin login request received');

    const body = await parseRequestBody<SuperAdminLoginRequest>(req);
    if (!body || !body.email || !body.password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const db = getFirestoreInstance();
    const email = body.email.trim().toLowerCase();

    // Find user by email
    const users = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (users.empty) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userDoc = users.docs[0];
    const user = userDoc.data();

    if (!user.isPlatformAdmin) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user.pinHash) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(body.password, user.pinHash);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get tenant
    const tenantId = user.tenantId;
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'User has no tenant' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      return new Response(
        JSON.stringify({ error: 'Tenant not found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tenant = tenantDoc.data();
    if (!tenant) {
      return new Response(
        JSON.stringify({ error: 'Tenant data not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (String(tenant.status || '').toUpperCase() !== 'ACTIVE') {
      return new Response(
        JSON.stringify({ error: 'Tenant not active' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create JWT tokens - EXACT SAME CODE AS TENANT LOGIN
    const jwtSecret = Deno.env.get('JWT_SECRET') || '';
    if (!jwtSecret || typeof jwtSecret !== 'string' || jwtSecret.trim().length === 0) {
      console.error('[Auth] JWT_SECRET validation failed:', {
        exists: !!jwtSecret,
        type: typeof jwtSecret,
        length: jwtSecret?.length
      });
      throw new Error('JWT_SECRET not configured');
    }

    // Validate all required values before JWT creation
    if (!userDoc || !userDoc.id) {
      throw new Error('userDoc.id is missing');
    }
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('tenantId is missing or invalid');
    }

    // Use simple Web Crypto API JWT creation (no external library issues)
    const accessToken = await createJWT(
      {
        sub: userDoc.id,
        tenantId,
        role: user.role || 'admin',
        locationId: user.locationId || null,
        deviceId: user.deviceId || null,
        isPlatformAdmin: true,
      },
      jwtSecret,
      60 * 60 * 24 // 24 hours (matching backend default)
    );

    // Use JWT_REFRESH_SECRET if available, otherwise fall back to JWT_SECRET
    const refreshSecret = Deno.env.get('JWT_REFRESH_SECRET') || jwtSecret;
    const refreshToken = await createJWT(
      {
        sub: userDoc.id,
        tenantId,
        role: user.role || 'admin',
        locationId: user.locationId || null,
        deviceId: user.deviceId || null,
        isPlatformAdmin: true,
      },
      refreshSecret,
      60 * 60 * 24 * 7 // 7 days
    );

    return new Response(
      JSON.stringify({
        accessToken,
        refreshToken,
        user: {
          id: userDoc.id,
          name: user.name || 'Super Admin',
          email: user.email || body.email,
          role: user.role || 'admin',
          locationId: user.locationId || undefined,
          tenantId,
          isPlatformAdmin: true,
        },
        tenant: {
          id: tenantId,
          name: tenant.name || 'Platform',
          slug: tenant.slug || 'platform',
          plan: tenant.plan || 'lifetime',
          status: tenant.status || 'active',
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    return new Response(
      JSON.stringify({
        accessToken,
        refreshToken,
        user: {
          id: userDoc.id,
          name: user.name || 'Super Admin',
          email: user.email || body.email,
          role: user.role || 'admin',
          locationId: user.locationId || undefined,
          tenantId,
          isPlatformAdmin: true,
        },
        tenant: {
          id: tenantId,
          name: tenant.name || 'Platform',
          slug: tenant.slug || 'platform',
          plan: tenant.plan || 'lifetime',
          status: tenant.status || 'active',
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Auth] SuperAdmin login error:', error);
    return new Response(
      JSON.stringify({ error: 'Login failed', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleChangePassword(req: Request): Promise<Response> {
  try {
    const body = await parseRequestBody<{ email: string; currentPassword: string; newPassword: string }>(req);
    
    if (!body || !body.email || !body.currentPassword || !body.newPassword) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, currentPassword, newPassword' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: 'New password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const db = getFirestoreInstance();
    const email = body.email.trim().toLowerCase();

    console.log('[Auth] Change password - looking for user with email:', email);

    // First, let's check all platform admin users to see what emails exist
    const allPlatformAdmins = await db.collection('users')
      .where('isPlatformAdmin', '==', true)
      .get();
    
    console.log('[Auth] Change password - found platform admins:', allPlatformAdmins.docs.map(doc => ({
      id: doc.id,
      email: doc.data().email,
      name: doc.data().name
    })));

    // Find user by email (query by email only, then check isPlatformAdmin)
    const users = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (users.empty) {
      console.log('[Auth] Change password - no user found with email:', email);
      console.log('[Auth] Change password - available platform admin emails:', 
        allPlatformAdmins.docs.map(doc => doc.data().email).filter(Boolean));
      return new Response(
        JSON.stringify({ 
          error: 'User not found',
          debug: 'Available platform admin emails: ' + allPlatformAdmins.docs.map(doc => doc.data().email).filter(Boolean).join(', ')
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userDoc = users.docs[0];
    const user = userDoc.data();

    console.log('[Auth] Change password - found user:', {
      id: userDoc.id,
      email: user.email,
      isPlatformAdmin: user.isPlatformAdmin
    });

    // Verify user is a platform admin
    if (!user.isPlatformAdmin) {
      return new Response(
        JSON.stringify({ error: 'User is not a platform admin' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify current password
    if (!user.pinHash) {
      return new Response(
        JSON.stringify({ error: 'User has no password set' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isValid = await bcrypt.compare(body.currentPassword, user.pinHash);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Current password is incorrect' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash new password
    const newPinHash = await bcrypt.hash(body.newPassword, 10);
    const { FieldValue } = await import('npm:firebase-admin@11.11.0/firestore');

    // Update password
    await db.collection('users').doc(userDoc.id).update({
      pinHash: newPinHash,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Password changed successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Auth] Change password error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to change password', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

