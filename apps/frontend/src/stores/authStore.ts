import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { API_URL } from '../config';

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
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
        try {
          const response = await axios.post(`${API_URL}/api/v1/auth/login`, {
            tenantSlug,
            pin,
            deviceId,
          });

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
          localStorage.setItem('accessToken', accessToken);

          // Set default authorization header
          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        } catch (error: any) {
          const message = error.response?.data?.message || 'Login failed';
          if (error && typeof error === 'object') {
            error.customMessage = message;
          }
          throw error;
        }
      },

      loginSuperAdmin: async (email: string, password: string) => {
        try {
          const response = await axios.post(`${API_URL}/api/v1/auth/superadmin/login`, {
            email,
            password,
          });

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
          localStorage.setItem('accessToken', accessToken);

          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        } catch (error: any) {
          const message = error.response?.data?.message || 'Login failed';
          if (error && typeof error === 'object') {
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
        localStorage.removeItem('accessToken');
        delete axios.defaults.headers.common['Authorization'];
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

          const { accessToken, refreshToken: newRefreshToken, user, tenant } = response.data;

          set({
            accessToken,
            refreshToken: newRefreshToken,
            user,
            tenant,
            tenantSlug: tenant?.slug ?? get().tenantSlug ?? null,
            isAuthenticated: true,
          });

          // Store token in localStorage for sync service
          localStorage.setItem('accessToken', accessToken);

          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        } catch (error) {
          get().logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        // Set axios default header when store is rehydrated from localStorage
        if (state?.accessToken) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${state.accessToken}`;
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

      const apiUrl = API_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // If we're talking to Supabase, attach the anon key via `apikey` header
      if (apiUrl.includes('supabase.co') && supabaseAnonKey) {
        config.headers = config.headers ?? {};
        (config.headers as any).apikey = supabaseAnonKey;
      }

      // If we have an app auth token, use it for Authorization
      if (accessToken) {
        config.headers = config.headers ?? {};
        (config.headers as any).Authorization = `Bearer ${accessToken}`;
      } else {
        // No app token – for Supabase, use anon key as bearer so the edge function is accessible
        if (apiUrl.includes('supabase.co') && supabaseAnonKey) {
          config.headers = config.headers ?? {};
          (config.headers as any).Authorization = `Bearer ${supabaseAnonKey}`;
        } else if (config.headers && (config.headers as any).Authorization) {
          // Non‑Supabase: clear stale Authorization
          delete (config.headers as any).Authorization;
        }
      }
    } catch (error) {
      console.warn('Failed to attach auth token to request:', error);
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Set up axios interceptor to handle 401 errors
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If we get a 401 and haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const { refreshToken, refresh } = useAuthStore.getState();
      
      if (refreshToken) {
        try {
          await refresh();
          // Retry the original request with new token
          const { accessToken } = useAuthStore.getState();
          originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
          return axios(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout user
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, logout
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);
