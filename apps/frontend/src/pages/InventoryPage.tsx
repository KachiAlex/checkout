import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ScannerDeviceList } from '../components/ScannerDeviceList';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';

interface InventoryItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string;
    barcode?: string;
  };
  quantity: number;
  reorderPoint?: number;
}

export function InventoryPage() {
  const { user, logout, accessToken } = useAuthStore();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustType, setAdjustType] = useState<'adjust' | 'received'>('adjust');

  const loadInventory = async () => {
    if (!accessToken || !user?.locationId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/v1/inventory/${user.locationId}/stock`,
      );
      setInventory(response.data || []);
    } catch (error) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (barcode: string) => {
    if (!accessToken) {
      toast.error('Not authenticated');
      return;
    }

    try {
      // Find product by barcode
      const productResponse = await axios.get(
        `${API_URL}/api/v1/products?query=${encodeURIComponent(barcode)}`,
      );

      if (productResponse.data && productResponse.data.length > 0) {
        const product = productResponse.data[0];
        setSelectedProduct(product);
        
        // Find inventory for this product
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
      // Find current inventory
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
      loadInventory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to adjust inventory');
    }
  };

  // Load inventory on mount
  useEffect(() => {
    if (user?.locationId && accessToken) {
      loadInventory();
    }
  }, [user?.locationId, accessToken]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg">
        <div className="px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Inventory Management</h1>
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
        {/* Scanner */}
        <div className="bg-white rounded-lg shadow p-4">
          <BarcodeScanner onScan={handleScan} />
        </div>

        {/* Registered Devices */}
        <ScannerDeviceList />

        {/* Adjust Inventory Form */}
        {selectedProduct && (
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

        {/* Inventory List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Current Inventory</h2>
              <button
                onClick={loadInventory}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading inventory...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reorder Point</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inventory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {item.product.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.product.sku}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-mono text-sm">
                        {item.product.barcode || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`font-bold ${item.quantity <= (item.reorderPoint || 0) ? 'text-red-600' : 'text-green-600'}`}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {item.reorderPoint || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
