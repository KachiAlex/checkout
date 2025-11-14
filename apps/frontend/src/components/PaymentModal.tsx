import { useEffect, useState } from 'react';
import { CartItem } from '../stores/cartStore';

interface PaymentModalProps {
  isOpen: boolean;
  method: 'card' | 'cash' | 'qr' | null;
  total: number;
  cart: CartItem[];
  onClose: () => void;
  onComplete: (change?: number) => void;
}

export function PaymentModal({ isOpen, method, total, cart, onClose, onComplete }: PaymentModalProps) {
  const [cashAmount, setCashAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState<'input' | 'processing' | 'success' | 'error'>('input');

  useEffect(() => {
    if (isOpen) {
      setStage('input');
      setCashAmount('');
      setProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen || !method) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const tax = cart.reduce((sum, item) => sum + item.priceCents * item.quantity * item.taxRate, 0);
  const change = method === 'cash' && cashAmount ? parseFloat(cashAmount) * 100 - total : 0;

  const handleConfirm = () => {
    if (method === 'cash' && (!cashAmount || parseFloat(cashAmount) * 100 < total)) {
      return;
    }
    setProcessing(true);
    setStage('processing');
    // Call onComplete immediately to trigger actual payment processing
    // The modal will close when payment completes
    onComplete(change);
  };

  const getMethodIcon = () => {
    switch (method) {
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

  const getMethodName = () => {
    switch (method) {
      case 'cash':
        return 'Cash Payment';
      case 'card':
        return 'Card Payment';
      case 'qr':
        return 'QR Payment';
      default:
        return 'Payment';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="theme-card w-full max-w-md rounded-3xl border p-8 shadow-2xl">
        {stage === 'input' && (
          <>
            <div className="mb-6 text-center">
              <div className="mb-4 text-6xl">{getMethodIcon()}</div>
              <h2 className="theme-text-primary mb-2 text-2xl font-bold">{getMethodName()}</h2>
              <p className="theme-text-secondary text-sm">Confirm payment details</p>
            </div>

            <div className="mb-6 space-y-3">
              <div className="theme-surface rounded-2xl border p-4">
                <div className="mb-3 flex justify-between text-sm theme-text-secondary">
                  <span>Subtotal</span>
                  <span className="theme-text-primary font-semibold">₦{(subtotal / 100).toFixed(2)}</span>
                </div>
                <div className="mb-3 flex justify-between text-sm theme-text-secondary">
                  <span>Tax</span>
                  <span className="theme-text-primary font-semibold">₦{(tax / 100).toFixed(2)}</span>
                </div>
                <div className="theme-divider my-3 h-px" />
                <div className="flex items-center justify-between">
                  <span className="theme-text-primary text-lg font-semibold">Total</span>
                  <span className="text-3xl font-bold text-sky-400">₦{(total / 100).toFixed(2)}</span>
                </div>
              </div>

              {method === 'cash' && (
                <div className="theme-surface rounded-2xl border p-4">
                  <label className="theme-text-secondary mb-2 block text-sm font-medium">
                    Cash Received
                  </label>
                  <input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="0.00"
                    className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-3 text-2xl font-semibold focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                    autoFocus
                    min={total / 100}
                    step="0.01"
                  />
                  {cashAmount && parseFloat(cashAmount) * 100 >= total && (
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-500/15 px-3 py-2">
                      <span className="text-sm font-medium text-emerald-200">Change</span>
                      <span className="text-lg font-bold text-emerald-100">
                        ₦{change > 0 ? (change / 100).toFixed(2) : '0.00'}
                      </span>
                    </div>
                  )}
                  {cashAmount && parseFloat(cashAmount) * 100 < total && (
                    <p className="mt-2 text-sm text-rose-400">
                      Insufficient amount. Need ₦{((total - parseFloat(cashAmount) * 100) / 100).toFixed(2)} more.
                    </p>
                  )}
                </div>
              )}

              {method === 'card' && (
                <div className="theme-surface rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
                  <p className="theme-text-secondary text-center text-sm">
                    💳 Please insert or tap your card on the terminal
                  </p>
                </div>
              )}

              {method === 'qr' && (
                <div className="theme-surface rounded-2xl border border-purple-400/30 bg-purple-500/10 p-4">
                  <p className="theme-text-secondary text-center text-sm">
                    📱 Please scan the QR code with your mobile wallet
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="theme-chip flex-1 rounded-full border px-6 py-3 font-semibold transition hover:bg-white/10 touch-manipulation"
                aria-label="Cancel payment"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={
                  (method === 'cash' && (!cashAmount || parseFloat(cashAmount) * 100 < total)) ||
                  processing
                }
                className="flex-1 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-6 py-3 font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                aria-label="Confirm payment"
              >
                Confirm Payment
              </button>
            </div>
          </>
        )}

        {stage === 'processing' && (
          <div className="py-12 text-center">
            <div className="mb-6 flex justify-center">
              <div className="h-20 w-20 animate-spin rounded-full border-4 border-sky-400 border-t-transparent" />
            </div>
            <h3 className="theme-text-primary mb-2 text-xl font-semibold">Processing Payment...</h3>
            <p className="theme-text-secondary text-sm">Please wait while we process your payment</p>
          </div>
        )}

        {stage === 'success' && (
          <div className="py-12 text-center">
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500">
                <span className="text-4xl">✅</span>
              </div>
            </div>
            <h3 className="theme-text-primary mb-2 text-xl font-semibold">Payment Successful!</h3>
            <p className="theme-text-secondary text-sm">Your order has been processed</p>
            {method === 'cash' && change > 0 && (
              <div className="mt-4 rounded-lg bg-emerald-500/15 px-4 py-2">
                <p className="text-sm font-medium text-emerald-200">
                  Change: ₦{(change / 100).toFixed(2)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

