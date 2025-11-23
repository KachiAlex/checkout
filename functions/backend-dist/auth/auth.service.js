"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcrypt"));
const users_repository_1 = require("../users/users.repository");
const shared_1 = require("@pos-checkout/shared");
const tenants_repository_1 = require("../tenants/tenants.repository");
let AuthService = class AuthService {
    constructor(usersRepository, tenantsRepository, jwtService, configService) {
        this.usersRepository = usersRepository;
        this.tenantsRepository = tenantsRepository;
        this.jwtService = jwtService;
        this.configService = configService;
        this.userCache = new Map();
    }
    async getTenantUsers(tenantId) {
        const CACHE_TTL_MS = 60_000;
        const cached = this.userCache.get(tenantId);
        const now = Date.now();
        if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
            return cached.users;
        }
        const users = await this.usersRepository.findAll(tenantId);
        this.userCache.set(tenantId, { users, fetchedAt: now });
        return users;
    }
    async validateUser(pin, tenantId, deviceId) {
        if (deviceId) {
            try {
                const deviceUser = await this.usersRepository.findByDeviceId(deviceId, tenantId);
                if (deviceUser) {
                    const isValid = await bcrypt.compare(pin, deviceUser.pinHash);
                    if (isValid) {
                        return deviceUser;
                    }
                }
            }
            catch (error) {
                console.warn('[AuthService] Device-based lookup failed, falling back to full scan:', error?.message);
            }
        }
        const users = await this.getTenantUsers(tenantId);
        for (const user of users) {
            try {
                const isValid = await bcrypt.compare(pin, user.pinHash);
                if (isValid) {
                    if (deviceId && user.deviceId !== deviceId) {
                        try {
                            const updated = await this.usersRepository.update(user.id, { deviceId });
                            user.deviceId = updated.deviceId;
                        }
                        catch (error) {
                            console.warn('[AuthService] Failed to save device ID:', error?.message);
                        }
                    }
                    return user;
                }
            }
            catch (error) {
                console.error('[AuthService] Error comparing PIN for user', user.id, error?.message);
            }
        }
        return null;
    }
    async login(loginDto) {
        console.log(`[AuthService] Login attempt with PIN: ${loginDto.pin?.substring(0, 2)}**`);
        const tenant = await this.tenantsRepository.findBySlug(loginDto.tenantSlug);
        if (!tenant) {
            throw new common_1.UnauthorizedException('Invalid tenant');
        }
        if (tenant.status !== shared_1.TenantStatus.ACTIVE) {
            throw new common_1.UnauthorizedException(`Tenant ${tenant.slug} is not active`);
        }
        const user = await this.validateUser(loginDto.pin, tenant.id, loginDto.deviceId);
        if (!user) {
            console.log(`[AuthService] Login failed: Invalid PIN`);
            throw new common_1.UnauthorizedException('Invalid PIN');
        }
        console.log(`[AuthService] Login successful for user: ${user.name}`);
        const payload = {
            sub: user.id,
            role: user.role,
            locationId: user.locationId,
            deviceId: user.deviceId,
            tenantId: user.tenantId,
            isPlatformAdmin: user.isPlatformAdmin,
        };
        const accessToken = this.jwtService.sign(payload, {
            expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
        });
        const refreshToken = this.jwtService.sign(payload, {
            expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
            secret: this.configService.get('JWT_REFRESH_SECRET'),
        });
        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                locationId: user.locationId || undefined,
                tenantId: user.tenantId,
                isPlatformAdmin: user.isPlatformAdmin,
            },
            tenant: {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                plan: tenant.plan,
                status: tenant.status,
                seatLimit: tenant.seatLimit,
                contactEmail: tenant.contactEmail,
                billingCycleStart: tenant.billingCycleStart?.toISOString(),
                billingCycleEnd: tenant.billingCycleEnd?.toISOString(),
            },
        };
    }
    async loginSuperAdmin(dto) {
        const email = dto.email.trim().toLowerCase();
        const user = await this.usersRepository.findByEmail(email);
        if (!user || !user.isPlatformAdmin) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isValid = await bcrypt.compare(dto.password, user.pinHash);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const tenant = await this.tenantsRepository.findById(user.tenantId);
        if (!tenant) {
            throw new common_1.UnauthorizedException('Tenant not found');
        }
        if (tenant.status !== shared_1.TenantStatus.ACTIVE) {
            throw new common_1.UnauthorizedException(`Tenant ${tenant.slug} is not active`);
        }
        const payload = {
            sub: user.id,
            role: user.role,
            locationId: user.locationId,
            deviceId: user.deviceId,
            tenantId: user.tenantId,
            isPlatformAdmin: user.isPlatformAdmin,
        };
        const accessToken = this.jwtService.sign(payload, {
            expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
        });
        const refreshToken = this.jwtService.sign(payload, {
            expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
            secret: this.configService.get('JWT_REFRESH_SECRET'),
        });
        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                locationId: user.locationId || undefined,
                tenantId: user.tenantId,
                isPlatformAdmin: user.isPlatformAdmin,
            },
            tenant: {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                plan: tenant.plan,
                status: tenant.status,
                seatLimit: tenant.seatLimit,
                contactEmail: tenant.contactEmail,
                billingCycleStart: tenant.billingCycleStart?.toISOString(),
                billingCycleEnd: tenant.billingCycleEnd?.toISOString(),
            },
        };
    }
    async registerDevice(dto) {
        const tenant = await this.tenantsRepository.findBySlug(dto.tenantSlug);
        if (!tenant) {
            throw new common_1.NotFoundException('Tenant not found');
        }
        const existingUser = dto.deviceId
            ? await this.usersRepository.findByDeviceId(dto.deviceId, tenant.id)
            : null;
        if (existingUser) {
            await this.usersRepository.update(existingUser.id, {
                publicKey: dto.publicKey,
                locationId: dto.locationId ?? existingUser.locationId,
            });
            return { success: true, message: 'Device updated successfully' };
        }
        const systemUser = await this.usersRepository.findByRole(shared_1.UserRole.ADMIN, tenant.id);
        if (systemUser) {
            await this.usersRepository.update(systemUser.id, {
                deviceId: dto.deviceId,
                publicKey: dto.publicKey,
                locationId: dto.locationId ?? systemUser.locationId,
            });
            return { success: true, message: 'Device registered successfully' };
        }
        return { success: false, message: 'No system user found for device registration' };
    }
    async refreshToken(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            });
            if (!payload.tenantId) {
                throw new common_1.UnauthorizedException('Invalid token payload');
            }
            const user = await this.usersRepository.findById(payload.sub);
            if (!user) {
                throw new common_1.UnauthorizedException('User not found');
            }
            if (user.tenantId !== payload.tenantId) {
                throw new common_1.UnauthorizedException('Tenant mismatch');
            }
            const tenant = await this.tenantsRepository.findById(payload.tenantId);
            if (!tenant) {
                throw new common_1.UnauthorizedException('Tenant no longer exists');
            }
            const newPayload = {
                sub: user.id,
                role: user.role,
                locationId: user.locationId,
                deviceId: user.deviceId,
                tenantId: user.tenantId,
                isPlatformAdmin: user.isPlatformAdmin,
            };
            const accessToken = this.jwtService.sign(newPayload, {
                expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
            });
            const newRefreshToken = this.jwtService.sign(newPayload, {
                expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            });
            return {
                accessToken,
                refreshToken: newRefreshToken,
                user: {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    locationId: user.locationId || undefined,
                    tenantId: user.tenantId,
                    isPlatformAdmin: user.isPlatformAdmin,
                },
                tenant: {
                    id: tenant.id,
                    name: tenant.name,
                    slug: tenant.slug,
                    plan: tenant.plan,
                    status: tenant.status,
                    seatLimit: tenant.seatLimit,
                    contactEmail: tenant.contactEmail,
                    billingCycleStart: tenant.billingCycleStart?.toISOString(),
                    billingCycleEnd: tenant.billingCycleEnd?.toISOString(),
                },
            };
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_repository_1.UsersRepository,
        tenants_repository_1.TenantsRepository,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map