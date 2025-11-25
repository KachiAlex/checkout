import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useCartStore, CartItem } from '../stores/cartStore';
import { PaymentModal } from '../components/PaymentModal';
import { ReceiptOptionsModal } from '../components/ReceiptOptionsModal';
import { QuantitySelectorModal } from '../components/QuantitySelectorModal';
import { ThemeToggle } from '../components/ThemeToggle';
import { BrandMark } from '../components/BrandMark';
import { useThemeStore } from '../stores/themeStore';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link, Navigate } from 'react-router-dom';
import { API_URL } from '../config';
import { receiptService } from '../services/receiptService';

// UUID generator
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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

  // Product search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; sku: string; name: string; priceCents: number; taxRate: number; stock?: number; images?: string[] } | null>(null);
  const [quantitySelectorOpen, setQuantitySelectorOpen] = useState(false);

  // Search products with debounce
  useEffect(() => {
    if (!searchQuery.trim() || !accessToken) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await axios.get(
          `${API_URL}/api/v1/products?query=${encodeURIComponent(searchQuery)}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        setSearchResults(response.data?.slice(0, 10) || []);
        setShowResults(true);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, accessToken]);

  // Handle product selection
  const handleProductSelect = async (product: Product) => {
    if (!user?.locationId) {
      toast.error('Location not set');
      return;
    }

    try {
      // Get stock level
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

      setSelectedProduct({
        id: product.id,
        sku: product.sku || '',
        name: product.name,
        priceCents: product.priceCents,
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

  // Helper to map cart items to order items
  const mapCartToOrderItems = useCallback((cartItems: typeof cart) => {
    return cartItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      priceCents: item.priceCents,
      taxCents: (item.priceCents * item.quantity - (item.discountCents || 0)) * item.taxRate,
      discountCents: item.discountCents || 0,
    }));
  }, []);

  // Helper to calculate totals from cart
  const calculateOrderTotals = useCallback(() => {
    const subtotal = cart.reduce((sum, item) => {
      const itemSubtotal = item.priceCents * item.quantity;
      const itemDiscount = item.discountCents || 0;
      return sum + itemSubtotal - itemDiscount;
    }, 0);
    
    const tax = cart.reduce((sum, item) => {
      const itemSubtotal = item.priceCents * item.quantity;
      const itemDiscount = item.discountCents || 0;
      const discountedSubtotal = itemSubtotal - itemDiscount;
      return sum + discountedSubtotal * item.taxRate;
    }, 0);
    
    let finalSubtotal = subtotal;
    if (cartDiscountPercent > 0) {
      finalSubtotal = subtotal * (1 - cartDiscountPercent / 100);
    } else if (cartDiscountCents > 0) {
      finalSubtotal = Math.max(0, subtotal - cartDiscountCents);
    }
    
    const totalAmount = finalSubtotal + tax;
    const totalDiscountCents = subtotal - finalSubtotal;
    
    return { subtotal, tax, finalSubtotal, totalAmount, totalDiscountCents };
  }, [cart, cartDiscountPercent, cartDiscountCents]);

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

      // Process payment
      const paymentResponse = await axios.post(
        `${API_URL}/api/v1/orders/${order.id}/payments/initiate`,
        { method, amount: totalAmount },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const payment = paymentResponse.data;

      if (payment.status === 'completed' || method === 'cash' || method === 'transfer') {
        if ((method === 'cash' || method === 'transfer') && payment.status !== 'completed') {
          try {
            await axios.post(
              `${API_URL}/api/v1/orders/${order.id}/payments/capture`,
              { paymentId: payment.id },
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
          } catch (captureError) {
            console.log('Payment capture:', captureError);
          }
        }

        toast.success(`Payment confirmed! Order: ${order.orderNumber || orderUuid}`);
        setLastCompletedOrderId(order.id);
        await handleReceiptPrint(order.id);
        clearCart();
        setSelectedCustomer(null);
        setTimeout(() => {
          setLastCompletedOrderId(null);
        }, 10000);
      } else if (payment.status === 'pending' || payment.status === 'processing') {
        toast.loading('Payment processing...', { id: 'payment-processing' });
        setLastCompletedOrderId(order.id);
        setTimeout(() => {
          toast.dismiss('payment-processing');
          setReceiptOptionsOpen(true);
        }, 2000);
      } else {
        toast.error(`Payment ${payment.status}: ${payment.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Payment failed';
      toast.error(errorMessage, { duration: 5000, icon: '❌' });
    } finally {
      setIsProcessing(false);
      setPaymentModalOpen(false);
      setSelectedPaymentMethod(null);
    }
  };

  // Calculate display totals
  const subtotal = cart.reduce((sum, item) => {
    const itemSubtotal = item.priceCents * item.quantity;
    const itemDiscount = item.discountCents || 0;
    return sum + itemSubtotal - itemDiscount;
  }, 0);

  const tax = cart.reduce((sum, item) => {
    const itemSubtotal = item.priceCents * item.quantity;
    const itemDiscount = item.discountCents || 0;
    const discountedSubtotal = itemSubtotal - itemDiscount;
    return sum + discountedSubtotal * item.taxRate;
  }, 0);

  let finalSubtotal = subtotal;
  if (cartDiscountPercent > 0) {
    finalSubtotal = subtotal * (1 - cartDiscountPercent / 100);
  } else if (cartDiscountCents > 0) {
    finalSubtotal = Math.max(0, subtotal - cartDiscountCents);
  }

  const totalDiscount = subtotal - finalSubtotal;

  return (
    <div className="relative min-h-screen overflow-x-hidden theme-background">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className={`absolute -top-32 -right-24 h-80 w-80 rounded-full ${theme === 'light' ? 'bg-sky-300/40' : 'bg-cyan-500/30'} blur-[160px]`} />
        <div className={`absolute -bottom-44 -left-40 h-[420px] w-[420px] rounded-full ${theme === 'light' ? 'bg-indigo-200/35' : 'bg-indigo-500/25'} blur-[200px]`} />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header */}
        <header className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <div className="theme-card flex items-center justify-between rounded-2xl border p-4 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <BrandMark
                size={40}
                backgroundClassName="bg-white/90 dark:bg-white/10"
                className="ring-1 ring-slate-200/40 dark:ring-white/10"
              />
              <div>
                <h1 className="theme-text-primary text-xl font-semibold">Checkout</h1>
                <p className="theme-text-secondary text-xs">{tenant?.name || 'POS System'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/inventory"
                className="theme-chip rounded-full border px-4 py-2 text-sm font-medium transition hover:border-emerald-300/60 hover:text-emerald-100"
              >
                📦 Inventory
              </Link>
              <Link
                to="/reports"
                className="theme-chip rounded-full border px-4 py-2 text-sm font-medium transition hover:border-sky-300/60 hover:text-sky-100"
              >
                📊 Reports
              </Link>
              {isAdmin && (
                <Link
                  to="/settings"
                  className="theme-chip rounded-full border px-4 py-2 text-sm font-medium transition"
                >
                  ⚙️ Settings
                </Link>
              )}
              <button
                onClick={logout}
                className="rounded-full bg-gradient-to-r from-rose-400 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl"
              >
                Logout
              </button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="mx-auto mt-6 w-full max-w-7xl flex-1 px-4 pb-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Left: Product Search & Cart Table */}
            <div className="flex-1 space-y-6">
              {/* Product Search */}
              <div className="theme-card rounded-2xl border p-6 backdrop-blur-xl">
                <h2 className="theme-text-primary mb-4 text-lg font-semibold">Search Products</h2>
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery && setShowResults(true)}
                    placeholder="Type product name, SKU, or barcode..."
                    className="theme-surface w-full rounded-xl border px-4 py-3 text-base theme-text-primary placeholder:text-current/50 focus:border-sky-400 focus:outline-none"
                    autoFocus
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                    </div>
                  )}
                  
                  {/* Search Results Dropdown */}
                  {showResults && searchResults.length > 0 && (
                    <div className="absolute z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-white/20 bg-slate-950/95 backdrop-blur-xl shadow-2xl">
                      {searchResults.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => handleProductSelect(product)}
                          className="w-full border-b border-white/10 px-4 py-3 text-left transition hover:bg-white/10 first:rounded-t-xl last:rounded-b-xl last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="theme-text-primary font-medium">{product.name}</p>
                              <p className="theme-text-secondary text-sm">SKU: {product.sku || 'N/A'}</p>
                            </div>
                            <p className="theme-text-primary font-semibold">₦{(product.priceCents / 100).toFixed(2)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Cart Tabs */}
              <div className="theme-card rounded-2xl border backdrop-blur-xl">
                <div className="border-b border-white/10 p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="theme-text-primary text-lg font-semibold">Cart</h2>
                    <div className="flex items-center gap-2">
                      {sessions.map((session) => (
                        <button
                          key={session.id}
                          onClick={() => switchSession(session.id)}
                          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                            activeSessionId === session.id
                              ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                              : 'border-white/20 bg-white/5 text-white/70 hover:border-white/30 hover:text-white'
                          }`}
                        >
                          {session.label}
                          {session.cart.length > 0 && (
                            <span className="ml-2 rounded-full bg-white/20 px-1.5 text-xs">
                              {session.cart.length}
                            </span>
                          )}
                        </button>
                      ))}
                      <button
                        onClick={createSession}
                        className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/70 transition hover:border-white/30 hover:text-white"
                        title="New cart"
                      >
                        + New
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cart Table */}
                <div className="p-6">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="text-4xl">🛒</div>
                      <p className="theme-text-primary mt-3 text-lg font-semibold">Cart is empty</p>
                      <p className="theme-text-secondary mt-1 text-sm">Search for products to add them here.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
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
                                <p className="theme-text-primary">₦{(item.priceCents / 100).toFixed(2)}</p>
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
                                  ₦{((item.priceCents * item.quantity) / 100).toFixed(2)}
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
                  )}
                </div>
              </div>
            </div>

            {/* Right: Summary & Checkout */}
            <div className="w-full lg:w-80">
              <div className="theme-card sticky top-6 rounded-2xl border p-6 backdrop-blur-xl">
                <h2 className="theme-text-primary mb-4 text-lg font-semibold">Summary</h2>
                
                <div className="space-y-3 border-b border-white/10 pb-4">
                  <div className="flex justify-between text-sm">
                    <span className="theme-text-secondary">Subtotal</span>
                    <span className="theme-text-primary">₦{(finalSubtotal / 100).toFixed(2)}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="theme-text-secondary">Discount</span>
                      <span className="theme-text-primary text-emerald-400">-₦{(totalDiscount / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="theme-text-secondary">Tax</span>
                    <span className="theme-text-primary">₦{(tax / 100).toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-4 mb-6 flex justify-between border-t border-white/10 pt-4">
                  <span className="theme-text-primary text-lg font-semibold">Total</span>
                  <span className="theme-text-primary text-xl font-bold">₦{(total / 100).toFixed(2)}</span>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handlePaymentClick('cash')}
                    disabled={cart.length === 0 || isProcessing}
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : '💵 Pay Cash'}
                  </button>
                  <button
                    onClick={() => handlePaymentClick('card')}
                    disabled={cart.length === 0 || isProcessing}
                    className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    💳 Pay Card
                  </button>
                  <button
                    onClick={() => handlePaymentClick('qr')}
                    disabled={cart.length === 0 || isProcessing}
                    className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    📱 Pay QR
                  </button>
                  <button
                    onClick={() => handlePaymentClick('transfer')}
                    disabled={cart.length === 0 || isProcessing}
                    className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    🏦 Pay Transfer
                  </button>
                </div>

                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="mt-4 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
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
