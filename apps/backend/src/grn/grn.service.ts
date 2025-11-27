import { Injectable } from '@nestjs/common';
import { GRNRepository, GRNRecord, CreateGRNInput, GRNStatus } from './grn.repository';
import { PurchaseOrdersRepository, PurchaseOrderStatus } from '../purchase-orders/purchase-orders.repository';
import { InventoryRepository } from '../inventory/inventory.repository';
import { BatchInventoryRepository } from '../inventory/batch-inventory.repository';
import { InventoryTransactionType } from '@pos-checkout/shared';
import { Timestamp } from 'firebase-admin/firestore';
import type { FieldValue } from 'firebase-admin/firestore';

@Injectable()
export class GRNService {
  constructor(
    private readonly grnRepository: GRNRepository,
    private readonly purchaseOrdersRepository: PurchaseOrdersRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly batchInventoryRepository: BatchInventoryRepository,
  ) {}

  async findAll(tenantId: string, locationId?: string): Promise<GRNRecord[]> {
    return this.grnRepository.findAll(tenantId, locationId);
  }

  async findById(id: string, tenantId: string): Promise<GRNRecord> {
    const grn = await this.grnRepository.findById(id, tenantId);
    if (!grn) {
      throw new Error(`GRN with ID ${id} not found`);
    }
    return grn;
  }

  async create(data: CreateGRNInput): Promise<GRNRecord> {
    // Verify purchase order exists and is approved
    const po = await this.purchaseOrdersRepository.findById(data.purchaseOrderId, data.tenantId);
    if (!po) {
      throw new Error(`Purchase order with ID ${data.purchaseOrderId} not found`);
    }

    if (po.status !== PurchaseOrderStatus.APPROVED && po.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED) {
      throw new Error(`Cannot create GRN for purchase order with status ${po.status}`);
    }

    // Create GRN
    const grn = await this.grnRepository.create({
      ...data,
      purchaseOrderNumber: po.orderNumber,
    });

    // Update inventory for each item
    for (const item of data.items) {
      if (item.receivedQuantity > 0) {
        // Update main inventory
        const currentInventory = await this.inventoryRepository.getInventory(item.productId, data.locationId);
        const newQuantity = (currentInventory?.quantity || 0) + item.receivedQuantity;
        
        await this.inventoryRepository.upsertInventory({
          productId: item.productId,
          locationId: data.locationId,
          quantity: newQuantity,
          reorderPoint: currentInventory?.reorderPoint,
          maxStock: currentInventory?.maxStock,
        });

        // Create batch inventory if batch number provided
        if (item.batchNumber) {
          await this.batchInventoryRepository.create({
            productId: item.productId,
            locationId: data.locationId,
            batchNumber: item.batchNumber,
            expiryDate: parseExpiryDate(item.expiryDate),
            quantity: item.receivedQuantity,
            unitCostCents: item.unitCostCents,
            purchaseOrderId: data.purchaseOrderId,
            grnId: grn.id,
          });
        }

        // Create inventory transaction
        await this.inventoryRepository.createTransaction({
          productId: item.productId,
          locationId: data.locationId,
          delta: item.receivedQuantity,
          type: InventoryTransactionType.RECEIVED,
          referenceId: data.purchaseOrderId,
          userId: data.receivedBy,
          notes: `GRN ${grn.grnNumber} - Received from PO ${po.orderNumber}`,
          ts: new Date(),
        });
      }
    }

    // Update purchase order status
    const totalReceived = data.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);
    const totalOrdered = po.items.reduce((sum, item) => sum + item.quantity, 0);
    
    let newStatus: PurchaseOrderStatus = po.status as PurchaseOrderStatus;
    if (totalReceived >= totalOrdered) {
      newStatus = PurchaseOrderStatus.RECEIVED;
    } else if (totalReceived > 0) {
      newStatus = PurchaseOrderStatus.PARTIALLY_RECEIVED;
    }

    // Update received quantities in PO items
    const updatedItems = po.items.map(poItem => {
      const grnItem = data.items.find(item => item.productId === poItem.productId);
      return {
        ...poItem,
        receivedQuantity: (poItem.receivedQuantity || 0) + (grnItem?.receivedQuantity || 0),
      };
    });

    await this.purchaseOrdersRepository.update(data.purchaseOrderId, data.tenantId, {
      status: newStatus,
      items: updatedItems,
    });

    return grn;
  }
}

type ExpiryDateInput = Date | Timestamp | FieldValue | string | number | undefined;

function parseExpiryDate(value?: ExpiryDateInput): Date | undefined {
  if (!value) {
    return undefined;
  }
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value);
  }
  return undefined;
}

