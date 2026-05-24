import Fastify from 'fastify'
import staticPlugin           from '@fastify/static'
import { fileURLToPath }      from 'node:url'
import { dirname, resolve }   from 'node:path'
import { envPlugin }          from './plugins/env.js'
import { redisPlugin }        from './lib/redis.js'
import { prismaPlugin }       from './lib/prisma.js'
import { corsConfig }         from './plugins/cors.js'
import { helmetConfig }       from './plugins/helmet.js'
import { rateLimitConfig }    from './plugins/rate-limit.js'
import { authPlugin }         from './plugins/auth.js'
import { tenantPlugin }       from './plugins/tenant.js'
import { errorHandlerPlugin } from './plugins/error-handler.js'
import { rbacHook }           from './middleware/rbac.js'
import { healthRoutes }       from './routes/health.js'
import { webhookRoutes }      from './routes/webhooks.js'
import { authRoutes }         from './routes/auth.js'
import { vendorRoutes }       from './routes/vendors.js'
import { masterRoutes }       from './routes/masters.js'
import { invoiceRoutes }      from './routes/invoices.js'
import { itemRoutes }         from './routes/items.js'
import { dashboardRoutes }    from './routes/dashboard.js'
import { workflowRoutes }     from './routes/workflow.js'
import { adminRoutes }        from './routes/admin.js'
import { procurementRoutes }  from './routes/procurement.js'
import { accountingRoutes }   from './routes/accounting.js'
import { paymentRoutes }      from './routes/payments.js'
import { analyticsRoutes }    from './routes/analytics.js'
import { navBadgesRoutes }    from './routes/nav-badges.js'
import { provisionsRoutes }   from './routes/provisions.js'

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

  // 10. RBAC permission check — runs after auth + tenant, gates mutating routes.
  //     Read routes and unmapped routes fall through. SUPER_ADMIN bypasses.
  app.addHook('preHandler', async (req, reply) => {
    if (!(req as any).user) return
    await rbacHook(req, reply)
  })

  // Routes
  await app.register(healthRoutes)        // no auth — load balancer uses this
  await app.register(webhookRoutes)       // no auth — verified by HMAC signature
  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(vendorRoutes,  { prefix: '/api/masters/vendors' })
  await app.register(masterRoutes,  { prefix: '/api/masters' })
  await app.register(invoiceRoutes,   { prefix: '/api/invoices'   })
  await app.register(itemRoutes,      { prefix: '/api/items'      })
  await app.register(dashboardRoutes,  { prefix: '/api/dashboard'  })
  await app.register(workflowRoutes,   { prefix: '/api/workflow'   })
  await app.register(adminRoutes,        { prefix: '/api' })
  await app.register(procurementRoutes,  { prefix: '/api' })
  await app.register(accountingRoutes,   { prefix: '/api/accounting' })
  await app.register(paymentRoutes,      { prefix: '/api/payments' })
  await app.register(analyticsRoutes,    { prefix: '/api/analytics' })
  await app.register(navBadgesRoutes,    { prefix: '/api/nav' })
  await app.register(provisionsRoutes,   { prefix: '/api/provisions' })

  app.get('/api/ping', async () => ({ pong: true, ts: Date.now() }))

  // Serve the built SPA. dist/ sits two levels above the compiled server entry
  // (server/dist/server.js → ../../dist) and one level above in source (server/src → ../../dist).
  const distRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist')
  await app.register(staticPlugin, {
    root: distRoot,
    prefix: '/',
    wildcard: false,   // don't intercept unknown paths — let setNotFoundHandler decide
  })

  return app
}

async function start() {
  const app = await buildApp()
  const port = Number(process.env.PORT ?? 8787)
  const host = process.env.HOST ?? '0.0.0.0'
  try {
    await app.listen({ port, host })
    app.log.info(`Procinix v2 API on port ${port}`)
    app.log.info('[Ingestion] n8n drives email ingestion via POST /api/webhooks/n8n/invoice')
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
