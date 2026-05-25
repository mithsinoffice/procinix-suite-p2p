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
        // Function form so react + react-dom + scheduler + jsx-runtime +
        // react-router all land in the SAME chunk. The object form misses
        // `scheduler` and `react/jsx-runtime` (transitive deps), which then
        // get hoisted into a different chunk and try to read React internals
        // before React's module body has finished evaluating — surfacing as
        // `Cannot read properties of undefined (reading '__SECRET_INTERNALS_…')`.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run[\\/]router)[\\/]/.test(id)) {
            return 'react-vendor'
          }
          if (/[\\/]node_modules[\\/]@tanstack[\\/]/.test(id)) return 'query-vendor'
          if (/[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/.test(id)) return 'ui-vendor'
          if (/[\\/]node_modules[\\/](react-hook-form|zod|@hookform[\\/]resolvers)[\\/]/.test(id)) return 'form-vendor'
          if (/[\\/]node_modules[\\/]recharts[\\/]/.test(id)) return 'chart-vendor'
        },
      },
    },
  },
})
