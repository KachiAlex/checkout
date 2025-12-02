import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { BrandMark } from '../components/BrandMark';
import { ThemeToggle } from '../components/ThemeToggle';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import toast from 'react-hot-toast';
import { format, parseISO, startOfDay, endOfDay, subDays } from 'date-fns';

type Period = 'daily' | 'weekly' | 'monthly' | 'custom';
type ReportTab =
  | 'general'
  | 'alerts'
  | 'customers'
  | 'staff'
  | 'credit'
  | 'profit'
  | 'category'
  | 'time'
  | 'inventory'
  | 'discount'
  | 'payment'
  | 'returns'
  | 'basket'
  | 'trends'
  | 'operations';

interface SalesAnalytics {
  period: Period;
  from: string;
  to: string;
  locationId?: string;
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  data: Array<{
    period: string;
    sales: number;
    orders: number;
    items: number;
    averageOrderValue: number;
  }>;
}

interface StaffPerformance {
  from: string;
  to: string;
  locationId?: string;
  staffPerformance: Array<{
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
  }>;
}

interface CreditReport {
  totalOutstanding: number;
  totalOrders: number;
  orders: Array<{
    orderId: string;
    orderNumber: string;
    customerId?: string;
    customerName?: string;
    totalCents: number;
    paidCents: number;
    outstandingCents: number;
    createdAt: string;
    createdBy: string;
    createdByName?: string;
    status: string;
  }>;
}

interface ProductAnalytics {
  productId: string;
  productName: string;
  sku: string;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number; // percentage
}

interface ProfitLossAnalytics {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number; // percentage
  profitPercentage: number; // percentage
  totalItemsSold: number;
  averageProfitPerItem: number;
  byProduct: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantitySold: number;
    revenue: number;
    cost: number;
    profit: number;
    profitMargin: number;
  }>;
  byPeriod: Array<{
    period: string;
    revenue: number;
    cost: number;
    profit: number;
  }>;
}

interface CategoryBrandAnalytics {
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    revenue: number;
    cost: number;
    profit: number;
    profitMargin: number;
    quantitySold: number;
    orderCount: number;
  }>;
  byBrand: Array<{
    brandId: string;
    brandName: string;
    revenue: number;
    cost: number;
    profit: number;
    profitMargin: number;
    quantitySold: number;
    orderCount: number;
  }>;
}

interface TimeBasedInsights {
  byHour: Array<{ hour: number; sales: number; orders: number; items: number }>;
  byDayOfWeek: Array<{ day: string; sales: number; orders: number; items: number }>;
  byMonth: Array<{ month: string; sales: number; orders: number; items: number }>;
  peakHour: { hour: number; sales: number };
  bestDay: { day: string; sales: number };
  salesVelocity: number; // items per hour
  yearOverYear: Array<{ period: string; current: number; previous: number; change: number }>;
}

interface InventoryHealth {
  turnoverRate: number;
  slowMovingProducts: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    lastSold?: string;
    daysSinceLastSale: number;
  }>;
  lowStockProducts: Array<{
    productId: string;
    productName: string;
    sku: string;
    currentStock: number;
    reorderPoint?: number;
    daysRemaining: number;
  }>;
  deadStock: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    value: number;
    lastSold?: string;
  }>;
  stockoutFrequency: number;
}

interface BasketAnalysis {
  averageItemsPerOrder: number;
  frequentlyBoughtTogether: Array<{
    products: string[];
    frequency: number;
    support: number; // percentage
  }>;
  crossSellOpportunities: Array<{
    productId: string;
    productName: string;
    suggestedProducts: Array<{
      productId: string;
      productName: string;
      confidence: number;
    }>;
  }>;
  topBundles: Array<{
    products: string[];
    frequency: number;
    revenue: number;
  }>;
}

interface OperationalMetrics {
  averageTransactionTime: number; // minutes
  ordersPerStaff: Array<{
    userId: string;
    userName: string;
    orderCount: number;
    avgTransactionTime: number;
  }>;
  peakHours: Array<{ hour: number; orderCount: number }>;
  averageItemsPerOrder: number;
  averageWaitTime: number; // minutes (if available)
}

type SmartAlertType = 'stockout' | 'low_sales' | 'customer_inactive' | 'staff_performance' | 'low_stock';
type SmartAlertSeverity = 'critical' | 'warning' | 'info';

interface SmartAlert {
  type: SmartAlertType;
  severity: SmartAlertSeverity;
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
}

interface SmartAlertsAnalytics {
  alerts: SmartAlert[];
  locationId?: string;
  generatedAt: string;
  totalAlerts: number;
  criticalCount: number;
  warningCount: number;
}

type FraudAlertType = 'discount_abuse' | 'ghost_refund' | 'high_value_void' | 'midnight_sale' | 'below_cost';
type FraudAlertSeverity = 'critical' | 'warning' | 'suspicious';

interface FraudAlert {
  type: FraudAlertType;
  severity: FraudAlertSeverity;
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
}

interface FraudDetectionAnalytics {
  from: string;
  to: string;
  locationId?: string;
  fraudAlerts: FraudAlert[];
  totalAlerts: number;
  criticalCount: number;
  warningCount: number;
}

type ShrinkageSeverity = 'critical' | 'warning';

interface ShrinkageAlert {
  productId: string;
  productName?: string;
  actualStock: number;
  theoreticalStock: number;
  discrepancy: number;
  discrepancyPercent: number;
  severity: ShrinkageSeverity;
}

interface ShrinkageDetectionAnalytics {
  from: string;
  to: string;
  locationId?: string;
  shrinkageAlerts: ShrinkageAlert[];
  totalDiscrepancies: number;
  criticalCount: number;
  message: string;
}

export function ReportsPage() {
  console.log('🔥 [ReportsPage] COMPONENT RENDERING NOW!');
  const { logout, accessToken, user } = useAuthStore();
  console.log('🔥 [ReportsPage] After useAuthStore', { hasToken: !!accessToken, hasUser: !!user, activeTab: 'general' });
  const [activeTab, setActiveTab] = useState<ReportTab>('general');
  const [period, setPeriod] = useState<Period>('daily');
  const [customDateFrom, setCustomDateFrom] = useState<string>(
    format(startOfDay(subDays(new Date(), 7)), 'yyyy-MM-dd')
  );
  const [customDateTo, setCustomDateTo] = useState<string>(
    format(endOfDay(new Date()), 'yyyy-MM-dd')
  );
  const [loading, setLoading] = useState(true);
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics | null>(null);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance | null>(null);
  const [creditReport, setCreditReport] = useState<CreditReport | null>(null);
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [inventoryDebugInfo, setInventoryDebugInfo] = useState<string>('Waiting to load...');
  const [profitLossAnalytics, setProfitLossAnalytics] = useState<ProfitLossAnalytics | null>(null);
  const [categoryBrandAnalytics, setCategoryBrandAnalytics] = useState<CategoryBrandAnalytics | null>(null);
  const [timeBasedInsights, setTimeBasedInsights] = useState<TimeBasedInsights | null>(null);
  const [inventoryHealth, setInventoryHealth] = useState<InventoryHealth | null>(null);
  const [basketAnalysis, setBasketAnalysis] = useState<BasketAnalysis | null>(null);
  const [operationalMetrics, setOperationalMetrics] = useState<OperationalMetrics | null>(null);
  const [smartAlerts, setSmartAlerts] = useState<SmartAlertsAnalytics | null>(null);
  const [fraudDetection, setFraudDetection] = useState<FraudDetectionAnalytics | null>(null);
  const [shrinkageDetection, setShrinkageDetection] = useState<ShrinkageDetectionAnalytics | null>(null);

  // Track previous alerts summary to know when to notify about new critical alerts
  const lastAlertsSummaryRef = useRef<{ total: number; critical: number } | null>(null);

  const loadGeneralAnalytics = async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const params: any = {
        period: period === 'custom' ? 'daily' : period,
        location_id: user?.locationId,
      };
      
      if (period === 'custom') {
        params.from = customDateFrom;
        params.to = customDateTo;
      }

      const response = await axios.get(`${API_URL}/api/v1/reports/sales-analytics`, { headers, params });
      setSalesAnalytics(response.data);
    } catch (error: any) {
      console.error('Failed to load sales analytics:', error);
      toast.error(error.response?.data?.message || 'Failed to load sales analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadProductAnalytics = async (headers: any, params: any) => {
    console.log('🎯 [loadProductAnalytics] FUNCTION CALLED!', { hasHeaders: !!headers });
    // Force visible alert to confirm function runs
    if (typeof window !== 'undefined') {
      console.warn('🚨 ALERT: loadProductAnalytics is running!');
    }
    setInventoryDebugInfo('Function called - starting...');
    setLoadingProducts(true);
    try {
      // Fetch completed orders for the period
      const ordersParams: any = {
        status: 'completed',
        location_id: user?.locationId,
      };
      
      if (period === 'custom') {
        ordersParams.from = customDateFrom;
        ordersParams.to = customDateTo;
      } else {
        const now = new Date();
        let fromDate: Date;
        if (period === 'daily') {
          fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        } else if (period === 'weekly') {
          fromDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
        } else {
          fromDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        }
        ordersParams.from = format(fromDate, 'yyyy-MM-dd');
        ordersParams.to = format(now, 'yyyy-MM-dd');
      }

      const ordersResponse = await axios.get(`${API_URL}/api/v1/orders`, {
        headers,
        params: ordersParams,
      });

      const orders = ordersResponse.data || [];
      
      // Aggregate product sales
      const productMap: Record<string, { 
        quantity: number; 
        revenue: number;
        orderItems?: Array<{ priceCents: number; quantity: number }>;
      }> = {};
      const productIds = new Set<string>();

      // First pass: collect product IDs and quantities (revenue will be calculated after fetching inventory)
      orders.forEach((order: any) => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            const productId = item.productId;
            if (!productId) return;
            
            productIds.add(productId);
            
            if (!productMap[productId]) {
              productMap[productId] = { 
                quantity: 0, 
                revenue: 0,
                orderItems: [] // Store order items for price correction
              };
            }
            
            const productData = productMap[productId];
            if (productData) {
              productData.quantity += item.quantity || 0;
              if (!productData.orderItems) {
                productData.orderItems = [];
              }
              
              productData.orderItems.push({
                priceCents: item.priceCents || 0,
                quantity: item.quantity || 0
              });
            }
          });
        }
      });

      // Fetch products first
      const productsResponse = await axios.get(`${API_URL}/api/v1/products`, { headers });
      const products = productsResponse.data || [];
      const productsMap = new Map(products.map((p: any) => [p.id, p]));

      // Get locationId - MUST have this to fetch inventory
      let locationId = user?.locationId;
      if (!locationId) {
        try {
          const locationsResponse = await axios.get(`${API_URL}/api/v1/locations`, { headers });
          const locations = locationsResponse.data || [];
          if (locations.length > 0) {
            locationId = locations[0].id;
          }
        } catch (err) {
          console.error('Failed to fetch locations:', err);
        }
      }
      
      // ALWAYS try to fetch inventory - this is where cost AND selling prices are stored
      const inventoryCostMap = new Map<string, number>();
      const inventoryPriceMap = new Map<string, number>(); // For correcting wrong order prices
      if (locationId) {
        try {
          console.log('🔍 [INVENTORY FETCH] Starting...', { locationId, url: `${API_URL}/api/v1/inventory/${locationId}/stock` });
          setInventoryDebugInfo(`Fetching inventory for location ${locationId}...`);
          
          // This is the SAME API call the Inventory page makes
          const inventoryResponse = await axios.get(`${API_URL}/api/v1/inventory/${locationId}/stock`, { headers });
          const inventory = inventoryResponse.data || [];
          
          console.log('✅ [INVENTORY FETCH] Response received:', {
            status: inventoryResponse.status,
            itemCount: inventory.length,
            firstItem: inventory[0] ? {
              productId: inventory[0].productId,
              costCents: inventory[0].costCents,
              salesPriceCents: inventory[0].salesPriceCents,
              hasCostCents: 'costCents' in inventory[0],
              allKeys: Object.keys(inventory[0] || {})
            } : 'No items'
          });
          
          setInventoryDebugInfo(`Found ${inventory.length} inventory items`);
          
          // Build cost and price maps from inventory items
          let itemsWithCost = 0;
          inventory.forEach((inv: any) => {
            if (inv.productId) {
              // costCents is at top level, same as Inventory page shows
              const cost = inv.costCents ?? 0;
              inventoryCostMap.set(inv.productId, cost);
              if (cost > 0) itemsWithCost++;
              
              // Also store selling price for price correction
              const sellingPrice = inv.salesPriceCents ?? inv.product?.priceCents ?? 0;
              if (sellingPrice > 0) {
                inventoryPriceMap.set(inv.productId, sellingPrice);
              }
            }
          });
          
          console.log('📊 [INVENTORY MAP] Built cost map:', {
            totalItems: inventory.length,
            itemsWithCost: itemsWithCost,
            mappedCount: inventoryCostMap.size,
            sampleEntries: Array.from(inventoryCostMap.entries()).slice(0, 5)
          });
          
          setInventoryDebugInfo(`${inventory.length} items, ${itemsWithCost} with cost > 0, ${inventoryCostMap.size} total mapped`);
          
          // Calculate revenue with price correction for wrong order prices
          // If order price is 100x smaller than current inventory price, use inventory price
          console.log('💰 [REVENUE CALC] Starting price correction. Inventory price map size:', inventoryPriceMap.size);
          
          Object.keys(productMap).forEach((productId) => {
            const productData = productMap[productId];
            if (!productData) return;
            
            const currentInventoryPrice = inventoryPriceMap.get(productId);
            const product = productsMap.get(productId) as any;
            const isIPhone = product?.name?.toLowerCase().includes('iphone');
            
            if (isIPhone) {
              console.log('🍎 [iPhone REVENUE] Before correction:', {
                productId,
                productName: product?.name,
                currentRevenue: productData.revenue,
                orderItemsCount: productData.orderItems?.length || 0,
                hasInventoryPrice: !!currentInventoryPrice,
                inventoryPrice: currentInventoryPrice,
                orderItems: productData.orderItems
              });
            }
            
            let totalRevenue = 0;
            
            if (productData.orderItems) {
              if (isIPhone) {
                console.log('📋 [iPhone ORDER ITEMS] Processing order items:', {
                  count: productData.orderItems.length,
                  items: productData.orderItems.map((oi: any) => ({
                    priceCents: oi.priceCents,
                    priceNaira: (oi.priceCents / 100).toFixed(2),
                    quantity: oi.quantity
                  }))
                });
              }
              
              productData.orderItems.forEach((orderItem: any) => {
                let priceToUse = orderItem.priceCents;
                
                // If we have current inventory price and order price seems wrong (100x too small), correct it
                if (currentInventoryPrice && currentInventoryPrice > 0 && orderItem.priceCents > 0) {
                  const priceRatio = currentInventoryPrice / orderItem.priceCents;
                  // If current price is significantly larger (50x or more), the order price was likely stored incorrectly
                  // This handles cases where prices were stored as naira instead of cents
                  if (priceRatio >= 50) {
                    if (isIPhone) {
                      console.warn(`🔧 [iPhone PRICE CORRECTION] Order price ${orderItem.priceCents} (₦${(orderItem.priceCents/100).toFixed(2)}) seems wrong. Current inventory price ${currentInventoryPrice} (₦${(currentInventoryPrice/100).toFixed(2)}). Ratio: ${priceRatio.toFixed(2)}x. Using current inventory price.`);
                    }
                    priceToUse = currentInventoryPrice;
                  } else if (isIPhone) {
                    console.log(`✅ [iPhone PRICE CHECK] Order price ${orderItem.priceCents} (₦${(orderItem.priceCents/100).toFixed(2)}) vs inventory ${currentInventoryPrice} (₦${(currentInventoryPrice/100).toFixed(2)}). Ratio: ${priceRatio.toFixed(2)}x. Using order price.`);
                  }
                } else if (currentInventoryPrice && currentInventoryPrice > 0) {
                  // If we have inventory price but order price is 0 or missing, use inventory price
                  if (isIPhone) {
                    console.warn(`🔧 [iPhone PRICE CORRECTION] Order price missing/zero. Using current inventory price ${currentInventoryPrice}`);
                  }
                  priceToUse = currentInventoryPrice;
                } else if (isIPhone && !currentInventoryPrice) {
                  console.warn(`⚠️ [iPhone MISSING] Product ${productId} (${product?.name}) not found in inventory price map. Inventory map has ${inventoryPriceMap.size} items.`);
                }
                
                totalRevenue += priceToUse * orderItem.quantity;
              });
            }
            
            productData.revenue = totalRevenue;
            
            if (isIPhone) {
              console.log('🍎 [iPhone REVENUE] After correction:', {
                productId,
                productName: product?.name,
                newRevenue: totalRevenue,
                newRevenueNaira: (totalRevenue / 100).toFixed(2)
              });
            }
            
            // Clean up orderItems - we don't need them anymore
            delete productData.orderItems;
          });
          
          // Show which productIds from orders we're looking for
          const orderProductIds = Array.from(productIds);
          console.log('🔎 [PRODUCT MATCH] Looking for costs for:', {
            orderProductIds: orderProductIds.slice(0, 5),
            foundInInventory: orderProductIds.slice(0, 5).map(pid => ({
              productId: pid,
              hasCost: inventoryCostMap.has(pid),
              cost: inventoryCostMap.get(pid),
              hasPrice: inventoryPriceMap.has(pid),
              price: inventoryPriceMap.get(pid)
            }))
          });
          
          // Show sample of what we found
          const sampleProducts = Array.from(productIds).slice(0, 3);
          const sampleInfo = sampleProducts.map(pid => {
            const cost = inventoryCostMap.get(pid);
            const price = inventoryPriceMap.get(pid);
            return `${pid.substring(0, 8)}:cost=${cost ?? 'MISSING'},price=${price ?? 'MISSING'}`;
          }).join(', ');
          setInventoryDebugInfo(`${inventoryCostMap.size} mapped. Sample: ${sampleInfo}`);
        } catch (err: any) {
          console.error('❌ [INVENTORY FETCH] Failed:', {
            status: err?.response?.status,
            statusText: err?.response?.statusText,
            message: err?.message,
            url: err?.config?.url,
            fullError: err
          });
          setInventoryDebugInfo(`ERROR: ${err?.response?.status || 'Unknown'} - ${err?.message || 'Failed'}`);
          
          // Fallback: calculate revenue from order prices (even if they might be wrong)
          Object.keys(productMap).forEach((productId) => {
            const productData = productMap[productId];
            if (!productData || !productData.orderItems) return;
            
            let totalRevenue = 0;
            if (productData.orderItems) {
              productData.orderItems.forEach((orderItem: any) => {
                totalRevenue += orderItem.priceCents * orderItem.quantity;
              });
            }
            productData.revenue = totalRevenue;
            delete productData.orderItems;
          });
        }
      } else {
        setInventoryDebugInfo('ERROR: No locationId');
        
        // Fallback: calculate revenue from order prices
        Object.keys(productMap).forEach((productId) => {
          const productData = productMap[productId];
          if (!productData || !productData.orderItems) return;
          
          let totalRevenue = 0;
          productData.orderItems.forEach((orderItem: any) => {
            totalRevenue += orderItem.priceCents * orderItem.quantity;
          });
          productData.revenue = totalRevenue;
          delete productData.orderItems;
        });
      }

      // Build analytics with cost from inventory
      console.log('📊 [ANALYTICS BUILD] Starting:', {
        totalProductIds: productIds.size,
        productIds: Array.from(productIds),
        productMapKeys: Object.keys(productMap),
        productsMapSize: productsMap.size
      });
      
      const analytics: ProductAnalytics[] = Array.from(productIds)
        .map((productId) => {
          const stats = productMap[productId];
          if (!stats) {
            console.warn(`⚠️ [MISSING STATS] Product ${productId} has no stats in productMap`);
            return null;
          }
          const product = productsMap.get(productId) as any;
          
          // Get cost from inventory - same field the Inventory page uses (item.costCents)
          const costCents = inventoryCostMap.get(productId) ?? 0;
          
          // Debug: if cost is 0, check if product exists in inventory map
          if (costCents === 0 && inventoryCostMap.size > 0) {
            console.warn(`Product ${productId} (${product?.name}) not found in inventory or cost is 0. Inventory has ${inventoryCostMap.size} items.`);
          }
          
          // Debug: Log raw values to check for unit conversion issues
          if (product?.name?.toLowerCase().includes('iphone')) {
            const currentInventoryPrice = inventoryPriceMap.get(productId);
            const revenueNaira = stats.revenue / 100;
            console.log('🔍 [DEBUG iPhone] Final calculation:', {
              productName: product.name,
              revenueCents: stats.revenue,
              revenueNaira: revenueNaira,
              costCents: costCents,
              costNaira: (costCents / 100).toFixed(2),
              currentInventoryPrice: currentInventoryPrice,
              currentInventoryPriceNaira: currentInventoryPrice ? (currentInventoryPrice / 100).toFixed(2) : 'N/A',
              quantity: stats.quantity,
              costAfterConversion: (costCents * stats.quantity) / 100,
              expectedRevenue: 2500000, // What user expects in naira
              expectedCost: 1700000, // What user expects in naira
              hasInventoryPrice: inventoryPriceMap.has(productId),
              revenuePerItem: stats.quantity > 0 ? (stats.revenue / stats.quantity) : 0,
              revenuePerItemNaira: stats.quantity > 0 ? (stats.revenue / stats.quantity / 100).toFixed(2) : '0'
            });
          }
          
          const totalCost = (costCents * stats.quantity) / 100;
          const revenue = stats.revenue / 100; // Convert cents to currency
          const profit = revenue - totalCost;
          const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
          
          return {
            productId,
            productName: product?.name || `Product ${productId.substring(0, 8)}`,
            sku: product?.sku || 'N/A',
            quantitySold: stats.quantity,
            revenue,
            cost: totalCost,
            profit,
            profitMargin,
          };
        })
        .filter((item): item is ProductAnalytics => item !== null) // Filter out null values
        .sort((a, b) => b.revenue - a.revenue);
      
      console.log('✅ [ANALYTICS] Final count:', {
        totalAnalytics: analytics.length,
        productNames: analytics.map(a => a.productName)
      }); // Sort by revenue

      console.log('✅ [ANALYTICS] Final results:', {
        totalProducts: analytics.length,
        productsWithCost: analytics.filter(a => a.cost > 0).length,
        productsWithoutCost: analytics.filter(a => a.cost === 0).length,
        sampleProducts: analytics.slice(0, 3).map(a => ({
          name: a.productName,
          cost: a.cost,
          revenue: a.revenue,
          profit: a.profit
        }))
      });

      setProductAnalytics(analytics);
      setInventoryDebugInfo(`Complete: ${analytics.length} products, ${analytics.filter(a => a.cost > 0).length} with cost data`);
    } catch (error: any) {
      console.error('Failed to load product analytics:', error);
      setInventoryDebugInfo(`ERROR: ${error?.message || 'Unknown error'}`);
      // Don't show error toast for product analytics, just log it
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadStaffPerformance = async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const params: any = {
        location_id: user?.locationId,
      };
      
      if (period === 'custom') {
        params.from = customDateFrom;
        params.to = customDateTo;
      }

      const response = await axios.get(`${API_URL}/api/v1/reports/staff-performance`, { headers, params });
      setStaffPerformance(response.data);
    } catch (error: any) {
      console.error('Failed to load staff performance:', error);
      toast.error(error.response?.data?.message || 'Failed to load staff performance');
    } finally {
      setLoading(false);
    }
  };

  const loadProfitLossAnalytics = async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      
      // Calculate date range
      const ordersParams: any = {
        status: 'completed',
        location_id: user?.locationId,
      };
      
      if (period === 'custom') {
        ordersParams.from = customDateFrom;
        ordersParams.to = customDateTo;
      } else {
        const now = new Date();
        let fromDate: Date;
        if (period === 'daily') {
          fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        } else if (period === 'weekly') {
          fromDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
        } else {
          fromDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        }
        ordersParams.from = format(fromDate, 'yyyy-MM-dd');
        ordersParams.to = format(now, 'yyyy-MM-dd');
      }

      // Fetch completed orders
      const ordersResponse = await axios.get(`${API_URL}/api/v1/orders`, {
        headers,
        params: ordersParams,
      });

      const orders = ordersResponse.data || [];
      
      // Fetch all products to get product details
      const productsResponse = await axios.get(`${API_URL}/api/v1/products`, { headers });
      const products = productsResponse.data || [];
      const productsMap = new Map(products.map((p: any) => [p.id, p]));

      // Fetch inventory to get cost data (cost is stored in inventory, not products)
      // Inventory API requires location_id in the path
      let locationId = user?.locationId;
      
      // If user doesn't have locationId, try to get first location for tenant
      if (!locationId) {
        try {
          const locationsResponse = await axios.get(`${API_URL}/api/v1/locations`, { headers });
          const locations = locationsResponse.data || [];
          if (locations.length > 0) {
            locationId = locations[0].id;
          }
        } catch (err) {
          console.warn('Failed to fetch locations:', err);
        }
      }
      
      let inventoryCostMap = new Map<string, number>();
      if (locationId) {
        try {
          const inventoryResponse = await axios.get(`${API_URL}/api/v1/inventory/${locationId}/stock`, { headers });
          const inventory = inventoryResponse.data || [];
          console.log('[Reports] Inventory data for cost calculation:', inventory.length, 'items');
          inventoryCostMap = new Map(inventory.map((inv: any) => [inv.productId, inv.costCents || 0]));
          console.log('[Reports] Cost map entries:', inventoryCostMap.size);
        } catch (err) {
          console.warn('Failed to fetch inventory for cost data:', err);
        }
      } else {
        console.warn('[Reports] No locationId available for inventory cost fetch');
      }

      // Calculate profit/loss
      let totalRevenue = 0;
      let totalCost = 0;
      let totalItemsSold = 0;
      const productProfitMap: Record<string, {
        productId: string;
        productName: string;
        sku: string;
        quantitySold: number;
        revenue: number;
        cost: number;
        profit: number;
      }> = {};
      const periodMap: Record<string, { revenue: number; cost: number; profit: number }> = {};

      orders.forEach((order: any) => {
        const orderDate = order.completedAt || order.createdAt;
        let periodKey: string;
        try {
          const date = typeof orderDate === 'string' ? parseISO(orderDate) : new Date(orderDate);
          periodKey = period === 'daily' 
            ? format(date, 'yyyy-MM-dd')
            : period === 'weekly'
            ? format(date, 'yyyy-\\WW')
            : format(date, 'yyyy-MM');
        } catch {
          periodKey = 'unknown';
        }

        if (!periodMap[periodKey]) {
          periodMap[periodKey] = { revenue: 0, cost: 0, profit: 0 };
        }

        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            const productId = item.productId;
            if (!productId) return;

            const product = productsMap.get(productId) as any;
            const quantity = item.quantity || 0;
            const priceCents = item.priceCents || 0;
            // Get cost from inventory (primary source) or fall back to product costCents
            const inventoryCost = inventoryCostMap.get(productId);
            const costCents = inventoryCost || product?.costCents || 0;
            
            // Debug: log if cost is missing
            if (!inventoryCost && !product?.costCents) {
              console.log('[Reports] Missing cost for product:', productId, product?.name);
            }

            const itemRevenue = priceCents * quantity;
            const itemCost = costCents * quantity;
            const itemProfit = itemRevenue - itemCost;

            totalRevenue += itemRevenue;
            totalCost += itemCost;
            totalItemsSold += quantity;

            // Update period map
            periodMap[periodKey].revenue += itemRevenue;
            periodMap[periodKey].cost += itemCost;
            periodMap[periodKey].profit += itemProfit;

            // Update product map
            if (!productProfitMap[productId]) {
              productProfitMap[productId] = {
                productId,
                productName: product?.name || `Product ${productId.substring(0, 8)}`,
                sku: product?.sku || 'N/A',
                quantitySold: 0,
                revenue: 0,
                cost: 0,
                profit: 0,
              };
            }
            productProfitMap[productId].quantitySold += quantity;
            productProfitMap[productId].revenue += itemRevenue;
            productProfitMap[productId].cost += itemCost;
            productProfitMap[productId].profit += itemProfit;
          });
        }
      });

      // Convert to arrays and calculate margins
      const byProduct = Object.values(productProfitMap)
        .map(p => ({
          ...p,
          profitMargin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0,
        }))
        .sort((a, b) => b.profit - a.profit);

      const byPeriod = Object.entries(periodMap)
        .map(([periodKey, data]) => ({
          period: periodKey,
          revenue: data.revenue,
          cost: data.cost,
          profit: data.profit,
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      const totalProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      const profitPercentage = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
      const averageProfitPerItem = totalItemsSold > 0 ? totalProfit / totalItemsSold : 0;

      setProfitLossAnalytics({
        totalRevenue: totalRevenue / 100, // Convert to currency
        totalCost: totalCost / 100,
        totalProfit: totalProfit / 100,
        profitMargin,
        profitPercentage,
        totalItemsSold,
        averageProfitPerItem: averageProfitPerItem / 100,
        byProduct: byProduct.map(p => ({
          ...p,
          revenue: p.revenue / 100,
          cost: p.cost / 100,
          profit: p.profit / 100,
        })),
        byPeriod: byPeriod.map(p => ({
          ...p,
          revenue: p.revenue / 100,
          cost: p.cost / 100,
          profit: p.profit / 100,
        })),
      });
    } catch (error: any) {
      console.error('Failed to load profit/loss analytics:', error);
      toast.error(error.response?.data?.message || 'Failed to load profit/loss analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadCreditReport = async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const params: any = {
        location_id: user?.locationId,
      };
      
      if (period === 'custom') {
        params.from = customDateFrom;
        params.to = customDateTo;
      }

      // Get all completed orders
      const ordersResponse = await axios.get(`${API_URL}/api/v1/orders`, {
        headers,
        params: {
          location_id: user?.locationId,
          status: 'completed',
          from: period === 'custom' ? customDateFrom : undefined,
          to: period === 'custom' ? customDateTo : undefined,
        },
      });

      const orders = ordersResponse.data || [];
      
      // For each order, get payments to calculate outstanding
      const creditOrders = [];
      let totalOutstanding = 0;

      for (const order of orders) {
        try {
          const paymentsResponse = await axios.get(
            `${API_URL}/api/v1/orders/${order.id}/payments`,
            { headers }
          );
          const payments = paymentsResponse.data || [];
          
          const paidAmount = payments
            .filter((p: any) => p.status === 'completed')
            .reduce((sum: number, p: any) => sum + (p.amountCents || 0), 0);
          
          const outstanding = order.totalCents - paidAmount;
          
          if (outstanding > 0) {
            creditOrders.push({
              orderId: order.id,
              orderNumber: order.orderNumber,
              customerId: order.customerId,
              totalCents: order.totalCents,
              paidCents: paidAmount,
              outstandingCents: outstanding,
              createdAt: order.createdAt,
              createdBy: order.createdBy,
              status: order.status,
            });
            totalOutstanding += outstanding;
          }
        } catch (error) {
          // If payment fetch fails, assume full payment (skip)
          console.warn(`Failed to fetch payments for order ${order.id}:`, error);
        }
      }

      // Fetch user names and customer names (with error handling)
      const enrichedOrders = await Promise.all(
        creditOrders.map(async (order) => {
          let createdByName = `User ${order.createdBy.substring(0, 8)}`;
          let customerName = order.customerId ? `Customer ${order.customerId.substring(0, 8)}` : undefined;

          // Try to fetch user name from users list
          try {
            if (order.createdBy) {
              const usersResponse = await axios.get(`${API_URL}/api/v1/users`, { headers });
              const users = usersResponse.data || [];
              const user = users.find((u: any) => u.id === order.createdBy);
              if (user?.name) {
                createdByName = user.name;
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch users:`, error);
          }

          // Try to fetch customer name
          try {
            if (order.customerId) {
              const customerResponse = await axios.get(`${API_URL}/api/v1/customers/${order.customerId}`, { headers });
              if (customerResponse.data?.name) {
                customerName = customerResponse.data.name;
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch customer ${order.customerId}:`, error);
          }

          return {
            ...order,
            createdByName,
            customerName: customerName || 'Walk-in',
          };
        })
      );

      setCreditReport({
        totalOutstanding,
        totalOrders: enrichedOrders.length,
        orders: enrichedOrders,
      });
    } catch (error: any) {
      console.error('Failed to load credit report:', error);
      toast.error(error.response?.data?.message || 'Failed to load credit report');
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryBrandAnalytics = async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const ordersParams: any = {
        status: 'completed',
        location_id: user?.locationId,
      };
      
      if (period === 'custom') {
        ordersParams.from = customDateFrom;
        ordersParams.to = customDateTo;
      } else {
        const now = new Date();
        let fromDate: Date;
        if (period === 'daily') {
          fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        } else if (period === 'weekly') {
          fromDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
        } else {
          fromDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        }
        ordersParams.from = format(fromDate, 'yyyy-MM-dd');
        ordersParams.to = format(now, 'yyyy-MM-dd');
      }

      const [ordersResponse, productsResponse] = await Promise.all([
        axios.get(`${API_URL}/api/v1/orders`, { headers, params: ordersParams }),
        axios.get(`${API_URL}/api/v1/products`, { headers }),
      ]);

      const orders = ordersResponse.data || [];
      const products = productsResponse.data || [];
      const productsMap = new Map(products.map((p: any) => [p.id, p]));

      const categoryMap: Record<string, { revenue: number; cost: number; quantity: number; orderCount: number }> = {};
      const brandMap: Record<string, { revenue: number; cost: number; quantity: number; orderCount: number }> = {};
      const orderIds = new Set<string>();

      orders.forEach((order: any) => {
        if (order.items && Array.isArray(order.items)) {
          orderIds.add(order.id);
          order.items.forEach((item: any) => {
            const product = productsMap.get(item.productId);
            if (!product) return;

            const revenue = (item.priceCents || 0) * (item.quantity || 0);
            const cost = ((product as any).costCents || 0) * (item.quantity || 0);

            // Category analytics
            if ((product as any).categoryId) {
              const catId = (product as any).categoryId;
              if (!categoryMap[catId]) {
                categoryMap[catId] = { revenue: 0, cost: 0, quantity: 0, orderCount: 0 };
              }
              categoryMap[catId].revenue += revenue;
              categoryMap[catId].cost += cost;
              categoryMap[catId].quantity += item.quantity || 0;
            }

            // Brand analytics
            if ((product as any).brandId) {
              const brandId = (product as any).brandId;
              if (!brandMap[brandId]) {
                brandMap[brandId] = { revenue: 0, cost: 0, quantity: 0, orderCount: 0 };
              }
              brandMap[brandId].revenue += revenue;
              brandMap[brandId].cost += cost;
              brandMap[brandId].quantity += item.quantity || 0;
            }
          });
        }
      });

      // Set order counts
      Object.keys(categoryMap).forEach(catId => {
        categoryMap[catId].orderCount = orderIds.size;
      });
      Object.keys(brandMap).forEach(brandId => {
        brandMap[brandId].orderCount = orderIds.size;
      });

      const byCategory = Object.entries(categoryMap)
        .map(([categoryId, stats]) => {
          const category = products.find((p: any) => (p as any).categoryId === categoryId);
          const profit = (stats.revenue / 100) - (stats.cost / 100);
          const profitMargin = stats.revenue > 0 ? (profit / (stats.revenue / 100)) * 100 : 0;
          return {
            categoryId,
            categoryName: (category as any)?.categoryName || 'Uncategorized',
            revenue: stats.revenue / 100,
            cost: stats.cost / 100,
            profit,
            profitMargin,
            quantitySold: stats.quantity,
            orderCount: stats.orderCount,
          };
        })
        .sort((a, b) => b.revenue - a.revenue);

      const byBrand = Object.entries(brandMap)
        .map(([brandId, stats]) => {
          const brand = products.find((p: any) => (p as any).brandId === brandId);
          const profit = (stats.revenue / 100) - (stats.cost / 100);
          const profitMargin = stats.revenue > 0 ? (profit / (stats.revenue / 100)) * 100 : 0;
          return {
            brandId,
            brandName: (brand as any)?.brandName || 'Unbranded',
            revenue: stats.revenue / 100,
            cost: stats.cost / 100,
            profit,
            profitMargin,
            quantitySold: stats.quantity,
            orderCount: stats.orderCount,
          };
        })
        .sort((a, b) => b.revenue - a.revenue);

      setCategoryBrandAnalytics({ byCategory, byBrand });
    } catch (error: any) {
      console.error('Failed to load category/brand analytics:', error);
      toast.error(error.response?.data?.message || 'Failed to load category/brand analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadTimeBasedInsights = async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const ordersParams: any = {
        status: 'completed',
        location_id: user?.locationId,
      };
      
      if (period === 'custom') {
        ordersParams.from = customDateFrom;
        ordersParams.to = customDateTo;
      } else {
        const now = new Date();
        let fromDate: Date;
        if (period === 'daily') {
          fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        } else if (period === 'weekly') {
          fromDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
        } else {
          fromDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        }
        ordersParams.from = format(fromDate, 'yyyy-MM-dd');
        ordersParams.to = format(now, 'yyyy-MM-dd');
      }

      const ordersResponse = await axios.get(`${API_URL}/api/v1/orders`, {
        headers,
        params: ordersParams,
      });

      const orders = ordersResponse.data || [];
      
      // Initialize hour buckets (0-23)
      const hourMap: Record<number, { sales: number; orders: number; items: number }> = {};
      for (let i = 0; i < 24; i++) {
        hourMap[i] = { sales: 0, orders: 0, items: 0 };
      }

      // Initialize day of week buckets
      const dayMap: Record<string, { sales: number; orders: number; items: number }> = {
        'Sunday': { sales: 0, orders: 0, items: 0 },
        'Monday': { sales: 0, orders: 0, items: 0 },
        'Tuesday': { sales: 0, orders: 0, items: 0 },
        'Wednesday': { sales: 0, orders: 0, items: 0 },
        'Thursday': { sales: 0, orders: 0, items: 0 },
        'Friday': { sales: 0, orders: 0, items: 0 },
        'Saturday': { sales: 0, orders: 0, items: 0 },
      };

      // Initialize month buckets
      const monthMap: Record<string, { sales: number; orders: number; items: number }> = {};

      const orderIds = new Set<string>();
      let totalHours = 0;

      orders.forEach((order: any) => {
        const orderDate = new Date(order.completedAt || order.createdAt);
        const hour = orderDate.getHours();
        const dayName = format(orderDate, 'EEEE');
        const monthKey = format(orderDate, 'yyyy-MM');

        orderIds.add(order.id);
        totalHours++;

        if (!monthMap[monthKey]) {
          monthMap[monthKey] = { sales: 0, orders: 0, items: 0 };
        }

        const orderTotal = order.totalCents || 0;
        let itemCount = 0;
        if (order.items && Array.isArray(order.items)) {
          itemCount = order.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
        }

        hourMap[hour].sales += orderTotal;
        hourMap[hour].orders += 1;
        hourMap[hour].items += itemCount;

        dayMap[dayName].sales += orderTotal;
        dayMap[dayName].orders += 1;
        dayMap[dayName].items += itemCount;

        monthMap[monthKey].sales += orderTotal;
        monthMap[monthKey].orders += 1;
        monthMap[monthKey].items += itemCount;
      });

      const byHour = Object.entries(hourMap)
        .map(([hour, data]) => ({
          hour: parseInt(hour),
          sales: data.sales / 100,
          orders: data.orders,
          items: data.items,
        }))
        .sort((a, b) => a.hour - b.hour);

      const byDayOfWeek = Object.entries(dayMap)
        .map(([day, data]) => ({
          day,
          sales: data.sales / 100,
          orders: data.orders,
          items: data.items,
        }));

      const byMonth = Object.entries(monthMap)
        .map(([month, data]) => ({
          month,
          sales: data.sales / 100,
          orders: data.orders,
          items: data.items,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      const peakHour = byHour.reduce((max, curr) => curr.sales > max.sales ? curr : max, byHour[0]);
      const bestDay = byDayOfWeek.reduce((max, curr) => curr.sales > max.sales ? curr : byDayOfWeek[0]);
      
      // Calculate sales velocity (items per hour)
      const totalItems = byHour.reduce((sum, h) => sum + h.items, 0);
      const salesVelocity = totalHours > 0 ? totalItems / totalHours : 0;

      // Year over year comparison (simplified - compare with previous period)
      const yearOverYear: Array<{ period: string; current: number; previous: number; change: number }> = [];
      // This would need historical data - placeholder for now
      
      setTimeBasedInsights({
        byHour,
        byDayOfWeek,
        byMonth,
        peakHour: { hour: peakHour.hour, sales: peakHour.sales },
        bestDay: { day: bestDay.day, sales: bestDay.sales },
        salesVelocity,
        yearOverYear,
      });
    } catch (error: any) {
      console.error('Failed to load time-based insights:', error);
      toast.error(error.response?.data?.message || 'Failed to load time-based insights');
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryHealth = async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      
      // Fetch inventory stock
      const inventoryResponse = await axios.get(
        `${API_URL}/api/v1/inventory/${user?.locationId}/stock`,
        { headers }
      );
      const inventory = inventoryResponse.data || [];

      // Fetch inventory transactions
      const transactionsResponse = await axios.get(
        `${API_URL}/api/v1/inventory/${user?.locationId}/transactions`,
        { headers }
      );
      const transactions = transactionsResponse.data || [];

      // Fetch products for cost data
      const productsResponse = await axios.get(`${API_URL}/api/v1/products`, { headers });
      const products = productsResponse.data || [];
      const productsMap = new Map(products.map((p: any) => [p.id, p]));

      // Fetch orders to calculate sales velocity
      const ordersParams: any = {
        status: 'completed',
        location_id: user?.locationId,
      };
      if (period === 'custom') {
        ordersParams.from = customDateFrom;
        ordersParams.to = customDateTo;
      } else {
        const now = new Date();
        let fromDate: Date;
        if (period === 'daily') {
          fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        } else if (period === 'weekly') {
          fromDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
        } else {
          fromDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        }
        ordersParams.from = format(fromDate, 'yyyy-MM-dd');
        ordersParams.to = format(now, 'yyyy-MM-dd');
      }

      const ordersResponse = await axios.get(`${API_URL}/api/v1/orders`, {
        headers,
        params: ordersParams,
      });
      const orders = ordersResponse.data || [];

      // Calculate sales by product
      const salesMap: Record<string, { quantity: number; lastSold?: string }> = {};
      orders.forEach((order: any) => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            if (!salesMap[item.productId]) {
              salesMap[item.productId] = { quantity: 0 };
            }
            salesMap[item.productId].quantity += item.quantity || 0;
            const orderDate = order.completedAt || order.createdAt;
            if (!salesMap[item.productId].lastSold || orderDate > salesMap[item.productId].lastSold!) {
              salesMap[item.productId].lastSold = orderDate;
            }
          });
        }
      });

      // Analyze inventory
      const now = new Date();
      const slowMoving: Array<{
        productId: string;
        productName: string;
        sku: string;
        quantity: number;
        lastSold?: string;
        daysSinceLastSale: number;
      }> = [];
      const lowStock: Array<{
        productId: string;
        productName: string;
        sku: string;
        currentStock: number;
        reorderPoint?: number;
        daysRemaining: number;
      }> = [];
      const deadStock: Array<{
        productId: string;
        productName: string;
        sku: string;
        quantity: number;
        value: number;
        lastSold?: string;
      }> = [];

      let totalInventoryValue = 0;
      let totalSalesQuantity = 0;

      inventory.forEach((item: any) => {
        const product = productsMap.get(item.productId) as any;
        if (!product) return;

        const sales = salesMap[item.productId] || { quantity: 0 };
        const stock = item.quantity || 0;
        const costCents = (product as any).costCents || (product as any).priceCents || 0;
        const inventoryValue = (costCents * stock) / 100;
        totalInventoryValue += inventoryValue;
        totalSalesQuantity += sales.quantity;

        // Slow moving (no sales in last 90 days)
        if (sales.lastSold) {
          const lastSoldDate = new Date(sales.lastSold);
          const daysSince = Math.floor((now.getTime() - lastSoldDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSince > 90 && stock > 0) {
            slowMoving.push({
              productId: item.productId,
              productName: (product as any).name,
              sku: (product as any).sku,
              quantity: stock,
              lastSold: sales.lastSold,
              daysSinceLastSale: daysSince,
            });
          }
        } else if (stock > 0) {
          // Never sold
          slowMoving.push({
            productId: item.productId,
            productName: (product as any).name,
            sku: (product as any).sku,
            quantity: stock,
            daysSinceLastSale: 999,
          });
        }

        // Low stock
        const reorderPoint = item.reorderPoint || 0;
        if (stock <= reorderPoint && stock > 0) {
          const avgDailySales = sales.quantity > 0 ? sales.quantity / 30 : 0;
          const daysRemaining = avgDailySales > 0 ? Math.floor(stock / avgDailySales) : 0;
          lowStock.push({
            productId: item.productId,
            productName: (product as any).name,
            sku: (product as any).sku,
            currentStock: stock,
            reorderPoint,
            daysRemaining,
          });
        }

        // Dead stock (no sales in 180+ days and has stock)
        if (sales.lastSold) {
          const lastSoldDate = new Date(sales.lastSold);
          const daysSince = Math.floor((now.getTime() - lastSoldDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSince > 180 && stock > 0) {
            deadStock.push({
              productId: item.productId,
              productName: (product as any).name,
              sku: (product as any).sku,
              quantity: stock,
              value: inventoryValue,
              lastSold: sales.lastSold,
            });
          }
        } else if (stock > 0) {
          deadStock.push({
            productId: item.productId,
            productName: (product as any).name,
            sku: (product as any).sku,
            quantity: stock,
            value: inventoryValue,
          });
        }
      });

      // Calculate turnover rate (simplified: sales / average inventory)
      const avgInventory = inventory.length > 0 
        ? inventory.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) / inventory.length
        : 0;
      const turnoverRate = avgInventory > 0 ? totalSalesQuantity / avgInventory : 0;

      // Calculate stockout frequency (products with 0 stock that had sales)
      const stockoutCount = inventory.filter((item: any) => {
        const stock = item.quantity || 0;
        const sales = salesMap[item.productId];
        return stock === 0 && sales && sales.quantity > 0;
      }).length;
      const stockoutFrequency = inventory.length > 0 ? (stockoutCount / inventory.length) * 100 : 0;

      setInventoryHealth({
        turnoverRate,
        slowMovingProducts: slowMoving.sort((a, b) => b.daysSinceLastSale - a.daysSinceLastSale),
        lowStockProducts: lowStock.sort((a, b) => a.daysRemaining - b.daysRemaining),
        deadStock: deadStock.sort((a, b) => b.value - a.value),
        stockoutFrequency,
      });
    } catch (error: any) {
      console.error('Failed to load inventory health:', error);
      toast.error(error.response?.data?.message || 'Failed to load inventory health');
    } finally {
      setLoading(false);
    }
  };

  const loadAlertsAndRisk = async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const baseParams: any = {
        location_id: user?.locationId,
      };

      const rangeParams: any = {};
      if (period === 'custom') {
        rangeParams.from = customDateFrom;
        rangeParams.to = customDateTo;
      }

      const [alertsRes, fraudRes, shrinkageRes] = await Promise.all([
        axios.get(`${API_URL}/api/v1/reports/alerts`, {
          headers,
          params: baseParams,
        }),
        axios.get(`${API_URL}/api/v1/reports/fraud-detection`, {
          headers,
          params: { ...baseParams, ...rangeParams },
        }),
        axios.get(`${API_URL}/api/v1/reports/shrinkage-detection`, {
          headers,
          params: { ...baseParams, ...rangeParams },
        }),
      ]);

      setSmartAlerts(alertsRes.data);
      setFraudDetection(fraudRes.data);
      setShrinkageDetection(shrinkageRes.data);

      // Compare with previous alerts to show notifications only when something new appears
      const currentSummary = {
        total: alertsRes.data?.totalAlerts ?? 0,
        critical: alertsRes.data?.criticalCount ?? 0,
      };
      const prev = lastAlertsSummaryRef.current;

      if (prev) {
        if (currentSummary.critical > prev.critical) {
          const diff = currentSummary.critical - prev.critical;
          toast.error(
            `You have ${currentSummary.critical} critical alert${currentSummary.critical === 1 ? '' : 's'} (${diff} new).`,
            { id: 'critical-alerts' },
          );
        } else if (currentSummary.total > prev.total) {
          const diff = currentSummary.total - prev.total;
          toast(
            `You have ${currentSummary.total} alerts in total (${diff} new).`,
            { id: 'alerts-summary' },
          );
        }
      }

      lastAlertsSummaryRef.current = currentSummary;
    } catch (error: any) {
      console.error('Failed to load alerts & risk analytics:', error);
      toast.error(error.response?.data?.message || 'Failed to load alerts & risk analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerSegmentation = async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const params: any = {
        location_id: user?.locationId,
      };
      if (period === 'custom') {
        params.from = customDateFrom;
        params.to = customDateTo;
      }

      const response = await axios.get(`${API_URL}/api/v1/reports/customer-segmentation`, {
        headers,
        params,
      });
      setCustomerSegments(response.data);
    } catch (error: any) {
      console.error('Failed to load customer segmentation analytics:', error);
      toast.error(error.response?.data?.message || 'Failed to load customer analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadDiscountAnalytics = async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const ordersParams: any = {
        status: 'completed',
        location_id: user?.locationId,
      };
      
      if (period === 'custom') {
        ordersParams.from = customDateFrom;
        ordersParams.to = customDateTo;
      } else {
        const now = new Date();
        let fromDate: Date;
        if (period === 'daily') {
          fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        } else if (period === 'weekly') {
          fromDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
        } else {
          fromDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        }
        ordersParams.from = format(fromDate, 'yyyy-MM-dd');
        ordersParams.to = format(now, 'yyyy-MM-dd');
      }

      const ordersResponse = await axios.get(`${API_URL}/api/v1/orders`, {
        headers,
        params: ordersParams,
      });

      const orders = ordersResponse.data || [];
      
      let totalDiscountAmount = 0;
      let ordersWithDiscount = 0;
      let totalDiscountPercent = 0;
      let revenueWithDiscount = 0;
      let revenueWithoutDiscount = 0;
      let profitWithDiscount = 0;
      let profitWithoutDiscount = 0;
      const discountTypeMap: Record<string, { count: number; totalAmount: number; totalPercent: number }> = {};

      // Fetch products for cost calculation
      const productsResponse = await axios.get(`${API_URL}/api/v1/products`, { headers });
      const products = productsResponse.data || [];
      const productsMap = new Map(products.map((p: any) => [p.id, p]));

      orders.forEach((order: any) => {
        const orderTotal = order.totalCents || 0;
        const cartDiscountCents = order.cartDiscountCents || 0;
        const cartDiscountPercent = order.cartDiscountPercent || 0;
        const hasDiscount = cartDiscountCents > 0 || cartDiscountPercent > 0;

        // Calculate what revenue would be without discount
        let itemsSubtotal = 0;
        let itemsCost = 0;
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              const product = productsMap.get(item.productId) as any;
              itemsSubtotal += (item.priceCents || 0) * (item.quantity || 0);
              itemsCost += ((product as any)?.costCents || 0) * (item.quantity || 0);
            });
          }

        const discountAmount = cartDiscountCents > 0 
          ? cartDiscountCents 
          : cartDiscountPercent > 0 
            ? Math.round(itemsSubtotal * (cartDiscountPercent / 100))
            : 0;
        
        const discountPercent = itemsSubtotal > 0 
          ? (discountAmount / itemsSubtotal) * 100 
          : 0;

        const revenueAfterDiscount = itemsSubtotal - discountAmount;
        const profitAfterDiscount = revenueAfterDiscount - itemsCost;
        const profitBeforeDiscount = itemsSubtotal - itemsCost;

        if (hasDiscount) {
          ordersWithDiscount++;
          totalDiscountAmount += discountAmount;
          totalDiscountPercent += discountPercent;
          revenueWithDiscount += revenueAfterDiscount;
          profitWithDiscount += profitAfterDiscount;

          const discountType = cartDiscountCents > 0 ? 'Fixed Amount' : 'Percentage';
          if (!discountTypeMap[discountType]) {
            discountTypeMap[discountType] = { count: 0, totalAmount: 0, totalPercent: 0 };
          }
          discountTypeMap[discountType].count++;
          discountTypeMap[discountType].totalAmount += discountAmount;
          discountTypeMap[discountType].totalPercent += discountPercent;
        } else {
          revenueWithoutDiscount += itemsSubtotal;
          profitWithoutDiscount += profitBeforeDiscount;
        }
      });

      const byDiscountType = Object.entries(discountTypeMap)
        .map(([type, data]) => ({
          type,
          count: data.count,
          totalAmount: data.totalAmount / 100,
          avgPercent: data.count > 0 ? (data.totalPercent / data.count) : 0,
        }));

      setDiscountAnalytics({
        totalDiscountAmount: totalDiscountAmount / 100,
        totalDiscountPercentage: orders.length > 0 ? (ordersWithDiscount / orders.length) * 100 : 0,
        ordersWithDiscount,
        averageDiscountPercent: ordersWithDiscount > 0 ? (totalDiscountPercent / ordersWithDiscount) : 0,
        discountImpact: {
          revenueWithDiscount: revenueWithDiscount / 100,
          revenueWithoutDiscount: revenueWithoutDiscount / 100,
          profitWithDiscount: profitWithDiscount / 100,
          profitWithoutDiscount: profitWithoutDiscount / 100,
        },
        byDiscountType,
      });
    } catch (error: any) {
      console.error('Failed to load discount analytics:', error);
      toast.error(error.response?.data?.message || 'Failed to load discount analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentMethodInsights = async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const ordersParams: any = {
        status: 'completed',
        location_id: user?.locationId,
      };
      
      if (period === 'custom') {
        ordersParams.from = customDateFrom;
        ordersParams.to = customDateTo;
      } else {
        const now = new Date();
        let fromDate: Date;
        if (period === 'daily') {
          fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        } else if (period === 'weekly') {
          fromDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
        } else {
          fromDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        }
        ordersParams.from = format(fromDate, 'yyyy-MM-dd');
        ordersParams.to = format(now, 'yyyy-MM-dd');
      }

      const ordersResponse = await axios.get(`${API_URL}/api/v1/orders`, {
        headers,
        params: ordersParams,
      });

      const orders = ordersResponse.data || [];
      
      const methodMap: Record<string, { count: number; totalAmount: number }> = {};
      let totalAmount = 0;
      let totalCount = 0;

      // Fetch payments for each order
      for (const order of orders) {
        try {
          const paymentsResponse = await axios.get(
            `${API_URL}/api/v1/orders/${order.id}/payments`,
            { headers }
          );
          const payments = paymentsResponse.data || [];
          
          payments
            .filter((p: any) => p.status === 'completed')
            .forEach((payment: any) => {
              const method = payment.method || 'unknown';
              const amount = payment.amountCents || 0;
              
              if (!methodMap[method]) {
                methodMap[method] = { count: 0, totalAmount: 0 };
              }
              
              methodMap[method].count += 1;
              methodMap[method].totalAmount += amount;
              totalAmount += amount;
              totalCount += 1;
            });
        } catch (error) {
          console.warn(`Failed to fetch payments for order ${order.id}:`, error);
        }
      }

      const byMethod = Object.entries(methodMap)
        .map(([method, data]) => ({
          method: method.charAt(0).toUpperCase() + method.slice(1),
          count: data.count,
          totalAmount: data.totalAmount / 100,
          averageAmount: data.count > 0 ? (data.totalAmount / 100) / data.count : 0,
          percentage: totalAmount > 0 ? (data.totalAmount / totalAmount) * 100 : 0,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);

      // Calculate cash vs digital
      const cashMethods = ['cash', 'Cash'];
      const cashTotal = byMethod
        .filter(m => cashMethods.includes(m.method))
        .reduce((sum, m) => sum + m.totalAmount, 0);
      const digitalTotal = byMethod
        .filter(m => !cashMethods.includes(m.method))
        .reduce((sum, m) => sum + m.totalAmount, 0);
      
      const cashCount = byMethod
        .filter(m => cashMethods.includes(m.method))
        .reduce((sum, m) => sum + m.count, 0);
      const digitalCount = totalCount - cashCount;

      setPaymentMethodInsights({
        byMethod,
        cashVsDigital: {
          cash: {
            count: cashCount,
            amount: cashTotal,
            percentage: totalAmount > 0 ? (cashTotal / (totalAmount / 100)) * 100 : 0,
          },
          digital: {
            count: digitalCount,
            amount: digitalTotal,
            percentage: totalAmount > 0 ? (digitalTotal / (totalAmount / 100)) * 100 : 0,
          },
        },
        trends: [], // TODO: Implement trends over time
      });
    } catch (error: any) {
      console.error('Failed to load payment method insights:', error);
      toast.error(error.response?.data?.message || 'Failed to load payment method insights');
    } finally {
      setLoading(false);
    }
  };

  const loadReturnRefundAnalytics = async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const params: any = {
        location_id: user?.locationId,
      };
      
      if (period === 'custom') {
        params.from = customDateFrom;
        params.to = customDateTo;
      }

      // Fetch returns
      const returnsResponse = await axios.get(`${API_URL}/api/v1/returns`, { headers, params });
      const returns = returnsResponse.data || [];

      // Fetch orders for comparison
      const ordersParams: any = {
        status: 'completed',
        location_id: user?.locationId,
      };
      if (period === 'custom') {
        ordersParams.from = customDateFrom;
        ordersParams.to = customDateTo;
      } else {
        const now = new Date();
        let fromDate: Date;
        if (period === 'daily') {
          fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        } else if (period === 'weekly') {
          fromDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
        } else {
          fromDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        }
        ordersParams.from = format(fromDate, 'yyyy-MM-dd');
        ordersParams.to = format(now, 'yyyy-MM-dd');
      }

      const ordersResponse = await axios.get(`${API_URL}/api/v1/orders`, {
        headers,
        params: ordersParams,
      });
      const orders = ordersResponse.data || [];

      // Fetch products for category mapping
      const productsResponse = await axios.get(`${API_URL}/api/v1/products`, { headers });
      const products = productsResponse.data || [];
      const productsMap = new Map(products.map((p: any) => [p.id, p]));

      // Calculate totals
      const totalReturns = returns.length;
      const totalRefundAmount = returns.reduce((sum: number, r: any) => sum + (r.totalRefundCents || 0), 0);
      const totalOrders = orders.length;
      const returnRate = totalOrders > 0 ? (totalReturns / totalOrders) * 100 : 0;

      // Analyze by product
      const productReturnMap: Record<string, {
        returnCount: number;
        refundAmount: number;
        totalSold: number;
      }> = {};

      // Count sales by product
      orders.forEach((order: any) => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            if (!productReturnMap[item.productId]) {
              productReturnMap[item.productId] = { returnCount: 0, refundAmount: 0, totalSold: 0 };
            }
            productReturnMap[item.productId].totalSold += item.quantity || 0;
          });
        }
      });

      // Count returns by product
      returns.forEach((ret: any) => {
        if (ret.items && Array.isArray(ret.items)) {
          ret.items.forEach((item: any) => {
            if (!productReturnMap[item.productId]) {
              productReturnMap[item.productId] = { returnCount: 0, refundAmount: 0, totalSold: 0 };
            }
            productReturnMap[item.productId].returnCount += 1;
            productReturnMap[item.productId].refundAmount += item.refundAmountCents || 0;
          });
        }
      });

      const byProduct = Object.entries(productReturnMap)
        .filter(([_, data]) => data.returnCount > 0)
        .map(([productId, data]) => {
          const product = productsMap.get(productId) as any;
          const returnRate = data.totalSold > 0 ? (data.returnCount / data.totalSold) * 100 : 0;
          return {
            productId,
            productName: product?.name || `Product ${productId.substring(0, 8)}`,
            sku: product?.sku || 'N/A',
            returnCount: data.returnCount,
            returnRate,
            refundAmount: data.refundAmount / 100,
          };
        })
        .sort((a, b) => b.returnCount - a.returnCount);

      // Analyze by category
      const categoryReturnMap: Record<string, {
        returnCount: number;
        refundAmount: number;
        totalSold: number;
      }> = {};

      orders.forEach((order: any) => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            const product = productsMap.get(item.productId) as any;
            if (product?.categoryId) {
              if (!categoryReturnMap[product.categoryId]) {
                categoryReturnMap[product.categoryId] = { returnCount: 0, refundAmount: 0, totalSold: 0 };
              }
              categoryReturnMap[product.categoryId].totalSold += item.quantity || 0;
            }
          });
        }
      });

      returns.forEach((ret: any) => {
        if (ret.items && Array.isArray(ret.items)) {
          ret.items.forEach((item: any) => {
            const product = productsMap.get(item.productId) as any;
            if (product?.categoryId) {
              if (!categoryReturnMap[product.categoryId]) {
                categoryReturnMap[product.categoryId] = { returnCount: 0, refundAmount: 0, totalSold: 0 };
              }
              categoryReturnMap[product.categoryId].returnCount += 1;
              categoryReturnMap[product.categoryId].refundAmount += item.refundAmountCents || 0;
            }
          });
        }
      });

      const byCategory = Object.entries(categoryReturnMap)
        .filter(([_, data]) => data.returnCount > 0)
        .map(([categoryId, data]) => {
          const category = products.find((p: any) => p.categoryId === categoryId);
          const returnRate = data.totalSold > 0 ? (data.returnCount / data.totalSold) * 100 : 0;
          return {
            categoryId,
            categoryName: category?.categoryName || 'Uncategorized',
            returnCount: data.returnCount,
            returnRate,
            refundAmount: data.refundAmount / 100,
          };
        })
        .sort((a, b) => b.returnCount - a.returnCount);

      // Calculate impact on profit (refund amount reduces profit)
      const impactOnProfit = totalRefundAmount / 100;

      // Trends by period
      const periodMap: Record<string, { returns: number; refundAmount: number }> = {};
      returns.forEach((ret: any) => {
        const retDate = ret.createdAt || ret.updatedAt;
        let periodKey: string;
        try {
          const date = typeof retDate === 'string' ? parseISO(retDate) : new Date(retDate);
          periodKey = period === 'daily' 
            ? format(date, 'yyyy-MM-dd')
            : period === 'weekly'
            ? format(date, 'yyyy-\\WW')
            : format(date, 'yyyy-MM');
        } catch {
          periodKey = 'unknown';
        }
        if (!periodMap[periodKey]) {
          periodMap[periodKey] = { returns: 0, refundAmount: 0 };
        }
        periodMap[periodKey].returns += 1;
        periodMap[periodKey].refundAmount += ret.totalRefundCents || 0;
      });

      const trends = Object.entries(periodMap)
        .map(([period, data]) => ({
          period,
          returns: data.returns,
          refundAmount: data.refundAmount / 100,
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      setReturnRefundAnalytics({
        totalReturns,
        totalRefundAmount: totalRefundAmount / 100,
        returnRate,
        byProduct,
        byCategory,
        impactOnProfit,
        trends,
      });
    } catch (error: any) {
      console.error('Failed to load return/refund analytics:', error);
      toast.error(error.response?.data?.message || 'Failed to load return/refund analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadBasketAnalysis = async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const ordersParams: any = {
        status: 'completed',
        location_id: user?.locationId,
      };
      
      if (period === 'custom') {
        ordersParams.from = customDateFrom;
        ordersParams.to = customDateTo;
      } else {
        const now = new Date();
        let fromDate: Date;
        if (period === 'daily') {
          fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        } else if (period === 'weekly') {
          fromDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
        } else {
          fromDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        }
        ordersParams.from = format(fromDate, 'yyyy-MM-dd');
        ordersParams.to = format(now, 'yyyy-MM-dd');
      }

      const ordersResponse = await axios.get(`${API_URL}/api/v1/orders`, {
        headers,
        params: ordersParams,
      });

      const orders = ordersResponse.data || [];
      
      // Fetch products for names
      const productsResponse = await axios.get(`${API_URL}/api/v1/products`, { headers });
      const products = productsResponse.data || [];
      const productsMap = new Map(products.map((p: any) => [p.id, p]));

      let totalItems = 0;
      const productPairs: Record<string, number> = {};
      const productBaskets: Record<string, Set<string>> = {};

      orders.forEach((order: any) => {
        if (order.items && Array.isArray(order.items) && order.items.length > 1) {
          const productIds = order.items.map((item: any) => item.productId).filter(Boolean);
          totalItems += productIds.length;

          // Track product pairs (frequently bought together)
          for (let i = 0; i < productIds.length; i++) {
            for (let j = i + 1; j < productIds.length; j++) {
              const pair = [productIds[i], productIds[j]].sort().join('|');
              productPairs[pair] = (productPairs[pair] || 0) + 1;
            }
          }

          // Track which products appear together
          productIds.forEach((productId: string) => {
            if (!productBaskets[productId]) {
              productBaskets[productId] = new Set();
            }
            productIds.forEach((otherId: string) => {
              if (otherId !== productId) {
                productBaskets[productId].add(otherId);
              }
            });
          });
        } else if (order.items && Array.isArray(order.items) && order.items.length === 1) {
          totalItems += 1;
        }
      });

      const averageItemsPerOrder = orders.length > 0 ? totalItems / orders.length : 0;

      // Find frequently bought together (top pairs)
      const frequentlyBoughtTogether = Object.entries(productPairs)
        .map(([pair, frequency]) => {
          const [id1, id2] = pair.split('|');
          const product1 = productsMap.get(id1) as any;
          const product2 = productsMap.get(id2) as any;
          const support = orders.length > 0 ? (frequency / orders.length) * 100 : 0;
          return {
            products: [
              product1?.name || `Product ${id1.substring(0, 8)}`,
              product2?.name || `Product ${id2.substring(0, 8)}`,
            ],
            frequency,
            support,
          };
        })
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 20);

      // Cross-sell opportunities (products that appear together often)
      const crossSellOpportunities = Object.entries(productBaskets)
        .map(([productId, relatedProducts]) => {
          const product = productsMap.get(productId) as any;
          const related = Array.from(relatedProducts)
            .map((relatedId) => {
              const relatedProduct = productsMap.get(relatedId) as any;
              const pairKey = [productId, relatedId].sort().join('|');
              const frequency = productPairs[pairKey] || 0;
              const confidence = orders.length > 0 ? (frequency / orders.length) * 100 : 0;
              return {
                productId: relatedId,
                productName: relatedProduct?.name || `Product ${relatedId.substring(0, 8)}`,
                confidence,
              };
            })
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 5);

          return {
            productId,
            productName: product?.name || `Product ${productId.substring(0, 8)}`,
            suggestedProducts: related,
          };
        })
        .filter(item => item.suggestedProducts.length > 0)
        .sort((a, b) => {
          const aMaxConfidence = Math.max(...a.suggestedProducts.map(p => p.confidence));
          const bMaxConfidence = Math.max(...b.suggestedProducts.map(p => p.confidence));
          return bMaxConfidence - aMaxConfidence;
        })
        .slice(0, 10);

      // Top bundles (product combinations that appear together)
      const topBundles = frequentlyBoughtTogether
        .map(pair => {
          // Calculate revenue for this pair
          let revenue = 0;
          orders.forEach((order: any) => {
            if (order.items && Array.isArray(order.items)) {
              const hasBoth = pair.products.every(productName => 
                order.items.some((item: any) => {
                  const product = productsMap.get(item.productId) as any;
                  return product?.name === productName;
                })
              );
              if (hasBoth) {
                revenue += order.totalCents || 0;
              }
            }
          });
          return {
            products: pair.products,
            frequency: pair.frequency,
            revenue: revenue / 100,
          };
        })
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10);

      setBasketAnalysis({
        averageItemsPerOrder,
        frequentlyBoughtTogether,
        crossSellOpportunities,
        topBundles,
      });
    } catch (error: any) {
      console.error('Failed to load basket analysis:', error);
      toast.error(error.response?.data?.message || 'Failed to load basket analysis');
    } finally {
      setLoading(false);
    }
  };

  const loadSalesTrendsForecasting = async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      
      // Get current period data
      const currentParams: any = {
        status: 'completed',
        location_id: user?.locationId,
      };
      
      if (period === 'custom') {
        currentParams.from = customDateFrom;
        currentParams.to = customDateTo;
      } else {
        const now = new Date();
        let fromDate: Date;
        if (period === 'daily') {
          fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        } else if (period === 'weekly') {
          fromDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
        } else {
          fromDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        }
        currentParams.from = format(fromDate, 'yyyy-MM-dd');
        currentParams.to = format(now, 'yyyy-MM-dd');
      }

      const currentOrdersResponse = await axios.get(`${API_URL}/api/v1/orders`, {
        headers,
        params: currentParams,
      });
      const currentOrders = currentOrdersResponse.data || [];

      // Get previous period data for comparison
      const previousParams = { ...currentParams };
      const now = new Date();
      let previousFromDate: Date;
      let previousToDate: Date;
      
      if (period === 'custom') {
        const fromDate = parseISO(customDateFrom);
        const toDate = parseISO(customDateTo);
        const daysDiff = Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
        previousToDate = new Date(fromDate);
        previousToDate.setDate(previousToDate.getDate() - 1);
        previousFromDate = new Date(previousToDate);
        previousFromDate.setDate(previousFromDate.getDate() - daysDiff);
      } else if (period === 'daily') {
        previousToDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        previousFromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 59);
      } else if (period === 'weekly') {
        previousToDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
        previousFromDate = new Date(now.getTime() - 24 * 7 * 24 * 60 * 60 * 1000);
      } else {
        previousToDate = new Date(now.getFullYear() - 1, now.getMonth(), 0);
        previousFromDate = new Date(now.getFullYear() - 2, now.getMonth(), 1);
      }

      previousParams.from = format(previousFromDate, 'yyyy-MM-dd');
      previousParams.to = format(previousToDate, 'yyyy-MM-dd');

      const previousOrdersResponse = await axios.get(`${API_URL}/api/v1/orders`, {
        headers,
        params: previousParams,
      });
      const previousOrders = previousOrdersResponse.data || [];

      // Calculate current period sales
      const currentSales = currentOrders.reduce((sum: number, order: any) => sum + (order.totalCents || 0), 0) / 100;
      const previousSales = previousOrders.reduce((sum: number, order: any) => sum + (order.totalCents || 0), 0) / 100;
      
      // Calculate growth rate
      const growthRate = previousSales > 0 ? ((currentSales - previousSales) / previousSales) * 100 : 0;
      
      // Determine trend
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (growthRate > 5) trend = 'up';
      else if (growthRate < -5) trend = 'down';

      // Calculate moving average (simplified - using period data)
      const salesAnalyticsResponse = await axios.get(`${API_URL}/api/v1/reports/sales-analytics`, {
        headers,
        params: currentParams,
      });
      const salesData = salesAnalyticsResponse.data?.data || [];
      
      const movingAverage = salesData.map((item: any) => ({
        period: item.period,
        value: item.sales / 100,
      }));

      // Simple forecast (linear projection based on recent trend)
      const recentData = salesData.slice(-7); // Last 7 periods
      const avgRecentSales = recentData.length > 0
        ? recentData.reduce((sum: number, item: any) => sum + (item.sales || 0), 0) / recentData.length / 100
        : 0;
      
      const forecastedSales = Array.from({ length: 7 }, (_, i) => ({
        period: `Forecast ${i + 1}`,
        forecast: avgRecentSales * (1 + (growthRate / 100)),
        confidence: Math.max(50, 100 - (i * 5)), // Decreasing confidence
      }));

      // Variance analysis
      const variance = salesData.map((item: any) => {
        const actual = item.sales / 100;
        const expected = avgRecentSales;
        const variance = actual - expected;
        const variancePercent = expected > 0 ? (variance / expected) * 100 : 0;
        return {
          period: item.period,
          actual,
          expected,
          variance,
          variancePercent,
        };
      });

      setSalesTrendsForecasting({
        growthRate,
        trend,
        forecastedSales,
        variance,
        movingAverage,
      });
    } catch (error: any) {
      console.error('Failed to load sales trends & forecasting:', error);
      toast.error(error.response?.data?.message || 'Failed to load sales trends & forecasting');
    } finally {
      setLoading(false);
    }
  };

  const loadOperationalMetrics = async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const ordersParams: any = {
        status: 'completed',
        location_id: user?.locationId,
      };
      
      if (period === 'custom') {
        ordersParams.from = customDateFrom;
        ordersParams.to = customDateTo;
      } else {
        const now = new Date();
        let fromDate: Date;
        if (period === 'daily') {
          fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        } else if (period === 'weekly') {
          fromDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
        } else {
          fromDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        }
        ordersParams.from = format(fromDate, 'yyyy-MM-dd');
        ordersParams.to = format(now, 'yyyy-MM-dd');
      }

      const ordersResponse = await axios.get(`${API_URL}/api/v1/orders`, {
        headers,
        params: ordersParams,
      });

      const orders = ordersResponse.data || [];

      // Calculate average transaction time (time between order creation and completion)
      let totalTransactionTime = 0;
      let validTransactions = 0;
      const userOrderCount: Record<string, number> = {};
      const hourOrderCount: Record<number, number> = {};
      let totalItems = 0;

      orders.forEach((order: any) => {
        // Transaction time
        if (order.createdAt && order.completedAt) {
          try {
            const created = new Date(order.createdAt);
            const completed = new Date(order.completedAt);
            const diffMinutes = (completed.getTime() - created.getTime()) / (1000 * 60);
            if (diffMinutes > 0 && diffMinutes < 1440) { // Valid time (less than 24 hours)
              totalTransactionTime += diffMinutes;
              validTransactions++;
            }
          } catch (e) {
            // Skip invalid dates
          }
        }

        // Orders per staff
        if (order.createdBy) {
          userOrderCount[order.createdBy] = (userOrderCount[order.createdBy] || 0) + 1;
        }

        // Peak hours
        try {
          const orderDate = new Date(order.completedAt || order.createdAt);
          const hour = orderDate.getHours();
          hourOrderCount[hour] = (hourOrderCount[hour] || 0) + 1;
        } catch (e) {
          // Skip invalid dates
        }

        // Items per order
        if (order.items && Array.isArray(order.items)) {
          totalItems += order.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
        }
      });

      const averageTransactionTime = validTransactions > 0 ? totalTransactionTime / validTransactions : 0;
      const averageItemsPerOrder = orders.length > 0 ? totalItems / orders.length : 0;

      // Get user names
      const usersResponse = await axios.get(`${API_URL}/api/v1/users`, { headers });
      const users = usersResponse.data || [];
      const usersMap = new Map(users.map((u: any) => [u.id, u]));

      const ordersPerStaff = Object.entries(userOrderCount)
        .map(([userId, orderCount]) => ({
          userId,
          userName: (usersMap.get(userId) as any)?.name || `User ${userId.substring(0, 8)}`,
          orderCount,
          avgTransactionTime: averageTransactionTime, // Same for all for now
        }))
        .sort((a, b) => b.orderCount - a.orderCount);

      const peakHours = Object.entries(hourOrderCount)
        .map(([hour, orderCount]) => ({
          hour: parseInt(hour),
          orderCount,
        }))
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 5);

      setOperationalMetrics({
        averageTransactionTime,
        ordersPerStaff,
        peakHours,
        averageItemsPerOrder,
        averageWaitTime: averageTransactionTime, // Simplified - same as transaction time
      });
    } catch (error: any) {
      console.error('Failed to load operational metrics:', error);
      toast.error(error.response?.data?.message || 'Failed to load operational metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🚀 [REPORTS] useEffect triggered', { activeTab, hasToken: !!accessToken });
    if (!accessToken) {
      console.warn('⚠️ [REPORTS] No access token, returning');
      return;
    }

    if (activeTab === 'general') {
      console.log('📊 [REPORTS] Loading general analytics...');
      loadGeneralAnalytics();
      // ALWAYS load product analytics independently - this fetches cost from inventory
      console.log('🛒 [REPORTS] Calling loadProductAnalytics...');
      const headers = { Authorization: `Bearer ${accessToken}` };
      loadProductAnalytics(headers, {}).catch(err => {
        console.error('❌ [REPORTS] Product analytics error:', err);
      });
    } else if (activeTab === 'staff') {
      loadStaffPerformance();
    } else if (activeTab === 'credit') {
      loadCreditReport();
    } else if (activeTab === 'profit') {
      loadProfitLossAnalytics();
    } else if (activeTab === 'category') {
      loadCategoryBrandAnalytics();
      // DISABLED: loadSupplierAnalytics(); // Expensive analytics - disabled to reduce costs
    } else if (activeTab === 'time') {
      loadTimeBasedInsights();
    } else if (activeTab === 'inventory') {
      loadInventoryHealth();
    } else if (activeTab === 'discount') {
      loadDiscountAnalytics();
    } else if (activeTab === 'payment') {
      loadPaymentMethodInsights();
    } else if (activeTab === 'returns') {
      loadReturnRefundAnalytics();
    } else if (activeTab === 'basket') {
      loadBasketAnalysis();
    } else if (activeTab === 'trends') {
      // DISABLED: loadSalesTrendsForecasting(); // Expensive forecasting - disabled to reduce costs
      // DISABLED: loadPriceSensitivity(); // Expensive analytics - disabled to reduce costs
    } else if (activeTab === 'operations') {
      loadOperationalMetrics();
    } else if (activeTab === 'alerts') {
      loadAlertsAndRisk();
    } else if (activeTab === 'customers') {
      loadCustomerSegmentation();
    }
  }, [activeTab, period, accessToken, user?.locationId, customDateFrom, customDateTo]);

  const formatCurrency = (amount: number) => {
    // Amount is already in currency units (naira), not cents
    // All analytics values are already converted from cents to naira before reaching here
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPeriod = (periodStr: string) => {
    if (period === 'daily') {
      try {
        return format(parseISO(periodStr), 'MMM dd');
      } catch {
        return periodStr;
      }
    } else if (period === 'weekly') {
      return periodStr;
    } else {
      try {
        const [year, month] = periodStr.split('-');
        return format(new Date(parseInt(year), parseInt(month) - 1, 1), 'MMM yyyy');
      } catch {
        return periodStr;
      }
    }
  };

const SimpleLineChart = ({
  data,
  metric,
  color,
  labelFormatter,
}: {
  data: SalesAnalytics['data'];
  metric: 'sales' | 'orders';
  color: string;
  labelFormatter: (period: string) => string;
}) => {
  if (!data || data.length === 0) {
    return <p className="text-sm theme-text-secondary">No data available</p>;
  }

  const maxValue = Math.max(...data.map((item) => item[metric]), 1);
  const step = data.length > 1 ? 100 / (data.length - 1) : 100;

  const points = data
    .map((item, idx) => {
      const x = step * idx;
      const value = item[metric];
      const y = 100 - (value / maxValue) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="relative h-48">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        {[20, 40, 60, 80].map((y) => (
          <line
            key={`grid-${y}`}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="0.5"
          />
        ))}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {data.map((item, idx) => {
          const x = step * idx;
          const y = 100 - (item[metric] / maxValue) * 100;
          return <circle key={idx} cx={x} cy={y} r="1.8" fill={color} />;
        })}
      </svg>
      <div className="absolute inset-x-0 bottom-0 mt-1 flex justify-between text-[10px] text-white/70">
        {data.map((item, idx) => (
          <span key={idx} className="whitespace-nowrap" style={{ width: `${100 / data.length}%`, textAlign: 'center' }}>
            {labelFormatter(item.period)}
          </span>
        ))}
      </div>
    </div>
  );
};

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported successfully');
  };

  const handleExportGeneral = () => {
    if (!salesAnalytics) return;
    exportToCSV(salesAnalytics.data, 'general_sales_report');
  };

  const handleExportStaff = () => {
    if (!staffPerformance) return;
    exportToCSV(staffPerformance.staffPerformance, 'staff_performance_report');
  };

  const handleExportCredit = () => {
    if (!creditReport) return;
    exportToCSV(creditReport.orders, 'credit_report');
  };

  return (
    <div className="theme-background min-h-screen w-full overflow-x-hidden page-with-nav">
      <div className="relative mx-auto w-full max-w-7xl space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-10">
        {/* Header */}
        <div className="theme-card flex flex-col gap-3 sm:gap-4 rounded-xl sm:rounded-2xl lg:rounded-3xl border p-4 sm:p-5 lg:p-6 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <BrandMark
              size={40}
              backgroundClassName="bg-white/90 dark:bg-white/10"
              className="ring-1 ring-slate-200/40 dark:ring-white/10 flex-shrink-0 sm:w-[52px] sm:h-[52px]"
            />
            <div className="min-w-0">
              <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-[0.35em]">Insights</p>
              <h1 className="theme-text-primary text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight truncate">Business Reports</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              to="/checkout"
              className="theme-chip group inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium transition"
            >
              <span className="text-base">←</span>
              Back to Checkout
            </Link>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-400 via-pink-500 to-rose-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_20px_45px_-25px_rgba(244,114,182,0.7)] transition hover:shadow-[0_26px_55px_-20px_rgba(244,114,182,0.85)]"
            >
              Logout
            </button>
            <ThemeToggle />
          </div>
        </div>

        {/* Tabs */}
        <div className="theme-card rounded-xl sm:rounded-2xl lg:rounded-3xl border p-3 sm:p-4 lg:p-6 backdrop-blur-xl">
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {([
              'general', 
              'alerts',
              'customers',
              'staff', 
              'credit', 
              'profit',
              'category',
              'time',
              'inventory',
              'discount',
              'payment',
              'returns',
              'basket',
              'trends',
              'operations'
            ] as ReportTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full border px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 text-xs sm:text-sm font-semibold transition touch-manipulation ${
                  activeTab === tab
                    ? 'border-sky-400/70 bg-sky-500/20 text-sky-50'
                    : 'border-white/15 bg-white/5 text-white/70 hover:border-sky-300/50 hover:text-white'
                }`}
              >
                {tab === 'general' && '📊 General'}
                {tab === 'alerts' && (
                  <span className="inline-flex items-center gap-1">
                    <span>🚨 Alerts &amp; Risk</span>
                    {(smartAlerts?.totalAlerts ?? 0) > 0 && (
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${
                          (smartAlerts?.criticalCount ?? 0) > 0
                            ? 'bg-rose-500 text-white'
                            : 'bg-amber-400 text-slate-900'
                        }`}
                      >
                        {smartAlerts?.criticalCount && smartAlerts.criticalCount > 0
                          ? smartAlerts.criticalCount
                          : smartAlerts?.totalAlerts}
                      </span>
                    )}
                  </span>
                )}
                {tab === 'customers' && '👤 Customers'}
                {tab === 'staff' && '👥 Staff'}
                {tab === 'credit' && '💳 Credit'}
                {tab === 'profit' && '💰 Profit/Loss'}
                {tab === 'category' && '🏷️ Category/Brand'}
                {tab === 'time' && '⏰ Time Insights'}
                {tab === 'inventory' && '📦 Inventory'}
                {tab === 'discount' && '🎫 Discounts'}
                {tab === 'payment' && '💳 Payments'}
                {tab === 'returns' && '↩️ Returns'}
                {tab === 'basket' && '🛒 Basket'}
                {tab === 'trends' && '📈 Trends'}
                {tab === 'operations' && '⚙️ Operations'}
              </button>
            ))}
          </div>
        </div>

        {/* Period Selector */}
        <div className="theme-card rounded-xl sm:rounded-2xl lg:rounded-3xl border p-3 sm:p-4 lg:p-6 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h2 className="theme-text-primary text-base sm:text-lg font-semibold">Time Period</h2>
              <p className="theme-text-secondary text-xs sm:text-sm">Select the time period for analytics</p>
            </div>
            <div className="flex flex-col gap-2 sm:gap-3">
              <div className="flex flex-wrap gap-2">
                {(['daily', 'weekly', 'monthly', 'custom'] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`rounded-full border px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition touch-manipulation ${
                      period === p
                        ? 'border-sky-400/70 bg-sky-500/20 text-sky-50'
                        : 'border-white/15 bg-white/5 text-white/70 hover:border-sky-300/50 hover:text-white'
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
              {period === 'custom' && (
                <div className="flex gap-3 items-center">
                  <div>
                    <label className="block text-xs theme-text-secondary mb-1">From</label>
                    <input
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      max={customDateTo}
                      className="theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs theme-text-secondary mb-1">To</label>
                    <input
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      min={customDateFrom}
                      max={format(new Date(), 'yyyy-MM-dd')}
                      className="theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="theme-card rounded-3xl border p-12 backdrop-blur-xl text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="theme-text-secondary">Loading reports...</p>
          </div>
        ) : (
          <>
            {/* General Business Analytics Tab */}
            {activeTab === 'general' && salesAnalytics && (
              <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="theme-text-primary text-xl font-semibold">General Business Analytics</h2>
                  <button
                    onClick={handleExportGeneral}
                    disabled={!salesAnalytics || salesAnalytics.data.length === 0}
                    className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📥 Export CSV
                  </button>
                </div>
                
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6">
                  <div className="theme-surface rounded-xl sm:rounded-2xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Total Sales</p>
                    <p className="theme-text-primary text-lg sm:text-xl lg:text-2xl font-bold text-emerald-400 truncate">
                      {formatCurrency(salesAnalytics.totalSales)}
                    </p>
                  </div>
                  <div className="theme-surface rounded-xl sm:rounded-2xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Total Orders</p>
                    <p className="theme-text-primary text-lg sm:text-xl lg:text-2xl font-bold text-sky-400">
                      {salesAnalytics.totalOrders.toLocaleString()}
                    </p>
                  </div>
                  <div className="theme-surface rounded-xl sm:rounded-2xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Avg Order Value</p>
                    <p className="theme-text-primary text-lg sm:text-xl lg:text-2xl font-bold text-purple-400 truncate">
                      {formatCurrency(salesAnalytics.averageOrderValue)}
                    </p>
                  </div>
                  <div className="theme-surface rounded-xl sm:rounded-2xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Total Items</p>
                    <p className="theme-text-primary text-lg sm:text-xl lg:text-2xl font-bold text-amber-400">
                      {salesAnalytics.data.reduce((sum, d) => sum + d.items, 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Product Sales Analytics Table */}
                <div className="mb-6 sm:mb-8">
                  <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-3 sm:mb-4">Product Sales Performance</h3>
                  <div className="mb-3 p-2 bg-amber-500/20 border border-amber-500/50 rounded text-xs text-amber-300 font-mono">
                    <strong>DEBUG:</strong> {inventoryDebugInfo}
                  </div>
                  {loadingProducts ? (
                    <div className="theme-surface rounded-xl border p-6 sm:p-8 text-center">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent mb-2" />
                      <p className="theme-text-secondary text-xs sm:text-sm">Loading product analytics...</p>
                    </div>
                  ) : productAnalytics.length === 0 ? (
                    <div className="theme-surface rounded-xl border p-6 sm:p-8 text-center">
                      <p className="theme-text-secondary text-xs sm:text-sm">No product sales data available for the selected period.</p>
                    </div>
                  ) : (
                    <>
                      {/* Mobile Card View */}
                      <div className="block sm:hidden space-y-3">
                        {productAnalytics.map((product, index) => (
                          <div key={product.productId} className="theme-surface rounded-xl border p-3 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="theme-text-primary font-semibold text-sm">
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                  </span>
                                  <span className="theme-text-primary font-medium text-sm truncate">{product.productName}</span>
                                </div>
                                <p className="theme-text-secondary text-xs">SKU: {product.sku}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10">
                              <div>
                                <p className="theme-text-secondary text-[10px] uppercase mb-0.5">Qty</p>
                                <p className="theme-text-primary font-semibold text-sm text-sky-400">
                                  {product.quantitySold.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="theme-text-secondary text-[10px] uppercase mb-0.5">Revenue</p>
                                <p className="theme-text-primary font-semibold text-sm text-emerald-400 truncate">
                                  {formatCurrency(product.revenue)}
                                </p>
                              </div>
                              <div>
                                <p className="theme-text-secondary text-[10px] uppercase mb-0.5">Cost</p>
                                <p className="theme-text-primary font-semibold text-sm text-rose-400 truncate">
                                  {product.cost === 0 ? 'NO COST DATA' : formatCurrency(product.cost)}
                                </p>
                              </div>
                              <div>
                                <p className="theme-text-secondary text-[10px] uppercase mb-0.5">Profit</p>
                                <p className={`theme-text-primary font-semibold text-sm truncate ${
                                  product.profit >= 0 ? 'text-sky-400' : 'text-amber-400'
                                }`}>
                                  {formatCurrency(product.profit)}
                                </p>
                              </div>
                            </div>
                            <div className="pt-2 border-t border-white/10">
                              <p className="theme-text-secondary text-[10px] uppercase mb-0.5">Profit Margin</p>
                              <p className={`theme-text-primary font-semibold text-sm ${
                                product.profitMargin >= 0 ? 'text-purple-400' : 'text-amber-400'
                              }`}>
                                {product.profitMargin.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Desktop Table View */}
                      <div className="hidden sm:block theme-surface rounded-xl border overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-white/5">
                              <tr>
                                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                  Rank
                                </th>
                                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                  Product Name
                                </th>
                                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                  SKU
                                </th>
                                <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                  Quantity Sold
                                </th>
                                <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                  Revenue
                                </th>
                                <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                  Cost
                                </th>
                                <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                  Profit/Loss
                                </th>
                                <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                  Profit %
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                              {productAnalytics.map((product, index) => (
                                <tr key={product.productId} className="hover:bg-white/5 transition">
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                    <span className="theme-text-primary font-semibold">
                                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                    </span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                    <span className="theme-text-primary font-medium">{product.productName}</span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                    <span className="theme-text-secondary text-sm">{product.sku}</span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className="theme-text-primary font-semibold text-sky-400">
                                      {product.quantitySold.toLocaleString()}
                                    </span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className="theme-text-primary font-semibold text-emerald-400">
                                      {formatCurrency(product.revenue)}
                                    </span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className="theme-text-primary font-semibold text-rose-400">
                                      {product.cost === 0 ? 'NO COST DATA' : formatCurrency(product.cost)}
                                    </span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className={`theme-text-primary font-semibold ${
                                      product.profit >= 0 ? 'text-sky-400' : 'text-amber-400'
                                    }`}>
                                      {formatCurrency(product.profit)}
                                    </span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className={`theme-text-primary font-semibold ${
                                      product.profitMargin >= 0 ? 'text-purple-400' : 'text-amber-400'
                                    }`}>
                                      {product.profitMargin.toFixed(1)}%
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Sales chart */}
                <div className="mb-8 space-y-4">
                  <div>
                    <h3 className="theme-text-primary text-sm font-semibold mb-3">Sales Over Time</h3>
                    <div className="theme-surface rounded-xl border p-4 bg-white/5">
                      <SimpleLineChart
                        data={salesAnalytics.data}
                        metric="sales"
                        color="#10b981"
                        labelFormatter={(period) => formatPeriod(period)}
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="theme-text-primary text-sm font-semibold mb-3">Orders Over Time</h3>
                    <div className="theme-surface rounded-xl border p-4 bg-white/5">
                      <SimpleLineChart
                        data={salesAnalytics.data}
                        metric="orders"
                        color="#3b82f6"
                        labelFormatter={(period) => formatPeriod(period)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Alerts & Risk Center Tab */}
            {activeTab === 'alerts' && (
              <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="theme-text-primary text-xl font-semibold">Alerts & Risk Center</h2>
                </div>

                {smartAlerts && smartAlerts.criticalCount > 0 && (
                  <div className="mb-4 rounded-xl border border-rose-400/60 bg-rose-500/10 px-4 py-3">
                    <p className="theme-text-primary text-sm font-semibold text-rose-200">
                      {smartAlerts.criticalCount} critical alert
                      {smartAlerts.criticalCount === 1 ? '' : 's'} need your attention.
                    </p>
                    <p className="theme-text-secondary text-xs mt-1">
                      Check stock-out risks, major shrinkage, and high-risk staff or customer activity.
                    </p>
                  </div>
                )}

                {!smartAlerts && !fraudDetection && !shrinkageDetection ? (
                  <div className="theme-surface rounded-xl border p-6 text-center">
                    <p className="theme-text-secondary text-sm">
                      No alerts available yet for the selected period.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                      <div className="theme-surface rounded-xl border p-3 sm:p-4">
                        <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">
                          Smart Alerts
                        </p>
                        <p className="theme-text-primary text-lg sm:text-xl font-bold text-amber-400">
                          {smartAlerts?.totalAlerts ?? 0}
                        </p>
                        <p className="theme-text-secondary text-xs">
                          {smartAlerts?.criticalCount ?? 0} critical • {smartAlerts?.warningCount ?? 0} warnings
                        </p>
                      </div>
                      <div className="theme-surface rounded-xl border p-3 sm:p-4">
                        <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">
                          Fraud Alerts
                        </p>
                        <p className="theme-text-primary text-lg sm:text-xl font-bold text-rose-400">
                          {fraudDetection?.totalAlerts ?? 0}
                        </p>
                        <p className="theme-text-secondary text-xs">
                          {fraudDetection?.criticalCount ?? 0} critical • {fraudDetection?.warningCount ?? 0} warnings
                        </p>
                      </div>
                      <div className="theme-surface rounded-xl border p-3 sm:p-4">
                        <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">
                          Shrinkage Issues
                        </p>
                        <p className="theme-text-primary text-lg sm:text-xl font-bold text-purple-400">
                          {shrinkageDetection?.totalDiscrepancies ?? 0}
                        </p>
                        <p className="theme-text-secondary text-xs">
                          {shrinkageDetection?.criticalCount ?? 0} critical
                        </p>
                      </div>
                    </div>

                    {/* Smart Alerts List */}
                    <div className="mb-6">
                      <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-3">
                        Smart Alerts
                      </h3>
                      {smartAlerts && smartAlerts.alerts.length > 0 ? (
                        <div className="space-y-3">
                          {smartAlerts.alerts.slice(0, 20).map((alert, index) => (
                            <div
                              key={index}
                              className={`theme-surface rounded-xl border p-3 sm:p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 ${
                                alert.severity === 'critical'
                                  ? 'border-rose-400/60 bg-rose-500/10'
                                  : alert.severity === 'warning'
                                  ? 'border-amber-400/60 bg-amber-500/10'
                                  : 'border-sky-400/40 bg-sky-500/10'
                              }`}
                            >
                              <div>
                                <p className="theme-text-primary font-semibold text-sm sm:text-base">
                                  {alert.title}
                                </p>
                                <p className="theme-text-secondary text-xs sm:text-sm mt-1">{alert.message}</p>
                              </div>
                              <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-center">
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                                    alert.severity === 'critical'
                                      ? 'bg-rose-500/20 text-rose-200 border border-rose-400/60'
                                      : alert.severity === 'warning'
                                      ? 'bg-amber-500/20 text-amber-200 border border-amber-400/60'
                                      : 'bg-sky-500/20 text-sky-200 border border-sky-400/60'
                                  }`}
                                >
                                  {alert.severity}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="theme-surface rounded-xl border p-4 text-center">
                          <p className="theme-text-secondary text-sm">No smart alerts for this period.</p>
                        </div>
                      )}
                    </div>

                    {/* Fraud Alerts List */}
                    <div className="mb-6">
                      <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-3">
                        Fraud & Abuse Signals
                      </h3>
                      {fraudDetection && fraudDetection.fraudAlerts.length > 0 ? (
                        <div className="space-y-3">
                          {fraudDetection.fraudAlerts.slice(0, 20).map((alert, index) => (
                            <div
                              key={index}
                              className={`theme-surface rounded-xl border p-3 sm:p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 ${
                                alert.severity === 'critical'
                                  ? 'border-rose-400/60 bg-rose-500/10'
                                  : alert.severity === 'warning'
                                  ? 'border-amber-400/60 bg-amber-500/10'
                                  : 'border-purple-400/60 bg-purple-500/10'
                              }`}
                            >
                              <div>
                                <p className="theme-text-primary font-semibold text-sm sm:text-base">
                                  {alert.title}
                                </p>
                                <p className="theme-text-secondary text-xs sm:text-sm mt-1">
                                  {alert.description}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-center">
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                                    alert.severity === 'critical'
                                      ? 'bg-rose-500/20 text-rose-200 border border-rose-400/60'
                                      : alert.severity === 'warning'
                                      ? 'bg-amber-500/20 text-amber-200 border border-amber-400/60'
                                      : 'bg-purple-500/20 text-purple-200 border border-purple-400/60'
                                  }`}
                                >
                                  {alert.severity}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="theme-surface rounded-xl border p-4 text-center">
                          <p className="theme-text-secondary text-sm">No fraud signals detected for this period.</p>
                        </div>
                      )}
                    </div>

                    {/* Shrinkage Alerts */}
                    <div>
                      <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-3">
                        Inventory Shrinkage
                      </h3>
                      {shrinkageDetection && shrinkageDetection.shrinkageAlerts.length > 0 ? (
                        <div className="theme-surface rounded-xl border overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-white/5">
                                <tr>
                                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                    Product
                                  </th>
                                  <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                    Actual
                                  </th>
                                  <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                    Theoretical
                                  </th>
                                  <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                    Difference
                                  </th>
                                  <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                    Severity
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/10">
                                {shrinkageDetection.shrinkageAlerts.slice(0, 50).map((item, index) => (
                                  <tr key={index} className="hover:bg-white/5 transition">
                                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                      <span className="theme-text-primary font-medium">
                                        {item.productName || item.productId}
                                      </span>
                                    </td>
                                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                      <span className="theme-text-primary font-semibold text-sky-400">
                                        {item.actualStock}
                                      </span>
                                    </td>
                                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                      <span className="theme-text-secondary">{item.theoreticalStock}</span>
                                    </td>
                                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                      <span
                                        className={`theme-text-primary font-semibold ${
                                          item.discrepancy < 0 ? 'text-rose-400' : 'text-emerald-400'
                                        }`}
                                      >
                                        {item.discrepancy} ({item.discrepancyPercent.toFixed(1)}%)
                                      </span>
                                    </td>
                                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                      <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                                          item.severity === 'critical'
                                            ? 'bg-rose-500/20 text-rose-200 border border-rose-400/60'
                                            : 'bg-amber-500/20 text-amber-200 border border-amber-400/60'
                                        }`}
                                      >
                                        {item.severity}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="theme-surface rounded-xl border p-4 text-center">
                          <p className="theme-text-secondary text-sm">
                            {shrinkageDetection?.message || 'No significant inventory discrepancies detected.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Customers Analytics Tab */}
            {activeTab === 'customers' && (
              <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="theme-text-primary text-xl font-semibold">Customer Analytics (RFM &amp; CLV)</h2>
                </div>

                {!customerSegments || customerSegments.segments.length === 0 ? (
                  <div className="theme-surface rounded-xl border p-6 text-center">
                    <p className="theme-text-secondary text-sm">
                      No customer analytics data available for the selected period.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                      <div className="theme-surface rounded-xl border p-3 sm:p-4">
                        <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">
                          Total Customers
                        </p>
                        <p className="theme-text-primary text-lg sm:text-xl font-bold text-sky-400">
                          {customerSegments.totalCustomers.toLocaleString()}
                        </p>
                      </div>
                      <div className="theme-surface rounded-xl border p-3 sm:p-4">
                        <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">
                          Champions
                        </p>
                        <p className="theme-text-primary text-lg sm:text-xl font-bold text-emerald-400">
                          {customerSegments.segments.filter((s) => s.segment === 'CHAMPION').length}
                        </p>
                      </div>
                      <div className="theme-surface rounded-xl border p-3 sm:p-4">
                        <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">
                          At Risk / Lost
                        </p>
                        <p className="theme-text-primary text-lg sm:text-xl font-bold text-amber-400">
                          {
                            customerSegments.segments.filter(
                              (s) => s.segment === 'AT_RISK' || s.segment === 'LOST',
                            ).length
                          }
                        </p>
                      </div>
                      <div className="theme-surface rounded-xl border p-3 sm:p-4">
                        <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">
                          Avg CLV
                        </p>
                        <p className="theme-text-primary text-lg sm:text-xl font-bold text-purple-400">
                          {formatCurrency(
                            customerSegments.segments.reduce((sum, s) => sum + s.clv, 0) /
                              Math.max(1, customerSegments.segments.length),
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Customers Table */}
                    <div className="theme-surface rounded-xl border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                Customer
                              </th>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                Segment
                              </th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                Recency (days)
                              </th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                Frequency
                              </th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                Monetary
                              </th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                RFM
                              </th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                CLV (est.)
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {customerSegments.segments
                              .slice()
                              .sort((a, b) => b.clv - a.clv)
                              .map((c) => (
                                <tr key={c.customerId} className="hover:bg-white/5 transition">
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                    <span className="theme-text-primary font-medium">{c.name}</span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                                        c.segment === 'CHAMPION'
                                          ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/60'
                                          : c.segment === 'AT_RISK' || c.segment === 'LOST'
                                          ? 'bg-amber-500/20 text-amber-200 border border-amber-400/60'
                                          : 'bg-sky-500/20 text-sky-200 border border-sky-400/60'
                                      }`}
                                    >
                                      {c.segment.replace('_', ' ')}
                                    </span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className="theme-text-secondary">{c.recencyDays}</span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className="theme-text-primary font-semibold text-sky-400">
                                      {c.frequency}
                                    </span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className="theme-text-primary font-semibold text-emerald-400">
                                      {formatCurrency(c.monetary)}
                                    </span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className="theme-text-secondary font-mono text-xs">{c.rfmScore}</span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className="theme-text-primary font-semibold text-purple-400">
                                      {formatCurrency(c.clv)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Staff Performance Tab */}
            {activeTab === 'staff' && staffPerformance && (
              <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="theme-text-primary text-xl font-semibold">Staff Performance Reports</h2>
                  <button
                    onClick={handleExportStaff}
                    disabled={!staffPerformance || staffPerformance.staffPerformance.length === 0}
                    className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📥 Export CSV
                  </button>
                </div>
                
                {staffPerformance.staffPerformance.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="theme-text-secondary">No staff performance data available for the selected period.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {staffPerformance.staffPerformance.map((staff) => (
                      <div key={staff.userId} className="theme-surface rounded-xl border p-4">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="theme-text-primary text-lg font-semibold">{staff.userName}</h3>
                            <p className="theme-text-secondary text-sm">Staff ID: {staff.userId.substring(0, 8)}...</p>
                          </div>
                          <div className="text-right">
                            <p className="theme-text-secondary text-xs uppercase tracking-wide mb-1">Total Sales</p>
                            <p className="theme-text-primary text-xl font-bold text-emerald-400">
                              {formatCurrency(staff.sales.totalSales)}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="theme-text-secondary text-xs uppercase tracking-wide mb-1">Orders</p>
                            <p className="theme-text-primary text-lg font-semibold">{staff.sales.orderCount}</p>
                          </div>
                          <div>
                            <p className="theme-text-secondary text-xs uppercase tracking-wide mb-1">Items Sold</p>
                            <p className="theme-text-primary text-lg font-semibold">{staff.sales.itemCount}</p>
                          </div>
                          <div>
                            <p className="theme-text-secondary text-xs uppercase tracking-wide mb-1">Avg Order</p>
                            <p className="theme-text-primary text-lg font-semibold">
                              {formatCurrency(staff.sales.averageOrderValue)}
                            </p>
                          </div>
                          <div>
                            <p className="theme-text-secondary text-xs uppercase tracking-wide mb-1">Inv Transactions</p>
                            <p className="theme-text-primary text-lg font-semibold">{staff.inventory.transactions}</p>
                          </div>
                        </div>

                        {staff.inventory.transactions > 0 && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <p className="theme-text-secondary text-xs uppercase tracking-wide mb-2">Inventory Activity</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="theme-text-secondary">Received: </span>
                                <span className="theme-text-primary font-semibold text-emerald-400">
                                  {staff.inventory.itemsReceived}
                                </span>
                              </div>
                              <div>
                                <span className="theme-text-secondary">Sold: </span>
                                <span className="theme-text-primary font-semibold text-rose-400">
                                  {staff.inventory.itemsSold}
                                </span>
                              </div>
                              <div>
                                <span className="theme-text-secondary">Returned: </span>
                                <span className="theme-text-primary font-semibold text-amber-400">
                                  {staff.inventory.itemsReturned}
                                </span>
                              </div>
                              <div>
                                <span className="theme-text-secondary">Adjusted: </span>
                                <span className="theme-text-primary font-semibold">
                                  {staff.inventory.itemsAdjusted}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Profit/Loss Analytics Tab */}
            {activeTab === 'profit' && profitLossAnalytics && (
              <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="theme-text-primary text-xl font-semibold">Profit & Loss Analytics</h2>
                  <button
                    onClick={() => {
                      if (!profitLossAnalytics) return;
                      const exportData = profitLossAnalytics.byProduct.map(p => ({
                        Product: p.productName,
                        SKU: p.sku,
                        'Quantity Sold': p.quantitySold,
                        Revenue: p.revenue,
                        Cost: p.cost,
                        Profit: p.profit,
                        'Profit Margin %': p.profitMargin.toFixed(2),
                      }));
                      exportToCSV(exportData, 'profit_loss_report');
                    }}
                    disabled={!profitLossAnalytics || profitLossAnalytics.byProduct.length === 0}
                    className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📥 Export CSV
                  </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 mb-6">
                  <div className="theme-surface rounded-xl sm:rounded-2xl border p-3 sm:p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-400/30">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Total Revenue</p>
                    <p className="theme-text-primary text-lg sm:text-xl lg:text-2xl font-bold text-emerald-400 truncate">
                      {formatCurrency(profitLossAnalytics.totalRevenue)}
                    </p>
                  </div>
                  <div className="theme-surface rounded-xl sm:rounded-2xl border p-3 sm:p-4 bg-gradient-to-br from-rose-500/10 to-rose-600/5 border-rose-400/30">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Total Cost</p>
                    <p className="theme-text-primary text-lg sm:text-xl lg:text-2xl font-bold text-rose-400 truncate">
                      {formatCurrency(profitLossAnalytics.totalCost)}
                    </p>
                  </div>
                  <div className={`theme-surface rounded-xl sm:rounded-2xl border p-3 sm:p-4 bg-gradient-to-br ${
                    profitLossAnalytics.totalProfit >= 0 
                      ? 'from-sky-500/10 to-sky-600/5 border-sky-400/30' 
                      : 'from-amber-500/10 to-amber-600/5 border-amber-400/30'
                  }`}>
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Net Profit/Loss</p>
                    <p className={`theme-text-primary text-lg sm:text-xl lg:text-2xl font-bold truncate ${
                      profitLossAnalytics.totalProfit >= 0 ? 'text-sky-400' : 'text-amber-400'
                    }`}>
                      {formatCurrency(profitLossAnalytics.totalProfit)}
                    </p>
                  </div>
                  <div className="theme-surface rounded-xl sm:rounded-2xl border p-3 sm:p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-400/30">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Profit Margin</p>
                    <p className={`theme-text-primary text-lg sm:text-xl lg:text-2xl font-bold truncate ${
                      profitLossAnalytics.profitMargin >= 0 ? 'text-purple-400' : 'text-amber-400'
                    }`}>
                      {profitLossAnalytics.profitMargin.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                  <div className="theme-surface rounded-xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Items Sold</p>
                    <p className="theme-text-primary text-lg sm:text-xl font-bold text-sky-400">
                      {profitLossAnalytics.totalItemsSold.toLocaleString()}
                    </p>
                  </div>
                  <div className="theme-surface rounded-xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Avg Profit/Item</p>
                    <p className={`theme-text-primary text-lg sm:text-xl font-bold ${
                      profitLossAnalytics.averageProfitPerItem >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {formatCurrency(profitLossAnalytics.averageProfitPerItem)}
                    </p>
                  </div>
                  <div className="theme-surface rounded-xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">ROI</p>
                    <p className={`theme-text-primary text-lg sm:text-xl font-bold ${
                      profitLossAnalytics.profitPercentage >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {profitLossAnalytics.profitPercentage.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Profit/Loss Over Time Chart */}
                {profitLossAnalytics.byPeriod.length > 0 && (
                  <div className="mb-6">
                    <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-3 sm:mb-4">Profit/Loss Over Time</h3>
                    <div className="theme-surface rounded-xl border p-4 bg-white/5">
                      <SimpleLineChart
                        data={profitLossAnalytics.byPeriod.map(p => ({
                          period: p.period,
                          sales: p.profit,
                          orders: 0,
                          items: 0,
                          averageOrderValue: 0,
                        }))}
                        metric="sales"
                        color={profitLossAnalytics.totalProfit >= 0 ? "#10b981" : "#f59e0b"}
                        labelFormatter={(period) => formatPeriod(period)}
                      />
                    </div>
                  </div>
                )}

                {/* Product Profit Breakdown */}
                <div className="mb-6">
                  <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-3 sm:mb-4">Product Profit Breakdown</h3>
                  {profitLossAnalytics.byProduct.length === 0 ? (
                    <div className="theme-surface rounded-xl border p-6 sm:p-8 text-center">
                      <p className="theme-text-secondary text-xs sm:text-sm">No profit/loss data available. Ensure products have cost information.</p>
                    </div>
                  ) : (
                    <>
                      {/* Mobile Card View */}
                      <div className="block sm:hidden space-y-3">
                        {profitLossAnalytics.byProduct.slice(0, 10).map((product, index) => (
                          <div key={product.productId} className="theme-surface rounded-xl border p-3 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="theme-text-primary font-semibold text-sm">
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                  </span>
                                  <span className="theme-text-primary font-medium text-sm truncate">{product.productName}</span>
                                </div>
                                <p className="theme-text-secondary text-xs">SKU: {product.sku}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                              <div>
                                <p className="theme-text-secondary text-[10px] uppercase mb-0.5">Revenue</p>
                                <p className="theme-text-primary font-semibold text-sm text-emerald-400 truncate">
                                  {formatCurrency(product.revenue)}
                                </p>
                              </div>
                              <div>
                                <p className="theme-text-secondary text-[10px] uppercase mb-0.5">Cost</p>
                                <p className="theme-text-primary font-semibold text-sm text-rose-400 truncate">
                                  {product.cost === 0 ? 'NO COST DATA' : formatCurrency(product.cost)}
                                </p>
                              </div>
                              <div>
                                <p className="theme-text-secondary text-[10px] uppercase mb-0.5">Profit</p>
                                <p className={`theme-text-primary font-semibold text-sm truncate ${
                                  product.profit >= 0 ? 'text-sky-400' : 'text-amber-400'
                                }`}>
                                  {formatCurrency(product.profit)}
                                </p>
                              </div>
                              <div>
                                <p className="theme-text-secondary text-[10px] uppercase mb-0.5">Margin</p>
                                <p className={`theme-text-primary font-semibold text-sm truncate ${
                                  product.profitMargin >= 0 ? 'text-purple-400' : 'text-amber-400'
                                }`}>
                                  {product.profitMargin.toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Desktop Table View */}
                      <div className="hidden sm:block theme-surface rounded-xl border overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-white/5">
                              <tr>
                                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                  Rank
                                </th>
                                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                  Product Name
                                </th>
                                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                  SKU
                                </th>
                                <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                  Qty Sold
                                </th>
                                <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                  Revenue
                                </th>
                                <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                  Cost
                                </th>
                                <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                  Profit/Loss
                                </th>
                                <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                  Margin %
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                              {profitLossAnalytics.byProduct.slice(0, 20).map((product, index) => (
                                <tr key={product.productId} className="hover:bg-white/5 transition">
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                    <span className="theme-text-primary font-semibold">
                                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                    </span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                    <span className="theme-text-primary font-medium">{product.productName}</span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                    <span className="theme-text-secondary text-sm">{product.sku}</span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className="theme-text-primary font-semibold text-sky-400">
                                      {product.quantitySold.toLocaleString()}
                                    </span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className="theme-text-primary font-semibold text-emerald-400">
                                      {formatCurrency(product.revenue)}
                                    </span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className="theme-text-primary font-semibold text-rose-400">
                                      {product.cost === 0 ? 'NO COST DATA' : formatCurrency(product.cost)}
                                    </span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className={`theme-text-primary font-semibold ${
                                      product.profit >= 0 ? 'text-sky-400' : 'text-amber-400'
                                    }`}>
                                      {formatCurrency(product.profit)}
                                    </span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className={`theme-text-primary font-semibold ${
                                      product.profitMargin >= 0 ? 'text-purple-400' : 'text-amber-400'
                                    }`}>
                                      {product.profitMargin.toFixed(1)}%
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Category & Brand Analytics Tab */}
            {activeTab === 'category' && categoryBrandAnalytics && (
              <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="theme-text-primary text-xl font-semibold">Category & Brand Performance</h2>
                  <button
                    onClick={() => {
                      if (!categoryBrandAnalytics) return;
                      const exportData = [
                        ...categoryBrandAnalytics.byCategory.map(c => ({
                          Type: 'Category',
                          Name: c.categoryName,
                          Revenue: c.revenue,
                          Cost: c.cost,
                          Profit: c.profit,
                          'Profit Margin %': c.profitMargin.toFixed(2),
                          'Quantity Sold': c.quantitySold,
                          'Order Count': c.orderCount,
                        })),
                        ...categoryBrandAnalytics.byBrand.map(b => ({
                          Type: 'Brand',
                          Name: b.brandName,
                          Revenue: b.revenue,
                          Cost: b.cost,
                          Profit: b.profit,
                          'Profit Margin %': b.profitMargin.toFixed(2),
                          'Quantity Sold': b.quantitySold,
                          'Order Count': b.orderCount,
                        })),
                      ];
                      exportToCSV(exportData, 'category_brand_report');
                    }}
                    disabled={!categoryBrandAnalytics || (categoryBrandAnalytics.byCategory.length === 0 && categoryBrandAnalytics.byBrand.length === 0)}
                    className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📥 Export CSV
                  </button>
                </div>

                {/* Category Performance */}
                <div className="mb-8">
                  <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-4">Category Performance</h3>
                  {categoryBrandAnalytics.byCategory.length === 0 ? (
                    <div className="theme-surface rounded-xl border p-6 text-center">
                      <p className="theme-text-secondary text-sm">No category data available.</p>
                    </div>
                  ) : (
                    <div className="theme-surface rounded-xl border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Category</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Revenue</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Cost</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Profit</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Margin %</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Qty Sold</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {categoryBrandAnalytics.byCategory.map((category, index) => (
                              <tr key={category.categoryId} className="hover:bg-white/5 transition">
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <span className="theme-text-primary font-medium">{category.categoryName}</span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-emerald-400">
                                    {formatCurrency(category.revenue)}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-rose-400">
                                    {formatCurrency(category.cost)}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className={`theme-text-primary font-semibold ${
                                    category.profit >= 0 ? 'text-sky-400' : 'text-amber-400'
                                  }`}>
                                    {formatCurrency(category.profit)}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className={`theme-text-primary font-semibold ${
                                    category.profitMargin >= 0 ? 'text-purple-400' : 'text-amber-400'
                                  }`}>
                                    {category.profitMargin.toFixed(1)}%
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-sky-400">
                                    {category.quantitySold.toLocaleString()}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Brand Performance */}
                <div>
                  <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-4">Brand Performance</h3>
                  {categoryBrandAnalytics.byBrand.length === 0 ? (
                    <div className="theme-surface rounded-xl border p-6 text-center">
                      <p className="theme-text-secondary text-sm">No brand data available.</p>
                    </div>
                  ) : (
                    <div className="theme-surface rounded-xl border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Brand</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Revenue</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Cost</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Profit</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Margin %</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Qty Sold</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {categoryBrandAnalytics.byBrand.map((brand, index) => (
                              <tr key={brand.brandId} className="hover:bg-white/5 transition">
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <span className="theme-text-primary font-medium">{brand.brandName}</span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-emerald-400">
                                    {formatCurrency(brand.revenue)}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-rose-400">
                                    {formatCurrency(brand.cost)}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className={`theme-text-primary font-semibold ${
                                    brand.profit >= 0 ? 'text-sky-400' : 'text-amber-400'
                                  }`}>
                                    {formatCurrency(brand.profit)}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className={`theme-text-primary font-semibold ${
                                    brand.profitMargin >= 0 ? 'text-purple-400' : 'text-amber-400'
                                  }`}>
                                    {brand.profitMargin.toFixed(1)}%
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-sky-400">
                                    {brand.quantitySold.toLocaleString()}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Supplier Analytics */}
                {supplierAnalytics && (
                  <div className="mt-8">
                    <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-4">Supplier Performance</h3>
                    {supplierAnalytics.note && (
                      <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-400/30">
                        <p className="theme-text-secondary text-sm">{supplierAnalytics.note}</p>
                      </div>
                    )}
                    {supplierAnalytics.suppliers.length === 0 ? (
                      <div className="theme-surface rounded-xl border p-6 text-center">
                        <p className="theme-text-secondary text-sm">No supplier data available.</p>
                      </div>
                    ) : (
                      <div className="theme-surface rounded-xl border overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-white/5">
                              <tr>
                                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Supplier</th>
                                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Contact</th>
                                <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Revenue</th>
                                <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Cost</th>
                                <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Profit</th>
                                <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Margin %</th>
                                <th className="px-4 lg:px-6 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                              {supplierAnalytics.suppliers.map((supplier) => (
                                <tr key={supplier.supplierId} className="hover:bg-white/5 transition">
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                    <span className="theme-text-primary font-medium">{supplier.supplierName}</span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                      {supplier.contactName && (
                                        <span className="theme-text-primary text-sm">{supplier.contactName}</span>
                                      )}
                                      {supplier.email && (
                                        <span className="theme-text-secondary text-xs">{supplier.email}</span>
                                      )}
                                      {supplier.phone && (
                                        <span className="theme-text-secondary text-xs">{supplier.phone}</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className="theme-text-primary font-semibold text-emerald-400">
                                      {formatCurrency(supplier.revenue)}
                                    </span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className="theme-text-primary font-semibold text-rose-400">
                                      {formatCurrency(supplier.cost)}
                                    </span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className={`theme-text-primary font-semibold ${
                                      supplier.profit >= 0 ? 'text-sky-400' : 'text-amber-400'
                                    }`}>
                                      {formatCurrency(supplier.profit)}
                                    </span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className={`theme-text-primary font-semibold ${
                                      supplier.profitMargin >= 0 ? 'text-purple-400' : 'text-amber-400'
                                    }`}>
                                      {supplier.profitMargin.toFixed(1)}%
                                    </span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-center">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${
                                      supplier.active ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-500/20 text-slate-300'
                                    }`}>
                                      {supplier.active ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {supplierAnalytics.totalRevenue > 0 && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="theme-surface rounded-xl border p-4">
                          <p className="theme-text-secondary text-xs mb-1">Total Revenue</p>
                          <p className="theme-text-primary text-lg font-semibold text-emerald-400">
                            {formatCurrency(supplierAnalytics.totalRevenue)}
                          </p>
                        </div>
                        <div className="theme-surface rounded-xl border p-4">
                          <p className="theme-text-secondary text-xs mb-1">Total Cost</p>
                          <p className="theme-text-primary text-lg font-semibold text-rose-400">
                            {formatCurrency(supplierAnalytics.totalCost)}
                          </p>
                        </div>
                        <div className="theme-surface rounded-xl border p-4">
                          <p className="theme-text-secondary text-xs mb-1">Total Profit</p>
                          <p className="theme-text-primary text-lg font-semibold text-sky-400">
                            {formatCurrency(supplierAnalytics.totalProfit)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Credit Reports Tab */}
            {activeTab === 'credit' && creditReport && (
              <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="theme-text-primary text-xl font-semibold">Credit Reports</h2>
                  <button
                    onClick={handleExportCredit}
                    disabled={!creditReport || creditReport.orders.length === 0}
                    className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📥 Export CSV
                  </button>
                </div>

                {/* Summary Card */}
                <div className="theme-surface rounded-2xl border p-6 mb-6 bg-gradient-to-r from-amber-500/10 to-rose-500/10 border-amber-400/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="theme-text-secondary text-xs uppercase tracking-wide mb-1">Total Outstanding Credit</p>
                      <p className="theme-text-primary text-3xl font-bold text-amber-400">
                        {formatCurrency(creditReport.totalOutstanding)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="theme-text-secondary text-xs uppercase tracking-wide mb-1">Orders with Credit</p>
                      <p className="theme-text-primary text-2xl font-bold text-rose-400">
                        {creditReport.totalOrders}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Credit Orders Table */}
                {creditReport.orders.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="theme-text-secondary">No outstanding credit for the selected period.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                            Order Number
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                            Customer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                            Created By
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                            Total Amount
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                            Paid
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                            Outstanding
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {creditReport.orders.map((order) => (
                          <tr key={order.orderId} className="hover:bg-white/5 transition">
                            <td className="px-6 py-4 whitespace-nowrap font-medium theme-text-primary">
                              {order.orderNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap theme-text-secondary">
                              {order.customerName || 'Walk-in'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap theme-text-secondary">
                              {order.createdByName || 'Unknown'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right theme-text-primary font-semibold">
                              {formatCurrency(order.totalCents)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right theme-text-secondary">
                              {formatCurrency(order.paidCents)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span className="font-bold text-amber-400">
                                {formatCurrency(order.outstandingCents)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap theme-text-secondary text-sm">
                              {format(new Date(order.createdAt), 'MMM dd, yyyy HH:mm')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Time-Based Insights Tab */}
            {activeTab === 'time' && timeBasedInsights && (
              <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="theme-text-primary text-xl font-semibold">Time-Based Insights</h2>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                  <div className="theme-surface rounded-xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Peak Hour</p>
                    <p className="theme-text-primary text-lg sm:text-xl font-bold text-sky-400">
                      {timeBasedInsights.peakHour.hour}:00
                    </p>
                    <p className="theme-text-secondary text-xs">
                      {formatCurrency(timeBasedInsights.peakHour.sales)}
                    </p>
                  </div>
                  <div className="theme-surface rounded-xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Best Day</p>
                    <p className="theme-text-primary text-lg sm:text-xl font-bold text-emerald-400">
                      {timeBasedInsights.bestDay.day}
                    </p>
                    <p className="theme-text-secondary text-xs">
                      {formatCurrency(timeBasedInsights.bestDay.sales)}
                    </p>
                  </div>
                  <div className="theme-surface rounded-xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Sales Velocity</p>
                    <p className="theme-text-primary text-lg sm:text-xl font-bold text-purple-400">
                      {timeBasedInsights.salesVelocity.toFixed(1)}
                    </p>
                    <p className="theme-text-secondary text-xs">items/hour</p>
                  </div>
                </div>

                {/* Sales by Hour */}
                <div className="mb-6">
                  <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-4">Sales by Hour of Day</h3>
                  <div className="theme-surface rounded-xl border p-4 bg-white/5">
                    <SimpleLineChart
                      data={timeBasedInsights.byHour.map(h => ({
                        period: `${h.hour}:00`,
                        sales: h.sales,
                        orders: h.orders,
                        items: h.items,
                        averageOrderValue: 0,
                      }))}
                      metric="sales"
                      color="#10b981"
                      labelFormatter={(period) => period}
                    />
                  </div>
                </div>

                {/* Sales by Day of Week */}
                <div className="mb-6">
                  <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-4">Sales by Day of Week</h3>
                  <div className="theme-surface rounded-xl border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-white/5">
                          <tr>
                            <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Day</th>
                            <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Sales</th>
                            <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Orders</th>
                            <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Items</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {timeBasedInsights.byDayOfWeek.map((day) => (
                            <tr key={day.day} className="hover:bg-white/5 transition">
                              <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                <span className="theme-text-primary font-medium">{day.day}</span>
                              </td>
                              <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                <span className="theme-text-primary font-semibold text-emerald-400">
                                  {formatCurrency(day.sales)}
                                </span>
                              </td>
                              <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                <span className="theme-text-primary font-semibold text-sky-400">
                                  {day.orders}
                                </span>
                              </td>
                              <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                <span className="theme-text-primary font-semibold text-purple-400">
                                  {day.items}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Sales by Month */}
                {timeBasedInsights.byMonth.length > 0 && (
                  <div>
                    <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-4">Sales by Month</h3>
                    <div className="theme-surface rounded-xl border p-4 bg-white/5">
                      <SimpleLineChart
                        data={timeBasedInsights.byMonth.map(m => ({
                          period: m.month,
                          sales: m.sales,
                          orders: m.orders,
                          items: m.items,
                          averageOrderValue: 0,
                        }))}
                        metric="sales"
                        color="#3b82f6"
                        labelFormatter={(period) => formatPeriod(period)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Inventory Health Tab */}
            {activeTab === 'inventory' && inventoryHealth && (
              <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="theme-text-primary text-xl font-semibold">Inventory Health</h2>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
                  <div className="theme-surface rounded-xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Turnover Rate</p>
                    <p className="theme-text-primary text-lg sm:text-xl font-bold text-sky-400">
                      {inventoryHealth.turnoverRate.toFixed(2)}x
                    </p>
                    <p className="theme-text-secondary text-xs">times per period</p>
                  </div>
                  <div className="theme-surface rounded-xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Stockout Frequency</p>
                    <p className="theme-text-primary text-lg sm:text-xl font-bold text-amber-400">
                      {inventoryHealth.stockoutFrequency.toFixed(1)}%
                    </p>
                    <p className="theme-text-secondary text-xs">of products</p>
                  </div>
                </div>

                {/* Slow Moving Products */}
                <div className="mb-6">
                  <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-4">Slow Moving Products</h3>
                  {inventoryHealth.slowMovingProducts.length === 0 ? (
                    <div className="theme-surface rounded-xl border p-6 text-center">
                      <p className="theme-text-secondary text-sm">No slow-moving products found.</p>
                    </div>
                  ) : (
                    <div className="theme-surface rounded-xl border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Product</th>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">SKU</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Stock</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Days Since Sale</th>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Last Sold</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {inventoryHealth.slowMovingProducts.slice(0, 20).map((product) => (
                              <tr key={product.productId} className="hover:bg-white/5 transition">
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <span className="theme-text-primary font-medium">{product.productName}</span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <span className="theme-text-secondary text-sm">{product.sku}</span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-amber-400">
                                    {product.quantity}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-rose-400">
                                    {product.daysSinceLastSale === 999 ? 'Never' : `${product.daysSinceLastSale} days`}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <span className="theme-text-secondary text-sm">
                                    {product.lastSold ? format(new Date(product.lastSold), 'MMM dd, yyyy') : 'Never'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Low Stock Products */}
                <div className="mb-6">
                  <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-4">Low Stock Alerts</h3>
                  {inventoryHealth.lowStockProducts.length === 0 ? (
                    <div className="theme-surface rounded-xl border p-6 text-center">
                      <p className="theme-text-secondary text-sm">No low stock alerts.</p>
                    </div>
                  ) : (
                    <div className="theme-surface rounded-xl border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Product</th>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">SKU</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Current Stock</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Reorder Point</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Days Remaining</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {inventoryHealth.lowStockProducts.map((product) => (
                              <tr key={product.productId} className="hover:bg-white/5 transition">
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <span className="theme-text-primary font-medium">{product.productName}</span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <span className="theme-text-secondary text-sm">{product.sku}</span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-rose-400">
                                    {product.currentStock}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-secondary">
                                    {product.reorderPoint || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className={`theme-text-primary font-semibold ${
                                    product.daysRemaining < 7 ? 'text-rose-400' : 
                                    product.daysRemaining < 14 ? 'text-amber-400' : 'text-sky-400'
                                  }`}>
                                    {product.daysRemaining} days
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dead Stock */}
                <div>
                  <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-4">Dead Stock (180+ days)</h3>
                  {inventoryHealth.deadStock.length === 0 ? (
                    <div className="theme-surface rounded-xl border p-6 text-center">
                      <p className="theme-text-secondary text-sm">No dead stock identified.</p>
                    </div>
                  ) : (
                    <div className="theme-surface rounded-xl border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Product</th>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">SKU</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Quantity</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Value</th>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Last Sold</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {inventoryHealth.deadStock.map((product) => (
                              <tr key={product.productId} className="hover:bg-white/5 transition">
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <span className="theme-text-primary font-medium">{product.productName}</span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <span className="theme-text-secondary text-sm">{product.sku}</span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-amber-400">
                                    {product.quantity}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-rose-400">
                                    {formatCurrency(product.value)}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <span className="theme-text-secondary text-sm">
                                    {product.lastSold ? format(new Date(product.lastSold), 'MMM dd, yyyy') : 'Never'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Discount & Promotion Analytics Tab */}
            {activeTab === 'discount' && discountAnalytics && (
              <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="theme-text-primary text-xl font-semibold">Discount & Promotion Analytics</h2>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                  <div className="theme-surface rounded-xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Total Discount</p>
                    <p className="theme-text-primary text-lg sm:text-xl font-bold text-amber-400">
                      {formatCurrency(discountAnalytics.totalDiscountAmount)}
                    </p>
                  </div>
                  <div className="theme-surface rounded-xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Orders w/ Discount</p>
                    <p className="theme-text-primary text-lg sm:text-xl font-bold text-sky-400">
                      {discountAnalytics.ordersWithDiscount}
                    </p>
                    <p className="theme-text-secondary text-xs">
                      {discountAnalytics.totalDiscountPercentage.toFixed(1)}% of orders
                    </p>
                  </div>
                  <div className="theme-surface rounded-xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Avg Discount %</p>
                    <p className="theme-text-primary text-lg sm:text-xl font-bold text-purple-400">
                      {discountAnalytics.averageDiscountPercent.toFixed(1)}%
                    </p>
                  </div>
                  <div className="theme-surface rounded-xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Discount Impact</p>
                    <p className={`theme-text-primary text-lg sm:text-xl font-bold ${
                      discountAnalytics.discountImpact.profitWithDiscount >= discountAnalytics.discountImpact.profitWithoutDiscount
                        ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {formatCurrency(
                        discountAnalytics.discountImpact.profitWithDiscount - discountAnalytics.discountImpact.profitWithoutDiscount
                      )}
                    </p>
                    <p className="theme-text-secondary text-xs">on profit</p>
                  </div>
                </div>

                {/* Discount Impact */}
                <div className="mb-6">
                  <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-4">Discount Impact Analysis</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="theme-surface rounded-xl border p-4">
                      <p className="theme-text-secondary text-xs uppercase mb-2">Revenue with Discount</p>
                      <p className="theme-text-primary text-xl font-bold text-emerald-400">
                        {formatCurrency(discountAnalytics.discountImpact.revenueWithDiscount)}
                      </p>
                    </div>
                    <div className="theme-surface rounded-xl border p-4">
                      <p className="theme-text-secondary text-xs uppercase mb-2">Revenue without Discount</p>
                      <p className="theme-text-primary text-xl font-bold text-sky-400">
                        {formatCurrency(discountAnalytics.discountImpact.revenueWithoutDiscount)}
                      </p>
                    </div>
                    <div className="theme-surface rounded-xl border p-4">
                      <p className="theme-text-secondary text-xs uppercase mb-2">Profit with Discount</p>
                      <p className="theme-text-primary text-xl font-bold text-emerald-400">
                        {formatCurrency(discountAnalytics.discountImpact.profitWithDiscount)}
                      </p>
                    </div>
                    <div className="theme-surface rounded-xl border p-4">
                      <p className="theme-text-secondary text-xs uppercase mb-2">Profit without Discount</p>
                      <p className="theme-text-primary text-xl font-bold text-sky-400">
                        {formatCurrency(discountAnalytics.discountImpact.profitWithoutDiscount)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Discount Types */}
                {discountAnalytics.byDiscountType.length > 0 && (
                  <div>
                    <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-4">Discount Types</h3>
                    <div className="theme-surface rounded-xl border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Type</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Count</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Total Amount</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Avg %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {discountAnalytics.byDiscountType.map((type) => (
                              <tr key={type.type} className="hover:bg-white/5 transition">
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <span className="theme-text-primary font-medium">{type.type}</span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-sky-400">
                                    {type.count}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-amber-400">
                                    {formatCurrency(type.totalAmount)}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-purple-400">
                                    {type.avgPercent.toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payment Method Insights Tab */}
            {activeTab === 'payment' && paymentMethodInsights && (
              <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="theme-text-primary text-xl font-semibold">Payment Method Insights</h2>
                </div>

                {/* Cash vs Digital Split */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="theme-surface rounded-xl border p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-400/30">
                    <p className="theme-text-secondary text-xs uppercase tracking-wide mb-1">Cash Payments</p>
                    <p className="theme-text-primary text-2xl font-bold text-emerald-400">
                      {formatCurrency(paymentMethodInsights.cashVsDigital.cash.amount)}
                    </p>
                    <p className="theme-text-secondary text-sm mt-1">
                      {paymentMethodInsights.cashVsDigital.cash.count} transactions ({paymentMethodInsights.cashVsDigital.cash.percentage.toFixed(1)}%)
                    </p>
                  </div>
                  <div className="theme-surface rounded-xl border p-4 bg-gradient-to-br from-sky-500/10 to-sky-600/5 border-sky-400/30">
                    <p className="theme-text-secondary text-xs uppercase tracking-wide mb-1">Digital Payments</p>
                    <p className="theme-text-primary text-2xl font-bold text-sky-400">
                      {formatCurrency(paymentMethodInsights.cashVsDigital.digital.amount)}
                    </p>
                    <p className="theme-text-secondary text-sm mt-1">
                      {paymentMethodInsights.cashVsDigital.digital.count} transactions ({paymentMethodInsights.cashVsDigital.digital.percentage.toFixed(1)}%)
                    </p>
                  </div>
                </div>

                {/* Payment Methods Table */}
                <div>
                  <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-4">Payment Methods Breakdown</h3>
                  {paymentMethodInsights.byMethod.length === 0 ? (
                    <div className="theme-surface rounded-xl border p-6 text-center">
                      <p className="theme-text-secondary text-sm">No payment data available.</p>
                    </div>
                  ) : (
                    <div className="theme-surface rounded-xl border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Method</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Transactions</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Total Amount</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Avg Amount</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">% of Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {paymentMethodInsights.byMethod.map((method) => (
                              <tr key={method.method} className="hover:bg-white/5 transition">
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <span className="theme-text-primary font-medium">{method.method}</span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-sky-400">
                                    {method.count}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-emerald-400">
                                    {formatCurrency(method.totalAmount)}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-purple-400">
                                    {formatCurrency(method.averageAmount)}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold">
                                    {method.percentage.toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Return & Refund Analytics Tab */}
            {activeTab === 'returns' && returnRefundAnalytics && (
              <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="theme-text-primary text-xl font-semibold">Return & Refund Analytics</h2>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                  <div className="theme-surface rounded-xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Total Returns</p>
                    <p className="theme-text-primary text-lg sm:text-xl font-bold text-rose-400">
                      {returnRefundAnalytics.totalReturns}
                    </p>
                  </div>
                  <div className="theme-surface rounded-xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Total Refunds</p>
                    <p className="theme-text-primary text-lg sm:text-xl font-bold text-amber-400">
                      {formatCurrency(returnRefundAnalytics.totalRefundAmount)}
                    </p>
                  </div>
                  <div className="theme-surface rounded-xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Return Rate</p>
                    <p className="theme-text-primary text-lg sm:text-xl font-bold text-rose-400">
                      {returnRefundAnalytics.returnRate.toFixed(2)}%
                    </p>
                  </div>
                  <div className="theme-surface rounded-xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Profit Impact</p>
                    <p className="theme-text-primary text-lg sm:text-xl font-bold text-amber-400">
                      -{formatCurrency(returnRefundAnalytics.impactOnProfit)}
                    </p>
                  </div>
                </div>

                {/* Returns by Product */}
                <div className="mb-6">
                  <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-4">Returns by Product</h3>
                  {returnRefundAnalytics.byProduct.length === 0 ? (
                    <div className="theme-surface rounded-xl border p-6 text-center">
                      <p className="theme-text-secondary text-sm">No return data available.</p>
                    </div>
                  ) : (
                    <div className="theme-surface rounded-xl border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Product</th>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">SKU</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Return Count</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Return Rate %</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Refund Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {returnRefundAnalytics.byProduct.map((product) => (
                              <tr key={product.productId} className="hover:bg-white/5 transition">
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <span className="theme-text-primary font-medium">{product.productName}</span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <span className="theme-text-secondary text-sm">{product.sku}</span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-rose-400">
                                    {product.returnCount}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-amber-400">
                                    {product.returnRate.toFixed(2)}%
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-amber-400">
                                    {formatCurrency(product.refundAmount)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Returns by Category */}
                {returnRefundAnalytics.byCategory.length > 0 && (
                  <div className="mb-6">
                    <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-4">Returns by Category</h3>
                    <div className="theme-surface rounded-xl border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Category</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Return Count</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Return Rate %</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Refund Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {returnRefundAnalytics.byCategory.map((category) => (
                              <tr key={category.categoryId} className="hover:bg-white/5 transition">
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <span className="theme-text-primary font-medium">{category.categoryName}</span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-rose-400">
                                    {category.returnCount}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-amber-400">
                                    {category.returnRate.toFixed(2)}%
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-amber-400">
                                    {formatCurrency(category.refundAmount)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Return Trends */}
                {returnRefundAnalytics.trends.length > 0 && (
                  <div>
                    <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-4">Return Trends</h3>
                    <div className="theme-surface rounded-xl border p-4 bg-white/5">
                      <SimpleLineChart
                        data={returnRefundAnalytics.trends.map(t => ({
                          period: t.period,
                          sales: t.refundAmount,
                          orders: t.returns,
                          items: 0,
                          averageOrderValue: 0,
                        }))}
                        metric="sales"
                        color="#f59e0b"
                        labelFormatter={(period) => formatPeriod(period)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Basket Analysis Tab */}
            {activeTab === 'basket' && basketAnalysis && (
              <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="theme-text-primary text-xl font-semibold">Basket Analysis</h2>
                </div>

                {/* Key Metric */}
                <div className="mb-6">
                  <div className="theme-surface rounded-xl border p-4">
                    <p className="theme-text-secondary text-xs uppercase tracking-wide mb-1">Average Items per Order</p>
                    <p className="theme-text-primary text-3xl font-bold text-sky-400">
                      {basketAnalysis.averageItemsPerOrder.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Frequently Bought Together */}
                <div className="mb-6">
                  <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-4">Frequently Bought Together</h3>
                  {basketAnalysis.frequentlyBoughtTogether.length === 0 ? (
                    <div className="theme-surface rounded-xl border p-6 text-center">
                      <p className="theme-text-secondary text-sm">No product pairs data available.</p>
                    </div>
                  ) : (
                    <div className="theme-surface rounded-xl border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Product Pair</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Frequency</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Support %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {basketAnalysis.frequentlyBoughtTogether.map((pair, index) => (
                              <tr key={index} className="hover:bg-white/5 transition">
                                <td className="px-4 lg:px-6 py-4">
                                  <div className="flex flex-col gap-1">
                                    <span className="theme-text-primary font-medium">{pair.products[0]}</span>
                                    <span className="theme-text-secondary text-sm">+ {pair.products[1]}</span>
                                  </div>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-sky-400">
                                    {pair.frequency}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-purple-400">
                                    {pair.support.toFixed(2)}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cross-Sell Opportunities */}
                {basketAnalysis.crossSellOpportunities.length > 0 && (
                  <div className="mb-6">
                    <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-4">Cross-Sell Opportunities</h3>
                    <div className="space-y-4">
                      {basketAnalysis.crossSellOpportunities.map((opportunity) => (
                        <div key={opportunity.productId} className="theme-surface rounded-xl border p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="theme-text-primary font-semibold">{opportunity.productName}</p>
                              <p className="theme-text-secondary text-xs">Customers also buy:</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {opportunity.suggestedProducts.map((suggested) => (
                              <div key={suggested.productId} className="flex items-center justify-between">
                                <span className="theme-text-primary text-sm">{suggested.productName}</span>
                                <span className="theme-text-secondary text-xs">
                                  {suggested.confidence.toFixed(1)}% confidence
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Bundles */}
                {basketAnalysis.topBundles.length > 0 && (
                  <div>
                    <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-4">Top Product Bundles</h3>
                    <div className="theme-surface rounded-xl border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Bundle</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Frequency</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {basketAnalysis.topBundles.map((bundle, index) => (
                              <tr key={index} className="hover:bg-white/5 transition">
                                <td className="px-4 lg:px-6 py-4">
                                  <div className="flex flex-col gap-1">
                                    {bundle.products.map((product, idx) => (
                                      <span key={idx} className="theme-text-primary font-medium">
                                        {idx === 0 ? product : `+ ${product}`}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-sky-400">
                                    {bundle.frequency}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-emerald-400">
                                    {formatCurrency(bundle.revenue)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sales Trends & Forecasting Tab */}
            {activeTab === 'trends' && salesTrendsForecasting && (
              <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="theme-text-primary text-xl font-semibold">Sales Trends & Forecasting</h2>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                  <div className="theme-surface rounded-xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Growth Rate</p>
                    <p className={`theme-text-primary text-lg sm:text-xl font-bold ${
                      salesTrendsForecasting.growthRate >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {salesTrendsForecasting.growthRate >= 0 ? '+' : ''}{salesTrendsForecasting.growthRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="theme-surface rounded-xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Trend</p>
                    <p className={`theme-text-primary text-lg sm:text-xl font-bold ${
                      salesTrendsForecasting.trend === 'up' ? 'text-emerald-400' :
                      salesTrendsForecasting.trend === 'down' ? 'text-rose-400' : 'text-sky-400'
                    }`}>
                      {salesTrendsForecasting.trend === 'up' ? '📈 Up' :
                       salesTrendsForecasting.trend === 'down' ? '📉 Down' : '➡️ Stable'}
                    </p>
                  </div>
                  <div className="theme-surface rounded-xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Forecast Periods</p>
                    <p className="theme-text-primary text-lg sm:text-xl font-bold text-purple-400">
                      {salesTrendsForecasting.forecastedSales.length}
                    </p>
                  </div>
                </div>

                {/* Moving Average Chart */}
                {salesTrendsForecasting.movingAverage.length > 0 && (
                  <div className="mb-6">
                    <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-4">Moving Average Trend</h3>
                    <div className="theme-surface rounded-xl border p-4 bg-white/5">
                      <SimpleLineChart
                        data={salesTrendsForecasting.movingAverage.map(m => ({
                          period: m.period,
                          sales: m.value,
                          orders: 0,
                          items: 0,
                          averageOrderValue: 0,
                        }))}
                        metric="sales"
                        color="#3b82f6"
                        labelFormatter={(period) => formatPeriod(period)}
                      />
                    </div>
                  </div>
                )}

                {/* Variance Analysis */}
                {salesTrendsForecasting.variance.length > 0 && (
                  <div className="mb-6">
                    <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-4">Variance Analysis</h3>
                    <div className="theme-surface rounded-xl border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Period</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Actual</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Expected</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Variance</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Variance %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {salesTrendsForecasting.variance.map((v, index) => (
                              <tr key={index} className="hover:bg-white/5 transition">
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <span className="theme-text-primary font-medium">{formatPeriod(v.period)}</span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-emerald-400">
                                    {formatCurrency(v.actual)}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-secondary">
                                    {formatCurrency(v.expected)}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className={`theme-text-primary font-semibold ${
                                    v.variance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                  }`}>
                                    {v.variance >= 0 ? '+' : ''}{formatCurrency(v.variance)}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className={`theme-text-primary font-semibold ${
                                    v.variancePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                  }`}>
                                    {v.variancePercent >= 0 ? '+' : ''}{v.variancePercent.toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Forecasted Sales */}
                {salesTrendsForecasting.forecastedSales.length > 0 && (
                  <div>
                    <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-4">Sales Forecast</h3>
                    <div className="theme-surface rounded-xl border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Period</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Forecast</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Confidence</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {salesTrendsForecasting.forecastedSales.map((forecast, index) => (
                              <tr key={index} className="hover:bg-white/5 transition">
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <span className="theme-text-primary font-medium">{forecast.period}</span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-purple-400">
                                    {formatCurrency(forecast.forecast)}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-secondary">
                                    {forecast.confidence.toFixed(0)}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Price Sensitivity Analytics */}
                {priceSensitivity && (
                  <div className="mt-8">
                    <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-4">Price Sensitivity Analysis</h3>
                    {priceSensitivity.products.length === 0 ? (
                      <div className="theme-surface rounded-xl border p-6 text-center">
                        <p className="theme-text-secondary text-sm">No price sensitivity data available for the selected period.</p>
                      </div>
                    ) : (
                      <div className="theme-surface rounded-xl border overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-white/5">
                              <tr>
                                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Product</th>
                                <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Current Price</th>
                                <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Avg Price</th>
                                <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Price Changes</th>
                                <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Elasticity</th>
                                <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Sensitivity</th>
                                <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Qty Sold</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                              {priceSensitivity.products.slice(0, 20).map((product) => (
                                <tr key={product.productId} className="hover:bg-white/5 transition">
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                    <span className="theme-text-primary font-medium">{product.productName}</span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className="theme-text-primary font-semibold text-emerald-400">
                                      {formatCurrency(product.currentPrice)}
                                    </span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className="theme-text-primary font-semibold text-sky-400">
                                      {formatCurrency(product.averagePrice)}
                                    </span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className="theme-text-primary font-semibold text-purple-400">
                                      {product.priceChanges}
                                    </span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className={`theme-text-primary font-semibold ${
                                      Math.abs(product.elasticity) > 1.5 ? 'text-rose-400' :
                                      Math.abs(product.elasticity) > 0.5 ? 'text-amber-400' : 'text-sky-400'
                                    }`}>
                                      {product.elasticity.toFixed(2)}
                                    </span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${
                                      product.sensitivityLevel === 'high' ? 'bg-rose-500/20 text-rose-200 border border-rose-400/60' :
                                      product.sensitivityLevel === 'medium' ? 'bg-amber-500/20 text-amber-200 border border-amber-400/60' :
                                      product.sensitivityLevel === 'low' ? 'bg-sky-500/20 text-sky-200 border border-sky-400/60' :
                                      'bg-slate-500/20 text-slate-300 border border-slate-400/60'
                                    }`}>
                                      {product.sensitivityLevel}
                                    </span>
                                  </td>
                                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                    <span className="theme-text-primary font-semibold text-sky-400">
                                      {product.totalQuantity.toLocaleString()}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="p-4 border-t border-white/10">
                          <p className="theme-text-secondary text-xs">
                            <strong>Price Elasticity:</strong> Negative values indicate demand decreases when price increases (normal). 
                            Values &lt; -1 indicate high sensitivity (elastic), &gt; -1 indicate low sensitivity (inelastic).
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Operational Metrics Tab */}
            {activeTab === 'operations' && operationalMetrics && (
              <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="theme-text-primary text-xl font-semibold">Operational Metrics</h2>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                  <div className="theme-surface rounded-xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Avg Transaction Time</p>
                    <p className="theme-text-primary text-lg sm:text-xl font-bold text-sky-400">
                      {operationalMetrics.averageTransactionTime.toFixed(1)} min
                    </p>
                  </div>
                  <div className="theme-surface rounded-xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Avg Items/Order</p>
                    <p className="theme-text-primary text-lg sm:text-xl font-bold text-purple-400">
                      {operationalMetrics.averageItemsPerOrder.toFixed(1)}
                    </p>
                  </div>
                  <div className="theme-surface rounded-xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Total Staff</p>
                    <p className="theme-text-primary text-lg sm:text-xl font-bold text-emerald-400">
                      {operationalMetrics.ordersPerStaff.length}
                    </p>
                  </div>
                  <div className="theme-surface rounded-xl border p-3 sm:p-4">
                    <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-wide mb-1">Peak Hour</p>
                    <p className="theme-text-primary text-lg sm:text-xl font-bold text-amber-400">
                      {operationalMetrics.peakHours[0]?.hour || 'N/A'}:00
                    </p>
                  </div>
                </div>

                {/* Orders per Staff */}
                <div className="mb-6">
                  <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-4">Orders per Staff Member</h3>
                  {operationalMetrics.ordersPerStaff.length === 0 ? (
                    <div className="theme-surface rounded-xl border p-6 text-center">
                      <p className="theme-text-secondary text-sm">No staff data available.</p>
                    </div>
                  ) : (
                    <div className="theme-surface rounded-xl border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Staff Member</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Orders</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Avg Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {operationalMetrics.ordersPerStaff.map((staff) => (
                              <tr key={staff.userId} className="hover:bg-white/5 transition">
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <span className="theme-text-primary font-medium">{staff.userName}</span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-sky-400">
                                    {staff.orderCount}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-secondary">
                                    {staff.avgTransactionTime.toFixed(1)} min
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Peak Hours */}
                {operationalMetrics.peakHours.length > 0 && (
                  <div>
                    <h3 className="theme-text-primary text-base sm:text-lg font-semibold mb-4">Peak Hours</h3>
                    <div className="theme-surface rounded-xl border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Hour</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Order Count</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {operationalMetrics.peakHours.map((peak) => (
                              <tr key={peak.hour} className="hover:bg-white/5 transition">
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <span className="theme-text-primary font-medium">{peak.hour}:00</span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-amber-400">
                                    {peak.orderCount}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
