import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // React and React-DOM - must be first
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            // React Router - depends on React, but Vite will handle dependency
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            // React Hot Toast - depends on React
            if (id.includes('react-hot-toast')) {
              return 'vendor-toast';
            }
            // Large libraries that don't depend on React
            if (id.includes('@zxing')) {
              return 'vendor-scanner';
            }
            if (id.includes('date-fns')) {
              return 'vendor-date';
            }
            if (id.includes('axios')) {
              return 'vendor-network';
            }
            if (id.includes('zustand')) {
              return 'vendor-state';
            }
            // Everything else - but ensure React is never in here
            // Vite should automatically handle chunk dependencies
            return 'vendor-misc';
          }
        },
        // Ensure proper chunk loading order
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging (optional)
    sourcemap: false,
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    // Drop console and debugger in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
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
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'zustand', 'axios'],
    exclude: ['@zxing/library'],
  },
});
