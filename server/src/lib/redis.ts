import Redis from 'ioredis'
import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance { redis: Redis }
}

let _redis: Redis | null = null

export function getRedisClient(): Redis {
  if (_redis) return _redis
  _redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times) => times > 5 ? null : Math.min(times * 100, 2000),
  })
  _redis.on('error', (err) => console.error('[Redis] error:', err.message))
  return _redis
}

export const redisPlugin = fp(async (app: FastifyInstance) => {
  const redis = getRedisClient()
  try {
    await redis.ping()
    app.log.info('Redis connected')
  } catch (err) {
    app.log.error('Redis connection failed on startup')
    throw err
  }
  app.decorate('redis', redis)
  app.addHook('onClose', async () => { await redis.quit() })
})

export const TTL = {
  MASTER_DATA:  60 * 60,
  DASHBOARD:    5  * 60,
  SESSION:      15 * 60,
  SEARCH:       10 * 60,
  IDEMPOTENCY:  24 * 60 * 60,
} as const

export async function cacheSet<T>(redis: Redis, key: string, value: T, ttlSeconds: number) {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
}

export async function cacheGet<T>(redis: Redis, key: string): Promise<T | null> {
  const raw = await redis.get(key)
  if (!raw) return null
  try { return JSON.parse(raw) as T } catch { return null }
}

export async function cacheInvalidate(redis: Redis, ...keys: string[]) {
  if (keys.length) await redis.del(...keys)
}

export const CacheKeys = {
  masterData:   (tenantId: string) => `tenant:${tenantId}:masters`,
  dashboard:    (tenantId: string) => `tenant:${tenantId}:dashboard`,
  session:      (token: string)    => `session:${token}`,
  vendorSearch: (tenantId: string, term: string) => `search:${tenantId}:vendors:${term}`,
  idempotency:  (key: string)      => `idem:${key}`,
}
