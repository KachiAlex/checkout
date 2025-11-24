import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';
import { BrandMark } from '../components/BrandMark';
import { ThemeToggle } from '../components/ThemeToggle';
import { format } from 'date-fns';

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
  createdAt: string;
  updatedAt: string;
  lastTransaction?: {
    timestamp: string;
    userId?: string;
    user?: {
      id: string;
      name: string;
    };
    type: string;
  };
}

export function AddInventoryPage() {
  const { user, logout, accessToken, tenant } = useAuthStore();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [effectiveLocationId, setEffectiveLocationId] = useState<string | null>(user?.locationId || null);
  
  // Inventory form state
  const [inventoryForm, setInventoryForm] = useState({
    name: '',
    description: '',
    quantity: '',
    priceCents: '',
    barcode: '',
    categoryId: '',
    categoryName: '',
    brandId: '',
    brandName: '',
  });

  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);

  // Get the effective locationId (user's locationId or first location for tenant)
  const getEffectiveLocationId = async (): Promise<string | null> => {
    if (!accessToken || !user) return null;
    
    if (user.locationId) {
      return user.locationId;
    }
    
    try {
      const response = await axios.get(
        `${API_URL}/api/v1/locations`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const locations = response.data || [];
      if (locations.length > 0) {
        return locations[0].id;
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    }
    
    return null;
  };

  const loadInventory = async () => {
    if (!accessToken || !user) return;
    
    setLoading(true);
    try {
      const locationId = await getEffectiveLocationId();
      if (!locationId) {
        setInventory([]);
        return;
      }
      
      setEffectiveLocationId(locationId);
      
      const response = await axios.get(
        `${API_URL}/api/v1/inventory/${locationId}/stock`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setInventory(response.data || []);
    } catch (error: any) {
      console.error('Failed to load inventory:', error);
      if (error.response?.status === 401) {
        toast.error('Authentication expired. Please log in again.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to load inventory');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    if (!accessToken) return;
    try {
      const response = await axios.get(`${API_URL}/api/v1/categories`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setCategories(response.data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadBrands = async () => {
    if (!accessToken) return;
    try {
      const response = await axios.get(`${API_URL}/api/v1/brands`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setBrands(response.data || []);
    } catch (error) {
      console.error('Failed to load brands:', error);
    }
  };

  const handleSubmitInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inventoryForm.name || !inventoryForm.quantity || !inventoryForm.priceCents) {
      toast.error('Please fill in required fields: Name, Quantity, and Price');
      return;
    }

    if (!accessToken || !user) {
      toast.error('Not authenticated. Please log in again.');
      return;
    }

    try {
      const quantity = parseInt(inventoryForm.quantity, 10);
      const priceCents = Math.round(parseFloat(inventoryForm.priceCents) * 100);

      if (isNaN(quantity) || quantity < 0) {
        toast.error('Invalid quantity');
        return;
      }

      if (isNaN(priceCents) || priceCents < 0) {
        toast.error('Invalid price');
        return;
      }

      const response = await axios.post(
        `${API_URL}/api/v1/inventory/create-item`,
        {
          name: inventoryForm.name,
          description: inventoryForm.description || undefined,
          quantity,
          priceCents,
          barcode: inventoryForm.barcode || undefined,
          categoryId: inventoryForm.categoryId || undefined,
          categoryName: inventoryForm.categoryName || undefined,
          brandId: inventoryForm.brandId || undefined,
          brandName: inventoryForm.brandName || undefined,
        },
        { 
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          } 
        },
      );

      if (response.status === 201 || response.status === 200) {
        toast.success(`Inventory added: ${inventoryForm.name} (${quantity} units)`);
        
        // Reset form
        setInventoryForm({
          name: '',
          description: '',
          quantity: '',
          priceCents: '',
          barcode: '',
          categoryId: '',
          categoryName: '',
          brandId: '',
          brandName: '',
        });

        // Reload inventory
        await loadInventory();
      }
    } catch (error: any) {
      console.error('Failed to add inventory:', error);
      if (error.response?.status === 401) {
        toast.error('Authentication expired. Please log in again.');
      } else if (error.response?.status === 400) {
        const message = error.response?.data?.message || 'Invalid request';
        toast.error(message);
      } else {
        toast.error(error.response?.data?.message || error.message || 'Failed to add inventory');
      }
    }
  };

  useEffect(() => {
    if (user && accessToken) {
      loadInventory();
      loadCategories();
      loadBrands();
    }
  }, [user?.id, accessToken]);

  // Auto-refresh when page comes into focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && accessToken) {
        loadInventory();
      }
    };

    const handleFocus = () => {
      if (user && accessToken) {
        loadInventory();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id, accessToken]);

  return (
    <div className="theme-background min-h-screen">
      <div className="relative mx-auto w-full max-w-7xl space-y-6 px-6 py-10">
        {/* Header */}
        <div className="theme-card flex flex-col gap-6 rounded-3xl border p-6 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <BrandMark
              size={56}
              backgroundClassName="bg-white/90 dark:bg-white/10"
              className="ring-1 ring-slate-200/40 dark:ring-white/10"
            />
            <div>
              <p className="theme-text-secondary text-xs uppercase tracking-[0.35em]">Inventory</p>
              <h1 className="theme-text-primary text-3xl font-semibold tracking-tight">Add Inventory</h1>
              <p className="theme-text-secondary text-sm">
                Store: {effectiveLocationId || user?.locationId || 'Loading...'}
                {!user?.locationId && effectiveLocationId && (
                  <span className="ml-2 text-xs text-amber-400">(Using tenant's first location)</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
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

        {/* Add Inventory Form */}
        <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
          <h2 className="theme-text-primary mb-6 text-xl font-semibold">Add New Inventory Item</h2>
          <form onSubmit={handleSubmitInventory} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="theme-text-secondary mb-2 block text-sm font-medium">
                  Product Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={inventoryForm.name}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, name: e.target.value })}
                  className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                  placeholder="Enter product name"
                  required
                />
              </div>
              <div>
                <label className="theme-text-secondary mb-2 block text-sm font-medium">
                  Quantity <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  value={inventoryForm.quantity}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, quantity: e.target.value })}
                  className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="theme-text-secondary mb-2 block text-sm font-medium">
                  Price (₦) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={inventoryForm.priceCents}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, priceCents: e.target.value })}
                  className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                  placeholder="0.00"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="theme-text-secondary mb-2 block text-sm font-medium">Barcode</label>
                <input
                  type="text"
                  value={inventoryForm.barcode}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, barcode: e.target.value })}
                  className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                  placeholder="Optional barcode"
                />
              </div>
              <div>
                <label className="theme-text-secondary mb-2 block text-sm font-medium">Category</label>
                <select
                  value={inventoryForm.categoryId}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, categoryId: e.target.value })}
                  className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="theme-text-secondary mb-2 block text-sm font-medium">Brand</label>
                <select
                  value={inventoryForm.brandId}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, brandId: e.target.value })}
                  className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                >
                  <option value="">Select brand</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="theme-text-secondary mb-2 block text-sm font-medium">Description</label>
              <textarea
                value={inventoryForm.description}
                onChange={(e) => setInventoryForm({ ...inventoryForm, description: e.target.value })}
                className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70"
              >
                Add Inventory
              </button>
              <button
                type="button"
                onClick={() => {
                  setInventoryForm({
                    name: '',
                    description: '',
                    quantity: '',
                    priceCents: '',
                    barcode: '',
                    categoryId: '',
                    categoryName: '',
                    brandId: '',
                    brandName: '',
                  });
                }}
                className="theme-chip rounded-full border px-6 py-3 text-sm font-semibold transition hover:bg-white/10"
              >
                Clear
              </button>
            </div>
          </form>
        </div>

        {/* Current Inventory Table */}
        <div className="theme-card rounded-3xl border p-0 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h2 className="theme-text-primary text-xl font-semibold">Current Inventory</h2>
            <button
              onClick={loadInventory}
              className="theme-chip rounded-full border px-4 py-2 text-xs font-semibold hover:border-sky-300/60 hover:text-sky-100"
            >
              Refresh
            </button>
          </div>
          {loading ? (
            <div className="p-8 text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-sky-400"></div>
              <p className="theme-text-secondary mt-4 text-sm">Loading inventory...</p>
            </div>
          ) : inventory.length === 0 ? (
            <div className="p-8 text-center">
              <p className="theme-text-secondary text-sm">No inventory items found. Add items using the form above.</p>
            </div>
          ) : (
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
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Updated By
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {inventory.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition">
                      <td className="px-6 py-4 whitespace-nowrap font-medium theme-text-primary">
                        {item.product.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap theme-text-secondary">{item.product.sku}</td>
                      <td className="px-6 py-4 whitespace-nowrap theme-text-secondary font-mono text-sm">
                        {item.product.barcode || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`font-bold ${item.quantity <= (item.reorderPoint || 0) ? 'text-red-600' : 'text-green-600'}`}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap theme-text-secondary text-sm">
                        {item.lastTransaction?.timestamp
                          ? format(new Date(item.lastTransaction.timestamp), 'MMM dd, yyyy HH:mm')
                          : item.updatedAt
                          ? format(new Date(item.updatedAt), 'MMM dd, yyyy HH:mm')
                          : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap theme-text-secondary text-sm">
                        {item.lastTransaction?.user?.name || item.lastTransaction?.userId || '—'}
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

