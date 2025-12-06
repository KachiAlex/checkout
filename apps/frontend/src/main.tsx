import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useAuthStore } from './stores/authStore';
import axios from 'axios';
import { Capacitor, CapacitorHttp, HttpOptions } from '@capacitor/core';

const isNativePlatform =
  typeof Capacitor.isNativePlatform === 'function'
    ? Capacitor.isNativePlatform()
    : Capacitor.getPlatform() !== 'web';

if (isNativePlatform) {
  axios.defaults.adapter = async (config) => {
    const method = (config.method ?? 'get').toUpperCase();
    const url = axios.getUri(config);
    const headers = (config.headers ?? {}) as Record<string, string>;
    const options: HttpOptions = {
      method,
      url,
      headers,
      params: config.params as Record<string, any> | undefined,
      data: config.data,
      readTimeout: config.timeout,
      connectTimeout: config.timeout,
      responseType:
        config.responseType === 'arraybuffer' || config.responseType === 'blob'
          ? 'arraybuffer'
          : 'json',
    };

    const response = await CapacitorHttp.request(options);

    const statusText = (response as any).statusText ?? '';

    return {
      data: response.data,
      status: response.status ?? 200,
      statusText,
      headers: response.headers ?? {},
      config,
      request: undefined,
    };
  };
}

// Initialize auth token from localStorage on app startup
const initializeAuth = () => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  }
  
  // For Supabase requests, set apikey as default header
  // This ensures the browser includes it in OPTIONS preflight requests
  // IMPORTANT: Supabase infrastructure requires apikey header for ALL requests including OPTIONS
  // NOTE: The browser will include this header in OPTIONS if it's set as a default header
  // The authStore interceptor also ensures it's set on every request
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (supabaseAnonKey) {
    // Set apikey as default header for all requests
    // The browser should include this in OPTIONS preflight if it's a default header
    // CRITICAL: Set it multiple ways to ensure it's always present
    axios.defaults.headers.common['apikey'] = supabaseAnonKey;
    axios.defaults.headers.common['Apikey'] = supabaseAnonKey;
    axios.defaults.headers.common['APIKEY'] = supabaseAnonKey;
    
    // Also set it on the defaults object directly
    if (!axios.defaults.headers) {
      axios.defaults.headers = {} as any;
    }
    if (!axios.defaults.headers.common) {
      axios.defaults.headers.common = {} as any;
    }
    (axios.defaults.headers.common as any).apikey = supabaseAnonKey;
    
    // Also set Authorization with anon key as fallback for OPTIONS
    // This ensures OPTIONS requests have a valid Authorization header
    if (!useAuthStore.getState().accessToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${supabaseAnonKey}`;
    }
    
    // CRITICAL: Also set it on the request defaults to catch any edge cases
    if (!axios.defaults.headers.get) {
      // Ensure it's available for all request types
      (axios.defaults as any).apikey = supabaseAnonKey;
    }
  } else {
    console.error('[Main] CRITICAL: VITE_SUPABASE_ANON_KEY is not set!');
    console.error('[Main] This will cause CORS and 401 errors with Supabase Edge Functions.');
  }
};

// Initialize auth before rendering
initializeAuth();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);