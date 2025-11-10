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
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const payments_service_1 = require("./payments.service");
const initiate_payment_dto_1 = require("./dto/initiate-payment.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let PaymentsController = class PaymentsController {
    constructor(paymentsService) {
        this.paymentsService = paymentsService;
    }
    async initiate(orderId, dto) {
        return this.paymentsService.initiatePayment(orderId, dto);
    }
    async capture(paymentId) {
        return this.paymentsService.capture(paymentId);
    }
    async refund(paymentId, amountCents) {
        return this.paymentsService.refund(paymentId, amountCents);
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Post)('initiate'),
    (0, swagger_1.ApiOperation)({ summary: 'Initiate payment for an order' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Payment initiated' }),
    __param(0, (0, common_1.Param)('orderId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, initiate_payment_dto_1.InitiatePaymentDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "initiate", null);
__decorate([
    (0, common_1.Post)('capture'),
    (0, swagger_1.ApiOperation)({ summary: 'Capture a pending payment' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Payment captured' }),
    __param(0, (0, common_1.Body)('paymentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "capture", null);
__decorate([
    (0, common_1.Post)('refund'),
    (0, swagger_1.ApiOperation)({ summary: 'Refund a completed payment' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Payment refunded' }),
    __param(0, (0, common_1.Body)('paymentId')),
    __param(1, (0, common_1.Body)('amountCents')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "refund", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, swagger_1.ApiTags)('payments'),
    (0, common_1.Controller)('orders/:orderId/payments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map