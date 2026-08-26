import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  build: {
    chunkSizeWarningLimit: 2000
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
