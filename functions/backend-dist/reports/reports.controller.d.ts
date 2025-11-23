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
    getSalesAnalytics(period?: 'daily' | 'weekly' | 'monthly', locationId?: string): Promise<{
        period: "daily" | "weekly" | "monthly";
        from: string;
        to: string;
        locationId: string;
        totalSales: number;
        totalOrders: number;
        averageOrderValue: number;
        data: {
            period: string;
            sales: number;
            orders: number;
            items: number;
            averageOrderValue: number;
        }[];
    }>;
    getInventoryAnalytics(period?: 'daily' | 'weekly' | 'monthly', locationId?: string): Promise<{
        period: "daily" | "weekly" | "monthly";
        from: string;
        to: string;
        locationId: string;
        totalReceived: number;
        totalSold: number;
        totalReturned: number;
        netChange: number;
        data: {
            period: string;
            received: number;
            sold: number;
            returned: number;
            adjusted: number;
            transactions: number;
            netChange: number;
        }[];
    }>;
    getStaffPerformance(locationId?: string, from?: string, to?: string): Promise<{
        from: string;
        to: string;
        locationId: string;
        staffPerformance: {
            userId: string;
            userName: string;
            sales: {
                totalSales: number;
                orderCount: number;
                itemCount: number;
                averageOrderValue: number;
            };
            inventory: {
                transactions: number;
                itemsReceived: number;
                itemsSold: number;
                itemsReturned: number;
                itemsAdjusted: number;
            };
        }[];
    }>;
}
