import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuthStore } from '../stores/authStore';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import axios from 'axios';
import { API_URL } from '../config';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { receiptService } from '../services/receiptService';
import { ReceiptOptionsModal } from '../components/ReceiptOptionsModal';

// Helper to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  return format(today, 'yyyy-MM-dd');
};

// Helper to safely format dates
const safeFormatDate = (dateValue: string | Date | undefined | null, formatStr: string = 'MMM d, yyyy HH:mm'): string => {
  if (!dateValue) return 'N/A';
  try {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (isNaN(date.getTime())) return 'N/A';
    return format(date, formatStr);
  } catch (error) {
    return 'N/A';
  }
};

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierName: string;
  status: string;
  totalCents: number;
  items: Array<{
    productName: string;
    quantity: number;
    unitCostCents: number;
  }>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

type ReportTab = 'sales' | 'top-sellers' | 'analytics' | 'alerts' | 'fraud' | 'expiry' | 'shrinkage' | 'staff' | 'inventory' | 'purchase-orders';

export function ReportsPage() {
  const { accessToken, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const [loading, setLoading] = useState(false);
  const [locationId, setLocationId] = useState<string | null>(user?.locationId || null);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [dateRange, setDateRange] = useState({ from: getTodayDate(), to: getTodayDate() });

  // Report data states
  const [salesReport, setSalesReport] = useState<any>(null);
  const [topSellers, setTopSellers] = useState<any>(null);
  const [topSellersType, setTopSellersType] = useState<'product' | 'staff'>('product');
  const [salesAnalytics, setSalesAnalytics] = useState<any>(null);
  const [alerts, setAlerts] = useState<any>(null);
  const [fraudAlerts, setFraudAlerts] = useState<any>(null);
  const [expiryAnalytics, setExpiryAnalytics] = useState<any>(null);
  const [shrinkageAlerts, setShrinkageAlerts] = useState<any>(null);
  const [staffPerformance, setStaffPerformance] = useState<any>(null);
  const [inventoryAnalytics, setInventoryAnalytics] = useState<any>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  
  // Pagination states
  const [salesPage, setSalesPage] = useState(1);
  const [topSellersPage, setTopSellersPage] = useState(1);
  const [analyticsPage, setAnalyticsPage] = useState(1);
  const [staffPage, setStaffPage] = useState(1);
  const [purchaseOrdersPage, setPurchaseOrdersPage] = useState(1);
  const [alertsPage, setAlertsPage] = useState(1);
  const [fraudPage, setFraudPage] = useState(1);
  const [expiryPage, setExpiryPage] = useState(1);
  const [shrinkagePage, setShrinkagePage] = useState(1);
  const [inventoryPage, setInventoryPage] = useState(1);
  const itemsPerPage = 10;
  
  // Receipt modal state
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  
  // Detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);

  // Memoize date range string to avoid unnecessary re-renders
  const dateRangeKey = useMemo(() => `${dateRange.from}-${dateRange.to}`, [dateRange.from, dateRange.to]);

  const loadLocations = useCallback(async () => {
    if (!accessToken) return;
    try {
      // Don't explicitly set headers - let the interceptor handle apikey and Authorization
      const response = await axios.get(`${API_URL}/api/v1/locations`);
      setLocations(response.data || []);
      if (!locationId && response.data?.length > 0) {
        setLocationId(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  }, [accessToken, locationId]);

  const loadReportData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (locationId) params.append('location_id', locationId);
      if (dateRange.from) params.append('from', dateRange.from);
      if (dateRange.to) params.append('to', dateRange.to);

      switch (activeTab) {
        case 'sales':
          // Don't explicitly set headers - let the interceptor handle apikey and Authorization
          const salesRes = await axios.get(`${API_URL}/api/v1/reports/sales?${params}`);
          setSalesReport(salesRes.data);
          break;

        case 'top-sellers':
          params.append('limit', '20');
          // Don't explicitly set headers - let the interceptor handle apikey and Authorization
          const topRes = await axios.get(`${API_URL}/api/v1/reports/top-sellers?${params}`);
          setTopSellers(topRes.data);
          // Also load staff performance for staff top sellers view
          if (!staffPerformance) {
            const staffRes = await axios.get(`${API_URL}/api/v1/reports/staff-performance?${params}`);
            setStaffPerformance(staffRes.data);
          }
          break;

        case 'analytics':
          params.append('period', 'daily');
          // Don't explicitly set headers - let the interceptor handle apikey and Authorization
          const analyticsRes = await axios.get(`${API_URL}/api/v1/reports/sales-analytics?${params}`);
          setSalesAnalytics(analyticsRes.data);
          break;

        case 'alerts':
          // Don't explicitly set headers - let the interceptor handle apikey and Authorization
          const alertsRes = await axios.get(`${API_URL}/api/v1/reports/alerts?${params}`);
          setAlerts(alertsRes.data);
          break;

        case 'fraud':
          // Don't explicitly set headers - let the interceptor handle apikey and Authorization
          const fraudRes = await axios.get(`${API_URL}/api/v1/reports/fraud-detection?${params}`);
          setFraudAlerts(fraudRes.data);
          break;

        case 'expiry':
          // Don't explicitly set headers - let the interceptor handle apikey and Authorization
          const expiryRes = await axios.get(`${API_URL}/api/v1/reports/expiry-analytics?${params}`);
          setExpiryAnalytics(expiryRes.data);
          break;

        case 'shrinkage':
          // Don't explicitly set headers - let the interceptor handle apikey and Authorization
          const shrinkageRes = await axios.get(`${API_URL}/api/v1/reports/shrinkage-detection?${params}`);
          setShrinkageAlerts(shrinkageRes.data);
          break;

        case 'staff':
          // Don't explicitly set headers - let the interceptor handle apikey and Authorization
          const staffRes = await axios.get(`${API_URL}/api/v1/reports/staff-performance?${params}`);
          setStaffPerformance(staffRes.data);
          break;

        case 'inventory':
          params.append('period', 'daily');
          // Don't explicitly set headers - let the interceptor handle apikey and Authorization
          const invRes = await axios.get(`${API_URL}/api/v1/reports/inventory-analytics?${params}`);
          setInventoryAnalytics(invRes.data);
          break;

        case 'purchase-orders':
          // Don't explicitly set headers - let the interceptor handle apikey and Authorization
          const poRes = await axios.get(`${API_URL}/api/v1/purchase-orders`);
          setPurchaseOrders(poRes.data || []);
          break;
      }
    } catch (error: any) {
      console.error('Failed to load report:', error);
      if (error.response?.status !== 401) {
        toast.error(`Failed to load ${activeTab} report`);
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, activeTab, locationId, dateRange.from, dateRange.to, staffPerformance]);

  // Memoize format functions
  const formatCurrency = useCallback((amount: number) => {
    return `₦${amount.toFixed(2)}`;
  }, []);

  const formatCurrencyCents = useCallback((cents: number) => {
    return `₦${(cents / 100).toFixed(2)}`;
  }, []);

  const handleViewReceipt = useCallback((orderId: string) => {
    setSelectedOrderId(orderId);
    setReceiptModalOpen(true);
  }, []);

  const handlePrintReceipt = useCallback(async (orderId: string) => {
    try {
      const success = await receiptService.printReceiptBrowser(orderId);
      if (success) {
        toast.success('Opening print dialog...');
      } else {
        toast.error('Failed to open print dialog');
      }
    } catch (error) {
      toast.error('Failed to print receipt');
    }
  }, []);

  const handleViewDetails = useCallback((detail: any) => {
    setSelectedDetail(detail);
    setDetailModalOpen(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedDetail(null);
  }, []);

  // Memoize pagination helper
  const paginate = useCallback(<T,>(items: T[], page: number, perPage: number) => {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return {
      items: items.slice(start, end),
      totalPages: Math.ceil(items.length / perPage),
      currentPage: page,
      totalItems: items.length,
    };
  }, []);

  const getSeverityColor = useCallback((severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    }
  }, []);

  // Memoize tabs array - conditionally show industry-specific tabs
  const tabs: Array<{ id: ReportTab; label: string; icon: string }> = useMemo(() => {
    const baseTabs = [
      { id: 'sales' as ReportTab, label: 'Sales Report', icon: '💰' },
      { id: 'top-sellers' as ReportTab, label: 'Top Sellers', icon: '🏆' },
      { id: 'analytics' as ReportTab, label: 'Sales Analytics', icon: '📊' },
      { id: 'alerts' as ReportTab, label: 'Smart Alerts', icon: '🔔' },
      { id: 'fraud' as ReportTab, label: 'Fraud Detection', icon: '🛡️' },
      { id: 'shrinkage' as ReportTab, label: 'Shrinkage Detection', icon: '📉' },
      { id: 'staff' as ReportTab, label: 'Staff Performance', icon: '👥' },
      { id: 'inventory' as ReportTab, label: 'Inventory Analytics', icon: '📦' },
      { id: 'purchase-orders' as ReportTab, label: 'Purchase Orders', icon: '📋' },
    ];

    // Add industry-specific tabs based on feature flags
    if (isFeatureEnabled('expiryTracking')) {
      baseTabs.splice(5, 0, { id: 'expiry' as ReportTab, label: 'Expiry Analytics', icon: '⏰' });
    }

    return baseTabs;
  }, [isFeatureEnabled]);

  // Memoize sales rows computation
  const salesRows = useMemo(() => {
    if (!salesReport?.orders) return [];
    const rows: Array<{
      productId: string;
      productName: string;
      price: number;
      totalOrder: number;
      avgOrderValue: number;
      orderNumber: string;
      orderId: string;
    }> = [];
    
    salesReport.orders.forEach((order: any) => {
      order.items?.forEach((item: any) => {
        rows.push({
          productId: item.productId,
          productName: item.productName || item.productId,
          price: item.priceCents / 100,
          totalOrder: item.quantity,
          avgOrderValue: salesReport.averageOrderValue,
          orderNumber: order.orderNumber,
          orderId: order.id,
        });
      });
    });
    
    return rows;
  }, [salesReport]);

  // Memoize paginated sales data
  const paginatedSales = useMemo(() => {
    if (activeTab !== 'sales' || salesRows.length === 0) return null;
    return paginate(salesRows, salesPage, itemsPerPage);
  }, [salesRows, salesPage, activeTab, paginate]);

  // Load locations on mount
  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  // Reset pagination when tab or date range changes
  useEffect(() => {
    setSalesPage(1);
    setTopSellersPage(1);
    setAnalyticsPage(1);
    setStaffPage(1);
    setPurchaseOrdersPage(1);
    setAlertsPage(1);
    setFraudPage(1);
    setExpiryPage(1);
    setShrinkagePage(1);
    setInventoryPage(1);
  }, [activeTab, dateRangeKey, locationId]);

  // Load report data when dependencies change
  useEffect(() => {
    if (accessToken) {
      loadReportData();
    }
  }, [accessToken, activeTab, locationId, dateRangeKey, loadReportData]);

  return (
    <div className="min-h-screen theme-bg">
      <header className="sticky top-0 z-20 border-b theme-border backdrop-blur bg-black/30">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <h1 className="text-base sm:text-lg font-semibold theme-text-primary">
                Reports &amp; Insights
              </h1>
              <p className="text-xs sm:text-sm theme-text-secondary">
                Comprehensive business analytics and reports
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/checkout"
              className="inline-flex items-center gap-2 rounded-full border theme-border px-3 py-1.5 text-xs sm:text-sm font-medium theme-text-primary hover:bg-white/10 transition"
            >
              <span className="hidden sm:inline">Back to Checkout</span>
              <span className="sm:hidden">Checkout</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Filters */}
        <div className="theme-surface rounded-xl border theme-border p-4 mb-6 flex flex-wrap gap-4">
          {locations.length > 0 && (
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium theme-text-secondary mb-1">Location</label>
              <select
                value={locationId || ''}
                onChange={(e) => setLocationId(e.target.value || null)}
                className="w-full theme-surface rounded-lg border theme-border px-3 py-2 text-sm theme-text-primary bg-transparent"
              >
                <option value="">All Locations</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-medium theme-text-secondary mb-1">From Date</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="w-full theme-surface rounded-lg border theme-border px-3 py-2 text-sm theme-text-primary bg-transparent"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-medium theme-text-secondary mb-1">To Date</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="w-full theme-surface rounded-lg border theme-border px-3 py-2 text-sm theme-text-primary bg-transparent"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 border-b theme-border">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition border-b-2 ${
                  activeTab === tab.id
                    ? 'border-sky-400 text-sky-400'
                    : 'border-transparent theme-text-secondary hover:theme-text-primary'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Report Content */}
        <div className="theme-surface rounded-2xl border theme-border p-6 sm:p-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent mb-4" />
              <p className="theme-text-secondary">Loading report...</p>
            </div>
          ) : (
            <>
              {/* Show message if no data for current tab */}
              {activeTab === 'sales' && !salesReport && !loading && (
                <div className="text-center py-12">
                  <p className="theme-text-secondary">No sales data available. Try adjusting your filters or date range.</p>
                </div>
              )}
              {activeTab === 'top-sellers' && !topSellers && !loading && (
                <div className="text-center py-12">
                  <p className="theme-text-secondary">No top sellers data available. Try adjusting your filters or date range.</p>
                </div>
              )}
              {activeTab === 'analytics' && !salesAnalytics && !loading && (
                <div className="text-center py-12">
                  <p className="theme-text-secondary">No analytics data available. Try adjusting your filters or date range.</p>
                </div>
              )}
              {activeTab === 'alerts' && !alerts && !loading && (
                <div className="text-center py-12">
                  <p className="theme-text-secondary">No alerts data available. Try adjusting your filters or date range.</p>
                </div>
              )}
              {activeTab === 'fraud' && !fraudAlerts && !loading && (
                <div className="text-center py-12">
                  <p className="theme-text-secondary">No fraud detection data available. Try adjusting your filters or date range.</p>
                </div>
              )}
              {activeTab === 'expiry' && !expiryAnalytics && !loading && (
                <div className="text-center py-12">
                  <p className="theme-text-secondary">No expiry analytics data available. Try adjusting your filters or date range.</p>
                </div>
              )}
              {activeTab === 'shrinkage' && !shrinkageAlerts && !loading && (
                <div className="text-center py-12">
                  <p className="theme-text-secondary">No shrinkage data available. Try adjusting your filters or date range.</p>
                </div>
              )}
              {activeTab === 'staff' && !staffPerformance && !loading && (
                <div className="text-center py-12">
                  <p className="theme-text-secondary">No staff performance data available. Try adjusting your filters or date range.</p>
                </div>
              )}
              {activeTab === 'inventory' && !inventoryAnalytics && !loading && (
                <div className="text-center py-12">
                  <p className="theme-text-secondary">No inventory analytics data available. Try adjusting your filters or date range.</p>
                </div>
              )}
              {activeTab === 'purchase-orders' && purchaseOrders.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="theme-text-secondary">No purchase orders found.</p>
                </div>
              )}
              {/* Sales Report */}
              {activeTab === 'sales' && salesReport && paginatedSales && (() => {
                const paginated = paginatedSales;

                return (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="theme-surface rounded-xl border theme-border p-4">
                      <p className="text-sm theme-text-secondary mb-1">Total Sales</p>
                      <p className="text-2xl font-bold theme-text-primary">{formatCurrency(salesReport.totalSales)}</p>
                    </div>
                    <div className="theme-surface rounded-xl border theme-border p-4">
                      <p className="text-sm theme-text-secondary mb-1">Total Orders</p>
                      <p className="text-2xl font-bold theme-text-primary">{salesReport.totalOrders}</p>
                    </div>
                    <div className="theme-surface rounded-xl border theme-border p-4">
                      <p className="text-sm theme-text-secondary mb-1">Average Order Value</p>
                      <p className="text-2xl font-bold theme-text-primary">{formatCurrency(salesReport.averageOrderValue)}</p>
                    </div>
                  </div>
                    
                    {salesRows.length > 0 ? (
                    <div>
                        <div className="space-y-2">
                          {paginated.items.map((row, idx) => (
                            <div
                              key={`${row.orderId}-${row.productId}-${idx}`}
                              className="flex items-center justify-between p-4 rounded-lg border theme-border hover:bg-white/5 transition"
                            >
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="flex-shrink-0 text-2xl">📦</div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium theme-text-primary truncate">{row.productName}</p>
                                  <div className="flex flex-wrap gap-3 mt-1 text-sm theme-text-secondary">
                                    <span>Order: {row.orderNumber}</span>
                                    <span>Qty: {row.totalOrder}</span>
                                    <span>Price: {formatCurrency(row.price)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={() => handleViewDetails({ ...row, type: 'sales' })}
                                  className="p-2 rounded-lg border theme-border hover:bg-white/10 theme-text-primary transition"
                                  title="View Details"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleViewReceipt(row.orderId)}
                                  className="p-2 rounded-lg border theme-border hover:bg-white/10 theme-text-primary transition"
                                  title="View Receipt"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handlePrintReceipt(row.orderId)}
                                  className="p-2 rounded-lg border theme-border hover:bg-white/10 theme-text-primary transition"
                                  title="Print Receipt"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Pagination */}
                        {paginated.totalPages > 1 && (
                          <div className="flex items-center justify-between mt-4">
                            <p className="text-sm theme-text-secondary">
                              Showing {((salesPage - 1) * itemsPerPage) + 1} to {Math.min(salesPage * itemsPerPage, paginated.totalItems)} of {paginated.totalItems}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSalesPage(p => Math.max(1, p - 1))}
                                disabled={salesPage === 1}
                                className="px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Previous
                              </button>
                              <button
                                onClick={() => setSalesPage(p => Math.min(paginated.totalPages, p + 1))}
                                disabled={salesPage === paginated.totalPages}
                                className="px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Next
                              </button>
                      </div>
                    </div>
                  )}
                </div>
                    ) : (
                      <p className="theme-text-secondary text-center py-8">No sales data available</p>
              )}
                  </div>
                );
              })()}

              {/* Top Sellers */}
              {activeTab === 'top-sellers' && topSellers && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold theme-text-primary">Top Sellers</h3>
                    <div className="flex gap-2 border theme-border rounded-lg p-1">
                      <button
                        onClick={() => setTopSellersType('product')}
                        className={`px-4 py-2 rounded text-sm font-medium transition ${
                          topSellersType === 'product'
                            ? 'bg-sky-400 text-white'
                            : 'theme-text-secondary hover:theme-text-primary'
                        }`}
                      >
                        Product
                      </button>
                      <button
                        onClick={() => setTopSellersType('staff')}
                        className={`px-4 py-2 rounded text-sm font-medium transition ${
                          topSellersType === 'staff'
                            ? 'bg-sky-400 text-white'
                            : 'theme-text-secondary hover:theme-text-primary'
                        }`}
                      >
                        Staff
                      </button>
                            </div>
                          </div>
                  
                  {topSellersType === 'product' ? (
                    topSellers.topSellers && topSellers.topSellers.length > 0 ? (() => {
                      const paginated = paginate(topSellers.topSellers, topSellersPage, itemsPerPage);
                      return (
                        <>
                          <div className="space-y-2">
                            {paginated.items.map((item: any, idx: number) => (
                              <div
                                key={item.productId}
                                className="flex items-center justify-between p-4 rounded-lg border theme-border hover:bg-white/5 transition"
                              >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  <div className="flex-shrink-0 text-2xl font-bold theme-text-primary">
                                    #{(topSellersPage - 1) * itemsPerPage + idx + 1}
                                  </div>
                                  <div className="flex-shrink-0 text-2xl">🏆</div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium theme-text-primary truncate">{item.productId}</p>
                                    <div className="flex flex-wrap gap-3 mt-1 text-sm theme-text-secondary">
                                      <span>Qty: {item.quantitySold}</span>
                                      <span>Revenue: {formatCurrency(item.revenue)}</span>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleViewDetails({ ...item, type: 'top-seller-product' })}
                                  className="p-2 rounded-lg border theme-border hover:bg-white/10 theme-text-primary transition flex-shrink-0"
                                  title="View Details"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                          
                          {paginated.totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4">
                              <p className="text-sm theme-text-secondary">
                                Showing {((topSellersPage - 1) * itemsPerPage) + 1} to {Math.min(topSellersPage * itemsPerPage, paginated.totalItems)} of {paginated.totalItems}
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setTopSellersPage(p => Math.max(1, p - 1))}
                                  disabled={topSellersPage === 1}
                                  className="px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Previous
                                </button>
                                <button
                                  onClick={() => setTopSellersPage(p => Math.min(paginated.totalPages, p + 1))}
                                  disabled={topSellersPage === paginated.totalPages}
                                  className="px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })() : (
                    <p className="theme-text-secondary text-center py-8">No sales data available</p>
                    )
                  ) : (
                    staffPerformance && staffPerformance.staffPerformance ? (() => {
                      const staffList = staffPerformance.staffPerformance.map((staff: any) => ({
                        userId: staff.userId,
                        userName: staff.userName,
                        totalSales: staff.sales?.totalSales || 0,
                        orderCount: staff.sales?.orderCount || 0,
                      })).sort((a: any, b: any) => b.totalSales - a.totalSales);
                      
                      const paginated = paginate(staffList, topSellersPage, itemsPerPage);
                      
                      return (
                        <>
                          <div className="space-y-2">
                            {paginated.items.map((staff: any, idx: number) => (
                              <div
                                key={staff.userId}
                                className="flex items-center justify-between p-4 rounded-lg border theme-border hover:bg-white/5 transition"
                              >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  <div className="flex-shrink-0 text-2xl font-bold theme-text-primary">
                                    #{(topSellersPage - 1) * itemsPerPage + idx + 1}
                                  </div>
                                  <div className="flex-shrink-0 text-2xl">👤</div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium theme-text-primary truncate">{staff.userName}</p>
                                    <div className="flex flex-wrap gap-3 mt-1 text-sm theme-text-secondary">
                                      <span>Sales: {formatCurrency(staff.totalSales)}</span>
                                      <span>Orders: {staff.orderCount}</span>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleViewDetails({ ...staff, type: 'top-seller-staff' })}
                                  className="p-2 rounded-lg border theme-border hover:bg-white/10 theme-text-primary transition flex-shrink-0"
                                  title="View Details"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                          
                          {paginated.totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4">
                              <p className="text-sm theme-text-secondary">
                                Showing {((topSellersPage - 1) * itemsPerPage) + 1} to {Math.min(topSellersPage * itemsPerPage, paginated.totalItems)} of {paginated.totalItems}
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setTopSellersPage(p => Math.max(1, p - 1))}
                                  disabled={topSellersPage === 1}
                                  className="px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Previous
                                </button>
                                <button
                                  onClick={() => setTopSellersPage(p => Math.min(paginated.totalPages, p + 1))}
                                  disabled={topSellersPage === paginated.totalPages}
                                  className="px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })() : (
                      <p className="theme-text-secondary text-center py-8">No staff data available</p>
                    )
                  )}
                </div>
              )}

              {/* Sales Analytics */}
              {activeTab === 'analytics' && salesAnalytics && (() => {
                const paginated = paginate(salesAnalytics.data || [], analyticsPage, itemsPerPage);
                return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="theme-surface rounded-xl border theme-border p-4">
                      <p className="text-sm theme-text-secondary mb-1">Total Sales</p>
                      <p className="text-2xl font-bold theme-text-primary">{formatCurrency(salesAnalytics.totalSales)}</p>
                    </div>
                    <div className="theme-surface rounded-xl border theme-border p-4">
                      <p className="text-sm theme-text-secondary mb-1">Total Orders</p>
                      <p className="text-2xl font-bold theme-text-primary">{salesAnalytics.totalOrders}</p>
                    </div>
                    <div className="theme-surface rounded-xl border theme-border p-4">
                      <p className="text-sm theme-text-secondary mb-1">Avg Order Value</p>
                      <p className="text-2xl font-bold theme-text-primary">{formatCurrency(salesAnalytics.averageOrderValue)}</p>
                    </div>
                  </div>
                    
                    {paginated.items.length > 0 ? (
                      <>
                        <div className="space-y-2">
                          {paginated.items.map((period: any) => (
                            <div
                              key={period.period}
                              className="flex items-center justify-between p-4 rounded-lg border theme-border hover:bg-white/5 transition"
                            >
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="flex-shrink-0 text-2xl">📊</div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium theme-text-primary">{period.period}</p>
                                  <div className="flex flex-wrap gap-3 mt-1 text-sm theme-text-secondary">
                                    <span>Sales: {formatCurrency(period.sales)}</span>
                                    <span>Orders: {period.orders}</span>
                                    <span>Items: {period.items}</span>
                                    <span>Avg: {formatCurrency(period.averageOrderValue)}</span>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleViewDetails({ ...period, type: 'analytics' })}
                                className="p-2 rounded-lg border theme-border hover:bg-white/10 theme-text-primary transition flex-shrink-0"
                                title="View Details"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                        
                        {paginated.totalPages > 1 && (
                          <div className="flex items-center justify-between mt-4">
                            <p className="text-sm theme-text-secondary">
                              Showing {((analyticsPage - 1) * itemsPerPage) + 1} to {Math.min(analyticsPage * itemsPerPage, paginated.totalItems)} of {paginated.totalItems}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setAnalyticsPage(p => Math.max(1, p - 1))}
                                disabled={analyticsPage === 1}
                                className="px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Previous
                              </button>
                              <button
                                onClick={() => setAnalyticsPage(p => Math.min(paginated.totalPages, p + 1))}
                                disabled={analyticsPage === paginated.totalPages}
                                className="px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Next
                              </button>
                    </div>
                </div>
              )}
                      </>
                    ) : (
                      <p className="theme-text-secondary text-center py-8">No analytics data available</p>
                    )}
                  </div>
                );
              })()}

              {/* Smart Alerts */}
              {activeTab === 'alerts' && alerts && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="theme-surface rounded-xl border theme-border p-4">
                      <p className="text-sm theme-text-secondary mb-1">Total Alerts</p>
                      <p className="text-2xl font-bold theme-text-primary">{alerts.totalAlerts || 0}</p>
                    </div>
                    <div className="theme-surface rounded-xl border border-red-500/50 p-4">
                      <p className="text-sm text-red-400 mb-1">Critical</p>
                      <p className="text-2xl font-bold text-red-400">{alerts.criticalCount || 0}</p>
                    </div>
                    <div className="theme-surface rounded-xl border border-yellow-500/50 p-4">
                      <p className="text-sm text-yellow-400 mb-1">Warnings</p>
                      <p className="text-2xl font-bold text-yellow-400">{alerts.warningCount || 0}</p>
                    </div>
                  </div>
                  {alerts.alerts && alerts.alerts.length > 0 ? (() => {
                    const paginated = paginate(alerts.alerts, alertsPage, itemsPerPage);
                    return (
                      <>
                        <div className="space-y-2">
                          {paginated.items.map((alert: any, idx: number) => (
                            <div
                              key={idx}
                              className={`flex items-center justify-between p-4 rounded-lg border ${getSeverityColor(alert.severity)} hover:opacity-80 transition`}
                            >
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="flex-shrink-0 text-2xl">🔔</div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold mb-1">{alert.title}</p>
                                  <p className="text-sm opacity-90 truncate">{alert.message}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleViewDetails({ ...alert, type: 'alert' })}
                                className="p-2 rounded-lg border border-current/30 hover:bg-white/10 transition flex-shrink-0 ml-4"
                                title="View Details"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                        {paginated.totalPages > 1 && (
                          <div className="flex items-center justify-between mt-4">
                            <p className="text-sm theme-text-secondary">
                              Showing {((alertsPage - 1) * itemsPerPage) + 1} to {Math.min(alertsPage * itemsPerPage, paginated.totalItems)} of {paginated.totalItems}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setAlertsPage(p => Math.max(1, p - 1))}
                                disabled={alertsPage === 1}
                                className="px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Previous
                              </button>
                              <button
                                onClick={() => setAlertsPage(p => Math.min(paginated.totalPages, p + 1))}
                                disabled={alertsPage === paginated.totalPages}
                                className="px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })() : (
                    <p className="theme-text-secondary text-center py-8">No alerts at this time</p>
                  )}
                </div>
              )}

              {/* Fraud Detection */}
              {activeTab === 'fraud' && fraudAlerts && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="theme-surface rounded-xl border theme-border p-4">
                      <p className="text-sm theme-text-secondary mb-1">Total Alerts</p>
                      <p className="text-2xl font-bold theme-text-primary">{fraudAlerts.totalAlerts || 0}</p>
                    </div>
                    <div className="theme-surface rounded-xl border border-red-500/50 p-4">
                      <p className="text-sm text-red-400 mb-1">Critical</p>
                      <p className="text-2xl font-bold text-red-400">{fraudAlerts.criticalCount || 0}</p>
                    </div>
                    <div className="theme-surface rounded-xl border border-yellow-500/50 p-4">
                      <p className="text-sm text-yellow-400 mb-1">Warnings</p>
                      <p className="text-2xl font-bold text-yellow-400">{fraudAlerts.warningCount || 0}</p>
                    </div>
                  </div>
                  {fraudAlerts.fraudAlerts && fraudAlerts.fraudAlerts.length > 0 ? (() => {
                    const paginated = paginate(fraudAlerts.fraudAlerts, fraudPage, itemsPerPage);
                    return (
                      <>
                        <div className="space-y-2">
                          {paginated.items.map((alert: any, idx: number) => (
                            <div
                              key={idx}
                              className={`flex items-center justify-between p-4 rounded-lg border ${getSeverityColor(alert.severity)} hover:opacity-80 transition`}
                            >
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="flex-shrink-0 text-2xl">🛡️</div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold mb-1">{alert.title}</p>
                                  <p className="text-sm opacity-90 truncate mb-2">{alert.message}</p>
                                  <div className="text-xs opacity-75">
                                    <p>Order: {alert.orderNumber} • {safeFormatDate(alert.timestamp, 'MMM d, yyyy HH:mm')}</p>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleViewDetails({ ...alert, type: 'fraud' })}
                                className="p-2 rounded-lg border border-current/30 hover:bg-white/10 transition flex-shrink-0 ml-4"
                                title="View Details"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                        {paginated.totalPages > 1 && (
                          <div className="flex items-center justify-between mt-4">
                            <p className="text-sm theme-text-secondary">
                              Showing {((fraudPage - 1) * itemsPerPage) + 1} to {Math.min(fraudPage * itemsPerPage, paginated.totalItems)} of {paginated.totalItems}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setFraudPage(p => Math.max(1, p - 1))}
                                disabled={fraudPage === 1}
                                className="px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Previous
                              </button>
                              <button
                                onClick={() => setFraudPage(p => Math.min(paginated.totalPages, p + 1))}
                                disabled={fraudPage === paginated.totalPages}
                                className="px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })() : (
                    <p className="theme-text-secondary text-center py-8">No fraud alerts detected</p>
                  )}
                </div>
              )}

              {/* Expiry Analytics */}
              {activeTab === 'expiry' && expiryAnalytics && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="theme-surface rounded-xl border theme-border p-4">
                      <p className="text-sm theme-text-secondary mb-1">Expiring Soon</p>
                      <p className="text-2xl font-bold theme-text-primary">{expiryAnalytics.totalExpiringSoon || 0}</p>
                    </div>
                    <div className="theme-surface rounded-xl border border-red-500/50 p-4">
                      <p className="text-sm text-red-400 mb-1">Expired</p>
                      <p className="text-2xl font-bold text-red-400">{expiryAnalytics.totalExpired || 0}</p>
                    </div>
                    <div className="theme-surface rounded-xl border theme-border p-4">
                      <p className="text-sm theme-text-secondary mb-1">Loss Forecast</p>
                      <p className="text-2xl font-bold theme-text-primary">{formatCurrency(expiryAnalytics.lossForecast || 0)}</p>
                    </div>
                  </div>
                  {(() => {
                    const allExpiryItems = [
                      ...(expiryAnalytics.expiringSoon || []).map((item: any) => ({ ...item, status: 'expiring' })),
                      ...(expiryAnalytics.expiredItems || []).map((item: any) => ({ ...item, status: 'expired' })),
                    ];
                    const paginated = paginate(allExpiryItems, expiryPage, itemsPerPage);
                    
                    if (allExpiryItems.length === 0) {
                      return <p className="theme-text-secondary text-center py-8">No expiry data available</p>;
                    }
                    
                    return (
                      <>
                        <div className="space-y-2">
                          {paginated.items.map((item: any, idx: number) => (
                            <div
                              key={idx}
                              className={`flex items-center justify-between p-4 rounded-lg border ${
                                item.status === 'expired' ? 'border-red-500/50 bg-red-500/10' : 'border-yellow-500/50 bg-yellow-500/10'
                              } hover:opacity-80 transition`}
                            >
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="flex-shrink-0 text-2xl">⏰</div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium theme-text-primary">{item.productName}</p>
                                  <div className="flex flex-wrap gap-3 mt-1 text-sm theme-text-secondary">
                                    <span>
                                      {item.status === 'expired' 
                                        ? `Expired ${item.daysExpired} days ago`
                                        : `Expires in ${item.daysUntilExpiry} days`}
                                    </span>
                                    <span>Loss: {formatCurrency(item.potentialLoss)}</span>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleViewDetails({ ...item, type: 'expiry' })}
                                className="p-2 rounded-lg border theme-border hover:bg-white/10 theme-text-primary transition flex-shrink-0 ml-4"
                                title="View Details"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                        {paginated.totalPages > 1 && (
                          <div className="flex items-center justify-between mt-4">
                            <p className="text-sm theme-text-secondary">
                              Showing {((expiryPage - 1) * itemsPerPage) + 1} to {Math.min(expiryPage * itemsPerPage, paginated.totalItems)} of {paginated.totalItems}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setExpiryPage(p => Math.max(1, p - 1))}
                                disabled={expiryPage === 1}
                                className="px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Previous
                              </button>
                              <button
                                onClick={() => setExpiryPage(p => Math.min(paginated.totalPages, p + 1))}
                                disabled={expiryPage === paginated.totalPages}
                                className="px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Shrinkage Detection */}
              {activeTab === 'shrinkage' && shrinkageAlerts && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="theme-surface rounded-xl border theme-border p-4">
                      <p className="text-sm theme-text-secondary mb-1">Total Discrepancies</p>
                      <p className="text-2xl font-bold theme-text-primary">{shrinkageAlerts.totalDiscrepancies || 0}</p>
                    </div>
                    <div className="theme-surface rounded-xl border border-red-500/50 p-4">
                      <p className="text-sm text-red-400 mb-1">Critical</p>
                      <p className="text-2xl font-bold text-red-400">{shrinkageAlerts.criticalCount || 0}</p>
                    </div>
                    <div className="theme-surface rounded-xl border border-yellow-500/50 p-4">
                      <p className="text-sm text-yellow-400 mb-1">Warnings</p>
                      <p className="text-2xl font-bold text-yellow-400">{shrinkageAlerts.warningCount || 0}</p>
                    </div>
                  </div>
                  {shrinkageAlerts.shrinkageAlerts && shrinkageAlerts.shrinkageAlerts.length > 0 ? (() => {
                    const paginated = paginate(shrinkageAlerts.shrinkageAlerts, shrinkagePage, itemsPerPage);
                    return (
                      <>
                        <div className="space-y-2">
                          {paginated.items.map((alert: any, idx: number) => (
                            <div
                              key={idx}
                              className={`flex items-center justify-between p-4 rounded-lg border ${getSeverityColor(alert.severity)} hover:opacity-80 transition`}
                            >
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="flex-shrink-0 text-2xl">📉</div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold mb-1">{alert.title}</p>
                                  <p className="text-sm opacity-90 truncate mb-2">{alert.message}</p>
                                  <div className="text-xs opacity-75">
                                    <p>Actual: {alert.actualStock} | Theoretical: {alert.theoreticalStock} | Difference: {alert.discrepancy}</p>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleViewDetails({ ...alert, type: 'shrinkage' })}
                                className="p-2 rounded-lg border border-current/30 hover:bg-white/10 transition flex-shrink-0 ml-4"
                                title="View Details"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                        {paginated.totalPages > 1 && (
                          <div className="flex items-center justify-between mt-4">
                            <p className="text-sm theme-text-secondary">
                              Showing {((shrinkagePage - 1) * itemsPerPage) + 1} to {Math.min(shrinkagePage * itemsPerPage, paginated.totalItems)} of {paginated.totalItems}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setShrinkagePage(p => Math.max(1, p - 1))}
                                disabled={shrinkagePage === 1}
                                className="px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Previous
                              </button>
                              <button
                                onClick={() => setShrinkagePage(p => Math.min(paginated.totalPages, p + 1))}
                                disabled={shrinkagePage === paginated.totalPages}
                                className="px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })() : (
                    <p className="theme-text-secondary text-center py-8">{shrinkageAlerts.message || 'No discrepancies detected'}</p>
                  )}
                </div>
              )}

              {/* Staff Performance */}
              {activeTab === 'staff' && staffPerformance && (() => {
                const staffList = staffPerformance.staffPerformance || [];
                const paginated = paginate(staffList, staffPage, itemsPerPage);
                
                return (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold theme-text-primary">Staff Performance</h3>
                    
                    {paginated.items.length > 0 ? (
                      <>
                        <div className="space-y-2">
                          {paginated.items.map((staff: any, idx: number) => (
                            <div
                              key={staff.userId}
                              className="flex items-center justify-between p-4 rounded-lg border theme-border hover:bg-white/5 transition"
                            >
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="flex-shrink-0 text-2xl font-bold theme-text-primary">
                                  #{(staffPage - 1) * itemsPerPage + idx + 1}
                                </div>
                                <div className="flex-shrink-0 text-2xl">👥</div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium theme-text-primary truncate">{staff.userName}</p>
                                  <div className="flex flex-wrap gap-3 mt-1 text-sm theme-text-secondary">
                                    <span>Sales: {formatCurrency(staff.sales?.totalSales || 0)}</span>
                                    <span>Orders: {staff.sales?.orderCount || 0}</span>
                                    <span>Items: {staff.sales?.itemCount || 0}</span>
                                    <span>Avg: {formatCurrency(staff.sales?.averageOrderValue || 0)}</span>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleViewDetails({ ...staff, type: 'staff' })}
                                className="p-2 rounded-lg border theme-border hover:bg-white/10 theme-text-primary transition flex-shrink-0"
                                title="View Details"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                        
                        {paginated.totalPages > 1 && (
                          <div className="flex items-center justify-between mt-4">
                            <p className="text-sm theme-text-secondary">
                              Showing {((staffPage - 1) * itemsPerPage) + 1} to {Math.min(staffPage * itemsPerPage, paginated.totalItems)} of {paginated.totalItems}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setStaffPage(p => Math.max(1, p - 1))}
                                disabled={staffPage === 1}
                                className="px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Previous
                              </button>
                              <button
                                onClick={() => setStaffPage(p => Math.min(paginated.totalPages, p + 1))}
                                disabled={staffPage === paginated.totalPages}
                                className="px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Next
                              </button>
                          </div>
                            </div>
                        )}
                      </>
                  ) : (
                    <p className="theme-text-secondary text-center py-8">No staff performance data available</p>
                  )}
                </div>
                );
              })()}

              {/* Inventory Analytics */}
              {activeTab === 'inventory' && inventoryAnalytics && (
                <div className="space-y-6">
                  {/* Transaction Metrics */}
                  <div>
                    <h3 className="text-lg font-semibold theme-text-primary mb-4">Transaction Metrics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="theme-surface rounded-xl border theme-border p-4">
                        <p className="text-sm theme-text-secondary mb-1">Total Received</p>
                        <p className="text-2xl font-bold theme-text-primary">{inventoryAnalytics.totalReceived || 0}</p>
                      </div>
                      <div className="theme-surface rounded-xl border theme-border p-4">
                        <p className="text-sm theme-text-secondary mb-1">Total Sold</p>
                        <p className="text-2xl font-bold theme-text-primary">{inventoryAnalytics.totalSold || 0}</p>
                      </div>
                      <div className="theme-surface rounded-xl border theme-border p-4">
                        <p className="text-sm theme-text-secondary mb-1">Total Returned</p>
                        <p className="text-2xl font-bold theme-text-primary">{inventoryAnalytics.totalReturned || 0}</p>
                      </div>
                      <div className="theme-surface rounded-xl border theme-border p-4">
                        <p className="text-sm theme-text-secondary mb-1">Net Change</p>
                        <p className={`text-2xl font-bold ${(inventoryAnalytics.netChange || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {inventoryAnalytics.netChange >= 0 ? '+' : ''}{inventoryAnalytics.netChange || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Inventorized Products Metrics */}
                  {inventoryAnalytics.inventorizedProducts && (
                    <div>
                      <h3 className="text-lg font-semibold theme-text-primary mb-4">Inventorized Products</h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="theme-surface rounded-xl border theme-border p-4">
                          <p className="text-sm theme-text-secondary mb-1">Total Products</p>
                          <p className="text-2xl font-bold theme-text-primary">{inventoryAnalytics.inventorizedProducts.totalProducts || 0}</p>
                        </div>
                        <div className="theme-surface rounded-xl border theme-border p-4">
                          <p className="text-sm theme-text-secondary mb-1">Total Stock</p>
                          <p className="text-2xl font-bold theme-text-primary">{inventoryAnalytics.inventorizedProducts.totalCurrentStock || 0}</p>
                        </div>
                        <div className="theme-surface rounded-xl border theme-border p-4">
                          <p className="text-sm theme-text-secondary mb-1">Inventory Value</p>
                          <p className="text-2xl font-bold theme-text-primary">{formatCurrency(inventoryAnalytics.inventorizedProducts.totalInventoryValue || 0)}</p>
                        </div>
                        <div className="theme-surface rounded-xl border border-yellow-500/50 p-4">
                          <p className="text-sm text-yellow-400 mb-1">Low Stock Items</p>
                          <p className="text-2xl font-bold text-yellow-400">{inventoryAnalytics.inventorizedProducts.lowStockCount || 0}</p>
                        </div>
                      </div>

                      {/* Inventorized Products List */}
                      {inventoryAnalytics.inventorizedProducts.products && inventoryAnalytics.inventorizedProducts.products.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-md font-semibold theme-text-primary mb-3">Product Details</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b theme-border">
                                  <th className="text-left p-3 theme-text-secondary font-medium text-sm">Product</th>
                                  <th className="text-left p-3 theme-text-secondary font-medium text-sm">SKU</th>
                                  <th className="text-right p-3 theme-text-secondary font-medium text-sm">Quantity</th>
                                  <th className="text-right p-3 theme-text-secondary font-medium text-sm">Reorder Point</th>
                                  <th className="text-right p-3 theme-text-secondary font-medium text-sm">Cost Value</th>
                                  <th className="text-right p-3 theme-text-secondary font-medium text-sm">Sales Value</th>
                                  <th className="text-center p-3 theme-text-secondary font-medium text-sm">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {inventoryAnalytics.inventorizedProducts.products.slice(0, 20).map((product: any, idx: number) => (
                                  <tr key={`${product.productId}-${idx}`} className="border-b theme-border hover:bg-white/5">
                                    <td className="p-3 theme-text-primary">{product.productName}</td>
                                    <td className="p-3 theme-text-secondary text-sm">{product.sku}</td>
                                    <td className="p-3 theme-text-primary text-right font-semibold">{product.quantity}</td>
                                    <td className="p-3 theme-text-secondary text-right">{product.reorderPoint || '—'}</td>
                                    <td className="p-3 theme-text-primary text-right">{formatCurrency(product.inventoryValue / 100)}</td>
                                    <td className="p-3 theme-text-primary text-right">{formatCurrency(product.salesValue / 100)}</td>
                                    <td className="p-3 text-center">
                                      {product.isLowStock ? (
                                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/50">
                                          Low Stock
                                        </span>
                                      ) : (
                                        <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/50">
                                          In Stock
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {inventoryAnalytics.inventorizedProducts.products.length > 20 && (
                              <p className="text-sm theme-text-secondary mt-4 text-center">
                                Showing first 20 of {inventoryAnalytics.inventorizedProducts.products.length} products
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Period Breakdown */}
                  {inventoryAnalytics.data && inventoryAnalytics.data.length > 0 && (() => {
                    const paginated = paginate(inventoryAnalytics.data, inventoryPage, itemsPerPage);
                    return (
                      <div>
                        <h3 className="text-lg font-semibold theme-text-primary mb-4">Period Breakdown</h3>
                        <div className="space-y-2">
                          {paginated.items.map((period: any) => (
                            <div
                              key={period.period}
                              className="flex items-center justify-between p-4 rounded-lg border theme-border hover:bg-white/5 transition"
                            >
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="flex-shrink-0 text-2xl">📦</div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center mb-2">
                                    <p className="font-medium theme-text-primary">{period.period}</p>
                                    <p className={`font-semibold ${period.netChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {period.netChange >= 0 ? '+' : ''}{period.netChange}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap gap-3 text-sm theme-text-secondary">
                                    <span>Received: {period.received}</span>
                                    <span>Sold: {period.sold}</span>
                                    <span>Returned: {period.returned}</span>
                                    <span>Adjusted: {period.adjusted}</span>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleViewDetails({ ...period, type: 'inventory-period' })}
                                className="p-2 rounded-lg border theme-border hover:bg-white/10 theme-text-primary transition flex-shrink-0 ml-4"
                                title="View Details"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                        {paginated.totalPages > 1 && (
                          <div className="flex items-center justify-between mt-4">
                            <p className="text-sm theme-text-secondary">
                              Showing {((inventoryPage - 1) * itemsPerPage) + 1} to {Math.min(inventoryPage * itemsPerPage, paginated.totalItems)} of {paginated.totalItems}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setInventoryPage(p => Math.max(1, p - 1))}
                                disabled={inventoryPage === 1}
                                className="px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Previous
                              </button>
                              <button
                                onClick={() => setInventoryPage(p => Math.min(paginated.totalPages, p + 1))}
                                disabled={inventoryPage === paginated.totalPages}
                                className="px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Purchase Orders */}
              {activeTab === 'purchase-orders' && (() => {
                const paginated = paginate(purchaseOrders, purchaseOrdersPage, itemsPerPage);
                
                return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold theme-text-primary">Purchase Orders</h3>
                    <Link
                      to="/purchase-orders"
                      className="text-sm font-medium text-sky-400 hover:text-sky-300 transition"
                    >
                      Manage Purchase Orders →
                    </Link>
                  </div>
                    
                    {paginated.items.length > 0 ? (
                      <>
                        <div className="space-y-2">
                          {paginated.items.map((po) => (
                            <div
                              key={po.id}
                              className="flex items-center justify-between p-4 rounded-lg border theme-border hover:bg-white/5 transition"
                            >
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="flex-shrink-0 text-2xl">📋</div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium theme-text-primary truncate">{po.orderNumber}</p>
                                  <div className="flex flex-wrap gap-3 mt-1 text-sm theme-text-secondary">
                                    <span>Supplier: {po.supplierName}</span>
                                    <span>Total: {formatCurrencyCents(po.totalCents)}</span>
                                    <span>Items: {po.items.length}</span>
                                    <span>{safeFormatDate(po.createdAt, 'MMM d, yyyy')}</span>
                                  </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                                  po.status === 'received' ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                                  : po.status === 'approved' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' 
                                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                                }`}>
                                  {po.status.toUpperCase()}
                                </span>
                              </div>
                              <button
                                onClick={() => handleViewDetails({ ...po, type: 'purchase-order' })}
                                className="p-2 rounded-lg border theme-border hover:bg-white/10 theme-text-primary transition flex-shrink-0 ml-4"
                                title="View Details"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                        
                        {paginated.totalPages > 1 && (
                          <div className="flex items-center justify-between mt-4">
                            <p className="text-sm theme-text-secondary">
                              Showing {((purchaseOrdersPage - 1) * itemsPerPage) + 1} to {Math.min(purchaseOrdersPage * itemsPerPage, paginated.totalItems)} of {paginated.totalItems}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setPurchaseOrdersPage(p => Math.max(1, p - 1))}
                                disabled={purchaseOrdersPage === 1}
                                className="px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Previous
                              </button>
                              <button
                                onClick={() => setPurchaseOrdersPage(p => Math.min(paginated.totalPages, p + 1))}
                                disabled={purchaseOrdersPage === paginated.totalPages}
                                className="px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Next
                              </button>
                        </div>
                    </div>
                        )}
                      </>
                  ) : (
                    <p className="theme-text-secondary text-center py-8">No purchase orders found</p>
                  )}
                </div>
                );
              })()}
            </>
          )}
        </div>
      </main>
      
      {/* Receipt Options Modal */}
      {selectedOrderId && (
        <ReceiptOptionsModal
          isOpen={receiptModalOpen}
          orderId={selectedOrderId}
          onClose={() => {
            setReceiptModalOpen(false);
            setSelectedOrderId(null);
          }}
        />
      )}

      {/* Detail Modal */}
      {detailModalOpen && selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="theme-surface rounded-2xl border theme-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 theme-surface border-b theme-border p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold theme-text-primary">Details</h3>
              <button
                onClick={handleCloseDetail}
                className="p-2 rounded-lg hover:bg-white/10 theme-text-primary transition"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {selectedDetail.type === 'sales' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Product Name</p>
                      <p className="font-medium theme-text-primary">{selectedDetail.productName}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Order Number</p>
                      <p className="font-medium theme-text-primary">{selectedDetail.orderNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Price</p>
                      <p className="font-medium theme-text-primary">{formatCurrency(selectedDetail.price)}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Quantity</p>
                      <p className="font-medium theme-text-primary">{selectedDetail.totalOrder}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Average Order Value</p>
                      <p className="font-medium theme-text-primary">{formatCurrency(selectedDetail.avgOrderValue)}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Product ID</p>
                      <p className="font-mono text-xs theme-text-secondary">{selectedDetail.productId}</p>
                    </div>
                  </div>
                </>
              )}
              {selectedDetail.type === 'top-seller-product' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Product ID</p>
                      <p className="font-mono text-xs theme-text-primary">{selectedDetail.productId}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Quantity Sold</p>
                      <p className="font-medium theme-text-primary">{selectedDetail.quantitySold}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Revenue</p>
                      <p className="font-medium theme-text-primary">{formatCurrency(selectedDetail.revenue)}</p>
                    </div>
                  </div>
                </>
              )}
              {selectedDetail.type === 'top-seller-staff' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Staff Name</p>
                      <p className="font-medium theme-text-primary">{selectedDetail.userName}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">User ID</p>
                      <p className="font-mono text-xs theme-text-secondary">{selectedDetail.userId}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Total Sales</p>
                      <p className="font-medium theme-text-primary">{formatCurrency(selectedDetail.totalSales)}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Order Count</p>
                      <p className="font-medium theme-text-primary">{selectedDetail.orderCount}</p>
                    </div>
                  </div>
                </>
              )}
              {selectedDetail.type === 'alert' && (
                <>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Title</p>
                      <p className="font-medium theme-text-primary">{selectedDetail.title}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Message</p>
                      <p className="theme-text-primary">{selectedDetail.message}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Severity</p>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(selectedDetail.severity)}`}>
                        {selectedDetail.severity.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </>
              )}
              {selectedDetail.type === 'fraud' && (
                <>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Title</p>
                      <p className="font-medium theme-text-primary">{selectedDetail.title}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Message</p>
                      <p className="theme-text-primary">{selectedDetail.message}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm theme-text-secondary mb-1">Order Number</p>
                        <p className="font-medium theme-text-primary">{selectedDetail.orderNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm theme-text-secondary mb-1">Date</p>
                        <p className="font-medium theme-text-primary">{safeFormatDate(selectedDetail.createdAt || selectedDetail.timestamp, 'MMM d, yyyy HH:mm')}</p>
                      </div>
                      <div>
                        <p className="text-sm theme-text-secondary mb-1">Severity</p>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(selectedDetail.severity)}`}>
                          {selectedDetail.severity.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {selectedDetail.type === 'expiry' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Product Name</p>
                      <p className="font-medium theme-text-primary">{selectedDetail.productName}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Status</p>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        selectedDetail.status === 'expired' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                      }`}>
                        {selectedDetail.status === 'expired' ? 'EXPIRED' : 'EXPIRING SOON'}
                      </span>
                    </div>
                    {selectedDetail.status === 'expired' ? (
                      <div>
                        <p className="text-sm theme-text-secondary mb-1">Days Expired</p>
                        <p className="font-medium theme-text-primary">{selectedDetail.daysExpired} days ago</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm theme-text-secondary mb-1">Days Until Expiry</p>
                        <p className="font-medium theme-text-primary">{selectedDetail.daysUntilExpiry} days</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Potential Loss</p>
                      <p className="font-medium theme-text-primary">{formatCurrency(selectedDetail.potentialLoss)}</p>
                    </div>
                  </div>
                </>
              )}
              {selectedDetail.type === 'shrinkage' && (
                <>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Title</p>
                      <p className="font-medium theme-text-primary">{selectedDetail.title}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Message</p>
                      <p className="theme-text-primary">{selectedDetail.message}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm theme-text-secondary mb-1">Actual Stock</p>
                        <p className="font-medium theme-text-primary">{selectedDetail.actualStock}</p>
                      </div>
                      <div>
                        <p className="text-sm theme-text-secondary mb-1">Theoretical Stock</p>
                        <p className="font-medium theme-text-primary">{selectedDetail.theoreticalStock}</p>
                      </div>
                      <div>
                        <p className="text-sm theme-text-secondary mb-1">Difference</p>
                        <p className="font-medium theme-text-primary">{selectedDetail.discrepancy}</p>
                      </div>
                      <div>
                        <p className="text-sm theme-text-secondary mb-1">Severity</p>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(selectedDetail.severity)}`}>
                          {selectedDetail.severity.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {selectedDetail.type === 'staff' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Staff Name</p>
                      <p className="font-medium theme-text-primary">{selectedDetail.userName}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">User ID</p>
                      <p className="font-mono text-xs theme-text-secondary">{selectedDetail.userId}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Total Sales</p>
                      <p className="font-medium theme-text-primary">{formatCurrency(selectedDetail.sales?.totalSales || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Order Count</p>
                      <p className="font-medium theme-text-primary">{selectedDetail.sales?.orderCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Item Count</p>
                      <p className="font-medium theme-text-primary">{selectedDetail.sales?.itemCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Average Order Value</p>
                      <p className="font-medium theme-text-primary">{formatCurrency(selectedDetail.sales?.averageOrderValue || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Items per Order</p>
                      <p className="font-medium theme-text-primary">
                        {selectedDetail.sales?.orderCount > 0 
                          ? ((selectedDetail.sales?.itemCount || 0) / selectedDetail.sales.orderCount).toFixed(1)
                          : '0.0'}
                      </p>
                    </div>
                  </div>
                </>
              )}
              {selectedDetail.type === 'analytics' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Period</p>
                      <p className="font-medium theme-text-primary">{selectedDetail.period}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Sales</p>
                      <p className="font-medium theme-text-primary">{formatCurrency(selectedDetail.sales)}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Orders</p>
                      <p className="font-medium theme-text-primary">{selectedDetail.orders}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Items</p>
                      <p className="font-medium theme-text-primary">{selectedDetail.items}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Average Order Value</p>
                      <p className="font-medium theme-text-primary">{formatCurrency(selectedDetail.averageOrderValue)}</p>
                    </div>
                  </div>
                </>
              )}
              {selectedDetail.type === 'inventory-period' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Period</p>
                      <p className="font-medium theme-text-primary">{selectedDetail.period}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Net Change</p>
                      <p className={`font-medium ${selectedDetail.netChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {selectedDetail.netChange >= 0 ? '+' : ''}{selectedDetail.netChange}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Received</p>
                      <p className="font-medium theme-text-primary">{selectedDetail.received}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Sold</p>
                      <p className="font-medium theme-text-primary">{selectedDetail.sold}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Returned</p>
                      <p className="font-medium theme-text-primary">{selectedDetail.returned}</p>
                    </div>
                    <div>
                      <p className="text-sm theme-text-secondary mb-1">Adjusted</p>
                      <p className="font-medium theme-text-primary">{selectedDetail.adjusted}</p>
                    </div>
                  </div>
                </>
              )}
              {selectedDetail.type === 'purchase-order' && (
                <>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm theme-text-secondary mb-1">Order Number</p>
                        <p className="font-medium theme-text-primary">{selectedDetail.orderNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm theme-text-secondary mb-1">Status</p>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          selectedDetail.status === 'received' ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                          : selectedDetail.status === 'approved' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' 
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                        }`}>
                          {selectedDetail.status.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm theme-text-secondary mb-1">Supplier</p>
                        <p className="font-medium theme-text-primary">{selectedDetail.supplierName}</p>
                      </div>
                      <div>
                        <p className="text-sm theme-text-secondary mb-1">Total</p>
                        <p className="font-medium theme-text-primary">{formatCurrencyCents(selectedDetail.totalCents)}</p>
                      </div>
                      <div>
                        <p className="text-sm theme-text-secondary mb-1">Items Count</p>
                        <p className="font-medium theme-text-primary">{selectedDetail.items.length}</p>
                      </div>
                      <div>
                        <p className="text-sm theme-text-secondary mb-1">Created</p>
                        <p className="font-medium theme-text-primary">{safeFormatDate(selectedDetail.createdAt || selectedDetail.timestamp, 'MMM d, yyyy HH:mm')}</p>
                      </div>
                    </div>
                    {selectedDetail.items && selectedDetail.items.length > 0 && (
                      <div>
                        <p className="text-sm theme-text-secondary mb-2">Items</p>
                        <div className="space-y-2">
                          {selectedDetail.items.map((item: any, idx: number) => (
                            <div key={idx} className="p-3 rounded-lg border theme-border">
                              <p className="font-medium theme-text-primary">{item.productName}</p>
                              <div className="flex gap-4 mt-1 text-sm theme-text-secondary">
                                <span>Qty: {item.quantity}</span>
                                <span>Unit Cost: {formatCurrencyCents(item.unitCostCents)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
