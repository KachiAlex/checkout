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
exports.InitiatePaymentDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const shared_1 = require("@pos-checkout/shared");
class InitiatePaymentDto {
}
exports.InitiatePaymentDto = InitiatePaymentDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Payment method',
        enum: shared_1.PaymentMethod,
        example: shared_1.PaymentMethod.CARD,
    }),
    (0, class_validator_1.IsEnum)(shared_1.PaymentMethod),
    __metadata("design:type", String)
], InitiatePaymentDto.prototype, "method", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Amount in cents', example: 1075 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], InitiatePaymentDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Additional metadata (e.g., token for card payments)', required: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], InitiatePaymentDto.prototype, "metadata", void 0);
//# sourceMappingURL=initiate-payment.dto.js.map