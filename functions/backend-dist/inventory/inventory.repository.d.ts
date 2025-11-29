import { InventoryTransactionType } from '@pos-checkout/shared';
import { FirestoreService } from '../firestore/firestore.service';
export interface InventoryRecord {
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
}
export interface InventoryTransactionRecord {
    id: string;
    productId: string;
    locationId: string;
    delta: number;
    type: InventoryTransactionType;
    referenceId?: string;
    userId?: string;
    notes?: string;
    reason?: string;
    ts: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare class InventoryRepository {
    private readonly firestore;
    private readonly inventoryCollection;
    private readonly transactionsCollection;
    constructor(firestore: FirestoreService);
    listStock(locationId: string): Promise<InventoryRecord[]>;
    getInventory(productId: string, locationId: string): Promise<InventoryRecord | null>;
    upsertInventory(record: Omit<InventoryRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryRecord>;
    createTransaction(record: Omit<InventoryTransactionRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryTransactionRecord>;
    listTransactions(locationId: string, from?: Date, to?: Date): Promise<InventoryTransactionRecord[]>;
    getLastTransaction(productId: string, locationId: string): Promise<InventoryTransactionRecord | null>;
    getAllInventory(): Promise<InventoryRecord[]>;
    findDuplicates(): Promise<{
        key: string;
        records: InventoryRecord[];
    }[]>;
    removeDuplicates(): Promise<{
        removed: number;
        kept: number;
    }>;
    clearAllInventory(): Promise<number>;
    private toInventoryRecord;
    private toTransactionRecord;
    private timestampToDate;
}
