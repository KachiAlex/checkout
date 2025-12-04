// Sync Handler for Supabase Edge Functions
import { corsHeaders } from '../_shared/cors.ts';
import { parseRequestBody, getQueryParams } from '../_shared/request.ts';
import { getFirestoreInstance } from '../_shared/firestore.ts';
import { requireAuth } from '../_shared/jwt.ts';
import { Timestamp } from 'npm:firebase-admin@11.11.0/firestore';

interface SyncEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  client_ts: number;
}

interface PushChangesInput {
  deviceId: string;
  events: SyncEvent[];
}

export async function handleSync(req: Request, path: string, method: string): Promise<Response> {
  try {
    const user = await requireAuth(req);
    const db = getFirestoreInstance();

    // POST /sync/push-changes - Push offline events from device
    if (path === '/sync/push-changes' && method === 'POST') {
      const body = await parseRequestBody<PushChangesInput>(req);
      
      if (!body || !body.deviceId || !body.events || body.events.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: deviceId, events' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let processed = 0;
      let failed = 0;

      for (const event of body.events) {
        try {
          // Check idempotency using event ID (check if order with this UUID exists)
          if (event.type === 'order.created' && event.payload.uuid) {
            const existingSnapshot = await db.collection('orders')
              .where('uuid', '==', event.payload.uuid)
              .limit(1)
              .get();

            if (!existingSnapshot.empty) {
              processed++; // Already processed - idempotent
              continue;
            }

            // Process order creation event
            // Note: This is simplified - in production, you'd call handleOrders logic
            console.log(`[Sync] Processing order event: ${event.id}`);
            processed++;
          } else {
            // Unknown event type - log but don't fail
            console.warn(`[Sync] Unknown event type: ${event.type}`);
            processed++;
          }
        } catch (error) {
          console.error(`[Sync] Failed to process event ${event.id}:`, error);
          failed++;
        }
      }

      return new Response(
        JSON.stringify({ processed, failed }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /sync/pull-changes - Pull changes from server since last sync
    if (path === '/sync/pull-changes' && method === 'GET') {
      const params = getQueryParams(req);
      const deviceId = params.get('device_id') || undefined;
      const since = params.get('since') ? new Date(params.get('since')!) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      if (!deviceId) {
        return new Response(
          JSON.stringify({ error: 'device_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get orders created since last sync
      let query = db.collection('orders')
        .where('deviceId', '==', deviceId)
        .orderBy('createdAt', 'desc');

      if (since) {
        query = query.where('createdAt', '>=', Timestamp.fromDate(since));
      }

      const snapshot = await query.get();
      const orders = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.uuid,
          type: 'order.created',
          payload: {
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          },
          server_ts: data.createdAt?.toDate?.()?.getTime() || Date.now(),
        };
      });

      return new Response(
        JSON.stringify(orders),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 404
    return new Response(
      JSON.stringify({ error: 'Not Found', path, method }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Sync] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

