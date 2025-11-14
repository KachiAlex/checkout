import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ensureCameraPermission, isBluetoothSupported } from '../services/scannerService';

const STORAGE_KEY = 'pos-onboarding-banner-dismissed';

interface OnboardingBannerProps {
  locationId?: string;
}

export function OnboardingBanner({ locationId }: OnboardingBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [bluetoothReady, setBluetoothReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const dismissedAt = window.localStorage.getItem(STORAGE_KEY);
    if (!dismissedAt) {
      setIsVisible(true);
    }

    setBluetoothReady(isBluetoothSupported());
  }, []);

  if (!isVisible) {
    return null;
  }

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    }
    setIsVisible(false);
  };

  const handleCameraCheck = async () => {
    try {
      await ensureCameraPermission();
      toast.success('Camera ready for scanning');
    } catch (error: any) {
      toast.error(error?.message || 'Camera access is blocked. Allow it in browser settings.');
    }
  };

  const handleBluetoothInfo = () => {
    if (bluetoothReady) {
      toast.success('Bluetooth is supported. Use the Bluetooth button in the scanner to pair.');
    } else {
      toast.error('Bluetooth pairing requires Chrome/Edge on desktop or Android over HTTPS.');
    }
  };

  return (
    <div className="theme-card rounded-3xl border px-6 py-6 backdrop-blur-xl">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-500 text-2xl shadow-xl shadow-blue-900/40">
          🚀
        </div>
        <div className="flex-1 space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="theme-text-primary text-2xl font-semibold tracking-tight">
                Welcome! Let’s get you ready to sell.
              </h2>
              <p className="theme-text-secondary mt-2 max-w-xl text-sm">
                Complete these quick checks so scanners, camera mode, and inventory stay silky smooth during rush hour.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="theme-chip self-start rounded-full border px-5 py-2 text-sm font-semibold transition"
            >
              Got it
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="theme-surface rounded-2xl border p-5 shadow-inner shadow-black/20 transition">
              <div className="theme-text-primary flex items-center gap-2 text-sm font-semibold">
                <span>🔐</span>
                <span>Camera ready</span>
              </div>
              <p className="theme-text-secondary mt-3 text-sm">
                Enable scanner camera access now so Chrome doesn’t interrupt your queue later.
              </p>
              <button
                onClick={handleCameraCheck}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 transition hover:shadow-blue-900/60"
              >
                Test camera access
              </button>
            </div>

            <div className="theme-surface rounded-2xl border p-5 shadow-inner shadow-black/20 transition">
              <div className="theme-text-primary flex items-center gap-2 text-sm font-semibold">
                <span>📡</span>
                <span>Pair a scanner</span>
              </div>
              <p className="theme-text-secondary mt-3 text-sm">
                Put your Bluetooth scanner in pairing mode and tap the Bluetooth option inside the scanner panel.
              </p>
              <button
                onClick={handleBluetoothInfo}
                className="theme-chip mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition"
              >
                Check browser support
              </button>
            </div>

            <div className="theme-surface rounded-2xl border p-5 shadow-inner shadow-black/20 transition">
              <div className="theme-text-primary flex items-center gap-2 text-sm font-semibold">
                <span>📦</span>
                <span>Verify stock</span>
              </div>
              <p className="theme-text-secondary mt-3 text-sm">
                Review products and stock levels
                {locationId ? ` for location ${locationId}` : ''} before customers walk in.
              </p>
              <Link
                to="/inventory"
                className="theme-chip mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition"
              >
                Go to Inventory →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

