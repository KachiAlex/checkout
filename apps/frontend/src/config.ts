const DEFAULT_API_BASE = 'https://cdazlztdllykbtfnssma.supabase.co/functions/v1';
const FIREBASE_STORAGE_BUCKET = 'checkout-77d99.firebasestorage.app';

// Default Firebase Storage URL for desktop installer
// Converted from gs://checkout-77d99.firebasestorage.app/Checkout POS Setup 1.0.0.exe
// Format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media
const DEFAULT_WINDOWS_INSTALLER_URL = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/Checkout%20POS%20Setup%201.0.0.exe?alt=media`;

// In development, use localhost backend directly or via proxy
// In production or when VITE_API_URL is explicitly set, use that value or default to Firebase
const getApiUrl = () => {
  // If explicitly set via env var, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  
  // In development, use empty string to leverage Vite proxy (forwards /api to localhost:3000)
  // This allows relative paths like /api/v1/... which Vite will proxy
  if (import.meta.env.DEV) {
    return '';
  }
  
  // In production, use Firebase
  return DEFAULT_API_BASE;
};

export const API_URL = getApiUrl();

export const DOWNLOAD_LINKS = {
  windows: import.meta.env.VITE_WINDOWS_INSTALLER_URL?.trim() || DEFAULT_WINDOWS_INSTALLER_URL,
  android: import.meta.env.VITE_ANDROID_APK_URL?.trim() || null,
  macos: import.meta.env.VITE_MACOS_INSTALLER_URL?.trim() || null,
  ios: import.meta.env.VITE_IOS_APP_URL?.trim() || null,
} as const;

// Debug logging
if (import.meta.env.DEV) {
  console.log('[config] API_URL (dev mode):', API_URL || '(empty - using Vite proxy to localhost:3000)');
  console.log('[config] Example request:', `${API_URL || ''}/api/v1/auth/login`);
  console.log('[config] Downloads', DOWNLOAD_LINKS);
} else {
  console.log('[config] API_URL (prod)', API_URL);
}
