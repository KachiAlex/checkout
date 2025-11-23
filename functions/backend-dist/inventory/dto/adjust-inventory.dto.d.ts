import { InventoryTransactionType } from '@pos-checkout/shared';
export declare class AdjustInventoryDto {
    productId: string;
    locationId: string;
    delta: number;
    type: InventoryTransactionType;
    userId?: string;
    referenceId?: string;
    notes?: string;
    reason?: string;
}
