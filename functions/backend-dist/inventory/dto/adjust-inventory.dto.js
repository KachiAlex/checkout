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
exports.AdjustInventoryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const shared_1 = require("@pos-checkout/shared");
class AdjustInventoryDto {
}
exports.AdjustInventoryDto = AdjustInventoryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Product ID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AdjustInventoryDto.prototype, "productId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Location ID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AdjustInventoryDto.prototype, "locationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Quantity delta (can be negative)', example: -5 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], AdjustInventoryDto.prototype, "delta", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Transaction type',
        enum: shared_1.InventoryTransactionType,
    }),
    (0, class_validator_1.IsEnum)(shared_1.InventoryTransactionType),
    __metadata("design:type", String)
], AdjustInventoryDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User ID performing the adjustment', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AdjustInventoryDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Reference ID (e.g., order ID)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AdjustInventoryDto.prototype, "referenceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Notes', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdjustInventoryDto.prototype, "notes", void 0);
//# sourceMappingURL=adjust-inventory.dto.js.map