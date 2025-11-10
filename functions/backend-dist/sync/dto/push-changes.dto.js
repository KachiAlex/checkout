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
exports.PushChangesDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class SyncEventDto {
}
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Client-generated event ID (UUID)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SyncEventDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Event type', example: 'order.created' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SyncEventDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Event payload' }),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], SyncEventDto.prototype, "payload", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Client timestamp (Unix milliseconds)' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SyncEventDto.prototype, "client_ts", void 0);
class PushChangesDto {
}
exports.PushChangesDto = PushChangesDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Device ID' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PushChangesDto.prototype, "deviceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Array of events', type: [SyncEventDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SyncEventDto),
    __metadata("design:type", Array)
], PushChangesDto.prototype, "events", void 0);
//# sourceMappingURL=push-changes.dto.js.map