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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const shared_1 = require("@pos-checkout/shared");
const orders_service_1 = require("../orders/orders.service");
const payment_adapters_1 = require("@pos-checkout/payment-adapters");
const config_1 = require("@nestjs/config");
const payments_repository_1 = require("./payments.repository");
const users_repository_1 = require("../users/users.repository");
let PaymentsService = class PaymentsService {
    constructor(paymentsRepository, ordersService, configService, usersRepository) {
        this.paymentsRepository = paymentsRepository;
        this.ordersService = ordersService;
        this.configService = configService;
        this.usersRepository = usersRepository;
        const approveRate = this.configService.get('PAYMENT_MOCK_APPROVE_RATE', 0.95);
        this.defaultPaymentAdapter = new payment_adapters_1.MockTerminal(approveRate);
    }
    async getPaymentAdapter() {
        return this.defaultPaymentAdapter;
    }
    async initiatePayment(orderId, dto) {
        const order = await this.ordersService.findOne(orderId);
        if (order.status === shared_1.OrderStatus.COMPLETED) {
            throw new common_1.ConflictException('Order already completed');
        }
        const user = await this.usersRepository.findById(order.createdBy);
        const tenantId = user?.tenantId || '';
        let payment = await this.paymentsRepository.create({
            orderId: order.id,
            amountCents: dto.amount,
            currency: 'NGN',
            method: dto.method,
            status: shared_1.PaymentStatus.PROCESSING,
        });
        try {
            let result;
            if (dto.method === shared_1.PaymentMethod.CASH || dto.method === shared_1.PaymentMethod.TRANSFER) {
                result = await this.paymentsRepository.update(payment.id, {
                    status: shared_1.PaymentStatus.COMPLETED,
                    processedAt: new Date(),
                    transactionId: `${dto.method === shared_1.PaymentMethod.CASH ? 'CASH' : 'TRANSFER'}_${Date.now()}`,
                });
            }
            else {
                const paymentAdapter = await this.getPaymentAdapter();
                const adapterResult = await paymentAdapter.initiatePayment({
                    order_id: order.id,
                    amount_cents: dto.amount,
                    currency: 'NGN',
                    method: dto.method,
                    metadata: {
                        ...dto.metadata,
                        customerName: dto.metadata?.customerName,
                        customerEmail: dto.metadata?.customerEmail,
                        customerPhone: dto.metadata?.customerPhone,
                        redirectUrl: dto.metadata?.redirectUrl || `${this.configService.get('FRONTEND_URL', 'http://localhost:5173')}/checkout/payment-callback`,
                    },
                });
                result = await this.paymentsRepository.update(payment.id, {
                    status: adapterResult.status,
                    transactionId: adapterResult.transaction_id,
                    processorData: adapterResult.processor_data,
                    error: adapterResult.error,
                    processedAt: adapterResult.status === shared_1.PaymentStatus.COMPLETED ? new Date() : undefined,
                });
            }
            payment = result;
            return payment;
        }
        catch (error) {
            payment = await this.paymentsRepository.update(payment.id, {
                status: shared_1.PaymentStatus.FAILED,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    async capture(paymentId) {
        const payment = await this.paymentsRepository.findById(paymentId);
        if (!payment) {
            throw new common_1.NotFoundException(`Payment ${paymentId} not found`);
        }
        if (payment.status === shared_1.PaymentStatus.COMPLETED) {
            return payment;
        }
        const order = await this.ordersService.findOne(payment.orderId);
        const user = await this.usersRepository.findById(order.createdBy);
        const tenantId = user?.tenantId || '';
        const paymentAdapter = await this.getPaymentAdapter();
        const result = await paymentAdapter.capture(paymentId);
        return this.paymentsRepository.update(paymentId, {
            status: result.status,
            transactionId: result.transaction_id,
            processorData: result.processor_data,
            processedAt: result.status === shared_1.PaymentStatus.COMPLETED ? new Date() : undefined,
        });
    }
    async refund(paymentId, amountCents) {
        const payment = await this.paymentsRepository.findById(paymentId);
        if (!payment) {
            throw new common_1.NotFoundException(`Payment ${paymentId} not found`);
        }
        if (payment.status !== shared_1.PaymentStatus.COMPLETED) {
            throw new Error(`Cannot refund payment with status: ${payment.status}`);
        }
        const order = await this.ordersService.findOne(payment.orderId);
        const user = await this.usersRepository.findById(order.createdBy);
        const tenantId = user?.tenantId || '';
        const refundAmount = amountCents || payment.amountCents;
        const paymentAdapter = await this.getPaymentAdapter();
        const result = await paymentAdapter.refund(paymentId, refundAmount);
        return this.paymentsRepository.update(paymentId, {
            status: result.status,
            processorData: {
                ...(payment.processorData ?? {}),
                refund_amount: refundAmount,
                refunded_at: new Date().toISOString(),
            },
        });
    }
    async getOrderPayments(orderId) {
        return this.paymentsRepository.findByOrderId(orderId);
    }
    async getOrderPaymentStatus(orderId) {
        const order = await this.ordersService.findOne(orderId);
        const payments = await this.paymentsRepository.findByOrderId(orderId);
        const totalPaid = payments
            .filter(p => p.status === shared_1.PaymentStatus.COMPLETED)
            .reduce((sum, p) => sum + p.amountCents, 0);
        const totalDue = order.totalCents;
        const isFullyPaid = totalPaid >= totalDue;
        return {
            totalPaid,
            totalDue,
            isFullyPaid,
            payments,
        };
    }
    async handleWebhookNotification(paymentReference, status, transactionData) {
        const payment = await this.paymentsRepository.findByPaymentReference(paymentReference);
        if (!payment) {
            return null;
        }
        return this.paymentsRepository.update(payment.id, {
            status,
            transactionId: transactionData?.transactionReference || payment.transactionId,
            processorData: {
                ...(payment.processorData ?? {}),
                ...transactionData,
                webhookReceivedAt: new Date().toISOString(),
            },
            processedAt: status === shared_1.PaymentStatus.COMPLETED ? new Date() : payment.processedAt,
        });
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [payments_repository_1.PaymentsRepository,
        orders_service_1.OrdersService,
        config_1.ConfigService,
        users_repository_1.UsersRepository])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map