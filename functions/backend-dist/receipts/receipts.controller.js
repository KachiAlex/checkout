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
exports.ReceiptsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const receipts_service_1 = require("./receipts.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let ReceiptsController = class ReceiptsController {
    constructor(receiptsService) {
        this.receiptsService = receiptsService;
    }
    async getReceipt(orderId) {
        const receipt = await this.receiptsService.generateReceipt(orderId);
        return { receipt, orderId };
    }
    async getReceiptForPrint(orderId) {
        return this.receiptsService.getReceiptForPrint(orderId);
    }
    async sendEmailReceipt(orderId, email) {
        const success = await this.receiptsService.sendEmailReceipt(orderId, email);
        return { success, message: success ? 'Receipt sent successfully' : 'Failed to send receipt' };
    }
};
exports.ReceiptsController = ReceiptsController;
__decorate([
    (0, common_1.Get)(':orderId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get receipt for an order' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Receipt generated' }),
    __param(0, (0, common_1.Param)('orderId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReceiptsController.prototype, "getReceipt", null);
__decorate([
    (0, common_1.Get)(':orderId/print'),
    (0, swagger_1.ApiOperation)({ summary: 'Get receipt in ESC/POS format for printing' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Receipt in ESC/POS format' }),
    __param(0, (0, common_1.Param)('orderId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReceiptsController.prototype, "getReceiptForPrint", null);
__decorate([
    (0, common_1.Post)(':orderId/email'),
    (0, swagger_1.ApiOperation)({ summary: 'Send receipt via email' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Receipt sent' }),
    __param(0, (0, common_1.Param)('orderId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReceiptsController.prototype, "sendEmailReceipt", null);
exports.ReceiptsController = ReceiptsController = __decorate([
    (0, swagger_1.ApiTags)('receipts'),
    (0, common_1.Controller)('receipts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [receipts_service_1.ReceiptsService])
], ReceiptsController);
//# sourceMappingURL=receipts.controller.js.map