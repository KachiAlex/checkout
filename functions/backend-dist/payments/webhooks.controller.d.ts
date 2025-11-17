import { PaymentsService } from './payments.service';
import { ConfigService } from '@nestjs/config';
interface MonnifyWebhookPayload {
    eventType: string;
    eventData: {
        product: {
            type: string;
            reference: string;
        };
        transactionReference: string;
        paymentReference: string;
        amountPaid: string;
        totalPayable: string;
        settlementAmount: string;
        paidOn: string;
        paymentStatus: string;
        paymentDescription: string;
        currency: string;
        paymentMethod: string;
        customer: {
            email: string;
            name: string;
        };
        metaData: Record<string, unknown>;
    };
}
export declare class WebhooksController {
    private readonly paymentsService;
    private readonly configService;
    private monnifyAdapter;
    constructor(paymentsService: PaymentsService, configService: ConfigService);
    handleMonnifyWebhook(payload: MonnifyWebhookPayload, signature?: string): Promise<{
        received: boolean;
        processed: boolean;
        timestamp: string;
        eventType?: undefined;
    } | {
        received: boolean;
        eventType: string;
        timestamp: string;
        processed?: undefined;
    }>;
    handlePaymentStatus(payload: any): Promise<{
        received: boolean;
        timestamp: string;
    }>;
}
export {};
