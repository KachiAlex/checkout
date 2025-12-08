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
        items: order.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          priceCents: item.priceCents,
          taxCents: item.taxCents,
          discountCents: item.discountCents || 0,
        })),
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

  // Staff Performance Analytics - OPTIMIZED with parallel queries
  async getStaffPerformance(locationId?: string, from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    // Parallelize independent queries for better performance
    const [orders, transactions, allUsers] = await Promise.all([
      this.ordersRepository.list({
        status: OrderStatus.COMPLETED,
        locationId,
        from: fromDate,
        to: toDate,
      }),
      this.inventoryRepository.listTransactions(locationId || '', fromDate, toDate),
      this.usersRepository.findAll(),
    ]);

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

    // Parallelize independent queries for better performance
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previous7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const last60Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const last120Days = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);

    // 1. Stock-out predictions (3 days ahead) - OPTIMIZED with batch product lookup
    try {
      const [inventoryRecords, recentOrders] = await Promise.all([
        this.inventoryRepository.listStock(locationId),
        this.ordersRepository.list({
          status: OrderStatus.COMPLETED,
          locationId,
          from: last30Days,
          to: now,
        }),
      ]);

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

      // Batch fetch all products at once instead of individual queries
      const productIdsToFetch = inventoryRecords
        .filter((inv) => {
          const salesRate = productSalesRate[inv.productId];
          if (!salesRate || salesRate.totalSold === 0) return false;
          const avgDailySales = salesRate.totalSold / salesRate.days;
          return avgDailySales > 0 && inv.quantity > 0;
        })
        .map((inv) => inv.productId);

      const productsMap = tenantId && productIdsToFetch.length > 0
        ? await this.productsService.findByIds(productIdsToFetch, tenantId)
        : new Map<string, any>();

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
    } catch (error) {
      console.error('Error calculating stock-out predictions:', error);
    }

    // 2. Low sales trends (compare last 7 days vs previous 7 days) - OPTIMIZED with parallel queries
    try {
      const [recentSales, previousSales] = await Promise.all([
        this.ordersRepository.list({
          status: OrderStatus.COMPLETED,
          locationId,
          from: last7Days,
          to: now,
        }),
        this.ordersRepository.list({
          status: OrderStatus.COMPLETED,
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
    } catch (error) {
      console.error('Error calculating low sales trends:', error);
    }

    // 3. Customer inactivity (customers who haven't purchased in 60+ days but used to purchase regularly)
    // OPTIMIZED: Batch customer order queries instead of individual queries per customer
    try {
      if (tenantId && locationId) {
        const allCustomers = await this.customersRepository.findAll(tenantId);
        const limitedCustomers = allCustomers.slice(0, 50); // Limit to first 50 to avoid performance issues

        // Fetch all orders for these customers in parallel batches
        const customerOrderQueries = limitedCustomers.map((customer) =>
          Promise.all([
            this.ordersRepository.list({
              status: OrderStatus.COMPLETED,
              locationId,
              customerId: customer.id,
              from: last60Days,
              to: now,
            }),
            this.ordersRepository.list({
              status: OrderStatus.COMPLETED,
              locationId,
              customerId: customer.id,
              from: last120Days,
              to: last60Days,
            }),
          ]).then(([recentOrders, previousOrders]) => ({
            customer,
            recentOrders,
            previousOrders,
          }))
        );

        const customerOrderResults = await Promise.all(customerOrderQueries);

        for (const { customer, recentOrders, previousOrders } of customerOrderResults) {
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

    // 5. Low stock alerts (using reorder point) - OPTIMIZED with batch product lookup
    try {
      const inventoryRecords = await this.inventoryRepository.listStock(locationId);
      const lowStockItems = inventoryRecords.filter(
        (inv) => inv.reorderPoint && inv.quantity <= inv.reorderPoint
      );

      // Batch fetch all products at once
      const productIdsToFetch = lowStockItems.map((inv) => inv.productId);
      const productsMap = tenantId && productIdsToFetch.length > 0
        ? await this.productsService.findByIds(productIdsToFetch, tenantId)
        : new Map<string, any>();

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
  // OPTIMIZED with parallel queries
  async getFraudDetection(locationId?: string, from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    // Parallelize orders and users queries
    const [orders, allUsers] = await Promise.all([
      this.ordersRepository.list({
        status: OrderStatus.COMPLETED,
        locationId,
        from: fromDate,
        to: toDate,
      }),
      this.usersRepository.findAll(),
    ]);

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

    const locationUsers = locationId
      ? allUsers.filter((u) => u.locationId === locationId)
      : allUsers;

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
  // OPTIMIZED with parallel queries and batch product lookup
  async getShrinkageDetection(locationId?: string, from?: string, to?: string, tenantId?: string) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    if (!locationId) {
      return {
        locationId,
        shrinkageAlerts: [],
        message: 'Location ID required for shrinkage detection',
      };
    }

    // Parallelize inventory and transactions queries
    const [inventoryRecords, transactions] = await Promise.all([
      this.inventoryRepository.listStock(locationId),
      this.inventoryRepository.listTransactions(locationId, fromDate, toDate),
    ]);

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

    // Compare actual vs theoretical and collect product IDs for batch lookup
    const productIdsToFetch: string[] = [];
    inventoryRecords.forEach((inv) => {
      const theoretical = theoreticalStock[inv.productId] || 0;
      const actual = inv.quantity;
      const discrepancy = actual - theoretical;
      const discrepancyPercent = theoretical > 0 ? Math.abs((discrepancy / theoretical) * 100) : 0;

      // Alert if discrepancy is significant (> 5% or > 10 units)
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

    // Batch fetch product names if tenantId is available
    const productsMap = tenantId && productIdsToFetch.length > 0
      ? await this.productsService.findByIds(productIdsToFetch, tenantId)
      : new Map<string, any>();

    // Add product names to alerts
    shrinkageAlerts.forEach((alert) => {
      const product = productsMap.get(alert.productId);
      if (product) {
        alert.productName = product.name;
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

}
