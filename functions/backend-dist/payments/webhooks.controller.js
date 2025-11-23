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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const payments_service_1 = require("./payments.service");
const shared_1 = require("@pos-checkout/shared");
const payment_adapters_1 = require("@pos-checkout/payment-adapters");
const config_1 = require("@nestjs/config");
let WebhooksController = class WebhooksController {
    constructor(paymentsService, configService) {
        this.paymentsService = paymentsService;
        this.configService = configService;
        this.monnifyAdapter = null;
        const monnifyApiKey = this.configService.get('MONNIFY_API_KEY');
        const monnifySecretKey = this.configService.get('MONNIFY_SECRET_KEY');
        const monnifyContractCode = this.configService.get('MONNIFY_CONTRACT_CODE');
        const monnifyWebhookSecret = this.configService.get('MONNIFY_WEBHOOK_SECRET');
        if (monnifyApiKey && monnifySecretKey && monnifyContractCode && monnifyWebhookSecret) {
            this.monnifyAdapter = new payment_adapters_1.MonnifyAdapter({
                apiKey: monnifyApiKey,
                secretKey: monnifySecretKey,
                contractCode: monnifyContractCode,
                webhookSecret: monnifyWebhookSecret,
            });
        }
    }
    async handleMonnifyWebhook(payload, signature) {
        try {
            if (this.monnifyAdapter && signature) {
                const payloadString = JSON.stringify(payload);
                const isValid = this.monnifyAdapter.verifyWebhookSignature(payloadString, signature);
                if (!isValid) {
                    throw new common_1.BadRequestException('Invalid webhook signature');
                }
            }
            if (payload.eventType === 'SUCCESSFUL_TRANSACTION') {
                const { eventData } = payload;
                let status;
                const monnifyStatus = eventData.paymentStatus.toUpperCase();
                switch (monnifyStatus) {
                    case 'PAID':
                    case 'OVERPAID':
                        status = shared_1.PaymentStatus.COMPLETED;
                        break;
                    case 'PENDING':
                        status = shared_1.PaymentStatus.PROCESSING;
                        break;
                    case 'FAILED':
                    case 'CANCELLED':
                        status = shared_1.PaymentStatus.FAILED;
                        break;
                    default:
                        status = shared_1.PaymentStatus.PROCESSING;
                }
                const updatedPayment = await this.paymentsService.handleWebhookNotification(eventData.paymentReference, status, {
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
                });
                return {
                    received: true,
                    processed: !!updatedPayment,
                    timestamp: new Date().toISOString(),
                };
            }
            return {
                received: true,
                eventType: payload.eventType,
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            console.error('Webhook processing error:', error);
            throw new common_1.BadRequestException('Failed to process webhook');
        }
    }
    async handlePaymentStatus(payload) {
        return { received: true, timestamp: new Date().toISOString() };
    }
};
exports.WebhooksController = WebhooksController;
__decorate([
    (0, common_1.Post)('monnify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Webhook endpoint for Monnify payment status updates' }),
    (0, swagger_1.ApiHeader)({ name: 'monnify-signature', required: false, description: 'Monnify webhook signature for verification' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('monnify-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "handleMonnifyWebhook", null);
__decorate([
    (0, common_1.Post)('payment-status'),
    (0, swagger_1.ApiOperation)({ summary: 'Generic webhook endpoint for payment gateway status updates (legacy)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "handlePaymentStatus", null);
exports.WebhooksController = WebhooksController = __decorate([
    (0, swagger_1.ApiTags)('payments'),
    (0, common_1.Controller)('webhooks'),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService,
        config_1.ConfigService])
], WebhooksController);
//# sourceMappingURL=webhooks.controller.js.map