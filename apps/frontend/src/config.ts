const DEFAULT_API_BASE = 'https://us-central1-checkout-77d99.cloudfunctions.net';

export const API_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_BASE).replace(/\/+$/, '');

export const DOWNLOAD_LINKS = {
  windows: import.meta.env.VITE_WINDOWS_INSTALLER_URL?.trim() || null,
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
