import { defineConfig } from 'vitest/config'
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
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: 'vendor-lucide',
              test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
              priority: 20,
            },
            {
              name: 'vendor-react-pdf',
              test: /[\\/]node_modules[\\/]@react-pdf[\\/]/,
              includeDependenciesRecursively: false,
              priority: 10,
            },
          ],
        },
      },
    },
  },
  define: {
    'process.env': {}
  },
  optimizeDeps: {
    include: ['@react-pdf/renderer']
  },
  test: {
    pool: 'threads',
    maxWorkers: 2,
    fileParallelism: false
  },
  plugins: [
    react(),
    tailwindcss()
  ],
})
