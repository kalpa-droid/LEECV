import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  build: {
    chunkSizeWarningLimit: 2000,
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@react-pdf/renderer')) {
            return 'vendor-react-pdf';
          }
          if (id.includes('lucide-react')) {
            return 'vendor-lucide';
          }
        }
      }
    }
  },
  define: {
    'process.env': {}
  },
  optimizeDeps: {
    include: ['@react-pdf/renderer']
  },
  plugins: [
    react(),
    tailwindcss()
  ],
})
