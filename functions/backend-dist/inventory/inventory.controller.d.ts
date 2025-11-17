import { InventoryService } from './inventory.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { LocationsRepository } from '../locations/locations.repository';
export declare class InventoryController {
    private readonly inventoryService;
    private readonly locationsRepository;
    constructor(inventoryService: InventoryService, locationsRepository: LocationsRepository);
    getStock(locationId: string): Promise<import("./inventory.repository").InventoryRecord[]>;
    getBatchInventory(locationId: string, productId: string): Promise<import("./batch-inventory.repository").BatchInventoryRecord[]>;
    adjust(adjustDto: AdjustInventoryDto): Promise<import("./inventory.repository").InventoryTransactionRecord>;
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
}
