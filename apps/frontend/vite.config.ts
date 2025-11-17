import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ mode }) => {
  const plugins = [react()];

  // Temporarily disable PWA plugin due to flaky EPIPE errors in build.
  // When re-enabling, guard with an explicit env flag or fix plugin version.

  return {
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      minify: 'terser',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('scheduler')) {
                return 'vendor-react';
              }
              if (id.includes('zustand')) {
                return 'vendor-state';
              }
              if (id.includes('@zxing')) {
                return 'vendor-scanner';
              }
              if (id.includes('date-fns')) {
                return 'vendor-date';
              }
              if (id.includes('axios')) {
                return 'vendor-network';
              }
            }
          },
        },
      },
    },
    esbuild: {
      logOverride: { 'this-is-undefined-in-esm': 'silent' },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
