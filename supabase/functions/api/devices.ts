// Devices Handler for Supabase Edge Functions
import { corsHeaders } from '../_shared/cors.ts';
import { parseRequestBody, getQueryParams } from '../_shared/request.ts';
import { getFirestoreInstance } from '../_shared/firestore.ts';
import { requireAuth } from '../_shared/jwt.ts';
import { FieldValue, Timestamp } from 'npm:firebase-admin@11.11.0/firestore';
import { v4 as uuid } from 'npm:uuid@9.0.0';

interface RegisterDeviceInput {
  identifier: string;
  name?: string;
  type?: string;
  hardwareId?: string;
  vendorId?: string;
  productId?: string;
  locationId?: string;
  registeredById?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

interface UpdateDeviceInput {
  name?: string;
  type?: string;
  hardwareId?: string;
  vendorId?: string;
  productId?: string;
  locationId?: string;
  registeredById?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
  lastUsedById?: string;
}

interface DeviceHeartbeatInput {
  userId?: string;
  isActive?: boolean;
}

function toDeviceRecord(id: string, data: any) {
  return {
    id,
    tenantId: data.tenantId,
    identifier: data.identifier,
    name: data.name || undefined,
    type: data.type || undefined,
    hardwareId: data.hardwareId || undefined,
    vendorId: data.vendorId || undefined,
    productId: data.productId || undefined,
    locationId: data.locationId || undefined,
    registeredById: data.registeredById || undefined,
    metadata: data.metadata || undefined,
    isActive: data.isActive !== undefined ? data.isActive : true,
    lastSeenAt: data.lastSeenAt?.toDate?.()?.toISOString() || undefined,
    lastUsedAt: data.lastUsedAt?.toDate?.()?.toISOString() || undefined,
    lastUsedById: data.lastUsedById || undefined,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}

export async function handleDevices(req: Request, path: string, method: string): Promise<Response> {
  try {
    const user = await requireAuth(req);
    const db = getFirestoreInstance();

    // POST /devices/register - Register or update a scanner device
    if (path === '/devices/register' && method === 'POST') {
      const body = await parseRequestBody<RegisterDeviceInput>(req);
      
      if (!body || !body.identifier) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: identifier' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const normalizedIdentifier = body.identifier.trim().toLowerCase();

      // Check if device exists
      const existingSnapshot = await db.collection('devices')
        .where('tenantId', '==', user.tenantId)
        .where('identifierNormalized', '==', normalizedIdentifier)
        .limit(1)
        .get();

      const now = FieldValue.serverTimestamp();
      let deviceId: string;
      let deviceData: any;

      if (!existingSnapshot.empty) {
        // Update existing device
        deviceId = existingSnapshot.docs[0].id;
        const existingData = existingSnapshot.docs[0].data();

        const updateDoc: any = {
          updatedAt: now,
          lastSeenAt: now,
        };

        if (body.name !== undefined) updateDoc.name = body.name;
        if (body.type !== undefined) updateDoc.type = body.type;
        if (body.hardwareId !== undefined) updateDoc.hardwareId = body.hardwareId;
        if (body.vendorId !== undefined) updateDoc.vendorId = body.vendorId;
        if (body.productId !== undefined) updateDoc.productId = body.productId;
        if (body.locationId !== undefined) updateDoc.locationId = body.locationId;
        if (body.metadata !== undefined) updateDoc.metadata = body.metadata;
        if (body.isActive !== undefined) updateDoc.isActive = body.isActive;
        if (body.isActive) {
          updateDoc.lastUsedAt = now;
          updateDoc.lastUsedById = user.sub;
        }

        await db.collection('devices').doc(deviceId).set(updateDoc, { merge: true });
        const updatedDoc = await db.collection('devices').doc(deviceId).get();
        deviceData = updatedDoc.data();
      } else {
        // Create new device
        deviceId = uuid();
        const doc: any = {
          tenantId: user.tenantId,
          identifier: body.identifier,
          identifierNormalized: normalizedIdentifier,
          name: body.name || undefined,
          type: body.type || undefined,
          hardwareId: body.hardwareId || undefined,
          vendorId: body.vendorId || undefined,
          productId: body.productId || undefined,
          locationId: body.locationId || undefined,
          registeredById: body.registeredById || user.sub,
          metadata: body.metadata || undefined,
          isActive: body.isActive !== undefined ? body.isActive : true,
          lastSeenAt: now,
          lastUsedAt: body.isActive ? now : undefined,
          lastUsedById: body.isActive ? user.sub : undefined,
          createdAt: now,
          updatedAt: now,
        };

        await db.collection('devices').doc(deviceId).set(doc);
        const createdDoc = await db.collection('devices').doc(deviceId).get();
        deviceData = createdDoc.data();
      }

      return new Response(
        JSON.stringify(toDeviceRecord(deviceId, deviceData)),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /devices - List registered devices
    if (path === '/devices' && method === 'GET') {
      const params = getQueryParams(req);
      const locationId = params.get('location_id') || undefined;

      let query = db.collection('devices')
        .where('tenantId', '==', user.tenantId);

      if (locationId) {
        query = query.where('locationId', '==', locationId);
      }

      const snapshot = await query.get();
      let devices = snapshot.docs.map(doc => toDeviceRecord(doc.id, doc.data()));

      // Sort by updatedAt descending
      devices.sort((a, b) => {
        const aTime = new Date(a.updatedAt).getTime();
        const bTime = new Date(b.updatedAt).getTime();
        return bTime - aTime;
      });

      return new Response(
        JSON.stringify(devices),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH /devices/:id - Update a device record
    if (path.startsWith('/devices/') && !path.includes('/heartbeat') && method === 'PATCH') {
      const deviceId = path.split('/devices/')[1];
      if (!deviceId) {
        return new Response(
          JSON.stringify({ error: 'Device ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const deviceDoc = await db.collection('devices').doc(deviceId).get();
      if (!deviceDoc.exists) {
        return new Response(
          JSON.stringify({ error: 'Device not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const deviceData = deviceDoc.data();
      if (deviceData?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Device not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await parseRequestBody<UpdateDeviceInput>(req);
      if (!body) {
        return new Response(
          JSON.stringify({ error: 'Request body is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const updateDoc: any = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (body.name !== undefined) updateDoc.name = body.name;
      if (body.type !== undefined) updateDoc.type = body.type;
      if (body.hardwareId !== undefined) updateDoc.hardwareId = body.hardwareId;
      if (body.vendorId !== undefined) updateDoc.vendorId = body.vendorId;
      if (body.productId !== undefined) updateDoc.productId = body.productId;
      if (body.locationId !== undefined) updateDoc.locationId = body.locationId;
      if (body.metadata !== undefined) updateDoc.metadata = body.metadata;
      if (body.isActive !== undefined) updateDoc.isActive = body.isActive;
      if (body.lastUsedById !== undefined) {
        updateDoc.lastUsedById = body.lastUsedById;
        updateDoc.lastUsedAt = FieldValue.serverTimestamp();
      }
      if (body.registeredById !== undefined) updateDoc.registeredById = body.registeredById;

      await db.collection('devices').doc(deviceId).set(updateDoc, { merge: true });

      // Fetch updated device
      const updatedDoc = await db.collection('devices').doc(deviceId).get();
      const updatedData = updatedDoc.data();

      return new Response(
        JSON.stringify(toDeviceRecord(deviceId, updatedData)),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /devices/:id/heartbeat - Record device usage heartbeat
    if (path.includes('/heartbeat') && method === 'POST') {
      const deviceId = path.split('/devices/')[1]?.split('/heartbeat')[0];
      if (!deviceId) {
        return new Response(
          JSON.stringify({ error: 'Device ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const deviceDoc = await db.collection('devices').doc(deviceId).get();
      if (!deviceDoc.exists) {
        return new Response(
          JSON.stringify({ error: 'Device not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const deviceData = deviceDoc.data();
      if (deviceData?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Device not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await parseRequestBody<DeviceHeartbeatInput>(req);
      const now = FieldValue.serverTimestamp();

      await db.collection('devices').doc(deviceId).update({
        lastSeenAt: now,
        lastUsedAt: now,
        lastUsedById: body?.userId || user.sub,
        isActive: body?.isActive !== undefined ? body.isActive : deviceData.isActive,
        updatedAt: now,
      });

      // Fetch updated device
      const updatedDoc = await db.collection('devices').doc(deviceId).get();
      const updatedData = updatedDoc.data();

      return new Response(
        JSON.stringify(toDeviceRecord(deviceId, updatedData)),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 404
    return new Response(
      JSON.stringify({ error: 'Not Found', path, method }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Devices] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

