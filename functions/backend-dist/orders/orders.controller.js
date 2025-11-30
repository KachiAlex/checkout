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
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const orders_service_1 = require("./orders.service");
const create_order_dto_1 = require("./dto/create-order.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let OrdersController = class OrdersController {
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    async create(createOrderDto, req) {
        return this.ordersService.create(createOrderDto, req.user.sub, req.user.tenantId, req.user.locationId);
    }
    async findOne(id, req) {
        const order = await this.ordersService.findOne(id);
        const hasAccess = await this.ordersService.verifyTenantAccess(order, req.user.tenantId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Access denied to this order');
        }
        return order;
    }
    async update(id, updateDto, req) {
        const order = await this.ordersService.findOne(id);
        const hasAccess = await this.ordersService.verifyTenantAccess(order, req.user.tenantId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Access denied to this order');
        }
        return this.ordersService.update(id, updateDto);
    }
    async findAll(req, locationId, from, to, status) {
        if (locationId) {
            await this.ordersService.verifyLocationAccess(locationId, req.user.tenantId);
        }
        return this.ordersService.findAll(locationId, from, to, status, req.user.tenantId);
    }
    async findHeldOrders(req, locationId) {
        if (locationId) {
            await this.ordersService.verifyLocationAccess(locationId, req.user.tenantId);
        }
        return this.ordersService.findHeldOrders(locationId, req.user.tenantId);
    }
    async holdOrder(id, req) {
        const order = await this.ordersService.findOne(id);
        const hasAccess = await this.ordersService.verifyTenantAccess(order, req.user.tenantId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Access denied to this order');
        }
        return this.ordersService.holdOrder(id);
    }
    async recallOrder(id, req) {
        const order = await this.ordersService.findOne(id);
        const hasAccess = await this.ordersService.verifyTenantAccess(order, req.user.tenantId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Access denied to this order');
        }
        return this.ordersService.recallOrder(id);
    }
    async completeHeldOrder(id, req) {
        return this.ordersService.completeHeldOrder(id, req.user.tenantId);
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new order (idempotent)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Order created' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Insufficient inventory' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_order_dto_1.CreateOrderDto, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get order by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Order found' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Order not found' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update order status' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Order updated' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "update", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all orders (sales)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of orders' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('location_id')),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __param(4, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('held'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all held/suspended orders' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of held orders' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('location_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findHeldOrders", null);
__decorate([
    (0, common_1.Post)(':id/hold'),
    (0, swagger_1.ApiOperation)({ summary: 'Hold/suspend an order' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Order held' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "holdOrder", null);
__decorate([
    (0, common_1.Post)(':id/recall'),
    (0, swagger_1.ApiOperation)({ summary: 'Recall a held order' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Order recalled' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "recallOrder", null);
__decorate([
    (0, common_1.Post)(':id/complete-held'),
    (0, swagger_1.ApiOperation)({ summary: 'Complete a held order (decrements inventory)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Held order completed' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "completeHeldOrder", null);
exports.OrdersController = OrdersController = __decorate([
    (0, swagger_1.ApiTags)('orders'),
    (0, common_1.Controller)('orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map