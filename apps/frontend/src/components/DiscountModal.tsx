import { useState } from 'react';
import { CartItem } from '../stores/cartStore';

interface DiscountModalProps {
  isOpen: boolean;
  item: CartItem | null;
  cartTotal: number;
  onClose: () => void;
  onApplyItemDiscount: (productId: string, discountCents: number) => void;
  onApplyCartDiscount: (discountCents: number, discountPercent: number, reason: string) => void;
}

export function DiscountModal({
  isOpen,
  item,
  cartTotal,
  onClose,
  onApplyItemDiscount,
  onApplyCartDiscount,
}: DiscountModalProps) {
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountValue, setDiscountValue] = useState('');
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const isItemDiscount = item !== null;
  const maxDiscount = isItemDiscount 
    ? item.priceCents * item.quantity 
    : cartTotal;

  const handleApply = () => {
    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) {
      return;
    }

    if (isItemDiscount) {
      const discountCents = discountType === 'amount' 
        ? Math.round(value * 100)
        : Math.round((item.priceCents * item.quantity * value) / 100);
      
      if (discountCents > maxDiscount) {
        return;
      }
      
      onApplyItemDiscount(item.productId, discountCents);
    } else {
      const discountCents = discountType === 'amount'
        ? Math.round(value * 100)
        : 0;
      const discountPercent = discountType === 'percent'
        ? value
        : 0;
      
      if (discountType === 'amount' && discountCents > maxDiscount) {
        return;
      }
      if (discountType === 'percent' && value > 100) {
        return;
      }
      
      onApplyCartDiscount(discountCents, discountPercent, reason);
    }
    
    setDiscountValue('');
    setReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="theme-card w-full max-w-md rounded-3xl border p-6 shadow-2xl">
        <h2 className="theme-text-primary text-xl font-semibold mb-4">
          {isItemDiscount ? `Discount: ${item.name}` : 'Cart Discount'}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium theme-text-secondary mb-2">
              Discount Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDiscountType('amount')}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                  discountType === 'amount'
                    ? 'border-sky-400 bg-sky-500/15 text-sky-200'
                    : 'border-white/20 bg-transparent theme-text-primary'
                }`}
              >
                Amount (₦)
              </button>
              <button
                onClick={() => setDiscountType('percent')}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                  discountType === 'percent'
                    ? 'border-sky-400 bg-sky-500/15 text-sky-200'
                    : 'border-white/20 bg-transparent theme-text-primary'
                }`}
              >
                Percentage (%)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium theme-text-secondary mb-2">
              {discountType === 'amount' ? 'Discount Amount (₦)' : 'Discount Percentage (%)'}
            </label>
            <input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === 'amount' ? '0.00' : '0'}
              className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-lg font-semibold theme-text-primary focus:border-sky-400 focus:outline-none"
              autoFocus
              min="0"
              step={discountType === 'amount' ? '0.01' : '1'}
              max={discountType === 'amount' ? maxDiscount / 100 : (isItemDiscount ? 100 : 100)}
            />
            <p className="mt-1 text-xs theme-text-secondary">
              Max: {discountType === 'amount' 
                ? `₦${(maxDiscount / 100).toFixed(2)}`
                : '100%'}
            </p>
          </div>

          {!isItemDiscount && (
            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-2">
                Reason (Optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Customer loyalty, Promo code"
                className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-full border border-white/20 bg-transparent px-4 py-3 text-sm font-semibold theme-text-primary transition hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!discountValue || parseFloat(discountValue) <= 0}
              className="flex-1 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-4 py-3 text-sm font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply Discount
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

