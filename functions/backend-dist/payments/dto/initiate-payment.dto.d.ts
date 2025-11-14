import { PaymentMethod } from '@pos-checkout/shared';
export declare class InitiatePaymentDto {
    method: PaymentMethod;
    amount: number;
    metadata?: Record<string, unknown>;
}
