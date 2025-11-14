import { ReceiptsService } from './receipts.service';
export declare class ReceiptsController {
    private readonly receiptsService;
    constructor(receiptsService: ReceiptsService);
    getReceipt(orderId: string): Promise<{
        receipt: string;
        orderId: string;
    }>;
    getReceiptForPrint(orderId: string): Promise<{
        text: string;
        escpos: string;
    }>;
    sendEmailReceipt(orderId: string, email: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
