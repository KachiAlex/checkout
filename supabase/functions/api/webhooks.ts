// Webhooks Handler for Supabase Edge Functions
import { corsHeaders } from '../_shared/cors.ts';
import { parseRequestBody } from '../_shared/request.ts';
import { getFirestoreInstance } from '../_shared/firestore.ts';
import { FieldValue } from 'npm:firebase-admin@11.11.0/firestore';

interface MonnifyWebhookPayload {
  eventType: string;
  eventData: {
    product: {
      type: string;
      reference: string;
    };
    transactionReference: string;
    paymentReference: string;
    amountPaid: string;
    totalPayable: string;
    settlementAmount: string;
    paidOn: string;
    paymentStatus: string;
    paymentDescription: string;
    currency: string;
    paymentMethod: string;
    customer: {
      email: string;
      name: string;
    };
    metaData: Record<string, unknown>;
  };
}

export async function handleWebhooks(req: Request, path: string, method: string): Promise<Response> {
  try {
    // Webhooks don't require authentication (they're called by external services)
    // But we can verify signatures if needed
    const db = getFirestoreInstance();

    // POST /webhooks/monnify - Handle Monnify webhook
    if (path === '/webhooks/monnify' && method === 'POST') {
      const body = await parseRequestBody<MonnifyWebhookPayload>(req);
      
      if (!body || !body.eventType || !body.eventData) {
        return new Response(
          JSON.stringify({ error: 'Invalid webhook payload' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Handle different event types
      if (body.eventType === 'SUCCESSFUL_TRANSACTION') {
        const { eventData } = body;
        
        // Map Monnify payment status to our PaymentStatus
        let status: string;
        const monnifyStatus = eventData.paymentStatus.toUpperCase();
        
        switch (monnifyStatus) {
          case 'PAID':
          case 'OVERPAID':
            status = 'COMPLETED';
            break;
          case 'PENDING':
            status = 'PROCESSING';
            break;
          case 'FAILED':
          case 'CANCELLED':
            status = 'FAILED';
            break;
          default:
            status = 'PROCESSING';
        }

        // Find payment by paymentReference or transactionReference
        let paymentDoc = null;
        
        // Try paymentReference first
        const paymentsByRef = await db.collection('payments')
          .where('transactionId', '==', eventData.paymentReference)
          .limit(1)
          .get();

        if (!paymentsByRef.empty) {
          paymentDoc = paymentsByRef.docs[0];
        } else {
          // Try transactionReference
          const paymentsByTx = await db.collection('payments')
            .where('transactionId', '==', eventData.transactionReference)
            .limit(1)
            .get();

          if (!paymentsByTx.empty) {
            paymentDoc = paymentsByTx.docs[0];
          }
        }

        if (paymentDoc) {
          // Update payment status
          await db.collection('payments').doc(paymentDoc.id).update({
            status,
            transactionId: eventData.transactionReference || paymentDoc.data().transactionId,
            processorData: {
              ...(paymentDoc.data().processorData || {}),
              transactionReference: eventData.transactionReference,
              paymentReference: eventData.paymentReference,
              amountPaid: eventData.amountPaid,
              totalPayable: eventData.totalPayable,
              settlementAmount: eventData.settlementAmount,
              paidOn: eventData.paidOn,
              paymentStatus: eventData.paymentStatus,
              paymentMethod: eventData.paymentMethod,
              currency: eventData.currency,
              customer: eventData.customer,
              metaData: eventData.metaData,
              webhookReceivedAt: new Date().toISOString(),
            },
            processedAt: status === 'COMPLETED' ? FieldValue.serverTimestamp() : paymentDoc.data().processedAt,
            updatedAt: FieldValue.serverTimestamp(),
          });

          return new Response(
            JSON.stringify({
              received: true,
              processed: true,
              timestamp: new Date().toISOString(),
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Payment not found - log but don't fail
          console.warn(`[Webhooks] Payment not found for reference: ${eventData.paymentReference}`);
          return new Response(
            JSON.stringify({
              received: true,
              processed: false,
              message: 'Payment not found',
              timestamp: new Date().toISOString(),
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // For other event types, just acknowledge receipt
      return new Response(
        JSON.stringify({
          received: true,
          eventType: body.eventType,
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /webhooks/payment-status - Generic payment status webhook (legacy)
    if (path === '/webhooks/payment-status' && method === 'POST') {
      return new Response(
        JSON.stringify({ received: true, timestamp: new Date().toISOString() }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 404
    return new Response(
      JSON.stringify({ error: 'Not Found', path, method }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Webhooks] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

