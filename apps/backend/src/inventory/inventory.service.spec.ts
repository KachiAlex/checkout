import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { ProductsService } from '../products/products.service';
import { CategoriesService } from '../categories/categories.service';
import { BrandsService } from '../brands/brands.service';
import { BatchInventoryRepository } from './batch-inventory.repository';
import { UsersRepository } from '../users/users.repository';
import { InventoryTransactionType } from '@pos-checkout/shared';

describe('InventoryService', () => {
  let service: InventoryService;
  let inventoryRepository: jest.Mocked<InventoryRepository>;
  let productsService: jest.Mocked<ProductsService>;
  let categoriesService: jest.Mocked<CategoriesService>;
  let brandsService: jest.Mocked<BrandsService>;
  let batchInventoryRepository: jest.Mocked<BatchInventoryRepository>;
  let usersRepository: jest.Mocked<UsersRepository>;

  const tenantId = 'tenant-123';
  const locationId = 'location-123';
  const productId = 'product-123';
  const userId = 'user-123';

  const mockInventoryRecord = {
    id: 'inventory-123',
    productId,
    locationId,
    quantity: 100,
    reorderPoint: 10,
    costCents: 800,
    salesPriceCents: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProduct = {
    id: productId,
    tenantId,
    sku: 'SKU-001',
    name: 'Test Product',
    priceCents: 1000,
    costCents: 800,
    taxRate: 0.075,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: InventoryRepository,
          useValue: {
            listStock: jest.fn(),
            getInventory: jest.fn(),
            upsertInventory: jest.fn(),
            createTransaction: jest.fn(),
            getLastTransaction: jest.fn(),
          } as Partial<jest.Mocked<InventoryRepository>>,
        },
        {
          provide: ProductsService,
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
          } as Partial<jest.Mocked<ProductsService>>,
        },
        {
          provide: CategoriesService,
          useValue: {
            findOrCreateByName: jest.fn(),
          } as Partial<jest.Mocked<CategoriesService>>,
        },
        {
          provide: BrandsService,
          useValue: {
            findOrCreateByName: jest.fn(),
          } as Partial<jest.Mocked<BrandsService>>,
        },
        {
          provide: BatchInventoryRepository,
          useValue: {
            create: jest.fn(),
          } as Partial<jest.Mocked<BatchInventoryRepository>>,
        },
        {
          provide: UsersRepository,
          useValue: {
            findById: jest.fn(),
          } as Partial<jest.Mocked<UsersRepository>>,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    inventoryRepository = module.get(InventoryRepository) as jest.Mocked<InventoryRepository>;
    productsService = module.get(ProductsService) as jest.Mocked<ProductsService>;
    categoriesService = module.get(CategoriesService) as jest.Mocked<CategoriesService>;
    brandsService = module.get(BrandsService) as jest.Mocked<BrandsService>;
    batchInventoryRepository = module.get(BatchInventoryRepository) as jest.Mocked<BatchInventoryRepository>;
    usersRepository = module.get(UsersRepository) as jest.Mocked<UsersRepository>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStock', () => {
    it('should return inventory stock with product information', async () => {
      inventoryRepository.listStock.mockResolvedValue([mockInventoryRecord]);
      productsService.findOne.mockResolvedValue(mockProduct as any);
      inventoryRepository.getLastTransaction.mockResolvedValue(null);

      const result = await service.getStock(locationId, tenantId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        productId,
        quantity: 100,
        costCents: 800,
        salesPriceCents: 1000,
      });
      expect(result[0].product).toBeDefined();
    });

    it('should handle missing product gracefully', async () => {
      inventoryRepository.listStock.mockResolvedValue([mockInventoryRecord]);
      productsService.findOne.mockResolvedValue(null);
      inventoryRepository.getLastTransaction.mockResolvedValue(null);

      const result = await service.getStock(locationId, tenantId);

      expect(result).toHaveLength(1);
      expect(result[0].isProductMissing).toBe(true);
      expect(result[0].product).toMatchObject({
        id: productId,
        name: 'Unknown product',
        sku: '—',
      });
    });
  });

  describe('createInventoryItem', () => {
    const createDto = {
      name: 'New Product',
      quantity: 50,
      costCents: 800,
      priceCents: 1000,
      barcode: '1234567890',
      categoryId: 'cat-123',
      brandId: 'brand-123',
    };

    it('should create product and inventory item', async () => {
      categoriesService.findOrCreateByName.mockResolvedValue({ id: 'cat-123', name: 'Category' } as any);
      brandsService.findOrCreateByName.mockResolvedValue({ id: 'brand-123', name: 'Brand' } as any);
      productsService.create.mockResolvedValue(mockProduct as any);
      inventoryRepository.upsertInventory.mockResolvedValue(mockInventoryRecord as any);
      inventoryRepository.createTransaction.mockResolvedValue({} as any);

      const result = await service.createInventoryItem(createDto, locationId, tenantId, userId);

      expect(productsService.create).toHaveBeenCalled();
      expect(inventoryRepository.upsertInventory).toHaveBeenCalled();
      expect(inventoryRepository.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          productId,
          locationId,
          type: InventoryTransactionType.RECEIVED,
          delta: 50,
        }),
      );
    });

    it('should create category if categoryName provided', async () => {
      const dtoWithCategoryName = {
        ...createDto,
        categoryId: undefined,
        categoryName: 'New Category',
      };

      categoriesService.findOrCreateByName.mockResolvedValue({ id: 'cat-new', name: 'New Category' } as any);
      brandsService.findOrCreateByName.mockResolvedValue({ id: 'brand-123', name: 'Brand' } as any);
      productsService.create.mockResolvedValue(mockProduct as any);
      inventoryRepository.upsertInventory.mockResolvedValue(mockInventoryRecord as any);
      inventoryRepository.createTransaction.mockResolvedValue({} as any);

      await service.createInventoryItem(dtoWithCategoryName, locationId, tenantId, userId);

      expect(categoriesService.findOrCreateByName).toHaveBeenCalledWith('New Category', tenantId);
    });

    it('should create brand if brandName provided', async () => {
      const dtoWithBrandName = {
        ...createDto,
        brandId: undefined,
        brandName: 'New Brand',
      };

      categoriesService.findOrCreateByName.mockResolvedValue({ id: 'cat-123', name: 'Category' } as any);
      brandsService.findOrCreateByName.mockResolvedValue({ id: 'brand-new', name: 'New Brand' } as any);
      productsService.create.mockResolvedValue(mockProduct as any);
      inventoryRepository.upsertInventory.mockResolvedValue(mockInventoryRecord as any);
      inventoryRepository.createTransaction.mockResolvedValue({} as any);

      await service.createInventoryItem(dtoWithBrandName, locationId, tenantId, userId);

      expect(brandsService.findOrCreateByName).toHaveBeenCalledWith('New Brand', tenantId);
    });
  });

  describe('getStockByProduct', () => {
    it('should return stock quantity for product', async () => {
      inventoryRepository.getInventory.mockResolvedValue(mockInventoryRecord as any);

      const result = await service.getStockByProduct(productId, locationId);

      expect(result).toBe(100);
    });

    it('should return 0 if inventory not found', async () => {
      inventoryRepository.getInventory.mockResolvedValue(null);

      const result = await service.getStockByProduct(productId, locationId);

      expect(result).toBe(0);
    });
  });

  describe('decrementForSale', () => {
    it('should decrement inventory for sale', async () => {
      inventoryRepository.getInventory.mockResolvedValue(mockInventoryRecord as any);
      inventoryRepository.upsertInventory.mockResolvedValue({
        ...mockInventoryRecord,
        quantity: 98,
      } as any);
      inventoryRepository.createTransaction.mockResolvedValue({} as any);

      await service.decrementForSale(productId, locationId, 2, 'order-123', userId);

      expect(inventoryRepository.upsertInventory).toHaveBeenCalledWith(
        expect.objectContaining({
          productId,
          locationId,
          quantity: 98, // 100 - 2
        }),
      );
      expect(inventoryRepository.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          productId,
          locationId,
          delta: -2,
          type: InventoryTransactionType.SALE,
          referenceId: 'order-123',
          userId,
        }),
      );
    });
  });

  describe('updateInventoryItem', () => {
    it('should update inventory item with all fields', async () => {
      inventoryRepository.getInventory.mockResolvedValue(mockInventoryRecord as any);
      inventoryRepository.upsertInventory.mockResolvedValue({
        ...mockInventoryRecord,
        quantity: 150,
        costCents: 900,
        salesPriceCents: 1200,
        reorderPoint: 15,
      } as any);
      inventoryRepository.createTransaction.mockResolvedValue({} as any);

      await service.updateInventoryItem(
        productId,
        locationId,
        150, // quantity
        15, // reorderPoint
        900, // costCents
        1200, // salesPriceCents
      );

      expect(inventoryRepository.upsertInventory).toHaveBeenCalledWith(
        expect.objectContaining({
          productId,
          locationId,
          quantity: 150,
          costCents: 900,
          salesPriceCents: 1200,
          reorderPoint: 15,
        }),
      );
    });

    it('should create transaction when quantity changes', async () => {
      inventoryRepository.getInventory.mockResolvedValue(mockInventoryRecord as any);
      inventoryRepository.upsertInventory.mockResolvedValue({
        ...mockInventoryRecord,
        quantity: 150,
      } as any);
      inventoryRepository.createTransaction.mockResolvedValue({} as any);

      await service.updateInventoryItem(productId, locationId, 150);

      expect(inventoryRepository.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          productId,
          locationId,
          delta: 50, // delta: 150 - 100
          type: InventoryTransactionType.ADJUST,
        }),
      );
    });

    it('should not create transaction when quantity unchanged', async () => {
      inventoryRepository.getInventory.mockResolvedValue(mockInventoryRecord as any);
      inventoryRepository.upsertInventory.mockResolvedValue(mockInventoryRecord as any);

      await service.updateInventoryItem(
        productId,
        locationId,
        100, // same quantity
        undefined,
        900, // only cost changes
        1200, // only price changes
      );

      expect(inventoryRepository.createTransaction).not.toHaveBeenCalled();
    });

    it('should handle negative quantity delta (decrease)', async () => {
      inventoryRepository.getInventory.mockResolvedValue(mockInventoryRecord as any);
      inventoryRepository.upsertInventory.mockResolvedValue({
        ...mockInventoryRecord,
        quantity: 50,
      } as any);
      inventoryRepository.createTransaction.mockResolvedValue({} as any);

      await service.updateInventoryItem(productId, locationId, 50);

      expect(inventoryRepository.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          delta: -50, // delta: 50 - 100
          type: InventoryTransactionType.ADJUST,
        }),
      );
    });
  });

  describe('adjust', () => {
    it('should adjust inventory quantity', async () => {
      inventoryRepository.getInventory.mockResolvedValue(mockInventoryRecord as any);
      inventoryRepository.upsertInventory.mockResolvedValue({
        ...mockInventoryRecord,
        quantity: 150,
      } as any);
      inventoryRepository.createTransaction.mockResolvedValue({} as any);

      await service.adjust({
        productId,
        locationId,
        delta: 50,
        type: InventoryTransactionType.ADJUST,
        userId,
        notes: 'Adjustment reason',
      });

      expect(inventoryRepository.upsertInventory).toHaveBeenCalled();
      expect(inventoryRepository.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          productId,
          locationId,
          delta: 50,
          type: InventoryTransactionType.ADJUST,
          notes: 'Adjustment reason',
        }),
      );
    });

    it('should handle negative delta (decrease inventory)', async () => {
      inventoryRepository.getInventory.mockResolvedValue(mockInventoryRecord as any);
      inventoryRepository.upsertInventory.mockResolvedValue({
        ...mockInventoryRecord,
        quantity: 50,
      } as any);
      inventoryRepository.createTransaction.mockResolvedValue({} as any);

      await service.adjust({
        productId,
        locationId,
        delta: -50,
        type: InventoryTransactionType.ADJUST,
        userId,
      });

      expect(inventoryRepository.upsertInventory).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 50, // 100 - 50
        }),
      );
    });
  });
});

