import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsRepository, ProductRecord } from './products.repository';
export declare class ProductsService {
    private readonly productsRepository;
    constructor(productsRepository: ProductsRepository);
    findAll(query: string | undefined, locationId: string | undefined, tenantId: string): Promise<ProductRecord[]>;
    findOne(id: string, tenantId: string): Promise<ProductRecord>;
    findByIds(ids: string[], tenantId: string): Promise<Map<string, ProductRecord>>;
    findByBarcode(barcode: string, tenantId: string): Promise<ProductRecord | null>;
    findBySku(sku: string, tenantId: string): Promise<ProductRecord | null>;
    create(createProductDto: CreateProductDto, tenantId: string): Promise<ProductRecord>;
    update(id: string, tenantId: string, updateProductDto: UpdateProductDto): Promise<ProductRecord>;
}
