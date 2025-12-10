import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    getSales(from?: string, to?: string, locationId?: string, limit?: string, offset?: string, req?: any): Promise<{
        from: string;
        to: string;
        locationId: string;
        totalSales: number;
        totalOrders: number;
        averageOrderValue: number;
        pagination: {
            limit: number;
            offset: number;
            total: number;
            hasMore: boolean;
        };
        orders: {
            id: string;
            orderNumber: string;
            total: number;
            createdAt: Date;
            items: {
                productId: string;
                productName: any;
                quantity: number;
                priceCents: number;
                taxCents: number;
                discountCents: number;
            }[];
        }[];
    }>;
    getTopSellers(from?: string, to?: string, locationId?: string, limit?: number, req?: any): Promise<{
        from: string;
        to: string;
        locationId: string;
        totalProducts: number;
        topSellers: {
            productId: string;
            productName: any;
            quantitySold: number;
            revenue: number;
            averagePrice: number;
        }[];
    }>;
    getSalesAnalytics(period?: 'daily' | 'weekly' | 'monthly', locationId?: string, from?: string, to?: string, req?: any): Promise<{
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
    getInventoryAnalytics(period?: 'daily' | 'weekly' | 'monthly', locationId?: string, req?: any): Promise<{
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
        inventorizedProducts: {
            totalProducts: number;
            totalCurrentStock: any;
            totalInventoryValue: number;
            totalInventorySalesValue: number;
            lowStockCount: number;
            products: {
                productId: any;
                productName: any;
                sku: any;
                quantity: any;
                reorderPoint: any;
                maxStock: any;
                costCents: any;
                salesPriceCents: any;
                inventoryValue: number;
                salesValue: number;
                isLowStock: boolean;
            }[];
        };
    }>;
    getStaffPerformance(locationId?: string, from?: string, to?: string, req?: any): Promise<{
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
        totalBatchesTracked?: undefined;
    } | {
        locationId: string;
        expiryAlerts: ({
            type: "expired";
            severity: "critical";
            productId: string;
            productName: string;
            batchNumber: string;
            message: string;
        } | {
            type: "expiring_soon";
            severity: "critical" | "warning";
            productId: string;
            productName: string;
            batchNumber: string;
            message: string;
        })[];
        expiringSoon: {
            productId: string;
            productName?: string;
            batchNumber: string;
            quantity: number;
            expiryDate: string;
            daysUntilExpiry: number;
            potentialLoss: number;
            unitCostCents?: number;
        }[];
        expiredItems: {
            productId: string;
            productName?: string;
            batchNumber: string;
            quantity: number;
            expiryDate: string;
            daysExpired: number;
            potentialLoss: number;
            unitCostCents?: number;
        }[];
        lossForecast: number;
        totalBatchesTracked: number;
        message: string;
    }>;
    getShrinkageDetection(locationId?: string, from?: string, to?: string, req?: any): Promise<{
        locationId: string;
        shrinkageAlerts: any[];
        message: string;
        from?: undefined;
        to?: undefined;
        totalDiscrepancies?: undefined;
        criticalCount?: undefined;
        warningCount?: undefined;
    } | {
        from: string;
        to: string;
        locationId: string;
        shrinkageAlerts: {
            productName: any;
            title: string;
            message: string;
            productId: string;
            actualStock: number;
            theoreticalStock: number;
            discrepancy: number;
            discrepancyPercent: number;
            severity: "critical" | "warning";
        }[];
        totalDiscrepancies: number;
        criticalCount: number;
        warningCount: number;
        message: string;
    }>;
}
