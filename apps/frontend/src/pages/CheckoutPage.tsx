import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useCartStore, CartItem } from '../stores/cartStore';
import { PaymentModal } from '../components/PaymentModal';
import { ReceiptOptionsModal } from '../components/ReceiptOptionsModal';
import { QuantitySelectorModal } from '../components/QuantitySelectorModal';
import { ThemeToggle } from '../components/ThemeToggle';
import { BrandMark } from '../components/BrandMark';
import { ScannerInput } from '../components/ScannerInput';
import { useThemeStore } from '../stores/themeStore';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link, Navigate } from 'react-router-dom';
import { API_URL } from '../config';
import { generateUUID } from '../utils/uuid';
import { receiptService } from '../services/receiptService';
import { formatCurrency, formatNumber } from '../utils/numberFormat';

interface Product {
  id: string;
  sku: string;
  name: string;
  priceCents: number;
  taxRate: number;
  barcode?: string;
  images?: string[];
}

export function CheckoutPage() {
  const { user, logout, accessToken, tenant } = useAuthStore((state) => ({
    user: state.user,
    logout: state.logout,
    accessToken: state.accessToken,
    tenant: state.tenant,
  }));
  const isPlatformAdmin = Boolean(user?.isPlatformAdmin);

  if (isPlatformAdmin) {
    return <Navigate to="/superadmin" replace />;
  }

  const {
    cart,
    clearCart,
    addItem,
    removeItem,
    updateQuantity,
    getTotal,
    sessions,
    activeSessionId,
    createSession,
    switchSession,
    closeSession,
    cartDiscountCents,
    cartDiscountPercent,
    discountReason,
    taxEnabled,
    setTaxEnabled,
    setCartDiscount,
  } = useCartStore();

  const total = getTotal();
  const [isProcessing, setIsProcessing] = useState(false);
  const theme = useThemeStore((state) => state.theme);
  const isAdmin = user?.role === 'admin';
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'cash' | 'qr' | 'transfer' | null>(null);
  const [lastCompletedOrderId, setLastCompletedOrderId] = useState<string | null>(null);
  const [receiptOptionsOpen, setReceiptOptionsOpen] = useState(false);
  const [cashChange, setCashChange] = useState<number>(0);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; phone?: string } | null>(null);
  const [taxSettings, setTaxSettings] = useState<{ description?: string; percentage?: number; enabled: boolean } | null>(null);
  const [discountInput, setDiscountInput] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('amount');

  // Product search state
  const [searchQuery, setSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasLoadedProducts, setHasLoadedProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; sku: string; name: string; priceCents: number; taxRate: number; stock?: number; images?: string[] } | null>(null);
  const [quantitySelectorOpen, setQuantitySelectorOpen] = useState(false);

  // Load all products once, then filter on the client as the cashier types
  const loadAllProducts = useCallback(async () => {
    if (!accessToken || hasLoadedProducts || isSearching) return;

    setIsSearching(true);
    try {
      const response = await axios.get(`${API_URL}/api/v1/products`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const products: Product[] = response.data || [];
      setAllProducts(products);
      setSearchResults(products.slice(0, 50));
      setShowResults(true);
      setHasLoadedProducts(true);
    } catch (error) {
      console.error('Failed to load products for search:', error);
      toast.error('Failed to load products for search');
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setIsSearching(false);
    }
  }, [accessToken, hasLoadedProducts, isSearching]);

  // Filter products locally as the cashier types
  useEffect(() => {
    if (!searchQuery.trim()) {
      if (allProducts.length > 0) {
        setSearchResults(allProducts.slice(0, 50));
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
      return;
    }

    const q = searchQuery.trim().toLowerCase();
    const filtered = allProducts
      .filter((p) => {
        const name = p.name?.toLowerCase() || '';
        const sku = p.sku?.toLowerCase() || '';
        const barcode = p.barcode?.toLowerCase() || '';
        return (
          name.includes(q) ||
          sku.includes(q) ||
          barcode.includes(q)
        );
      })
      .slice(0, 50);

    setSearchResults(filtered);
    setShowResults(true);
  }, [searchQuery, allProducts]);

  // Fetch tax settings (all users need this to see if tax can be applied)
  useEffect(() => {
    const loadTaxSettings = async () => {
      if (!accessToken) return;
      try {
        // Try to get tax settings - if user is not admin, they'll get 403 but that's okay
        const response = await axios.get(`${API_URL}/api/v1/tax-settings`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setTaxSettings(response.data);
      } catch (error: any) {
        // Tax settings might not exist yet, or user might not have permission - that's okay
        if (error.response?.status !== 404 && error.response?.status !== 403) {
          console.error('Failed to load tax settings:', error);
        }
      }
    };
    loadTaxSettings();
  }, [accessToken]);

  // Handle barcode scan
  const handleBarcodeScan = async (barcode: string) => {
    if (!barcode.trim() || !accessToken) return;

    try {
      // Search for product by barcode
      const response = await axios.get(
        `${API_URL}/api/v1/products?query=${encodeURIComponent(barcode)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      const products = response.data || [];
      // Try to find exact barcode match first
      const product = products.find((p: Product) => p.barcode === barcode) || products[0];
      
      if (product) {
        await handleProductSelect(product);
      } else {
        toast.error(`Product not found for barcode: ${barcode}`);
      }
    } catch (error: any) {
      console.error('Barcode scan failed:', error);
      toast.error('Failed to search product by barcode');
    }
  };

  // Handle product selection
  const handleProductSelect = async (product: Product) => {
    if (!user?.locationId) {
      toast.error('Location not set');
      return;
    }

    try {
      // Get stock level and pricing from inventory
      const stockResponse = await axios.get(
        `${API_URL}/api/v1/inventory/${user.locationId}/stock`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const inventory = stockResponse.data.find((inv: any) => inv.productId === product.id);
      const stock = inventory?.quantity || 0;

      if (stock === 0) {
        toast.error(`${product.name} is out of stock`);
        return;
      }

      // Use sales price from inventory if available, otherwise fall back to product price
      const salesPriceCents = inventory?.salesPriceCents ?? product.priceCents;

      setSelectedProduct({
        id: product.id,
        sku: product.sku || '',
        name: product.name,
        priceCents: salesPriceCents,
        taxRate: product.taxRate,
        stock,
        images: product.images,
      });
      setQuantitySelectorOpen(true);
      setSearchQuery('');
      setShowResults(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to check stock');
    }
  };

  const handleQuantityConfirm = (product: { id: string; sku: string; name: string; priceCents: number; taxRate: number; stock?: number; images?: string[] }, quantity: number) => {
    addItem({
      productId: product.id,
      name: product.name,
      priceCents: product.priceCents,
      taxRate: product.taxRate,
      quantity,
    });
    toast.success(`Added ${quantity} ${product.name}${quantity > 1 ? 's' : ''} to cart`);
    setQuantitySelectorOpen(false);
    setSelectedProduct(null);
    searchInputRef.current?.focus();
  };

  // Helper to validate UUID format
  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Helper to map cart items to order items
  const mapCartToOrderItems = useCallback((cartItems: typeof cart) => {
    // Calculate tax per item using tenant tax settings or default 7.5% VAT (if enabled)
    const defaultVATPercentage = 7.5;
    const taxPercentage = taxEnabled 
      ? (taxSettings?.percentage || defaultVATPercentage) / 100 
      : 0;
    
    return cartItems
      .filter((item) => {
        // Filter out items with invalid UUID productIds
        if (!isValidUUID(item.productId)) {
          console.error(`Invalid productId format: ${item.productId} for product: ${item.name}`);
          toast.error(`Invalid product ID for ${item.name}. Please remove and re-add this item.`);
          return false;
        }
        return true;
      })
      .map((item) => {
        const itemSubtotal = item.priceCents * item.quantity;
        const itemDiscount = item.discountCents || 0;
        const itemTaxCents = (itemSubtotal - itemDiscount) * taxPercentage;
        
        return {
          productId: item.productId,
          quantity: item.quantity,
          priceCents: item.priceCents,
          taxCents: Math.round(itemTaxCents),
          discountCents: item.discountCents || 0,
        };
      });
  }, [taxEnabled, taxSettings]);

  // Helper to calculate totals from cart
  const calculateOrderTotals = useCallback(() => {
    const subtotal = cart.reduce((sum, item) => {
      const itemSubtotal = item.priceCents * item.quantity;
      const itemDiscount = item.discountCents || 0;
      return sum + itemSubtotal - itemDiscount;
    }, 0);
    
    // Apply cart-level discount first
    let finalSubtotal = subtotal;
    if (cartDiscountPercent > 0) {
      finalSubtotal = subtotal * (1 - cartDiscountPercent / 100);
    } else if (cartDiscountCents > 0) {
      finalSubtotal = Math.max(0, subtotal - cartDiscountCents);
    }
    
    // Calculate tax on discounted subtotal using tenant tax settings or default 7.5% VAT (if enabled)
    const defaultVATPercentage = 7.5;
    const taxPercentage = taxEnabled 
      ? (taxSettings?.percentage || defaultVATPercentage) / 100 
      : 0;
    const tax = finalSubtotal * taxPercentage;
    
    const totalAmount = finalSubtotal + tax;
    const totalDiscountCents = subtotal - finalSubtotal;
    
    return { subtotal, tax, finalSubtotal, totalAmount, totalDiscountCents };
  }, [cart, cartDiscountPercent, cartDiscountCents, taxEnabled, taxSettings]);

  // Extract receipt printing logic
  const handleReceiptPrint = useCallback(async (orderId: string) => {
    try {
      const printAvailable = await receiptService.isAvailable();
      if (printAvailable) {
        const printSuccess = await receiptService.printReceipt(orderId);
        if (printSuccess) {
          toast.success('✅ Receipt printed successfully');
          return;
        }
      }
      const browserPrintSuccess = await receiptService.printReceiptBrowser(orderId);
      if (browserPrintSuccess) {
        toast.success('Opening print dialog...');
      } else {
        const receipt = await receiptService.getReceipt(orderId);
        console.log('Receipt:', receipt);
        toast.success('Receipt generated');
      }
    } catch (error) {
      console.warn('Failed to generate/print receipt:', error);
      toast.error('Receipt generation failed');
    }
  }, []);

  const handlePaymentClick = (method: 'card' | 'cash' | 'qr' | 'transfer') => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setSelectedPaymentMethod(method);
    setPaymentModalOpen(true);
  };

  const handlePayment = async (method: 'card' | 'cash' | 'qr' | 'transfer') => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (!accessToken || !user) {
      toast.error('Not authenticated. Please log in again.');
      return;
    }

    setIsProcessing(true);
    setPaymentModalOpen(false);

    try {
      const { subtotal, tax, totalAmount, totalDiscountCents } = calculateOrderTotals();
      const orderUuid = generateUUID();
      const deviceId = localStorage.getItem('deviceId') || undefined;

      const orderResponse = await axios.post(
        `${API_URL}/api/v1/orders`,
        {
          uuid: orderUuid,
          locationId: user.locationId || undefined,
          customerId: selectedCustomer?.id,
          items: mapCartToOrderItems(cart),
          subtotalCents: subtotal,
          taxCents: tax,
          discountCents: totalDiscountCents,
          discountPercent: cartDiscountPercent > 0 ? cartDiscountPercent : undefined,
          discountReason: discountReason || undefined,
          totalCents: totalAmount,
          deviceId,
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const order = orderResponse.data;

      toast.success(`Payment confirmed! Order: ${order.orderNumber || orderUuid}`);
      setLastCompletedOrderId(order.id);
      clearCart();
      setSelectedCustomer(null);
      // Open receipt options modal for user to choose how to handle receipt
      setReceiptOptionsOpen(true);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Payment failed';
      toast.error(errorMessage, { duration: 5000, icon: '❌' });
    } finally {
      setIsProcessing(false);
      setPaymentModalOpen(false);
      setSelectedPaymentMethod(null);
    }
  };

  // Calculate display totals using the same logic as calculateOrderTotals
  const { subtotal, tax, finalSubtotal, totalDiscountCents } = calculateOrderTotals();
  const totalDiscount = totalDiscountCents;

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden theme-background page-with-nav">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className={`absolute -top-32 -right-24 h-80 w-80 rounded-full ${theme === 'light' ? 'bg-sky-300/40' : 'bg-cyan-500/30'} blur-[160px]`} />
        <div className={`absolute -bottom-44 -left-40 h-[420px] w-[420px] rounded-full ${theme === 'light' ? 'bg-indigo-200/35' : 'bg-indigo-500/25'} blur-[200px]`} />
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
                <h1 className="theme-text-primary text-lg sm:text-xl font-semibold truncate">Checkout</h1>
                <p className="theme-text-secondary text-xs truncate">{tenant?.name || 'POS System'}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <Link
                to="/inventory"
                className="theme-chip rounded-full border px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition hover:border-emerald-300/60 hover:text-emerald-100"
              >
                📦 <span className="hidden sm:inline">Inventory</span>
              </Link>
              <Link
                to="/reports"
                className="theme-chip rounded-full border px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition hover:border-sky-300/60 hover:text-sky-100"
              >
                📊 <span className="hidden sm:inline">Reports</span>
              </Link>
              {isAdmin && (
                <Link
                  to="/settings"
                  className="theme-chip rounded-full border px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition"
                >
                  ⚙️ <span className="hidden sm:inline">Settings</span>
                </Link>
              )}
              <button
                onClick={logout}
                className="rounded-full bg-gradient-to-r from-rose-400 to-pink-500 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-lg transition hover:shadow-xl"
              >
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Out</span>
              </button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="mx-auto mt-4 w-full max-w-7xl flex-1 px-2 sm:px-4 lg:px-8 pb-4 sm:pb-12 overflow-y-auto">
          <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row">
            {/* Left: Product Search & Cart Table */}
            <div className="flex-1 space-y-4 sm:space-y-6 min-w-0">
              {/* Product Search */}
              <div className="theme-card rounded-xl sm:rounded-2xl border p-4 sm:p-6 backdrop-blur-xl">
                <h2 className="theme-text-primary mb-3 sm:mb-4 text-base sm:text-lg font-semibold">Search Products</h2>
                <div className="relative">
                  <ScannerInput
                    onScan={handleBarcodeScan}
                    placeholder="Scan barcode/QR or type product name, SKU..."
                    autoFocus={false}
                  />
                  
                  {/* Text Search Input (for manual typing) */}
                  <div className="mt-3">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => {
                        // Load products on first focus, then always show dropdown
                        loadAllProducts();
                        setShowResults(true);
                      }}
                      placeholder="Or type product name, SKU..."
                      className="theme-surface w-full rounded-xl border px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base theme-text-primary placeholder:text-current/50 focus:border-sky-400 focus:outline-none"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                      </div>
                    )}
                  </div>
                  
                  {/* Search Results Dropdown */}
                  {showResults && searchResults.length > 0 && (
                    <div className="absolute z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-white/20 bg-slate-950/95 backdrop-blur-xl shadow-2xl">
                      {searchResults.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => handleProductSelect(product)}
                          className="w-full border-b border-white/10 px-4 py-3 text-left transition hover:bg-white/10 first:rounded-t-xl last:rounded-b-xl last:border-b-0"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="theme-text-primary font-medium truncate">{product.name}</p>
                              <p className="theme-text-secondary text-xs sm:text-sm">SKU: {product.sku || 'N/A'}</p>
                            </div>
                            <p className="theme-text-primary font-semibold text-sm sm:text-base whitespace-nowrap">
                              {formatCurrency(product.priceCents)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Cart Tabs */}
              <div className="theme-card rounded-xl sm:rounded-2xl border backdrop-blur-xl">
                <div className="border-b border-white/10 p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <h2 className="theme-text-primary text-base sm:text-lg font-semibold">Cart</h2>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      {sessions.map((session) => (
                        <button
                          key={session.id}
                          onClick={() => switchSession(session.id)}
                          className={`rounded-lg border px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium transition ${
                            activeSessionId === session.id
                              ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                              : 'border-white/20 bg-white/5 text-white/70 hover:border-white/30 hover:text-white'
                          }`}
                        >
                          {session.label}
                          {session.cart.length > 0 && (
                            <span className="ml-1 sm:ml-2 rounded-full bg-white/20 px-1 sm:px-1.5 text-xs">
                              {session.cart.length}
                            </span>
                          )}
                        </button>
                      ))}
                      <button
                        onClick={createSession}
                        className="rounded-lg border border-white/20 bg-white/5 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-white/70 transition hover:border-white/30 hover:text-white"
                        title="New cart"
                      >
                        + New
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cart Table */}
                <div className="p-3 sm:p-6">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                      <div className="text-3xl sm:text-4xl">🛒</div>
                      <p className="theme-text-primary mt-3 text-base sm:text-lg font-semibold">Cart is empty</p>
                      <p className="theme-text-secondary mt-1 text-xs sm:text-sm">Search for products to add them here.</p>
                    </div>
                  ) : (
                    <>
                      {/* Mobile Card View */}
                      <div className="block sm:hidden space-y-3">
                        {cart.map((item) => (
                          <div key={item.productId} className="theme-surface rounded-xl border p-3 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="theme-text-primary font-medium text-sm truncate">{item.name}</p>
                                <p className="theme-text-secondary text-xs mt-1">{formatCurrency(item.priceCents)} each</p>
                              </div>
                              <button
                                onClick={() => removeItem(item.productId)}
                                className="rounded border border-rose-400/40 bg-rose-500/15 px-2 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/25 flex-shrink-0 ml-2"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                  className="flex h-8 w-8 items-center justify-center rounded border border-white/20 bg-white/5 text-lg font-semibold transition hover:bg-white/10 disabled:opacity-40"
                                  disabled={item.quantity <= 1}
                                >
                                  −
                                </button>
                                <span className="theme-text-primary w-10 text-center font-semibold text-sm">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                  className="flex h-8 w-8 items-center justify-center rounded border border-white/20 bg-white/5 text-lg font-semibold transition hover:bg-white/10"
                                >
                                  +
                                </button>
                              </div>
                              <p className="theme-text-primary font-semibold text-sm">
                                {formatCurrency(item.priceCents * item.quantity)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Desktop Table View */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-white/10">
                              <th className="theme-text-secondary px-4 py-3 text-left text-sm font-semibold">Product</th>
                              <th className="theme-text-secondary px-4 py-3 text-center text-sm font-semibold">Price</th>
                              <th className="theme-text-secondary px-4 py-3 text-center text-sm font-semibold">Quantity</th>
                              <th className="theme-text-secondary px-4 py-3 text-right text-sm font-semibold">Total</th>
                              <th className="theme-text-secondary px-4 py-3 text-center text-sm font-semibold">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cart.map((item) => (
                              <tr key={item.productId} className="border-b border-white/5">
                                <td className="px-4 py-3">
                                  <p className="theme-text-primary font-medium">{item.name}</p>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <p className="theme-text-primary">{formatCurrency(item.priceCents)}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                      className="flex h-8 w-8 items-center justify-center rounded border border-white/20 bg-white/5 text-lg font-semibold transition hover:bg-white/10 disabled:opacity-40"
                                      disabled={item.quantity <= 1}
                                    >
                                      −
                                    </button>
                                    <span className="theme-text-primary w-12 text-center font-semibold">{item.quantity}</span>
                                    <button
                                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                      className="flex h-8 w-8 items-center justify-center rounded border border-white/20 bg-white/5 text-lg font-semibold transition hover:bg-white/10"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <p className="theme-text-primary font-semibold">
                                    {formatCurrency(item.priceCents * item.quantity)}
                                  </p>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => removeItem(item.productId)}
                                    className="rounded border border-rose-400/40 bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/25"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Summary & Checkout */}
            <div className="w-full lg:w-80">
              <div className="theme-card sticky top-20 sm:top-6 rounded-xl sm:rounded-2xl border p-4 sm:p-6 backdrop-blur-xl">
                <h2 className="theme-text-primary mb-3 sm:mb-4 text-base sm:text-lg font-semibold">Summary</h2>
                
                {/* VAT Toggle - Always visible, optional for cashier */}
                <div className="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3 pb-3 sm:pb-4 border-b border-white/10">
                  <input
                    type="checkbox"
                    id="vat-toggle"
                    checked={taxEnabled}
                    onChange={(e) => setTaxEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-sky-500 focus:ring-2 focus:ring-sky-400"
                  />
                  <label htmlFor="vat-toggle" className="theme-text-primary text-xs sm:text-sm font-medium cursor-pointer">
                    Apply VAT ({taxSettings?.percentage || 7.5}%)
                  </label>
                </div>

                {/* Discount Input */}
                <div className="mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-white/10">
                  <label className="theme-text-secondary mb-2 block text-xs sm:text-sm font-medium">Discount</label>
                  <div className="flex gap-2">
                    <select
                      value={discountType}
                      onChange={(e) => {
                        setDiscountType(e.target.value as 'percent' | 'amount');
                        setDiscountInput('');
                        setCartDiscount(0, 0, '');
                      }}
                      className="theme-surface rounded-lg border border-white/20 px-2 sm:px-3 py-2 text-xs sm:text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                    >
                      <option value="amount">₦</option>
                      <option value="percent">%</option>
                    </select>
                    <input
                      type="number"
                      value={discountInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDiscountInput(value);
                        const numValue = parseFloat(value) || 0;
                        if (discountType === 'percent') {
                          setCartDiscount(0, numValue, 'Manual discount');
                        } else {
                          setCartDiscount(Math.round(numValue * 100), 0, 'Manual discount');
                        }
                      }}
                      placeholder={discountType === 'percent' ? '0' : '0.00'}
                      min="0"
                      step={discountType === 'percent' ? '1' : '0.01'}
                      className="theme-surface flex-1 rounded-lg border border-white/20 px-3 sm:px-4 py-2 text-xs sm:text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                </div>
                
                <div className="space-y-2 sm:space-y-3 border-b border-white/10 pb-3 sm:pb-4">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="theme-text-secondary">Subtotal</span>
                    <span className="theme-text-primary">{formatCurrency(finalSubtotal)}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="theme-text-secondary">Discount</span>
                      <span className="theme-text-primary text-emerald-400">-{formatCurrency(totalDiscount)}</span>
                    </div>
                  )}
                  {taxEnabled && tax > 0 && (
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="theme-text-secondary">VAT</span>
                      <span className="theme-text-primary">{formatCurrency(tax)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 sm:mt-4 mb-4 sm:mb-6 flex justify-between border-t border-white/10 pt-3 sm:pt-4">
                  <span className="theme-text-primary text-base sm:text-lg font-semibold">Total</span>
                  <span className="theme-text-primary text-lg sm:text-xl font-bold">{formatCurrency(total)}</span>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handlePaymentClick('cash')}
                    disabled={cart.length === 0 || isProcessing}
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                  >
                    {isProcessing ? 'Processing...' : '💵 Pay Cash'}
                  </button>
                  <button
                    onClick={() => handlePaymentClick('card')}
                    disabled={cart.length === 0 || isProcessing}
                    className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                  >
                    💳 Pay Card
                  </button>
                  <button
                    onClick={() => handlePaymentClick('qr')}
                    disabled={cart.length === 0 || isProcessing}
                    className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 px-4 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                  >
                    📱 Pay QR
                  </button>
                  <button
                    onClick={() => handlePaymentClick('transfer')}
                    disabled={cart.length === 0 || isProcessing}
                    className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                  >
                    🏦 Pay Transfer
                  </button>
                </div>

                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="mt-3 sm:mt-4 w-full rounded-xl border border-white/20 bg-white/5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white touch-manipulation"
                  >
                    Clear Cart
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        method={selectedPaymentMethod}
        total={total}
        cart={cart}
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedPaymentMethod(null);
        }}
        onComplete={async (change) => {
          if (change !== undefined) {
            setCashChange(change);
          }
          if (selectedPaymentMethod) {
            await handlePayment(selectedPaymentMethod);
          }
        }}
      />

      {/* Receipt Options Modal */}
      {lastCompletedOrderId && (
        <ReceiptOptionsModal
          isOpen={receiptOptionsOpen}
          orderId={lastCompletedOrderId}
          onClose={() => {
            setReceiptOptionsOpen(false);
            setLastCompletedOrderId(null);
          }}
        />
      )}

      {/* Quantity Selector Modal */}
      <QuantitySelectorModal
        isOpen={quantitySelectorOpen}
        product={selectedProduct}
        onClose={() => {
          setQuantitySelectorOpen(false);
          setSelectedProduct(null);
        }}
        onConfirm={handleQuantityConfirm}
      />
    </div>
  );
}
