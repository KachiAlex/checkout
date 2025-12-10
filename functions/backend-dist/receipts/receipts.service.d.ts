import { OrdersRepository } from '../orders/orders.repository';
import { PaymentsRepository } from '../payments/payments.repository';
import { LocationsRepository } from '../locations/locations.repository';
import { UsersRepository } from '../users/users.repository';
import { EmailService } from '../email/email.service';
import { CustomizationService } from '../customization/customization.service';
export declare class ReceiptsService {
    private readonly ordersRepository;
    private readonly paymentsRepository;
    private readonly locationsRepository;
    private readonly usersRepository;
    private readonly emailService;
    private readonly customizationService;
    constructor(ordersRepository: OrdersRepository, paymentsRepository: PaymentsRepository, locationsRepository: LocationsRepository, usersRepository: UsersRepository, emailService: EmailService, customizationService: CustomizationService);
    generateReceipt(orderId: string): Promise<string>;
    private formatReceipt;
    sendEmailReceipt(orderId: string, email: string): Promise<boolean>;
    private formatReceiptHTML;
    getReceiptForPrint(orderId: string): Promise<{
        text: string;
        escpos: string;
    }>;
    private convertToESCPOS;
}
