"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const products_repository_1 = require("./products.repository");
let ProductsService = class ProductsService {
    constructor(productsRepository) {
        this.productsRepository = productsRepository;
    }
    async findAll(query, locationId, tenantId) {
        const products = await this.productsRepository.search(query, tenantId);
        if (!locationId) {
            return products;
        }
        return products;
    }
    async findOne(id, tenantId) {
        const product = await this.productsRepository.findById(id, tenantId);
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID ${id} not found`);
        }
        return product;
    }
    async findByBarcode(barcode, tenantId) {
        const product = await this.productsRepository.findByBarcode(barcode, tenantId);
        if (product && product.active) {
            return product;
        }
        return null;
    }
    async findBySku(sku, tenantId) {
        const product = await this.productsRepository.findBySku(sku, tenantId);
        if (product && product.active) {
            return product;
        }
        return null;
    }
    async create(createProductDto, tenantId) {
        return this.productsRepository.create({
            tenantId,
            sku: createProductDto.sku,
            barcode: createProductDto.barcode,
            name: createProductDto.name,
            description: createProductDto.description,
            priceCents: createProductDto.priceCents,
            costCents: createProductDto.costCents,
            taxRate: createProductDto.taxRate ?? 0,
            variants: createProductDto.variants,
            images: createProductDto.images,
            active: createProductDto.active ?? true,
        });
    }
    async update(id, tenantId, updateProductDto) {
        await this.findOne(id, tenantId);
        return this.productsRepository.update(id, tenantId, {
            ...updateProductDto,
        });
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [products_repository_1.ProductsRepository])
], ProductsService);
//# sourceMappingURL=products.service.js.map