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
            items: {
                productId: string;
                quantity: number;
                priceCents: number;
                taxCents: number;
                discountCents: number;
            }[];
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
    getAlerts(locationId?: string, req?: any): Promise<{
        alerts: any[];
        locationId: string;
        generatedAt: string;
        totalAlerts?: undefined;
        criticalCount?: undefined;
        warningCount?: undefined;
    } | {
        alerts: {
            type: "stockout" | "low_sales" | "customer_inactive" | "staff_performance" | "low_stock";
            severity: "critical" | "warning" | "info";
            title: string;
            message: string;
            productId?: string;
            productName?: string;
            customerId?: string;
            customerName?: string;
            staffId?: string;
            staffName?: string;
            daysUntilStockout?: number;
            currentStock?: number;
            predictedStockoutDate?: string;
            salesDropPercent?: number;
            daysSinceLastPurchase?: number;
            performanceGap?: number;
        }[];
        locationId: string;
        generatedAt: string;
        totalAlerts: number;
        criticalCount: number;
        warningCount: number;
    }>;
    getFraudDetection(locationId?: string, from?: string, to?: string): Promise<{
        from: string;
        to: string;
        locationId: string;
        fraudAlerts: {
            type: "discount_abuse" | "ghost_refund" | "high_value_void" | "midnight_sale" | "below_cost";
            severity: "critical" | "warning" | "suspicious";
            title: string;
            description: string;
            orderId?: string;
            orderNumber?: string;
            staffId?: string;
            staffName?: string;
            customerId?: string;
            amount?: number;
            discountPercent?: number;
            timestamp?: string;
        }[];
        totalAlerts: number;
        criticalCount: number;
        warningCount: number;
    }>;
    getExpiryAnalytics(locationId?: string, req?: any): Promise<{
        locationId: string;
        expiryAlerts: any[];
        expiringSoon: any[];
        expiredItems: any[];
        lossForecast: number;
        message: string;
    }>;
    getShrinkageDetection(locationId?: string, from?: string, to?: string): Promise<{
        locationId: string;
        shrinkageAlerts: any[];
        message: string;
        from?: undefined;
        to?: undefined;
        totalDiscrepancies?: undefined;
        criticalCount?: undefined;
    } | {
        from: string;
        to: string;
        locationId: string;
        shrinkageAlerts: {
            productId: string;
            productName?: string;
            actualStock: number;
            theoreticalStock: number;
            discrepancy: number;
            discrepancyPercent: number;
            severity: "critical" | "warning";
        }[];
        totalDiscrepancies: number;
        criticalCount: number;
        message: string;
    }>;
}
