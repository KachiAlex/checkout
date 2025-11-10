import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
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
