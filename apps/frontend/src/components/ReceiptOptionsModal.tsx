import { useState } from 'react';
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
  const { accessToken } = useAuthStore();

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

  const handlePrint = async () => {
    try {
      const printAvailable = await receiptService.isAvailable();
      if (printAvailable) {
        const success = await receiptService.printReceipt(orderId);
        if (success) {
          toast.success('Receipt sent to printer');
          onClose();
        } else {
          toast.error('Failed to print receipt');
        }
      } else {
        toast.error('Printer not available');
      }
    } catch (error: any) {
      toast.error('Failed to print receipt');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="theme-card w-full max-w-2xl rounded-3xl border p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="theme-text-primary text-2xl font-bold">Receipt Options</h2>
          <button
            onClick={onClose}
            className="theme-chip rounded-full border p-2 transition hover:bg-white/10"
            aria-label="Close receipt options"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Preview Section */}
          <div className="theme-surface rounded-2xl border p-6">
            <h3 className="theme-text-primary mb-4 text-lg font-semibold">Preview Receipt</h3>
            {preview ? (
              <div className="theme-surface max-h-96 overflow-y-auto rounded-xl border p-4">
                <pre className="whitespace-pre-wrap font-mono text-sm theme-text-primary">{preview}</pre>
              </div>
            ) : (
              <button
                onClick={handlePreview}
                disabled={loadingPreview}
                className="w-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500 px-6 py-3 font-semibold text-white transition hover:shadow-lg disabled:opacity-50 touch-manipulation"
              >
                {loadingPreview ? 'Loading...' : '📄 Preview Receipt'}
              </button>
            )}
          </div>

          {/* Email Section */}
          <div className="theme-surface rounded-2xl border p-6">
            <h3 className="theme-text-primary mb-4 text-lg font-semibold">📧 Send via Email</h3>
            <div className="flex gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="theme-text-primary flex-1 rounded-xl border border-white/20 bg-transparent px-4 py-3 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                disabled={sendingEmail}
              />
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !email}
                className="rounded-full bg-gradient-to-r from-sky-400 to-blue-500 px-6 py-3 font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
              >
                {sendingEmail ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>

          {/* SMS Section */}
          <div className="theme-surface rounded-2xl border p-6">
            <h3 className="theme-text-primary mb-4 text-lg font-semibold">📱 Send via SMS</h3>
            <div className="flex gap-3">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="Phone number"
                className="theme-text-primary flex-1 rounded-xl border border-white/20 bg-transparent px-4 py-3 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                disabled={sendingSMS}
              />
              <button
                onClick={handleSendSMS}
                disabled={sendingSMS || !phone}
                className="rounded-full bg-gradient-to-r from-purple-400 to-pink-500 px-6 py-3 font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
              >
                {sendingSMS ? 'Sending...' : 'Send'}
              </button>
            </div>
            <p className="theme-text-secondary mt-2 text-xs">SMS receipt feature coming soon</p>
          </div>

          {/* Print Section */}
          <div className="theme-surface rounded-2xl border p-6">
            <h3 className="theme-text-primary mb-4 text-lg font-semibold">🖨️ Print Receipt</h3>
            <button
              onClick={handlePrint}
              className="w-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-6 py-3 font-semibold text-white transition hover:shadow-lg touch-manipulation"
            >
              Print Receipt
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="theme-chip mt-6 w-full rounded-full border px-6 py-3 font-semibold transition hover:bg-white/10 touch-manipulation"
        >
          Close
        </button>
      </div>
    </div>
  );
}

