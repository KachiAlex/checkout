import { Injectable } from '@nestjs/common';
import { OrdersRepository, OrderRecord } from '../orders/orders.repository';
import { PaymentsRepository, PaymentRecord } from '../payments/payments.repository';
import { LocationsRepository, LocationRecord } from '../locations/locations.repository';
import { UsersRepository, UserRecord } from '../users/users.repository';

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly locationsRepository: LocationsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async generateReceipt(orderId: string): Promise<string> {
    const order = await this.ordersRepository.findById(orderId);

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const [payment] = await this.paymentsRepository.findByOrderId(order.id);
    const location = order.locationId ? await this.locationsRepository.findById(order.locationId) : null;
    const user = order.createdBy ? await this.usersRepository.findById(order.createdBy) : null;

    return this.formatReceipt(order, payment ?? undefined, location ?? undefined, user ?? undefined);
  }

  private formatReceipt(
    order: OrderRecord,
    payment?: PaymentRecord,
    location?: LocationRecord,
    user?: UserRecord,
  ): string {
    const receipt = [
      '╔═══════════════════════════════════╗',
      `║    ${(location?.name || 'Store').padEnd(12).substring(0, 12)}    ║`,
      location?.address ? `║  ${location.address.padEnd(33).substring(0, 33)}  ║` : '',
      '╠═══════════════════════════════════╣',
      `Order: ${order.orderNumber}`,
      `Date: ${order.createdAt.toLocaleString()}`,
      `Cashier: ${user?.name || 'N/A'}`,
      '╠═══════════════════════════════════╣',
      '',
      'Items:',
      '',
    ];

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
    receipt.push('Thank you for your purchase!');
    receipt.push('╚═══════════════════════════════════╝');

    return receipt.filter((line) => line !== '').join('\n');
  }

  async sendEmailReceipt(orderId: string, email: string): Promise<boolean> {
    try {
      const receiptText = await this.generateReceipt(orderId);

      // For MVP: Log email receipt (production would use SMTP adapter)
      console.log('Email Receipt:');
      console.log(`To: ${email}`);
      console.log(`Order: ${orderId}`);
      console.log('---');
      console.log(receiptText);

      // In production, use an email service like SendGrid, AWS SES, etc.
      // await this.emailService.send({
      //   to: email,
      //   subject: `Receipt for Order ${order.orderNumber}`,
      //   text: receiptText,
      //   html: this.formatReceiptHTML(order),
      // });

      return true;
    } catch (error) {
      console.error('Failed to send email receipt:', error);
      return false;
    }
  }

  async getReceiptForPrint(orderId: string): Promise<{
    text: string;
    escpos: string;
  }> {
    const text = await this.generateReceipt(orderId);
    const escpos = this.convertToESCPOS(text);
    return { text, escpos };
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
