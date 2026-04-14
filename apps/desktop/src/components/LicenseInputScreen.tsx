import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface LicenseInputScreenProps {
  onActivate: (licenseKey: string) => Promise<void>;
  onSkip?: () => void;
  error?: string;
}

export const LicenseInputScreen: React.FC<LicenseInputScreenProps> = ({
  onActivate,
  onSkip,
  error: initialError,
}) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!licenseKey.trim()) {
        throw new Error('Please enter a license key');
      }

      await onActivate(licenseKey);
      setSuccess(true);
      setTimeout(() => {
        // License activation successful - the app will reload or navigate
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate license');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      // Default behavior - allow offline access
      setLicenseKey('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-purple-500/5 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Content */}
      <div className="relative w-full max-w-md px-6 py-8">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              🔐 License Activation
            </h1>
            <p className="text-slate-400 text-sm">
              Enter your license key to unlock the full application
            </p>
          </div>

          {success ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-emerald-400">License Activated!</h3>
                  <p className="text-sm text-emerald-300 mt-1">
                    Your license has been successfully activated. The app will reload shortly.
                  </p>
                </div>
              </div>
              <div className="flex justify-center">
                <Loader className="w-5 h-5 text-sky-400 animate-spin" />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* License Key Input */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  License Key
                </label>
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  placeholder="LICENSE-XXXXX-XXXXX-XXXXX"
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-800/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm tracking-widest"
                />
                <p className="mt-2 text-xs text-slate-400">
                  Your license key is case-insensitive and will be validated with your hardware.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-400">Activation Failed</h3>
                    <p className="text-sm text-red-300 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="rounded-xl bg-sky-500/10 border border-sky-500/30 p-4">
                <p className="text-sm text-sky-300">
                  <strong>Need a license?</strong> Visit our website to purchase or obtain a trial license.
                </p>
              </div>

              {/* Buttons */}
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading || !licenseKey.trim()}
                  className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold transition hover:shadow-lg hover:shadow-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    'Activate License'
                  )}
                </button>

                {onSkip && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={loading}
                    className="w-full px-6 py-3 rounded-xl border border-white/20 text-slate-300 font-semibold transition hover:border-white/40 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue Offline (14-day trial)
                  </button>
                )}
              </div>

              {/* Footer Text */}
              <p className="text-center text-xs text-slate-500">
                Your license information is encrypted and stored locally.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LicenseInputScreen;
