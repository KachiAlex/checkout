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
          // Check if Supabase anon key is configured (critical for Supabase requests)
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          const isSupabaseRequest = API_URL.includes('supabase.co');
          
          if (isSupabaseRequest && !supabaseAnonKey) {
            const error = new Error('Configuration Error: VITE_SUPABASE_ANON_KEY is not set. Please contact support.');
            (error as any).customMessage = 'Configuration Error: Missing Supabase API key. Please contact support or check browser console for details.';
            (error as any).isConfigError = true;
            throw error;
          }
          
          // For Supabase requests, ensure apikey is set as a default header
          // This ensures the browser includes it in OPTIONS preflight requests
          if (isSupabaseRequest && supabaseAnonKey) {
            axios.defaults.headers.common['apikey'] = supabaseAnonKey;
          }
          
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
          // Check if this is a Supabase authorization error
          if (error.response?.status === 401) {
            const errorData = error.response?.data;
            const errorMessage = errorData?.message || errorData?.error || 'Authorization required';
            
            // Check if this is the Supabase infrastructure error
            if (errorMessage.toLowerCase().includes('authorization required') || 
                errorMessage.toLowerCase().includes('authorization')) {
              const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
              if (!supabaseAnonKey) {
                const configError = new Error('Configuration Error: VITE_SUPABASE_ANON_KEY is not set. This is required for Supabase requests.');
                (configError as any).customMessage = 'Configuration Error: Missing Supabase API key. Please contact support or check browser console for details.';
                (configError as any).isConfigError = true;
                throw configError;
              } else {
                // Key is set but still getting 401 - might be invalid key
                const authError = new Error('Authorization failed: The Supabase API key may be invalid or expired.');
                (authError as any).customMessage = 'Authorization failed. Please check your Supabase API key configuration.';
                throw authError;
              }
            }
          }
          
          const message = error.response?.data?.message || error.response?.data?.error || 'Login failed';
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
      const isSupabaseRequest = apiUrl.includes('supabase.co') || config.url?.includes('supabase.co');
      const isAuthEndpoint = config.url?.includes('/auth/login') || 
                            config.url?.includes('/auth/superadmin/login');
      const isOptionsRequest = config.method?.toUpperCase() === 'OPTIONS';

      // Ensure headers object exists (axios will create it if needed, but we ensure it's initialized)
      if (!config.headers) {
        config.headers = {} as any;
      }

      // For Supabase requests, ALWAYS send apikey header (required by infrastructure)
      // This is CRITICAL for OPTIONS requests - Supabase infrastructure checks this before our function runs
      // The browser will include this header in the OPTIONS preflight if we set it on the actual request
      if (isSupabaseRequest) {
        if (supabaseAnonKey) {
          // Set apikey header (required by Supabase infrastructure for ALL requests including OPTIONS)
          // This must be set so the browser includes it in the OPTIONS preflight request
          // Use lowercase 'apikey' as Supabase expects it
          // CRITICAL: Set it multiple ways to ensure it's always present
          (config.headers as any).apikey = supabaseAnonKey;
          (config.headers as any)['apikey'] = supabaseAnonKey;
          (config.headers as any)['Apikey'] = supabaseAnonKey; // Case variations
          (config.headers as any)['APIKEY'] = supabaseAnonKey;
          
          // Force set on the raw headers object if it exists
          if ((config as any).headers && typeof (config as any).headers.set === 'function') {
            (config as any).headers.set('apikey', supabaseAnonKey);
          }
          
          // Also ensure it's in the headers that will trigger OPTIONS to include it
          // The browser automatically includes custom headers in OPTIONS if the actual request has them
        } else {
          // This is a critical error - Supabase requires the apikey header
          console.error('[Auth] CRITICAL: VITE_SUPABASE_ANON_KEY is not set!');
          console.error('[Auth] This will cause "Authorization required" 401 errors.');
          console.error('[Auth] Please set VITE_SUPABASE_ANON_KEY in your .env file or environment variables.');
          console.error('[Auth] Get your key from: Supabase Dashboard → Project Settings → API → anon public key');
          // Note: The login function will catch this and show a user-friendly error
        }
      }

      // Determine which Authorization header to use
      if (isSupabaseRequest) {
        if (supabaseAnonKey) {
          // For Supabase requests with anon key:
          if (accessToken && !isAuthEndpoint && !isOptionsRequest) {
            // Authenticated request (not login, not OPTIONS): use app JWT token
            (config.headers as any).Authorization = `Bearer ${accessToken}`;
          } else {
            // Login endpoint, OPTIONS, or no app token: use anon key
            (config.headers as any).Authorization = `Bearer ${supabaseAnonKey}`;
          }
        }
        // Note: If supabaseAnonKey is missing, we already logged an error above
      } else if (!isSupabaseRequest && accessToken && !isAuthEndpoint) {
        // Non-Supabase request with app token: use app JWT token
        (config.headers as any).Authorization = `Bearer ${accessToken}`;
      } else if (!isSupabaseRequest && isAuthEndpoint) {
        // Non-Supabase login endpoint: clear any stale Authorization header
        if (config.headers) {
          delete (config.headers as any).Authorization;
        }
      }
      // For non-Supabase requests without app token and not login: leave Authorization as-is
      
      // Debug logging for Supabase requests to help diagnose CORS issues
      if (isSupabaseRequest && import.meta.env.DEV) {
        const hasApikey = !!(config.headers as any).apikey;
        const hasAuth = !!(config.headers as any).Authorization;
        if (!hasApikey) {
          console.warn('[Auth Interceptor] WARNING: apikey header missing on Supabase request:', {
            url: config.url,
            method: config.method,
            hasApikey,
            hasAuth,
          });
        }
      }

      // Debug logging for login requests
      if (isAuthEndpoint) {
        const hasApikey = !!(config.headers as any).apikey;
        const hasAuthorization = !!(config.headers as any).Authorization;
        const authHeaderValue = (config.headers as any).Authorization;
        const authHeaderPrefix = authHeaderValue?.substring(0, 20) || 'none';
        
        // Always log critical issues (even in production)
        if (!supabaseAnonKey && isSupabaseRequest) {
          console.error('[Auth] ⚠️ CRITICAL: VITE_SUPABASE_ANON_KEY is missing!');
          console.error('[Auth] This will cause "missing authorization header" errors.');
          console.error('[Auth] To fix: Set VITE_SUPABASE_ANON_KEY in apps/frontend/.env and rebuild.');
          console.error('[Auth] Get your key from: Supabase Dashboard → Project Settings → API → anon public key');
        }
        
        if (import.meta.env.DEV || !supabaseAnonKey) {
          console.log('[Auth Interceptor] Login request:', {
            url: config.url,
            hasApikey,
            hasAuthorization,
            authHeaderPrefix,
            isSupabaseRequest,
            hasAnonKey: !!supabaseAnonKey,
            anonKeyPrefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 20) : 'NOT SET',
            envVarSet: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
          });
        }
        
        // In production, still log critical issues
        if (!hasApikey && isSupabaseRequest) {
          console.error('[Auth] Login request missing apikey header - this will fail!');
        }
        if (!hasAuthorization && isSupabaseRequest) {
          console.error('[Auth] Login request missing Authorization header - this will fail!');
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
// Retry logic for CORS/401 errors
const MAX_RETRIES = 2;
const RETRY_DELAY = 100; // 100ms delay between retries

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't try to refresh on login/auth endpoints - these are expected to fail if not logged in
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') || 
                          originalRequest?.url?.includes('/auth/superadmin/login') ||
                          originalRequest?.url?.includes('/auth/refresh');

    // Handle CORS/401 errors with retry logic
    const isCorsError = error.code === 'ERR_NETWORK' || 
                       error.message?.includes('CORS') ||
                       error.message?.includes('blocked by CORS');
    const is401Error = error.response?.status === 401;
    const isSupabaseRequest = API_URL.includes('supabase.co') || originalRequest?.url?.includes('supabase.co');
    
    // Retry logic for Supabase CORS/401 errors
    if ((isCorsError || is401Error) && isSupabaseRequest && !isAuthEndpoint) {
      const retryCount = originalRequest._retryCount || 0;
      
      if (retryCount < MAX_RETRIES) {
        originalRequest._retryCount = retryCount + 1;
        
        // Ensure apikey is set before retry
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (supabaseAnonKey && originalRequest.headers) {
          originalRequest.headers['apikey'] = supabaseAnonKey;
          originalRequest.headers['Apikey'] = supabaseAnonKey;
          originalRequest.headers['APIKEY'] = supabaseAnonKey;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        
        console.log(`[Auth] Retrying request (attempt ${retryCount + 1}/${MAX_RETRIES}):`, originalRequest.url);
        return axios(originalRequest);
      }
    }

    // If we get a 401 on login endpoint, clear any invalid tokens
    if (error.response?.status === 401 && isAuthEndpoint) {
      const { accessToken } = useAuthStore.getState();
      if (accessToken) {
        // Invalid token detected on login attempt, clear it
        console.warn('[Auth] Invalid token detected on login endpoint, clearing stored tokens');
        useAuthStore.getState().logout();
      }
      return Promise.reject(error);
    }

    // If we get a 401 and haven't tried to refresh yet (and it's not an auth endpoint)
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
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