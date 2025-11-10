import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(req: any, query?: string, locationId?: string): Promise<import("./products.repository").ProductRecord[]>;
    findOne(id: string, req: any): Promise<import("./products.repository").ProductRecord>;
    create(createProductDto: CreateProductDto, req: any): Promise<import("./products.repository").ProductRecord>;
    update(id: string, updateProductDto: UpdateProductDto, req: any): Promise<import("./products.repository").ProductRecord>;
}
