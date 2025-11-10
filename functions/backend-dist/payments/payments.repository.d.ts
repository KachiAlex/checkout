import { PaymentMethod, PaymentStatus } from '@pos-checkout/shared';
import { FirestoreService } from '../firestore/firestore.service';
export interface PaymentRecord {
    id: string;
    orderId: string;
    amountCents: number;
    currency: string;
    method: PaymentMethod;
    status: PaymentStatus;
    processorData?: Record<string, unknown>;
    transactionId?: string;
    error?: string;
    processedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export type CreatePaymentInput = {
    orderId: string;
    amountCents: number;
    currency: string;
    method: PaymentMethod;
    status: PaymentStatus;
    processorData?: Record<string, unknown>;
    transactionId?: string;
    error?: string;
    processedAt?: Date;
};
export declare class PaymentsRepository {
    private readonly firestore;
    private readonly collection;
    constructor(firestore: FirestoreService);
    create(data: CreatePaymentInput): Promise<PaymentRecord>;
    findById(id: string): Promise<PaymentRecord | null>;
    findByOrderId(orderId: string): Promise<PaymentRecord[]>;
    update(id: string, update: Partial<CreatePaymentInput>): Promise<PaymentRecord>;
    private toRecord;
    private timestampToDate;
}
