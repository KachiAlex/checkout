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
let ReportsService = class ReportsService {
    constructor(ordersRepository, inventoryRepository, usersRepository) {
        this.ordersRepository = ordersRepository;
        this.inventoryRepository = inventoryRepository;
        this.usersRepository = usersRepository;
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
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [orders_repository_1.OrdersRepository,
        inventory_repository_1.InventoryRepository,
        users_repository_1.UsersRepository])
], ReportsService);
//# sourceMappingURL=reports.service.js.map