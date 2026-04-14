import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",
  plugins: [
    react({
      jsxRuntime: "automatic",
      babel: {
        plugins: [],
      },
    }),
  ],
  build: {
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info"],
      },
    },
    // Let Vite handle chunking automatically - it's smarter about dependencies
    chunkSizeWarningLimit: 1000,
    // Produce source maps for the production build so packaged renderer errors
    // surface original, unminified stack traces inside DevTools.
    sourcemap: true,
  },
  esbuild: {
    logOverride: { "this-is-undefined-in-esm": "silent" },
    // Drop console and debugger in production
    drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : [],
    loader: "tsx",
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "zustand", "axios"],
    exclude: ["@zxing/library"],
  },
});
