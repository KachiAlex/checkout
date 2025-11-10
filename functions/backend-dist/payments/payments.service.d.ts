import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { OrdersService } from '../orders/orders.service';
import { ConfigService } from '@nestjs/config';
import { PaymentsRepository, PaymentRecord } from './payments.repository';
export declare class PaymentsService {
    private readonly paymentsRepository;
    private readonly ordersService;
    private readonly configService;
    private mockTerminal;
    constructor(paymentsRepository: PaymentsRepository, ordersService: OrdersService, configService: ConfigService);
    initiatePayment(orderId: string, dto: InitiatePaymentDto): Promise<PaymentRecord>;
    capture(paymentId: string): Promise<PaymentRecord>;
    refund(paymentId: string, amountCents?: number): Promise<PaymentRecord>;
}
