// Payments Handler for Supabase Edge Functions
import { corsHeaders } from '../_shared/cors.ts';
import { parseRequestBody } from '../_shared/request.ts';
import { getFirestoreInstance } from '../_shared/firestore.ts';
import { requireAuth } from '../_shared/jwt.ts';
import { FieldValue, Timestamp } from 'npm:firebase-admin@11.11.0/firestore';
import { v4 as uuid } from 'npm:uuid@9.0.0';

interface InitiatePaymentInput {
  method: string;
  amount: number;
  metadata?: Record<string, unknown>;
}

function toPaymentRecord(id: string, data: any) {
  return {
    id,
    orderId: data.orderId,
    amountCents: data.amountCents,
    currency: data.currency,
    method: data.method,
    status: data.status,
    processorData: data.processorData || undefined,
    transactionId: data.transactionId || undefined,
    error: data.error || undefined,
    processedAt: data.processedAt?.toDate?.()?.toISOString() || undefined,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}

export async function handlePayments(req: Request, path: string, method: string): Promise<Response> {
  try {
    const user = await requireAuth(req);
    const db = getFirestoreInstance();

    // Extract orderId from path (format: /orders/:orderId/payments/...)
    const pathParts = path.split('/').filter(Boolean);
    const orderIndex = pathParts.indexOf('orders');
    const orderId = orderIndex >= 0 && pathParts[orderIndex + 1] ? pathParts[orderIndex + 1] : null;

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify order exists and tenant access
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderData = orderDoc.data();
    const locationDoc = await db.collection('locations').doc(orderData.locationId).get();
    if (!locationDoc.exists || locationDoc.data()?.tenantId !== user.tenantId) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /orders/:orderId/payments/initiate - Initiate payment
    if (path.includes('/initiate') && method === 'POST') {
      if (orderData.status === 'COMPLETED') {
        return new Response(
          JSON.stringify({ error: 'Order already completed' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await parseRequestBody<InitiatePaymentInput>(req);
      if (!body || !body.method || body.amount === undefined) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: method, amount' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const now = FieldValue.serverTimestamp();
      const paymentId = uuid();

      // For CASH and TRANSFER, auto-complete
      let status = 'PROCESSING';
      let transactionId: string | undefined = undefined;
      let processedAt: any = undefined;

      if (body.method === 'CASH' || body.method === 'TRANSFER') {
        status = 'COMPLETED';
        transactionId = `${body.method}_${Date.now()}`;
        processedAt = now;
      }

      const paymentDoc: any = {
        orderId,
        amountCents: body.amount,
        currency: 'NGN',
        method: body.method,
        status,
        processorData: body.metadata || undefined,
        transactionId,
        processedAt,
        createdAt: now,
        updatedAt: now,
      };

      await db.collection('payments').doc(paymentId).set(paymentDoc);

      // Fetch created payment
      const createdDoc = await db.collection('payments').doc(paymentId).get();
      const createdData = createdDoc.data();

      return new Response(
        JSON.stringify(toPaymentRecord(paymentId, createdData)),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /orders/:orderId/payments/capture - Capture payment
    if (path.includes('/capture') && method === 'POST') {
      const body = await parseRequestBody<{ paymentId: string }>(req);
      if (!body || !body.paymentId) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: paymentId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const paymentDoc = await db.collection('payments').doc(body.paymentId).get();
      if (!paymentDoc.exists) {
        return new Response(
          JSON.stringify({ error: 'Payment not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const paymentData = paymentDoc.data();
      if (paymentData.orderId !== orderId) {
        return new Response(
          JSON.stringify({ error: 'Payment does not belong to this order' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (paymentData.status === 'COMPLETED') {
        return new Response(
          JSON.stringify(toPaymentRecord(body.paymentId, paymentData)),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update payment status to COMPLETED
      await db.collection('payments').doc(body.paymentId).update({
        status: 'COMPLETED',
        processedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Fetch updated payment
      const updatedDoc = await db.collection('payments').doc(body.paymentId).get();
      const updatedData = updatedDoc.data();

      return new Response(
        JSON.stringify(toPaymentRecord(body.paymentId, updatedData)),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /orders/:orderId/payments/refund - Refund payment
    if (path.includes('/refund') && method === 'POST') {
      const body = await parseRequestBody<{ paymentId: string; amountCents?: number }>(req);
      if (!body || !body.paymentId) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: paymentId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const paymentDoc = await db.collection('payments').doc(body.paymentId).get();
      if (!paymentDoc.exists) {
        return new Response(
          JSON.stringify({ error: 'Payment not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const paymentData = paymentDoc.data();
      if (paymentData.orderId !== orderId) {
        return new Response(
          JSON.stringify({ error: 'Payment does not belong to this order' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (paymentData.status !== 'COMPLETED') {
        return new Response(
          JSON.stringify({ error: `Cannot refund payment with status: ${paymentData.status}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const refundAmount = body.amountCents || paymentData.amountCents;

      // Update payment with refund info
      await db.collection('payments').doc(body.paymentId).update({
        processorData: {
          ...(paymentData.processorData || {}),
          refund_amount: refundAmount,
          refunded_at: new Date().toISOString(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Fetch updated payment
      const updatedDoc = await db.collection('payments').doc(body.paymentId).get();
      const updatedData = updatedDoc.data();

      return new Response(
        JSON.stringify(toPaymentRecord(body.paymentId, updatedData)),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /orders/:orderId/payments - Get all payments for order
    if (path.endsWith('/payments') && method === 'GET') {
      const snapshot = await db.collection('payments')
        .where('orderId', '==', orderId)
        .get();

      const payments = snapshot.docs.map(doc => toPaymentRecord(doc.id, doc.data()));

      return new Response(
        JSON.stringify(payments),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /orders/:orderId/payments/status - Get payment status
    if (path.includes('/status') && method === 'GET') {
      const paymentsSnapshot = await db.collection('payments')
        .where('orderId', '==', orderId)
        .get();

      const payments = paymentsSnapshot.docs.map(doc => toPaymentRecord(doc.id, doc.data()));

      const totalPaid = payments
        .filter(p => p.status === 'COMPLETED')
        .reduce((sum, p) => sum + p.amountCents, 0);

      const totalDue = orderData.totalCents;
      const isFullyPaid = totalPaid >= totalDue;

      return new Response(
        JSON.stringify({
          totalPaid,
          totalDue,
          isFullyPaid,
          payments,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 404
    return new Response(
      JSON.stringify({ error: 'Not Found', path, method }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Payments] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

