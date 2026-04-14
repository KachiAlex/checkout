import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { useAuthStore } from "./stores/authStore";
import axios from "axios";
import { Capacitor, CapacitorHttp, HttpOptions } from "@capacitor/core";
import { HelmetProvider } from "react-helmet-async";
import { ErrorBoundary } from "./components/ErrorBoundary";

console.log("[React] main.tsx loading...");

const isNativePlatform =
  typeof Capacitor.isNativePlatform === "function"
    ? Capacitor.isNativePlatform()
    : Capacitor.getPlatform() !== "web";

console.log("[React] isNativePlatform:", isNativePlatform);

if (isNativePlatform) {
  console.log("[React] Setting up Capacitor HTTP adapter...");
  axios.defaults.adapter = async (config) => {
    const method = (config.method ?? "get").toUpperCase();
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
        config.responseType === "arraybuffer" || config.responseType === "blob"
          ? "arraybuffer"
          : "json",
    };

    const response = await CapacitorHttp.request(options);

    const statusText = (response as any).statusText ?? "";

    return {
      data: response.data,
      status: response.status ?? 200,
      statusText,
      headers: response.headers ?? {},
      config,
      request: undefined,
    };
  };
  console.log("[React] Capacitor HTTP adapter setup complete");
}

// Initialize auth token from localStorage on app startup
const initializeAuth = () => {
  console.log("[React] Initializing auth...");
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
    console.log("[React] Auth token set");
  } else {
    console.log("[React] No auth token found");
  }
};

// Initialize auth before rendering
initializeAuth();

// Find root element
console.log("[React] Looking for root element...");
const rootElement = document.getElementById("root");
console.log("[React] Root element found:", rootElement);

if (!rootElement) {
  console.error("[React] CRITICAL: root element not found!");
  document.body.innerHTML = "<h1>ERROR: Root element not found!</h1>";
} else {
  console.log("[React] Creating React root...");
  try {
    const root = ReactDOM.createRoot(rootElement);
    console.log("[React] React root created successfully");
    
    console.log("[React] Rendering App component...");
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <HelmetProvider>
            <App />
          </HelmetProvider>
        </ErrorBoundary>
      </React.StrictMode>,
    );
    console.log("[React] App component rendered successfully");
  } catch (error) {
    console.error("[React] ERROR during root creation or render:", error);
    rootElement.innerHTML = `<h1>ERROR: Failed to render app</h1><pre>${JSON.stringify(error)}</pre>`;
  }
}
