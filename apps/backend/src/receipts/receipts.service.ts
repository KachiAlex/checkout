import { Injectable } from '@nestjs/common';
import { OrdersRepository, OrderRecord } from '../orders/orders.repository';
import { PaymentsRepository, PaymentRecord } from '../payments/payments.repository';
import { LocationsRepository, LocationRecord } from '../locations/locations.repository';
import { UsersRepository, UserRecord } from '../users/users.repository';
import { EmailService } from '../email/email.service';
import { CustomizationService } from '../customization/customization.service';

interface ReceiptContext {
  order: OrderRecord;
  payment?: PaymentRecord;
  location?: LocationRecord;
  user?: UserRecord;
  customization?: {
    companyName?: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    headerInfo?: string;
    footerMessage?: string;
  };
}

interface ReceiptPayload {
  text: string;
  html: string;
  orderNumber: string;
}

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly locationsRepository: LocationsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly emailService: EmailService,
    private readonly customizationService: CustomizationService,
  ) {}

  private async buildReceiptContext(orderId: string): Promise<ReceiptContext> {
    const order = await this.ordersRepository.findById(orderId);

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const [payment] = await this.paymentsRepository.findByOrderId(order.id);
    const location = order.locationId
      ? await this.locationsRepository.findById(order.locationId)
      : null;
    const user = order.createdBy ? await this.usersRepository.findById(order.createdBy) : null;

    // Get customization settings from location's tenantId
    let customization = null;
    if (location?.tenantId) {
      try {
        customization = await this.customizationService.getCustomization(location.tenantId);
      } catch (error) {
        // If customization not found, use defaults
        console.warn(`Customization not found for tenant ${location.tenantId}, using defaults`);
      }
    }

    return {
      order,
      payment: payment ?? undefined,
      location: location ?? undefined,
      user: user ?? undefined,
      customization: customization ?? undefined,
    };
  }

  private async generateReceiptPayload(orderId: string): Promise<ReceiptPayload> {
    const context = await this.buildReceiptContext(orderId);
    return {
      text: this.formatReceipt(
        context.order,
        context.payment,
        context.location,
        context.user,
        context.customization,
      ),
      html: this.formatReceiptHTML(
        context.order,
        context.payment,
        context.location,
        context.user,
        context.customization,
      ),
      orderNumber: context.order.orderNumber,
    };
  }

  async generateReceipt(orderId: string): Promise<string> {
    const payload = await this.generateReceiptPayload(orderId);
    return payload.text;
  }

  async generateReceiptHtml(orderId: string): Promise<string> {
    const payload = await this.generateReceiptPayload(orderId);
    return payload.html;
  }

  private formatReceipt(
    order: OrderRecord,
    payment?: PaymentRecord,
    location?: LocationRecord,
    user?: UserRecord,
    customization?: {
      companyName?: string;
      logoUrl?: string;
      address?: string;
      phone?: string;
      email?: string;
      website?: string;
      headerInfo?: string;
      footerMessage?: string;
    },
  ): string {
    const companyName = customization?.companyName || '';
    const headerInfo = customization?.headerInfo || '';
    const address = customization?.address || location?.address || '';
    const phone = customization?.phone || '';
    const email = customization?.email || '';
    const website = customization?.website || '';
    const footerMessage = customization?.footerMessage || 'Thank you for your purchase!';

    const receipt = ['╔═══════════════════════════════════╗'];

    // Add company name if available
    if (companyName) {
      receipt.push(`║    ${companyName.padEnd(33).substring(0, 33)}  ║`);
    }

    // Add location name
    receipt.push(`║    ${(location?.name || 'Store').padEnd(33).substring(0, 33)}  ║`);

    // Add address
    if (address) {
      receipt.push(`║  ${address.padEnd(33).substring(0, 33)}  ║`);
    }

    // Add phone
    if (phone) {
      receipt.push(`║  ${phone.padEnd(33).substring(0, 33)}  ║`);
    }

    // Add email
    if (email) {
      receipt.push(`║  ${email.padEnd(33).substring(0, 33)}  ║`);
    }

    // Add website
    if (website) {
      receipt.push(`║  ${website.padEnd(33).substring(0, 33)}  ║`);
    }

    // Add header info
    if (headerInfo) {
      receipt.push(`║  ${headerInfo.padEnd(33).substring(0, 33)}  ║`);
    }

    receipt.push('╠═══════════════════════════════════╣');
    receipt.push(`Order: ${order.orderNumber}`);
    receipt.push(`Date: ${order.createdAt.toLocaleString()}`);
    receipt.push(`Cashier: ${user?.name || 'N/A'}`);
    receipt.push('╠═══════════════════════════════════╣');
    receipt.push('');
    receipt.push('Items:');
    receipt.push('');

    order.items.forEach((item) => {
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
    receipt.push(footerMessage);
    receipt.push('╚═══════════════════════════════════╝');

    return receipt.filter((line) => line !== '').join('\n');
  }

  async sendEmailReceipt(orderId: string, email: string): Promise<boolean> {
    try {
      const payload = await this.generateReceiptPayload(orderId);
      const success = await this.emailService.sendEmail({
        to: email,
        subject: `Receipt for Order ${payload.orderNumber}`,
        text: payload.text,
        html: payload.html,
      });

      return success;
    } catch (error) {
      console.error('Failed to send email receipt:', error);
      return false;
    }
  }

  private formatReceiptHTML(
    order: OrderRecord,
    payment?: PaymentRecord,
    location?: LocationRecord,
    user?: UserRecord,
    customization?: {
      companyName?: string;
      logoUrl?: string;
      address?: string;
      phone?: string;
      email?: string;
      website?: string;
      headerInfo?: string;
      footerMessage?: string;
    },
  ): string {
    const companyName = customization?.companyName || '';
    const logoUrl = customization?.logoUrl || '';
    const address = customization?.address || location?.address || '';
    const phone = customization?.phone || '';
    const email = customization?.email || '';
    const website = customization?.website || '';
    const headerInfo = customization?.headerInfo || '';
    const footerMessage = customization?.footerMessage || 'Thank you for your purchase!';
    const itemsHTML = order.items
      .map((item) => {
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

    const styles = `
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
        font-size: 26px;
        color: #111;
        font-weight: 800;
        letter-spacing: 0.05em;
        text-transform: uppercase;
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
      .logo {
        max-width: 200px;
        max-height: 80px;
        margin-bottom: 10px;
        display: block;
        margin-left: auto;
        margin-right: auto;
        object-fit: contain;
      }
    `;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Receipt - Order ${order.orderNumber}</title>
          <style>${styles}</style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo" />` : ''}
              ${companyName ? `<h1>${companyName}</h1>` : ''}
              <h2 style="margin: 10px 0; font-size: 20px; color: #555;">${location?.name || 'Store'}</h2>
              ${address ? `<p>${address}</p>` : ''}
              ${phone ? `<p>Phone: ${phone}</p>` : ''}
              ${email ? `<p>Email: ${email}</p>` : ''}
              ${website ? `<p>Website: <a href="${website}" style="color: #333;">${website}</a></p>` : ''}
              ${headerInfo ? `<p style="margin-top: 10px; font-size: 12px; color: #666;">${headerInfo}</p>` : ''}
            </div>

            <div class="order-info">
              <p><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p><strong>Date:</strong> ${order.createdAt.toLocaleString()}</p>
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
              ${
                order.discountCents > 0
                  ? `
                <div class="totals-row">
                  <span>Discount:</span>
                  <span>-₦${(order.discountCents / 100).toFixed(2)}</span>
                </div>
              `
                  : ''
              }
              <div class="totals-row total-row">
                <span>TOTAL:</span>
                <span>₦${(order.totalCents / 100).toFixed(2)}</span>
              </div>
            </div>

            ${
              payment
                ? `
              <div class="payment-info">
                <p><strong>Payment Method:</strong> ${payment.method.toUpperCase()}</p>
                ${payment.transactionId ? `<p><strong>Transaction ID:</strong> ${payment.transactionId}</p>` : ''}
              </div>
            `
                : ''
            }

            <div class="footer">
              <p>${footerMessage}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async getReceiptForPrint(orderId: string): Promise<{
    text: string;
    html: string;
    escpos: string;
  }> {
    const payload = await this.generateReceiptPayload(orderId);
    const escpos = this.convertToESCPOS(payload.text);
    return { text: payload.text, html: payload.html, escpos };
  }

  private convertToESCPOS(text: string): string {
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
}
