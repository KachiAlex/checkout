const DEFAULT_API_BASE = 'https://us-central1-checkout-77d99.cloudfunctions.net';

export const API_URL = (
  import.meta.env.VITE_API_URL || DEFAULT_API_BASE
).replace(/\/+$/, '');

if (import.meta.env.DEV) {
  console.log('[config] API_URL (dev)', API_URL);
} else {
  console.log('[config] API_URL (prod)', API_URL);
}
