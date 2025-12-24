import { BadRequestException, Injectable } from '@nestjs/common';
import {
  PurchaseOrdersRepository,
  PurchaseOrderRecord,
  CreatePurchaseOrderInput,
  PurchaseOrderStatus,
} from './purchase-orders.repository';
import { SuppliersRepository } from '../suppliers/suppliers.repository';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly purchaseOrdersRepository: PurchaseOrdersRepository,
    private readonly suppliersRepository: SuppliersRepository,
    private readonly tenantsService: TenantsService,
  ) {}

  async findAll(tenantId: string, locationId?: string): Promise<PurchaseOrderRecord[]> {
    return this.purchaseOrdersRepository.findAll(tenantId, locationId);
  }

  async findById(id: string, tenantId: string): Promise<PurchaseOrderRecord> {
    const po = await this.purchaseOrdersRepository.findById(id, tenantId);
    if (!po) {
      throw new Error(`Purchase order with ID ${id} not found`);
    }
    return po;
  }

  async create(data: CreatePurchaseOrderInput): Promise<PurchaseOrderRecord> {
    // Verify supplier exists
    const supplier = await this.suppliersRepository.findById(data.supplierId, data.tenantId);
    if (!supplier) {
      throw new Error(`Supplier with ID ${data.supplierId} not found`);
    }

    const featureFlags = await this.tenantsService.getFeatureFlags(data.tenantId);
    const batchTrackingEnabled = featureFlags?.batchTracking === true;
    const expiryTrackingEnabled = featureFlags?.expiryTracking === true;

    const normalizedItems = data.items.map((item, index) => {
      if (batchTrackingEnabled && !item.batchNumber) {
        throw new BadRequestException(
          `Batch number is required for item ${item.productId || index + 1}`,
        );
      }

      let parsedExpiry: Date | undefined;
      if (item.expiryDate) {
        parsedExpiry = item.expiryDate instanceof Date ? item.expiryDate : new Date(item.expiryDate);
        if (Number.isNaN(parsedExpiry.getTime())) {
          throw new BadRequestException(
            `Invalid expiry date provided for item ${item.productId || index + 1}`,
          );
        }
      }

      if (expiryTrackingEnabled && !parsedExpiry) {
        throw new BadRequestException(
          `Expiry date is required for item ${item.productId || index + 1}`,
        );
      }

      return {
        ...item,
        expiryDate: parsedExpiry ?? undefined,
      };
    });

    return this.purchaseOrdersRepository.create({
      ...data,
      supplierName: supplier.name,
      items: normalizedItems,
    });
  }

  async approve(id: string, tenantId: string, approvedBy: string): Promise<PurchaseOrderRecord> {
    const po = await this.findById(id, tenantId);

    if (po.status !== PurchaseOrderStatus.DRAFT && po.status !== PurchaseOrderStatus.PENDING) {
      throw new Error(`Cannot approve purchase order with status ${po.status}`);
    }

    return this.purchaseOrdersRepository.update(id, tenantId, {
      status: PurchaseOrderStatus.APPROVED,
      approvedBy,
      approvedAt: new Date(),
    });
  }

  async cancel(id: string, tenantId: string): Promise<PurchaseOrderRecord> {
    const po = await this.findById(id, tenantId);

    if (po.status === PurchaseOrderStatus.RECEIVED) {
      throw new Error('Cannot cancel a fully received purchase order');
    }

    return this.purchaseOrdersRepository.update(id, tenantId, {
      status: PurchaseOrderStatus.CANCELLED,
    });
  }
}
