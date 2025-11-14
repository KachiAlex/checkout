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
let ReportsService = class ReportsService {
    constructor(ordersRepository) {
        this.ordersRepository = ordersRepository;
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
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [orders_repository_1.OrdersRepository])
], ReportsService);
//# sourceMappingURL=reports.service.js.map