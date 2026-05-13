import fp from 'fastify-plugin'
import { z } from 'zod'
import type { FastifyInstance } from 'fastify'

const EnvSchema = z.object({
  NODE_ENV:               z.enum(['development', 'test', 'production']).default('development'),
  PORT:                   z.coerce.number().int().min(1).max(65535).default(8787),
  HOST:                   z.string().default('0.0.0.0'),
  DATABASE_URL:           z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL:              z.string().min(1, 'REDIS_URL is required'),
  JWT_SECRET:             z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET:     z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN:         z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET:          z.string().min(32, 'COOKIE_SECRET must be at least 32 characters'),
  FRONTEND_URL:           z.string().min(1, 'FRONTEND_URL is required'),
  AZURE_STORAGE_CONNECTION_STRING: z.string().optional(),
  AZURE_STORAGE_CONTAINER:         z.string().default('procinix-attachments'),
})

export type AppConfig = z.infer<typeof EnvSchema>

declare module 'fastify' {
  interface FastifyInstance { config: AppConfig }
}

export const envPlugin = fp(async (app: FastifyInstance) => {
  const result = EnvSchema.safeParse(process.env)
  if (!result.success) {
    const issues = result.error.issues
      .map(i => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    console.error('\n🔴 SERVER STARTUP FAILED — invalid environment:\n')
    console.error(issues)
    console.error('\nCopy .env.example to .env and fill in all values.\n')
    process.exit(1)
  }
  if (result.data.NODE_ENV === 'production') {
    if (!result.data.AZURE_STORAGE_CONNECTION_STRING) {
      console.error('🔴 AZURE_STORAGE_CONNECTION_STRING required in production')
      process.exit(1)
    }
    if (result.data.JWT_SECRET.includes('REPLACE_WITH')) {
      console.error('🔴 JWT_SECRET still has placeholder value')
      process.exit(1)
    }
  }
  app.decorate('config', result.data)
  app.log.info(`Environment validated (${result.data.NODE_ENV})`)
})
