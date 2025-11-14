import { useState, useEffect, useRef } from 'react';
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
  images?: string[];
}

interface ProductWithStock extends Product {
  stock?: number;
}

interface ProductSearchProps {
  onAddToCart: (item: any) => void;
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

export function ProductSearch({ onAddToCart, searchInputRef }: ProductSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentlyScanned, setRecentlyScanned] = useState<ProductWithStock[]>([]);
  const { accessToken, user } = useAuthStore();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search - wait 300ms after user stops typing
  useEffect(() => {
    if (!accessToken) return;
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      if (searchQuery.trim()) {
        searchProducts(searchQuery);
      } else {
        // Load all products when search is empty
        loadAllProducts();
      }
    }, 300); // 300ms debounce delay

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, accessToken]);

  // Load stock levels for products
  const loadStockLevels = async (productList: Product[]): Promise<ProductWithStock[]> => {
    if (!user?.locationId || !accessToken) {
      return productList.map((p) => ({ ...p, stock: undefined }));
    }

    try {
      const stockResponse = await axios.get(
        `${API_URL}/api/v1/inventory/${user.locationId}/stock`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const stockMap = new Map(
        (stockResponse.data || []).map((item: any) => [item.productId, item.quantity]),
      );
      return productList.map((product) => ({
        ...product,
        stock: stockMap.get(product.id),
      }));
    } catch (error) {
      console.warn('Failed to load stock levels:', error);
      return productList.map((p) => ({ ...p, stock: undefined }));
    }
  };

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
      const productList = response.data || [];
      const productsWithStock = await loadStockLevels(productList);
      setProducts(productsWithStock);
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
      const productList = (response.data || []).slice(0, 20);
      const productsWithStock = await loadStockLevels(productList);
      setProducts(productsWithStock);
    } catch (error) {
      console.error('Failed to load products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Load recently scanned products from localStorage
  useEffect(() => {
    const recent = localStorage.getItem('recentlyScanned');
    if (recent) {
      try {
        const recentProducts = JSON.parse(recent) as Product[];
        loadStockLevels(recentProducts).then(setRecentlyScanned);
      } catch (error) {
        console.warn('Failed to load recently scanned:', error);
      }
    }
  }, []);

  // Save to recently scanned when product is added
  const saveToRecentlyScanned = (product: Product) => {
    const recent = localStorage.getItem('recentlyScanned');
    let recentProducts: Product[] = recent ? JSON.parse(recent) : [];
    
    // Remove if already exists
    recentProducts = recentProducts.filter((p) => p.id !== product.id);
    
    // Add to beginning
    recentProducts.unshift(product);
    
    // Keep only last 10
    recentProducts = recentProducts.slice(0, 10);
    
    localStorage.setItem('recentlyScanned', JSON.stringify(recentProducts));
    loadStockLevels(recentProducts).then(setRecentlyScanned);
  };

  const handleAddToCart = async (product: ProductWithStock) => {
    // Check stock before adding
    if (product.stock !== undefined && product.stock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    onAddToCart({
      productId: product.id,
      name: product.name,
      priceCents: product.priceCents,
      taxRate: product.taxRate,
      quantity: 1,
    });
    
    saveToRecentlyScanned(product);
    toast.success(`Added: ${product.name}${product.stock !== undefined ? ` (${product.stock} in stock)` : ''}`);
  };

  const getStockStatus = (stock: number | undefined) => {
    if (stock === undefined) return null;
    if (stock === 0) return { label: 'Out of Stock', color: 'text-rose-400 bg-rose-500/15 border-rose-400/40' };
    if (stock < 10) return { label: `Low Stock (${stock})`, color: 'text-amber-400 bg-amber-500/15 border-amber-400/40' };
    return { label: `In Stock (${stock})`, color: 'text-emerald-400 bg-emerald-500/15 border-emerald-400/40' };
  };

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="theme-card rounded-3xl border p-1.5 backdrop-blur-xl">
        <div className="theme-surface flex items-center gap-3 rounded-3xl px-4 py-3">
          <span className="theme-text-secondary text-lg">🔍</span>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, SKU, or scan a barcode... (F1 to focus)"
            className="flex-1 bg-transparent text-base theme-text-primary placeholder:text-current/50 focus:outline-none"
            aria-label="Search products"
            aria-describedby="search-help"
            role="searchbox"
          />
          <span id="search-help" className="sr-only">
            Press F1 to focus this search box. Type to search for products by name, SKU, or barcode.
          </span>
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
        <>
          {/* Recently Scanned Section */}
          {recentlyScanned.length > 0 && !searchQuery && (
            <div className="space-y-3">
              <h3 className="theme-text-primary text-sm font-semibold uppercase tracking-wider">
                Recently Scanned
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {recentlyScanned.slice(0, 4).map((product) => (
                  <div
                    key={product.id}
                    className="theme-surface group relative overflow-hidden rounded-2xl border p-4 shadow transition hover:-translate-y-1"
                  >
                    {product.images && product.images[0] && (
                      <div className="mb-3 aspect-square w-full overflow-hidden rounded-xl bg-slate-800">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <h4 className="theme-text-primary line-clamp-1 text-sm font-semibold">{product.name}</h4>
                    <p className="theme-text-secondary mt-1 text-xs">₦{(product.priceCents / 100).toFixed(2)}</p>
                    {getStockStatus(product.stock) && (
                      <span className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${getStockStatus(product.stock)?.color}`}>
                        {getStockStatus(product.stock)?.label}
                      </span>
                    )}
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="mt-3 w-full rounded-lg bg-gradient-to-r from-sky-400 to-blue-500 px-3 py-2 text-xs font-semibold text-white transition hover:scale-105 active:scale-95"
                      disabled={product.stock === 0}
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products Grid */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const stockStatus = getStockStatus(product.stock);
              return (
                <div
                  key={product.id}
                  className="theme-surface group relative overflow-hidden rounded-3xl border p-5 shadow-[0_35px_70px_-45px_rgba(15,23,42,0.6)] transition hover:-translate-y-1"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-24 translate-y-[-60%] opacity-20 blur-3xl transition-all group-hover:opacity-40">
                    <div className="mx-auto h-full w-2/3 rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-indigo-500" />
                  </div>
                  <div className="relative space-y-3">
                    {/* Product Image */}
                    {product.images && product.images[0] && (
                      <div className="aspect-square w-full overflow-hidden rounded-2xl bg-slate-800">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="theme-text-secondary flex items-center justify-between text-xs uppercase tracking-[0.25em]">
                      <span>SKU {product.sku}</span>
                      <span className="theme-chip rounded-full border px-2 py-1 text-[0.65rem] font-medium">
                        VAT {(product.taxRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    
                    <h3 className="theme-text-primary line-clamp-2 text-lg font-semibold">{product.name}</h3>
                    
                    {/* Stock Status */}
                    {stockStatus && (
                      <div className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${stockStatus.color}`}>
                        {stockStatus.label}
                      </div>
                    )}
                    
                    <p className="text-2xl font-semibold text-sky-400">
                      ₦{(product.priceCents / 100).toFixed(2)}
                    </p>
                    
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
                      className="w-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/40 transition hover:shadow-slate-900/60 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 touch-manipulation min-h-[48px]"
                      aria-label={`Add ${product.name} to cart`}
                    >
                      {product.stock === 0 ? 'Out of Stock' : 'Add to cart'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
