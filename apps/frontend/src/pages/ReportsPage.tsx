import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuthStore } from '../stores/authStore';
import axios from 'axios';
import { API_URL } from '../config';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { receiptService } from '../services/receiptService';
import { ReceiptOptionsModal } from '../components/ReceiptOptionsModal';

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
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

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
  const itemsPerPage = 10;
  
  // Receipt modal state
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Memoize date range string to avoid unnecessary re-renders
  const dateRangeKey = useMemo(() => `${dateRange.from}-${dateRange.to}`, [dateRange.from, dateRange.to]);

  const loadLocations = useCallback(async () => {
    if (!accessToken) return;
    try {
      const response = await axios.get(`${API_URL}/api/v1/locations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
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
          const salesRes = await axios.get(`${API_URL}/api/v1/reports/sales?${params}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          setSalesReport(salesRes.data);
          break;

        case 'top-sellers':
          params.append('limit', '20');
          const topRes = await axios.get(`${API_URL}/api/v1/reports/top-sellers?${params}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          setTopSellers(topRes.data);
          // Also load staff performance for staff top sellers view
          if (!staffPerformance) {
            const staffRes = await axios.get(`${API_URL}/api/v1/reports/staff-performance?${params}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            setStaffPerformance(staffRes.data);
          }
          break;

        case 'analytics':
          params.append('period', 'daily');
          const analyticsRes = await axios.get(`${API_URL}/api/v1/reports/sales-analytics?${params}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          setSalesAnalytics(analyticsRes.data);
          break;

        case 'alerts':
          const alertsRes = await axios.get(`${API_URL}/api/v1/reports/alerts?${params}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          setAlerts(alertsRes.data);
          break;

        case 'fraud':
          const fraudRes = await axios.get(`${API_URL}/api/v1/reports/fraud-detection?${params}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          setFraudAlerts(fraudRes.data);
          break;

        case 'expiry':
          const expiryRes = await axios.get(`${API_URL}/api/v1/reports/expiry-analytics?${params}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          setExpiryAnalytics(expiryRes.data);
          break;

        case 'shrinkage':
          const shrinkageRes = await axios.get(`${API_URL}/api/v1/reports/shrinkage-detection?${params}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          setShrinkageAlerts(shrinkageRes.data);
          break;

        case 'staff':
          const staffRes = await axios.get(`${API_URL}/api/v1/reports/staff-performance?${params}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          setStaffPerformance(staffRes.data);
          break;

        case 'inventory':
          params.append('period', 'daily');
          const invRes = await axios.get(`${API_URL}/api/v1/reports/inventory-analytics?${params}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          setInventoryAnalytics(invRes.data);
          break;

        case 'purchase-orders':
          const poRes = await axios.get(`${API_URL}/api/v1/purchase-orders`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
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

  // Memoize tabs array
  const tabs: Array<{ id: ReportTab; label: string; icon: string }> = useMemo(() => [
    { id: 'sales', label: 'Sales Report', icon: '💰' },
    { id: 'top-sellers', label: 'Top Sellers', icon: '🏆' },
    { id: 'analytics', label: 'Sales Analytics', icon: '📊' },
    { id: 'alerts', label: 'Smart Alerts', icon: '🔔' },
    { id: 'fraud', label: 'Fraud Detection', icon: '🛡️' },
    { id: 'expiry', label: 'Expiry Analytics', icon: '⏰' },
    { id: 'shrinkage', label: 'Shrinkage Detection', icon: '📉' },
    { id: 'staff', label: 'Staff Performance', icon: '👥' },
    { id: 'inventory', label: 'Inventory Analytics', icon: '📦' },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: '📋' },
  ], []);

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
  }, [salesRows, salesPage, activeTab]);

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
              <p className="theme-text-secondary">Loading report...</p>
            </div>
          ) : (
            <>
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
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b theme-border">
                                <th className="text-left p-3 theme-text-secondary font-medium text-sm">Product</th>
                                <th className="text-right p-3 theme-text-secondary font-medium text-sm">Price</th>
                                <th className="text-right p-3 theme-text-secondary font-medium text-sm">Total Order</th>
                                <th className="text-right p-3 theme-text-secondary font-medium text-sm">Avg Order Value</th>
                                <th className="text-left p-3 theme-text-secondary font-medium text-sm">Order Number</th>
                                <th className="text-center p-3 theme-text-secondary font-medium text-sm">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginated.items.map((row, idx) => (
                                <tr key={`${row.orderId}-${row.productId}-${idx}`} className="border-b theme-border hover:bg-white/5">
                                  <td className="p-3 theme-text-primary">{row.productName}</td>
                                  <td className="p-3 theme-text-primary text-right">{formatCurrency(row.price)}</td>
                                  <td className="p-3 theme-text-primary text-right">{row.totalOrder}</td>
                                  <td className="p-3 theme-text-primary text-right">{formatCurrency(row.avgOrderValue)}</td>
                                  <td className="p-3 theme-text-primary">{row.orderNumber}</td>
                                  <td className="p-3">
                                    <div className="flex gap-2 justify-center">
                                      <button
                                        onClick={() => handleViewReceipt(row.orderId)}
                                        className="px-3 py-1 text-xs rounded-lg border theme-border hover:bg-white/10 theme-text-primary"
                                      >
                                        View
                                      </button>
                                      <button
                                        onClick={() => handlePrintReceipt(row.orderId)}
                                        className="px-3 py-1 text-xs rounded-lg border theme-border hover:bg-white/10 theme-text-primary"
                                      >
                                        Print
                                      </button>
                            </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b theme-border">
                                  <th className="text-left p-3 theme-text-secondary font-medium text-sm">Rank</th>
                                  <th className="text-left p-3 theme-text-secondary font-medium text-sm">Product</th>
                                  <th className="text-right p-3 theme-text-secondary font-medium text-sm">Quantity Sold</th>
                                  <th className="text-right p-3 theme-text-secondary font-medium text-sm">Revenue</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginated.items.map((item: any, idx: number) => (
                                  <tr key={item.productId} className="border-b theme-border hover:bg-white/5">
                                    <td className="p-3 theme-text-primary font-bold">#{(topSellersPage - 1) * itemsPerPage + idx + 1}</td>
                                    <td className="p-3 theme-text-primary">{item.productId}</td>
                                    <td className="p-3 theme-text-primary text-right">{item.quantitySold}</td>
                                    <td className="p-3 theme-text-primary text-right">{formatCurrency(item.revenue)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b theme-border">
                                  <th className="text-left p-3 theme-text-secondary font-medium text-sm">Rank</th>
                                  <th className="text-left p-3 theme-text-secondary font-medium text-sm">Staff Name</th>
                                  <th className="text-right p-3 theme-text-secondary font-medium text-sm">Total Sales</th>
                                  <th className="text-right p-3 theme-text-secondary font-medium text-sm">Orders</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginated.items.map((staff: any, idx: number) => (
                                  <tr key={staff.userId} className="border-b theme-border hover:bg-white/5">
                                    <td className="p-3 theme-text-primary font-bold">#{(topSellersPage - 1) * itemsPerPage + idx + 1}</td>
                                    <td className="p-3 theme-text-primary">{staff.userName}</td>
                                    <td className="p-3 theme-text-primary text-right">{formatCurrency(staff.totalSales)}</td>
                                    <td className="p-3 theme-text-primary text-right">{staff.orderCount}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b theme-border">
                                <th className="text-left p-3 theme-text-secondary font-medium text-sm">Period</th>
                                <th className="text-right p-3 theme-text-secondary font-medium text-sm">Sales</th>
                                <th className="text-right p-3 theme-text-secondary font-medium text-sm">Orders</th>
                                <th className="text-right p-3 theme-text-secondary font-medium text-sm">Items</th>
                                <th className="text-right p-3 theme-text-secondary font-medium text-sm">Avg Order Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginated.items.map((period: any) => (
                                <tr key={period.period} className="border-b theme-border hover:bg-white/5">
                                  <td className="p-3 theme-text-primary">{period.period}</td>
                                  <td className="p-3 theme-text-primary text-right">{formatCurrency(period.sales)}</td>
                                  <td className="p-3 theme-text-primary text-right">{period.orders}</td>
                                  <td className="p-3 theme-text-primary text-right">{period.items}</td>
                                  <td className="p-3 theme-text-primary text-right">{formatCurrency(period.averageOrderValue)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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
                  {alerts.alerts && alerts.alerts.length > 0 ? (
                    <div className="space-y-2">
                      {alerts.alerts.map((alert: any, idx: number) => (
                        <div key={idx} className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                          <p className="font-semibold mb-1">{alert.title}</p>
                          <p className="text-sm opacity-90">{alert.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
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
                  {fraudAlerts.fraudAlerts && fraudAlerts.fraudAlerts.length > 0 ? (
                    <div className="space-y-2">
                      {fraudAlerts.fraudAlerts.map((alert: any, idx: number) => (
                        <div key={idx} className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                          <p className="font-semibold mb-1">{alert.title}</p>
                          <p className="text-sm opacity-90 mb-2">{alert.message}</p>
                          <div className="text-xs opacity-75">
                            <p>Order: {alert.orderNumber}</p>
                            <p>Date: {format(new Date(alert.createdAt), 'MMM d, yyyy HH:mm')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
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
                  {expiryAnalytics.expiringSoon && expiryAnalytics.expiringSoon.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold theme-text-primary mb-4">Expiring Soon</h3>
                      <div className="space-y-2">
                        {expiryAnalytics.expiringSoon.map((item: any, idx: number) => (
                          <div key={idx} className="p-4 rounded-lg border border-yellow-500/50">
                            <p className="font-medium theme-text-primary">{item.productName}</p>
                            <p className="text-sm theme-text-secondary">Expires in {item.daysUntilExpiry} days</p>
                            <p className="text-sm theme-text-secondary">Potential Loss: {formatCurrency(item.potentialLoss)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {expiryAnalytics.expiredItems && expiryAnalytics.expiredItems.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold theme-text-primary mb-4">Expired Items</h3>
                      <div className="space-y-2">
                        {expiryAnalytics.expiredItems.map((item: any, idx: number) => (
                          <div key={idx} className="p-4 rounded-lg border border-red-500/50">
                            <p className="font-medium theme-text-primary">{item.productName}</p>
                            <p className="text-sm theme-text-secondary">Expired {item.daysExpired} days ago</p>
                            <p className="text-sm theme-text-secondary">Potential Loss: {formatCurrency(item.potentialLoss)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                  {shrinkageAlerts.shrinkageAlerts && shrinkageAlerts.shrinkageAlerts.length > 0 ? (
                    <div className="space-y-2">
                      {shrinkageAlerts.shrinkageAlerts.map((alert: any, idx: number) => (
                        <div key={idx} className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                          <p className="font-semibold mb-1">{alert.title}</p>
                          <p className="text-sm opacity-90 mb-2">{alert.message}</p>
                          <div className="text-xs opacity-75">
                            <p>Actual: {alert.actualStock} | Theoretical: {alert.theoreticalStock} | Difference: {alert.discrepancy}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
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
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b theme-border">
                                <th className="text-left p-3 theme-text-secondary font-medium text-sm">Rank</th>
                                <th className="text-left p-3 theme-text-secondary font-medium text-sm">Staff Name</th>
                                <th className="text-right p-3 theme-text-secondary font-medium text-sm">Total Sales</th>
                                <th className="text-right p-3 theme-text-secondary font-medium text-sm">Orders</th>
                                <th className="text-right p-3 theme-text-secondary font-medium text-sm">Items</th>
                                <th className="text-right p-3 theme-text-secondary font-medium text-sm">Avg Order Value</th>
                                <th className="text-right p-3 theme-text-secondary font-medium text-sm">Items/Order</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginated.items.map((staff: any, idx: number) => (
                                <tr key={staff.userId} className="border-b theme-border hover:bg-white/5">
                                  <td className="p-3 theme-text-primary font-bold">#{(staffPage - 1) * itemsPerPage + idx + 1}</td>
                                  <td className="p-3 theme-text-primary">{staff.userName}</td>
                                  <td className="p-3 theme-text-primary text-right">{formatCurrency(staff.sales?.totalSales || 0)}</td>
                                  <td className="p-3 theme-text-primary text-right">{staff.sales?.orderCount || 0}</td>
                                  <td className="p-3 theme-text-primary text-right">{staff.sales?.itemCount || 0}</td>
                                  <td className="p-3 theme-text-primary text-right">{formatCurrency(staff.sales?.averageOrderValue || 0)}</td>
                                  <td className="p-3 theme-text-primary text-right">
                                    {staff.sales?.orderCount > 0 
                                      ? ((staff.sales?.itemCount || 0) / staff.sales.orderCount).toFixed(1)
                                      : '0.0'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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
                <div className="space-y-4">
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
                  {inventoryAnalytics.data && inventoryAnalytics.data.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold theme-text-primary mb-4">Period Breakdown</h3>
                      <div className="space-y-2">
                        {inventoryAnalytics.data.map((period: any) => (
                          <div key={period.period} className="p-4 rounded-lg border theme-border">
                            <div className="flex justify-between items-center mb-2">
                              <p className="font-medium theme-text-primary">{period.period}</p>
                              <p className={`font-semibold ${period.netChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {period.netChange >= 0 ? '+' : ''}{period.netChange}
                              </p>
                            </div>
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="theme-text-secondary">Received: </span>
                                <span className="theme-text-primary">{period.received}</span>
                              </div>
                              <div>
                                <span className="theme-text-secondary">Sold: </span>
                                <span className="theme-text-primary">{period.sold}</span>
                              </div>
                              <div>
                                <span className="theme-text-secondary">Returned: </span>
                                <span className="theme-text-primary">{period.returned}</span>
                              </div>
                              <div>
                                <span className="theme-text-secondary">Adjusted: </span>
                                <span className="theme-text-primary">{period.adjusted}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b theme-border">
                                <th className="text-left p-3 theme-text-secondary font-medium text-sm">Order Number</th>
                                <th className="text-left p-3 theme-text-secondary font-medium text-sm">Supplier</th>
                                <th className="text-right p-3 theme-text-secondary font-medium text-sm">Total</th>
                                <th className="text-right p-3 theme-text-secondary font-medium text-sm">Items</th>
                                <th className="text-left p-3 theme-text-secondary font-medium text-sm">Created</th>
                                <th className="text-center p-3 theme-text-secondary font-medium text-sm">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginated.items.map((po) => (
                                <tr key={po.id} className="border-b theme-border hover:bg-white/5">
                                  <td className="p-3 theme-text-primary font-medium">{po.orderNumber}</td>
                                  <td className="p-3 theme-text-primary">{po.supplierName}</td>
                                  <td className="p-3 theme-text-primary text-right">{formatCurrencyCents(po.totalCents)}</td>
                                  <td className="p-3 theme-text-primary text-right">{po.items.length}</td>
                                  <td className="p-3 theme-text-primary">{format(new Date(po.createdAt), 'MMM d, yyyy')}</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-1 rounded-full text-xs inline-block ${
                                      po.status === 'received' ? 'bg-green-500/20 text-green-400' 
                                      : po.status === 'approved' ? 'bg-blue-500/20 text-blue-400' 
                                      : 'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                              {po.status.toUpperCase()}
                            </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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
    </div>
  );
}
