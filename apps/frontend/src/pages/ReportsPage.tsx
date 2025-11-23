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

interface InventoryAnalytics {
  period: Period;
  from: string;
  to: string;
  locationId?: string;
  totalReceived: number;
  totalSold: number;
  totalReturned: number;
  netChange: number;
  data: Array<{
    period: string;
    received: number;
    sold: number;
    returned: number;
    adjusted: number;
    transactions: number;
    netChange: number;
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

export function ReportsPage() {
  const { logout, accessToken, user } = useAuthStore();
  const [period, setPeriod] = useState<Period>('daily');
  const [customDateFrom, setCustomDateFrom] = useState<string>(
    format(startOfDay(subDays(new Date(), 7)), 'yyyy-MM-dd')
  );
  const [customDateTo, setCustomDateTo] = useState<string>(
    format(endOfDay(new Date()), 'yyyy-MM-dd')
  );
  const [loading, setLoading] = useState(true);
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics | null>(null);
  const [inventoryAnalytics, setInventoryAnalytics] = useState<InventoryAnalytics | null>(null);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance | null>(null);

  const loadAnalytics = async () => {
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

      const [salesRes, inventoryRes, staffRes] = await Promise.all([
        axios.get(`${API_URL}/api/v1/reports/sales-analytics`, { headers, params }),
        axios.get(`${API_URL}/api/v1/reports/inventory-analytics`, { headers, params }),
        axios.get(`${API_URL}/api/v1/reports/staff-performance`, {
          headers,
          params: { location_id: user?.locationId },
        }),
      ]);

      setSalesAnalytics(salesRes.data);
      setInventoryAnalytics(inventoryRes.data);
      setStaffPerformance(staffRes.data);
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
      toast.error(error.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [period, accessToken, user?.locationId, customDateFrom, customDateTo]);

  const formatCurrency = (amount: number) => {
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

  const getMaxValue = (data: any[], key: string) => {
    return Math.max(...data.map((d) => d[key]), 1);
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle values that might contain commas or quotes
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ].join('\n');

    // Create blob and download
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

  const handleExportSales = () => {
    if (!salesAnalytics) return;
    exportToCSV(salesAnalytics.data, 'sales_report');
  };

  const handleExportInventory = () => {
    if (!inventoryAnalytics) return;
    exportToCSV(inventoryAnalytics.data, 'inventory_report');
  };

  const handleExportStaff = () => {
    if (!staffPerformance) return;
    exportToCSV(staffPerformance.staffPerformance, 'staff_performance_report');
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
              <h1 className="theme-text-primary text-3xl font-semibold tracking-tight">Analytics & Reports</h1>
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
            <p className="theme-text-secondary">Loading analytics...</p>
          </div>
        ) : (
          <>
            {/* Sales Analytics */}
            {salesAnalytics && (
              <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="theme-text-primary text-xl font-semibold">Sales Analytics</h2>
                  <button
                    onClick={handleExportSales}
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

                {/* Sales Chart */}
                <div className="mb-6">
                  <h3 className="theme-text-primary text-sm font-semibold mb-3">Sales Over Time</h3>
                  <div className="theme-surface rounded-xl border p-4">
                    <div className="flex items-end justify-between gap-2 h-64">
                      {salesAnalytics.data.map((item, idx) => {
                        const maxSales = getMaxValue(salesAnalytics.data, 'sales');
                        const height = (item.sales / maxSales) * 100;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                            <div className="relative w-full flex items-end justify-center" style={{ height: '240px' }}>
                              <div
                                className="w-full rounded-t bg-gradient-to-t from-emerald-500 to-emerald-400 transition hover:from-emerald-400 hover:to-emerald-300"
                                style={{ height: `${height}%`, minHeight: '4px' }}
                                title={`${formatPeriod(item.period)}: ${formatCurrency(item.sales)}`}
                              />
                            </div>
                            <p className="theme-text-secondary text-[10px] text-center transform -rotate-45 origin-top-left whitespace-nowrap" style={{ writingMode: 'vertical-rl' }}>
                              {formatPeriod(item.period)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Orders Chart */}
                <div>
                  <h3 className="theme-text-primary text-sm font-semibold mb-3">Orders Over Time</h3>
                  <div className="theme-surface rounded-xl border p-4">
                    <div className="flex items-end justify-between gap-2 h-64">
                      {salesAnalytics.data.map((item, idx) => {
                        const maxOrders = getMaxValue(salesAnalytics.data, 'orders');
                        const height = (item.orders / maxOrders) * 100;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                            <div className="relative w-full flex items-end justify-center" style={{ height: '240px' }}>
                              <div
                                className="w-full rounded-t bg-gradient-to-t from-sky-500 to-sky-400 transition hover:from-sky-400 hover:to-sky-300"
                                style={{ height: `${height}%`, minHeight: '4px' }}
                                title={`${formatPeriod(item.period)}: ${item.orders} orders`}
                              />
                            </div>
                            <p className="theme-text-secondary text-[10px] text-center transform -rotate-45 origin-top-left whitespace-nowrap" style={{ writingMode: 'vertical-rl' }}>
                              {formatPeriod(item.period)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Inventory Analytics */}
            {inventoryAnalytics && (
              <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="theme-text-primary text-xl font-semibold">Inventory Analytics</h2>
                  <button
                    onClick={handleExportInventory}
                    disabled={!inventoryAnalytics || inventoryAnalytics.data.length === 0}
                    className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📥 Export CSV
                  </button>
                </div>
                
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="theme-surface rounded-2xl border p-4">
                    <p className="theme-text-secondary text-xs uppercase tracking-wide mb-1">Items Received</p>
                    <p className="theme-text-primary text-2xl font-bold text-emerald-400">
                      {inventoryAnalytics.totalReceived.toLocaleString()}
                    </p>
                  </div>
                  <div className="theme-surface rounded-2xl border p-4">
                    <p className="theme-text-secondary text-xs uppercase tracking-wide mb-1">Items Sold</p>
                    <p className="theme-text-primary text-2xl font-bold text-rose-400">
                      {inventoryAnalytics.totalSold.toLocaleString()}
                    </p>
                  </div>
                  <div className="theme-surface rounded-2xl border p-4">
                    <p className="theme-text-secondary text-xs uppercase tracking-wide mb-1">Items Returned</p>
                    <p className="theme-text-primary text-2xl font-bold text-amber-400">
                      {inventoryAnalytics.totalReturned.toLocaleString()}
                    </p>
                  </div>
                  <div className="theme-surface rounded-2xl border p-4">
                    <p className="theme-text-secondary text-xs uppercase tracking-wide mb-1">Net Change</p>
                    <p className={`text-2xl font-bold ${inventoryAnalytics.netChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {inventoryAnalytics.netChange >= 0 ? '+' : ''}{inventoryAnalytics.netChange.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Inventory Movement Chart */}
                <div>
                  <h3 className="theme-text-primary text-sm font-semibold mb-3">Inventory Movement Over Time</h3>
                  <div className="theme-surface rounded-xl border p-4">
                    <div className="flex items-end justify-between gap-2 h-64">
                      {inventoryAnalytics.data.map((item, idx) => {
                        const maxValue = Math.max(
                          ...inventoryAnalytics.data.map((d) => Math.max(d.received, d.sold, d.returned)),
                          1
                        );
                        const receivedHeight = (item.received / maxValue) * 100;
                        const soldHeight = (item.sold / maxValue) * 100;
                        const returnedHeight = (item.returned / maxValue) * 100;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                            <div className="relative w-full flex items-end justify-center gap-0.5" style={{ height: '240px' }}>
                              <div
                                className="flex-1 rounded-t bg-gradient-to-t from-emerald-500 to-emerald-400"
                                style={{ height: `${receivedHeight}%`, minHeight: '2px' }}
                                title={`Received: ${item.received}`}
                              />
                              <div
                                className="flex-1 rounded-t bg-gradient-to-t from-rose-500 to-rose-400"
                                style={{ height: `${soldHeight}%`, minHeight: '2px' }}
                                title={`Sold: ${item.sold}`}
                              />
                              <div
                                className="flex-1 rounded-t bg-gradient-to-t from-amber-500 to-amber-400"
                                style={{ height: `${returnedHeight}%`, minHeight: '2px' }}
                                title={`Returned: ${item.returned}`}
                              />
                            </div>
                            <p className="theme-text-secondary text-[10px] text-center transform -rotate-45 origin-top-left whitespace-nowrap" style={{ writingMode: 'vertical-rl' }}>
                              {formatPeriod(item.period)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-4 justify-center mt-4 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-emerald-400" />
                        <span className="theme-text-secondary">Received</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-rose-400" />
                        <span className="theme-text-secondary">Sold</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-amber-400" />
                        <span className="theme-text-secondary">Returned</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Staff Performance */}
            {staffPerformance && staffPerformance.staffPerformance.length > 0 && (
              <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="theme-text-primary text-xl font-semibold">Staff Performance</h2>
                  <button
                    onClick={handleExportStaff}
                    disabled={!staffPerformance || staffPerformance.staffPerformance.length === 0}
                    className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📥 Export CSV
                  </button>
                </div>
                
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
              </div>
            )}

            {staffPerformance && staffPerformance.staffPerformance.length === 0 && (
              <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl text-center">
                <p className="theme-text-secondary">No staff performance data available for the selected period.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
