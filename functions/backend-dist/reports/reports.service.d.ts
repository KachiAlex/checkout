import { OrdersRepository } from '../orders/orders.repository';
export declare class ReportsService {
    private readonly ordersRepository;
    constructor(ordersRepository: OrdersRepository);
    getSales(from?: string, to?: string, locationId?: string): Promise<{
        from: string;
        to: string;
        locationId: string;
        totalSales: number;
        totalOrders: number;
        averageOrderValue: number;
        orders: {
            id: string;
            orderNumber: string;
            total: number;
            createdAt: Date;
        }[];
    }>;
    getTopSellers(from?: string, to?: string, locationId?: string, limit?: number): Promise<{
        from: string;
        to: string;
        locationId: string;
        topSellers: {
            productId: string;
            quantitySold: number;
            revenue: number;
        }[];
    }>;
}
