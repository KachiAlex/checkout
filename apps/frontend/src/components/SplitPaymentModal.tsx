import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_URL } from '../config';
import { formatCurrency, formatNumber, parseFormattedNumber, handleNumberInputChange } from '../utils/numberFormat';

interface Payment {
  id: string;
  method: 'cash' | 'card' | 'qr';
  amountCents: number;
  status: string;
}

interface SplitPaymentModalProps {
  isOpen: boolean;
  orderId: string | null;
  totalCents: number;
  accessToken: string | null;
  onClose: () => void;
  onComplete: () => void;
}

export function SplitPaymentModal({
  isOpen,
  orderId,
  totalCents,
  accessToken,
  onClose,
  onComplete,
}: SplitPaymentModalProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'card' | 'qr' | null>(null);
  const [cashAmount, setCashAmount] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && orderId && accessToken) {
      loadPayments();
    }
  }, [isOpen, orderId, accessToken]);

  const loadPayments = async () => {
    if (!orderId || !accessToken) return;
    try {
      const response = await axios.get(`${API_URL}/api/v1/orders/${orderId}/payments`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setPayments(response.data || []);
    } catch (error) {
      console.error('Failed to load payments:', error);
    }
  };

  const getTotalPaid = () => {
    return payments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + p.amountCents, 0);
  };

  const getRemaining = () => {
    return totalCents - getTotalPaid();
  };

  const handleAddPayment = async () => {
    if (!orderId || !accessToken || !selectedMethod) return;

    const amount = selectedMethod === 'cash' 
      ? parseFormattedNumber(cashAmount) * 100 
      : parseFormattedNumber(paymentAmount) * 100;

    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const remaining = getRemaining();
    if (amount > remaining) {
      toast.error(`Amount exceeds remaining balance of ${formatCurrency(remaining)}`);
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/api/v1/orders/${orderId}/payments/initiate`,
        {
          method: selectedMethod,
          amount: Math.round(amount),
        },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      toast.success('Payment added');
      setSelectedMethod(null);
      setCashAmount('');
      setPaymentAmount('');
      await loadPayments();

      // Check if fully paid
      const newRemaining = getRemaining() - amount;
      if (newRemaining <= 0) {
        toast.success('Order fully paid!');
        setTimeout(() => {
          onComplete();
        }, 1000);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add payment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !orderId) return null;

  const totalPaid = getTotalPaid();
  const remaining = getRemaining();
  const isFullyPaid = remaining <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="theme-card w-full max-w-2xl rounded-3xl border p-8 shadow-2xl">
        <div className="mb-6">
          <h2 className="theme-text-primary text-2xl font-bold mb-2">Split Payment</h2>
          <p className="theme-text-secondary text-sm">Add multiple payment methods for this order</p>
        </div>

        {/* Payment Summary */}
        <div className="mb-6 space-y-3">
          <div className="theme-surface rounded-2xl border p-4">
            <div className="flex justify-between text-sm theme-text-secondary mb-2">
              <span>Total Amount</span>
              <span className="theme-text-primary font-semibold">{formatCurrency(totalCents)}</span>
            </div>
            <div className="flex justify-between text-sm theme-text-secondary mb-2">
              <span>Total Paid</span>
              <span className="font-semibold text-emerald-400">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="theme-divider my-3 h-px" />
            <div className="flex items-center justify-between">
              <span className="theme-text-primary text-lg font-semibold">Remaining</span>
              <span className={`text-2xl font-bold ${isFullyPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                {formatCurrency(remaining)}
              </span>
            </div>
          </div>

          {/* Existing Payments */}
          {payments.length > 0 && (
            <div className="theme-surface rounded-2xl border p-4">
              <h3 className="theme-text-primary font-semibold mb-3">Payments Made</h3>
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-lg bg-white/5 p-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span>
                        {payment.method === 'cash' ? '💵' : payment.method === 'card' ? '💳' : '📱'}
                      </span>
                      <span className="theme-text-primary capitalize">{payment.method}</span>
                      <span className={`text-xs ${
                        payment.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                    <span className="theme-text-primary font-semibold">
                      {formatCurrency(payment.amountCents)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Payment */}
          {!isFullyPaid && (
            <div className="theme-surface rounded-2xl border p-4">
              <h3 className="theme-text-primary font-semibold mb-3">Add Payment</h3>
              
              {!selectedMethod ? (
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setSelectedMethod('cash')}
                    className="rounded-xl border border-white/20 bg-transparent p-4 text-center transition hover:bg-white/5"
                  >
                    <div className="text-3xl mb-2">💵</div>
                    <div className="text-sm font-semibold theme-text-primary">Cash</div>
                  </button>
                  <button
                    onClick={() => setSelectedMethod('card')}
                    className="rounded-xl border border-white/20 bg-transparent p-4 text-center transition hover:bg-white/5"
                  >
                    <div className="text-3xl mb-2">💳</div>
                    <div className="text-sm font-semibold theme-text-primary">Card</div>
                  </button>
                  <button
                    onClick={() => setSelectedMethod('qr')}
                    className="rounded-xl border border-white/20 bg-transparent p-4 text-center transition hover:bg-white/5"
                  >
                    <div className="text-3xl mb-2">📱</div>
                    <div className="text-sm font-semibold theme-text-primary">QR</div>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium theme-text-secondary mb-2">
                      Amount ({selectedMethod === 'cash' ? 'Cash Received' : 'Payment Amount'})
                    </label>
                    <input
                      type="text"
                      value={selectedMethod === 'cash' ? cashAmount : paymentAmount}
                      onChange={(e) => {
                        const { displayValue } = handleNumberInputChange(e.target.value, true);
                        if (selectedMethod === 'cash') {
                          setCashAmount(displayValue);
                        } else {
                          setPaymentAmount(displayValue);
                        }
                      }}
                      placeholder="0.00"
                      className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-xl font-semibold theme-text-primary focus:border-sky-400 focus:outline-none"
                      autoFocus
                    />
                    <p className="mt-1 text-xs theme-text-secondary">
                      Max: {formatCurrency(remaining)}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedMethod(null);
                        setCashAmount('');
                        setPaymentAmount('');
                      }}
                      className="flex-1 rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold theme-text-primary transition hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddPayment}
                      disabled={loading || (selectedMethod === 'cash' ? !cashAmount : !paymentAmount)}
                      className="flex-1 rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-400 px-4 py-2 text-sm font-semibold text-sky-950 shadow-lg transition hover:shadow-sky-900/70 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : 'Add Payment'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isFullyPaid && (
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 p-4 text-center">
              <p className="text-lg font-semibold text-emerald-200">✅ Order Fully Paid!</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-white/20 bg-transparent px-6 py-3 font-semibold theme-text-primary transition hover:bg-white/5"
          >
            {isFullyPaid ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

