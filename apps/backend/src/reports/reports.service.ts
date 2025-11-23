import { Injectable } from '@nestjs/common';
import { OrderStatus, InventoryTransactionType } from '@pos-checkout/shared';
import { OrdersRepository } from '../orders/orders.repository';
import { InventoryRepository } from '../inventory/inventory.repository';
import { UsersRepository } from '../users/users.repository';

@Injectable()
export class ReportsService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly usersRepository: UsersRepository,
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

  // Sales Analytics by Period
  async getSalesAnalytics(period: 'daily' | 'weekly' | 'monthly', locationId?: string) {
    const now = new Date();
    let fromDate: Date;
    let groupBy: (date: Date) => string;

    switch (period) {
      case 'daily':
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29); // Last 30 days
        groupBy = (date: Date) => date.toISOString().split('T')[0]; // YYYY-MM-DD
        break;
      case 'weekly':
        fromDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000); // Last 12 weeks
        groupBy = (date: Date) => {
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
        fromDate = new Date(now.getFullYear() - 1, now.getMonth(), 1); // Last 12 months
        groupBy = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
    }

    const orders = await this.ordersRepository.list({
      status: OrderStatus.COMPLETED,
      locationId,
      from: fromDate,
      to: now,
    });

    const grouped: Record<string, { sales: number; orders: number; items: number }> = {};

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

  // Inventory Analytics by Period
  async getInventoryAnalytics(period: 'daily' | 'weekly' | 'monthly', locationId?: string) {
    const now = new Date();
    let fromDate: Date;
    let groupBy: (date: Date) => string;

    switch (period) {
      case 'daily':
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        groupBy = (date: Date) => date.toISOString().split('T')[0];
        break;
      case 'weekly':
        fromDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
        groupBy = (date: Date) => {
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
        groupBy = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
    }

    const transactions = await this.inventoryRepository.listTransactions(locationId || '', fromDate, now);

    const grouped: Record<string, {
      received: number;
      sold: number;
      returned: number;
      adjusted: number;
      transactions: number;
    }> = {};

    transactions.forEach((tx) => {
      const key = groupBy(tx.ts);
      if (!grouped[key]) {
        grouped[key] = { received: 0, sold: 0, returned: 0, adjusted: 0, transactions: 0 };
      }
      grouped[key].transactions += 1;
      if (tx.type === InventoryTransactionType.RECEIVED) {
        grouped[key].received += Math.abs(tx.delta);
      } else if (tx.type === InventoryTransactionType.SALE) {
        grouped[key].sold += Math.abs(tx.delta);
      } else if (tx.type === InventoryTransactionType.RETURN) {
        grouped[key].returned += Math.abs(tx.delta);
      } else {
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

  // Staff Performance Analytics
  async getStaffPerformance(locationId?: string, from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    // Get all orders
    const orders = await this.ordersRepository.list({
      status: OrderStatus.COMPLETED,
      locationId,
      from: fromDate,
      to: toDate,
    });

    // Get all inventory transactions
    const transactions = await this.inventoryRepository.listTransactions(locationId || '', fromDate, toDate);

    // Get all users for the location/tenant
    const allUsers = await this.usersRepository.findAll();
    const locationUsers = locationId
      ? allUsers.filter((u) => u.locationId === locationId)
      : allUsers;

    // Aggregate sales by staff
    const staffSales: Record<string, {
      userId: string;
      userName: string;
      totalSales: number;
      orderCount: number;
      itemCount: number;
      averageOrderValue: number;
    }> = {};

    orders.forEach((order) => {
      if (!order.createdBy) return;
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

    // Calculate averages
    Object.values(staffSales).forEach((staff) => {
      staff.averageOrderValue = staff.orderCount > 0 ? staff.totalSales / staff.orderCount : 0;
    });

    // Aggregate inventory activity by staff
    const staffInventory: Record<string, {
      userId: string;
      userName: string;
      transactions: number;
      itemsReceived: number;
      itemsSold: number;
      itemsReturned: number;
      itemsAdjusted: number;
    }> = {};

    transactions.forEach((tx) => {
      if (!tx.userId) return;
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
      if (tx.type === InventoryTransactionType.RECEIVED) {
        staffInventory[tx.userId].itemsReceived += Math.abs(tx.delta);
      } else if (tx.type === InventoryTransactionType.SALE) {
        staffInventory[tx.userId].itemsSold += Math.abs(tx.delta);
      } else if (tx.type === InventoryTransactionType.RETURN) {
        staffInventory[tx.userId].itemsReturned += Math.abs(tx.delta);
      } else {
        staffInventory[tx.userId].itemsAdjusted += Math.abs(tx.delta);
      }
    });

    // Combine sales and inventory data
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

    // Sort by total sales descending
    staffPerformance.sort((a, b) => b.sales.totalSales - a.sales.totalSales);

    return {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      locationId,
      staffPerformance,
    };
  }
}
