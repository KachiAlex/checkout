"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const products_service_1 = require("./products.service");
const products_repository_1 = require("./products.repository");
describe('ProductsService', () => {
    let service;
    let repository;
    const tenantId = 'tenant-123';
    const mockProduct = {
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
        const module = await testing_1.Test.createTestingModule({
            providers: [
                products_service_1.ProductsService,
                {
                    provide: products_repository_1.ProductsRepository,
                    useValue: {
                        search: jest.fn().mockResolvedValue([mockProduct]),
                        findById: jest.fn(),
                        findByBarcode: jest.fn(),
                        findBySku: jest.fn(),
                        create: jest.fn(),
                        update: jest.fn(),
                    },
                },
            ],
        }).compile();
        service = module.get(products_service_1.ProductsService);
        repository = module.get(products_repository_1.ProductsRepository);
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
//# sourceMappingURL=products.service.spec.js.map