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
exports.TenantsService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const tenants_repository_1 = require("./tenants.repository");
const users_repository_1 = require("../users/users.repository");
const shared_1 = require("@pos-checkout/shared");
const normalizeSlug = (value) => value.trim().toLowerCase();
const generateDefaultPin = () => Math.floor(Math.random() * 900000 + 100000).toString();
let TenantsService = class TenantsService {
    constructor(tenantsRepository, usersRepository) {
        this.tenantsRepository = tenantsRepository;
        this.usersRepository = usersRepository;
    }
    async create(dto) {
        const slug = normalizeSlug(dto.slug);
        const existing = await this.tenantsRepository.findBySlug(slug);
        if (existing) {
            throw new common_1.BadRequestException('Tenant slug already in use');
        }
        const billingCycleStart = dto.billingCycleStart ? new Date(dto.billingCycleStart) : undefined;
        const shouldApplyBillingEnd = dto.plan !== shared_1.TenantPlan.LIFETIME;
        const billingCycleEnd = dto.billingCycleEnd && shouldApplyBillingEnd ? new Date(dto.billingCycleEnd) : undefined;
        const tenant = await this.tenantsRepository.create({
            name: dto.name.trim(),
            slug,
            plan: dto.plan,
            status: shared_1.TenantStatus.PENDING,
            seatLimit: dto.seatLimit,
            contactEmail: dto.adminEmail.toLowerCase(),
            billingCycleStart,
            billingCycleEnd,
            metadata: {},
        });
        const temporaryPin = generateDefaultPin();
        const pinHash = await bcrypt.hash(temporaryPin, 10);
        const adminUser = await this.usersRepository.save({
            name: dto.adminName?.trim() || `${dto.name.trim()} Admin`,
            email: dto.adminEmail.toLowerCase(),
            role: shared_1.UserRole.ADMIN,
            pinHash,
            tenantId: tenant.id,
            isPlatformAdmin: false,
        });
        return {
            tenant,
            admin: {
                id: adminUser.id,
                email: adminUser.email ?? dto.adminEmail.toLowerCase(),
                temporaryPin,
            },
        };
    }
    async findAll() {
        return this.tenantsRepository.findAll();
    }
    async findById(id) {
        const tenant = await this.tenantsRepository.findById(id);
        if (!tenant) {
            throw new common_1.NotFoundException('Tenant not found');
        }
        return tenant;
    }
    async findBySlug(slug) {
        const tenant = await this.tenantsRepository.findBySlug(normalizeSlug(slug));
        if (!tenant) {
            throw new common_1.NotFoundException('Tenant not found');
        }
        return tenant;
    }
    async update(id, dto) {
        const updatePayload = {};
        if (dto.slug) {
            const slug = normalizeSlug(dto.slug);
            const existing = await this.tenantsRepository.findBySlug(slug);
            if (existing && existing.id !== id) {
                throw new common_1.BadRequestException('Another tenant already uses this slug');
            }
            updatePayload.slug = slug;
        }
        if (dto.name) {
            updatePayload.name = dto.name.trim();
        }
        if (dto.adminEmail) {
            updatePayload.contactEmail = dto.adminEmail.toLowerCase();
        }
        if (dto.plan) {
            updatePayload.plan = dto.plan;
        }
        if (dto.status) {
            updatePayload.status = dto.status;
        }
        if (dto.seatLimit !== undefined) {
            updatePayload.seatLimit = dto.seatLimit;
        }
        if (dto.billingCycleStart !== undefined) {
            updatePayload.billingCycleStart = dto.billingCycleStart ? new Date(dto.billingCycleStart) : undefined;
        }
        if (dto.billingCycleEnd !== undefined) {
            updatePayload.billingCycleEnd = dto.billingCycleEnd ? new Date(dto.billingCycleEnd) : undefined;
        }
        return this.tenantsRepository.update(id, updatePayload);
    }
};
exports.TenantsService = TenantsService;
exports.TenantsService = TenantsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenants_repository_1.TenantsRepository,
        users_repository_1.UsersRepository])
], TenantsService);
//# sourceMappingURL=tenants.service.js.map