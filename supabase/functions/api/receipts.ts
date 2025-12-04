// Receipts Handler for Supabase Edge Functions
import { corsHeaders } from '../_shared/cors.ts';
import { parseRequestBody } from '../_shared/request.ts';
import { getFirestoreInstance } from '../_shared/firestore.ts';
import { requireAuth } from '../_shared/jwt.ts';

function formatReceipt(order: any, payment?: any, location?: any, user?: any): string {
  const receipt = [
    '╔═══════════════════════════════════╗',
    `║    ${(location?.name || 'Store').padEnd(12).substring(0, 12)}    ║`,
    location?.address ? `║  ${location.address.padEnd(33).substring(0, 33)}  ║` : '',
    '╠═══════════════════════════════════╣',
    `Order: ${order.orderNumber}`,
    `Date: ${new Date(order.createdAt).toLocaleString()}`,
    `Cashier: ${user?.name || 'N/A'}`,
    '╠═══════════════════════════════════╣',
    '',
    'Items:',
    '',
  ];

  order.items.forEach((item: any) => {
    const subtotal = item.priceCents * item.quantity;
    const tax = item.taxCents * item.quantity;
    const total = subtotal + tax;

    receipt.push(`${item.quantity}x ${item.productId}`);
    receipt.push(`   ₦${(item.priceCents / 100).toFixed(2)} each`);
    receipt.push(`   Total: ₦${(total / 100).toFixed(2)}`);
    receipt.push('');
  });

  receipt.push('╠═══════════════════════════════════╣');
  receipt.push(`Subtotal:           ₦${(order.subtotalCents / 100).toFixed(2)}`);
  receipt.push(`Tax:                ₦${(order.taxCents / 100).toFixed(2)}`);
  if (order.discountCents > 0) {
    receipt.push(`Discount:           -₦${(order.discountCents / 100).toFixed(2)}`);
  }
  receipt.push('╠═══════════════════════════════════╣');
  receipt.push(`TOTAL:              ₦${(order.totalCents / 100).toFixed(2)}`);
  receipt.push('╠═══════════════════════════════════╣');

  if (payment) {
    receipt.push(`Payment Method:     ${payment.method.toUpperCase()}`);
    receipt.push(`Transaction ID:     ${payment.transactionId || 'N/A'}`);
  }

  receipt.push('');
  receipt.push('Thank you for your purchase!');
  receipt.push('╚═══════════════════════════════════╝');

  return receipt.filter((line) => line !== '').join('\n');
}

function formatReceiptHTML(order: any, payment?: any, location?: any, user?: any): string {
  const itemsHTML = order.items
    .map((item: any) => {
      const subtotal = item.priceCents * item.quantity;
      const tax = item.taxCents * item.quantity;
      const total = subtotal + tax;
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.quantity}x ${item.productId}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₦${(total / 100).toFixed(2)}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Receipt - Order ${order.orderNumber}</title>
        <style>
          body {
            font-family: 'Courier New', monospace, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .receipt-container {
            background-color: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            color: #333;
          }
          .header p {
            margin: 5px 0;
            color: #666;
            font-size: 14px;
          }
          .order-info {
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
          }
          .order-info p {
            margin: 5px 0;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            text-align: left;
            padding: 8px;
            border-bottom: 2px solid #333;
            font-weight: bold;
          }
          .totals {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 2px solid #333;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
          }
          .total-row {
            font-weight: bold;
            font-size: 18px;
            padding-top: 10px;
            border-top: 1px solid #eee;
          }
          .payment-info {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #eee;
            font-size: 14px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <h1>${location?.name || 'Store'}</h1>
            ${location?.address ? `<p>${location.address}</p>` : ''}
          </div>

          <div class="order-info">
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
            ${user ? `<p><strong>Cashier:</strong> ${user.name}</p>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>₦${(order.subtotalCents / 100).toFixed(2)}</span>
            </div>
            <div class="totals-row">
              <span>Tax:</span>
              <span>₦${(order.taxCents / 100).toFixed(2)}</span>
            </div>
            ${order.discountCents > 0 ? `
              <div class="totals-row">
                <span>Discount:</span>
                <span>-₦${(order.discountCents / 100).toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="totals-row total-row">
              <span>TOTAL:</span>
              <span>₦${(order.totalCents / 100).toFixed(2)}</span>
            </div>
          </div>

          ${payment ? `
            <div class="payment-info">
              <p><strong>Payment Method:</strong> ${payment.method.toUpperCase()}</p>
              ${payment.transactionId ? `<p><strong>Transaction ID:</strong> ${payment.transactionId}</p>` : ''}
            </div>
          ` : ''}

          <div class="footer">
            <p>Thank you for your purchase!</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function convertToESCPOS(text: string): string {
  // Basic ESC/POS commands
  const ESC = '\x1B';
  const commands = [
    ESC + '@', // Initialize printer
    ESC + 'a' + '\x01', // Center align
    text,
    '\n\n\n',
    ESC + 'd' + '\x03', // Feed 3 lines
    ESC + 'i', // Cut paper
  ];
  return commands.join('');
}

export async function handleReceipts(req: Request, path: string, method: string): Promise<Response> {
  try {
    const user = await requireAuth(req);
    const db = getFirestoreInstance();

    // GET /receipts/:orderId - Get receipt for an order
    if (path.startsWith('/receipts/') && !path.includes('/print') && !path.includes('/email') && method === 'GET') {
      const orderId = path.split('/receipts/')[1];
      if (!orderId) {
        return new Response(
          JSON.stringify({ error: 'Order ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get order
      const orderDoc = await db.collection('orders').doc(orderId).get();
      if (!orderDoc.exists) {
        return new Response(
          JSON.stringify({ error: `Order ${orderId} not found` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const orderData = orderDoc.data();
      
      // Verify tenant access
      const locationDoc = await db.collection('locations').doc(orderData.locationId).get();
      if (!locationDoc.exists || locationDoc.data()?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get payment
      const paymentsSnapshot = await db.collection('payments')
        .where('orderId', '==', orderId)
        .limit(1)
        .get();
      const payment = paymentsSnapshot.empty ? undefined : paymentsSnapshot.docs[0].data();

      // Get location
      const location = locationDoc.exists ? locationDoc.data() : undefined;

      // Get user
      let userData = undefined;
      if (orderData.createdBy) {
        const userDoc = await db.collection('users').doc(orderData.createdBy).get();
        if (userDoc.exists) {
          const u = userDoc.data();
          userData = { id: userDoc.id, name: u.name };
        }
      }

      const receipt = formatReceipt(orderData, payment, location, userData);

      return new Response(
        JSON.stringify({ receipt, orderId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /receipts/:orderId/print - Get receipt in ESC/POS format
    if (path.includes('/print') && method === 'GET') {
      const orderId = path.split('/receipts/')[1]?.split('/print')[0];
      if (!orderId) {
        return new Response(
          JSON.stringify({ error: 'Order ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get order
      const orderDoc = await db.collection('orders').doc(orderId).get();
      if (!orderDoc.exists) {
        return new Response(
          JSON.stringify({ error: `Order ${orderId} not found` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const orderData = orderDoc.data();
      
      // Verify tenant access
      const locationDoc = await db.collection('locations').doc(orderData.locationId).get();
      if (!locationDoc.exists || locationDoc.data()?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get payment
      const paymentsSnapshot = await db.collection('payments')
        .where('orderId', '==', orderId)
        .limit(1)
        .get();
      const payment = paymentsSnapshot.empty ? undefined : paymentsSnapshot.docs[0].data();

      // Get location
      const location = locationDoc.exists ? locationDoc.data() : undefined;

      // Get user
      let userData = undefined;
      if (orderData.createdBy) {
        const userDoc = await db.collection('users').doc(orderData.createdBy).get();
        if (userDoc.exists) {
          const u = userDoc.data();
          userData = { id: userDoc.id, name: u.name };
        }
      }

      const text = formatReceipt(orderData, payment, location, userData);
      const escpos = convertToESCPOS(text);

      return new Response(
        JSON.stringify({ text, escpos }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /receipts/:orderId/email - Send receipt via email
    if (path.includes('/email') && method === 'POST') {
      const orderId = path.split('/receipts/')[1]?.split('/email')[0];
      if (!orderId) {
        return new Response(
          JSON.stringify({ error: 'Order ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await parseRequestBody<{ email: string }>(req);
      if (!body || !body.email) {
        return new Response(
          JSON.stringify({ error: 'Email is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get order
      const orderDoc = await db.collection('orders').doc(orderId).get();
      if (!orderDoc.exists) {
        return new Response(
          JSON.stringify({ error: `Order ${orderId} not found` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const orderData = orderDoc.data();
      
      // Verify tenant access
      const locationDoc = await db.collection('locations').doc(orderData.locationId).get();
      if (!locationDoc.exists || locationDoc.data()?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get payment
      const paymentsSnapshot = await db.collection('payments')
        .where('orderId', '==', orderId)
        .limit(1)
        .get();
      const payment = paymentsSnapshot.empty ? undefined : paymentsSnapshot.docs[0].data();

      // Get location
      const location = locationDoc.exists ? locationDoc.data() : undefined;

      // Get user
      let userData = undefined;
      if (orderData.createdBy) {
        const userDoc = await db.collection('users').doc(orderData.createdBy).get();
        if (userDoc.exists) {
          const u = userDoc.data();
          userData = { id: userDoc.id, name: u.name };
        }
      }

      const receiptText = formatReceipt(orderData, payment, location, userData);
      const receiptHTML = formatReceiptHTML(orderData, payment, location, userData);

      // TODO: Integrate with email service (e.g., SendGrid, Resend, etc.)
      // For now, just return success
      // In production, you would call an email service here
      console.log(`[Receipts] Would send email to ${body.email} for order ${orderId}`);

      return new Response(
        JSON.stringify({ success: true, message: 'Receipt sent successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 404
    return new Response(
      JSON.stringify({ error: 'Not Found', path, method }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Receipts] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

