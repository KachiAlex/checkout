import { OrdersRepository } from '../orders/orders.repository';
import { PaymentsRepository } from '../payments/payments.repository';
import { LocationsRepository } from '../locations/locations.repository';
import { UsersRepository } from '../users/users.repository';
export declare class ReceiptsService {
    private readonly ordersRepository;
    private readonly paymentsRepository;
    private readonly locationsRepository;
    private readonly usersRepository;
    constructor(ordersRepository: OrdersRepository, paymentsRepository: PaymentsRepository, locationsRepository: LocationsRepository, usersRepository: UsersRepository);
    generateReceipt(orderId: string): Promise<string>;
    private formatReceipt;
    sendEmailReceipt(orderId: string, email: string): Promise<boolean>;
    getReceiptForPrint(orderId: string): Promise<{
        text: string;
        escpos: string;
    }>;
    private convertToESCPOS;
}
