import { InventoryService } from './inventory.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryPricesDto } from './dto/update-inventory-prices.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { LocationsRepository } from '../locations/locations.repository';
export declare class InventoryController {
    private readonly inventoryService;
    private readonly locationsRepository;
    constructor(inventoryService: InventoryService, locationsRepository: LocationsRepository);
    getStock(locationId: string, req: any): Promise<({
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
            type: import("@pos-checkout/shared").InventoryTransactionType;
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
    getBatchInventory(locationId: string, productId: string): Promise<import("./batch-inventory.repository").BatchInventoryRecord[]>;
    adjust(adjustDto: AdjustInventoryDto, req: any): Promise<import("./inventory.repository").InventoryTransactionRecord>;
    getTransactions(locationId: string, from?: string, to?: string): Promise<import("./inventory.repository").InventoryTransactionRecord[]>;
    createInventoryItem(createDto: CreateInventoryItemDto, req: any): Promise<{
        product: import("../products/products.repository").ProductRecord;
        inventory: import("./inventory.repository").InventoryRecord;
        transaction: import("./inventory.repository").InventoryTransactionRecord;
    }>;
    findDuplicates(): Promise<{
        key: string;
        records: import("./inventory.repository").InventoryRecord[];
    }[]>;
    removeDuplicates(): Promise<{
        removed: number;
        kept: number;
    }>;
    clearAllInventory(): Promise<{
        message: string;
        count: number;
    }>;
    updateInventoryPrices(updateDto: UpdateInventoryPricesDto, req: any): Promise<import("./inventory.repository").InventoryRecord>;
    updateInventoryItem(updateDto: UpdateInventoryItemDto, req: any): Promise<import("./inventory.repository").InventoryRecord>;
}
