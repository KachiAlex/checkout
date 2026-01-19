import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useAuthStore } from "../stores/authStore";
import toast from "react-hot-toast";
import { API_URL } from "../config";
import { formatCurrency } from "../utils/numberFormat";

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
  onPriceOverride?: (product: Product) => void;
  onSelectProduct?: (product: ProductWithStock) => void;
  onUpdateQuantity?: (productId: string, quantity: number) => void;
  onRemoveFromCart?: (productId: string) => void;
  onItemDiscount?: (item: {
    productId: string;
    name: string;
    priceCents: number;
    quantity: number;
  }) => void;
  cartItems?: Array<{
    productId: string;
    quantity: number;
    discountCents?: number;
  }>;
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

interface SearchFilters {
  name: string;
  sku: string;
  barcode: string;
  minPrice: string;
  maxPrice: string;
  inStockOnly: boolean;
  lowStockOnly: boolean;
}

export function ProductSearch({
  onAddToCart,
  onPriceOverride,
  onSelectProduct,
  onUpdateQuantity,
  onRemoveFromCart,
  onItemDiscount,
  cartItems = [],
  searchInputRef,
}: ProductSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithStock[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [recentlyScanned, setRecentlyScanned] = useState<ProductWithStock[]>(
    [],
  );
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    name: "",
    sku: "",
    barcode: "",
    minPrice: "",
    maxPrice: "",
    inStockOnly: false,
    lowStockOnly: false,
  });
  const { accessToken, user } = useAuthStore();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Apply filters to products
  useEffect(() => {
    // First, deduplicate products by name (keep first occurrence)
    const seenNames = new Set<string>();
    const uniqueProducts = products.filter((product) => {
      const nameLower = product.name.toLowerCase().trim();
      if (seenNames.has(nameLower)) {
        return false;
      }
      seenNames.add(nameLower);
      return true;
    });

    let filtered = [...uniqueProducts];

    // Apply text search query (searches name, SKU, and barcode)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((product) => {
        const nameMatch = product.name.toLowerCase().includes(query);
        const skuMatch = product.sku.toLowerCase().includes(query);
        const barcodeMatch = product.barcode?.toLowerCase().includes(query);
        return nameMatch || skuMatch || barcodeMatch;
      });
    }

    // Apply advanced filters
    if (filters.name) {
      const nameQuery = filters.name.toLowerCase();
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(nameQuery),
      );
    }

    if (filters.sku) {
      const skuQuery = filters.sku.toLowerCase();
      filtered = filtered.filter((p) => p.sku.toLowerCase().includes(skuQuery));
    }

    if (filters.barcode) {
      const barcodeQuery = filters.barcode.toLowerCase();
      filtered = filtered.filter((p) =>
        p.barcode?.toLowerCase().includes(barcodeQuery),
      );
    }

    if (filters.minPrice) {
      const minPrice = parseFloat(filters.minPrice) * 100; // Convert to cents
      filtered = filtered.filter((p) => p.priceCents >= minPrice);
    }

    if (filters.maxPrice) {
      const maxPrice = parseFloat(filters.maxPrice) * 100; // Convert to cents
      filtered = filtered.filter((p) => p.priceCents <= maxPrice);
    }

    if (filters.inStockOnly) {
      filtered = filtered.filter((p) => p.stock !== undefined && p.stock > 0);
    }

    if (filters.lowStockOnly) {
      filtered = filtered.filter(
        (p) => p.stock !== undefined && p.stock > 0 && p.stock < 10,
      );
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, filters]);

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
  }, [searchQuery, accessToken, loadAllProducts, searchProducts]);

  // Load stock levels for products
  const loadStockLevels = useCallback(
    async (productList: Product[]): Promise<ProductWithStock[]> => {
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
        const stockMap = new Map<string, number>(
          (stockResponse.data || []).map((item: any) => [
            item.productId,
            item.quantity,
          ]),
        );
        return productList.map((product) => ({
          ...product,
          stock: stockMap.get(product.id) as number | undefined,
        }));
      } catch (error) {
        console.warn("Failed to load stock levels:", error);
        return productList.map((p) => ({ ...p, stock: undefined }));
      }
    },
    [user?.locationId, accessToken],
  );

  const searchProducts = useCallback(
    async (query: string) => {
      if (!accessToken) {
        console.warn("No access token available");
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
        console.error("Failed to search products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    },
    [accessToken, loadStockLevels],
  );

  const loadAllProducts = useCallback(async () => {
    if (!accessToken) {
      console.warn("No access token available");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/v1/products`);
      const productList = (response.data || []).slice(0, 20);
      const productsWithStock = await loadStockLevels(productList);
      setProducts(productsWithStock);
    } catch (error) {
      console.error("Failed to load products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, loadStockLevels]);

  // Load recently scanned products from localStorage
  useEffect(() => {
    const recent = localStorage.getItem("recentlyScanned");
    if (recent) {
      try {
        const recentProducts = JSON.parse(recent) as Product[];
        loadStockLevels(recentProducts).then(setRecentlyScanned);
      } catch (error) {
        console.warn("Failed to load recently scanned:", error);
      }
    }
  }, [loadStockLevels]);

  // Save to recently scanned when product is added
  const saveToRecentlyScanned = (product: Product) => {
    const recent = localStorage.getItem("recentlyScanned");
    let recentProducts: Product[] = recent ? JSON.parse(recent) : [];

    // Remove if already exists
    recentProducts = recentProducts.filter((p) => p.id !== product.id);

    // Add to beginning
    recentProducts.unshift(product);

    // Keep only last 10
    recentProducts = recentProducts.slice(0, 10);

    localStorage.setItem("recentlyScanned", JSON.stringify(recentProducts));
    loadStockLevels(recentProducts).then(setRecentlyScanned);
  };

  const handleProductClick = async (product: ProductWithStock) => {
    // Validate product ID format (must be UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(product.id)) {
      console.error(
        `Invalid productId format: ${product.id} for product: ${product.name}`,
      );
      toast.error(
        `Invalid product ID for "${product.name}". This product needs to be recreated.`,
      );
      return;
    }

    // Check stock before opening quantity selector
    if (product.stock !== undefined && product.stock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    // Open quantity selector modal
    if (onSelectProduct) {
      onSelectProduct(product);
    } else {
      // Fallback: directly add with quantity 1
      onAddToCart({
        productId: product.id,
        name: product.name,
        priceCents: product.priceCents,
        taxRate: product.taxRate,
        quantity: 1,
      });
      saveToRecentlyScanned(product);
      toast.success(
        `Added: ${product.name}${product.stock !== undefined ? ` (${product.stock} in stock)` : ""}`,
      );
    }
  };

  const handleBarcodeInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If Enter is pressed and input looks like a barcode (numeric/alphanumeric, 4+ chars)
    if (e.key === "Enter" && searchQuery.trim().length >= 4) {
      e.preventDefault();
      // Try to find product by barcode first
      const barcodeMatch = filteredProducts.find(
        (p) => p.barcode?.toLowerCase() === searchQuery.trim().toLowerCase(),
      );

      if (barcodeMatch) {
        handleProductClick(barcodeMatch);
        setSearchQuery("");
      } else {
        // If not found, show message
        toast.error(`Product with barcode "${searchQuery.trim()}" not found`);
      }
    }
  };

  const clearFilters = () => {
    setFilters({
      name: "",
      sku: "",
      barcode: "",
      minPrice: "",
      maxPrice: "",
      inStockOnly: false,
      lowStockOnly: false,
    });
  };

  const hasActiveFilters = () => {
    return Object.values(filters).some((value) => {
      if (typeof value === "boolean") return value;
      return value.trim() !== "";
    });
  };

  const getStockStatus = (stock: number | undefined) => {
    if (stock === undefined) return null;
    if (stock === 0)
      return {
        label: "Out of Stock",
        color: "text-rose-400 bg-rose-500/15 border-rose-400/40",
      };
    if (stock < 10)
      return {
        label: `Low Stock (${stock})`,
        color: "text-amber-400 bg-amber-500/15 border-amber-400/40",
      };
    return {
      label: `In Stock (${stock})`,
      color: "text-emerald-400 bg-emerald-500/15 border-emerald-400/40",
    };
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
            onKeyDown={handleBarcodeInput}
            placeholder="Type product name, SKU, or barcode... Press Enter to add (F1 to focus)"
            className="flex-1 bg-transparent text-lg theme-text-primary placeholder:text-current/50 focus:outline-none font-medium"
            aria-label="Search products"
            aria-describedby="search-help"
            role="searchbox"
            autoComplete="off"
          />
          <span id="search-help" className="sr-only">
            Press F1 to focus this search box. Type to search for products by
            name, SKU, or barcode. Press Enter to add product.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`theme-chip rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                showFilters || hasActiveFilters()
                  ? "border-sky-400/40 bg-sky-500/15 text-sky-200"
                  : ""
              }`}
              title="Toggle advanced filters"
            >
              🔧 Filters {hasActiveFilters() && "•"}
            </button>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="theme-chip rounded-full border px-3 py-1.5 text-xs font-semibold transition"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="theme-text-primary text-lg font-semibold">
              Advanced Filters
            </h3>
            {hasActiveFilters() && (
              <button
                onClick={clearFilters}
                className="theme-chip rounded-full border border-rose-400/40 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/25"
              >
                Clear All
              </button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-1">
                Product Name
              </label>
              <input
                type="text"
                value={filters.name}
                onChange={(e) =>
                  setFilters({ ...filters, name: e.target.value })
                }
                placeholder="Filter by name..."
                className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary placeholder:text-current/50 focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-1">
                SKU
              </label>
              <input
                type="text"
                value={filters.sku}
                onChange={(e) =>
                  setFilters({ ...filters, sku: e.target.value })
                }
                placeholder="Filter by SKU..."
                className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary placeholder:text-current/50 focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-1">
                Barcode
              </label>
              <input
                type="text"
                value={filters.barcode}
                onChange={(e) =>
                  setFilters({ ...filters, barcode: e.target.value })
                }
                placeholder="Filter by barcode..."
                className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary placeholder:text-current/50 focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-1">
                Min Price (₦)
              </label>
              <input
                type="number"
                step="0.01"
                value={filters.minPrice}
                onChange={(e) =>
                  setFilters({ ...filters, minPrice: e.target.value })
                }
                placeholder="0.00"
                className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary placeholder:text-current/50 focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-1">
                Max Price (₦)
              </label>
              <input
                type="number"
                step="0.01"
                value={filters.maxPrice}
                onChange={(e) =>
                  setFilters({ ...filters, maxPrice: e.target.value })
                }
                placeholder="999999.99"
                className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary placeholder:text-current/50 focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="block text-sm font-medium theme-text-secondary">
                Stock Filters
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.inStockOnly}
                  onChange={(e) =>
                    setFilters({ ...filters, inStockOnly: e.target.checked })
                  }
                  className="rounded border-white/20 bg-transparent text-sky-400 focus:ring-sky-400"
                />
                <span className="text-sm theme-text-secondary">
                  In Stock Only
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.lowStockOnly}
                  onChange={(e) =>
                    setFilters({ ...filters, lowStockOnly: e.target.checked })
                  }
                  className="rounded border-white/20 bg-transparent text-sky-400 focus:ring-sky-400"
                />
                <span className="text-sm theme-text-secondary">
                  Low Stock Only (&lt;10)
                </span>
              </label>
            </div>
          </div>
          {filteredProducts.length !== products.length && (
            <div className="mt-4 text-sm theme-text-secondary">
              Showing {filteredProducts.length} of {products.length} products
            </div>
          )}
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        <div className="theme-card flex flex-col items-center justify-center rounded-3xl border p-12 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-700 border-t-sky-400" />
          <p className="theme-text-secondary mt-5 text-sm uppercase tracking-[0.3em]">
            Loading
          </p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="theme-card rounded-3xl border p-10 text-center">
          <p className="theme-text-primary text-lg font-semibold">
            No products found
          </p>
          <p className="theme-text-secondary mt-2 text-sm">
            Try a different keyword or scan a barcode to identify products
            instantly.
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
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      </div>
                    )}
                    <h4 className="theme-text-primary line-clamp-1 text-sm font-semibold">
                      {product.name}
                    </h4>
                    <p className="theme-text-secondary mt-1 text-xs">
                      {formatCurrency(product.priceCents)}
                    </p>
                    {getStockStatus(product.stock) && (
                      <span
                        className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${getStockStatus(product.stock)?.color}`}
                      >
                        {getStockStatus(product.stock)?.label}
                      </span>
                    )}
                    <div className="flex gap-2">
                      {onPriceOverride && (
                        <button
                          onClick={() => onPriceOverride(product)}
                          className="mt-3 flex-1 rounded-lg border border-amber-400/40 bg-amber-500/15 px-2 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/25"
                          title="Override price (requires manager PIN)"
                        >
                          Override
                        </button>
                      )}
                      <button
                        onClick={() => handleProductClick(product)}
                        className="mt-3 flex-1 rounded-lg bg-gradient-to-r from-sky-400 to-blue-500 px-3 py-2 text-xs font-semibold text-white transition hover:scale-105 active:scale-95"
                        disabled={product.stock === 0}
                      >
                        Select
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products Table */}
          <div className="theme-card rounded-3xl border overflow-hidden backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider theme-text-secondary">
                      SKU
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider theme-text-secondary">
                      Product Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider theme-text-secondary">
                      Price
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider theme-text-secondary">
                      VAT
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider theme-text-secondary">
                      Stock
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider theme-text-secondary">
                      Quantity
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider theme-text-secondary">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredProducts.map((product) => {
                    const stockStatus = getStockStatus(product.stock);
                    const cartItem = cartItems.find(
                      (item) => item.productId === product.id,
                    );
                    const quantity = cartItem?.quantity || 0;
                    const isInCart = quantity > 0;
                    const hasDiscount =
                      cartItem?.discountCents && cartItem.discountCents > 0;

                    return (
                      <tr
                        key={product.id}
                        className={`hover:bg-white/5 transition ${isInCart ? "bg-sky-500/5" : ""}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="theme-text-secondary text-sm font-mono">
                            {product.sku}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {product.images && product.images[0] && (
                              <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-slate-800">
                                <img
                                  src={product.images[0]}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    (
                                      e.target as HTMLImageElement
                                    ).style.display = "none";
                                  }}
                                />
                              </div>
                            )}
                            <span className="theme-text-primary font-medium">
                              {product.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-lg font-semibold text-sky-400">
                            {formatCurrency(product.priceCents)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="theme-chip rounded-full border px-2.5 py-1 text-xs font-medium">
                            {(product.taxRate * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {stockStatus ? (
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-semibold ${stockStatus.color}`}
                            >
                              {stockStatus.label}
                            </span>
                          ) : (
                            <span className="theme-text-secondary text-sm">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            {isInCart ? (
                              <>
                                <button
                                  onClick={() =>
                                    onUpdateQuantity &&
                                    onUpdateQuantity(
                                      product.id,
                                      Math.max(0, quantity - 1),
                                    )
                                  }
                                  className="theme-chip flex h-10 w-10 items-center justify-center rounded-full border text-lg font-semibold transition hover:border-white/30 hover:bg-white/20 touch-manipulation"
                                  aria-label="Decrease quantity"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={quantity}
                                  onChange={(e) => {
                                    const newQty =
                                      parseInt(e.target.value) || 0;
                                    if (onUpdateQuantity) {
                                      onUpdateQuantity(product.id, newQty);
                                    }
                                  }}
                                  className="w-16 text-center theme-surface rounded-lg border border-white/20 bg-transparent px-2 py-2 text-base font-semibold theme-text-primary focus:border-sky-400 focus:outline-none"
                                />
                                <button
                                  onClick={() =>
                                    onUpdateQuantity &&
                                    onUpdateQuantity(product.id, quantity + 1)
                                  }
                                  disabled={
                                    product.stock !== undefined &&
                                    quantity >= product.stock
                                  }
                                  className="theme-chip flex h-10 w-10 items-center justify-center rounded-full border text-lg font-semibold transition hover:border-white/30 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                                  aria-label="Increase quantity"
                                >
                                  +
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  onAddToCart({
                                    productId: product.id,
                                    name: product.name,
                                    priceCents: product.priceCents,
                                    taxRate: product.taxRate,
                                    quantity: 1,
                                  });
                                  saveToRecentlyScanned(product);
                                  toast.success(`Added: ${product.name}`);
                                }}
                                disabled={product.stock === 0}
                                className="rounded-lg bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/40 transition hover:shadow-slate-900/60 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                              >
                                Add
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isInCart && onItemDiscount && (
                              <button
                                onClick={() =>
                                  onItemDiscount({
                                    productId: product.id,
                                    name: product.name,
                                    priceCents: product.priceCents,
                                    quantity: quantity,
                                  })
                                }
                                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                  hasDiscount
                                    ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                                    : "border-sky-400/40 bg-sky-500/15 text-sky-200"
                                }`}
                                title="Apply discount"
                              >
                                {hasDiscount ? "✓ Discount" : "Discount"}
                              </button>
                            )}
                            {onPriceOverride && (
                              <button
                                onClick={() => onPriceOverride(product)}
                                className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/25"
                                title="Override price (requires manager PIN)"
                              >
                                Override
                              </button>
                            )}
                            {isInCart && onRemoveFromCart && (
                              <button
                                onClick={() => onRemoveFromCart(product.id)}
                                className="rounded-lg border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/25"
                                title="Remove from cart"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
