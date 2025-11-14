import { PaymentsService } from './payments.service';
export declare class WebhooksController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    handlePaymentStatus(payload: any): Promise<{
        received: boolean;
        timestamp: string;
    }>;
}
