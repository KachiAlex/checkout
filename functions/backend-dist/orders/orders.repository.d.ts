import { OrderStatus, PaymentStatus } from '@pos-checkout/shared';
import { FirestoreService } from '../firestore/firestore.service';
export interface OrderRecord {
    id: string;
    uuid: string;
    orderNumber: string;
    locationId: string;
    tenantId?: string;
    customerId?: string;
    items: Array<{
        productId: string;
        quantity: number;
        priceCents: number;
        taxCents: number;
        discountCents?: number;
    }>;
    subtotalCents: number;
    taxCents: number;
    discountCents: number;
    totalCents: number;
    status: OrderStatus;
    paymentStatus?: PaymentStatus;
    isCreditOrder?: boolean;
    paidAt?: Date;
    returnedAt?: Date;
    createdBy: string;
    deviceId?: string;
    completedAt?: Date;
    notes?: string;
    synced: boolean;
    isHeld: boolean;
    heldAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare class OrdersRepository {
    private readonly firestore;
    private readonly collection;
    constructor(firestore: FirestoreService);
    findByUuid(uuidValue: string): Promise<OrderRecord | null>;
    findById(id: string): Promise<OrderRecord | null>;
    list(params: {
        locationId?: string;
        tenantId?: string;
        from?: Date;
        to?: Date;
        status?: OrderStatus;
        deviceId?: string;
        isHeld?: boolean;
        customerId?: string;
        isCreditOrder?: boolean;
        paymentStatus?: PaymentStatus;
    }): Promise<OrderRecord[]>;
    findHeldOrders(locationId?: string): Promise<OrderRecord[]>;
    create(data: Omit<OrderRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<OrderRecord>;
    update(id: string, update: Partial<OrderRecord>): Promise<OrderRecord>;
    private toRecord;
    private timestampToDate;
}
