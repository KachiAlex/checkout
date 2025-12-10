"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const shared_1 = require("@pos-checkout/shared");
const orders_repository_1 = require("../orders/orders.repository");
const inventory_repository_1 = require("../inventory/inventory.repository");
const batch_inventory_repository_1 = require("../inventory/batch-inventory.repository");
const users_repository_1 = require("../users/users.repository");
const products_service_1 = require("../products/products.service");
const customers_repository_1 = require("../customers/customers.repository");
const inventory_service_1 = require("../inventory/inventory.service");
const locations_repository_1 = require("../locations/locations.repository");
let ReportsService = class ReportsService {
    constructor(ordersRepository, inventoryRepository, batchInventoryRepository, usersRepository, productsService, customersRepository, inventoryService, locationsRepository) {
        this.ordersRepository = ordersRepository;
        this.inventoryRepository = inventoryRepository;
        this.batchInventoryRepository = batchInventoryRepository;
        this.usersRepository = usersRepository;
        this.productsService = productsService;
        this.customersRepository = customersRepository;
        this.inventoryService = inventoryService;
        this.locationsRepository = locationsRepository;
    }
    async getSales(from, to, locationId, tenantId, limit, offset) {
        try {
            const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const toDate = to ? new Date(to) : new Date();
            const toDateEndOfDay = new Date(toDate);
            toDateEndOfDay.setHours(23, 59, 59, 999);
            const effectiveLimit = limit && limit > 0 ? Math.min(limit, 1000) : 100;
            const effectiveOffset = offset && offset >= 0 ? offset : 0;
            const allOrders = await this.ordersRepository.list({
                status: shared_1.OrderStatus.COMPLETED,
                tenantId,
                locationId,
                from: fromDate,
                to: toDateEndOfDay,
            });
            const totalSales = allOrders.reduce((sum, order) => sum + order.totalCents, 0);
            const totalOrders = allOrders.length;
            const paginatedOrders = allOrders.slice(effectiveOffset, effectiveOffset + effectiveLimit);
            console.log(`📊 Sales Report Query: Found ${totalOrders} completed orders (showing ${paginatedOrders.length} from offset ${effectiveOffset}) for tenant ${tenantId || 'N/A'}, location ${locationId || 'all'}`);
            const productIds = new Set();
            paginatedOrders.forEach((order) => {
                order.items.forEach((item) => {
                    productIds.add(item.productId);
                });
            });
            const productsMap = tenantId && productIds.size > 0
                ? await this.productsService.findByIds(Array.from(productIds), tenantId)
                : new Map();
            return {
                from: fromDate.toISOString(),
                to: toDate.toISOString(),
                locationId,
                totalSales: totalSales / 100,
                totalOrders,
                averageOrderValue: totalOrders > 0 ? (totalSales / 100) / totalOrders : 0,
                pagination: {
                    limit: effectiveLimit,
                    offset: effectiveOffset,
                    total: totalOrders,
                    hasMore: effectiveOffset + effectiveLimit < totalOrders,
                },
                orders: paginatedOrders.map((order) => ({
                    id: order.id,
                    orderNumber: order.orderNumber,
                    total: order.totalCents / 100,
                    createdAt: order.createdAt,
                    items: order.items.map((item) => {
                        const product = productsMap.get(item.productId);
                        return {
                            productId: item.productId,
                            productName: product?.name || item.productId,
                            quantity: item.quantity,
                            priceCents: item.priceCents,
                            taxCents: item.taxCents,
                            discountCents: item.discountCents || 0,
                        };
                    }),
                })),
            };
        }
        catch (error) {
            console.error('❌ Error in getSales:', error);
            throw error;
        }
    }
    async getTopSellers(from, to, locationId, limit = 10, tenantId) {
        const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();
        const toDateEndOfDay = new Date(toDate);
        toDateEndOfDay.setHours(23, 59, 59, 999);
        const orders = await this.ordersRepository.list({
            status: shared_1.OrderStatus.COMPLETED,
            tenantId,
            locationId,
            from: fromDate,
            to: toDateEndOfDay,
        });
        console.log(`📊 Top Sellers Query: Aggregating ${orders.length} orders for tenant ${tenantId || 'N/A'}, location ${locationId || 'all'}`);
        const productSales = new Map();
        for (const order of orders) {
            for (const item of order.items) {
                const productId = item.productId;
                const existing = productSales.get(productId);
                if (existing) {
                    existing.quantity += item.quantity;
                    existing.revenue += item.priceCents * item.quantity;
                }
                else {
                    productSales.set(productId, {
                        productId,
                        quantity: item.quantity,
                        revenue: item.priceCents * item.quantity,
                    });
                }
            }
        }
        const topSellersData = Array.from(productSales.values())
            .sort((a, b) => {
            if (b.quantity !== a.quantity) {
                return b.quantity - a.quantity;
            }
            return b.revenue - a.revenue;
        })
            .slice(0, limit);
        const productIds = topSellersData.map((item) => item.productId);
        const productsMap = tenantId && productIds.length > 0
            ? await this.productsService.findByIds(productIds, tenantId)
            : new Map();
        const topSellers = topSellersData.map((item) => {
            const product = productsMap.get(item.productId);
            return {
                productId: item.productId,
                productName: product?.name || item.productId,
                quantitySold: item.quantity,
                revenue: item.revenue / 100,
                averagePrice: item.quantity > 0 ? (item.revenue / item.quantity) / 100 : 0,
            };
        });
        return {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
            locationId,
            totalProducts: productSales.size,
            topSellers,
        };
    }
    async getSalesAnalytics(period, locationId, from, to, tenantId) {
        const toDate = to ? new Date(to) : new Date();
        let fromDate;
        let groupBy;
        if (from) {
            fromDate = new Date(from);
        }
        else {
            switch (period) {
                case 'daily':
                    fromDate = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() - 29);
                    break;
                case 'weekly':
                    fromDate = new Date(toDate.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'monthly':
                    fromDate = new Date(toDate.getFullYear() - 1, toDate.getMonth(), 1);
                    break;
            }
        }
        switch (period) {
            case 'daily':
                groupBy = (date) => date.toISOString().split('T')[0];
                break;
            case 'weekly':
                groupBy = (date) => {
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    const year = weekStart.getFullYear();
                    const startOfYear = new Date(year, 0, 1);
                    const days = Math.floor((weekStart.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
                    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
                    return `${year}-W${String(weekNumber).padStart(2, '0')}`;
                };
                break;
            case 'monthly':
                groupBy = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                break;
        }
        const toDateEndOfDay = new Date(toDate);
        toDateEndOfDay.setHours(23, 59, 59, 999);
        const orders = await this.ordersRepository.list({
            status: shared_1.OrderStatus.COMPLETED,
            tenantId,
            locationId,
            from: fromDate,
            to: toDateEndOfDay,
        });
        const grouped = {};
        orders.forEach((order) => {
            const key = groupBy(order.createdAt);
            if (!grouped[key]) {
                grouped[key] = { sales: 0, orders: 0, items: 0 };
            }
            grouped[key].sales += order.totalCents / 100;
            grouped[key].orders += 1;
            grouped[key].items += order.items.reduce((sum, item) => sum + item.quantity, 0);
        });
        const data = Object.entries(grouped)
            .map(([period, stats]) => ({
            period,
            sales: stats.sales,
            orders: stats.orders,
            items: stats.items,
            averageOrderValue: stats.orders > 0 ? stats.sales / stats.orders : 0,
        }))
            .sort((a, b) => a.period.localeCompare(b.period));
        const totalSales = data.reduce((sum, d) => sum + d.sales, 0);
        const totalOrders = data.reduce((sum, d) => sum + d.orders, 0);
        return {
            period,
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
            locationId,
            totalSales,
            totalOrders,
            averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
            data,
        };
    }
    async getInventoryAnalytics(period, locationId, tenantId) {
        if (locationId && tenantId) {
            const location = await this.locationsRepository.findById(locationId);
            if (!location) {
                throw new Error(`Location ${locationId} not found`);
            }
            if (location.tenantId && location.tenantId !== tenantId) {
                throw new Error(`Location ${locationId} does not belong to tenant ${tenantId}`);
            }
        }
        const now = new Date();
        let fromDate;
        let groupBy;
        switch (period) {
            case 'daily':
                fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
                groupBy = (date) => date.toISOString().split('T')[0];
                break;
            case 'weekly':
                fromDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
                groupBy = (date) => {
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    const year = weekStart.getFullYear();
                    const startOfYear = new Date(year, 0, 1);
                    const days = Math.floor((weekStart.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
                    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
                    return `${year}-W${String(weekNumber).padStart(2, '0')}`;
                };
                break;
            case 'monthly':
                fromDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
                groupBy = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                break;
        }
        const [transactions, inventoryStock] = await Promise.all([
            this.inventoryRepository.listTransactions(locationId || '', fromDate, now),
            locationId ? this.inventoryRepository.listStock(locationId) : Promise.resolve([]),
        ]);
        const grouped = {};
        transactions.forEach((tx) => {
            const key = groupBy(tx.ts);
            if (!grouped[key]) {
                grouped[key] = { received: 0, sold: 0, returned: 0, adjusted: 0, transactions: 0 };
            }
            grouped[key].transactions += 1;
            if (tx.type === shared_1.InventoryTransactionType.RECEIVED) {
                grouped[key].received += Math.abs(tx.delta);
            }
            else if (tx.type === shared_1.InventoryTransactionType.SALE) {
                grouped[key].sold += Math.abs(tx.delta);
            }
            else if (tx.type === shared_1.InventoryTransactionType.RETURN) {
                grouped[key].returned += Math.abs(tx.delta);
            }
            else {
                grouped[key].adjusted += Math.abs(tx.delta);
            }
        });
        const data = Object.entries(grouped)
            .map(([period, stats]) => ({
            period,
            received: stats.received,
            sold: stats.sold,
            returned: stats.returned,
            adjusted: stats.adjusted,
            transactions: stats.transactions,
            netChange: stats.received + stats.returned - stats.sold + stats.adjusted,
        }))
            .sort((a, b) => a.period.localeCompare(b.period));
        const totalReceived = data.reduce((sum, d) => sum + d.received, 0);
        const totalSold = data.reduce((sum, d) => sum + d.sold, 0);
        const totalReturned = data.reduce((sum, d) => sum + d.returned, 0);
        const totalProductsInventorized = inventoryStock.length;
        const totalCurrentStock = inventoryStock.reduce((sum, inv) => sum + inv.quantity, 0);
        const totalInventoryValue = inventoryStock.reduce((sum, inv) => {
            const cost = inv.costCents || 0;
            return sum + (cost * inv.quantity);
        }, 0);
        const totalInventorySalesValue = inventoryStock.reduce((sum, inv) => {
            const salesPrice = inv.salesPriceCents || 0;
            return sum + (salesPrice * inv.quantity);
        }, 0);
        const lowStockProducts = inventoryStock.filter((inv) => inv.reorderPoint && inv.quantity <= inv.reorderPoint);
        const productIds = inventoryStock.map((inv) => inv.productId);
        const productsMap = tenantId && productIds.length > 0
            ? await this.productsService.findByIds(productIds, tenantId)
            : new Map();
        const inventorizedProducts = inventoryStock.map((inv) => {
            const product = productsMap.get(inv.productId);
            return {
                productId: inv.productId,
                productName: product?.name || inv.productId,
                sku: product?.sku || '—',
                quantity: inv.quantity,
                reorderPoint: inv.reorderPoint,
                maxStock: inv.maxStock,
                costCents: inv.costCents,
                salesPriceCents: inv.salesPriceCents,
                inventoryValue: (inv.costCents || 0) * inv.quantity,
                salesValue: (inv.salesPriceCents || 0) * inv.quantity,
                isLowStock: inv.reorderPoint ? inv.quantity <= inv.reorderPoint : false,
            };
        });
        return {
            period,
            from: fromDate.toISOString(),
            to: now.toISOString(),
            locationId,
            totalReceived,
            totalSold,
            totalReturned,
            netChange: totalReceived + totalReturned - totalSold,
            data,
            inventorizedProducts: {
                totalProducts: totalProductsInventorized,
                totalCurrentStock,
                totalInventoryValue: totalInventoryValue / 100,
                totalInventorySalesValue: totalInventorySalesValue / 100,
                lowStockCount: lowStockProducts.length,
                products: inventorizedProducts.sort((a, b) => b.quantity - a.quantity),
            },
        };
    }
    async getStaffPerformance(locationId, from, to, tenantId) {
        const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();
        const toDateEndOfDay = new Date(toDate);
        toDateEndOfDay.setHours(23, 59, 59, 999);
        const [orders, transactions, allUsers] = await Promise.all([
            this.ordersRepository.list({
                status: shared_1.OrderStatus.COMPLETED,
                tenantId,
                locationId,
                from: fromDate,
                to: toDateEndOfDay,
            }),
            this.inventoryRepository.listTransactions(locationId || '', fromDate, toDateEndOfDay),
            this.usersRepository.findAll(tenantId),
        ]);
        const locationUsers = allUsers;
        const staffSales = {};
        orders.forEach((order) => {
            if (!order.createdBy)
                return;
            if (!staffSales[order.createdBy]) {
                const user = locationUsers.find((u) => u.id === order.createdBy);
                staffSales[order.createdBy] = {
                    userId: order.createdBy,
                    userName: user?.name || 'Unknown',
                    totalSales: 0,
                    orderCount: 0,
                    itemCount: 0,
                    averageOrderValue: 0,
                };
            }
            staffSales[order.createdBy].totalSales += order.totalCents / 100;
            staffSales[order.createdBy].orderCount += 1;
            staffSales[order.createdBy].itemCount += order.items.reduce((sum, item) => sum + item.quantity, 0);
        });
        Object.values(staffSales).forEach((staff) => {
            staff.averageOrderValue = staff.orderCount > 0 ? staff.totalSales / staff.orderCount : 0;
        });
        const staffInventory = {};
        transactions.forEach((tx) => {
            if (!tx.userId)
                return;
            if (!staffInventory[tx.userId]) {
                const user = locationUsers.find((u) => u.id === tx.userId);
                staffInventory[tx.userId] = {
                    userId: tx.userId,
                    userName: user?.name || 'Unknown',
                    transactions: 0,
                    itemsReceived: 0,
                    itemsSold: 0,
                    itemsReturned: 0,
                    itemsAdjusted: 0,
                };
            }
            staffInventory[tx.userId].transactions += 1;
            if (tx.type === shared_1.InventoryTransactionType.RECEIVED) {
                staffInventory[tx.userId].itemsReceived += Math.abs(tx.delta);
            }
            else if (tx.type === shared_1.InventoryTransactionType.SALE) {
                staffInventory[tx.userId].itemsSold += Math.abs(tx.delta);
            }
            else if (tx.type === shared_1.InventoryTransactionType.RETURN) {
                staffInventory[tx.userId].itemsReturned += Math.abs(tx.delta);
            }
            else {
                staffInventory[tx.userId].itemsAdjusted += Math.abs(tx.delta);
            }
        });
        const allStaffIds = new Set([
            ...Object.keys(staffSales),
            ...Object.keys(staffInventory),
        ]);
        const staffPerformance = Array.from(allStaffIds).map((userId) => {
            const sales = staffSales[userId] || {
                userId,
                userName: locationUsers.find((u) => u.id === userId)?.name || 'Unknown',
                totalSales: 0,
                orderCount: 0,
                itemCount: 0,
                averageOrderValue: 0,
            };
            const inventory = staffInventory[userId] || {
                userId,
                userName: locationUsers.find((u) => u.id === userId)?.name || 'Unknown',
                transactions: 0,
                itemsReceived: 0,
                itemsSold: 0,
                itemsReturned: 0,
                itemsAdjusted: 0,
            };
            return {
                userId,
                userName: sales.userName || inventory.userName,
                sales: {
                    totalSales: sales.totalSales,
                    orderCount: sales.orderCount,
                    itemCount: sales.itemCount,
                    averageOrderValue: sales.averageOrderValue,
                },
                inventory: {
                    transactions: inventory.transactions,
                    itemsReceived: inventory.itemsReceived,
                    itemsSold: inventory.itemsSold,
                    itemsReturned: inventory.itemsReturned,
                    itemsAdjusted: inventory.itemsAdjusted,
                },
            };
        });
        staffPerformance.sort((a, b) => b.sales.totalSales - a.sales.totalSales);
        return {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
            locationId,
            staffPerformance,
        };
    }
    async getAlerts(locationId, tenantId) {
        const now = new Date();
        const alerts = [];
        if (!locationId) {
            return { alerts: [], locationId, generatedAt: now.toISOString() };
        }
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const previous7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const last60Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const last120Days = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);
        try {
            const [inventoryRecords, recentOrders] = await Promise.all([
                this.inventoryRepository.listStock(locationId),
                this.ordersRepository.list({
                    status: shared_1.OrderStatus.COMPLETED,
                    locationId,
                    from: last30Days,
                    to: now,
                }),
            ]);
            const productSalesRate = {};
            recentOrders.forEach((order) => {
                order.items.forEach((item) => {
                    if (!productSalesRate[item.productId]) {
                        productSalesRate[item.productId] = { totalSold: 0, days: 30 };
                    }
                    productSalesRate[item.productId].totalSold += item.quantity;
                });
            });
            const productIdsToFetch = inventoryRecords
                .filter((inv) => {
                const salesRate = productSalesRate[inv.productId];
                if (!salesRate || salesRate.totalSold === 0)
                    return false;
                const avgDailySales = salesRate.totalSold / salesRate.days;
                return avgDailySales > 0 && inv.quantity > 0;
            })
                .map((inv) => inv.productId);
            const productsMap = tenantId && productIdsToFetch.length > 0
                ? await this.productsService.findByIds(productIdsToFetch, tenantId)
                : new Map();
            for (const inventory of inventoryRecords) {
                const salesRate = productSalesRate[inventory.productId];
                if (salesRate && salesRate.totalSold > 0) {
                    const avgDailySales = salesRate.totalSold / salesRate.days;
                    if (avgDailySales > 0 && inventory.quantity > 0) {
                        const daysUntilStockout = Math.floor(inventory.quantity / avgDailySales);
                        if (daysUntilStockout <= 3 && daysUntilStockout > 0) {
                            const product = productsMap.get(inventory.productId);
                            alerts.push({
                                type: 'stockout',
                                severity: daysUntilStockout <= 1 ? 'critical' : 'warning',
                                title: `Stock-out Alert: ${product?.name || inventory.productId}`,
                                message: `Item will be out of stock in ${daysUntilStockout} day(s) based on current sales rate.`,
                                productId: inventory.productId,
                                productName: product?.name,
                                daysUntilStockout,
                                currentStock: inventory.quantity,
                                predictedStockoutDate: new Date(now.getTime() + daysUntilStockout * 24 * 60 * 60 * 1000).toISOString(),
                            });
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error('Error calculating stock-out predictions:', error);
        }
        try {
            const [recentSales, previousSales] = await Promise.all([
                this.ordersRepository.list({
                    status: shared_1.OrderStatus.COMPLETED,
                    locationId,
                    from: last7Days,
                    to: now,
                }),
                this.ordersRepository.list({
                    status: shared_1.OrderStatus.COMPLETED,
                    locationId,
                    from: previous7Days,
                    to: last7Days,
                }),
            ]);
            const recentTotal = recentSales.reduce((sum, o) => sum + o.totalCents, 0) / 100;
            const previousTotal = previousSales.reduce((sum, o) => sum + o.totalCents, 0) / 100;
            if (previousTotal > 0) {
                const dropPercent = ((previousTotal - recentTotal) / previousTotal) * 100;
                if (dropPercent >= 20) {
                    alerts.push({
                        type: 'low_sales',
                        severity: dropPercent >= 40 ? 'critical' : 'warning',
                        title: 'Low Sales Trend Detected',
                        message: `Sales dropped ${dropPercent.toFixed(1)}% compared to previous week. Current: ₦${recentTotal.toFixed(2)}, Previous: ₦${previousTotal.toFixed(2)}`,
                        salesDropPercent: dropPercent,
                    });
                }
            }
        }
        catch (error) {
            console.error('Error calculating low sales trends:', error);
        }
        try {
            if (tenantId && locationId) {
                const allCustomers = await this.customersRepository.findAll(tenantId);
                const limitedCustomers = allCustomers.slice(0, 50);
                const customerOrderQueries = limitedCustomers.map((customer) => Promise.all([
                    this.ordersRepository.list({
                        status: shared_1.OrderStatus.COMPLETED,
                        locationId,
                        customerId: customer.id,
                        from: last60Days,
                        to: now,
                    }),
                    this.ordersRepository.list({
                        status: shared_1.OrderStatus.COMPLETED,
                        locationId,
                        customerId: customer.id,
                        from: last120Days,
                        to: last60Days,
                    }),
                ]).then(([recentOrders, previousOrders]) => ({
                    customer,
                    recentOrders,
                    previousOrders,
                })));
                const customerOrderResults = await Promise.all(customerOrderQueries);
                for (const { customer, recentOrders, previousOrders } of customerOrderResults) {
                    if (recentOrders.length === 0 && previousOrders.length > 0) {
                        const daysSinceLastPurchase = Math.floor((now.getTime() - previousOrders[0].createdAt.getTime()) / (24 * 60 * 60 * 1000));
                        if (daysSinceLastPurchase >= 60) {
                            alerts.push({
                                type: 'customer_inactive',
                                severity: daysSinceLastPurchase >= 90 ? 'warning' : 'info',
                                title: `Customer Inactivity: ${customer.name}`,
                                message: `Customer hasn't purchased in ${daysSinceLastPurchase} days. Consider sending a promotional offer.`,
                                customerId: customer.id,
                                customerName: customer.name,
                                daysSinceLastPurchase,
                            });
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error('Error calculating customer inactivity:', error);
        }
        try {
            const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const staffPerf = await this.getStaffPerformance(locationId, last30Days.toISOString(), now.toISOString());
            if (staffPerf.staffPerformance.length > 1) {
                const salesValues = staffPerf.staffPerformance.map((s) => s.sales.totalSales);
                const maxSales = Math.max(...salesValues);
                const avgSales = salesValues.reduce((a, b) => a + b, 0) / salesValues.length;
                staffPerf.staffPerformance.forEach((staff) => {
                    if (staff.sales.totalSales < avgSales * 0.5 && maxSales > 0) {
                        const gap = ((maxSales - staff.sales.totalSales) / maxSales) * 100;
                        if (gap >= 50) {
                            alerts.push({
                                type: 'staff_performance',
                                severity: gap >= 70 ? 'warning' : 'info',
                                title: `Staff Performance Gap: ${staff.userName}`,
                                message: `${staff.userName} is performing ${gap.toFixed(1)}% below top performer. Consider additional training.`,
                                staffId: staff.userId,
                                staffName: staff.userName,
                                performanceGap: gap,
                            });
                        }
                    }
                });
            }
        }
        catch (error) {
            console.error('Error calculating staff performance gaps:', error);
        }
        try {
            const inventoryRecords = await this.inventoryRepository.listStock(locationId);
            const lowStockItems = inventoryRecords.filter((inv) => inv.reorderPoint && inv.quantity <= inv.reorderPoint);
            const productIdsToFetch = lowStockItems.map((inv) => inv.productId);
            const productsMap = tenantId && productIdsToFetch.length > 0
                ? await this.productsService.findByIds(productIdsToFetch, tenantId)
                : new Map();
            for (const inventory of lowStockItems) {
                const product = productsMap.get(inventory.productId);
                alerts.push({
                    type: 'low_stock',
                    severity: inventory.quantity === 0 ? 'critical' : 'warning',
                    title: `Low Stock: ${product?.name || inventory.productId}`,
                    message: `Current stock (${inventory.quantity}) is at or below reorder point (${inventory.reorderPoint}).`,
                    productId: inventory.productId,
                    productName: product?.name,
                    currentStock: inventory.quantity,
                });
            }
        }
        catch (error) {
            console.error('Error calculating low stock alerts:', error);
        }
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
        return {
            alerts,
            locationId,
            generatedAt: now.toISOString(),
            totalAlerts: alerts.length,
            criticalCount: alerts.filter((a) => a.severity === 'critical').length,
            warningCount: alerts.filter((a) => a.severity === 'warning').length,
        };
    }
    async getFraudDetection(locationId, from, to) {
        const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();
        const [orders, allUsers] = await Promise.all([
            this.ordersRepository.list({
                status: shared_1.OrderStatus.COMPLETED,
                locationId,
                from: fromDate,
                to: toDate,
            }),
            this.usersRepository.findAll(),
        ]);
        const fraudAlerts = [];
        const locationUsers = locationId
            ? allUsers.filter((u) => u.locationId === locationId)
            : allUsers;
        const staffDiscounts = {};
        orders.forEach((order) => {
            if (order.createdBy && order.discountCents > 0) {
                if (!staffDiscounts[order.createdBy]) {
                    staffDiscounts[order.createdBy] = { count: 0, totalDiscount: 0, totalSales: 0 };
                }
                staffDiscounts[order.createdBy].count += 1;
                staffDiscounts[order.createdBy].totalDiscount += order.discountCents;
                staffDiscounts[order.createdBy].totalSales += order.totalCents;
            }
        });
        Object.entries(staffDiscounts).forEach(([staffId, stats]) => {
            const discountRate = stats.totalSales > 0 ? (stats.totalDiscount / stats.totalSales) * 100 : 0;
            const avgDiscountPerOrder = stats.count > 0 ? stats.totalDiscount / stats.count : 0;
            if (discountRate > 15 || (stats.count / orders.filter((o) => o.createdBy === staffId).length) > 0.5) {
                const user = locationUsers.find((u) => u.id === staffId);
                fraudAlerts.push({
                    type: 'discount_abuse',
                    severity: discountRate > 25 ? 'critical' : 'warning',
                    title: `High Discount Usage: ${user?.name || staffId}`,
                    description: `${user?.name || staffId} has applied discounts to ${stats.count} orders with an average discount rate of ${discountRate.toFixed(1)}%.`,
                    staffId,
                    staffName: user?.name,
                    discountPercent: discountRate,
                });
            }
        });
        const highValueThreshold = 100000;
        orders.forEach((order) => {
            if (order.totalCents > highValueThreshold) {
                const user = locationUsers.find((u) => u.id === order.createdBy);
                fraudAlerts.push({
                    type: 'high_value_void',
                    severity: order.totalCents > highValueThreshold * 2 ? 'critical' : 'suspicious',
                    title: `High-Value Order: ${order.orderNumber}`,
                    description: `Order ${order.orderNumber} has a high value of ₦${(order.totalCents / 100).toFixed(2)}.`,
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                    staffId: order.createdBy,
                    staffName: user?.name,
                    amount: order.totalCents / 100,
                    timestamp: order.createdAt.toISOString(),
                });
            }
        });
        orders.forEach((order) => {
            const hour = order.createdAt.getHours();
            if (hour >= 23 || hour <= 2) {
                const user = locationUsers.find((u) => u.id === order.createdBy);
                fraudAlerts.push({
                    type: 'midnight_sale',
                    severity: 'suspicious',
                    title: `Midnight Sale: ${order.orderNumber}`,
                    description: `Order ${order.orderNumber} was processed at ${order.createdAt.toLocaleTimeString()} (${hour}:00).`,
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                    staffId: order.createdBy,
                    staffName: user?.name,
                    amount: order.totalCents / 100,
                    timestamp: order.createdAt.toISOString(),
                });
            }
        });
        return {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
            locationId,
            fraudAlerts,
            totalAlerts: fraudAlerts.length,
            criticalCount: fraudAlerts.filter((a) => a.severity === 'critical').length,
            warningCount: fraudAlerts.filter((a) => a.severity === 'warning').length,
        };
    }
    async getExpiryAnalytics(locationId, tenantId) {
        if (!locationId) {
            return {
                locationId,
                expiryAlerts: [],
                expiringSoon: [],
                expiredItems: [],
                lossForecast: 0,
                message: 'Location ID required for expiry analytics',
            };
        }
        if (tenantId) {
            try {
                const location = await this.locationsRepository.findById(locationId);
                if (!location) {
                    throw new Error(`Location ${locationId} not found`);
                }
                if (location.tenantId && location.tenantId !== tenantId) {
                    throw new Error(`Location ${locationId} does not belong to tenant ${tenantId}`);
                }
            }
            catch (error) {
                console.error('Error validating location in getExpiryAnalytics:', error);
                throw error;
            }
        }
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        let batchInventory = [];
        try {
            batchInventory = await this.batchInventoryRepository.findByLocation(locationId);
        }
        catch (error) {
            console.error('Error fetching batch inventory in getExpiryAnalytics:', error);
            return {
                locationId,
                expiryAlerts: [],
                expiringSoon: [],
                expiredItems: [],
                lossForecast: 0,
                totalBatchesTracked: 0,
                message: 'Failed to load batch inventory. Please try again.',
            };
        }
        const batchesWithExpiry = batchInventory.filter((batch) => batch.expiryDate && batch.quantity > 0);
        const expiringSoon = [];
        const expiredItems = [];
        const productIds = new Set(batchesWithExpiry.map((batch) => batch.productId));
        const productsMap = tenantId && productIds.size > 0
            ? await this.productsService.findByIds(Array.from(productIds), tenantId)
            : new Map();
        batchesWithExpiry.forEach((batch) => {
            if (!batch.expiryDate)
                return;
            const expiryDate = batch.expiryDate;
            const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
            const potentialLoss = (batch.unitCostCents || 0) * batch.quantity;
            const product = productsMap.get(batch.productId);
            if (expiryDate < now) {
                expiredItems.push({
                    productId: batch.productId,
                    productName: product?.name,
                    batchNumber: batch.batchNumber,
                    quantity: batch.quantity,
                    expiryDate: expiryDate.toISOString(),
                    daysExpired: Math.abs(daysUntilExpiry),
                    potentialLoss: potentialLoss / 100,
                    unitCostCents: batch.unitCostCents,
                });
            }
            else if (expiryDate <= sevenDaysFromNow) {
                expiringSoon.push({
                    productId: batch.productId,
                    productName: product?.name,
                    batchNumber: batch.batchNumber,
                    quantity: batch.quantity,
                    expiryDate: expiryDate.toISOString(),
                    daysUntilExpiry,
                    potentialLoss: potentialLoss / 100,
                    unitCostCents: batch.unitCostCents,
                });
            }
        });
        expiringSoon.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
        expiredItems.sort((a, b) => b.daysExpired - a.daysExpired);
        const totalLossForecast = [...expiringSoon, ...expiredItems].reduce((sum, item) => sum + item.potentialLoss, 0);
        return {
            locationId,
            expiryAlerts: [
                ...expiredItems.map((item) => ({
                    type: 'expired',
                    severity: 'critical',
                    productId: item.productId,
                    productName: item.productName,
                    batchNumber: item.batchNumber,
                    message: `${item.productName || item.productId} (Batch: ${item.batchNumber}) expired ${item.daysExpired} day(s) ago`,
                })),
                ...expiringSoon.map((item) => ({
                    type: 'expiring_soon',
                    severity: item.daysUntilExpiry <= 3 ? 'critical' : 'warning',
                    productId: item.productId,
                    productName: item.productName,
                    batchNumber: item.batchNumber,
                    message: `${item.productName || item.productId} (Batch: ${item.batchNumber}) expires in ${item.daysUntilExpiry} day(s)`,
                })),
            ],
            expiringSoon,
            expiredItems,
            lossForecast: totalLossForecast,
            totalBatchesTracked: batchesWithExpiry.length,
            message: batchesWithExpiry.length === 0
                ? 'No batch inventory with expiry dates found. Enable batch tracking in GRN to track expiry dates.'
                : `Tracking ${batchesWithExpiry.length} batches with expiry dates.`,
        };
    }
    async getShrinkageDetection(locationId, from, to, tenantId) {
        const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();
        if (!locationId) {
            return {
                locationId,
                shrinkageAlerts: [],
                message: 'Location ID required for shrinkage detection',
            };
        }
        const [inventoryRecords, transactions] = await Promise.all([
            this.inventoryRepository.listStock(locationId),
            this.inventoryRepository.listTransactions(locationId, fromDate, toDate),
        ]);
        const theoreticalStock = {};
        const initialStock = {};
        inventoryRecords.forEach((inv) => {
            theoreticalStock[inv.productId] = inv.quantity;
            initialStock[inv.productId] = inv.quantity;
        });
        transactions.reverse().forEach((tx) => {
            if (!theoreticalStock[tx.productId]) {
                theoreticalStock[tx.productId] = 0;
            }
            if (tx.type === shared_1.InventoryTransactionType.SALE) {
                theoreticalStock[tx.productId] += Math.abs(tx.delta);
            }
            else if (tx.type === shared_1.InventoryTransactionType.RECEIVED) {
                theoreticalStock[tx.productId] -= Math.abs(tx.delta);
            }
            else if (tx.type === shared_1.InventoryTransactionType.RETURN) {
                theoreticalStock[tx.productId] -= Math.abs(tx.delta);
            }
            else {
                theoreticalStock[tx.productId] -= tx.delta;
            }
        });
        const shrinkageAlerts = [];
        const productIdsToFetch = [];
        inventoryRecords.forEach((inv) => {
            const theoretical = theoreticalStock[inv.productId] || 0;
            const actual = inv.quantity;
            const discrepancy = actual - theoretical;
            const discrepancyPercent = theoretical > 0 ? Math.abs((discrepancy / theoretical) * 100) : 0;
            if (Math.abs(discrepancy) > 10 || discrepancyPercent > 5) {
                productIdsToFetch.push(inv.productId);
                shrinkageAlerts.push({
                    productId: inv.productId,
                    actualStock: actual,
                    theoreticalStock: theoretical,
                    discrepancy,
                    discrepancyPercent,
                    severity: Math.abs(discrepancy) > 50 || discrepancyPercent > 20 ? 'critical' : 'warning',
                });
            }
        });
        const productsMap = tenantId && productIdsToFetch.length > 0
            ? await this.productsService.findByIds(productIdsToFetch, tenantId)
            : new Map();
        const enrichedAlerts = shrinkageAlerts.map((alert) => {
            const product = productsMap.get(alert.productId);
            const productName = product?.name || alert.productId;
            return {
                ...alert,
                productName,
                title: `Inventory Discrepancy: ${productName}`,
                message: `Actual stock (${alert.actualStock}) differs from theoretical stock (${alert.theoreticalStock}) by ${Math.abs(alert.discrepancy)} units (${alert.discrepancyPercent.toFixed(1)}%).`,
            };
        });
        return {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
            locationId,
            shrinkageAlerts: enrichedAlerts,
            totalDiscrepancies: enrichedAlerts.length,
            criticalCount: enrichedAlerts.filter((a) => a.severity === 'critical').length,
            warningCount: enrichedAlerts.filter((a) => a.severity === 'warning').length,
            message: enrichedAlerts.length === 0
                ? 'No significant inventory discrepancies detected.'
                : `${enrichedAlerts.length} products have inventory discrepancies.`,
        };
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [orders_repository_1.OrdersRepository,
        inventory_repository_1.InventoryRepository,
        batch_inventory_repository_1.BatchInventoryRepository,
        users_repository_1.UsersRepository,
        products_service_1.ProductsService,
        customers_repository_1.CustomersRepository,
        inventory_service_1.InventoryService,
        locations_repository_1.LocationsRepository])
], ReportsService);
//# sourceMappingURL=reports.service.js.map