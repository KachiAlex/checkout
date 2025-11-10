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
exports.DevicesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const devices_service_1 = require("./devices.service");
const register_device_dto_1 = require("./dto/register-device.dto");
const update_device_dto_1 = require("./dto/update-device.dto");
const device_heartbeat_dto_1 = require("./dto/device-heartbeat.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let DevicesController = class DevicesController {
    constructor(devicesService) {
        this.devicesService = devicesService;
    }
    async register(dto, req) {
        return this.devicesService.registerDevice(dto, req.user?.tenantId, req.user?.id);
    }
    async findAll(req, locationId) {
        return this.devicesService.findAll(req.user?.tenantId, locationId);
    }
    async update(id, dto, req) {
        return this.devicesService.updateDevice(id, req.user?.tenantId, dto);
    }
    async heartbeat(id, dto, req) {
        return this.devicesService.recordHeartbeat(id, req.user?.tenantId, dto, req.user?.id);
    }
};
exports.DevicesController = DevicesController;
__decorate([
    (0, common_1.Post)('register'),
    (0, swagger_1.ApiOperation)({ summary: 'Register or update a scanner device' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Device registered' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_device_dto_1.RegisterDeviceDto, Object]),
    __metadata("design:returntype", Promise)
], DevicesController.prototype, "register", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List registered devices' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('location_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DevicesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a device record' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_device_dto_1.UpdateDeviceDto, Object]),
    __metadata("design:returntype", Promise)
], DevicesController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/heartbeat'),
    (0, swagger_1.ApiOperation)({ summary: 'Record device usage heartbeat' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, device_heartbeat_dto_1.DeviceHeartbeatDto, Object]),
    __metadata("design:returntype", Promise)
], DevicesController.prototype, "heartbeat", null);
exports.DevicesController = DevicesController = __decorate([
    (0, swagger_1.ApiTags)('devices'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('devices'),
    __metadata("design:paramtypes", [devices_service_1.DevicesService])
], DevicesController);
//# sourceMappingURL=devices.controller.js.map