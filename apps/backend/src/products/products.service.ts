import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsRepository, ProductRecord } from './products.repository';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
  ) {}

  async findAll(query: string | undefined, locationId: string | undefined, tenantId: string): Promise<ProductRecord[]> {
    const products = await this.productsRepository.search(query, tenantId);
    if (!locationId) {
      return products;
    }
    // Placeholder: products currently global; location filtering can be implemented with inventory collections.
    return products;
  }

  async findOne(id: string, tenantId: string): Promise<ProductRecord> {
    const product = await this.productsRepository.findById(id, tenantId);

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async findByBarcode(barcode: string, tenantId: string): Promise<ProductRecord | null> {
    const product = await this.productsRepository.findByBarcode(barcode, tenantId);
    if (product && product.active) {
      return product;
    }
    return null;
  }

  async findBySku(sku: string, tenantId: string): Promise<ProductRecord | null> {
    const product = await this.productsRepository.findBySku(sku, tenantId);
    if (product && product.active) {
      return product;
    }
    return null;
  }

  async create(createProductDto: CreateProductDto, tenantId: string): Promise<ProductRecord> {
    return this.productsRepository.create({
      tenantId,
      sku: createProductDto.sku,
      barcode: createProductDto.barcode,
      name: createProductDto.name,
      description: createProductDto.description,
      categoryId: createProductDto.categoryId,
      categoryName: createProductDto.categoryName,
      brandId: createProductDto.brandId,
      brandName: createProductDto.brandName,
      priceCents: createProductDto.priceCents,
      costCents: createProductDto.costCents,
      taxRate: createProductDto.taxRate ?? 0,
      variants: createProductDto.variants,
      images: createProductDto.images,
      active: createProductDto.active ?? true,
    });
  }

  async update(id: string, tenantId: string, updateProductDto: UpdateProductDto): Promise<ProductRecord> {
    await this.findOne(id, tenantId);
    return this.productsRepository.update(id, tenantId, {
      ...updateProductDto,
    });
  }
}
