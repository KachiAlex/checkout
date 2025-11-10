import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { ProductsRepository, ProductRecord } from './products.repository';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: jest.Mocked<ProductsRepository>;

  const tenantId = 'tenant-123';

  const mockProduct: ProductRecord = {
    id: 'product-123',
    tenantId,
    sku: 'SKU-001',
    barcode: '1000000001',
    name: 'Test Product',
    priceCents: 1000,
    costCents: 800,
    taxRate: 0.075,
    variants: undefined,
    images: undefined,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: ProductsRepository,
          useValue: {
            search: jest.fn().mockResolvedValue([mockProduct]),
            findById: jest.fn(),
            findByBarcode: jest.fn(),
            findBySku: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          } as Partial<jest.Mocked<ProductsRepository>>,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repository = module.get(ProductsRepository) as jest.Mocked<ProductsRepository>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return products', async () => {
      const result = await service.findAll(undefined, undefined, tenantId);
      expect(result).toEqual([mockProduct]);
    });

    it('should filter by query', async () => {
      const result = await service.findAll('test', undefined, tenantId);
      expect(result).toEqual([mockProduct]);
    });
  });

  describe('findOne', () => {
    it('should return product by id', async () => {
      repository.findById.mockResolvedValue(mockProduct);

      const result = await service.findOne('product-123', tenantId);
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException if product not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne('invalid', tenantId)).rejects.toThrow('not found');
    });
  });
});
