import { CartItem } from '../stores/cartStore';

interface CartSummaryProps {
  cart: CartItem[];
  total: number;
  onRemove: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onPayment: (method: 'card' | 'cash' | 'qr') => void;
  isProcessing: boolean;
}

export function CartSummary({
  cart,
  total,
  onRemove,
  onUpdateQuantity,
  onPayment,
  isProcessing,
}: CartSummaryProps) {
  const subtotal = cart.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const tax = cart.reduce((sum, item) => sum + item.priceCents * item.quantity * item.taxRate, 0);

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Cart Header */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-sky-500/35 via-blue-500/25 to-indigo-500/30 px-5 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Shopping cart</h2>
            <p className="text-xs uppercase tracking-[0.35em] text-blue-100/80">
              {cart.length} item{cart.length === 1 ? '' : 's'} selected
            </p>
          </div>
          <div className="rounded-full border border-white/30 bg-white/30 px-3 py-1 text-xs font-medium text-white">
            ₦{(total / 100).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-1 theme-text-primary">
        {cart.length === 0 ? (
          <div className="theme-surface flex flex-col items-center justify-center rounded-2xl border border-dashed py-12 text-center">
            <div className="text-3xl">🛒</div>
            <p className="theme-text-primary mt-3 text-lg font-semibold">Cart is empty</p>
            <p className="theme-text-secondary mt-1 text-sm">Scan or search for products to add them here.</p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.productId}
              className="theme-surface rounded-2xl border p-4 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.5)] transition hover:border-white/25"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="theme-text-primary text-sm font-semibold">{item.name}</h3>
                  <p className="theme-text-secondary mt-1 text-xs">₦{(item.priceCents / 100).toFixed(2)} each</p>
                </div>
                <button
                  onClick={() => onRemove(item.productId)}
                  className="rounded-full border border-rose-400/40 bg-rose-500/15 px-2 py-1 text-xs font-semibold text-rose-200 transition hover:border-rose-400/70 hover:bg-rose-500/25 hover:text-rose-100"
                  title="Remove item"
                >
                  Remove
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                    className="theme-chip flex h-10 w-10 items-center justify-center rounded-full border text-lg font-semibold transition hover:border-white/30 hover:bg-white/20 disabled:opacity-40"
                    disabled={item.quantity <= 1}
                  >
                    −
                  </button>
                  <span className="theme-text-primary w-12 text-center text-lg font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                    className="theme-chip flex h-10 w-10 items-center justify-center rounded-full border text-lg font-semibold transition hover:border-white/30 hover:bg-white/20"
                  >
                    +
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-base font-semibold text-sky-400">
                    ₦{((item.priceCents * item.quantity) / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Totals */}
      <div className="theme-surface space-y-3 rounded-2xl border p-5 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.5)]">
        <div className="flex justify-between text-sm theme-text-secondary">
          <span>Subtotal</span>
          <span className="theme-text-primary font-semibold">₦{(subtotal / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm theme-text-secondary">
          <span>Tax</span>
          <span className="theme-text-primary font-semibold">₦{(tax / 100).toFixed(2)}</span>
        </div>
        <div className="theme-divider h-px" />
        <div className="flex items-center justify-between text-lg font-semibold theme-text-primary">
          <span>Total due</span>
          <span className="text-2xl text-sky-400">₦{(total / 100).toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Buttons */}
      <div className="space-y-3">
        <button
          onClick={() => onPayment('cash')}
          disabled={cart.length === 0 || isProcessing}
          className="w-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-6 py-4 text-lg font-semibold text-emerald-950 shadow-lg shadow-emerald-900/50 transition hover:shadow-emerald-900/70 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing ? 'Processing...' : '💵 Pay with Cash'}
        </button>
        <button
          onClick={() => onPayment('card')}
          disabled={cart.length === 0 || isProcessing}
          className="w-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-slate-900/60 transition hover:shadow-slate-900/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing ? 'Processing...' : '💳 Pay with Card'}
        </button>
        <button
          onClick={() => onPayment('qr')}
          disabled={cart.length === 0 || isProcessing}
          className="w-full rounded-full bg-gradient-to-r from-fuchsia-400 via-purple-500 to-indigo-500 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-purple-900/60 transition hover:shadow-purple-900/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing ? 'Processing...' : '📱 Pay with QR'}
        </button>
      </div>
    </div>
  );
}