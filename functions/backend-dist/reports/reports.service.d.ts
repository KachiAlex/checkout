import { OrdersRepository } from '../orders/orders.repository';
import { InventoryRepository } from '../inventory/inventory.repository';
import { BatchInventoryRepository } from '../inventory/batch-inventory.repository';
import { UsersRepository } from '../users/users.repository';
import { ProductsService } from '../products/products.service';
import { CustomersRepository } from '../customers/customers.repository';
import { InventoryService } from '../inventory/inventory.service';
import { LocationsRepository } from '../locations/locations.repository';
export declare class ReportsService {
    private readonly ordersRepository;
    private readonly inventoryRepository;
    private readonly batchInventoryRepository;
    private readonly usersRepository;
    private readonly productsService;
    private readonly customersRepository;
    private readonly inventoryService;
    private readonly locationsRepository;
    constructor(ordersRepository: OrdersRepository, inventoryRepository: InventoryRepository, batchInventoryRepository: BatchInventoryRepository, usersRepository: UsersRepository, productsService: ProductsService, customersRepository: CustomersRepository, inventoryService: InventoryService, locationsRepository: LocationsRepository);
    getSales(from?: string, to?: string, locationId?: string, tenantId?: string, limit?: number, offset?: number): Promise<{
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
    getTopSellers(from?: string, to?: string, locationId?: string, limit?: number, tenantId?: string): Promise<{
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
    getSalesAnalytics(period: 'daily' | 'weekly' | 'monthly', locationId?: string, from?: string, to?: string, tenantId?: string): Promise<{
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
    getInventoryAnalytics(period: 'daily' | 'weekly' | 'monthly', locationId?: string, tenantId?: string): Promise<{
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
    getStaffPerformance(locationId?: string, from?: string, to?: string, tenantId?: string): Promise<{
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
    getAlerts(locationId?: string, tenantId?: string): Promise<{
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
    getExpiryAnalytics(locationId?: string, tenantId?: string): Promise<{
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
    getShrinkageDetection(locationId?: string, from?: string, to?: string, tenantId?: string): Promise<{
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
