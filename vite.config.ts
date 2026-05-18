import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Defensive: force a single React copy across all transitive deps so hooks
    // never see a null dispatcher even if a future dep pulls a different React.
    dedupe: ['react', 'react-dom', 'react-router-dom', 'zustand'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8787',
      '/auth': 'http://localhost:8787',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query', '@tanstack/react-table', '@tanstack/react-virtual'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-select', 'lucide-react'],
          'form-vendor': ['react-hook-form', 'zod', '@hookform/resolvers'],
          'chart-vendor': ['recharts'],
        },
      },
    },
  },
})
