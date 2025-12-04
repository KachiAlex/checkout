import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Plugin to ensure React chunk loads before vendor-misc
function enforceReactDependency() {
  return {
    name: 'enforce-react-dependency',
    generateBundle(options: any, bundle: any) {
      const reactChunkName = Object.keys(bundle).find((name) => 
        name.includes('vendor-react') && bundle[name].type === 'chunk'
      );
      
      if (!reactChunkName) return;
      
      // Make all vendor chunks depend on React chunk
      Object.keys(bundle).forEach((fileName) => {
        const chunk = bundle[fileName];
        if (chunk.type === 'chunk' && fileName.includes('vendor-') && fileName !== reactChunkName) {
          // Ensure React is in the imports/dynamicImports
          if (!chunk.imports?.includes(reactChunkName) && !chunk.dynamicImports?.includes(reactChunkName)) {
            chunk.imports = chunk.imports || [];
            if (!chunk.imports.includes(reactChunkName)) {
              chunk.imports.push(reactChunkName);
            }
          }
        }
      });
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [react(), enforceReactDependency()],
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
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            // React Router - separate chunk that depends on React
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            // React Hot Toast - separate chunk
            if (id.includes('react-hot-toast')) {
              return 'vendor-toast';
            }
            // dexie-react-hooks depends on React
            if (id.includes('dexie-react-hooks')) {
              return 'vendor-react-hooks';
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
            // Capacitor libraries
            if (id.includes('@capacitor')) {
              return 'vendor-capacitor';
            }
            // Everything else - but check for any React dependencies
            // If it's a React-related package, put it in vendor-react-deps
            if (id.includes('react') || id.includes('jsx-runtime')) {
              return 'vendor-react-deps';
            }
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
