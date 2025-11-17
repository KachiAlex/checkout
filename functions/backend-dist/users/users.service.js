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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const users_repository_1 = require("./users.repository");
const shared_1 = require("@pos-checkout/shared");
const hashPin = (pin) => bcrypt.hash(pin, 10);
const generatePin = () => Math.floor(Math.random() * 900000 + 100000).toString();
let UsersService = class UsersService {
    constructor(usersRepository) {
        this.usersRepository = usersRepository;
    }
    ensureTenant(user, tenantId) {
        if (!user || user.tenantId !== tenantId) {
            throw new common_1.NotFoundException('User not found');
        }
    }
    toSafeUser(user) {
        const { pinHash, ...rest } = user;
        return rest;
    }
    async changePin(userId, dto) {
        const user = await this.usersRepository.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const isValid = await bcrypt.compare(dto.currentPin, user.pinHash);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Current PIN is incorrect');
        }
        const newHash = await hashPin(dto.newPin);
        await this.usersRepository.update(userId, {
            pinHash: newHash,
        });
    }
    async listUsers(tenantId) {
        const users = await this.usersRepository.findAll(tenantId);
        return users.map((user) => this.toSafeUser(user));
    }
    async createUser(tenantId, dto, actor) {
        if (dto.isPlatformAdmin && !actor.isPlatformAdmin) {
            throw new common_1.ForbiddenException('Only platform admins can grant platform permissions');
        }
        if (actor.role !== shared_1.UserRole.ADMIN && !actor.isPlatformAdmin) {
            throw new common_1.ForbiddenException('Only tenant administrators can create users');
        }
        const assignedPin = dto.pin ?? generatePin();
        const pinHash = await hashPin(assignedPin);
        const user = await this.usersRepository.save({
            name: dto.name.trim(),
            email: dto.email.toLowerCase(),
            role: dto.role,
            pinHash,
            tenantId,
            locationId: dto.locationId,
            deviceId: undefined,
            isPlatformAdmin: dto.isPlatformAdmin ?? false,
        });
        return {
            user: this.toSafeUser(user),
            temporaryPin: dto.pin ? undefined : assignedPin,
        };
    }
    async updateUser(tenantId, userId, dto, actor) {
        const user = await this.usersRepository.findById(userId);
        this.ensureTenant(user, tenantId);
        const isActorAdmin = actor.role === shared_1.UserRole.ADMIN || actor.isPlatformAdmin;
        if (!isActorAdmin && actor.id !== userId) {
            throw new common_1.ForbiddenException('Only administrators can update other users');
        }
        if (dto.isPlatformAdmin !== undefined && !actor.isPlatformAdmin) {
            throw new common_1.ForbiddenException('Only platform admins can modify platform permissions');
        }
        const update = {};
        if (dto.name !== undefined)
            update.name = dto.name.trim();
        if (dto.email !== undefined)
            update.email = dto.email.toLowerCase();
        if (dto.role !== undefined)
            update.role = dto.role;
        if (dto.locationId !== undefined)
            update.locationId = dto.locationId;
        if (dto.isPlatformAdmin !== undefined)
            update.isPlatformAdmin = dto.isPlatformAdmin;
        if (dto.pin !== undefined) {
            update.pinHash = await hashPin(dto.pin);
        }
        const updated = await this.usersRepository.update(userId, update);
        return this.toSafeUser(updated);
    }
    async deleteUser(tenantId, userId, actor) {
        const isActorAdmin = actor.role === shared_1.UserRole.ADMIN || actor.isPlatformAdmin;
        if (!isActorAdmin) {
            throw new common_1.ForbiddenException('Only administrators can delete users');
        }
        if (actor.id === userId) {
            throw new common_1.ForbiddenException('You cannot delete your own user');
        }
        const user = await this.usersRepository.findById(userId);
        this.ensureTenant(user, tenantId);
        await this.usersRepository.delete(userId);
    }
    async resetPin(tenantId, userId, newPin, actor) {
        if (actor.role !== shared_1.UserRole.ADMIN && !actor.isPlatformAdmin) {
            throw new common_1.ForbiddenException('Only admins can reset PINs');
        }
        const user = await this.usersRepository.findById(userId);
        this.ensureTenant(user, tenantId);
        const pinHash = await hashPin(newPin);
        await this.usersRepository.update(userId, { pinHash });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_repository_1.UsersRepository])
], UsersService);
//# sourceMappingURL=users.service.js.map