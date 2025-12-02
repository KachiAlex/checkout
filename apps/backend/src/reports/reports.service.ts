import { Injectable } from '@nestjs/common';
import { OrderStatus, InventoryTransactionType } from '@pos-checkout/shared';
import { OrdersRepository } from '../orders/orders.repository';
import { InventoryRepository } from '../inventory/inventory.repository';
import { UsersRepository } from '../users/users.repository';
import { ProductsService } from '../products/products.service';
import { CustomersRepository } from '../customers/customers.repository';
import { InventoryService } from '../inventory/inventory.service';
import { SuppliersRepository } from '../suppliers/suppliers.repository';

@Injectable()
export class ReportsService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly usersRepository: UsersRepository,
    private readonly productsService: ProductsService,
    private readonly customersRepository: CustomersRepository,
    private readonly inventoryService: InventoryService,
    private readonly suppliersRepository: SuppliersRepository,
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

  // ========== PHASE 1: SMART ALERTS SYSTEM ==========
  async getAlerts(locationId?: string, tenantId?: string) {
    const now = new Date();
    const alerts: Array<{
      type: 'stockout' | 'low_sales' | 'customer_inactive' | 'staff_performance' | 'low_stock';
      severity: 'critical' | 'warning' | 'info';
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
    }> = [];

    if (!locationId) {
      return { alerts: [], locationId, generatedAt: now.toISOString() };
    }

    // 1. Stock-out predictions (3 days ahead)
    try {
      const inventoryRecords = await this.inventoryRepository.listStock(locationId);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recentOrders = await this.ordersRepository.list({
        status: OrderStatus.COMPLETED,
        locationId,
        from: last30Days,
        to: now,
      });

      // Calculate average daily sales per product
      const productSalesRate: Record<string, { totalSold: number; days: number }> = {};
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
    } catch (error) {
      console.error('Error calculating stock-out predictions:', error);
    }

    // 2. Low sales trends (compare last 7 days vs previous 7 days)
    try {
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const previous7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      
      const recentSales = await this.ordersRepository.list({
        status: OrderStatus.COMPLETED,
        locationId,
        from: last7Days,
        to: now,
      });
      const previousSales = await this.ordersRepository.list({
        status: OrderStatus.COMPLETED,
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
    } catch (error) {
      console.error('Error calculating low sales trends:', error);
    }

    // 3. Customer inactivity (customers who haven't purchased in 60+ days but used to purchase regularly)
    try {
      if (tenantId && locationId) {
        const allCustomers = await this.customersRepository.findAll(tenantId);
        const last60Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const last120Days = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);

        for (const customer of allCustomers.slice(0, 50)) { // Limit to first 50 to avoid performance issues
          const recentOrders = await this.ordersRepository.list({
            status: OrderStatus.COMPLETED,
            locationId,
            customerId: customer.id,
            from: last60Days,
            to: now,
          });
          const previousOrders = await this.ordersRepository.list({
            status: OrderStatus.COMPLETED,
            locationId,
            customerId: customer.id,
            from: last120Days,
            to: last60Days,
          });

          if (recentOrders.length === 0 && previousOrders.length > 0) {
            const daysSinceLastPurchase = Math.floor(
              (now.getTime() - previousOrders[0].createdAt.getTime()) / (24 * 60 * 60 * 1000)
            );
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
    } catch (error) {
      console.error('Error calculating customer inactivity:', error);
    }

    // 4. Staff performance differences (identify significant gaps)
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
    } catch (error) {
      console.error('Error calculating staff performance gaps:', error);
    }

    // 5. Low stock alerts (using reorder point)
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
    } catch (error) {
      console.error('Error calculating low stock alerts:', error);
    }

    // Sort alerts by severity (critical first)
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

  // ========== PHASE 1: FRAUD DETECTION MODULE ==========
  async getFraudDetection(locationId?: string, from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const orders = await this.ordersRepository.list({
      status: OrderStatus.COMPLETED,
      locationId,
      from: fromDate,
      to: toDate,
    });

    const fraudAlerts: Array<{
      type: 'discount_abuse' | 'ghost_refund' | 'high_value_void' | 'midnight_sale' | 'below_cost';
      severity: 'critical' | 'warning' | 'suspicious';
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
    }> = [];

    // 1. Discount abuse detection (per staff)
    const staffDiscounts: Record<string, { count: number; totalDiscount: number; totalSales: number }> = {};
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
      
      // Alert if discount rate > 15% or if staff uses discounts in > 50% of orders
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

    // 2. Ghost refund detection (refunds without matching sales - would need returns data)
    // This is a placeholder - would need returns/refunds repository

    // 3. High-value voids (orders with very high values)
    const highValueThreshold = 100000; // ₦1,000 in cents
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

    // 4. Midnight sales (sales between 11 PM and 2 AM)
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

    // 5. Items sold below cost price
    // This would require product cost data from inventory
    // Placeholder for now

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

  // ========== PHASE 1: EXPIRY & BATCH ANALYTICS ==========
  async getExpiryAnalytics(locationId?: string, tenantId?: string) {
    // Note: This requires expiry date tracking in inventory/batch system
    // For now, this is a placeholder structure
    // Would need batch inventory repository with expiry dates

    return {
      locationId,
      expiryAlerts: [],
      expiringSoon: [], // Items expiring in next 7 days
      expiredItems: [], // Already expired items
      lossForecast: 0, // Potential loss if expiring items aren't sold
      message: 'Expiry tracking requires batch inventory system with expiry dates. Feature coming soon.',
    };
  }

  // ========== PHASE 1: SHRINKAGE DETECTION ==========
  async getShrinkageDetection(locationId?: string, from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    if (!locationId) {
      return {
        locationId,
        shrinkageAlerts: [],
        message: 'Location ID required for shrinkage detection',
      };
    }

    // Get all inventory records
    const inventoryRecords = await this.inventoryRepository.listStock(locationId);
    
    // Get all transactions in the period
    const transactions = await this.inventoryRepository.listTransactions(locationId, fromDate, toDate);

    // Calculate theoretical stock based on transactions
    const theoreticalStock: Record<string, number> = {};
    const initialStock: Record<string, number> = {};

    // Initialize with current stock (we'll work backwards)
    inventoryRecords.forEach((inv) => {
      theoreticalStock[inv.productId] = inv.quantity;
      initialStock[inv.productId] = inv.quantity;
    });

    // Calculate theoretical stock by reversing transactions
    transactions.reverse().forEach((tx) => {
      if (!theoreticalStock[tx.productId]) {
        theoreticalStock[tx.productId] = 0;
      }
      
      // Reverse the transaction to get theoretical starting point
      if (tx.type === InventoryTransactionType.SALE) {
        theoreticalStock[tx.productId] += Math.abs(tx.delta); // Add back what was sold
      } else if (tx.type === InventoryTransactionType.RECEIVED) {
        theoreticalStock[tx.productId] -= Math.abs(tx.delta); // Remove what was received
      } else if (tx.type === InventoryTransactionType.RETURN) {
        theoreticalStock[tx.productId] -= Math.abs(tx.delta); // Remove what was returned
      } else {
        // Adjustment - reverse it
        theoreticalStock[tx.productId] -= tx.delta;
      }
    });

    const shrinkageAlerts: Array<{
      productId: string;
      productName?: string;
      actualStock: number;
      theoreticalStock: number;
      discrepancy: number;
      discrepancyPercent: number;
      severity: 'critical' | 'warning';
    }> = [];

    // Compare actual vs theoretical
    inventoryRecords.forEach((inv) => {
      const theoretical = theoreticalStock[inv.productId] || 0;
      const actual = inv.quantity;
      const discrepancy = actual - theoretical;
      const discrepancyPercent = theoretical > 0 ? Math.abs((discrepancy / theoretical) * 100) : 0;

      // Alert if discrepancy is significant (> 5% or > 10 units)
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

  // ========== CUSTOMER SEGMENTATION (RFM + CLV) ==========
  async getCustomerSegmentation(locationId: string | undefined, from: string | undefined, to: string | undefined, tenantId: string | undefined) {
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
    const fromDate = from ? new Date(from) : new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); // default 6 months
    const toDate = to ? new Date(to) : now;

    // Load all completed orders in the window
    const orders = await this.ordersRepository.list({
      status: OrderStatus.COMPLETED,
      locationId,
      from: fromDate,
      to: toDate,
    });

    // Group orders by customer
    const byCustomer: Record<string, {
      customerId: string;
      orderCount: number;
      totalCents: number;
      lastOrderAt: Date | null;
    }> = {};

    orders.forEach((order) => {
      if (!order.customerId) return;
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

    // Load customer records for the IDs we have
    const allCustomers = await this.customersRepository.findAll(tenantId);
    const customerMap = new Map(allCustomers.map((c) => [c.id, c]));

    const daysDiff = (a: Date, b: Date) => Math.max(0, Math.floor((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000)));

    // Build raw metrics
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

    // Helper to score 1-5 using quantiles
    const scoreField = (values: number[], invert = false) => {
      const sorted = [...values].sort((a, b) => a - b);
      const q = (p: number) => sorted[Math.floor((sorted.length - 1) * p)];
      const q20 = q(0.2);
      const q40 = q(0.4);
      const q60 = q(0.6);
      const q80 = q(0.8);

      return (value: number) => {
        const val = value;
        const v = invert ? -val : val;
        const v20 = invert ? -q80 : q20;
        const v40 = invert ? -q60 : q40;
        const v60 = invert ? -q40 : q60;
        const v80 = invert ? -q20 : q80;

        if (v <= v20) return 1;
        if (v <= v40) return 2;
        if (v <= v60) return 3;
        if (v <= v80) return 4;
        return 5;
      };
    };

    const recencyValues = metrics.map((m) => m.recencyDays);
    const frequencyValues = metrics.map((m) => m.frequency);
    const monetaryValues = metrics.map((m) => m.monetary);

    const scoreRecency = scoreField(recencyValues, true); // lower days = better
    const scoreFrequency = scoreField(frequencyValues, false);
    const scoreMonetary = scoreField(monetaryValues, false);

    const segments = metrics.map((m) => {
      const r = scoreRecency(m.recencyDays);
      const f = scoreFrequency(m.frequency);
      const mon = scoreMonetary(m.monetary);
      const rfmScore = `${r}${f}${mon}`;

      let segment: string;
      if (r >= 4 && f >= 4 && mon >= 4) segment = 'CHAMPION';
      else if (r >= 4 && f >= 3) segment = 'LOYAL';
      else if (r <= 2 && f >= 3) segment = 'AT_RISK';
      else if (r <= 2 && f <= 2) segment = 'LOST';
      else segment = 'REGULAR';

      // Simple CLV estimate: avg order value * frequency per month * 12 months
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

  // ========== PHASE B: SUPPLIER ANALYTICS ==========
  async getSupplierAnalytics(locationId?: string, from?: string, to?: string, tenantId?: string) {
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

    // Get all suppliers
    const suppliers = await this.suppliersRepository.findAll(tenantId);

    // Get all orders in the period
    const orders = await this.ordersRepository.list({
      status: OrderStatus.COMPLETED,
      locationId,
      from: fromDate,
      to: toDate,
    });

    // Get all products to map productId to product info
    const allProducts = await this.productsService.findAll(undefined, locationId, tenantId);
    const productMap = new Map(allProducts.map((p) => [p.id, p]));

    // Get inventory records for cost data
    const inventoryRecords = locationId
      ? await this.inventoryRepository.listStock(locationId)
      : [];
    const inventoryMap = new Map(inventoryRecords.map((inv) => [inv.productId, inv]));

    // Aggregate sales by product (we'll note that supplier linking is needed)
    const productSales: Record<string, {
      productId: string;
      productName: string;
      quantitySold: number;
      revenue: number;
      cost: number;
      profit: number;
    }> = {};

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const product = productMap.get(item.productId);
        if (!product) return;

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

    // For now, since products don't have supplierId, we'll show all suppliers
    // with a note that profit tracking requires product-supplier linking
    const supplierAnalytics = suppliers.map((supplier) => {
      // TODO: When products have supplierId, filter productSales by supplier
      // For now, return basic supplier info
      return {
        supplierId: supplier.id,
        supplierName: supplier.name,
        contactName: supplier.contactName,
        email: supplier.email,
        phone: supplier.phone,
        active: supplier.active,
        // Placeholder values until product-supplier linking is implemented
        revenue: 0,
        cost: 0,
        profit: 0,
        profitMargin: 0,
        productCount: 0,
        orderCount: 0,
        note: 'Product-supplier linking required for profit tracking',
      };
    });

    // Calculate totals from all product sales
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
      productSales: Object.values(productSales).slice(0, 20), // Top 20 products for reference
      note: 'To enable supplier profit tracking, add supplierId field to products and link products to suppliers.',
    };
  }

  // ========== PHASE B: PRICE SENSITIVITY ANALYTICS ==========
  async getPriceSensitivity(locationId?: string, from?: string, to?: string, tenantId?: string) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days for price history
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

    // Get all orders in the period
    const orders = await this.ordersRepository.list({
      status: OrderStatus.COMPLETED,
      locationId,
      from: fromDate,
      to: toDate,
    });

    // Get inventory transactions to track price changes
    const transactions = locationId
      ? await this.inventoryRepository.listTransactions(locationId, fromDate, toDate)
      : [];

    // Get all products
    const allProducts = await this.productsService.findAll(undefined, locationId, tenantId);
    const productMap = new Map(allProducts.map((p) => [p.id, p]));

    // Get current inventory prices
    const inventoryRecords = locationId
      ? await this.inventoryRepository.listStock(locationId)
      : [];
    const currentPrices = new Map(
      inventoryRecords.map((inv) => [inv.productId, inv.salesPriceCents ?? 0])
    );

    // Group orders by product and time period (weekly buckets)
    const productData: Record<string, {
      productId: string;
      productName: string;
      priceHistory: Array<{ week: string; price: number; quantity: number; revenue: number }>;
      currentPrice: number;
      averagePrice: number;
      priceChanges: number;
      totalQuantity: number;
      totalRevenue: number;
    }> = {};

    // Create weekly buckets
    const weekBuckets: Record<string, Record<string, { price: number; quantity: number; revenue: number }>> = {};

    orders.forEach((order) => {
      const orderWeek = formatWeek(order.createdAt);
      order.items.forEach((item) => {
        const product = productMap.get(item.productId);
        if (!product) return;

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
        // Use average price for the week
        bucket.price = (bucket.price * (bucket.quantity - item.quantity) + item.priceCents) / bucket.quantity;
      });
    });

    // Build price history and calculate sensitivity
    const priceSensitivityData = Object.entries(productData).map(([productId, data]) => {
      const buckets = weekBuckets[productId] || {};
      const weeks = Object.keys(buckets).sort();
      
      const priceHistory = weeks.map((week) => ({
        week,
        price: buckets[week].price / 100, // Convert to currency units
        quantity: buckets[week].quantity,
        revenue: buckets[week].revenue,
      }));

      // Calculate price changes
      let priceChanges = 0;
      for (let i = 1; i < priceHistory.length; i++) {
        if (Math.abs(priceHistory[i].price - priceHistory[i - 1].price) > 0.01) {
          priceChanges++;
        }
      }

      // Calculate average price
      const totalPrice = priceHistory.reduce((sum, p) => sum + p.price * p.quantity, 0);
      const totalQty = priceHistory.reduce((sum, p) => sum + p.quantity, 0);
      const avgPrice = totalQty > 0 ? totalPrice / totalQty : 0;

      // Calculate price elasticity (simplified)
      // Price elasticity = % change in quantity / % change in price
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

      // Determine sensitivity level
      let sensitivityLevel: 'high' | 'medium' | 'low' | 'unknown';
      if (priceHistory.length < 2 || priceChanges === 0) {
        sensitivityLevel = 'unknown';
      } else if (Math.abs(elasticity) > 1.5) {
        sensitivityLevel = 'high';
      } else if (Math.abs(elasticity) > 0.5) {
        sensitivityLevel = 'medium';
      } else {
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

    // Sort by sensitivity score (most sensitive first)
    priceSensitivityData.sort((a, b) => b.sensitivityScore - a.sensitivityScore);

    return {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      locationId,
      products: priceSensitivityData,
      generatedAt: new Date().toISOString(),
    };
  }
}

// Helper function to format date as week string (YYYY-WW)
function formatWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
  const year = d.getFullYear();
  const week = Math.ceil((d.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${year}-W${week.toString().padStart(2, '0')}`;
}
