import Fastify from 'fastify'
import { envPlugin }          from './plugins/env.js'
import { redisPlugin }        from './lib/redis.js'
import { prismaPlugin }       from './lib/prisma.js'
import { corsConfig }         from './plugins/cors.js'
import { helmetConfig }       from './plugins/helmet.js'
import { rateLimitConfig }    from './plugins/rate-limit.js'
import { authPlugin }         from './plugins/auth.js'
import { tenantPlugin }       from './plugins/tenant.js'
import { errorHandlerPlugin } from './plugins/error-handler.js'
import { healthRoutes }       from './routes/health.js'
import { webhookRoutes }      from './routes/webhooks.js'
import { authRoutes }         from './routes/auth.js'
import { vendorRoutes }       from './routes/vendors.js'
import { masterRoutes }       from './routes/masters.js'
import { invoiceRoutes }      from './routes/invoices.js'
import { dashboardRoutes }    from './routes/dashboard.js'
import { workflowRoutes }     from './routes/workflow.js'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    trustProxy: true,
  })

  // Order matters — each plugin depends on the ones before it
  await app.register(envPlugin)           // 1. validate env — everything depends on this
  await app.register(redisPlugin)         // 2. Redis connection
  await app.register(prismaPlugin)        // 3. DB connection
  await app.register(corsConfig)          // 4. CORS headers
  await app.register(helmetConfig)        // 5. Security headers
  await app.register(rateLimitConfig)     // 6. Rate limiting (needs Redis)
  await app.register(authPlugin)          // 7. JWT + cookies
  await app.register(tenantPlugin)        // 8. Tenant context (needs auth)
  await app.register(errorHandlerPlugin)  // 9. Global error handler

  // Routes
  await app.register(healthRoutes)        // no auth — load balancer uses this
  await app.register(webhookRoutes)       // no auth — verified by HMAC signature
  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(vendorRoutes,  { prefix: '/api/masters/vendors' })
  await app.register(masterRoutes,  { prefix: '/api/masters' })
  await app.register(invoiceRoutes,   { prefix: '/api/invoices'   })
  await app.register(dashboardRoutes,  { prefix: '/api/dashboard'  })
  await app.register(workflowRoutes,   { prefix: '/api/workflow'   })

  // Stub routes — to be filled in per module
  app.get('/api/ping', async () => ({ pong: true, ts: Date.now() }))

  return app
}

async function start() {
  const app = await buildApp()
  const port = Number(process.env.PORT ?? 8787)
  const host = process.env.HOST ?? '0.0.0.0'
  try {
    await app.listen({ port, host })
    app.log.info(`Procinix v2 API on port ${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
