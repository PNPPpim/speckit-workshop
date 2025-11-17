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
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          api: ['./src/api.js'],
          components: ['./src/album-list.js', './src/album.js', './src/photo-tile.js'],
          utils: ['./src/drag-drop.js', './src/db.js']
        }
      }
    }
  },
  preview: {
    port: 4173
  }
})
