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
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const shared_1 = require("@pos-checkout/shared");
const inventory_repository_1 = require("./inventory.repository");
let InventoryService = class InventoryService {
    constructor(inventoryRepository) {
        this.inventoryRepository = inventoryRepository;
    }
    async getStock(locationId) {
        return this.inventoryRepository.listStock(locationId);
    }
    async getStockByProduct(productId, locationId) {
        const inventory = await this.inventoryRepository.getInventory(productId, locationId);
        return inventory?.quantity ?? 0;
    }
    async adjust(adjustDto) {
        const { productId, locationId, delta, type, userId, referenceId, notes } = adjustDto;
        const currentInventory = await this.inventoryRepository.getInventory(productId, locationId);
        const newQuantity = Math.max(0, (currentInventory?.quantity ?? 0) + delta);
        await this.inventoryRepository.upsertInventory({
            productId,
            locationId,
            quantity: newQuantity,
            reorderPoint: currentInventory?.reorderPoint,
            maxStock: currentInventory?.maxStock,
        });
        return this.inventoryRepository.createTransaction({
            productId,
            locationId,
            delta,
            type,
            userId,
            referenceId,
            notes,
            ts: new Date(),
        });
    }
    async decrementForSale(productId, locationId, quantity, orderId, userId) {
        await this.adjust({
            productId,
            locationId,
            delta: -quantity,
            type: shared_1.InventoryTransactionType.SALE,
            referenceId: orderId,
            userId,
        });
    }
    async getTransactions(locationId, from, to) {
        const fromDate = from ? new Date(from) : undefined;
        const toDate = to ? new Date(to) : undefined;
        return this.inventoryRepository.listTransactions(locationId, fromDate, toDate);
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [inventory_repository_1.InventoryRepository])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map