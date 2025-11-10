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
let PaymentsService = class PaymentsService {
    constructor(paymentsRepository, ordersService, configService) {
        this.paymentsRepository = paymentsRepository;
        this.ordersService = ordersService;
        this.configService = configService;
        const approveRate = this.configService.get('PAYMENT_MOCK_APPROVE_RATE', 0.95);
        this.mockTerminal = new payment_adapters_1.MockTerminal(approveRate);
    }
    async initiatePayment(orderId, dto) {
        const order = await this.ordersService.findOne(orderId);
        if (order.status === shared_1.OrderStatus.COMPLETED) {
            throw new Error('Order already completed');
        }
        let payment = await this.paymentsRepository.create({
            orderId: order.id,
            amountCents: dto.amount,
            currency: 'NGN',
            method: dto.method,
            status: shared_1.PaymentStatus.PROCESSING,
        });
        try {
            let result;
            if (dto.method === shared_1.PaymentMethod.CASH) {
                result = await this.paymentsRepository.update(payment.id, {
                    status: shared_1.PaymentStatus.COMPLETED,
                    processedAt: new Date(),
                    transactionId: `CASH_${Date.now()}`,
                });
            }
            else {
                const adapterResult = await this.mockTerminal.initiatePayment({
                    order_id: order.id,
                    amount_cents: dto.amount,
                    currency: 'NGN',
                    method: dto.method,
                    metadata: dto.metadata,
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
        const result = await this.mockTerminal.capture(paymentId);
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
        const refundAmount = amountCents || payment.amountCents;
        const result = await this.mockTerminal.refund(paymentId, refundAmount);
        return this.paymentsRepository.update(paymentId, {
            status: result.status,
            processorData: {
                ...(payment.processorData ?? {}),
                refund_amount: refundAmount,
                refunded_at: new Date().toISOString(),
            },
        });
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [payments_repository_1.PaymentsRepository,
        orders_service_1.OrdersService,
        config_1.ConfigService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map