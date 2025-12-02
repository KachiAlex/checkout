import { OrdersRepository } from '../orders/orders.repository';
import { InventoryRepository } from '../inventory/inventory.repository';
import { UsersRepository } from '../users/users.repository';
import { ProductsService } from '../products/products.service';
import { CustomersRepository } from '../customers/customers.repository';
import { InventoryService } from '../inventory/inventory.service';
import { SuppliersRepository } from '../suppliers/suppliers.repository';
export declare class ReportsService {
    private readonly ordersRepository;
    private readonly inventoryRepository;
    private readonly usersRepository;
    private readonly productsService;
    private readonly customersRepository;
    private readonly inventoryService;
    private readonly suppliersRepository;
    constructor(ordersRepository: OrdersRepository, inventoryRepository: InventoryRepository, usersRepository: UsersRepository, productsService: ProductsService, customersRepository: CustomersRepository, inventoryService: InventoryService, suppliersRepository: SuppliersRepository);
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
    getSalesAnalytics(period: 'daily' | 'weekly' | 'monthly', locationId?: string): Promise<{
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
    getInventoryAnalytics(period: 'daily' | 'weekly' | 'monthly', locationId?: string): Promise<{
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
    getCustomerSegmentation(locationId: string | undefined, from: string | undefined, to: string | undefined, tenantId: string | undefined): Promise<{
        from: string;
        to: string;
        locationId: string;
        segments: {
            customerId: string;
            name: string;
            recencyDays: number;
            frequency: number;
            monetary: number;
            rScore: number;
            fScore: number;
            mScore: number;
            rfmScore: string;
            segment: string;
            clv: number;
        }[];
        totalCustomers: number;
        generatedAt: string;
    }>;
    getSupplierAnalytics(locationId?: string, from?: string, to?: string, tenantId?: string): Promise<{
        from: string;
        to: string;
        locationId: string;
        suppliers: any[];
        totalRevenue: number;
        totalCost: number;
        totalProfit: number;
        note: string;
        productSales?: undefined;
    } | {
        from: string;
        to: string;
        locationId: string;
        suppliers: {
            supplierId: string;
            supplierName: string;
            contactName: string;
            email: string;
            phone: string;
            active: boolean;
            revenue: number;
            cost: number;
            profit: number;
            profitMargin: number;
            productCount: number;
            orderCount: number;
            note: string;
        }[];
        totalRevenue: number;
        totalCost: number;
        totalProfit: number;
        productSales: {
            productId: string;
            productName: string;
            quantitySold: number;
            revenue: number;
            cost: number;
            profit: number;
        }[];
        note: string;
    }>;
    getPriceSensitivity(locationId?: string, from?: string, to?: string, tenantId?: string): Promise<{
        from: string;
        to: string;
        locationId: string;
        products: any[];
        note: string;
        generatedAt?: undefined;
    } | {
        from: string;
        to: string;
        locationId: string;
        products: {
            productId: string;
            productName: string;
            currentPrice: number;
            averagePrice: number;
            priceChanges: number;
            totalQuantity: number;
            totalRevenue: number;
            priceHistory: {
                week: string;
                price: number;
                quantity: number;
                revenue: number;
            }[];
            elasticity: number;
            sensitivityLevel: "high" | "medium" | "low" | "unknown";
            sensitivityScore: number;
        }[];
        generatedAt: string;
        note?: undefined;
    }>;
}
