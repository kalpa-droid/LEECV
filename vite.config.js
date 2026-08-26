import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  build: {
    chunkSizeWarningLimit: 1600,
    rolldownOptions: {
      external: ['@react-pdf/renderer']
    },
    rollupOptions: {
      external: ['@react-pdf/renderer']
    }
  },
  plugins: [
    react(),
    tailwindcss()
  ],
})
