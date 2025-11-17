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
exports.TenantsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const tenants_service_1 = require("./tenants.service");
const create_tenant_dto_1 = require("./dto/create-tenant.dto");
const update_tenant_dto_1 = require("./dto/update-tenant.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const update_subscription_dto_1 = require("./dto/update-subscription.dto");
const reset_tenant_admin_pin_dto_1 = require("./dto/reset-tenant-admin-pin.dto");
const suspend_tenant_dto_1 = require("./dto/suspend-tenant.dto");
let TenantsController = class TenantsController {
    constructor(tenantsService) {
        this.tenantsService = tenantsService;
    }
    ensurePlatformAdmin(req) {
        if (!req.user?.isPlatformAdmin) {
            throw new common_1.ForbiddenException('Only platform administrators can manage tenants');
        }
    }
    async create(req, dto) {
        this.ensurePlatformAdmin(req);
        return this.tenantsService.create(dto);
    }
    async findAll(req) {
        this.ensurePlatformAdmin(req);
        return this.tenantsService.findAll();
    }
    async findById(req, id) {
        this.ensurePlatformAdmin(req);
        return this.tenantsService.findById(id);
    }
    async update(req, id, dto) {
        this.ensurePlatformAdmin(req);
        return this.tenantsService.update(id, dto);
    }
    async updateSubscription(req, id, dto) {
        this.ensurePlatformAdmin(req);
        return this.tenantsService.updateSubscription(id, dto);
    }
    async resetAdminPin(req, id, dto) {
        this.ensurePlatformAdmin(req);
        return this.tenantsService.resetAdminPin(id, dto);
    }
    async suspend(req, id, dto) {
        this.ensurePlatformAdmin(req);
        return this.tenantsService.suspend(id, dto);
    }
    async activate(req, id) {
        this.ensurePlatformAdmin(req);
        return this.tenantsService.activate(id);
    }
};
exports.TenantsController = TenantsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new tenant/company' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_tenant_dto_1.CreateTenantDto]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List tenants' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get tenant by ID' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "findById", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update tenant details' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_tenant_dto_1.UpdateTenantDto]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/subscription'),
    (0, swagger_1.ApiOperation)({ summary: 'Adjust tenant subscription metadata' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_subscription_dto_1.UpdateSubscriptionDto]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "updateSubscription", null);
__decorate([
    (0, common_1.Post)(':id/reset-admin-pin'),
    (0, swagger_1.ApiOperation)({ summary: 'Reset the primary tenant admin PIN' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, reset_tenant_admin_pin_dto_1.ResetTenantAdminPinDto]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "resetAdminPin", null);
__decorate([
    (0, common_1.Post)(':id/suspend'),
    (0, swagger_1.ApiOperation)({ summary: 'Suspend a tenant' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, suspend_tenant_dto_1.SuspendTenantDto]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "suspend", null);
__decorate([
    (0, common_1.Post)(':id/activate'),
    (0, swagger_1.ApiOperation)({ summary: 'Reactivate a suspended tenant' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "activate", null);
exports.TenantsController = TenantsController = __decorate([
    (0, swagger_1.ApiTags)('tenants'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('platform/tenants'),
    __metadata("design:paramtypes", [tenants_service_1.TenantsService])
], TenantsController);
//# sourceMappingURL=tenants.controller.js.map