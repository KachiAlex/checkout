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
exports.CreateTenantDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const shared_1 = require("@pos-checkout/shared");
class CreateTenantDto {
    constructor() {
        this.plan = shared_1.TenantPlan.MONTHLY;
    }
}
exports.CreateTenantDto = CreateTenantDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Company name', example: 'Acme Retail' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTenantDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'URL-friendly slug', example: 'acme-retail' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: 'Slug may only contain lowercase letters, numbers, and hyphens',
    }),
    __metadata("design:type", String)
], CreateTenantDto.prototype, "slug", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: shared_1.TenantPlan, default: shared_1.TenantPlan.MONTHLY }),
    (0, class_validator_1.IsEnum)(shared_1.TenantPlan),
    __metadata("design:type", String)
], CreateTenantDto.prototype, "plan", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Seat/license limit', required: false, example: 10 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateTenantDto.prototype, "seatLimit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Primary tenant admin email', example: 'manager@acme.com' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateTenantDto.prototype, "adminEmail", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tenant admin display name', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTenantDto.prototype, "adminName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Billing cycle start date (ISO format)', required: false, example: '2025-01-01' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTenantDto.prototype, "billingCycleStart", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Billing cycle end date (ISO format)', required: false, example: '2025-12-31' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTenantDto.prototype, "billingCycleEnd", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: shared_1.Industry, description: 'Industry type', required: false, default: shared_1.Industry.GENERAL }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(shared_1.Industry),
    __metadata("design:type", String)
], CreateTenantDto.prototype, "industry", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Custom feature flags (will be merged with industry defaults)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => Object),
    __metadata("design:type", Object)
], CreateTenantDto.prototype, "featureFlags", void 0);
//# sourceMappingURL=create-tenant.dto.js.map