import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ScannerDeviceList } from '../components/ScannerDeviceList';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { API_URL } from '../config';

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg">
        <div className="px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Inventory & Sales</h1>
            <p className="text-sm text-green-100">Store: {user?.locationId || 'store-001'}</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/checkout"
              className="px-4 py-2 bg-green-500 hover:bg-green-400 rounded-lg transition-colors"
            >
              Checkout
            </Link>
            <button
              onClick={logout}
              className="px-4 py-2 bg-green-500 hover:bg-green-400 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'inventory'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📦 Inventory
              </button>
              <button
                onClick={() => setActiveTab('sales')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'sales'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                💰 Sales
              </button>
            </nav>
          </div>
        </div>

        {/* Scanner - Only show on Inventory tab */}
        {activeTab === 'inventory' && (
          <div className="bg-white rounded-lg shadow p-4">
            <BarcodeScanner onScan={handleScan} />
          </div>
        )}

        {/* Adjust Inventory Form - Only show on Inventory tab */}
        {activeTab === 'inventory' && selectedProduct && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Adjust Inventory</h2>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-gray-800">{selectedProduct.name}</p>
                <p className="text-sm text-gray-600">SKU: {selectedProduct.sku}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adjustment Type
                  </label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value as 'adjust' | 'received')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="adjust">Manual Adjustment</option>
                    <option value="received">Stock Received</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Quantity
                  </label>
                  <input
                    type="number"
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter quantity"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleAdjustInventory}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  Update Inventory
                </button>
                <button
                  onClick={() => {
                    setSelectedProduct(null);
                    setAdjustQuantity('');
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
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
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : activeTab === 'inventory' ? (
          <>
            {/* Current Inventory Stock */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Current Inventory</h2>
                  <button
                    onClick={() => {
                      loadInventoryStock();
                      loadInventoryTransactions();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Refresh
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {inventoryStock.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                          No inventory items found. Products will appear here after inventory is created.
                        </td>
                      </tr>
                    ) : (
                      inventoryStock.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                            {item.product.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                            {item.product.sku}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-mono text-xs">
                            {item.product.barcode || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-semibold">
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {format(new Date(item.createdAt), 'MMM d, yyyy HH:mm:ss')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
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
            <div className="bg-white rounded-lg shadow mt-6">
              <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Inventory Transactions</h2>
                  <button
                    onClick={loadInventoryTransactions}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Refresh
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salesperson</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {inventoryTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                          No inventory transactions found
                        </td>
                      </tr>
                    ) : (
                      inventoryTransactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(new Date(transaction.ts), 'MMM d, yyyy HH:mm:ss')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                            {transaction.product.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                            {transaction.product.sku}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              transaction.type === 'sale' ? 'bg-red-100 text-red-800' :
                              transaction.type === 'received' ? 'bg-green-100 text-green-800' :
                              transaction.type === 'adjust' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {transaction.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`font-semibold ${transaction.delta < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {transaction.delta > 0 ? '+' : ''}{transaction.delta}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                            {transaction.user?.name || '—'}
                          </td>
                          <td className="px-6 py-4 text-gray-600 text-sm max-w-xs truncate">
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
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Sales History</h2>
                <button
                  onClick={loadSales}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Refresh
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salesperson</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No sales found
                      </td>
                    </tr>
                  ) : (
                    sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(sale.createdAt), 'MMM d, yyyy HH:mm:ss')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 font-mono text-sm">
                          {sale.orderNumber}
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-sm">
                          {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                          ₦{(sale.totalCents / 100).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                          {sale.creator?.name || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                            sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
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

