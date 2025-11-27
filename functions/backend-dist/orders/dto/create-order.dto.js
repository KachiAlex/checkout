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
exports.CreateOrderDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class OrderItemDto {
}
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Product ID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], OrderItemDto.prototype, "productId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Quantity', example: 2 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], OrderItemDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Price in cents', example: 150 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], OrderItemDto.prototype, "priceCents", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tax in cents', example: 11 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], OrderItemDto.prototype, "taxCents", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Discount in cents', required: false, example: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], OrderItemDto.prototype, "discountCents", void 0);
class CreateOrderDto {
}
exports.CreateOrderDto = CreateOrderDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Client-generated UUID for idempotency' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "uuid", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Location ID', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "locationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Customer ID', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Order items', type: [OrderItemDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => OrderItemDto),
    __metadata("design:type", Array)
], CreateOrderDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Subtotal in cents', example: 1000 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateOrderDto.prototype, "subtotalCents", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tax in cents', example: 75 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateOrderDto.prototype, "taxCents", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Cart-level discount in cents', default: 0, example: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateOrderDto.prototype, "discountCents", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Cart-level discount percentage (0-100)', required: false, example: 10 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateOrderDto.prototype, "discountPercent", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Discount reason/description', required: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "discountReason", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total in cents', example: 1075 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateOrderDto.prototype, "totalCents", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Device ID', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "deviceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Notes', required: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether this order is held/suspended', default: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateOrderDto.prototype, "isHeld", void 0);
//# sourceMappingURL=create-order.dto.js.map