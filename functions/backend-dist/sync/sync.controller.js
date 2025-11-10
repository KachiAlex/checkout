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
exports.SyncController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const sync_service_1 = require("./sync.service");
const push_changes_dto_1 = require("./dto/push-changes.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let SyncController = class SyncController {
    constructor(syncService) {
        this.syncService = syncService;
    }
    async pushChanges(dto) {
        return this.syncService.pushChanges(dto);
    }
    async pullChanges(deviceId, since) {
        return this.syncService.pullChanges(deviceId, since);
    }
};
exports.SyncController = SyncController;
__decorate([
    (0, common_1.Post)('push-changes'),
    (0, swagger_1.ApiOperation)({ summary: 'Push offline events from device (idempotent)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Events processed' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [push_changes_dto_1.PushChangesDto]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "pushChanges", null);
__decorate([
    (0, common_1.Get)('pull-changes'),
    (0, swagger_1.ApiOperation)({ summary: 'Pull changes from server since last sync' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Changes list' }),
    __param(0, (0, common_1.Query)('device_id')),
    __param(1, (0, common_1.Query)('since')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "pullChanges", null);
exports.SyncController = SyncController = __decorate([
    (0, swagger_1.ApiTags)('sync'),
    (0, common_1.Controller)('sync'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [sync_service_1.SyncService])
], SyncController);
//# sourceMappingURL=sync.controller.js.map