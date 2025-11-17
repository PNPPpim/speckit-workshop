import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  },
  build: {
    outDir: 'dist',
    minify: 'terser',
    target: 'ES2020',
    sourcemap: process.env.NODE_ENV === 'development',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        // Code splitting for better caching
        manualChunks: {
          // Core state management
          state: ['./src/store.js', './src/state-sync.js'],
          // Data services
          data: ['./src/data-service.js', './src/cache.js'],
          // UI components
          components: ['./src/album-list.js', './src/album.js', './src/photo-tile.js'],
          // Performance utilities
          performance: ['./src/lazy-load.js'],
          // API and interactions
          interactions: ['./src/drag-drop.js', './src/api.js']
        },
        // Optimize for chunking
        chunkFileNames: 'chunks/[name]-[hash].js',
        entryFileNames: '[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    },
    // Limit chunk size warnings
    chunkSizeWarningLimit: 500,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Report compression size
    reportCompressedSize: true
  },
  preview: {
    port: 4173
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [],
    exclude: []
  }
})
