import { Injectable, NotFoundException } from '@nestjs/common';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { InventoryTransactionType } from '@pos-checkout/shared';
import { InventoryRepository, InventoryTransactionRecord } from './inventory.repository';
import { ProductsService } from '../products/products.service';
import { CategoriesService } from '../categories/categories.service';
import { BrandsService } from '../brands/brands.service';
import { BatchInventoryRepository } from './batch-inventory.repository';
import { UsersRepository } from '../users/users.repository';

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly productsService: ProductsService,
    private readonly categoriesService: CategoriesService,
    private readonly brandsService: BrandsService,
    private readonly batchInventoryRepository: BatchInventoryRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async getStock(locationId: string, tenantId?: string) {
    const inventoryRecords = await this.inventoryRepository.listStock(locationId);
    
    // Enrich inventory records with product information and last transaction
    const enrichedRecords = await Promise.all(
      inventoryRecords.map(async (record) => {
        try {
          // Fetch product information
          const product = tenantId
            ? await this.productsService.findOne(record.productId, tenantId)
            : null;
          
          if (!product) {
            // If product not found, return record without product info
            return {
              ...record,
              product: null,
              lastTransaction: null,
            };
          }

          // Get last transaction for this inventory item
          const lastTransaction = await this.inventoryRepository.getLastTransaction(
            record.productId,
            locationId,
          );

          // Get user info if transaction has userId
          let lastUpdatedBy = null;
          if (lastTransaction?.userId && tenantId) {
            try {
              const user = await this.usersRepository.findById(lastTransaction.userId);
              if (user) {
                lastUpdatedBy = {
                  id: user.id,
                  name: user.name,
                };
              }
            } catch (error) {
              console.error(`Failed to fetch user ${lastTransaction.userId}:`, error);
            }
          }

          return {
            ...record,
            product: {
              id: product.id,
              name: product.name,
              sku: product.sku,
              barcode: product.barcode,
              description: product.description,
              priceCents: product.priceCents,
            },
            // Use inventory sales price if available, otherwise fall back to product price
            salesPriceCents: record.salesPriceCents ?? product.priceCents,
            costCents: record.costCents,
            lastTransaction: lastTransaction
              ? {
                  timestamp: lastTransaction.ts,
                  userId: lastTransaction.userId,
                  user: lastUpdatedBy,
                  type: lastTransaction.type,
                }
              : null,
          };
        } catch (error) {
          // If product fetch fails, return record without product info
          console.error(`Failed to fetch product ${record.productId}:`, error);
          return {
            ...record,
            product: null,
            lastTransaction: null,
          };
        }
      })
    );

    const recordsWithFallback = enrichedRecords.map((record) => {
      const isProductMissing = !record.product;
      return {
        ...record,
        product: record.product ?? {
          id: record.productId,
          name: 'Unknown product',
          sku: '—',
          barcode: undefined,
        },
        isProductMissing,
      };
    });

    return recordsWithFallback;
  }

  async getBatchInventory(productId: string, locationId: string) {
    return this.batchInventoryRepository.findByProduct(productId, locationId);
  }

  async getStockByProduct(productId: string, locationId: string): Promise<number> {
    const inventory = await this.inventoryRepository.getInventory(productId, locationId);
    return inventory?.quantity ?? 0;
  }

  /**
   * Get inventory record for a product at a location (for price validation)
   */
  async getInventoryRecord(productId: string, locationId: string) {
    return this.inventoryRepository.getInventory(productId, locationId);
  }

  async adjust(adjustDto: AdjustInventoryDto): Promise<InventoryTransactionRecord> {
    const { productId, locationId, delta, type, userId, referenceId, notes, reason } = adjustDto;

    const currentInventory = await this.inventoryRepository.getInventory(productId, locationId);
    const newQuantity = Math.max(0, (currentInventory?.quantity ?? 0) + delta);
    await this.inventoryRepository.upsertInventory({
      productId,
      locationId,
      quantity: newQuantity,
      reorderPoint: currentInventory?.reorderPoint,
      maxStock: currentInventory?.maxStock,
      costCents: currentInventory?.costCents,
      salesPriceCents: currentInventory?.salesPriceCents,
    });

    return this.inventoryRepository.createTransaction({
      productId,
      locationId,
      delta,
      type,
      userId,
      referenceId,
      notes,
      reason,
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

  async incrementForReturn(
    productId: string,
    locationId: string,
    quantity: number,
    returnId: string,
    userId?: string,
  ): Promise<void> {
    await this.adjust({
      productId,
      locationId,
      delta: quantity,
      type: InventoryTransactionType.RETURN,
      referenceId: returnId,
      userId,
      notes: `Returned from order`,
    });
  }

  async getTransactions(locationId: string, from?: string, to?: string) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    return this.inventoryRepository.listTransactions(locationId, fromDate, toDate);
  }

  async createInventoryItem(
    createDto: CreateInventoryItemDto,
    locationId: string,
    tenantId: string,
    userId: string,
  ) {
    // Generate SKU if not provided
    const sku = createDto.sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Handle category - find or create if name provided
    let categoryId = createDto.categoryId;
    if (!categoryId && createDto.categoryName) {
      const category = await this.categoriesService.findOrCreateByName(createDto.categoryName, tenantId);
      categoryId = category.id;
    }

    // Handle brand - find or create if name provided
    let brandId = createDto.brandId;
    if (!brandId && createDto.brandName) {
      const brand = await this.brandsService.findOrCreateByName(createDto.brandName, tenantId);
      brandId = brand.id;
    }

    // Create product
    const product = await this.productsService.create(
      {
        sku,
        name: createDto.name,
        description: createDto.description,
        barcode: createDto.barcode,
        categoryId,
        brandId,
        priceCents: createDto.priceCents,
        costCents: createDto.costCents,
        taxRate: createDto.taxRate ?? 0.075,
        active: true,
      },
      tenantId,
    );

    // Create inventory record
    await this.inventoryRepository.upsertInventory({
      productId: product.id,
      locationId,
      quantity: createDto.quantity,
      costCents: createDto.costCents,
      salesPriceCents: createDto.priceCents, // Use priceCents as initial sales price
    });

    // Create transaction record
    const transaction = await this.inventoryRepository.createTransaction({
      productId: product.id,
      locationId,
      delta: createDto.quantity,
      type: InventoryTransactionType.RECEIVED,
      userId,
      notes: `Initial inventory entry - ${createDto.quantity} units`,
      ts: new Date(),
    });

    return {
      product,
      inventory: await this.inventoryRepository.getInventory(product.id, locationId),
      transaction,
    };
  }

  async findDuplicates() {
    return this.inventoryRepository.findDuplicates();
  }

  async removeDuplicates() {
    return this.inventoryRepository.removeDuplicates();
  }

  async clearAllInventory() {
    return this.inventoryRepository.clearAllInventory();
  }

  async updateInventoryPrices(
    productId: string,
    locationId: string,
    costCents?: number,
    salesPriceCents?: number,
  ) {
    const currentInventory = await this.inventoryRepository.getInventory(productId, locationId);
    
    if (!currentInventory) {
      throw new NotFoundException(`Inventory not found for product ${productId} at location ${locationId}`);
    }

    return this.inventoryRepository.upsertInventory({
      productId,
      locationId,
      quantity: currentInventory.quantity,
      reorderPoint: currentInventory.reorderPoint,
      maxStock: currentInventory.maxStock,
      costCents: costCents !== undefined ? costCents : currentInventory.costCents,
      salesPriceCents: salesPriceCents !== undefined ? salesPriceCents : currentInventory.salesPriceCents,
    });
  }

  async updateInventoryItem(
    productId: string,
    locationId: string,
    quantity?: number,
    reorderPoint?: number,
    costCents?: number,
    salesPriceCents?: number,
  ) {
    const currentInventory = await this.inventoryRepository.getInventory(productId, locationId);
    
    if (!currentInventory) {
      throw new NotFoundException(`Inventory not found for product ${productId} at location ${locationId}`);
    }

    // Calculate quantity delta if quantity is being updated
    const quantityDelta = quantity !== undefined ? quantity - currentInventory.quantity : 0;

    // Update inventory with new values
    const updated = await this.inventoryRepository.upsertInventory({
      productId,
      locationId,
      quantity: quantity !== undefined ? quantity : currentInventory.quantity,
      reorderPoint: reorderPoint !== undefined ? reorderPoint : currentInventory.reorderPoint,
      maxStock: currentInventory.maxStock,
      costCents: costCents !== undefined ? costCents : currentInventory.costCents,
      salesPriceCents: salesPriceCents !== undefined ? salesPriceCents : currentInventory.salesPriceCents,
    });

    // Create transaction if quantity changed
    if (quantityDelta !== 0) {
      await this.inventoryRepository.createTransaction({
        productId,
        locationId,
        delta: quantityDelta,
        type: InventoryTransactionType.ADJUST,
        notes: `Inventory item updated via edit`,
        ts: new Date(),
      });
    }

    return updated;
  }
}
