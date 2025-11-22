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
};

// Initialize auth before rendering
initializeAuth();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const ua = navigator.userAgent?.toLowerCase?.() ?? '';
  if (!ua.includes('electron')) {
    import('virtual:pwa-register').then(({ registerSW }) => {
      registerSW({ immediate: true });
    });
  }
}