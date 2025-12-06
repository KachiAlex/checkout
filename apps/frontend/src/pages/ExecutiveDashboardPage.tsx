import { useEffect, useState } from 'react';
import axios from 'axios';
import { format, subDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { API_URL } from '../config';
import { BrandMark } from '../components/BrandMark';
import { ThemeToggle } from '../components/ThemeToggle';
import { formatCurrency as formatCurrencyCents } from '../utils/numberFormat';

interface SalesSummary {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
}

interface TopSeller {
  productId: string;
  quantitySold: number;
  revenue: number;
}

interface AlertSummary {
  totalAlerts: number;
  criticalCount: number;
  warningCount: number;
}

interface SalesPoint {
  period: string;
  sales: number;
}

export function ExecutiveDashboardPage() {
  const { user, accessToken } = useAuthStore();
  const theme = useThemeStore((state) => state.theme);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [todaySales, setTodaySales] = useState<SalesSummary | null>(null);
  const [weekSales, setWeekSales] = useState<SalesSummary | null>(null);
  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
  const [alertsSummary, setAlertsSummary] = useState<AlertSummary | null>(null);
  const [salesTrend, setSalesTrend] = useState<SalesPoint[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!accessToken || !user?.locationId) return;

      setLoading(true);
      setError(null);

      try {
        // Don't explicitly set headers - let the interceptor handle apikey and Authorization
        // This ensures apikey is included in OPTIONS preflight requests
        const location_id = user.locationId;

        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');
        const weekAgo = subDays(today, 6);
        const weekAgoStr = format(weekAgo, 'yyyy-MM-dd');

        const [
          todaySalesRes,
          weekSalesRes,
          topSellersRes,
          alertsRes,
          salesAnalyticsRes,
        ] = await Promise.all([
          axios.get(`${API_URL}/api/v1/reports/sales`, {
            params: { from: todayStr, to: todayStr, location_id },
          }),
          axios.get(`${API_URL}/api/v1/reports/sales`, {
            params: { from: weekAgoStr, to: todayStr, location_id },
          }),
          axios.get(`${API_URL}/api/v1/reports/top-sellers`, {
            params: { from: weekAgoStr, to: todayStr, location_id, limit: 5 },
          }),
          axios.get(`${API_URL}/api/v1/reports/alerts`, {
            params: { location_id },
          }),
          axios.get(`${API_URL}/api/v1/reports/sales-analytics`, {
            params: { period: 'daily', location_id },
          }),
        ]);

        setTodaySales({
          totalSales: todaySalesRes.data.totalSales,
          totalOrders: todaySalesRes.data.totalOrders,
          averageOrderValue: todaySalesRes.data.averageOrderValue,
        });

        setWeekSales({
          totalSales: weekSalesRes.data.totalSales,
          totalOrders: weekSalesRes.data.totalOrders,
          averageOrderValue: weekSalesRes.data.averageOrderValue,
        });

        setTopSellers(topSellersRes.data.topSellers || []);

        setAlertsSummary({
          totalAlerts: alertsRes.data.totalAlerts || 0,
          criticalCount: alertsRes.data.criticalCount || 0,
          warningCount: alertsRes.data.warningCount || 0,
        });

        const analytics = salesAnalyticsRes.data;
        const last7 = (analytics.data || []).slice(-7);
        setSalesTrend(
          last7.map((p: any) => ({
            period: p.period,
            sales: p.sales,
          })),
        );
      } catch (err: any) {
        console.error('Failed to load executive dashboard:', err);
        setError(err.response?.data?.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [accessToken, user?.locationId]);

  const formatCurrency = (amount: number) => {
    // Backend sales endpoints already return naira, but formatCurrencyCents expects cents.
    // Wrap safely for display.
    return `₦${amount.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const totalSalesToday = todaySales?.totalSales || 0;
  const totalOrdersToday = todaySales?.totalOrders || 0;
  const avgOrderToday = todaySales?.averageOrderValue || 0;

  const totalSalesWeek = weekSales?.totalSales || 0;
  const totalOrdersWeek = weekSales?.totalOrders || 0;

  const growthPercent =
    totalSalesWeek > 0 ? ((totalSalesToday / totalSalesWeek) * 100).toFixed(1) : '0.0';

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden theme-background page-with-nav">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className={`absolute -top-32 -right-24 h-80 w-80 rounded-full ${
            theme === 'light' ? 'bg-sky-300/40' : 'bg-cyan-500/30'
          } blur-[160px]`}
        />
        <div
          className={`absolute -bottom-44 -left-40 h-[420px] w-[420px] rounded-full ${
            theme === 'light' ? 'bg-indigo-200/35' : 'bg-indigo-500/25'
          } blur-[200px]`}
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col overflow-x-hidden w-full">
        {/* Header */}
        <header className="mx-auto w-full max-w-7xl px-2 sm:px-4 lg:px-8 pt-3 sm:pt-6 sticky top-0 z-20 bg-slate-950/80 backdrop-blur-sm">
          <div className="theme-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border p-3 sm:p-4 backdrop-blur-xl">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <BrandMark
                size={32}
                backgroundClassName="bg-white/90 dark:bg-white/10"
                className="ring-1 ring-slate-200/40 dark:ring-white/10 flex-shrink-0"
              />
              <div className="min-w-0">
                <h1 className="theme-text-primary text-lg sm:text-xl font-semibold truncate">
                  Executive Dashboard
                </h1>
                <p className="theme-text-secondary text-xs truncate">
                  High-level overview for your current location
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <Link
                to="/checkout"
                className="theme-chip rounded-full border px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition hover:border-emerald-300/60 hover:text-emerald-100"
              >
                🛒 <span className="hidden sm:inline">Go to Checkout</span>
              </Link>
              <Link
                to="/reports"
                className="theme-chip rounded-full border px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition hover:border-sky-300/60 hover:text-sky-100"
              >
                📊 <span className="hidden sm:inline">View full Reports</span>
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="mx-auto mt-4 w-full max-w-7xl flex-1 px-2 sm:px-4 lg:px-8 pb-4 sm:pb-12 overflow-y-auto">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-400/50 bg-rose-500/10 px-4 py-3 text-sm theme-text-primary">
              {error}
            </div>
          )}

          {/* Top summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="theme-surface rounded-xl border p-4">
              <p className="theme-text-secondary text-xs uppercase tracking-[0.2em] mb-1">
                Today&apos;s Revenue
              </p>
              <p className="theme-text-primary text-2xl font-bold">
                {formatCurrency(totalSalesToday)}
              </p>
              <p className="theme-text-secondary text-xs mt-1">
                {totalOrdersToday} orders · Avg {formatCurrency(avgOrderToday)}
              </p>
            </div>
            <div className="theme-surface rounded-xl border p-4">
              <p className="theme-text-secondary text-xs uppercase tracking-[0.2em] mb-1">
                Last 7 Days
              </p>
              <p className="theme-text-primary text-2xl font-bold">
                {formatCurrency(totalSalesWeek)}
              </p>
              <p className="theme-text-secondary text-xs mt-1">
                {totalOrdersWeek} orders · {growthPercent}% of this week
              </p>
            </div>
            <div className="theme-surface rounded-xl border p-4">
              <p className="theme-text-secondary text-xs uppercase tracking-[0.2em] mb-1">
                Alerts
              </p>
              <p className="theme-text-primary text-2xl font-bold">
                {alertsSummary?.totalAlerts ?? 0}
              </p>
              <p className="theme-text-secondary text-xs mt-1">
                <span className="text-rose-300 font-semibold">
                  {alertsSummary?.criticalCount ?? 0} critical
                </span>{' '}
                · <span className="text-amber-300 font-semibold">
                  {alertsSummary?.warningCount ?? 0} warning
                </span>
              </p>
            </div>
            <div className="theme-surface rounded-xl border p-4">
              <p className="theme-text-secondary text-xs uppercase tracking-[0.2em] mb-1">
                Active Cashiers
              </p>
              <p className="theme-text-primary text-2xl font-bold">
                {/* Approximated as distinct staff in last 7 days orders */}
                {/* This can be refined later via staff performance endpoint */}
                {loading ? '—' : 'Live'}
              </p>
              <p className="theme-text-secondary text-xs mt-1">
                See detailed staff metrics in Reports → Staff tab
              </p>
            </div>
          </div>

          {/* Middle: sales trend & top products */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="lg:col-span-2 theme-card rounded-xl border p-4 sm:p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="theme-text-primary text-base sm:text-lg font-semibold">
                  Sales Trend (Last 7 days)
                </h2>
              </div>
              {salesTrend.length === 0 ? (
                <p className="theme-text-secondary text-sm">No sales data yet.</p>
              ) : (
                <div className="mt-2">
                  <div className="flex items-end gap-2 sm:gap-3 h-40 sm:h-48">
                    {salesTrend.map((point) => {
                      const max = Math.max(...salesTrend.map((p) => p.sales));
                      const height = max > 0 ? (point.sales / max) * 100 : 0;
                      return (
                        <div key={point.period} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t-full bg-gradient-to-t from-sky-500/40 to-emerald-400/70"
                            style={{ height: `${Math.max(5, height)}%` }}
                          />
                          <p className="theme-text-secondary text-[10px] sm:text-xs truncate max-w-[60px]">
                            {point.period.slice(5)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="theme-card rounded-xl border p-4 sm:p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="theme-text-primary text-base sm:text-lg font-semibold">
                  Top Products (7 days)
                </h2>
              </div>
              {topSellers.length === 0 ? (
                <p className="theme-text-secondary text-sm">No sales yet.</p>
              ) : (
                <div className="space-y-3">
                  {topSellers.map((item, idx) => (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="theme-text-secondary text-xs w-5 text-center">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="theme-text-primary text-sm font-semibold truncate">
                            {item.productId.slice(0, 8)}
                          </p>
                          <p className="theme-text-secondary text-[11px]">
                            {item.quantitySold} sold
                          </p>
                        </div>
                      </div>
                      <p className="theme-text-primary text-sm font-semibold">
                        {formatCurrency(item.revenue)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom: AI-style insights placeholder */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="theme-card rounded-xl border p-4 sm:p-5 backdrop-blur-xl">
              <h2 className="theme-text-primary text-base sm:text-lg font-semibold mb-3">
                AI Insights (beta)
              </h2>
              <p className="theme-text-secondary text-sm mb-3">
                This section will surface automated recommendations based on your alerts, sales
                trends, and inventory health.
              </p>
              <ul className="space-y-2 text-sm theme-text-secondary">
                <li>• Watch products with frequent stock-out alerts in the Reports → Alerts tab.</li>
                <li>
                  • Consider promoting slow-moving items that don&apos;t appear in the Top Products
                  list.
                </li>
                <li>
                  • Use the Customers tab in Reports to target CHAMPION and AT_RISK segments with
                  offers.
                </li>
              </ul>
            </div>

            <div className="theme-card rounded-xl border p-4 sm:p-5 backdrop-blur-xl">
              <h2 className="theme-text-primary text-base sm:text-lg font-semibold mb-3">
                Quick Links
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  to="/reports"
                  className="theme-surface rounded-xl border px-3 py-3 text-sm theme-text-primary hover:border-sky-400/60 hover:bg-sky-500/10 transition"
                >
                  📊 View full analytics
                </Link>
                <Link
                  to="/reports?tab=alerts"
                  className="theme-surface rounded-xl border px-3 py-3 text-sm theme-text-primary hover:border-rose-400/60 hover:bg-rose-500/10 transition"
                >
                  🚨 Review critical alerts
                </Link>
                <Link
                  to="/reports?tab=customers"
                  className="theme-surface rounded-xl border px-3 py-3 text-sm theme-text-primary hover:border-emerald-400/60 hover:bg-emerald-500/10 transition"
                >
                  👥 Customer segments
                </Link>
                <Link
                  to="/inventory"
                  className="theme-surface rounded-xl border px-3 py-3 text-sm theme-text-primary hover:border-amber-400/60 hover:bg-amber-500/10 transition"
                >
                  📦 Manage inventory
                </Link>
              </div>
            </div>
          </div>

          {loading && (
            <div className="mt-4 text-xs theme-text-secondary">
              Loading latest metrics from the last few seconds...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


