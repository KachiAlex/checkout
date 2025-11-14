import { useState, lazy, Suspense, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { CartSummary } from '../components/CartSummary';
import { OnboardingBanner } from '../components/OnboardingBanner';
import { ProductSearch } from '../components/ProductSearch';
import { ThemeToggle } from '../components/ThemeToggle';
import { BrandMark } from '../components/BrandMark';
import { useThemeStore } from '../stores/themeStore';
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

const BarcodeScanner = lazy(() =>
  import('../components/BarcodeScanner').then((module) => ({
    default: module.BarcodeScanner,
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
  const { cart, clearCart, addItem, removeItem, updateQuantity, getTotal } = useCartStore();
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

  const statusChips: StatusChip[] = [
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
  ].filter((chip): chip is StatusChip => Boolean(chip));

  const glowTopRight = theme === 'light' ? 'bg-sky-300/40' : 'bg-cyan-500/30';
  const glowBottomLeft = theme === 'light' ? 'bg-indigo-200/35' : 'bg-indigo-500/25';
  const glowCenter = theme === 'light' ? 'bg-emerald-200/30' : 'bg-emerald-400/10';

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

        addItem({
          productId: product.id,
          name: product.name,
          priceCents: product.priceCents,
          taxRate: product.taxRate,
          quantity: 1,
        });
        toast.success(`Added: ${product.name} (Stock: ${stock})`);
      } else {
        toast.error(`Product not found: ${barcode}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to find product');
    }
  };

  const handlePayment = async (method: 'card' | 'cash' | 'qr') => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (!accessToken || !user) {
      toast.error('Not authenticated');
      return;
    }

    setIsProcessing(true);

    try {
      // Calculate totals
      const subtotal = cart.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
      const tax = cart.reduce((sum, item) => {
        const itemSubtotal = item.priceCents * item.quantity;
        return sum + itemSubtotal * item.taxRate;
      }, 0);
      const totalAmount = subtotal + tax;

      // Create order UUID
      const orderUuid = generateUUID();
      const deviceId = localStorage.getItem('deviceId') || undefined;

      // Try to create order online first
      let order;
      let isOffline = false;

      try {
        const orderResponse = await axios.post(
          `${API_URL}/api/v1/orders`,
          {
            uuid: orderUuid,
            locationId: user.locationId,
            items: cart.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              priceCents: item.priceCents,
              taxCents: item.priceCents * item.quantity * item.taxRate,
            })),
            subtotalCents: subtotal,
            taxCents: tax,
            discountCents: 0,
            totalCents: totalAmount,
            deviceId,
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
        );

        const payment = paymentResponse.data;

        if (payment.status === 'completed') {
          toast.success(`Payment successful! Order: ${order.orderNumber || orderUuid}`);
          
          // Generate and print receipt
          try {
            // Try to print receipt automatically
            const printAvailable = await receiptService.isAvailable();
            if (printAvailable) {
              const printSuccess = await receiptService.printReceipt(order.id);
              if (printSuccess) {
                toast.success('Receipt printed');
              } else {
                // Fallback: just get receipt text
                const receipt = await receiptService.getReceipt(order.id);
                console.log('Receipt:', receipt);
                toast.success('Receipt generated (print failed)');
              }
            } else {
              // Print proxy not available, just get receipt
              const receipt = await receiptService.getReceipt(order.id);
              console.log('Receipt:', receipt);
              toast.success('Receipt generated');
            }
          } catch (receiptError) {
            console.warn('Failed to generate/print receipt:', receiptError);
            toast.error('Receipt generation failed');
          }

          clearCart();
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
            items: cart.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              priceCents: item.priceCents,
              taxCents: item.priceCents * item.quantity * item.taxRate,
            })),
            subtotalCents: subtotal,
            taxCents: tax,
            discountCents: 0,
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
        toast.error(error.response?.data?.message || error.message || 'Payment failed');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden theme-background">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className={`absolute -top-32 -right-24 h-80 w-80 rounded-full ${glowTopRight} blur-[160px]`} />
        <div className={`absolute -bottom-44 -left-40 h-[420px] w-[420px] rounded-full ${glowBottomLeft} blur-[200px]`} />
        <div className={`absolute top-1/2 left-[40%] h-64 w-64 -translate-y-1/2 rounded-full ${glowCenter} blur-[160px]`} />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header */}
        <header className="mx-auto w-full max-w-7xl px-6 pt-12">
          <div className="theme-card flex flex-col gap-6 rounded-3xl border p-6 backdrop-blur-2xl md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <BrandMark
                size={56}
                backgroundClassName="bg-white/90 dark:bg-white/10"
                className="ring-1 ring-slate-200/40 dark:ring-white/10"
              />
              <div className="space-y-2">
                <p className="theme-text-secondary text-xs uppercase tracking-[0.4em]">POS Checkout</p>
                <h1 className="theme-text-primary text-3xl font-semibold tracking-tight">
                  {user?.name ? `Welcome back, ${user.name.split(' ')[0]}` : 'Welcome to Checkout'}
                </h1>
                <p className="theme-text-secondary text-sm">
                  {tenant?.name ? `${tenant.name} • ` : ''}
                  Keep the line moving—scan, search, and complete payments in seconds.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {statusChips.map(({ label, tone, icon }) => (
                <span
                  key={label}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold ${tone}`}
                >
                  <span className="text-base">{icon}</span>
                  {label}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/inventory"
                className="theme-chip group inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium transition"
              >
                <span className="text-base">📦</span>
                Inventory
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
            </div>
          </div>
        </header>

        <div className="mx-auto mt-6 w-full max-w-7xl px-6">
          <OnboardingBanner locationId={user?.locationId} />
        </div>

        {/* Main Content */}
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 pb-12 pt-8 xl:flex-row">
          {/* Left Panel - Scanner & Products */}
          <div className="flex-1 space-y-6">
            <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="theme-text-primary text-xl font-semibold">Scanner console</h2>
                  <p className="theme-text-secondary text-sm">
                    Use your scanner or search catalogue to add items instantly. Camera and Bluetooth devices are supported.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm theme-text-secondary">
                  <div>
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

              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/40 p-5 shadow-inner shadow-black/40">
                <Suspense
                  fallback={
                    <div className="flex h-36 items-center justify-center text-xs uppercase tracking-[0.4em] text-slate-400/80">
                      Loading scanner…
                    </div>
                  }
                >
                  <BarcodeScanner onScan={handleScan} />
                </Suspense>
              </div>
            </div>

            <ProductSearch onAddToCart={addItem} />
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
          <div className="theme-card w-full rounded-3xl border p-6 backdrop-blur-xl xl:w-[360px]">
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
    </div>
  );
}