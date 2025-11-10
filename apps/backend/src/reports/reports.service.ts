import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@pos-checkout/shared';
import { OrdersRepository } from '../orders/orders.repository';

@Injectable()
export class ReportsService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
  ) {}

  async getSales(from?: string, to?: string, locationId?: string) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const toDate = to ? new Date(to) : new Date();

    const orders = await this.ordersRepository.list({
      status: OrderStatus.COMPLETED,
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
      totalSales: totalSales / 100, // Convert cents to currency units
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

  async getTopSellers(from?: string, to?: string, locationId?: string, limit: number = 10) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const orders = await this.ordersRepository.list({
      status: OrderStatus.COMPLETED,
      locationId,
      from: fromDate,
      to: toDate,
    });

    // Aggregate product sales
    const productSales: Record<string, { productId: string; quantity: number; revenue: number }> = {};

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

    // Sort by quantity and take top N
    const topSellers = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit)
      .map((item) => ({
        productId: item.productId,
        quantitySold: item.quantity,
        revenue: item.revenue / 100, // Convert cents to currency units
      }));

    return {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      locationId,
      topSellers,
    };
  }
}
