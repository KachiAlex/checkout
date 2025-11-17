import { FirestoreService } from '../firestore/firestore.service';
export interface ProductRecord {
    id: string;
    tenantId: string;
    sku: string;
    barcode?: string;
    name: string;
    description?: string;
    categoryId?: string;
    categoryName?: string;
    brandId?: string;
    brandName?: string;
    priceCents: number;
    costCents?: number;
    taxRate: number;
    variants?: Record<string, unknown>;
    images?: string[];
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export type CreateProductInput = {
    tenantId: string;
    sku: string;
    barcode?: string;
    name: string;
    description?: string;
    categoryId?: string;
    categoryName?: string;
    brandId?: string;
    brandName?: string;
    priceCents: number;
    costCents?: number;
    taxRate?: number;
    variants?: Record<string, unknown>;
    images?: string[];
    active?: boolean;
};
export declare class ProductsRepository {
    private readonly firestore;
    private readonly collection;
    constructor(firestore: FirestoreService);
    findAll(tenantId: string): Promise<ProductRecord[]>;
    search(query: string | undefined, tenantId: string): Promise<ProductRecord[]>;
    findById(id: string, tenantId: string): Promise<ProductRecord | null>;
    findByBarcode(barcode: string, tenantId: string): Promise<ProductRecord | null>;
    findBySku(sku: string, tenantId: string): Promise<ProductRecord | null>;
    create(data: CreateProductInput): Promise<ProductRecord>;
    update(id: string, tenantId: string, update: Partial<ProductRecord>): Promise<ProductRecord>;
    private toRecord;
    private timestampToDate;
}
