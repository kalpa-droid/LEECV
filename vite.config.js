import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: 'all'
  },
  build: {
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
