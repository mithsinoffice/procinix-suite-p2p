import { defineConfig } from 'vitest/config'

// Covers both frontend src/ and backend server/src/ unit tests.
// Backend tests are pure-function specs that don't need a live Prisma client.
export default defineConfig({
  test: {
    globals:     true,
    environment: 'node',
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'server/src/**/*.{test,spec}.ts',
    ],
    coverage: {
      provider: 'v8',
      exclude:  ['**/node_modules/**', '**/dist/**', 'prisma/**'],
    },
  },
})
