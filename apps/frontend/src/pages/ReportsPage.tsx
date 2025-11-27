import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { BrandMark } from '../components/BrandMark';
import { ThemeToggle } from '../components/ThemeToggle';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import toast from 'react-hot-toast';
import { format, parseISO, startOfDay, endOfDay, subDays } from 'date-fns';

type Period = 'daily' | 'weekly' | 'monthly' | 'custom';
type ReportTab = 'general' | 'staff' | 'credit';

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
  averagePrice: number;
}

export function ReportsPage() {
  const { logout, accessToken, user } = useAuthStore();
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
      
      // Also load product analytics
      await loadProductAnalytics(headers, params);
    } catch (error: any) {
      console.error('Failed to load sales analytics:', error);
      toast.error(error.response?.data?.message || 'Failed to load sales analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadProductAnalytics = async (headers: any, params: any) => {
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
        // Calculate date range based on period
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
      const productMap: Record<string, { quantity: number; revenue: number }> = {};
      const productIds = new Set<string>();

      orders.forEach((order: any) => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            const productId = item.productId;
            if (!productId) return;
            
            productIds.add(productId);
            
            if (!productMap[productId]) {
              productMap[productId] = { quantity: 0, revenue: 0 };
            }
            
            const itemTotal = (item.priceCents || 0) * (item.quantity || 0);
            productMap[productId].quantity += item.quantity || 0;
            productMap[productId].revenue += itemTotal;
          });
        }
      });

      // Fetch product details
      const productsResponse = await axios.get(`${API_URL}/api/v1/products`, { headers });
      const products = productsResponse.data || [];
      const productsMap = new Map(products.map((p: any) => [p.id, p]));

      // Build analytics array
      const analytics: ProductAnalytics[] = Array.from(productIds)
        .map((productId) => {
          const stats = productMap[productId];
          const product = productsMap.get(productId) as any;
          
          return {
            productId,
            productName: product?.name || `Product ${productId.substring(0, 8)}`,
            sku: product?.sku || 'N/A',
            quantitySold: stats.quantity,
            revenue: stats.revenue / 100, // Convert cents to currency
            averagePrice: stats.quantity > 0 ? (stats.revenue / 100) / stats.quantity : 0,
          };
        })
        .sort((a, b) => b.quantitySold - a.quantitySold); // Sort by quantity sold

      setProductAnalytics(analytics);
    } catch (error: any) {
      console.error('Failed to load product analytics:', error);
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

  useEffect(() => {
    if (!accessToken) return;

    if (activeTab === 'general') {
      loadGeneralAnalytics();
    } else if (activeTab === 'staff') {
      loadStaffPerformance();
    } else if (activeTab === 'credit') {
      loadCreditReport();
    }
  }, [activeTab, period, accessToken, user?.locationId, customDateFrom, customDateTo]);

  const formatCurrency = (amount: number) => {
    // If amount is already in currency units (not cents), use as-is, otherwise divide by 100
    const amountInCurrency = amount > 1000000 ? amount / 100 : amount;
    return `₦${amountInCurrency.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    <div className="theme-background min-h-screen">
      <div className="relative mx-auto w-full max-w-7xl space-y-6 px-6 py-10">
        {/* Header */}
        <div className="theme-card flex flex-col gap-4 rounded-3xl border p-6 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BrandMark
              size={52}
              backgroundClassName="bg-white/90 dark:bg-white/10"
              className="ring-1 ring-slate-200/40 dark:ring-white/10"
            />
            <div>
              <p className="theme-text-secondary text-xs uppercase tracking-[0.35em]">Insights</p>
              <h1 className="theme-text-primary text-3xl font-semibold tracking-tight">Business Reports</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
        <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
          <div className="flex flex-wrap gap-3">
            {(['general', 'staff', 'credit'] as ReportTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full border px-6 py-3 text-sm font-semibold transition ${
                  activeTab === tab
                    ? 'border-sky-400/70 bg-sky-500/20 text-sky-50'
                    : 'border-white/15 bg-white/5 text-white/70 hover:border-sky-300/50 hover:text-white'
                }`}
              >
                {tab === 'general' && '📊 General Analytics'}
                {tab === 'staff' && '👥 Staff Reports'}
                {tab === 'credit' && '💳 Credit Reports'}
              </button>
            ))}
          </div>
        </div>

        {/* Period Selector */}
        <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="theme-text-primary text-lg font-semibold">Time Period</h2>
              <p className="theme-text-secondary text-sm">Select the time period for analytics</p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                {(['daily', 'weekly', 'monthly', 'custom'] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="theme-surface rounded-2xl border p-4">
                    <p className="theme-text-secondary text-xs uppercase tracking-wide mb-1">Total Sales</p>
                    <p className="theme-text-primary text-2xl font-bold text-emerald-400">
                      {formatCurrency(salesAnalytics.totalSales)}
                    </p>
                  </div>
                  <div className="theme-surface rounded-2xl border p-4">
                    <p className="theme-text-secondary text-xs uppercase tracking-wide mb-1">Total Orders</p>
                    <p className="theme-text-primary text-2xl font-bold text-sky-400">
                      {salesAnalytics.totalOrders.toLocaleString()}
                    </p>
                  </div>
                  <div className="theme-surface rounded-2xl border p-4">
                    <p className="theme-text-secondary text-xs uppercase tracking-wide mb-1">Avg Order Value</p>
                    <p className="theme-text-primary text-2xl font-bold text-purple-400">
                      {formatCurrency(salesAnalytics.averageOrderValue)}
                    </p>
                  </div>
                  <div className="theme-surface rounded-2xl border p-4">
                    <p className="theme-text-secondary text-xs uppercase tracking-wide mb-1">Total Items</p>
                    <p className="theme-text-primary text-2xl font-bold text-amber-400">
                      {salesAnalytics.data.reduce((sum, d) => sum + d.items, 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Product Sales Analytics Table */}
                <div className="mb-8">
                  <h3 className="theme-text-primary text-lg font-semibold mb-4">Product Sales Performance</h3>
                  {loadingProducts ? (
                    <div className="theme-surface rounded-xl border p-8 text-center">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent mb-2" />
                      <p className="theme-text-secondary text-sm">Loading product analytics...</p>
                    </div>
                  ) : productAnalytics.length === 0 ? (
                    <div className="theme-surface rounded-xl border p-8 text-center">
                      <p className="theme-text-secondary">No product sales data available for the selected period.</p>
                    </div>
                  ) : (
                    <div className="theme-surface rounded-xl border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                Rank
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                Product Name
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                SKU
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                Quantity Sold
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                Revenue
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                Avg Price
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {productAnalytics.map((product, index) => (
                              <tr key={product.productId} className="hover:bg-white/5 transition">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="theme-text-primary font-semibold">
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="theme-text-primary font-medium">{product.productName}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="theme-text-secondary text-sm">{product.sku}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-sky-400">
                                    {product.quantitySold.toLocaleString()}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-primary font-semibold text-emerald-400">
                                    {formatCurrency(product.revenue)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                  <span className="theme-text-secondary">
                                    {formatCurrency(product.averagePrice)}
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
          </>
        )}
      </div>
    </div>
  );
}
