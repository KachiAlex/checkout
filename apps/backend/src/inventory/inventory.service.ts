import { Injectable } from '@nestjs/common';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { InventoryTransactionType } from '@pos-checkout/shared';
import { InventoryRepository, InventoryTransactionRecord } from './inventory.repository';

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
  ) {}

  async getStock(locationId: string) {
    return this.inventoryRepository.listStock(locationId);
  }

  async getStockByProduct(productId: string, locationId: string): Promise<number> {
    const inventory = await this.inventoryRepository.getInventory(productId, locationId);
    return inventory?.quantity ?? 0;
  }

  async adjust(adjustDto: AdjustInventoryDto): Promise<InventoryTransactionRecord> {
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

  async decrementForSale(
    productId: string,
    locationId: string,
    quantity: number,
    orderId: string,
    userId?: string,
  ): Promise<void> {
    await this.adjust({
      productId,
      locationId,
      delta: -quantity,
      type: InventoryTransactionType.SALE,
      referenceId: orderId,
      userId,
    });
  }

  async getTransactions(locationId: string, from?: string, to?: string) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    return this.inventoryRepository.listTransactions(locationId, fromDate, toDate);
  }
}
