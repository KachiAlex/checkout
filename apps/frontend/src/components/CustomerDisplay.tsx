import { CartItem } from '../stores/cartStore';

interface CustomerDisplayProps {
  cart: CartItem[];
  total: number;
  isVisible: boolean;
  paymentMethod?: 'card' | 'cash' | 'qr' | null;
  change?: number;
}

export function CustomerDisplay({ cart, total, isVisible, paymentMethod, change }: CustomerDisplayProps) {
  if (!isVisible) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const tax = cart.reduce((sum, item) => sum + item.priceCents * item.quantity * item.taxRate, 0);

  const getPaymentMethodIcon = () => {
    switch (paymentMethod) {
      case 'cash':
        return '💵';
      case 'card':
        return '💳';
      case 'qr':
        return '📱';
      default:
        return '💰';
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="flex h-full w-full max-w-4xl flex-col items-center justify-center space-y-8 text-white">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight">Thank You!</h1>
          <p className="mt-2 text-2xl text-slate-300">Your Order Summary</p>
        </div>

        {/* Items List */}
        <div className="w-full max-w-2xl space-y-4">
          <h2 className="text-3xl font-semibold">Items</h2>
          <div className="space-y-3 rounded-2xl bg-white/10 p-6 backdrop-blur-xl">
            {cart.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between border-b border-white/10 pb-3 last:border-0"
              >
                <div className="flex-1">
                  <p className="text-2xl font-semibold">{item.name}</p>
                  <p className="text-xl text-slate-300">
                    {item.quantity} × ₦{(item.priceCents / 100).toFixed(2)}
                  </p>
                </div>
                <p className="text-2xl font-bold text-emerald-300">
                  ₦{((item.priceCents * item.quantity) / 100).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="w-full max-w-2xl space-y-4">
          <div className="flex items-center justify-between rounded-2xl bg-white/10 p-6 backdrop-blur-xl">
            <span className="text-2xl text-slate-300">Subtotal</span>
            <span className="text-3xl font-semibold">₦{(subtotal / 100).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/10 p-6 backdrop-blur-xl">
            <span className="text-2xl text-slate-300">Tax</span>
            <span className="text-3xl font-semibold">₦{(tax / 100).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-500/20 to-blue-500/20 p-8 backdrop-blur-xl">
            <span className="text-3xl font-semibold">Total</span>
            <span className="text-5xl font-bold text-emerald-300">₦{(total / 100).toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Method */}
        {paymentMethod && (
          <div className="flex items-center gap-4 rounded-2xl bg-white/10 p-6 backdrop-blur-xl">
            <span className="text-4xl">{getPaymentMethodIcon()}</span>
            <div>
              <p className="text-xl text-slate-300">Payment Method</p>
              <p className="text-2xl font-semibold capitalize">{paymentMethod}</p>
            </div>
          </div>
        )}

        {/* Change */}
        {change !== undefined && change > 0 && (
          <div className="rounded-2xl bg-emerald-500/20 p-6 backdrop-blur-xl">
            <p className="text-2xl text-slate-300">Change</p>
            <p className="text-4xl font-bold text-emerald-300">₦{(change / 100).toFixed(2)}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center">
          <p className="text-xl text-slate-400">Please take your receipt</p>
          <p className="mt-2 text-lg text-slate-500">Thank you for your purchase!</p>
        </div>
      </div>
    </div>
  );
}

