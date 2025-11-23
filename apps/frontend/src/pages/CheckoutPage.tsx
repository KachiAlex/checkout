import { useState, lazy, Suspense, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useCartStore, CartItem } from '../stores/cartStore';
import { PaymentModal } from '../components/PaymentModal';
import { SplitPaymentModal } from '../components/SplitPaymentModal';
import { DiscountModal } from '../components/DiscountModal';
import { PriceOverrideModal } from '../components/PriceOverrideModal';
import { CustomerDisplay } from '../components/CustomerDisplay';
import { ReceiptOptionsModal } from '../components/ReceiptOptionsModal';
import { OnboardingBanner } from '../components/OnboardingBanner';
// import { ProductSearch } from '../components/ProductSearch';
import { CartSummary } from '../components/CartSummary';
import { QuantitySelectorModal } from '../components/QuantitySelectorModal';
import { ThemeToggle } from '../components/ThemeToggle';
import { BrandMark } from '../components/BrandMark';
import { KeyboardShortcutsHelp } from '../components/KeyboardShortcutsHelp';
import { useThemeStore } from '../stores/themeStore';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link, Navigate } from 'react-router-dom';
import { API_URL } from '../config';
import { syncService } from '../services/syncService';
import { receiptService } from '../services/receiptService';

// UUID generator
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const ScannerInput = lazy(() =>
  import('../components/ScannerInput').then((module) => ({
    default: module.ScannerInput,
  })),
);

const CameraScanner = lazy(() =>
  import('../components/CameraScanner').then((module) => ({
    default: module.CameraScanner,
  })),
);

const ScannerDeviceList = lazy(() =>
  import('../components/ScannerDeviceList').then((module) => ({
    default: module.ScannerDeviceList,
  })),
);

type StatusChip = { label: string; tone: string; icon: string };

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
    updateItemDiscount,
    setCartDiscount,
    getTotal,
    cartDiscountCents,
    cartDiscountPercent,
    discountReason,
    sessions: _sessions,
    activeSessionId: _activeSessionId,
    createSession: _createSession,
    switchSession: _switchSession,
    closeSession: _closeSession,
  } = useCartStore();
  const total = getTotal();
  const [isProcessing, setIsProcessing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    isOnline: boolean;
    isSyncing: boolean;
    pendingCount: number;
    failedCount: number;
  }>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: 0,
    failedCount: 0,
  });
  const theme = useThemeStore((state) => state.theme);
  const isAdmin = user?.role === 'admin';
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cartRef = useRef<HTMLDivElement>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [splitPaymentModalOpen, setSplitPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'cash' | 'qr' | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [customerDisplayVisible, setCustomerDisplayVisible] = useState(false);
  const [receiptOptionsOpen, setReceiptOptionsOpen] = useState(false);
  const [lastCompletedOrderId, setLastCompletedOrderId] = useState<string | null>(null);
  const [cashChange, setCashChange] = useState<number>(0);
  const [showCamera, setShowCamera] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; phone?: string } | null>(null);
  const [_showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<Array<{ id: string; name: string; phone?: string }>>([]);
  const [heldOrders, setHeldOrders] = useState<Array<{ id: string; orderNumber: string; items: any[]; totalCents: number; heldAt: string }>>([]);
  const [_showHeldOrders, setShowHeldOrders] = useState(false);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [discountingItem, setDiscountingItem] = useState<CartItem | null>(null);
  const [priceOverrideModalOpen, setPriceOverrideModalOpen] = useState(false);
  const [overridingProduct, setOverridingProduct] = useState<{ id: string; name: string; priceCents: number } | null>(null);
  const [quantitySelectorOpen, setQuantitySelectorOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; sku: string; name: string; priceCents: number; taxRate: number; stock?: number; images?: string[] } | null>(null);

  // Search customers
  useEffect(() => {
    if (!customerSearchQuery || !accessToken) {
      setCustomerSearchResults([]);
      return;
    }

    const searchCustomers = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/v1/customers`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { search: customerSearchQuery },
        });
        setCustomerSearchResults(response.data.slice(0, 5) || []);
      } catch (error) {
        // Silently fail customer search
      }
    };

    const timeoutId = setTimeout(searchCustomers, 300);
    return () => clearTimeout(timeoutId);
  }, [customerSearchQuery, accessToken]);

  // Load held orders
  useEffect(() => {
    const loadHeldOrders = async () => {
      if (!accessToken || !user?.locationId) return;
      try {
        const response = await axios.get(`${API_URL}/api/v1/orders/held`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { location_id: user.locationId },
        });
        setHeldOrders(response.data || []);
      } catch (error) {
        // Silently fail
      }
    };
    loadHeldOrders();
  }, [accessToken, user?.locationId]);

  // Update sync status periodically
  useEffect(() => {
    const updateSyncStatus = async () => {
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);
    };

    updateSyncStatus();
    const interval = setInterval(updateSyncStatus, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Manual sync handler
  const handleManualSync = async () => {
    try {
      setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
      const result = await syncService.syncPendingChanges(accessToken || undefined);
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);
      if (result.success && result.synced > 0) {
        toast.success(`Synced ${result.synced} item${result.synced > 1 ? 's' : ''} successfully`);
      } else if (result.synced === 0 && result.failed === 0) {
        toast.success('No pending items to sync');
      } else if (result.failed > 0) {
        toast.error(`Sync completed with ${result.failed} error${result.failed > 1 ? 's' : ''}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Sync failed. Please try again.');
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);
    } finally {
      setSyncStatus((prev) => ({ ...prev, isSyncing: false }));
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'F1',
      action: () => {
        searchInputRef.current?.focus();
      },
      description: 'Focus search input',
    },
    {
      key: 'F2',
      action: () => {
        cartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
      description: 'Focus cart',
    },
    {
      key: 'F3',
      action: () => {
        if (cart.length > 0 && !isProcessing) {
          handlePaymentClick('cash');
        }
      },
      description: 'Pay with cash',
    },
    {
      key: 'F4',
      action: () => {
        if (cart.length > 0 && !isProcessing) {
          handlePaymentClick('card');
        }
      },
      description: 'Pay with card',
    },
    {
      key: 'F5',
      action: () => {
        if (cart.length > 0 && !isProcessing) {
          handlePaymentClick('qr');
        }
      },
      description: 'Pay with QR',
    },
    {
      key: 'Delete',
      action: () => {
        if (cart.length > 0) {
          removeItem(cart[cart.length - 1].productId);
        }
      },
      description: 'Remove last cart item',
      preventDefault: false,
    },
    {
      key: 'Enter',
      action: () => {
        // Only trigger payment if cart is focused and has items
        if (cart.length > 0 && !isProcessing && document.activeElement === cartRef.current) {
          handlePaymentClick('cash');
        }
      },
      description: 'Complete payment (when cart focused)',
      preventDefault: false,
    },
  ]);

  // Memoize status chips
  const statusChips = useMemo<StatusChip[]>(() => [
    {
      label: user?.locationId ? `Location • ${user.locationId}` : 'Location not set',
      tone: user?.locationId ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40' : 'bg-amber-500/15 text-amber-200 border-amber-400/40',
      icon: user?.locationId ? '✅' : '⚠️',
    },
    {
      label: `${cart.length} item${cart.length === 1 ? '' : 's'} in cart`,
      tone: cart.length > 0 ? 'bg-sky-500/15 text-sky-200 border-sky-400/40' : 'bg-white/5 text-slate-200 border-white/15',
      icon: '🛒',
    },
    {
      label: syncStatus.isOnline
        ? syncStatus.pendingCount > 0
          ? `${syncStatus.pendingCount} pending sync${syncStatus.pendingCount > 1 ? 's' : ''}`
          : syncStatus.isSyncing
          ? 'Syncing...'
          : 'Online'
        : 'Offline',
      tone: syncStatus.isOnline
        ? syncStatus.pendingCount > 0 || syncStatus.failedCount > 0
          ? 'bg-amber-500/15 text-amber-200 border-amber-400/40'
          : 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40'
        : 'bg-red-500/15 text-red-200 border-red-400/40',
      icon: syncStatus.isOnline
        ? syncStatus.pendingCount > 0
          ? '⏳'
          : syncStatus.isSyncing
          ? '🔄'
          : '✅'
        : '📴',
    },
    tenant
      ? {
          label: `${tenant.plan} plan`.replace(/^\w/, (c) => c.toUpperCase()),
          tone: 'bg-purple-500/15 text-purple-200 border-purple-400/40',
          icon: '💼',
        }
      : null,
  ].filter((chip): chip is StatusChip => Boolean(chip)), [user?.locationId, cart.length, syncStatus, tenant]);

  // Memoize glow styles
  const glowStyles = useMemo(() => ({
    topRight: theme === 'light' ? 'bg-sky-300/40' : 'bg-cyan-500/30',
    bottomLeft: theme === 'light' ? 'bg-indigo-200/35' : 'bg-indigo-500/25',
    center: theme === 'light' ? 'bg-emerald-200/30' : 'bg-emerald-400/10',
  }), [theme]);

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

  // Helper to calculate totals from cart (for order creation)
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
      // Fallback to browser print if ESC/POS printer not available
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

  const handleScan = async (barcode: string) => {
    try {
      if (!accessToken) {
        toast.error('Not authenticated');
        return;
      }

      const response = await axios.get(
        `${API_URL}/api/v1/products?query=${encodeURIComponent(barcode)}`,
      );

      if (response.data && response.data.length > 0) {
        const product = response.data[0];
        
        // Check stock availability
        if (!user?.locationId) {
          toast.error('Location not set');
          return;
        }
        
        const stockResponse = await axios.get(
          `${API_URL}/api/v1/inventory/${user.locationId}/stock`,
        );

        const inventory = stockResponse.data.find((inv: any) => inv.productId === product.id);
        const stock = inventory?.quantity || 0;

        if (stock === 0) {
          toast.error(`${product.name} is out of stock`);
          return;
        }

        // Open quantity selector modal
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
      } else {
        toast.error(`Product not found: ${barcode}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to find product');
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
    toast.success(`Added ${quantity} ${product.name}${quantity > 1 ? 's' : ''} to cart`, {
      icon: '✅',
      duration: 2000,
    });
    setQuantitySelectorOpen(false);
    setSelectedProduct(null);
  };

  const _handleHoldOrder = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (!accessToken || !user) {
      toast.error('Not authenticated');
      return;
    }

    try {
      const { subtotal, tax, totalAmount, totalDiscountCents } = calculateOrderTotals();

      const orderUuid = generateUUID();
      const deviceId = localStorage.getItem('deviceId') || undefined;

      await axios.post(
        `${API_URL}/api/v1/orders`,
        {
          uuid: orderUuid,
          locationId: user.locationId,
          customerId: selectedCustomer?.id,
          items: mapCartToOrderItems(cart),
          subtotalCents: subtotal,
          taxCents: tax,
          discountCents: totalDiscountCents,
          discountPercent: cartDiscountPercent > 0 ? cartDiscountPercent : undefined,
          discountReason: discountReason || undefined,
          totalCents: totalAmount,
          deviceId,
          isHeld: true,
        },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      toast.success('Order held successfully');
      clearCart();
      setSelectedCustomer(null);
      
      // Reload held orders
      const response = await axios.get(`${API_URL}/api/v1/orders/held`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { location_id: user.locationId },
      });
      setHeldOrders(response.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to hold order');
    }
  };

  const _handleRecallOrder = async (orderId: string) => {
    if (!accessToken) return;
    try {
      const response = await axios.post(
        `${API_URL}/api/v1/orders/${orderId}/recall`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const order = response.data;
      
      // Load order items into cart
      clearCart();
      for (const item of order.items) {
        // We need product details - fetch them
        try {
          const productResponse = await axios.get(`${API_URL}/api/v1/products/${item.productId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const product = productResponse.data;
          addItem({
            productId: product.id,
            name: product.name,
            priceCents: item.priceCents,
            taxRate: item.taxCents / (item.priceCents * item.quantity),
            quantity: item.quantity,
          });
        } catch (err) {
          // Skip if product not found
        }
      }
      
      toast.success('Order recalled to cart');
      setShowHeldOrders(false);
      
      // Reload held orders
      const heldResponse = await axios.get(`${API_URL}/api/v1/orders/held`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { location_id: user?.locationId },
      });
      setHeldOrders(heldResponse.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to recall order');
    }
  };

  const _handleSplitPaymentClick = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (!accessToken || !user) {
      toast.error('Not authenticated');
      return;
    }

    // Create order first (without payment)
    try {
      const { subtotal, tax, totalAmount, totalDiscountCents } = calculateOrderTotals();

      const orderUuid = generateUUID();
      const deviceId = localStorage.getItem('deviceId') || undefined;

      const orderResponse = await axios.post(
        `${API_URL}/api/v1/orders`,
        {
          uuid: orderUuid,
          locationId: user.locationId,
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
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      const order = orderResponse.data;
      setCurrentOrderId(order.id);
      setSplitPaymentModalOpen(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create order');
    }
  };

  const handlePaymentClick = (method: 'card' | 'cash' | 'qr') => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setSelectedPaymentMethod(method);
    setPaymentModalOpen(true);
  };


  const handlePayment = async (method: 'card' | 'cash' | 'qr') => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (!accessToken || !user) {
      toast.error('Not authenticated. Please log in again.');
      return;
    }

    // locationId is now optional - will be derived from user or tenant if not provided

    setIsProcessing(true);
    setPaymentModalOpen(false);

    let isOffline = false;
    try {
      // Calculate totals with discounts
      const { subtotal, tax, totalAmount, totalDiscountCents } = calculateOrderTotals();

      // Create order UUID
      const orderUuid = generateUUID();
      const deviceId = localStorage.getItem('deviceId') || undefined;

      // Try to create order online first
      let order;

      try {
        const orderResponse = await axios.post(
          `${API_URL}/api/v1/orders`,
          {
            uuid: orderUuid,
            locationId: user.locationId || undefined, // Optional - backend will derive if not provided
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
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        order = orderResponse.data;

        // Process payment
        const paymentResponse = await axios.post(
          `${API_URL}/api/v1/orders/${order.id}/payments/initiate`,
          {
            method,
            amount: totalAmount,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        const payment = paymentResponse.data;

        // For cash payments, mark as completed immediately
        // For card/QR, payment might be pending and need confirmation
        if (payment.status === 'completed' || method === 'cash') {
          // If cash, ensure payment is marked as completed
          if (method === 'cash' && payment.status !== 'completed') {
            try {
              // Mark cash payment as completed (cash payments are auto-completed, but ensure it's captured)
              await axios.post(
                `${API_URL}/api/v1/orders/${order.id}/payments/capture`,
                { paymentId: payment.id },
                { headers: { Authorization: `Bearer ${accessToken}` } },
              );
            } catch (captureError) {
              // Payment might already be completed, that's okay
              console.log('Payment capture:', captureError);
            }
          }

          toast.success(`Payment confirmed! Order: ${order.orderNumber || orderUuid}`);
          
          // Show customer display
          setCustomerDisplayVisible(true);
          setLastCompletedOrderId(order.id);
          
          // Generate and print receipt
          await handleReceiptPrint(order.id);

          // Auto-hide customer display after 10 seconds
          setTimeout(() => {
            setCustomerDisplayVisible(false);
            clearCart();
          }, 10000);
        } else if (payment.status === 'pending' || payment.status === 'processing') {
          // Payment is pending - show confirmation button
          toast.loading('Payment processing...', { id: 'payment-processing' });
          setLastCompletedOrderId(order.id);
          // Wait a moment then show receipt options
          setTimeout(() => {
            toast.dismiss('payment-processing');
            setReceiptOptionsOpen(true);
          }, 2000);
        } else {
          toast.error(`Payment ${payment.status}: ${payment.error || 'Unknown error'}`);
        }
      } catch (error: any) {
        // If offline or network error, queue order for sync
        if (!navigator.onLine || error.code === 'ERR_NETWORK' || error.response?.status >= 500) {
          isOffline = true;
          
          // Queue order for offline sync
          await syncService.queueOrder({
            uuid: orderUuid,
            locationId: user.locationId!,
            items: mapCartToOrderItems(cart),
            subtotalCents: subtotal,
            taxCents: tax,
            discountCents: totalDiscountCents,
            totalCents: totalAmount,
            deviceId,
          });

          toast.success(
            `Order queued for sync (${orderUuid.substring(0, 8)}...). Will sync when online.`,
            { duration: 5000 }
          );
          clearCart();
        } else {
          // Other errors (validation, auth, etc.)
          throw error;
        }
      }
    } catch (error: any) {
      if (!isOffline) {
        const errorMessage = error.response?.data?.message || error.message || 'Payment failed';
        
        // User-friendly error messages
        let friendlyMessage = errorMessage;
        if (error.response?.status === 400) {
          // Check for validation errors
          const validationErrors = error.response?.data?.message;
          if (validationErrors?.includes('locationId') || validationErrors?.includes('location')) {
            friendlyMessage = 'Location ID is required. Please set your location in Settings or contact your administrator.';
          } else if (validationErrors?.includes('uuid') || validationErrors?.includes('UUID')) {
            friendlyMessage = 'Invalid order ID. Please try again.';
          } else {
            friendlyMessage = validationErrors || 'Invalid request. Please check your input and try again.';
          }
        } else if (error.response?.status === 401) {
          friendlyMessage = 'Session expired. Please log in again.';
        } else if (error.response?.status === 403) {
          friendlyMessage = 'You do not have permission to perform this action.';
        } else if (error.response?.status === 404) {
          friendlyMessage = 'Product or order not found. Please try again.';
        } else if (error.response?.status === 422) {
          friendlyMessage = 'Invalid payment information. Please check and try again.';
        } else if (error.response?.status >= 500) {
          friendlyMessage = 'Server error. Please try again in a moment.';
        } else if (error.code === 'ERR_NETWORK') {
          friendlyMessage = 'Network error. Check your connection and try again.';
        }
        
        toast.error(friendlyMessage, {
          duration: 5000,
          icon: '❌',
        });
      }
    } finally {
      setIsProcessing(false);
      setPaymentModalOpen(false);
      setSelectedPaymentMethod(null);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden theme-background">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className={`absolute -top-32 -right-24 h-80 w-80 rounded-full ${glowStyles.topRight} blur-[160px]`} />
        <div className={`absolute -bottom-44 -left-40 h-[420px] w-[420px] rounded-full ${glowStyles.bottomLeft} blur-[200px]`} />
        <div className={`absolute top-1/2 left-[40%] h-64 w-64 -translate-y-1/2 rounded-full ${glowStyles.center} blur-[160px]`} />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header */}
        <header className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
          <div className="theme-card flex flex-col gap-8 rounded-3xl border p-6 backdrop-blur-2xl lg:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
              <BrandMark
                size={52}
                backgroundClassName="bg-white/90 dark:bg-white/10"
                className="ring-1 ring-slate-200/40 dark:ring-white/10"
              />
              <div className="flex-1 space-y-3">
                <p className="theme-text-secondary text-xs uppercase tracking-[0.4em]">POS Checkout</p>
                <h1 className="theme-text-primary text-2xl font-semibold tracking-tight sm:text-3xl">
                  {user?.name ? `Welcome back, ${user.name.split(' ')[0]}` : 'Welcome to Checkout'}
                </h1>
                <p className="theme-text-secondary text-sm leading-relaxed">
                  {tenant?.name ? `${tenant.name} • ` : ''}
                  Keep the line moving—scan, search, and complete payments in seconds.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {statusChips.map(({ label, tone, icon }) => (
                <span
                  key={label}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold ${tone}`}
                >
                  <span className="text-base">{icon}</span>
                  {label}
                </span>
              ))}
              {(syncStatus.pendingCount > 0 || !syncStatus.isOnline) && (
                <button
                  onClick={handleManualSync}
                  disabled={syncStatus.isSyncing}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/25 disabled:opacity-50"
                >
                  <span className="text-base">{syncStatus.isSyncing ? '🔄' : '🔄'}</span>
                  {syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                to="/inventory"
                className="theme-chip group inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium transition"
              >
                <span className="text-base">📦</span>
                Inventory
                <span className="translate-x-0 text-xs transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link
                to="/customers"
                className="theme-chip group inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium transition"
              >
                <span className="text-base">👥</span>
                Customers
                <span className="translate-x-0 text-xs transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link
                to="/returns"
                className="theme-chip group inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium transition"
              >
                <span className="text-base">↩️</span>
                Returns
                <span className="translate-x-0 text-xs transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link
                to="/reports"
                className="theme-chip group inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium transition"
              >
                <span className="text-base">📈</span>
                Reports
                <span className="translate-x-0 text-xs transition-transform group-hover:translate-x-1">→</span>
              </Link>
              {isAdmin && (
                <Link
                  to="/settings"
                  className="theme-chip group inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium transition"
                >
                  <span className="text-base">⚙️</span>
                  Settings
                  <span className="translate-x-0 text-xs transition-transform group-hover:translate-x-1">→</span>
                </Link>
              )}
              {isPlatformAdmin && (
                <Link
                  to="/superadmin/dashboard"
                  className="theme-chip group inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium transition"
                >
                  <span className="text-base">🏢</span>
                  Super Admin
                  <span className="translate-x-0 text-xs transition-transform group-hover:translate-x-1">→</span>
                </Link>
              )}
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-400 via-pink-500 to-rose-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_30px_70px_-40px_rgba(244,114,182,0.8)] transition hover:shadow-[0_30px_80px_-35px_rgba(244,114,182,1)]"
              >
                Logout
              </button>
              <ThemeToggle />
              <KeyboardShortcutsHelp />
            </div>
          </div>
        </header>

        <div className="mx-auto mt-6 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <OnboardingBanner locationId={user?.locationId} />
        </div>

        {/* Main Content */}
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 pb-12 pt-6 sm:px-6 lg:px-8 xl:flex-row">
          {/* Left Panel - Scanner & Products */}
          <div className="order-2 flex-1 space-y-6 xl:order-1">
            <div className="theme-card rounded-3xl border p-5 backdrop-blur-xl sm:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="theme-text-primary text-xl font-semibold sm:text-2xl">Scanner console</h2>
                  <p className="theme-text-secondary mt-2 text-sm leading-relaxed">
                    Use your scanner or search catalogue to add items instantly. Camera and Bluetooth devices are supported.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm theme-text-secondary">
                  <div className="rounded-full border border-white/10 px-4 py-1">
                    <span className="theme-text-primary font-semibold">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>{' '}
                    units in cart
                  </div>
                  <div className="hidden h-6 w-px bg-white/10 md:block" />
                  <div className="theme-chip flex items-center gap-2 rounded-full border px-3 py-1">
                    <span className="text-base">⚡</span>
                    <span>Real-time sync enabled</span>
                  </div>
                </div>
              </div>

              {showCamera && (
                <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/40 p-4 shadow-inner shadow-black/40 sm:p-5">
                  <Suspense
                    fallback={
                      <div className="flex h-36 items-center justify-center text-xs uppercase tracking-[0.4em] text-slate-400/80">
                        Loading camera…
                      </div>
                    }
                  >
                    <CameraScanner onScan={handleScan} isOpen={showCamera} onClose={() => setShowCamera(false)} />
                  </Suspense>
                </div>
              )}
            </div>

            {/* USB/Bluetooth Scanner Console */}
            <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-4">
                <div>
                  <h2 className="theme-text-primary text-xl font-semibold">Barcode Scanner</h2>
                  <p className="theme-text-secondary text-sm">
                    Scan barcodes using USB/Bluetooth scanners or type barcode and press Enter.
                  </p>
                </div>
              </div>
              <Suspense
                fallback={
                  <div className="flex h-36 items-center justify-center text-xs uppercase tracking-[0.4em] text-slate-400/80">
                    Loading scanner…
                  </div>
                }
              >
                <ScannerInput onScan={handleScan} />
              </Suspense>
            </div>
            <Suspense
              fallback={
                <div className="theme-card rounded-3xl border p-6 text-xs uppercase tracking-[0.4em] text-slate-400/80">
                  Loading devices…
                </div>
              }
            >
              <ScannerDeviceList />
            </Suspense>
          </div>

          {/* Right Panel - Cart */}
          <div className="order-1 theme-card w-full rounded-3xl border p-5 backdrop-blur-xl sm:p-6 xl:order-2 xl:w-[360px]">
            <CartSummary
              cart={cart}
              total={total}
              onRemove={removeItem}
              onUpdateQuantity={updateQuantity}
              onPayment={handlePayment}
              isProcessing={isProcessing}
            />
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

      {/* Split Payment Modal */}
      <SplitPaymentModal
        isOpen={splitPaymentModalOpen}
        orderId={currentOrderId}
        totalCents={total}
        accessToken={accessToken}
        onClose={() => {
          setSplitPaymentModalOpen(false);
          setCurrentOrderId(null);
        }}
        onComplete={async () => {
            // Order is fully paid
          if (currentOrderId) {
            setLastCompletedOrderId(currentOrderId);
            setCustomerDisplayVisible(true);
            
            // Generate and print receipt
            await handleReceiptPrint(currentOrderId);
            
            clearCart();
            setSelectedCustomer(null);
            setSplitPaymentModalOpen(false);
            setCurrentOrderId(null);
          }
        }}
      />

      {/* Discount Modal */}
      <DiscountModal
        isOpen={discountModalOpen}
        item={discountingItem}
        cartTotal={total}
        onClose={() => {
          setDiscountModalOpen(false);
          setDiscountingItem(null);
        }}
        onApplyItemDiscount={(productId, discountCents) => {
          updateItemDiscount(productId, discountCents);
        }}
        onApplyCartDiscount={(discountCents, discountPercent, reason) => {
          setCartDiscount(discountCents, discountPercent, reason);
        }}
      />

      {/* Price Override Modal */}
      <PriceOverrideModal
        isOpen={priceOverrideModalOpen}
        productName={overridingProduct?.name || ''}
        currentPriceCents={overridingProduct?.priceCents || 0}
        onClose={() => {
          setPriceOverrideModalOpen(false);
          setOverridingProduct(null);
        }}
        onConfirm={async (newPriceCents: number, _managerPin: string) => {
          if (!overridingProduct || !accessToken) return false;
          
          try {
            // Update product price in backend
            await axios.patch(
              `${API_URL}/api/v1/products/${overridingProduct.id}`,
              { priceCents: newPriceCents },
              { headers: { Authorization: `Bearer ${accessToken}` } },
            );
            
            // Update price in cart if item is already in cart
            const cartItem = cart.find((item) => item.productId === overridingProduct.id);
            if (cartItem) {
              // Update the cart item with new price
              removeItem(overridingProduct.id);
              addItem({
                productId: overridingProduct.id,
                name: overridingProduct.name,
                priceCents: newPriceCents,
                taxRate: cartItem.taxRate,
                quantity: cartItem.quantity,
              });
            }
            
            toast.success(`Price updated to ₦${(newPriceCents / 100).toFixed(2)}`);
            return true;
          } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update price');
            return false;
          }
        }}
      />

      {/* Customer Display */}
      <CustomerDisplay
        cart={cart}
        total={total}
        isVisible={customerDisplayVisible}
        paymentMethod={selectedPaymentMethod}
        change={cashChange}
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

      {/* Receipt Options Button */}
      {lastCompletedOrderId && !customerDisplayVisible && (
        <button
          onClick={() => setReceiptOptionsOpen(true)}
          className="fixed bottom-6 right-6 z-30 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 text-white shadow-lg transition hover:shadow-xl touch-manipulation"
          aria-label="Receipt options"
        >
          <span className="text-xl">🧾</span>
          <span className="ml-2 font-semibold">Receipt</span>
        </button>
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