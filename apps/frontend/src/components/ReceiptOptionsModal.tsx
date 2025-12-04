import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { receiptService } from '../services/receiptService';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

interface ReceiptOptionsModalProps {
  isOpen: boolean;
  orderId: string;
  onClose: () => void;
}

export function ReceiptOptionsModal({ isOpen, orderId, onClose }: ReceiptOptionsModalProps) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [printerAvailable, setPrinterAvailable] = useState<boolean | null>(null);
  const [printing, setPrinting] = useState(false);
  const { accessToken } = useAuthStore();

  // Check printer availability when modal opens
  useEffect(() => {
    if (isOpen) {
      receiptService.isAvailable().then(setPrinterAvailable).catch(() => setPrinterAvailable(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePreview = async () => {
    setLoadingPreview(true);
    try {
      const receipt = await receiptService.getReceipt(orderId);
      setPreview(receipt);
    } catch (error: any) {
      toast.error('Failed to load receipt preview');
      console.error(error);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSendEmail = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSendingEmail(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/v1/receipts/${orderId}/email`,
        { email },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (response.data.success) {
        toast.success(`Receipt sent to ${email}`);
        setEmail('');
        onClose();
      } else {
        toast.error('Failed to send receipt');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send receipt');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendSMS = async () => {
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setSendingSMS(true);
    try {
      // Note: SMS endpoint may need to be implemented in backend
      // For now, we'll show a message that it's coming soon
      toast.error('SMS receipt feature coming soon');
      // const response = await axios.post(
      //   `${API_URL}/api/v1/receipts/${orderId}/sms`,
      //   { phone },
      //   {
      //     headers: {
      //       Authorization: `Bearer ${accessToken}`,
      //     },
      //   },
      // );
    } catch (error: any) {
      toast.error('Failed to send SMS receipt');
    } finally {
      setSendingSMS(false);
    }
  };

  const handlePrint = async (useBrowser: boolean = false) => {
    setPrinting(true);
    try {
      if (useBrowser) {
        // Use browser print dialog
        const success = await receiptService.printReceiptBrowser(orderId);
        if (success) {
          toast.success('Opening print dialog...');
          onClose();
        } else {
          toast.error('Failed to open print dialog');
        }
      } else {
        // Try ESC/POS printer via print proxy
        const printAvailable = await receiptService.isAvailable();
        if (printAvailable) {
          const success = await receiptService.printReceipt(orderId);
          if (success) {
            toast.success('Receipt sent to printer');
            onClose();
          } else {
            toast.error('Failed to print receipt. Try browser print instead.');
          }
        } else {
          toast.error('Printer not available. Use browser print instead.');
        }
      }
    } catch (error: any) {
      toast.error('Failed to print receipt');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="theme-card w-full max-w-2xl rounded-2xl sm:rounded-3xl border p-4 sm:p-6 lg:p-8 shadow-2xl my-auto">
        <div className="mb-4 sm:mb-6 flex items-center justify-between">
          <h2 className="theme-text-primary text-xl sm:text-2xl font-bold">Receipt Options</h2>
          <button
            onClick={onClose}
            className="theme-chip rounded-full border p-2 transition hover:bg-white/10 touch-manipulation"
            aria-label="Close receipt options"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Preview Section */}
          <div className="theme-surface rounded-xl sm:rounded-2xl border p-4 sm:p-6">
            <h3 className="theme-text-primary mb-3 sm:mb-4 text-base sm:text-lg font-semibold">Preview Receipt</h3>
            {preview ? (
              <div className="theme-surface max-h-64 sm:max-h-96 overflow-y-auto rounded-lg sm:rounded-xl border p-3 sm:p-4">
                <pre className="whitespace-pre-wrap font-mono text-xs sm:text-sm theme-text-primary break-words overflow-wrap-anywhere">{preview}</pre>
              </div>
            ) : (
              <button
                onClick={handlePreview}
                disabled={loadingPreview}
                className="w-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white transition hover:shadow-lg disabled:opacity-50 touch-manipulation"
              >
                {loadingPreview ? 'Loading...' : '📄 Preview Receipt'}
              </button>
            )}
          </div>

          {/* Email Section */}
          <div className="theme-surface rounded-xl sm:rounded-2xl border p-4 sm:p-6">
            <h3 className="theme-text-primary mb-3 sm:mb-4 text-base sm:text-lg font-semibold">📧 Send via Email</h3>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="theme-text-primary flex-1 rounded-xl border border-white/20 bg-transparent px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                disabled={sendingEmail}
              />
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !email}
                className="rounded-full bg-gradient-to-r from-sky-400 to-blue-500 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation w-full sm:w-auto"
              >
                {sendingEmail ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>

          {/* SMS Section */}
          <div className="theme-surface rounded-xl sm:rounded-2xl border p-4 sm:p-6">
            <h3 className="theme-text-primary mb-3 sm:mb-4 text-base sm:text-lg font-semibold">📱 Send via SMS</h3>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="Phone number"
                className="theme-text-primary flex-1 rounded-xl border border-white/20 bg-transparent px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                disabled={sendingSMS}
              />
              <button
                onClick={handleSendSMS}
                disabled={sendingSMS || !phone}
                className="rounded-full bg-gradient-to-r from-purple-400 to-pink-500 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation w-full sm:w-auto"
              >
                {sendingSMS ? 'Sending...' : 'Send'}
              </button>
            </div>
            <p className="theme-text-secondary mt-2 text-xs">SMS receipt feature coming soon</p>
          </div>

          {/* Print Section */}
          <div className="theme-surface rounded-xl sm:rounded-2xl border p-4 sm:p-6">
            <h3 className="theme-text-primary mb-3 sm:mb-4 text-base sm:text-lg font-semibold">🖨️ Print Receipt</h3>
            {printerAvailable === null ? (
              <div className="text-center py-4">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                <p className="theme-text-secondary mt-2 text-xs sm:text-sm">Checking printer status...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {printerAvailable ? (
                  <div className="rounded-lg sm:rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 sm:p-3 mb-3">
                    <p className="theme-text-primary text-xs sm:text-sm font-semibold text-emerald-400">
                      ✓ ESC/POS Printer Connected
                    </p>
                    <p className="theme-text-secondary text-xs mt-1">
                      Receipt will be sent to your configured printer
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg sm:rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 sm:p-3 mb-3">
                    <p className="theme-text-primary text-xs sm:text-sm font-semibold text-amber-400">
                      ⚠ ESC/POS Printer Not Available
                    </p>
                    <p className="theme-text-secondary text-xs mt-1">
                      Configure printer in Settings or use browser print
                    </p>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {printerAvailable && (
                    <button
                      onClick={() => handlePrint(false)}
                      disabled={printing}
                      className="flex-1 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                    >
                      {printing ? 'Printing...' : 'Print to ESC/POS'}
                    </button>
                  )}
                  <button
                    onClick={() => handlePrint(true)}
                    disabled={printing}
                    className="flex-1 rounded-full bg-gradient-to-r from-sky-400 to-blue-500 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                  >
                    {printing ? 'Opening...' : 'Browser Print'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="theme-chip mt-4 sm:mt-6 w-full rounded-full border px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold transition hover:bg-white/10 touch-manipulation"
        >
          Close
        </button>
      </div>
    </div>
  );
}

