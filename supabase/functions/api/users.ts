// Users Handler for Supabase Edge Functions
import { corsHeaders } from '../_shared/cors.ts';
import { parseRequestBody } from '../_shared/request.ts';
import { getFirestoreInstance } from '../_shared/firestore.ts';
import { requireAuth } from '../_shared/jwt.ts';
import { FieldValue, Timestamp } from 'npm:firebase-admin@11.11.0/firestore';
import bcrypt from 'npm:bcryptjs@2.4.3';

interface CreateUserInput {
  name: string;
  email: string;
  role: string;
  pin?: string;
  locationId?: string;
  isPlatformAdmin?: boolean;
}

interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: string;
  locationId?: string;
  isPlatformAdmin?: boolean;
  pin?: string;
}

interface ChangePinInput {
  currentPin: string;
  newPin: string;
}

interface ResetPinInput {
  pin: string;
}

function generatePin(): string {
  return Math.floor(Math.random() * 900000 + 100000).toString();
}

function toSafeUser(id: string, data: any) {
  const { pinHash, ...rest } = data;
  return {
    id,
    name: rest.name,
    email: rest.email || undefined,
    role: rest.role,
    tenantId: rest.tenantId,
    isPlatformAdmin: rest.isPlatformAdmin || false,
    deviceId: rest.deviceId || undefined,
    locationId: rest.locationId || undefined,
    publicKey: rest.publicKey || undefined,
    createdAt: rest.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: rest.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}

// Helper: Validate location ownership
async function validateLocationOwnership(db: any, tenantId: string, locationId?: string | null): Promise<string | undefined> {
  if (!locationId?.trim()) {
    return undefined;
  }

  const locationDoc = await db.collection('locations').doc(locationId.trim()).get();
  if (!locationDoc.exists) {
    throw new Error('Location not found');
  }

  const locationData = locationDoc.data();
  if (locationData?.tenantId !== tenantId) {
    throw new Error('Location not found');
  }

  return locationDoc.id;
}

// Helper: Determine location ID for user creation
async function determineLocationIdForCreation(
  db: any,
  tenantId: string,
  requested?: string,
  actorLocationId?: string,
): Promise<string | undefined> {
  // Try requested location first
  try {
    const validated = await validateLocationOwnership(db, tenantId, requested);
    if (validated) {
      return validated;
    }
  } catch {
    // Invalid location, continue to fallback
  }

  // Try actor's location
  if (actorLocationId) {
    try {
      const actorLocation = await db.collection('locations').doc(actorLocationId).get();
      if (actorLocation.exists) {
        const actorLocationData = actorLocation.data();
        if (actorLocationData?.tenantId === tenantId) {
          return actorLocationId;
        }
      }
    } catch {
      // Continue to fallback
    }
  }

  // Get first location for tenant
  const locationsSnapshot = await db.collection('locations')
    .where('tenantId', '==', tenantId)
    .limit(1)
    .get();

  return locationsSnapshot.empty ? undefined : locationsSnapshot.docs[0].id;
}

export async function handleUsers(req: Request, path: string, method: string): Promise<Response> {
  try {
    const user = await requireAuth(req);
    const db = getFirestoreInstance();
    const isTenantAdmin = (user.role || '').toString().toLowerCase() === 'admin';
    const isPlatformAdmin = !!user.isPlatformAdmin;

    // GET /users - List users
    if (path === '/users' && method === 'GET') {
      const snapshot = await db.collection('users')
        .where('tenantId', '==', user.tenantId)
        .get();

      const users = snapshot.docs.map(doc => toSafeUser(doc.id, doc.data()));

      return new Response(
        JSON.stringify(users),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /users - Create user
    if (path === '/users' && method === 'POST') {
      // Check permissions
      if (!isTenantAdmin && !isPlatformAdmin) {
        return new Response(
          JSON.stringify({ error: 'Only tenant administrators can create users' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await parseRequestBody<CreateUserInput>(req);
      
      if (!body || !body.name || !body.email || !body.role) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: name, email, role' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check platform admin permission
      if (body.isPlatformAdmin && !isPlatformAdmin) {
        return new Response(
          JSON.stringify({ error: 'Only platform admins can grant platform permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const assignedPin = body.pin || generatePin();
      const pinHash = await bcrypt.hash(assignedPin, 10);
      const locationId = await determineLocationIdForCreation(db, user.tenantId, body.locationId, user.locationId || undefined);

      const now = FieldValue.serverTimestamp();
      const userId = db.collection('users').doc().id;

      const doc: any = {
        name: body.name.trim(),
        email: body.email.toLowerCase(),
        role: body.role,
        pinHash,
        tenantId: user.tenantId,
        // locationId is optional; omit if we couldn't determine one
        ...(locationId ? { locationId } : {}),
        // deviceId is optional; store null (valid Firestore value) instead of undefined
        deviceId: null,
        isPlatformAdmin: body.isPlatformAdmin || false,
        createdAt: now,
        updatedAt: now,
      };

      await db.collection('users').doc(userId).set(doc);

      // Fetch created document
      const created = await db.collection('users').doc(userId).get();
      const createdData = created.data();

      const response: any = {
        user: toSafeUser(userId, createdData),
      };

      // Include temporary PIN if auto-generated
      if (!body.pin) {
        response.temporaryPin = assignedPin;
      }

      return new Response(
        JSON.stringify(response),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH /users/:id - Update user
    if (path.startsWith('/users/') && !path.includes('/reset-pin') && !path.includes('/change-pin') && !path.includes('/location') && method === 'PATCH') {
      const userId = path.split('/users/')[1];
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user to update
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userData = userDoc.data();
      if (userData?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check permissions
      const isActorAdmin = isTenantAdmin || isPlatformAdmin;
      if (!isActorAdmin && user.sub !== userId) {
        return new Response(
          JSON.stringify({ error: 'Only administrators can update other users' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await parseRequestBody<UpdateUserInput>(req);
      if (!body) {
        return new Response(
          JSON.stringify({ error: 'Request body is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check platform admin permission
      if (body.isPlatformAdmin !== undefined && !isPlatformAdmin) {
        return new Response(
          JSON.stringify({ error: 'Only platform admins can modify platform permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const payload: any = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (body.name !== undefined) payload.name = body.name.trim();
      if (body.email !== undefined) payload.email = body.email.toLowerCase();
      if (body.role !== undefined) payload.role = body.role;
      if (body.isPlatformAdmin !== undefined) payload.isPlatformAdmin = body.isPlatformAdmin;
      if (body.pin !== undefined) {
        payload.pinHash = await bcrypt.hash(body.pin, 10);
      }
      if (body.locationId !== undefined) {
        const validatedLocationId = await validateLocationOwnership(db, user.tenantId, body.locationId);
        payload.locationId = validatedLocationId || undefined;
      }

      await db.collection('users').doc(userId).set(payload, { merge: true });

      // Fetch updated document
      const updated = await db.collection('users').doc(userId).get();
      const updatedData = updated.data();

      return new Response(
        JSON.stringify(toSafeUser(userId, updatedData)),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH /users/:id/reset-pin - Reset user PIN
    if (path.includes('/reset-pin') && method === 'PATCH') {
      const userId = path.split('/users/')[1]?.split('/reset-pin')[0];
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check permissions
      if (user.role !== 'ADMIN' && !user.isPlatformAdmin) {
        return new Response(
          JSON.stringify({ error: 'Only admins can reset PINs' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userData = userDoc.data();
      if (userData?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await parseRequestBody<ResetPinInput>(req);
      if (!body || !body.pin) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: pin' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const pinHash = await bcrypt.hash(body.pin, 10);
      await db.collection('users').doc(userId).update({
        pinHash,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH /users/me/change-pin - Change authenticated user's PIN
    if (path === '/users/me/change-pin' && method === 'PATCH') {
      const body = await parseRequestBody<ChangePinInput>(req);
      if (!body || !body.currentPin || !body.newPin) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: currentPin, newPin' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userDoc = await db.collection('users').doc(user.sub).get();
      if (!userDoc.exists) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userData = userDoc.data();
      const isValid = await bcrypt.compare(body.currentPin, userData.pinHash);
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: 'Current PIN is incorrect' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const newPinHash = await bcrypt.hash(body.newPin, 10);
      await db.collection('users').doc(user.sub).update({
        pinHash: newPinHash,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH /users/me/location - Update authenticated user's location
    if (path === '/users/me/location' && method === 'PATCH') {
      const body = await parseRequestBody<{ locationId?: string }>(req);
      if (!body) {
        return new Response(
          JSON.stringify({ error: 'Request body is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let validatedLocationId: string | undefined = undefined;
      if (body.locationId) {
        validatedLocationId = await validateLocationOwnership(db, user.tenantId, body.locationId);
      }

      await db.collection('users').doc(user.sub).update({
        locationId: validatedLocationId || undefined,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /users/:id - Delete user
    if (path.startsWith('/users/') && method === 'DELETE') {
      const userId = path.split('/users/')[1];
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check permissions
      const isActorAdmin = isTenantAdmin || isPlatformAdmin;
      if (!isActorAdmin) {
        return new Response(
          JSON.stringify({ error: 'Only administrators can delete users' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (user.sub === userId) {
        return new Response(
          JSON.stringify({ error: 'You cannot delete your own user' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userData = userDoc.data();
      if (userData?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await db.collection('users').doc(userId).delete();

      return new Response(
        null,
        { status: 204, headers: corsHeaders }
      );
    }

    // 404
    return new Response(
      JSON.stringify({ error: 'Not Found', path, method }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Users] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

