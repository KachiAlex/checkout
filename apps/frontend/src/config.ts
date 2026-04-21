// Backend configuration - supports multiple deployment options
// Vercel: https://checkout.vercel.app (primary - auto-deployed from GitLab)
// Render: https://checkout-45tb.onrender.com (backup)
// You can override this by setting VITE_API_URL in your .env file
const DEFAULT_API_BASE =
  import.meta.env.VITE_API_URL || "https://checkout.vercel.app";
const FIREBASE_STORAGE_BUCKET = "checkout-77d99.firebasestorage.app";

// Default Firebase Storage URL for desktop installer
// Converted from gs://checkout-77d99.firebasestorage.app/Checkout POS Setup 1.0.0.exe
// Format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media
const DEFAULT_WINDOWS_INSTALLER_URL = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/Checkout%20POS%20Setup%201.0.0.exe?alt=media`;

// In development, use localhost backend directly or via proxy
// In production or when VITE_API_URL is explicitly set, use that value or default to Firebase
const getApiUrl = () => {
  try {
    // If explicitly set via env var, use it
    if (import.meta.env.VITE_API_URL) {
      const url = import.meta.env.VITE_API_URL.replace(/\/+$/, "");
      console.log("[config] Using explicit API_URL:", url);
      return url;
    }

    // In development, check if we should use local backend or production fallback
    if (import.meta.env.DEV) {
      // Check if VITE_USE_LOCAL_BACKEND is explicitly set to 'true'
      // If not set or set to 'false', use production backend as fallback
      const useLocalBackend = import.meta.env.VITE_USE_LOCAL_BACKEND === "true";

      if (useLocalBackend) {
        console.log("[config] Using local backend via proxy");
        // Use empty string to leverage Vite proxy (forwards /api to localhost:3000)
        return "";
      } else {
        console.log("[config] Using production backend fallback");
        // Fallback to production backend when local backend is not available
        return DEFAULT_API_BASE;
      }
    }

    // In production, use Vercel backend (auto-deployed from GitLab)
    console.log("[config] Using Vercel backend in production");
    return DEFAULT_API_BASE;
  } catch (error) {
    console.error("[config] Error getting API URL, using default:", error);
    return DEFAULT_API_BASE;
  }
};

export const API_URL = getApiUrl();

console.log("[config] API_URL initialized to:", API_URL);

if (!API_URL) {
  console.warn("[config] WARNING: API_URL is empty! This may cause API calls to fail.");
}

export const DOWNLOAD_LINKS = {
  windows:
    import.meta.env.VITE_WINDOWS_INSTALLER_URL?.trim() ||
    DEFAULT_WINDOWS_INSTALLER_URL,
  android: import.meta.env.VITE_ANDROID_APK_URL?.trim() || null,
  macos: import.meta.env.VITE_MACOS_INSTALLER_URL?.trim() || null,
  ios: import.meta.env.VITE_IOS_APP_URL?.trim() || null,
} as const;

// Debug logging
if (import.meta.env.DEV) {
  const useLocalBackend = import.meta.env.VITE_USE_LOCAL_BACKEND === "true";
  if (useLocalBackend) {
    console.log(
      "[config] API_URL (dev mode - local backend):",
      API_URL || "(empty - using Vite proxy to localhost:3000)",
    );
  } else {
    console.log("[config] API_URL (dev mode - production fallback):", API_URL);
  }
  console.log(
    "[config] VITE_USE_LOCAL_BACKEND:",
    import.meta.env.VITE_USE_LOCAL_BACKEND,
  );
  console.log(
    "[config] Example request:",
    `${API_URL || ""}/api/v1/auth/login`,
  );
  console.log("[config] Downloads", DOWNLOAD_LINKS);
} else {
  console.log("[config] API_URL (prod)", API_URL);
}
