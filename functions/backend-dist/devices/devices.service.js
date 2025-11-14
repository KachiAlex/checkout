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
exports.DevicesService = void 0;
const common_1 = require("@nestjs/common");
const devices_repository_1 = require("./devices.repository");
let DevicesService = class DevicesService {
    constructor(devicesRepository) {
        this.devicesRepository = devicesRepository;
    }
    ensureSameTenant(device, tenantId) {
        if (device.tenantId !== tenantId) {
            throw new common_1.NotFoundException('Device not found in tenant');
        }
    }
    async registerDevice(dto, tenantId, actorId) {
        const normalizedIdentifier = dto.identifier.trim().toLowerCase();
        let device = await this.devicesRepository.findByIdentifier(tenantId, normalizedIdentifier);
        if (!device) {
            device = await this.devicesRepository.create({
                tenantId,
                identifier: normalizedIdentifier,
                name: dto.name,
                type: dto.type,
                hardwareId: dto.hardwareId,
                vendorId: dto.vendorId,
                productId: dto.productId,
                locationId: dto.locationId,
                registeredById: dto.registeredById ?? actorId,
                metadata: dto.metadata,
                isActive: dto.isActive ?? true,
                lastSeenAt: new Date(),
                lastUsedAt: dto.isActive ? new Date() : undefined,
                lastUsedById: actorId,
            });
        }
        else {
            this.ensureSameTenant(device, tenantId);
            device = await this.devicesRepository.update(device.id, {
                tenantId,
                name: dto.name ?? device.name,
                type: dto.type ?? device.type,
                hardwareId: dto.hardwareId ?? device.hardwareId,
                vendorId: dto.vendorId ?? device.vendorId,
                productId: dto.productId ?? device.productId,
                locationId: dto.locationId ?? device.locationId,
                metadata: dto.metadata ?? device.metadata,
                isActive: dto.isActive ?? device.isActive,
                lastSeenAt: new Date(),
                lastUsedAt: dto.isActive ? new Date() : device.lastUsedAt,
                lastUsedById: actorId ?? device.lastUsedById,
            });
        }
        return device;
    }
    async findAll(tenantId, locationId) {
        return this.devicesRepository.findAll(tenantId, locationId);
    }
    async updateDevice(id, tenantId, dto) {
        const device = await this.devicesRepository.findById(id);
        if (!device) {
            throw new common_1.NotFoundException(`Device ${id} not found`);
        }
        this.ensureSameTenant(device, tenantId);
        return this.devicesRepository.update(id, {
            tenantId,
            name: dto.name ?? device.name,
            type: dto.type ?? device.type,
            hardwareId: dto.hardwareId ?? device.hardwareId,
            vendorId: dto.vendorId ?? device.vendorId,
            productId: dto.productId ?? device.productId,
            locationId: dto.locationId ?? device.locationId,
            metadata: dto.metadata ?? device.metadata,
            isActive: dto.isActive ?? device.isActive,
            lastUsedById: dto.lastUsedById ?? device.lastUsedById,
            lastUsedAt: dto.lastUsedById ? new Date() : device.lastUsedAt,
            registeredById: dto.registeredById ?? device.registeredById,
        });
    }
    async recordHeartbeat(id, tenantId, dto, actorId) {
        const device = await this.devicesRepository.findById(id);
        if (!device) {
            throw new common_1.NotFoundException(`Device ${id} not found`);
        }
        this.ensureSameTenant(device, tenantId);
        return this.devicesRepository.update(id, {
            tenantId,
            lastSeenAt: new Date(),
            lastUsedAt: new Date(),
            lastUsedById: dto.userId ?? actorId ?? device.lastUsedById,
            isActive: dto.isActive ?? device.isActive,
        });
    }
};
exports.DevicesService = DevicesService;
exports.DevicesService = DevicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [devices_repository_1.DevicesRepository])
], DevicesService);
//# sourceMappingURL=devices.service.js.map