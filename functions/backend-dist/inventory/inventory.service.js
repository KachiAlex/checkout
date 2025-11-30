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
const products_service_1 = require("../products/products.service");
const categories_service_1 = require("../categories/categories.service");
const brands_service_1 = require("../brands/brands.service");
const batch_inventory_repository_1 = require("./batch-inventory.repository");
const users_repository_1 = require("../users/users.repository");
let InventoryService = class InventoryService {
    constructor(inventoryRepository, productsService, categoriesService, brandsService, batchInventoryRepository, usersRepository) {
        this.inventoryRepository = inventoryRepository;
        this.productsService = productsService;
        this.categoriesService = categoriesService;
        this.brandsService = brandsService;
        this.batchInventoryRepository = batchInventoryRepository;
        this.usersRepository = usersRepository;
    }
    async getStock(locationId, tenantId) {
        const inventoryRecords = await this.inventoryRepository.listStock(locationId);
        const enrichedRecords = await Promise.all(inventoryRecords.map(async (record) => {
            try {
                const product = tenantId
                    ? await this.productsService.findOne(record.productId, tenantId)
                    : null;
                if (!product) {
                    return {
                        ...record,
                        product: null,
                        lastTransaction: null,
                    };
                }
                const lastTransaction = await this.inventoryRepository.getLastTransaction(record.productId, locationId);
                let lastUpdatedBy = null;
                if (lastTransaction?.userId && tenantId) {
                    try {
                        const user = await this.usersRepository.findById(lastTransaction.userId);
                        if (user) {
                            lastUpdatedBy = {
                                id: user.id,
                                name: user.name,
                            };
                        }
                    }
                    catch (error) {
                        console.error(`Failed to fetch user ${lastTransaction.userId}:`, error);
                    }
                }
                return {
                    ...record,
                    product: {
                        id: product.id,
                        name: product.name,
                        sku: product.sku,
                        barcode: product.barcode,
                        description: product.description,
                        priceCents: product.priceCents,
                    },
                    salesPriceCents: record.salesPriceCents ?? product.priceCents,
                    costCents: record.costCents,
                    lastTransaction: lastTransaction
                        ? {
                            timestamp: lastTransaction.ts,
                            userId: lastTransaction.userId,
                            user: lastUpdatedBy,
                            type: lastTransaction.type,
                        }
                        : null,
                };
            }
            catch (error) {
                console.error(`Failed to fetch product ${record.productId}:`, error);
                return {
                    ...record,
                    product: null,
                    lastTransaction: null,
                };
            }
        }));
        const recordsWithFallback = enrichedRecords.map((record) => {
            const isProductMissing = !record.product;
            return {
                ...record,
                product: record.product ?? {
                    id: record.productId,
                    name: 'Unknown product',
                    sku: '—',
                    barcode: undefined,
                },
                isProductMissing,
            };
        });
        return recordsWithFallback;
    }
    async getBatchInventory(productId, locationId) {
        return this.batchInventoryRepository.findByProduct(productId, locationId);
    }
    async getStockByProduct(productId, locationId) {
        const inventory = await this.inventoryRepository.getInventory(productId, locationId);
        return inventory?.quantity ?? 0;
    }
    async getInventoryRecord(productId, locationId) {
        return this.inventoryRepository.getInventory(productId, locationId);
    }
    async adjust(adjustDto) {
        const { productId, locationId, delta, type, userId, referenceId, notes, reason } = adjustDto;
        const currentInventory = await this.inventoryRepository.getInventory(productId, locationId);
        const newQuantity = Math.max(0, (currentInventory?.quantity ?? 0) + delta);
        await this.inventoryRepository.upsertInventory({
            productId,
            locationId,
            quantity: newQuantity,
            reorderPoint: currentInventory?.reorderPoint,
            maxStock: currentInventory?.maxStock,
            costCents: currentInventory?.costCents,
            salesPriceCents: currentInventory?.salesPriceCents,
        });
        return this.inventoryRepository.createTransaction({
            productId,
            locationId,
            delta,
            type,
            userId,
            referenceId,
            notes,
            reason,
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
    async incrementForReturn(productId, locationId, quantity, returnId, userId) {
        await this.adjust({
            productId,
            locationId,
            delta: quantity,
            type: shared_1.InventoryTransactionType.RETURN,
            referenceId: returnId,
            userId,
            notes: `Returned from order`,
        });
    }
    async getTransactions(locationId, from, to) {
        const fromDate = from ? new Date(from) : undefined;
        const toDate = to ? new Date(to) : undefined;
        return this.inventoryRepository.listTransactions(locationId, fromDate, toDate);
    }
    async createInventoryItem(createDto, locationId, tenantId, userId) {
        const sku = createDto.sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        let categoryId = createDto.categoryId;
        if (!categoryId && createDto.categoryName) {
            const category = await this.categoriesService.findOrCreateByName(createDto.categoryName, tenantId);
            categoryId = category.id;
        }
        let brandId = createDto.brandId;
        if (!brandId && createDto.brandName) {
            const brand = await this.brandsService.findOrCreateByName(createDto.brandName, tenantId);
            brandId = brand.id;
        }
        const product = await this.productsService.create({
            sku,
            name: createDto.name,
            description: createDto.description,
            barcode: createDto.barcode,
            categoryId,
            brandId,
            priceCents: createDto.priceCents,
            costCents: createDto.costCents,
            taxRate: createDto.taxRate ?? 0.075,
            active: true,
        }, tenantId);
        await this.inventoryRepository.upsertInventory({
            productId: product.id,
            locationId,
            quantity: createDto.quantity,
            costCents: createDto.costCents,
            salesPriceCents: createDto.priceCents,
        });
        const transaction = await this.inventoryRepository.createTransaction({
            productId: product.id,
            locationId,
            delta: createDto.quantity,
            type: shared_1.InventoryTransactionType.RECEIVED,
            userId,
            notes: `Initial inventory entry - ${createDto.quantity} units`,
            ts: new Date(),
        });
        return {
            product,
            inventory: await this.inventoryRepository.getInventory(product.id, locationId),
            transaction,
        };
    }
    async findDuplicates() {
        return this.inventoryRepository.findDuplicates();
    }
    async removeDuplicates() {
        return this.inventoryRepository.removeDuplicates();
    }
    async clearAllInventory() {
        return this.inventoryRepository.clearAllInventory();
    }
    async updateInventoryPrices(productId, locationId, costCents, salesPriceCents) {
        const currentInventory = await this.inventoryRepository.getInventory(productId, locationId);
        if (!currentInventory) {
            throw new common_1.NotFoundException(`Inventory not found for product ${productId} at location ${locationId}`);
        }
        return this.inventoryRepository.upsertInventory({
            productId,
            locationId,
            quantity: currentInventory.quantity,
            reorderPoint: currentInventory.reorderPoint,
            maxStock: currentInventory.maxStock,
            costCents: costCents !== undefined ? costCents : currentInventory.costCents,
            salesPriceCents: salesPriceCents !== undefined ? salesPriceCents : currentInventory.salesPriceCents,
        });
    }
    async updateInventoryItem(productId, locationId, quantity, reorderPoint, costCents, salesPriceCents) {
        const currentInventory = await this.inventoryRepository.getInventory(productId, locationId);
        if (!currentInventory) {
            throw new common_1.NotFoundException(`Inventory not found for product ${productId} at location ${locationId}`);
        }
        const quantityDelta = quantity !== undefined ? quantity - currentInventory.quantity : 0;
        const updated = await this.inventoryRepository.upsertInventory({
            productId,
            locationId,
            quantity: quantity !== undefined ? quantity : currentInventory.quantity,
            reorderPoint: reorderPoint !== undefined ? reorderPoint : currentInventory.reorderPoint,
            maxStock: currentInventory.maxStock,
            costCents: costCents !== undefined ? costCents : currentInventory.costCents,
            salesPriceCents: salesPriceCents !== undefined ? salesPriceCents : currentInventory.salesPriceCents,
        });
        if (quantityDelta !== 0) {
            await this.inventoryRepository.createTransaction({
                productId,
                locationId,
                delta: quantityDelta,
                type: shared_1.InventoryTransactionType.ADJUST,
                notes: `Inventory item updated via edit`,
                ts: new Date(),
            });
        }
        return updated;
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [inventory_repository_1.InventoryRepository,
        products_service_1.ProductsService,
        categories_service_1.CategoriesService,
        brands_service_1.BrandsService,
        batch_inventory_repository_1.BatchInventoryRepository,
        users_repository_1.UsersRepository])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map