import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    initiate(orderId: string, dto: InitiatePaymentDto): Promise<import("./payments.repository").PaymentRecord>;
    capture(paymentId: string): Promise<import("./payments.repository").PaymentRecord>;
    refund(paymentId: string, amountCents?: number): Promise<import("./payments.repository").PaymentRecord>;
}
