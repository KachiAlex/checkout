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
const users_repository_1 = require("../users/users.repository");
const products_service_1 = require("../products/products.service");
const customers_repository_1 = require("../customers/customers.repository");
const inventory_service_1 = require("../inventory/inventory.service");
const suppliers_repository_1 = require("../suppliers/suppliers.repository");
let ReportsService = class ReportsService {
    constructor(ordersRepository, inventoryRepository, usersRepository, productsService, customersRepository, inventoryService, suppliersRepository) {
        this.ordersRepository = ordersRepository;
        this.inventoryRepository = inventoryRepository;
        this.usersRepository = usersRepository;
        this.productsService = productsService;
        this.customersRepository = customersRepository;
        this.inventoryService = inventoryService;
        this.suppliersRepository = suppliersRepository;
    }
    async getSales(from, to, locationId) {
        const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();
        const orders = await this.ordersRepository.list({
            status: shared_1.OrderStatus.COMPLETED,
            locationId,
            from: fromDate,
            to: toDate,
        });
        const totalSales = orders.reduce((sum, order) => sum + order.totalCents, 0);
        const totalOrders = orders.length;
        return {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
            locationId,
            totalSales: totalSales / 100,
            totalOrders,
            averageOrderValue: totalOrders > 0 ? (totalSales / 100) / totalOrders : 0,
            orders: orders.map((order) => ({
                id: order.id,
                orderNumber: order.orderNumber,
                total: order.totalCents / 100,
                createdAt: order.createdAt,
            })),
        };
    }
    async getTopSellers(from, to, locationId, limit = 10) {
        const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();
        const orders = await this.ordersRepository.list({
            status: shared_1.OrderStatus.COMPLETED,
            locationId,
            from: fromDate,
            to: toDate,
        });
        const productSales = {};
        orders.forEach((order) => {
            order.items.forEach((item) => {
                const productId = item.productId;
                if (!productSales[productId]) {
                    productSales[productId] = {
                        productId,
                        quantity: 0,
                        revenue: 0,
                    };
                }
                productSales[productId].quantity += item.quantity;
                productSales[productId].revenue += item.priceCents * item.quantity;
            });
        });
        const topSellers = Object.values(productSales)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, limit)
            .map((item) => ({
            productId: item.productId,
            quantitySold: item.quantity,
            revenue: item.revenue / 100,
        }));
        return {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
            locationId,
            topSellers,
        };
    }
    async getSalesAnalytics(period, locationId) {
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
        const orders = await this.ordersRepository.list({
            status: shared_1.OrderStatus.COMPLETED,
            locationId,
            from: fromDate,
            to: now,
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
            to: now.toISOString(),
            locationId,
            totalSales,
            totalOrders,
            averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
            data,
        };
    }
    async getInventoryAnalytics(period, locationId) {
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
        const transactions = await this.inventoryRepository.listTransactions(locationId || '', fromDate, now);
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
        };
    }
    async getStaffPerformance(locationId, from, to) {
        const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();
        const orders = await this.ordersRepository.list({
            status: shared_1.OrderStatus.COMPLETED,
            locationId,
            from: fromDate,
            to: toDate,
        });
        const transactions = await this.inventoryRepository.listTransactions(locationId || '', fromDate, toDate);
        const allUsers = await this.usersRepository.findAll();
        const locationUsers = locationId
            ? allUsers.filter((u) => u.locationId === locationId)
            : allUsers;
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
        try {
            const inventoryRecords = await this.inventoryRepository.listStock(locationId);
            const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const recentOrders = await this.ordersRepository.list({
                status: shared_1.OrderStatus.COMPLETED,
                locationId,
                from: last30Days,
                to: now,
            });
            const productSalesRate = {};
            recentOrders.forEach((order) => {
                order.items.forEach((item) => {
                    if (!productSalesRate[item.productId]) {
                        productSalesRate[item.productId] = { totalSold: 0, days: 30 };
                    }
                    productSalesRate[item.productId].totalSold += item.quantity;
                });
            });
            for (const inventory of inventoryRecords) {
                const salesRate = productSalesRate[inventory.productId];
                if (salesRate && salesRate.totalSold > 0) {
                    const avgDailySales = salesRate.totalSold / salesRate.days;
                    if (avgDailySales > 0 && inventory.quantity > 0) {
                        const daysUntilStockout = Math.floor(inventory.quantity / avgDailySales);
                        if (daysUntilStockout <= 3 && daysUntilStockout > 0) {
                            const product = tenantId
                                ? await this.productsService.findByIds([inventory.productId], tenantId).then((m) => m.get(inventory.productId))
                                : null;
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
            const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const previous7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            const recentSales = await this.ordersRepository.list({
                status: shared_1.OrderStatus.COMPLETED,
                locationId,
                from: last7Days,
                to: now,
            });
            const previousSales = await this.ordersRepository.list({
                status: shared_1.OrderStatus.COMPLETED,
                locationId,
                from: previous7Days,
                to: last7Days,
            });
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
                const last60Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
                const last120Days = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);
                for (const customer of allCustomers.slice(0, 50)) {
                    const recentOrders = await this.ordersRepository.list({
                        status: shared_1.OrderStatus.COMPLETED,
                        locationId,
                        customerId: customer.id,
                        from: last60Days,
                        to: now,
                    });
                    const previousOrders = await this.ordersRepository.list({
                        status: shared_1.OrderStatus.COMPLETED,
                        locationId,
                        customerId: customer.id,
                        from: last120Days,
                        to: last60Days,
                    });
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
            for (const inventory of inventoryRecords) {
                if (inventory.reorderPoint && inventory.quantity <= inventory.reorderPoint) {
                    const product = tenantId
                        ? await this.productsService.findByIds([inventory.productId], tenantId).then((m) => m.get(inventory.productId))
                        : null;
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
        const orders = await this.ordersRepository.list({
            status: shared_1.OrderStatus.COMPLETED,
            locationId,
            from: fromDate,
            to: toDate,
        });
        const fraudAlerts = [];
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
        const allUsers = await this.usersRepository.findAll();
        const locationUsers = locationId
            ? allUsers.filter((u) => u.locationId === locationId)
            : allUsers;
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
        return {
            locationId,
            expiryAlerts: [],
            expiringSoon: [],
            expiredItems: [],
            lossForecast: 0,
            message: 'Expiry tracking requires batch inventory system with expiry dates. Feature coming soon.',
        };
    }
    async getShrinkageDetection(locationId, from, to) {
        const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();
        if (!locationId) {
            return {
                locationId,
                shrinkageAlerts: [],
                message: 'Location ID required for shrinkage detection',
            };
        }
        const inventoryRecords = await this.inventoryRepository.listStock(locationId);
        const transactions = await this.inventoryRepository.listTransactions(locationId, fromDate, toDate);
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
        inventoryRecords.forEach((inv) => {
            const theoretical = theoreticalStock[inv.productId] || 0;
            const actual = inv.quantity;
            const discrepancy = actual - theoretical;
            const discrepancyPercent = theoretical > 0 ? Math.abs((discrepancy / theoretical) * 100) : 0;
            if (Math.abs(discrepancy) > 10 || discrepancyPercent > 5) {
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
        return {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
            locationId,
            shrinkageAlerts,
            totalDiscrepancies: shrinkageAlerts.length,
            criticalCount: shrinkageAlerts.filter((a) => a.severity === 'critical').length,
            message: shrinkageAlerts.length === 0
                ? 'No significant inventory discrepancies detected.'
                : `${shrinkageAlerts.length} products have inventory discrepancies.`,
        };
    }
    async getCustomerSegmentation(locationId, from, to, tenantId) {
        if (!tenantId) {
            return {
                from,
                to,
                locationId,
                segments: [],
                totalCustomers: 0,
                generatedAt: new Date().toISOString(),
            };
        }
        const now = new Date();
        const fromDate = from ? new Date(from) : new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : now;
        const orders = await this.ordersRepository.list({
            status: shared_1.OrderStatus.COMPLETED,
            locationId,
            from: fromDate,
            to: toDate,
        });
        const byCustomer = {};
        orders.forEach((order) => {
            if (!order.customerId)
                return;
            if (!byCustomer[order.customerId]) {
                byCustomer[order.customerId] = {
                    customerId: order.customerId,
                    orderCount: 0,
                    totalCents: 0,
                    lastOrderAt: null,
                };
            }
            const bucket = byCustomer[order.customerId];
            bucket.orderCount += 1;
            bucket.totalCents += order.totalCents;
            if (!bucket.lastOrderAt || order.createdAt > bucket.lastOrderAt) {
                bucket.lastOrderAt = order.createdAt;
            }
        });
        const allCustomers = await this.customersRepository.findAll(tenantId);
        const customerMap = new Map(allCustomers.map((c) => [c.id, c]));
        const daysDiff = (a, b) => Math.max(0, Math.floor((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000)));
        const nowDate = now;
        const metrics = Object.values(byCustomer).map((c) => {
            const customer = customerMap.get(c.customerId);
            const recencyDays = c.lastOrderAt ? daysDiff(nowDate, c.lastOrderAt) : Number.MAX_SAFE_INTEGER;
            const frequency = c.orderCount;
            const monetary = c.totalCents / 100;
            return {
                customerId: c.customerId,
                name: customer?.name || `Customer ${c.customerId.substring(0, 6)}`,
                recencyDays,
                frequency,
                monetary,
            };
        });
        if (metrics.length === 0) {
            return {
                from: fromDate.toISOString(),
                to: toDate.toISOString(),
                locationId,
                segments: [],
                totalCustomers: 0,
                generatedAt: now.toISOString(),
            };
        }
        const scoreField = (values, invert = false) => {
            const sorted = [...values].sort((a, b) => a - b);
            const q = (p) => sorted[Math.floor((sorted.length - 1) * p)];
            const q20 = q(0.2);
            const q40 = q(0.4);
            const q60 = q(0.6);
            const q80 = q(0.8);
            return (value) => {
                const val = value;
                const v = invert ? -val : val;
                const v20 = invert ? -q80 : q20;
                const v40 = invert ? -q60 : q40;
                const v60 = invert ? -q40 : q60;
                const v80 = invert ? -q20 : q80;
                if (v <= v20)
                    return 1;
                if (v <= v40)
                    return 2;
                if (v <= v60)
                    return 3;
                if (v <= v80)
                    return 4;
                return 5;
            };
        };
        const recencyValues = metrics.map((m) => m.recencyDays);
        const frequencyValues = metrics.map((m) => m.frequency);
        const monetaryValues = metrics.map((m) => m.monetary);
        const scoreRecency = scoreField(recencyValues, true);
        const scoreFrequency = scoreField(frequencyValues, false);
        const scoreMonetary = scoreField(monetaryValues, false);
        const segments = metrics.map((m) => {
            const r = scoreRecency(m.recencyDays);
            const f = scoreFrequency(m.frequency);
            const mon = scoreMonetary(m.monetary);
            const rfmScore = `${r}${f}${mon}`;
            let segment;
            if (r >= 4 && f >= 4 && mon >= 4)
                segment = 'CHAMPION';
            else if (r >= 4 && f >= 3)
                segment = 'LOYAL';
            else if (r <= 2 && f >= 3)
                segment = 'AT_RISK';
            else if (r <= 2 && f <= 2)
                segment = 'LOST';
            else
                segment = 'REGULAR';
            const avgOrderValue = m.frequency > 0 ? m.monetary / m.frequency : 0;
            const periodDays = Math.max(1, daysDiff(toDate, fromDate));
            const ordersPerMonth = (m.frequency / periodDays) * 30;
            const clv = avgOrderValue * ordersPerMonth * 12;
            return {
                customerId: m.customerId,
                name: m.name,
                recencyDays: m.recencyDays,
                frequency: m.frequency,
                monetary: m.monetary,
                rScore: r,
                fScore: f,
                mScore: mon,
                rfmScore,
                segment,
                clv,
            };
        });
        return {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
            locationId,
            segments,
            totalCustomers: segments.length,
            generatedAt: now.toISOString(),
        };
    }
    async getSupplierAnalytics(locationId, from, to, tenantId) {
        const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();
        if (!tenantId) {
            return {
                from: fromDate.toISOString(),
                to: toDate.toISOString(),
                locationId,
                suppliers: [],
                totalRevenue: 0,
                totalCost: 0,
                totalProfit: 0,
                note: 'Tenant ID required for supplier analytics',
            };
        }
        const suppliers = await this.suppliersRepository.findAll(tenantId);
        const orders = await this.ordersRepository.list({
            status: shared_1.OrderStatus.COMPLETED,
            locationId,
            from: fromDate,
            to: toDate,
        });
        const allProducts = await this.productsService.findAll(undefined, locationId, tenantId);
        const productMap = new Map(allProducts.map((p) => [p.id, p]));
        const inventoryRecords = locationId
            ? await this.inventoryRepository.listStock(locationId)
            : [];
        const inventoryMap = new Map(inventoryRecords.map((inv) => [inv.productId, inv]));
        const productSales = {};
        orders.forEach((order) => {
            order.items.forEach((item) => {
                const product = productMap.get(item.productId);
                if (!product)
                    return;
                const inventory = inventoryMap.get(item.productId);
                const costCents = inventory?.costCents ?? product.costCents ?? 0;
                const revenueCents = item.priceCents * item.quantity;
                const costTotalCents = costCents * item.quantity;
                if (!productSales[item.productId]) {
                    productSales[item.productId] = {
                        productId: item.productId,
                        productName: product.name,
                        quantitySold: 0,
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                    };
                }
                productSales[item.productId].quantitySold += item.quantity;
                productSales[item.productId].revenue += revenueCents / 100;
                productSales[item.productId].cost += costTotalCents / 100;
                productSales[item.productId].profit += (revenueCents - costTotalCents) / 100;
            });
        });
        const supplierAnalytics = suppliers.map((supplier) => {
            return {
                supplierId: supplier.id,
                supplierName: supplier.name,
                contactName: supplier.contactName,
                email: supplier.email,
                phone: supplier.phone,
                active: supplier.active,
                revenue: 0,
                cost: 0,
                profit: 0,
                profitMargin: 0,
                productCount: 0,
                orderCount: 0,
                note: 'Product-supplier linking required for profit tracking',
            };
        });
        const totalRevenue = Object.values(productSales).reduce((sum, p) => sum + p.revenue, 0);
        const totalCost = Object.values(productSales).reduce((sum, p) => sum + p.cost, 0);
        const totalProfit = totalRevenue - totalCost;
        return {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
            locationId,
            suppliers: supplierAnalytics,
            totalRevenue,
            totalCost,
            totalProfit,
            productSales: Object.values(productSales).slice(0, 20),
            note: 'To enable supplier profit tracking, add supplierId field to products and link products to suppliers.',
        };
    }
    async getPriceSensitivity(locationId, from, to, tenantId) {
        const fromDate = from ? new Date(from) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();
        if (!tenantId) {
            return {
                from: fromDate.toISOString(),
                to: toDate.toISOString(),
                locationId,
                products: [],
                note: 'Tenant ID required for price sensitivity analytics',
            };
        }
        const orders = await this.ordersRepository.list({
            status: shared_1.OrderStatus.COMPLETED,
            locationId,
            from: fromDate,
            to: toDate,
        });
        const transactions = locationId
            ? await this.inventoryRepository.listTransactions(locationId, fromDate, toDate)
            : [];
        const allProducts = await this.productsService.findAll(undefined, locationId, tenantId);
        const productMap = new Map(allProducts.map((p) => [p.id, p]));
        const inventoryRecords = locationId
            ? await this.inventoryRepository.listStock(locationId)
            : [];
        const currentPrices = new Map(inventoryRecords.map((inv) => [inv.productId, inv.salesPriceCents ?? 0]));
        const productData = {};
        const weekBuckets = {};
        orders.forEach((order) => {
            const orderWeek = formatWeek(order.createdAt);
            order.items.forEach((item) => {
                const product = productMap.get(item.productId);
                if (!product)
                    return;
                if (!productData[item.productId]) {
                    productData[item.productId] = {
                        productId: item.productId,
                        productName: product.name,
                        priceHistory: [],
                        currentPrice: currentPrices.get(item.productId) ?? item.priceCents,
                        averagePrice: 0,
                        priceChanges: 0,
                        totalQuantity: 0,
                        totalRevenue: 0,
                    };
                }
                if (!weekBuckets[item.productId]) {
                    weekBuckets[item.productId] = {};
                }
                if (!weekBuckets[item.productId][orderWeek]) {
                    weekBuckets[item.productId][orderWeek] = { price: 0, quantity: 0, revenue: 0 };
                }
                const bucket = weekBuckets[item.productId][orderWeek];
                bucket.quantity += item.quantity;
                bucket.revenue += (item.priceCents * item.quantity) / 100;
                bucket.price = (bucket.price * (bucket.quantity - item.quantity) + item.priceCents) / bucket.quantity;
            });
        });
        const priceSensitivityData = Object.entries(productData).map(([productId, data]) => {
            const buckets = weekBuckets[productId] || {};
            const weeks = Object.keys(buckets).sort();
            const priceHistory = weeks.map((week) => ({
                week,
                price: buckets[week].price / 100,
                quantity: buckets[week].quantity,
                revenue: buckets[week].revenue,
            }));
            let priceChanges = 0;
            for (let i = 1; i < priceHistory.length; i++) {
                if (Math.abs(priceHistory[i].price - priceHistory[i - 1].price) > 0.01) {
                    priceChanges++;
                }
            }
            const totalPrice = priceHistory.reduce((sum, p) => sum + p.price * p.quantity, 0);
            const totalQty = priceHistory.reduce((sum, p) => sum + p.quantity, 0);
            const avgPrice = totalQty > 0 ? totalPrice / totalQty : 0;
            let elasticity = 0;
            if (priceHistory.length >= 2 && priceChanges > 0) {
                const firstHalf = priceHistory.slice(0, Math.floor(priceHistory.length / 2));
                const secondHalf = priceHistory.slice(Math.floor(priceHistory.length / 2));
                const firstAvgPrice = firstHalf.reduce((sum, p) => sum + p.price, 0) / firstHalf.length;
                const firstAvgQty = firstHalf.reduce((sum, p) => sum + p.quantity, 0) / firstHalf.length;
                const secondAvgPrice = secondHalf.reduce((sum, p) => sum + p.price, 0) / secondHalf.length;
                const secondAvgQty = secondHalf.reduce((sum, p) => sum + p.quantity, 0) / secondHalf.length;
                if (firstAvgPrice > 0 && firstAvgQty > 0) {
                    const priceChangePercent = ((secondAvgPrice - firstAvgPrice) / firstAvgPrice) * 100;
                    const qtyChangePercent = ((secondAvgQty - firstAvgQty) / firstAvgQty) * 100;
                    if (Math.abs(priceChangePercent) > 0.1) {
                        elasticity = qtyChangePercent / priceChangePercent;
                    }
                }
            }
            let sensitivityLevel;
            if (priceHistory.length < 2 || priceChanges === 0) {
                sensitivityLevel = 'unknown';
            }
            else if (Math.abs(elasticity) > 1.5) {
                sensitivityLevel = 'high';
            }
            else if (Math.abs(elasticity) > 0.5) {
                sensitivityLevel = 'medium';
            }
            else {
                sensitivityLevel = 'low';
            }
            const totalQuantity = priceHistory.reduce((sum, p) => sum + p.quantity, 0);
            const totalRevenue = priceHistory.reduce((sum, p) => sum + p.revenue, 0);
            return {
                productId: data.productId,
                productName: data.productName,
                currentPrice: data.currentPrice / 100,
                averagePrice: avgPrice,
                priceChanges,
                totalQuantity,
                totalRevenue,
                priceHistory,
                elasticity: Math.round(elasticity * 100) / 100,
                sensitivityLevel,
                sensitivityScore: Math.abs(elasticity),
            };
        });
        priceSensitivityData.sort((a, b) => b.sensitivityScore - a.sensitivityScore);
        return {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
            locationId,
            products: priceSensitivityData,
            generatedAt: new Date().toISOString(),
        };
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [orders_repository_1.OrdersRepository,
        inventory_repository_1.InventoryRepository,
        users_repository_1.UsersRepository,
        products_service_1.ProductsService,
        customers_repository_1.CustomersRepository,
        inventory_service_1.InventoryService,
        suppliers_repository_1.SuppliersRepository])
], ReportsService);
function formatWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    const year = d.getFullYear();
    const week = Math.ceil((d.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    return `${year}-W${week.toString().padStart(2, '0')}`;
}
//# sourceMappingURL=reports.service.js.map