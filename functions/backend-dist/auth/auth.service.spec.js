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
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const auth_service_1 = require("./auth.service");
const users_repository_1 = require("../users/users.repository");
const tenants_repository_1 = require("../tenants/tenants.repository");
const shared_1 = require("@pos-checkout/shared");
const bcrypt = __importStar(require("bcrypt"));
jest.mock('bcrypt', () => ({
    compare: jest.fn(),
}));
describe('AuthService', () => {
    let service;
    let usersRepository;
    let tenantsRepository;
    let jwtService;
    let configService;
    const mockUser = {
        id: 'user-123',
        name: 'Test User',
        role: 'cashier',
        pinHash: 'hashed-pin',
        tenantId: 'tenant-123',
        isPlatformAdmin: false,
        locationId: 'location-123',
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    const mockTenant = {
        id: 'tenant-123',
        name: 'Acme Retail',
        slug: 'acme',
        plan: shared_1.TenantPlan.MONTHLY,
        status: shared_1.TenantStatus.ACTIVE,
        seatLimit: 10,
        contactEmail: 'billing@acme.com',
        billingCycleStart: new Date(),
        billingCycleEnd: new Date(),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                auth_service_1.AuthService,
                {
                    provide: users_repository_1.UsersRepository,
                    useValue: {
                        findAll: jest.fn(),
                        findByDeviceId: jest.fn(),
                        findByRole: jest.fn(),
                        findById: jest.fn(),
                        update: jest.fn(),
                    },
                },
                {
                    provide: tenants_repository_1.TenantsRepository,
                    useValue: {
                        findBySlug: jest.fn(),
                        findById: jest.fn(),
                    },
                },
                {
                    provide: jwt_1.JwtService,
                    useValue: {
                        sign: jest.fn((payload, options) => `token-${payload.sub}`),
                    },
                },
                {
                    provide: config_1.ConfigService,
                    useValue: {
                        get: jest.fn((key, defaultValue) => {
                            const config = {
                                JWT_EXPIRES_IN: '15m',
                                JWT_REFRESH_EXPIRES_IN: '7d',
                                JWT_REFRESH_SECRET: 'refresh-secret',
                            };
                            return config[key] || defaultValue;
                        }),
                    },
                },
            ],
        }).compile();
        service = module.get(auth_service_1.AuthService);
        usersRepository = module.get(users_repository_1.UsersRepository);
        tenantsRepository = module.get(tenants_repository_1.TenantsRepository);
        jwtService = module.get(jwt_1.JwtService);
        configService = module.get(config_1.ConfigService);
        bcrypt.compare.mockResolvedValue(true);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('login', () => {
        it('should login successfully with valid PIN', async () => {
            tenantsRepository.findBySlug.mockResolvedValue(mockTenant);
            usersRepository.findAll.mockResolvedValue([mockUser]);
            const result = await service.login({ tenantSlug: 'acme', pin: '1234' });
            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result).toHaveProperty('user');
            expect(result.user.id).toBe(mockUser.id);
            expect(result.tenant.slug).toBe('acme');
        });
        it('should throw UnauthorizedException with invalid PIN', async () => {
            tenantsRepository.findBySlug.mockResolvedValue(mockTenant);
            usersRepository.findAll.mockResolvedValue([mockUser]);
            bcrypt.compare.mockResolvedValue(false);
            await expect(service.login({ tenantSlug: 'acme', pin: 'wrong' })).rejects.toThrow('Invalid PIN');
        });
    });
    describe('registerDevice', () => {
        it('should register device successfully', async () => {
            const existingUser = { ...mockUser, deviceId: undefined };
            tenantsRepository.findBySlug.mockResolvedValue(mockTenant);
            usersRepository.findByDeviceId.mockResolvedValue(existingUser);
            usersRepository.update.mockResolvedValue({
                ...existingUser,
                deviceId: 'device-123',
                publicKey: 'public-key',
            });
            const result = await service.registerDevice({
                tenantSlug: 'acme',
                deviceId: 'device-123',
                publicKey: 'public-key',
            });
            expect(result.success).toBe(true);
            expect(usersRepository.update).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=auth.service.spec.js.map