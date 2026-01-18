import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import { API_URL } from "../config";
import { Industry, IndustryFeatureFlags } from "@pos-checkout/shared";

const HEALTH_ENDPOINT = `${API_URL || ""}/api/v1/health`;
const LOGIN_TIMEOUT_MS = 30_000;
const LOGIN_RETRY_TIMEOUT_MS = 45_000;
const LOGIN_MAX_ATTEMPTS = 2;
const BACKEND_WAKE_TIMEOUT_MS = 60_000;
const BACKEND_WAKE_POLL_INTERVAL_MS = 3_000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isTimeoutError = (error: any) =>
  Boolean(error?.code === "ECONNABORTED" || error?.message?.includes("timeout"));

let backendWarmupPromise: Promise<void> | null = null;

const ensureBackendAwake = async () => {
  if (backendWarmupPromise) {
    return backendWarmupPromise;
  }

  backendWarmupPromise = (async () => {
    const start = Date.now();
    while (Date.now() - start < BACKEND_WAKE_TIMEOUT_MS) {
      try {
        await axios.get(HEALTH_ENDPOINT, {
          timeout: 5_000,
          headers: {
            "cache-control": "no-cache",
          },
        });
        return;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          // If the backend responded (even with 4xx/5xx), it's awake
          return;
        }
        await delay(BACKEND_WAKE_POLL_INTERVAL_MS);
      }
    }
    console.warn("[Auth] Backend health check timed out while waiting for service wake-up");
  })().finally(() => {
    backendWarmupPromise = null;
  });

  return backendWarmupPromise;
};

const buildLoginError = (error: any, timeoutMessage?: string) => {
  if (isTimeoutError(error)) {
    error.customMessage =
      timeoutMessage ??
      "Login request timed out. Please check your connection and try again.";
    return error;
  }

  const message =
    error.response?.data?.message ||
    error.response?.data?.error ||
    "Login failed";

  if (error && typeof error === "object") {
    error.customMessage = message;
  }

  return error;
};

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  industry?: Industry;
  feature_flags?: IndustryFeatureFlags;
  seatLimit?: number;
  contactEmail?: string;
  billingCycleStart?: string;
  billingCycleEnd?: string;
}

interface User {
  id: string;
  name: string;
  email?: string;
  role: string;
  locationId?: string;
  tenantId: string;
  isPlatformAdmin?: boolean;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  tenant: TenantInfo | null;
  tenantSlug: string | null;
  isAuthenticated: boolean;
  login: (tenantSlug: string, pin: string, deviceId?: string) => Promise<void>;
  loginSuperAdmin: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      tenant: null,
      tenantSlug: null,
      isAuthenticated: false,

      login: async (tenantSlug: string, pin: string, deviceId?: string) => {
        await ensureBackendAwake();

        let response;
        for (let attempt = 1; attempt <= LOGIN_MAX_ATTEMPTS; attempt++) {
          try {
            response = await axios.post(
              `${API_URL}/api/v1/auth/login`,
              {
                tenantSlug,
                pin,
                deviceId,
              },
              {
                timeout:
                  attempt === 1 ? LOGIN_TIMEOUT_MS : LOGIN_RETRY_TIMEOUT_MS,
              },
            );
            break;
          } catch (error: any) {
            if (isTimeoutError(error) && attempt < LOGIN_MAX_ATTEMPTS) {
              console.warn(
                `[Auth] Login attempt ${attempt} timed out. Retrying automatically...`,
              );
              await ensureBackendAwake();
              continue;
            }
            throw buildLoginError(error);
          }
        }

        if (!response) {
          throw buildLoginError(new Error("Login failed after retries"));
        }

        const { accessToken, refreshToken, user, tenant } = response.data;

        set({
          accessToken,
          refreshToken,
          user,
          tenant,
          tenantSlug,
          isAuthenticated: true,
        });

        // Store token in localStorage for sync service
        localStorage.setItem("accessToken", accessToken);

        // Set default authorization header
        axios.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
      },

      loginSuperAdmin: async (email: string, password: string) => {
        try {
          const response = await axios.post(
            `${API_URL}/api/v1/auth/superadmin/login`,
            {
              email,
              password,
            },
            {
              timeout: 30000, // 30 second timeout
            },
          );

          const { accessToken, refreshToken, user, tenant } = response.data;

          set({
            accessToken,
            refreshToken,
            user,
            tenant,
            tenantSlug: tenant?.slug ?? null,
            isAuthenticated: true,
          });

          // Store token in localStorage for sync service
          localStorage.setItem("accessToken", accessToken);

          axios.defaults.headers.common["Authorization"] =
            `Bearer ${accessToken}`;
        } catch (error: any) {
          const message = error.response?.data?.message || "Login failed";
          if (error && typeof error === "object") {
            error.customMessage = message;
          }
          throw error;
        }
      },

      logout: () => {
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          tenant: null,
          tenantSlug: null,
          isAuthenticated: false,
        });
        localStorage.removeItem("accessToken");
        delete axios.defaults.headers.common["Authorization"];
      },

      refresh: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          get().logout();
          return;
        }

        try {
          const response = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
            refreshToken,
          });

          const {
            accessToken,
            refreshToken: newRefreshToken,
            user,
            tenant,
          } = response.data;

          set({
            accessToken,
            refreshToken: newRefreshToken,
            user,
            tenant,
            tenantSlug: tenant?.slug ?? get().tenantSlug ?? null,
            isAuthenticated: true,
          });

          // Store token in localStorage for sync service
          localStorage.setItem("accessToken", accessToken);

          axios.defaults.headers.common["Authorization"] =
            `Bearer ${accessToken}`;
        } catch (error) {
          get().logout();
        }
      },
    }),
    {
      name: "auth-storage",
      onRehydrateStorage: () => (state) => {
        // Set axios default header when store is rehydrated from localStorage
        if (state?.accessToken) {
          axios.defaults.headers.common["Authorization"] =
            `Bearer ${state.accessToken}`;
        }
      },
    },
  ),
);

// Ensure every request carries the latest access token
axios.interceptors.request.use(
  (config) => {
    try {
      const { accessToken } = useAuthStore.getState();
      const isAuthEndpoint =
        config.url?.includes("/auth/login") ||
        config.url?.includes("/auth/superadmin/login");

      const debugAccounting =
        typeof window !== "undefined" &&
        window.localStorage?.getItem("debugAccountingApi") === "1";

      const url = config.url ?? "";
      const shouldDebugThisRequest =
        debugAccounting &&
        (url.includes("/admin/accounting") ||
          url.includes("/api/v1/admin/accounting"));

      // Ensure headers object exists
      if (!config.headers) {
        config.headers = {} as any;
      }

      // Set Authorization header for authenticated requests
      if (accessToken && !isAuthEndpoint) {
        (config.headers as any).Authorization = `Bearer ${accessToken}`;
      } else if (isAuthEndpoint) {
        // Clear any stale Authorization header for login endpoints
        delete (config.headers as any).Authorization;
      }

      if (shouldDebugThisRequest) {
        (config.headers as any)["x-e2e-debug"] = "1";
      }
    } catch (error) {
      console.warn("Failed to attach auth token to request:", error);
    }

    return config;
  },
  (error) => Promise.reject(error),
);

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't try to refresh on login/auth endpoints - these are expected to fail if not logged in
    const isAuthEndpoint =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/superadmin/login") ||
      originalRequest?.url?.includes("/auth/refresh");

    // If we get a 401 on login endpoint, clear any invalid tokens
    if (error.response?.status === 401 && isAuthEndpoint) {
      const { accessToken } = useAuthStore.getState();
      if (accessToken) {
        // Invalid token detected on login attempt, clear it
        console.warn(
          "[Auth] Invalid token detected on login endpoint, clearing stored tokens",
        );
        useAuthStore.getState().logout();
      }
      return Promise.reject(error);
    }

    // If we get a 401 and haven't tried to refresh yet (and it's not an auth endpoint)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true;

      const { refreshToken, refresh } = useAuthStore.getState();

      if (refreshToken) {
        try {
          await refresh();
          // Retry the original request with new token
          const { accessToken } = useAuthStore.getState();
          originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
          return axios(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout user
          useAuthStore.getState().logout();
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, logout
        useAuthStore.getState().logout();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);
