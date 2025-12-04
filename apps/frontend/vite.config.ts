import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// No longer needed - React dependencies are now in vendor-react chunk

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
            // React and React-DOM - must be first and together
            // Include scheduler which React depends on
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler') || id.includes('jsx-runtime')) {
              return 'vendor-react';
            }
            // All React-dependent libraries MUST be in vendor-react to avoid loading order issues
            // This ensures React is always available when these libraries load
            if (id.includes('react-router') || id.includes('react-hot-toast') || id.includes('dexie-react-hooks')) {
              return 'vendor-react';
            }
            // Large libraries that don't depend on React - safe to split
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
            // Capacitor libraries - don't depend on React
            if (id.includes('@capacitor')) {
              return 'vendor-capacitor';
            }
            // Everything else - should be safe (no React dependencies)
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
