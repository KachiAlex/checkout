import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentStatus } from '@pos-checkout/shared';
import { OrdersService } from '../orders/orders.service';
import { ConfigService } from '@nestjs/config';
import { PaymentsRepository, PaymentRecord } from './payments.repository';
import { PaymentSettingsService } from '../payment-settings/payment-settings.service';
import { UsersRepository } from '../users/users.repository';
export declare class PaymentsService {
    private readonly paymentsRepository;
    private readonly ordersService;
    private readonly configService;
    private readonly paymentSettingsService;
    private readonly usersRepository;
    private defaultPaymentAdapter;
    constructor(paymentsRepository: PaymentsRepository, ordersService: OrdersService, configService: ConfigService, paymentSettingsService: PaymentSettingsService, usersRepository: UsersRepository);
    private getPaymentAdapter;
    initiatePayment(orderId: string, dto: InitiatePaymentDto): Promise<PaymentRecord>;
    capture(paymentId: string): Promise<PaymentRecord>;
    refund(paymentId: string, amountCents?: number): Promise<PaymentRecord>;
    getOrderPayments(orderId: string): Promise<PaymentRecord[]>;
    getOrderPaymentStatus(orderId: string): Promise<{
        totalPaid: number;
        totalDue: number;
        isFullyPaid: boolean;
        payments: PaymentRecord[];
    }>;
    handleWebhookNotification(paymentReference: string, status: PaymentStatus, transactionData?: Record<string, unknown>): Promise<PaymentRecord | null>;
}
