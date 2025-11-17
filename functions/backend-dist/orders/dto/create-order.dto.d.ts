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
    customerId?: string;
    items: OrderItemDto[];
    subtotalCents: number;
    taxCents: number;
    discountCents?: number;
    discountPercent?: number;
    discountReason?: string;
    totalCents: number;
    deviceId?: string;
    notes?: string;
    isHeld?: boolean;
}
export {};
