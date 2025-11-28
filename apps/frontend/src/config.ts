const DEFAULT_API_BASE = 'https://us-central1-checkout-77d99.cloudfunctions.net';
const FIREBASE_STORAGE_BUCKET = 'checkout-77d99.firebasestorage.app';

// Default Firebase Storage URL for desktop installer
// Converted from gs://checkout-77d99.firebasestorage.app/Checkout POS Setup 1.0.0.exe
// Format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media
const DEFAULT_WINDOWS_INSTALLER_URL = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/Checkout%20POS%20Setup%201.0.0.exe?alt=media`;

export const API_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_BASE).replace(/\/+$/, '');

export const DOWNLOAD_LINKS = {
  windows: import.meta.env.VITE_WINDOWS_INSTALLER_URL?.trim() || DEFAULT_WINDOWS_INSTALLER_URL,
  android: import.meta.env.VITE_ANDROID_APK_URL?.trim() || null,
  macos: import.meta.env.VITE_MACOS_INSTALLER_URL?.trim() || null,
  ios: import.meta.env.VITE_IOS_APP_URL?.trim() || null,
} as const;

if (import.meta.env.DEV) {
  console.log('[config] API_URL (dev)', API_URL);
  console.log('[config] Downloads', DOWNLOAD_LINKS);
} else {
  console.log('[config] API_URL (prod)', API_URL);
}
