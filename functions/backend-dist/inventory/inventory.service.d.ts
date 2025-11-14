import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { InventoryRepository, InventoryTransactionRecord } from './inventory.repository';
export declare class InventoryService {
    private readonly inventoryRepository;
    constructor(inventoryRepository: InventoryRepository);
    getStock(locationId: string): Promise<import("./inventory.repository").InventoryRecord[]>;
    getStockByProduct(productId: string, locationId: string): Promise<number>;
    adjust(adjustDto: AdjustInventoryDto): Promise<InventoryTransactionRecord>;
    decrementForSale(productId: string, locationId: string, quantity: number, orderId: string, userId?: string): Promise<void>;
    getTransactions(locationId: string, from?: string, to?: string): Promise<InventoryTransactionRecord[]>;
}
