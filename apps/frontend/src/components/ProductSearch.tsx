import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';
import { API_URL } from '../config';

interface Product {
  id: string;
  sku: string;
  name: string;
  priceCents: number;
  taxRate: number;
  barcode?: string;
}

interface ProductSearchProps {
  onAddToCart: (item: any) => void;
}

export function ProductSearch({ onAddToCart }: ProductSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const { accessToken } = useAuthStore();

  useEffect(() => {
    if (!accessToken) return;
    
    if (searchQuery.trim()) {
      searchProducts(searchQuery);
    } else {
      // Load all products when search is empty
      loadAllProducts();
    }
  }, [searchQuery, accessToken]);

  const searchProducts = async (query: string) => {
    if (!accessToken) {
      console.warn('No access token available');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/v1/products?query=${encodeURIComponent(query)}`,
      );
      setProducts(response.data || []);
    } catch (error) {
      console.error('Failed to search products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAllProducts = async () => {
    if (!accessToken) {
      console.warn('No access token available');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/v1/products`);
      setProducts(response.data?.slice(0, 20) || []);
    } catch (error) {
      console.error('Failed to load products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    onAddToCart({
      productId: product.id,
      name: product.name,
      priceCents: product.priceCents,
      taxRate: product.taxRate,
      quantity: 1,
    });
    toast.success(`Added: ${product.name}`);
  };

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="theme-card rounded-3xl border p-1.5 backdrop-blur-xl">
        <div className="theme-surface flex items-center gap-3 rounded-3xl px-4 py-3">
          <span className="theme-text-secondary text-lg">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, SKU, or scan a barcode..."
            className="flex-1 bg-transparent text-base theme-text-primary placeholder:text-current/50 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="theme-chip rounded-full border px-3 py-1 text-xs font-semibold transition"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="theme-card flex flex-col items-center justify-center rounded-3xl border p-12 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-700 border-t-sky-400" />
          <p className="theme-text-secondary mt-5 text-sm uppercase tracking-[0.3em]">Loading</p>
        </div>
      ) : products.length === 0 ? (
        <div className="theme-card rounded-3xl border p-10 text-center">
          <p className="theme-text-primary text-lg font-semibold">No products found</p>
          <p className="theme-text-secondary mt-2 text-sm">
            Try a different keyword or scan a barcode to identify products instantly.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="theme-surface group relative overflow-hidden rounded-3xl border p-5 shadow-[0_35px_70px_-45px_rgba(15,23,42,0.6)] transition hover:-translate-y-1"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 translate-y-[-60%] opacity-20 blur-3xl transition-all group-hover:opacity-40">
                <div className="mx-auto h-full w-2/3 rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-indigo-500" />
              </div>
              <div className="relative space-y-3">
                <div className="theme-text-secondary flex items-center justify-between text-xs uppercase tracking-[0.25em]">
                  <span>SKU {product.sku}</span>
                  <span className="theme-chip rounded-full border px-2 py-1 text-[0.65rem] font-medium">
                    VAT {(product.taxRate * 100).toFixed(1)}%
                  </span>
                </div>
                <h3 className="theme-text-primary line-clamp-2 text-lg font-semibold">{product.name}</h3>
                <p className="text-2xl font-semibold text-sky-400">
                  ₦{(product.priceCents / 100).toFixed(2)}
                </p>
                <button
                  onClick={() => handleAddToCart(product)}
                  className="w-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/40 transition hover:shadow-slate-900/60"
                >
                  Add to cart
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
