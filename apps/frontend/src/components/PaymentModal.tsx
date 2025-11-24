import { useEffect, useState } from 'react';
import { CartItem } from '../stores/cartStore';
import { PaymentService } from '../services/paymentService';
import toast from 'react-hot-toast';

interface PaymentModalProps {
  isOpen: boolean;
  method: 'card' | 'cash' | 'qr' | null;
  total: number;
  cart: CartItem[];
  orderId?: string; // Order ID if order is already created
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  onClose: () => void;
  onComplete: (change?: number) => void;
  onOrderCreated?: (orderId: string) => void; // Callback when order is created for payment
}

export function PaymentModal({ 
  isOpen, 
  method, 
  total, 
  cart, 
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  onClose, 
  onComplete,
  onOrderCreated,
}: PaymentModalProps) {
  const [cashAmount, setCashAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState<'input' | 'processing' | 'success' | 'error' | 'redirecting'>('input');
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

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

  const handleConfirm = async () => {
    if (method === 'cash' && (!cashAmount || parseFloat(cashAmount) * 100 < total)) {
      return;
    }

    // For cash payments, proceed with existing flow
    if (method === 'cash') {
      setProcessing(true);
      setStage('processing');
      onComplete(change);
      return;
    }

    // For card/QR payments with Monnify, we need an order ID first
    if (!orderId && onOrderCreated) {
      // Order needs to be created first - this will be handled by parent
      // For now, just trigger the order creation callback
      toast.error('Order must be created before payment. Please try again.');
      return;
    }

    if (!orderId) {
      toast.error('Order ID is required for payment');
      return;
    }

    try {
      setProcessing(true);
      setStage('processing');

      // Initiate payment with Monnify
      const paymentMethod = method === 'card' ? 'card' : 'qr';
      
      const payment = await PaymentService.initiatePayment(orderId, {
        amount: total,
        method: paymentMethod,
        metadata: {
          customerName: customerName || 'POS Customer',
          customerEmail: customerEmail || 'customer@pos.local',
          customerPhone: customerPhone,
          redirectUrl: `${window.location.origin}/checkout/payment-callback`,
        },
      });

      // Payment reference stored in payment.processorData for webhook processing

      // If Monnify returned a checkout URL, redirect to it
      if (payment.processorData?.checkoutUrl) {
        setCheckoutUrl(payment.processorData.checkoutUrl as string);
        setStage('redirecting');
        
        // Open Monnify checkout in new window/tab
        const checkoutWindow = window.open(
          payment.processorData.checkoutUrl as string,
          'MonnifyCheckout',
          'width=600,height=700,scrollbars=yes'
        );

        // Poll for payment status
        pollPaymentStatus(payment.id, checkoutWindow);
      } else {
        // No checkout URL - might be a direct payment or error
        toast.error('Payment initiation failed. Please try again.');
        setStage('error');
        setProcessing(false);
      }
    } catch (error: any) {
      console.error('Payment initiation error:', error);
      toast.error(error.response?.data?.message || 'Failed to initiate payment');
      setStage('error');
      setProcessing(false);
    }
  };

  const pollPaymentStatus = async (paymentId: string, checkoutWindow: Window | null) => {
    const maxAttempts = 60; // Poll for up to 5 minutes (5 second intervals)
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;

      try {
        // Check if checkout window was closed (user might have completed payment)
        if (checkoutWindow?.closed) {
          // Give it a moment for webhook to process
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Get payment status from order
        if (orderId) {
          const status = await PaymentService.getOrderPaymentStatus(orderId);
          
          // Check if payment is completed
          const payment = status.payments.find(p => p.id === paymentId);
          if (payment?.status === 'completed') {
            clearInterval(interval);
            setStage('success');
            setProcessing(false);
            if (checkoutWindow && !checkoutWindow.closed) {
              checkoutWindow.close();
            }
            // Wait a moment then call onComplete
            setTimeout(() => {
              onComplete();
            }, 1500);
            return;
          }

          if (payment?.status === 'failed') {
            clearInterval(interval);
            setStage('error');
            setProcessing(false);
            if (checkoutWindow && !checkoutWindow.closed) {
              checkoutWindow.close();
            }
            toast.error(payment.error || 'Payment failed');
            return;
          }
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setStage('error');
        setProcessing(false);
        if (checkoutWindow && !checkoutWindow.closed) {
          checkoutWindow.close();
        }
        toast.error('Payment timeout. Please check payment status manually.');
      }
    }, 5000); // Poll every 5 seconds
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
                  <div className="mb-3 flex items-center justify-between">
                    <label className="theme-text-secondary block text-sm font-medium">
                      Cash Received
                    </label>
                    <button
                      onClick={() => {
                        setCashAmount((total / 100).toFixed(2));
                      }}
                      className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
                    >
                      Use Exact Amount
                    </button>
                  </div>
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
                    💳 You will be redirected to Monnify checkout to complete your card payment
                  </p>
                </div>
              )}

              {method === 'qr' && (
                <div className="theme-surface rounded-2xl border border-purple-400/30 bg-purple-500/10 p-4">
                  <p className="theme-text-secondary text-center text-sm">
                    📱 You will be redirected to Monnify checkout to complete your QR payment
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {method === 'cash' && (
                <button
                  onClick={() => {
                    setCashAmount((total / 100).toFixed(2));
                    // Auto-confirm after setting exact amount
                    setTimeout(() => {
                      handleConfirm();
                    }, 100);
                  }}
                  className="w-full rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-400 px-6 py-3 font-semibold text-white shadow-lg transition hover:shadow-sky-900/70 touch-manipulation"
                  aria-label="Confirm full payment received"
                >
                  ✓ Confirm Full Payment Received
                </button>
              )}
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
                  {method === 'cash' ? 'Confirm with Change' : 'Confirm Payment'}
                </button>
              </div>
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

        {stage === 'redirecting' && (
          <div className="py-12 text-center">
            <div className="mb-6 flex justify-center">
              <div className="h-20 w-20 animate-spin rounded-full border-4 border-sky-400 border-t-transparent" />
            </div>
            <h3 className="theme-text-primary mb-2 text-xl font-semibold">Redirecting to Payment...</h3>
            <p className="theme-text-secondary text-sm mb-4">
              A new window will open for you to complete your payment
            </p>
            {checkoutUrl && (
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-full bg-sky-500 px-6 py-3 font-semibold text-white hover:bg-sky-600"
              >
                Open Payment Page
              </a>
            )}
            <p className="theme-text-secondary mt-4 text-xs">
              Waiting for payment confirmation...
            </p>
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

