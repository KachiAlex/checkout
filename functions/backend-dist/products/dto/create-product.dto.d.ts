export declare class CreateProductDto {
    sku: string;
    barcode?: string;
    name: string;
    description?: string;
    priceCents: number;
    costCents?: number;
    taxRate?: number;
    variants?: Record<string, unknown>;
    images?: string[];
    active?: boolean;
}
