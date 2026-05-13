import type { FastifyInstance } from 'fastify'
import { getPrismaClient } from '../lib/prisma.js'
import { getRedisClient } from '../lib/redis.js'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health/live', async (_, reply) => {
    return reply.send({ status: 'alive', timestamp: new Date().toISOString() })
  })

  app.get('/health/ready', async (_, reply) => {
    const checks: Record<string, 'ok' | 'fail'> = {}
    let allOk = true
    try { await getPrismaClient().$queryRaw`SELECT 1`; checks.database = 'ok' }
    catch { checks.database = 'fail'; allOk = false }
    try { await getRedisClient().ping(); checks.redis = 'ok' }
    catch { checks.redis = 'fail'; allOk = false }
    return reply.code(allOk ? 200 : 503).send({
      status: allOk ? 'ready' : 'not_ready',
      checks,
      version: '2.0.0',
      timestamp: new Date().toISOString(),
    })
  })

  app.get('/health', async (_, reply) => {
    try {
      await getPrismaClient().$queryRaw`SELECT 1`
      await getRedisClient().ping()
      return reply.send({ status: 'ok', version: '2.0.0' })
    } catch {
      return reply.code(503).send({ status: 'degraded' })
    }
  })
}
