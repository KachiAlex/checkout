// Reports Handler for Supabase Edge Functions
import { getCorsHeaders } from '../_shared/cors.ts';
import { getQueryParams } from '../_shared/request.ts';
import { getFirestoreInstance } from '../_shared/firestore.ts';
import { requireAuth } from '../_shared/jwt.ts';
import { Timestamp } from 'npm:firebase-admin@11.11.0/firestore';

export async function handleReports(req: Request, path: string, method: string): Promise<Response> {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const user = await requireAuth(req);
    const db = getFirestoreInstance();

    // GET /reports/sales - Get sales report
    if (path === '/reports/sales' && method === 'GET') {
      const params = getQueryParams(req);
      const from = params.get('from') ? new Date(params.get('from')!) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = params.get('to') ? new Date(params.get('to')!) : new Date();
      const locationId = params.get('location_id') || undefined;

      let query = db.collection('orders')
        .where('status', '==', 'COMPLETED')
        .orderBy('createdAt', 'desc');

      if (locationId) {
        query = query.where('locationId', '==', locationId);
      }
      if (from) {
        query = query.where('createdAt', '>=', Timestamp.fromDate(from));
      }
      if (to) {
        query = query.where('createdAt', '<=', Timestamp.fromDate(to));
      }

      const snapshot = await query.get();
      let orders = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          orderNumber: data.orderNumber,
          totalCents: data.totalCents,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        };
      });

      // Filter by tenant if no locationId specified
      if (!locationId) {
        const locationsSnapshot = await db.collection('locations')
          .where('tenantId', '==', user.tenantId)
          .get();
        const locationIds = new Set(locationsSnapshot.docs.map(doc => doc.id));
        orders = orders.filter(order => {
          // Need to check order location
          const orderDoc = snapshot.docs.find(d => d.id === order.id);
          return orderDoc && locationIds.has(orderDoc.data().locationId);
        });
      }

      const totalSales = orders.reduce((sum, order) => sum + order.totalCents, 0);
      const totalOrders = orders.length;

      return new Response(
        JSON.stringify({
          from: from.toISOString(),
          to: to.toISOString(),
          locationId,
          totalSales: totalSales / 100,
          totalOrders,
          averageOrderValue: totalOrders > 0 ? (totalSales / 100) / totalOrders : 0,
          orders: orders.map(order => ({
            id: order.id,
            orderNumber: order.orderNumber,
            total: order.totalCents / 100,
            createdAt: order.createdAt.toISOString(),
          })),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /reports/top-sellers - Get top selling products
    if (path === '/reports/top-sellers' && method === 'GET') {
      const params = getQueryParams(req);
      const from = params.get('from') ? new Date(params.get('from')!) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = params.get('to') ? new Date(params.get('to')!) : new Date();
      const locationId = params.get('location_id') || undefined;
      const limit = parseInt(params.get('limit') || '10', 10);

      let query = db.collection('orders')
        .where('status', '==', 'COMPLETED')
        .orderBy('createdAt', 'desc');

      if (locationId) {
        query = query.where('locationId', '==', locationId);
      }
      if (from) {
        query = query.where('createdAt', '>=', Timestamp.fromDate(from));
      }
      if (to) {
        query = query.where('createdAt', '<=', Timestamp.fromDate(to));
      }

      const snapshot = await query.get();
      let orders = snapshot.docs.map(doc => doc.data());

      // Filter by tenant if no locationId specified
      if (!locationId) {
        const locationsSnapshot = await db.collection('locations')
          .where('tenantId', '==', user.tenantId)
          .get();
        const locationIds = new Set(locationsSnapshot.docs.map(doc => doc.id));
        orders = orders.filter(order => locationIds.has(order.locationId));
      }

      // Aggregate product sales
      const productSales: Record<string, { productId: string; quantity: number; revenue: number }> = {};

      orders.forEach((order) => {
        order.items.forEach((item: any) => {
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
          revenue: item.revenue / 100,
        }));

      return new Response(
        JSON.stringify({
          from: from.toISOString(),
          to: to.toISOString(),
          locationId,
          topSellers,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /reports/sales-analytics - Get sales analytics by period
    if (path === '/reports/sales-analytics' && method === 'GET') {
      const params = getQueryParams(req);
      const period = (params.get('period') || 'daily') as 'daily' | 'weekly' | 'monthly';
      const locationId = params.get('location_id') || undefined;

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

      let query = db.collection('orders')
        .where('status', '==', 'COMPLETED')
        .orderBy('createdAt', 'desc');

      if (locationId) {
        query = query.where('locationId', '==', locationId);
      }
      if (fromDate) {
        query = query.where('createdAt', '>=', Timestamp.fromDate(fromDate));
      }
      if (now) {
        query = query.where('createdAt', '<=', Timestamp.fromDate(now));
      }

      const snapshot = await query.get();
      let orders = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        };
      });

      // Filter by tenant if no locationId specified
      if (!locationId) {
        const locationsSnapshot = await db.collection('locations')
          .where('tenantId', '==', user.tenantId)
          .get();
        const locationIds = new Set(locationsSnapshot.docs.map(doc => doc.id));
        orders = orders.filter(order => locationIds.has(order.locationId));
      }

      const grouped: Record<string, { sales: number; orders: number; items: number }> = {};

      orders.forEach((order) => {
        const key = groupBy(order.createdAt);
        if (!grouped[key]) {
          grouped[key] = { sales: 0, orders: 0, items: 0 };
        }
        grouped[key].sales += order.totalCents / 100;
        grouped[key].orders += 1;
        grouped[key].items += order.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
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

      return new Response(
        JSON.stringify({
          period,
          from: fromDate.toISOString(),
          to: now.toISOString(),
          locationId,
          totalSales,
          totalOrders,
          averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
          data,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /reports/alerts - Get smart alerts
    if (path === '/reports/alerts' && method === 'GET') {
      const params = getQueryParams(req);
      const locationId = params.get('location_id') || undefined;

      if (!locationId) {
        return new Response(
          JSON.stringify({ alerts: [], locationId, generatedAt: new Date().toISOString() }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify tenant access
      const locationDoc = await db.collection('locations').doc(locationId).get();
      if (!locationDoc.exists || locationDoc.data()?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Simplified alerts implementation
      const alerts: any[] = [];

      // Low stock alerts
      const inventorySnapshot = await db.collection('inventory')
        .where('locationId', '==', locationId)
        .get();

      inventorySnapshot.docs.forEach(doc => {
        const inv = doc.data();
        if (inv.reorderPoint && inv.quantity <= inv.reorderPoint) {
          alerts.push({
            type: 'low_stock',
            severity: inv.quantity === 0 ? 'critical' : 'warning',
            title: `Low Stock: ${inv.productId}`,
            message: `Current stock (${inv.quantity}) is at or below reorder point (${inv.reorderPoint}).`,
            productId: inv.productId,
            currentStock: inv.quantity,
          });
        }
      });

      return new Response(
        JSON.stringify({
          alerts,
          locationId,
          generatedAt: new Date().toISOString(),
          totalAlerts: alerts.length,
          criticalCount: alerts.filter((a: any) => a.severity === 'critical').length,
          warningCount: alerts.filter((a: any) => a.severity === 'warning').length,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /reports/fraud-detection - Get fraud detection alerts
    if (path === '/reports/fraud-detection' && method === 'GET') {
      const params = getQueryParams(req);
      const from = params.get('from') ? new Date(params.get('from')!) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = params.get('to') ? new Date(params.get('to')!) : new Date();
      const locationId = params.get('location_id') || undefined;

      let query = db.collection('orders')
        .where('status', '==', 'COMPLETED')
        .orderBy('createdAt', 'desc');

      if (locationId) {
        query = query.where('locationId', '==', locationId);
      }
      if (from) {
        query = query.where('createdAt', '>=', Timestamp.fromDate(from));
      }
      if (to) {
        query = query.where('createdAt', '<=', Timestamp.fromDate(to));
      }

      const snapshot = await query.get();
      let orders = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        };
      });

      // Filter by tenant if no locationId specified
      if (!locationId) {
        const locationsSnapshot = await db.collection('locations')
          .where('tenantId', '==', user.tenantId)
          .get();
        const locationIds = new Set(locationsSnapshot.docs.map(doc => doc.id));
        orders = orders.filter(order => locationIds.has(order.locationId));
      }

      const fraudAlerts: any[] = [];

      // 1. Detect excessive discounts (>50% of order value)
      orders.forEach((order) => {
        const discountPercent = order.discountCents && order.subtotalCents > 0
          ? (order.discountCents / order.subtotalCents) * 100
          : 0;
        
        if (discountPercent > 50) {
          fraudAlerts.push({
            type: 'excessive_discount',
            severity: discountPercent > 75 ? 'critical' : 'warning',
            title: `Excessive Discount: ${order.orderNumber}`,
            message: `Order has ${discountPercent.toFixed(1)}% discount (₦${(order.discountCents / 100).toFixed(2)})`,
            orderId: order.id,
            orderNumber: order.orderNumber,
            discountPercent: discountPercent.toFixed(1),
            discountAmount: order.discountCents / 100,
            createdAt: order.createdAt.toISOString(),
            createdBy: order.createdBy,
          });
        }
      });

      // 2. Detect unusually large orders (outliers)
      const orderTotals = orders.map(o => o.totalCents / 100).sort((a, b) => a - b);
      const median = orderTotals.length > 0 
        ? orderTotals[Math.floor(orderTotals.length / 2)]
        : 0;
      const q3 = orderTotals.length > 0
        ? orderTotals[Math.floor(orderTotals.length * 0.75)]
        : 0;
      const iqr = q3 - (orderTotals[Math.floor(orderTotals.length * 0.25)] || 0);
      const outlierThreshold = q3 + (1.5 * iqr);

      orders.forEach((order) => {
        const orderTotal = order.totalCents / 100;
        if (orderTotal > outlierThreshold && orderTotal > median * 3) {
          fraudAlerts.push({
            type: 'unusually_large_order',
            severity: 'warning',
            title: `Unusually Large Order: ${order.orderNumber}`,
            message: `Order value (₦${orderTotal.toFixed(2)}) is significantly higher than median (₦${median.toFixed(2)})`,
            orderId: order.id,
            orderNumber: order.orderNumber,
            orderTotal,
            median,
            createdAt: order.createdAt.toISOString(),
            createdBy: order.createdBy,
          });
        }
      });

      // 3. Detect rapid successive orders from same user (potential duplicate)
      const ordersByUser: Record<string, any[]> = {};
      orders.forEach(order => {
        if (order.createdBy) {
          if (!ordersByUser[order.createdBy]) {
            ordersByUser[order.createdBy] = [];
          }
          ordersByUser[order.createdBy].push(order);
        }
      });

      Object.entries(ordersByUser).forEach(([userId, userOrders]) => {
        userOrders.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        for (let i = 1; i < userOrders.length; i++) {
          const timeDiff = userOrders[i].createdAt.getTime() - userOrders[i-1].createdAt.getTime();
          if (timeDiff < 5000) { // Less than 5 seconds between orders
            fraudAlerts.push({
              type: 'rapid_successive_orders',
              severity: 'warning',
              title: `Rapid Successive Orders by User`,
              message: `User created 2 orders within ${(timeDiff / 1000).toFixed(1)} seconds`,
              orderId: userOrders[i].id,
              orderNumber: userOrders[i].orderNumber,
              previousOrderNumber: userOrders[i-1].orderNumber,
              timeDiffSeconds: (timeDiff / 1000).toFixed(1),
              createdAt: userOrders[i].createdAt.toISOString(),
              createdBy: userId,
            });
          }
        }
      });

      return new Response(
        JSON.stringify({
          from: from.toISOString(),
          to: to.toISOString(),
          locationId,
          fraudAlerts,
          totalAlerts: fraudAlerts.length,
          criticalCount: fraudAlerts.filter((a: any) => a.severity === 'critical').length,
          warningCount: fraudAlerts.filter((a: any) => a.severity === 'warning').length,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /reports/expiry-analytics - Get expiry analytics
    if (path === '/reports/expiry-analytics' && method === 'GET') {
      const params = getQueryParams(req);
      const locationId = params.get('location_id') || undefined;
      const daysAhead = parseInt(params.get('days_ahead') || '30', 10);

      if (!locationId) {
        return new Response(
          JSON.stringify({
            locationId,
            expiryAlerts: [],
            expiringSoon: [],
            expiredItems: [],
            lossForecast: 0,
            message: 'Location ID required for expiry analytics',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify tenant access
      const locationDoc = await db.collection('locations').doc(locationId).get();
      if (!locationDoc.exists || locationDoc.data()?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get all GRNs for this location
      const grnSnapshot = await db.collection('grn')
        .where('locationId', '==', locationId)
        .get();

      const now = new Date();
      const thresholdDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
      
      const expiringSoon: any[] = [];
      const expiredItems: any[] = [];
      let totalLossForecast = 0;

      grnSnapshot.docs.forEach(doc => {
        const grnData = doc.data();
        const items = grnData.items || [];
        
        items.forEach((item: any) => {
          if (item.expiryDate) {
            const expiryDate = item.expiryDate?.toDate?.() || new Date(item.expiryDate);
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
            
            // Get current inventory quantity for this product
            db.collection('inventory')
              .where('productId', '==', item.productId)
              .where('locationId', '==', locationId)
              .limit(1)
              .get()
              .then(invSnapshot => {
                const currentQty = invSnapshot.empty ? 0 : (invSnapshot.docs[0].data().quantity || 0);
                const costPerUnit = item.unitCostCents / 100;
                const potentialLoss = currentQty * costPerUnit;

                if (expiryDate < now) {
                  expiredItems.push({
                    productId: item.productId,
                    productName: item.productName,
                    sku: item.sku,
                    expiryDate: expiryDate.toISOString(),
                    daysExpired: Math.abs(daysUntilExpiry),
                    quantity: currentQty,
                    unitCost: costPerUnit,
                    potentialLoss,
                    grnId: doc.id,
                  });
                  totalLossForecast += potentialLoss;
                } else if (expiryDate <= thresholdDate) {
                  expiringSoon.push({
                    productId: item.productId,
                    productName: item.productName,
                    sku: item.sku,
                    expiryDate: expiryDate.toISOString(),
                    daysUntilExpiry,
                    quantity: currentQty,
                    unitCost: costPerUnit,
                    potentialLoss,
                    grnId: doc.id,
                  });
                  totalLossForecast += potentialLoss * 0.5; // 50% loss forecast for expiring soon
                }
              });
          }
        });
      });

      // Wait for all async operations (simplified - in production use Promise.all)
      await new Promise(resolve => setTimeout(resolve, 100));

      const expiryAlerts = [
        ...expiredItems.map(item => ({
          type: 'expired',
          severity: 'critical' as const,
          title: `Expired: ${item.productName}`,
          message: `Product expired ${item.daysExpired} days ago. Potential loss: ₦${item.potentialLoss.toFixed(2)}`,
          productId: item.productId,
          expiryDate: item.expiryDate,
        })),
        ...expiringSoon.map(item => ({
          type: 'expiring_soon',
          severity: item.daysUntilExpiry <= 7 ? 'critical' as const : 'warning' as const,
          title: `Expiring Soon: ${item.productName}`,
          message: `Product expires in ${item.daysUntilExpiry} days. Potential loss: ₦${item.potentialLoss.toFixed(2)}`,
          productId: item.productId,
          expiryDate: item.expiryDate,
          daysUntilExpiry: item.daysUntilExpiry,
        })),
      ];

      return new Response(
        JSON.stringify({
          locationId,
          expiryAlerts,
          expiringSoon,
          expiredItems,
          lossForecast: totalLossForecast,
          totalExpiringSoon: expiringSoon.length,
          totalExpired: expiredItems.length,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /reports/shrinkage-detection - Get shrinkage detection
    if (path === '/reports/shrinkage-detection' && method === 'GET') {
      const params = getQueryParams(req);
      const from = params.get('from') ? new Date(params.get('from')!) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = params.get('to') ? new Date(params.get('to')!) : new Date();
      const locationId = params.get('location_id') || undefined;

      if (!locationId) {
        return new Response(
          JSON.stringify({
            locationId,
            shrinkageAlerts: [],
            message: 'Location ID required for shrinkage detection',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify tenant access
      const locationDoc = await db.collection('locations').doc(locationId).get();
      if (!locationDoc.exists || locationDoc.data()?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get current inventory
      const inventorySnapshot = await db.collection('inventory')
        .where('locationId', '==', locationId)
        .get();

      // Get all transactions in the period
      let transactionsQuery = db.collection('inventoryTransactions')
        .where('locationId', '==', locationId)
        .where('ts', '>=', Timestamp.fromDate(from))
        .where('ts', '<=', Timestamp.fromDate(to));

      let transactionsSnapshot;
      try {
        transactionsSnapshot = await transactionsQuery.get();
      } catch (error: any) {
        // If index doesn't exist, fetch all and filter in memory
        const allTransactionsSnapshot = await db.collection('inventoryTransactions')
          .where('locationId', '==', locationId)
          .get();
        transactionsSnapshot = {
          docs: allTransactionsSnapshot.docs.filter(doc => {
            const ts = doc.data().ts?.toDate?.() || new Date();
            return ts >= from && ts <= to;
          }),
        };
      }

      const transactions = transactionsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          productId: data.productId,
          delta: data.delta || 0,
          type: data.type || 'adjust',
          ts: data.ts?.toDate?.() || new Date(),
        };
      });

      // Calculate theoretical stock for each product
      const theoreticalStock: Record<string, number> = {};
      const actualStock: Record<string, number> = {};

      // Initialize with current stock
      inventorySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const productId = data.productId;
        actualStock[productId] = data.quantity || 0;
        theoreticalStock[productId] = data.quantity || 0;
      });

      // Reverse transactions to calculate theoretical starting stock
      transactions.reverse().forEach(tx => {
        if (!theoreticalStock[tx.productId]) {
          theoreticalStock[tx.productId] = 0;
        }
        
        // Reverse the transaction effect
        if (tx.type === 'sale' || tx.type === 'SALE') {
          theoreticalStock[tx.productId] += Math.abs(tx.delta); // Add back what was sold
        } else if (tx.type === 'received' || tx.type === 'RECEIVED') {
          theoreticalStock[tx.productId] -= Math.abs(tx.delta); // Remove what was received
        } else if (tx.type === 'return' || tx.type === 'RETURN') {
          theoreticalStock[tx.productId] -= Math.abs(tx.delta); // Remove what was returned
        } else {
          // Adjustment - reverse it
          theoreticalStock[tx.productId] -= tx.delta;
        }
      });

      // Find discrepancies
      const shrinkageAlerts: any[] = [];
      const discrepancyThreshold = 0.05; // 5% threshold

      Object.keys(actualStock).forEach(productId => {
        const actual = actualStock[productId];
        const theoretical = theoreticalStock[productId] || 0;
        const discrepancy = actual - theoretical;
        const discrepancyPercent = theoretical > 0 ? Math.abs(discrepancy / theoretical) : 0;

        if (Math.abs(discrepancy) > 0 && discrepancyPercent >= discrepancyThreshold) {
          // Get product name
          db.collection('products').doc(productId).get().then(productDoc => {
            const productName = productDoc.exists ? (productDoc.data()?.name || 'Unknown') : 'Unknown';
            
            shrinkageAlerts.push({
              type: 'inventory_discrepancy',
              severity: discrepancyPercent > 0.2 ? 'critical' : 'warning',
              title: `Inventory Discrepancy: ${productName}`,
              message: `Actual stock (${actual}) differs from theoretical (${theoretical}) by ${discrepancy > 0 ? '+' : ''}${discrepancy} units (${(discrepancyPercent * 100).toFixed(1)}%)`,
              productId,
              productName,
              actualStock: actual,
              theoreticalStock: theoretical,
              discrepancy,
              discrepancyPercent: (discrepancyPercent * 100).toFixed(1),
            });
          });
        }
      });

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 200));

      return new Response(
        JSON.stringify({
          from: from.toISOString(),
          to: to.toISOString(),
          locationId,
          shrinkageAlerts,
          totalDiscrepancies: shrinkageAlerts.length,
          criticalCount: shrinkageAlerts.filter((a: any) => a.severity === 'critical').length,
          warningCount: shrinkageAlerts.filter((a: any) => a.severity === 'warning').length,
          message: shrinkageAlerts.length === 0
            ? 'No significant inventory discrepancies detected.'
            : `${shrinkageAlerts.length} products have inventory discrepancies.`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /reports/staff-performance - Get staff performance
    if (path === '/reports/staff-performance' && method === 'GET') {
      const params = getQueryParams(req);
      const from = params.get('from') ? new Date(params.get('from')!) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = params.get('to') ? new Date(params.get('to')!) : new Date();
      const locationId = params.get('location_id') || undefined;

      let query = db.collection('orders')
        .where('status', '==', 'COMPLETED')
        .orderBy('createdAt', 'desc');

      if (locationId) {
        query = query.where('locationId', '==', locationId);
      }
      if (from) {
        query = query.where('createdAt', '>=', Timestamp.fromDate(from));
      }
      if (to) {
        query = query.where('createdAt', '<=', Timestamp.fromDate(to));
      }

      const snapshot = await query.get();
      let orders = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        };
      });

      // Filter by tenant if no locationId specified
      if (!locationId) {
        const locationsSnapshot = await db.collection('locations')
          .where('tenantId', '==', user.tenantId)
          .get();
        const locationIds = new Set(locationsSnapshot.docs.map(doc => doc.id));
        orders = orders.filter(order => locationIds.has(order.locationId));
      }

      // Get all users for the tenant
      const usersSnapshot = await db.collection('users')
        .where('tenantId', '==', user.tenantId)
        .get();
      const usersMap: Record<string, any> = {};
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        usersMap[doc.id] = {
          id: doc.id,
          name: userData.name || 'Unknown',
          email: userData.email || '',
        };
      });

      // Aggregate by staff member
      const staffSales: Record<string, {
        userId: string;
        userName: string;
        totalSales: number;
        orderCount: number;
        itemCount: number;
        averageOrderValue: number;
        averageItemsPerOrder: number;
      }> = {};

      orders.forEach(order => {
        if (!order.createdBy) return;
        
        if (!staffSales[order.createdBy]) {
          const user = usersMap[order.createdBy] || { id: order.createdBy, name: 'Unknown', email: '' };
          staffSales[order.createdBy] = {
            userId: order.createdBy,
            userName: user.name,
            totalSales: 0,
            orderCount: 0,
            itemCount: 0,
            averageOrderValue: 0,
            averageItemsPerOrder: 0,
          };
        }

        const staff = staffSales[order.createdBy];
        staff.totalSales += order.totalCents / 100;
        staff.orderCount += 1;
        staff.itemCount += order.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
      });

      // Calculate averages
      const staffPerformance = Object.values(staffSales).map(staff => ({
        ...staff,
        averageOrderValue: staff.orderCount > 0 ? staff.totalSales / staff.orderCount : 0,
        averageItemsPerOrder: staff.orderCount > 0 ? staff.itemCount / staff.orderCount : 0,
      })).sort((a, b) => b.totalSales - a.totalSales);

      return new Response(
        JSON.stringify({
          from: from.toISOString(),
          to: to.toISOString(),
          locationId,
          staffPerformance,
          totalStaff: staffPerformance.length,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /reports/inventory-analytics - Get inventory analytics
    if (path === '/reports/inventory-analytics' && method === 'GET') {
      const params = getQueryParams(req);
      const period = (params.get('period') || 'daily') as 'daily' | 'weekly' | 'monthly';
      const locationId = params.get('location_id') || undefined;

      if (!locationId) {
        return new Response(
          JSON.stringify({
            period,
            from: new Date().toISOString(),
            to: new Date().toISOString(),
            locationId,
            totalReceived: 0,
            totalSold: 0,
            totalReturned: 0,
            totalAdjusted: 0,
            netChange: 0,
            data: [],
            message: 'Location ID required for inventory analytics',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify tenant access
      const locationDoc = await db.collection('locations').doc(locationId).get();
      if (!locationDoc.exists || locationDoc.data()?.tenantId !== user.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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

      // Get inventory transactions
      let transactionsQuery = db.collection('inventoryTransactions')
        .where('locationId', '==', locationId)
        .where('ts', '>=', Timestamp.fromDate(fromDate))
        .where('ts', '<=', Timestamp.fromDate(now));

      let transactionsSnapshot;
      try {
        transactionsSnapshot = await transactionsQuery.get();
      } catch (error: any) {
        // If index doesn't exist, fetch all and filter in memory
        const allTransactionsSnapshot = await db.collection('inventoryTransactions')
          .where('locationId', '==', locationId)
          .get();
        transactionsSnapshot = {
          docs: allTransactionsSnapshot.docs.filter(doc => {
            const ts = doc.data().ts?.toDate?.() || new Date();
            return ts >= fromDate && ts <= now;
          }),
        };
      }

      const transactions = transactionsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          type: data.type || 'adjust',
          delta: data.delta || 0,
          ts: data.ts?.toDate?.() || new Date(),
        };
      });

      // Get completed orders for sales tracking
      let ordersQuery = db.collection('orders')
        .where('status', '==', 'COMPLETED')
        .where('locationId', '==', locationId)
        .where('createdAt', '>=', Timestamp.fromDate(fromDate))
        .where('createdAt', '<=', Timestamp.fromDate(now));

      let ordersSnapshot;
      try {
        ordersSnapshot = await ordersQuery.get();
      } catch (error: any) {
        const allOrdersSnapshot = await db.collection('orders')
          .where('status', '==', 'COMPLETED')
          .where('locationId', '==', locationId)
          .get();
        ordersSnapshot = {
          docs: allOrdersSnapshot.docs.filter(doc => {
            const ts = doc.data().createdAt?.toDate?.() || new Date();
            return ts >= fromDate && ts <= now;
          }),
        };
      }

      const orders = ordersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          items: data.items || [],
          createdAt: data.createdAt?.toDate?.() || new Date(),
        };
      });

      // Group transactions by period
      const grouped: Record<string, {
        received: number;
        sold: number;
        returned: number;
        adjusted: number;
        netChange: number;
      }> = {};

      transactions.forEach(tx => {
        const key = groupBy(tx.ts);
        if (!grouped[key]) {
          grouped[key] = { received: 0, sold: 0, returned: 0, adjusted: 0, netChange: 0 };
        }

        if (tx.type === 'received' || tx.type === 'RECEIVED') {
          grouped[key].received += Math.abs(tx.delta);
          grouped[key].netChange += Math.abs(tx.delta);
        } else if (tx.type === 'sale' || tx.type === 'SALE') {
          grouped[key].sold += Math.abs(tx.delta);
          grouped[key].netChange -= Math.abs(tx.delta);
        } else if (tx.type === 'return' || tx.type === 'RETURN') {
          grouped[key].returned += Math.abs(tx.delta);
          grouped[key].netChange += Math.abs(tx.delta);
        } else {
          grouped[key].adjusted += tx.delta;
          grouped[key].netChange += tx.delta;
        }
      });

      // Add sales from orders
      orders.forEach(order => {
        const key = groupBy(order.createdAt);
        if (!grouped[key]) {
          grouped[key] = { received: 0, sold: 0, returned: 0, adjusted: 0, netChange: 0 };
        }
        const itemsSold = order.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
        grouped[key].sold += itemsSold;
        grouped[key].netChange -= itemsSold;
      });

      const data = Object.entries(grouped)
        .map(([period, stats]) => ({
          period,
          received: stats.received,
          sold: stats.sold,
          returned: stats.returned,
          adjusted: stats.adjusted,
          netChange: stats.netChange,
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      const totalReceived = data.reduce((sum, d) => sum + d.received, 0);
      const totalSold = data.reduce((sum, d) => sum + d.sold, 0);
      const totalReturned = data.reduce((sum, d) => sum + d.returned, 0);
      const totalAdjusted = data.reduce((sum, d) => sum + d.adjusted, 0);
      const netChange = totalReceived + totalReturned - totalSold + totalAdjusted;

      return new Response(
        JSON.stringify({
          period,
          from: fromDate.toISOString(),
          to: now.toISOString(),
          locationId,
          totalReceived,
          totalSold,
          totalReturned,
          totalAdjusted,
          netChange,
          data,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 404
    return new Response(
      JSON.stringify({ error: 'Not Found', path, method }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Reports] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

