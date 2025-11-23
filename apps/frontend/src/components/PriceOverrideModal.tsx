import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_URL } from '../config';
import { useAuthStore } from '../stores/authStore';

interface PriceOverrideModalProps {
  isOpen: boolean;
  productName: string;
  currentPriceCents: number;
  onClose: () => void;
  onConfirm: (newPriceCents: number, managerPin: string) => Promise<boolean>;
}

export function PriceOverrideModal({
  isOpen,
  productName,
  currentPriceCents,
  onClose,
  onConfirm,
}: PriceOverrideModalProps) {
  const { accessToken } = useAuthStore();
  const [newPrice, setNewPrice] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  if (!isOpen) return null;

  const handleVerifyPin = async () => {
    if (!managerPin) {
      toast.error('Please enter manager PIN');
      return;
    }

    setVerifying(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/v1/auth/verify-manager`,
        { pin: managerPin },
        { headers: { Authorization: `Bearer ${accessToken || ''}` } },
      );
      
      if (response.data.authorized) {
        setVerified(true);
        toast.success('Manager PIN verified');
      } else {
        toast.error(response.data.message || 'Invalid manager PIN');
        setManagerPin('');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to verify PIN');
      setManagerPin('');
    } finally {
      setVerifying(false);
    }
  };

  const handleConfirm = async () => {
    if (!verified) {
      toast.error('Please verify manager PIN first');
      return;
    }

    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) {
      toast.error('Please enter a valid price');
      return;
    }

    const newPriceCents = Math.round(price * 100);
    const success = await onConfirm(newPriceCents, managerPin);
    
    if (success) {
      setNewPrice('');
      setManagerPin('');
      setVerified(false);
      onClose();
    }
  };

  const handleClose = () => {
    setNewPrice('');
    setManagerPin('');
    setVerified(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="theme-card w-full max-w-md rounded-3xl border p-6 shadow-2xl">
        <h2 className="theme-text-primary text-xl font-semibold mb-4">Price Override</h2>

        <div className="space-y-4">
          <div>
            <p className="text-sm theme-text-secondary mb-1">Product</p>
            <p className="theme-text-primary font-semibold">{productName}</p>
          </div>

          <div>
            <p className="text-sm theme-text-secondary mb-1">Current Price</p>
            <p className="theme-text-primary text-lg font-semibold">₦{(currentPriceCents / 100).toFixed(2)}</p>
          </div>

          {!verified ? (
            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-2">
                Manager PIN *
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={managerPin}
                  onChange={(e) => setManagerPin(e.target.value)}
                  placeholder="Enter manager PIN"
                  className="flex-1 theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleVerifyPin();
                    }
                  }}
                />
                <button
                  onClick={handleVerifyPin}
                  disabled={verifying || !managerPin}
                  className="rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-400 px-6 py-3 text-base font-semibold text-sky-950 shadow-lg transition hover:shadow-sky-900/70 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {verifying ? 'Verifying...' : 'Verify'}
                </button>
              </div>
              <p className="mt-2 text-xs theme-text-secondary">
                Manager or admin PIN required to override prices
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-2">
                  New Price (₦) *
                </label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-xl font-semibold theme-text-primary focus:border-sky-400 focus:outline-none"
                  autoFocus
                  min="0"
                  step="0.01"
                />
                {newPrice && !isNaN(parseFloat(newPrice)) && (
                  <p className="mt-2 text-sm theme-text-secondary">
                    Change: {parseFloat(newPrice) * 100 > currentPriceCents ? '+' : ''}
                    ₦{((parseFloat(newPrice) * 100 - currentPriceCents) / 100).toFixed(2)}
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-amber-400/40 bg-amber-500/15 p-3">
                <p className="text-xs theme-text-secondary">
                  ⚠️ Price override will be logged for audit purposes
                </p>
              </div>
            </>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 rounded-full border border-white/20 bg-transparent px-6 py-3 text-base font-semibold theme-text-primary transition hover:bg-white/5"
            >
              Cancel
            </button>
            {verified && (
              <button
                onClick={handleConfirm}
                disabled={!newPrice || isNaN(parseFloat(newPrice)) || parseFloat(newPrice) < 0}
                className="flex-1 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-6 py-3 text-base font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirm Override
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

