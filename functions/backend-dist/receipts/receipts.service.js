"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptsService = void 0;
const common_1 = require("@nestjs/common");
const orders_repository_1 = require("../orders/orders.repository");
const payments_repository_1 = require("../payments/payments.repository");
const locations_repository_1 = require("../locations/locations.repository");
const users_repository_1 = require("../users/users.repository");
const email_service_1 = require("../email/email.service");
const customization_service_1 = require("../customization/customization.service");
let ReceiptsService = class ReceiptsService {
    constructor(ordersRepository, paymentsRepository, locationsRepository, usersRepository, emailService, customizationService) {
        this.ordersRepository = ordersRepository;
        this.paymentsRepository = paymentsRepository;
        this.locationsRepository = locationsRepository;
        this.usersRepository = usersRepository;
        this.emailService = emailService;
        this.customizationService = customizationService;
    }
    async generateReceipt(orderId) {
        const order = await this.ordersRepository.findById(orderId);
        if (!order) {
            throw new Error(`Order ${orderId} not found`);
        }
        const [payment] = await this.paymentsRepository.findByOrderId(order.id);
        const location = order.locationId ? await this.locationsRepository.findById(order.locationId) : null;
        const user = order.createdBy ? await this.usersRepository.findById(order.createdBy) : null;
        let customization = null;
        if (location?.tenantId) {
            try {
                customization = await this.customizationService.getCustomization(location.tenantId);
            }
            catch (error) {
                console.warn(`Customization not found for tenant ${location.tenantId}, using defaults`);
            }
        }
        return this.formatReceipt(order, payment ?? undefined, location ?? undefined, user ?? undefined, customization ?? undefined);
    }
    formatReceipt(order, payment, location, user, customization) {
        const companyName = customization?.companyName || '';
        const headerInfo = customization?.headerInfo || '';
        const address = customization?.address || location?.address || '';
        const phone = customization?.phone || '';
        const email = customization?.email || '';
        const website = customization?.website || '';
        const footerMessage = customization?.footerMessage || 'Thank you for your purchase!';
        const receipt = [
            '╔═══════════════════════════════════╗',
        ];
        if (companyName) {
            receipt.push(`║    ${companyName.padEnd(33).substring(0, 33)}  ║`);
        }
        receipt.push(`║    ${(location?.name || 'Store').padEnd(33).substring(0, 33)}  ║`);
        if (address) {
            receipt.push(`║  ${address.padEnd(33).substring(0, 33)}  ║`);
        }
        if (phone) {
            receipt.push(`║  ${phone.padEnd(33).substring(0, 33)}  ║`);
        }
        if (email) {
            receipt.push(`║  ${email.padEnd(33).substring(0, 33)}  ║`);
        }
        if (website) {
            receipt.push(`║  ${website.padEnd(33).substring(0, 33)}  ║`);
        }
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
    async sendEmailReceipt(orderId, email) {
        try {
            const order = await this.ordersRepository.findById(orderId);
            if (!order) {
                throw new Error(`Order ${orderId} not found`);
            }
            const receiptText = await this.generateReceipt(orderId);
            const [payment] = await this.paymentsRepository.findByOrderId(order.id);
            const location = order.locationId ? await this.locationsRepository.findById(order.locationId) : null;
            const user = order.createdBy ? await this.usersRepository.findById(order.createdBy) : null;
            let customization = null;
            if (location?.tenantId) {
                try {
                    customization = await this.customizationService.getCustomization(location.tenantId);
                }
                catch (error) {
                    console.warn(`Customization not found for tenant ${location.tenantId}, using defaults`);
                }
            }
            const receiptHTML = this.formatReceiptHTML(order, payment ?? undefined, location ?? undefined, user ?? undefined, customization ?? undefined);
            const success = await this.emailService.sendEmail({
                to: email,
                subject: `Receipt for Order ${order.orderNumber}`,
                text: receiptText,
                html: receiptHTML,
            });
            return success;
        }
        catch (error) {
            console.error('Failed to send email receipt:', error);
            return false;
        }
    }
    formatReceiptHTML(order, payment, location, user, customization) {
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
              ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-width: 200px; max-height: 80px; margin-bottom: 10px;" />` : ''}
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
              <p>${footerMessage}</p>
            </div>
          </div>
        </body>
      </html>
    `;
    }
    async getReceiptForPrint(orderId) {
        const text = await this.generateReceipt(orderId);
        const escpos = this.convertToESCPOS(text);
        return { text, escpos };
    }
    convertToESCPOS(text) {
        const ESC = '\x1B';
        const commands = [
            ESC + '@',
            ESC + 'a' + '\x01',
            text,
            '\n\n\n',
            ESC + 'd' + '\x03',
            ESC + 'i',
        ];
        return commands.join('');
    }
};
exports.ReceiptsService = ReceiptsService;
exports.ReceiptsService = ReceiptsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [orders_repository_1.OrdersRepository,
        payments_repository_1.PaymentsRepository,
        locations_repository_1.LocationsRepository,
        users_repository_1.UsersRepository,
        email_service_1.EmailService,
        customization_service_1.CustomizationService])
], ReceiptsService);
//# sourceMappingURL=receipts.service.js.map