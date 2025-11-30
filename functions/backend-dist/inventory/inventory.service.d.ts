import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { InventoryTransactionType } from '@pos-checkout/shared';
import { InventoryRepository, InventoryTransactionRecord } from './inventory.repository';
import { ProductsService } from '../products/products.service';
import { CategoriesService } from '../categories/categories.service';
import { BrandsService } from '../brands/brands.service';
import { BatchInventoryRepository } from './batch-inventory.repository';
import { UsersRepository } from '../users/users.repository';
export declare class InventoryService {
    private readonly inventoryRepository;
    private readonly productsService;
    private readonly categoriesService;
    private readonly brandsService;
    private readonly batchInventoryRepository;
    private readonly usersRepository;
    constructor(inventoryRepository: InventoryRepository, productsService: ProductsService, categoriesService: CategoriesService, brandsService: BrandsService, batchInventoryRepository: BatchInventoryRepository, usersRepository: UsersRepository);
    getStock(locationId: string, tenantId?: string): Promise<({
        product: any;
        isProductMissing: boolean;
        lastTransaction: any;
        id: string;
        productId: string;
        locationId: string;
        quantity: number;
        reorderPoint?: number;
        maxStock?: number;
        costCents?: number;
        salesPriceCents?: number;
        createdAt: Date;
        updatedAt: Date;
    } | {
        product: any;
        isProductMissing: boolean;
        salesPriceCents: number;
        costCents: number;
        lastTransaction: {
            timestamp: Date;
            userId: string;
            user: any;
            type: InventoryTransactionType;
        };
        id: string;
        productId: string;
        locationId: string;
        quantity: number;
        reorderPoint?: number;
        maxStock?: number;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    getBatchInventory(productId: string, locationId: string): Promise<import("./batch-inventory.repository").BatchInventoryRecord[]>;
    getStockByProduct(productId: string, locationId: string): Promise<number>;
    getInventoryRecord(productId: string, locationId: string): Promise<import("./inventory.repository").InventoryRecord>;
    adjust(adjustDto: AdjustInventoryDto): Promise<InventoryTransactionRecord>;
    decrementForSale(productId: string, locationId: string, quantity: number, orderId: string, userId?: string): Promise<void>;
    incrementForReturn(productId: string, locationId: string, quantity: number, returnId: string, userId?: string): Promise<void>;
    getTransactions(locationId: string, from?: string, to?: string): Promise<InventoryTransactionRecord[]>;
    createInventoryItem(createDto: CreateInventoryItemDto, locationId: string, tenantId: string, userId: string): Promise<{
        product: import("../products/products.repository").ProductRecord;
        inventory: import("./inventory.repository").InventoryRecord;
        transaction: InventoryTransactionRecord;
    }>;
    findDuplicates(): Promise<{
        key: string;
        records: import("./inventory.repository").InventoryRecord[];
    }[]>;
    removeDuplicates(): Promise<{
        removed: number;
        kept: number;
    }>;
    clearAllInventory(): Promise<number>;
    updateInventoryPrices(productId: string, locationId: string, costCents?: number, salesPriceCents?: number): Promise<import("./inventory.repository").InventoryRecord>;
    updateInventoryItem(productId: string, locationId: string, quantity?: number, reorderPoint?: number, costCents?: number, salesPriceCents?: number): Promise<import("./inventory.repository").InventoryRecord>;
}
