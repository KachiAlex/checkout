declare class OrderItemDto {
    productId: string;
    quantity: number;
    priceCents: number;
    taxCents: number;
    discountCents?: number;
}
export declare class CreateOrderDto {
    uuid: string;
    locationId: string;
    items: OrderItemDto[];
    subtotalCents: number;
    taxCents: number;
    discountCents?: number;
    totalCents: number;
    deviceId?: string;
    notes?: string;
}
export {};
