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
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const inventory_service_1 = require("./inventory.service");
const adjust_inventory_dto_1 = require("./dto/adjust-inventory.dto");
const create_inventory_item_dto_1 = require("./dto/create-inventory-item.dto");
const update_inventory_prices_dto_1 = require("./dto/update-inventory-prices.dto");
const update_inventory_item_dto_1 = require("./dto/update-inventory-item.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const locations_repository_1 = require("../locations/locations.repository");
let InventoryController = class InventoryController {
    constructor(inventoryService, locationsRepository) {
        this.inventoryService = inventoryService;
        this.locationsRepository = locationsRepository;
    }
    async getStock(locationId, req) {
        const tenantId = req.user?.tenantId;
        return this.inventoryService.getStock(locationId, tenantId);
    }
    async getBatchInventory(locationId, productId) {
        return this.inventoryService.getBatchInventory(productId, locationId);
    }
    async adjust(adjustDto, req) {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.sub || req.user?.id;
        if (!tenantId || !userId) {
            throw new common_1.BadRequestException('Missing required user information (tenantId or userId)');
        }
        const cleanDto = {
            productId: adjustDto.productId,
            delta: adjustDto.delta,
            type: adjustDto.type,
        };
        if (adjustDto.referenceId != null && adjustDto.referenceId !== undefined && adjustDto.referenceId !== '') {
            const referenceIdStr = String(adjustDto.referenceId).trim();
            if (referenceIdStr !== '' && (0, class_validator_1.isUUID)(referenceIdStr)) {
                cleanDto.referenceId = referenceIdStr;
            }
        }
        if (adjustDto.notes) {
            cleanDto.notes = adjustDto.notes;
        }
        if (adjustDto.reason) {
            cleanDto.reason = adjustDto.reason;
        }
        let locationId = cleanDto.locationId || req.user?.locationId;
        if (!locationId) {
            const locations = await this.locationsRepository.findByTenant(tenantId);
            if (locations.length === 0) {
                throw new common_1.BadRequestException('No locations found for this tenant. Please create a location first.');
            }
            locationId = locations[0].id;
        }
        const adjustedDto = {
            ...cleanDto,
            locationId,
            userId: cleanDto.userId || userId,
        };
        return this.inventoryService.adjust(adjustedDto);
    }
    async getTransactions(locationId, from, to) {
        return this.inventoryService.getTransactions(locationId, from, to);
    }
    async createInventoryItem(createDto, req) {
        const userId = req.user?.sub || req.user?.id;
        const tenantId = req.user?.tenantId;
        let locationId = req.user?.locationId;
        if (!tenantId || !userId) {
            throw new common_1.BadRequestException('Missing required user information (tenantId or userId)');
        }
        if (!locationId) {
            const locations = await this.locationsRepository.findByTenant(tenantId);
            if (locations.length === 0) {
                throw new common_1.BadRequestException('No locations found for this tenant. Please create a location first.');
            }
            locationId = locations[0].id;
        }
        return this.inventoryService.createInventoryItem(createDto, locationId, tenantId, userId);
    }
    async findDuplicates() {
        return this.inventoryService.findDuplicates();
    }
    async removeDuplicates() {
        return this.inventoryService.removeDuplicates();
    }
    async clearAllInventory() {
        const count = await this.inventoryService.clearAllInventory();
        return { message: `Cleared ${count} inventory records`, count };
    }
    async updateInventoryPrices(updateDto, req) {
        const tenantId = req.user?.tenantId;
        let locationId = updateDto.locationId || req.user?.locationId;
        if (!locationId) {
            const locations = await this.locationsRepository.findByTenant(tenantId);
            if (locations.length === 0) {
                throw new common_1.BadRequestException('No locations found for this tenant. Please create a location first.');
            }
            locationId = locations[0].id;
        }
        return this.inventoryService.updateInventoryPrices(updateDto.productId, locationId, updateDto.costCents, updateDto.salesPriceCents);
    }
    async updateInventoryItem(updateDto, req) {
        const tenantId = req.user?.tenantId;
        let locationId = updateDto.locationId || req.user?.locationId;
        if (!locationId) {
            const locations = await this.locationsRepository.findByTenant(tenantId);
            if (locations.length === 0) {
                throw new common_1.BadRequestException('No locations found for this tenant. Please create a location first.');
            }
            locationId = locations[0].id;
        }
        return this.inventoryService.updateInventoryItem(updateDto.productId, locationId, updateDto.quantity, updateDto.reorderPoint, updateDto.costCents, updateDto.salesPriceCents);
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Get)(':location_id/stock'),
    (0, swagger_1.ApiOperation)({ summary: 'Get inventory stock for a location' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Inventory stock list' }),
    __param(0, (0, common_1.Param)('location_id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getStock", null);
__decorate([
    (0, common_1.Get)(':location_id/batch/:product_id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get batch inventory for a product' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Batch inventory list' }),
    __param(0, (0, common_1.Param)('location_id')),
    __param(1, (0, common_1.Param)('product_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getBatchInventory", null);
__decorate([
    (0, common_1.Post)('adjust'),
    (0, swagger_1.ApiOperation)({ summary: 'Adjust inventory quantity' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Inventory adjusted' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [adjust_inventory_dto_1.AdjustInventoryDto, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "adjust", null);
__decorate([
    (0, common_1.Get)(':location_id/transactions'),
    (0, swagger_1.ApiOperation)({ summary: 'Get inventory transactions for a location' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Inventory transactions list' }),
    __param(0, (0, common_1.Param)('location_id')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getTransactions", null);
__decorate([
    (0, common_1.Post)('create-item'),
    (0, swagger_1.ApiOperation)({ summary: 'Create product and inventory in one operation' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Product and inventory created' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_inventory_item_dto_1.CreateInventoryItemDto, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "createInventoryItem", null);
__decorate([
    (0, common_1.Get)('duplicates'),
    (0, swagger_1.ApiOperation)({ summary: 'Find duplicate inventory entries' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of duplicate inventory entries' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "findDuplicates", null);
__decorate([
    (0, common_1.Post)('remove-duplicates'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove duplicate inventory entries (keeps the oldest one)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Duplicates removed' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "removeDuplicates", null);
__decorate([
    (0, common_1.Delete)('clear-all'),
    (0, swagger_1.ApiOperation)({ summary: 'Clear all inventory (CAUTION: This deletes all inventory records)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'All inventory cleared' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "clearAllInventory", null);
__decorate([
    (0, common_1.Put)('prices'),
    (0, swagger_1.ApiOperation)({ summary: 'Update inventory cost and sales prices' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Inventory prices updated' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_inventory_prices_dto_1.UpdateInventoryPricesDto, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "updateInventoryPrices", null);
__decorate([
    (0, common_1.Put)('item'),
    (0, swagger_1.ApiOperation)({ summary: 'Update inventory item (quantity, reorder point, cost and sales prices)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Inventory item updated' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_inventory_item_dto_1.UpdateInventoryItemDto, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "updateInventoryItem", null);
exports.InventoryController = InventoryController = __decorate([
    (0, swagger_1.ApiTags)('inventory'),
    (0, common_1.Controller)('inventory'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService,
        locations_repository_1.LocationsRepository])
], InventoryController);
//# sourceMappingURL=inventory.controller.js.map