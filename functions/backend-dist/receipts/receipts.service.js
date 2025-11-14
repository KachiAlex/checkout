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
let ReceiptsService = class ReceiptsService {
    constructor(ordersRepository, paymentsRepository, locationsRepository, usersRepository) {
        this.ordersRepository = ordersRepository;
        this.paymentsRepository = paymentsRepository;
        this.locationsRepository = locationsRepository;
        this.usersRepository = usersRepository;
    }
    async generateReceipt(orderId) {
        const order = await this.ordersRepository.findById(orderId);
        if (!order) {
            throw new Error(`Order ${orderId} not found`);
        }
        const [payment] = await this.paymentsRepository.findByOrderId(order.id);
        const location = order.locationId ? await this.locationsRepository.findById(order.locationId) : null;
        const user = order.createdBy ? await this.usersRepository.findById(order.createdBy) : null;
        return this.formatReceipt(order, payment ?? undefined, location ?? undefined, user ?? undefined);
    }
    formatReceipt(order, payment, location, user) {
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
    async sendEmailReceipt(orderId, email) {
        try {
            const receiptText = await this.generateReceipt(orderId);
            console.log('Email Receipt:');
            console.log(`To: ${email}`);
            console.log(`Order: ${orderId}`);
            console.log('---');
            console.log(receiptText);
            return true;
        }
        catch (error) {
            console.error('Failed to send email receipt:', error);
            return false;
        }
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
        users_repository_1.UsersRepository])
], ReceiptsService);
//# sourceMappingURL=receipts.service.js.map