import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ScannerDeviceList } from '../components/ScannerDeviceList';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { API_URL } from '../config';
import { BrandMark } from '../components/BrandMark';
import { ThemeToggle } from '../components/ThemeToggle';

type Tab = 'inventory' | 'sales';

interface InventoryTransaction {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string;
    barcode?: string;
  };
  delta: number;
  type: string;
  ts: string;
  user?: {
    id: string;
    name: string;
  };
  notes?: string;
}

interface InventoryStock {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string;
    barcode?: string;
    priceCents: number;
  };
  quantity: number;
  reorderPoint?: number;
  createdAt: string;
  updatedAt: string;
}

interface Sale {
  id: string;
  orderNumber: string;
  items: Array<{
    product_id: string;
    quantity: number;
    price_cents: number;
  }>;
  totalCents: number;
  status: string;
  createdAt: string;
  completedAt?: string;
  creator: {
    id: string;
    name: string;
  };
}

export function InventorySalesPage() {
  const { user, logout, accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('inventory');
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>([]);
  const [inventoryStock, setInventoryStock] = useState<InventoryStock[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustType, setAdjustType] = useState<'adjust' | 'received'>('adjust');

  const loadInventoryTransactions = async () => {
    if (!accessToken || !user?.locationId) {
      console.warn('Missing accessToken or locationId');
      return;
    }
    
    setLoading(true);
    try {
      // Ensure axios defaults are set
      if (!axios.defaults.headers.common['Authorization']) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const response = await axios.get(
        `${API_URL}/api/v1/inventory/${user.locationId}/transactions`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      setInventoryTransactions(response.data || []);
    } catch (error: any) {
      console.error('Failed to load inventory transactions:', error);
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to load inventory transactions');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSales = async () => {
    if (!accessToken || !user?.locationId) {
      console.warn('Missing accessToken or locationId');
      return;
    }
    
    setLoading(true);
    try {
      // Ensure axios defaults are set
      if (!axios.defaults.headers.common['Authorization']) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const response = await axios.get(
        `${API_URL}/api/v1/orders?location_id=${user.locationId}&status=completed`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      setSales(response.data || []);
    } catch (error: any) {
      console.error('Failed to load sales:', error);
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to load sales');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryStock = async () => {
    if (!accessToken || !user?.locationId) {
      console.warn('Missing accessToken or locationId');
      return;
    }
    
    setLoading(true);
    try {
      // Ensure axios defaults are set
      if (!axios.defaults.headers.common['Authorization']) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const response = await axios.get(
        `${API_URL}/api/v1/inventory/${user.locationId}/stock`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      setInventoryStock(response.data || []);
    } catch (error: any) {
      console.error('Failed to load inventory stock:', error);
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to load inventory stock');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.locationId && accessToken) {
      if (activeTab === 'inventory') {
        loadInventoryStock();
        loadInventoryTransactions();
      } else {
        loadSales();
      }
    } else {
      console.warn('InventorySalesPage: Missing user location or access token', {
        hasLocation: !!user?.locationId,
        hasToken: !!accessToken,
      });
    }
  }, [user?.locationId, accessToken, activeTab]);

  const handleScan = async (barcode: string) => {
    if (!accessToken) {
      toast.error('Not authenticated');
      return;
    }

    try {
      const productResponse = await axios.get(
        `${API_URL}/api/v1/products?query=${encodeURIComponent(barcode)}`,
      );

      if (productResponse.data && productResponse.data.length > 0) {
        const product = productResponse.data[0];
        setSelectedProduct(product);
        
        if (!user?.locationId) {
          toast.error('Location not set');
          return;
        }
        
        const invResponse = await axios.get(
          `${API_URL}/api/v1/inventory/${user.locationId}/stock`,
        );
        
        const invItem = invResponse.data.find((inv: any) => inv.productId === product.id);
        if (invItem) {
          setAdjustQuantity(invItem.quantity.toString());
        } else {
          setAdjustQuantity('0');
        }
      } else {
        toast.error(`Product not found: ${barcode}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to find product');
    }
  };

  const handleAdjustInventory = async () => {
    if (!selectedProduct || !adjustQuantity || !accessToken || !user?.locationId) {
      toast.error('Please select a product and enter quantity');
      return;
    }

    try {
      const invResponse = await axios.get(
        `${API_URL}/api/v1/inventory/${user.locationId}/stock`,
      );
      
      const invItem = invResponse.data.find((inv: any) => inv.productId === selectedProduct.id);
      const currentQty = invItem?.quantity || 0;
      const newQty = parseInt(adjustQuantity, 10);
      const delta = newQty - currentQty;

      if (delta === 0) {
        toast('No change needed', { icon: 'ℹ️' });
        return;
      }

      await axios.post(
        `${API_URL}/api/v1/inventory/adjust`,
        {
          productId: selectedProduct.id,
          locationId: user.locationId,
          delta,
          type: adjustType,
          userId: user.id,
          notes: `Manual adjustment via POS`,
        },
      );

      toast.success(`Inventory updated: ${selectedProduct.name} = ${newQty} units`);
      setSelectedProduct(null);
      setAdjustQuantity('');
      loadInventoryStock();
      loadInventoryTransactions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to adjust inventory');
    }
  };

  return (
    <div className="theme-background min-h-screen w-full overflow-x-hidden">
      <div className="relative mx-auto w-full max-w-7xl space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-10">
        <div className="theme-card flex flex-col gap-4 sm:gap-6 rounded-xl sm:rounded-2xl lg:rounded-3xl border p-4 sm:p-5 lg:p-6 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            <BrandMark
              size={40}
              backgroundClassName="bg-white/90 dark:bg-white/10"
              className="ring-1 ring-slate-200/40 dark:ring-white/10 flex-shrink-0 sm:w-[56px] sm:h-[56px]"
            />
            <div className="min-w-0 flex-1">
              <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-[0.35em]">Inventory Ops</p>
              <h1 className="theme-text-primary text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">Inventory & Sales</h1>
              <p className="theme-text-secondary text-xs sm:text-sm">Store: {user?.locationId || 'store-001'}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              to="/checkout"
              className="theme-chip inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition hover:border-emerald-300/60 hover:text-emerald-100"
            >
              Checkout
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

        <div className="theme-card rounded-3xl border p-4 backdrop-blur-xl">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`theme-chip inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition ${
                activeTab === 'inventory'
                  ? 'border-emerald-400/70 bg-emerald-400/30 text-emerald-50 shadow-[0_18px_45px_-25px_rgba(16,185,129,0.6)]'
                  : 'hover:border-white/30'
              }`}
            >
              <span>📦</span>
              Inventory
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`theme-chip inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition ${
                activeTab === 'sales'
                  ? 'border-sky-400/70 bg-sky-400/30 text-sky-50 shadow-[0_18px_45px_-25px_rgba(56,189,248,0.55)]'
                  : 'hover:border-white/30'
              }`}
            >
              <span>💰</span>
              Sales
            </button>
          </div>
        </div>

        {/* Scanner - Only show on Inventory tab */}
        {activeTab === 'inventory' && (
          <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
            <BarcodeScanner onScan={handleScan} />
          </div>
        )}

        {/* Adjust Inventory Form - Only show on Inventory tab */}
        {activeTab === 'inventory' && selectedProduct && (
          <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
            <h2 className="theme-text-primary text-xl font-semibold mb-4">Adjust Inventory</h2>
            <div className="space-y-4">
              <div>
                <p className="theme-text-primary font-semibold">{selectedProduct.name}</p>
                <p className="theme-text-secondary text-sm">SKU: {selectedProduct.sku}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="theme-text-secondary block text-sm font-medium mb-2">
                    Adjustment Type
                  </label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value as 'adjust' | 'received')}
                    className="w-full rounded-2xl border border-white/15 bg-transparent px-4 py-3 text-sm font-medium text-current outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/40"
                  >
                    <option value="adjust">Manual Adjustment</option>
                    <option value="received">Stock Received</option>
                  </select>
                </div>
                <div>
                  <label className="theme-text-secondary block text-sm font-medium mb-2">
                    New Quantity
                  </label>
                  <input
                    type="number"
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(e.target.value)}
                    className="w-full rounded-2xl border border-white/15 bg-transparent px-4 py-3 text-sm font-medium text-current outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/40"
                    placeholder="Enter quantity"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleAdjustInventory}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 px-6 py-2.5 text-sm font-semibold text-emerald-950 shadow-[0_20px_45px_-25px_rgba(16,185,129,0.7)] transition hover:shadow-[0_24px_55px_-22px_rgba(16,185,129,0.8)]"
                >
                  Update Inventory
                </button>
                <button
                  onClick={() => {
                    setSelectedProduct(null);
                    setAdjustQuantity('');
                  }}
                  className="theme-chip rounded-full border px-5 py-2 text-sm font-semibold hover:border-white/25"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Registered Devices */}
        {activeTab === 'inventory' && <ScannerDeviceList />}

        {/* Content */}
        {loading ? (
          <div className="theme-card rounded-3xl border p-8 text-center backdrop-blur-xl">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-400"></div>
            <p className="theme-text-secondary mt-4 text-sm">Loading...</p>
          </div>
        ) : activeTab === 'inventory' ? (
          <>
            {/* Current Inventory Stock */}
            <div className="theme-card rounded-3xl border p-0 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <h2 className="theme-text-primary text-xl font-semibold">Current Inventory</h2>
                  <button
                    onClick={() => {
                      loadInventoryStock();
                      loadInventoryTransactions();
                    }}
                    className="theme-chip rounded-full border px-4 py-2 text-xs font-semibold hover:border-sky-300/60 hover:text-sky-100"
                  >
                    Refresh
                  </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                        SKU
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                        Barcode
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                        Last Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {inventoryStock.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center theme-text-secondary">
                          No inventory items found. Products will appear here after inventory is created.
                        </td>
                      </tr>
                    ) : (
                      inventoryStock.map((item) => (
                        <tr key={item.id} className="hover:bg-white/5 transition">
                          <td className="px-6 py-4 whitespace-nowrap font-medium theme-text-primary">
                            {item.product.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap theme-text-secondary text-sm">
                            {item.product.sku}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-xs theme-text-secondary">
                            {item.product.barcode || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap theme-text-primary font-semibold">
                            ₦{(item.product.priceCents / 100).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`font-bold text-lg ${
                              item.quantity === 0 ? 'text-red-600' :
                              item.reorderPoint && item.quantity <= item.reorderPoint ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {item.quantity}
                            </span>
                            {item.reorderPoint && item.quantity <= item.reorderPoint && (
                              <span className="ml-2 text-xs text-yellow-600">(Low Stock)</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm theme-text-secondary">
                            {format(new Date(item.createdAt), 'MMM d, yyyy HH:mm:ss')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm theme-text-secondary">
                            {format(new Date(item.updatedAt), 'MMM d, yyyy HH:mm:ss')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Inventory Transactions */}
            <div className="theme-card mt-6 rounded-3xl border p-0 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <h2 className="theme-text-primary text-xl font-semibold">Inventory Transactions</h2>
                  <button
                    onClick={loadInventoryTransactions}
                    className="theme-chip rounded-full border px-4 py-2 text-xs font-semibold hover:border-sky-300/60 hover:text-sky-100"
                  >
                    Refresh
                  </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                        SKU
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                        Salesperson
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {inventoryTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center theme-text-secondary">
                          No inventory transactions found
                        </td>
                      </tr>
                    ) : (
                      inventoryTransactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-white/5 transition">
                          <td className="px-6 py-4 whitespace-nowrap text-sm theme-text-secondary">
                            {format(new Date(transaction.ts), 'MMM d, yyyy HH:mm:ss')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium theme-text-primary">
                            {transaction.product.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap theme-text-secondary text-sm">
                            {transaction.product.sku}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                                transaction.type === 'sale'
                                  ? 'border-rose-400/50 bg-rose-500/20 text-rose-100'
                                  : transaction.type === 'received'
                                  ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100'
                                  : transaction.type === 'adjust'
                                  ? 'border-sky-400/50 bg-sky-500/20 text-sky-100'
                                  : 'border-white/15 bg-white/10 text-slate-200'
                              }`}
                            >
                              {transaction.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`font-semibold ${transaction.delta < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {transaction.delta > 0 ? '+' : ''}{transaction.delta}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap theme-text-secondary text-sm">
                            {transaction.user?.name || '—'}
                          </td>
                          <td className="px-6 py-4 theme-text-secondary text-sm max-w-xs truncate">
                            {transaction.notes || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* Sales */
          <div className="theme-card rounded-3xl border p-0 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="theme-text-primary text-xl font-semibold">Sales History</h2>
              <button
                onClick={loadSales}
                className="theme-chip rounded-full border px-4 py-2 text-xs font-semibold hover:border-sky-300/60 hover:text-sky-100"
              >
                Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Order Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Salesperson
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center theme-text-secondary">
                        No sales found
                      </td>
                    </tr>
                  ) : (
                    sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-white/5 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm theme-text-secondary">
                          {format(new Date(sale.createdAt), 'MMM d, yyyy HH:mm:ss')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm font-medium theme-text-primary">
                          {sale.orderNumber}
                        </td>
                        <td className="px-6 py-4 theme-text-secondary text-sm">
                          {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold theme-text-primary">
                          ₦{(sale.totalCents / 100).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap theme-text-secondary text-sm">
                          {sale.creator?.name || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              sale.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
                                : sale.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
                                : 'bg-white/10 text-slate-200 border border-white/15'
                            }`}
                          >
                            {sale.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

