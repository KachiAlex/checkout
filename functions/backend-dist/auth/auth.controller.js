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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const login_dto_1 = require("./dto/login.dto");
const super_admin_login_dto_1 = require("./dto/super-admin-login.dto");
const verify_manager_dto_1 = require("./dto/verify-manager.dto");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const shared_1 = require("@pos-checkout/shared");
let AuthController = class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    async login(loginDto) {
        return this.authService.login(loginDto);
    }
    async superAdminLogin(loginDto) {
        return this.authService.loginSuperAdmin(loginDto);
    }
    async verifyManager(verifyDto, req) {
        const user = req.user;
        if (user.role === shared_1.UserRole.MANAGER || user.role === shared_1.UserRole.ADMIN) {
            return { authorized: true, message: 'User is already authorized' };
        }
        const manager = await this.authService.validateUser(verifyDto.pin, user.tenantId);
        if (!manager) {
            return { authorized: false, message: 'Invalid manager PIN' };
        }
        if (manager.role !== shared_1.UserRole.MANAGER && manager.role !== shared_1.UserRole.ADMIN) {
            return { authorized: false, message: 'PIN does not belong to a manager or admin' };
        }
        return {
            authorized: true,
            message: 'Manager authorization verified',
            authorizedBy: {
                id: manager.id,
                name: manager.name,
                role: manager.role,
            },
        };
    }
    async refresh(body) {
        return this.authService.refreshToken(body.refreshToken);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    (0, swagger_1.ApiOperation)({ summary: 'Login with tenant slug and PIN' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Login successful' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('superadmin/login'),
    (0, swagger_1.ApiOperation)({ summary: 'Super admin login' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Login successful' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [super_admin_login_dto_1.SuperAdminLoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "superAdminLogin", null);
__decorate([
    (0, common_1.Post)('verify-manager'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify manager PIN for price override authorization' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Manager PIN verified' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Invalid PIN or insufficient permissions' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_manager_dto_1.VerifyManagerDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyManager", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, swagger_1.ApiOperation)({ summary: 'Refresh access token using refresh token' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Token refreshed successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid refresh token' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map