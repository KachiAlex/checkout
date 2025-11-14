import { InventoryService } from './inventory.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    getStock(locationId: string): Promise<import("./inventory.repository").InventoryRecord[]>;
    adjust(adjustDto: AdjustInventoryDto): Promise<import("./inventory.repository").InventoryTransactionRecord>;
    getTransactions(locationId: string, from?: string, to?: string): Promise<import("./inventory.repository").InventoryTransactionRecord[]>;
}
