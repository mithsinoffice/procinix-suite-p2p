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
import { rbacHook }           from './middleware/rbac.js'
import { pollGmailInbox }     from './services/email-poller.service.js'
import { healthRoutes }       from './routes/health.js'
import { webhookRoutes }      from './routes/webhooks.js'
import { authRoutes }         from './routes/auth.js'
import { vendorRoutes }       from './routes/vendors.js'
import { masterRoutes }       from './routes/masters.js'
import { invoiceRoutes }      from './routes/invoices.js'
import { dashboardRoutes }    from './routes/dashboard.js'
import { workflowRoutes }     from './routes/workflow.js'
import { adminRoutes }        from './routes/admin.js'
import { procurementRoutes }  from './routes/procurement.js'
import { accountingRoutes }   from './routes/accounting.js'
import { paymentRoutes }      from './routes/payments.js'

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
  await app.register(dashboardRoutes,  { prefix: '/api/dashboard'  })
  await app.register(workflowRoutes,   { prefix: '/api/workflow'   })
  await app.register(adminRoutes,        { prefix: '/api' })
  await app.register(procurementRoutes,  { prefix: '/api' })
  await app.register(accountingRoutes,   { prefix: '/api/accounting' })
  await app.register(paymentRoutes,      { prefix: '/api/payments' })

  // Manual Gmail-poll trigger — fire-and-forget; returns a jobId immediately so
  // the frontend can poll /status/:jobId instead of holding an open request for
  // the full duration of the Gmail + Gemini round-trips.
  // In-memory job store — single-process Node. If we ever go multi-instance
  // this needs to move to Redis with TTL.
  type PollJob = {
    processed: number
    errors:    string[]
    done:      boolean
    startedAt: Date
  }
  const pollJobs = new Map<string, PollJob>()

  app.post('/api/email-poll/trigger', { preHandler: [app.authenticate] }, async (req, reply) => {
    const tenantId = req.tenant?.id
    if (!tenantId) return reply.code(401).send({ message: 'No tenant context' })

    const jobId = `poll-${Date.now()}`
    pollJobs.set(jobId, { processed: 0, errors: [], done: false, startedAt: new Date() })

    pollGmailInbox(app.prisma, tenantId)
      .then(result => {
        const prev = pollJobs.get(jobId)!
        pollJobs.set(jobId, {
          processed: result.processed,
          errors:    result.errors,
          done:      true,
          startedAt: prev.startedAt,
        })
      })
      .catch((err: unknown) => {
        const prev = pollJobs.get(jobId)!
        const msg  = err instanceof Error ? err.message : String(err)
        pollJobs.set(jobId, {
          processed: 0,
          errors:    [msg],
          done:      true,
          startedAt: prev.startedAt,
        })
      })

    return reply.send({ jobId, message: 'Poll started' })
  })

  app.get('/api/email-poll/status/:jobId', { preHandler: [app.authenticate] }, async (req, reply) => {
    const job = pollJobs.get((req.params as { jobId: string }).jobId)
    if (!job) return reply.code(404).send({ message: 'Job not found' })
    return reply.send(job)
  })

  // Debug — lists what Gmail returns for `has:attachment` regardless of read state
  // or keyword filter. Useful for diagnosing zero-ingestion issues. TEMPORARY.
  app.get('/api/email-poll/debug', { preHandler: [app.authenticate] }, async (_req, reply) => {
    if (!process.env.GMAIL_REFRESH_TOKEN) {
      return reply.send({ error: 'GMAIL_REFRESH_TOKEN not configured' })
    }
    const { google } = await import('googleapis')
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI,
    )
    oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    try {
      const list = await gmail.users.messages.list({
        userId:     'me',
        q:          'has:attachment',
        maxResults: 50,
      })

      const messages: any[] = []
      for (const msg of list.data.messages ?? []) {
        // Use format:'full' so nested multipart parts are surfaced — Gmail
        // commonly hides attachments under multipart/mixed → multipart/alternative.
        const full = await gmail.users.messages.get({
          userId: 'me',
          id:     msg.id!,
          format: 'full',
        })
        const headers = full.data.payload?.headers ?? []
        const allParts = flattenParts(full.data.payload?.parts ?? [])
        messages.push({
          id:          msg.id,
          from:        headers.find(h => h.name === 'From')?.value,
          subject:     headers.find(h => h.name === 'Subject')?.value,
          date:        headers.find(h => h.name === 'Date')?.value,
          labels:      full.data.labelIds,
          isUnread:    (full.data.labelIds ?? []).includes('UNREAD'),
          attachments: allParts
            .filter(p => p.filename || (p.mimeType ?? '').startsWith('application/') || (p.mimeType ?? '').startsWith('image/'))
            .map(p => ({ name: p.filename, mime: p.mimeType, size: p.body?.size })),
        })
      }

      // Match count for the actual production poller query (now broadened to
      // has:attachment — same query as above, kept as a field for parity).
      const pollerList = await gmail.users.messages.list({
        userId:     'me',
        q:          'has:attachment',
        maxResults: 50,
      })

      return reply.send({
        totalFound:           list.data.messages?.length ?? 0,
        pollerQueryMatches:   pollerList.data.messages?.length ?? 0,
        pollerQuery:          'has:attachment',
        gmailUser:            process.env.GMAIL_USER,
        messages,
      })
    } catch (err: any) {
      return reply.code(500).send({ error: err?.message ?? String(err), stack: err?.stack })
    }
  })

  // Walk nested multipart structures (mirror of helper in email-poller.service.ts)
  function flattenParts(parts: any[]): any[] {
    const out: any[] = []
    for (const p of parts) {
      if (p?.parts?.length) out.push(...flattenParts(p.parts))
      else                  out.push(p)
    }
    return out
  }

  // Stub routes — to be filled in per module
  app.get('/api/ping', async () => ({ pong: true, ts: Date.now() }))

  return app
}

// 5-minute Gmail-poll cron — kicked off from start(), not buildApp(), so tests
// using buildApp() don't leak interval handles. Skips silently when no tenant
// or GMAIL_REFRESH_TOKEN — see email-poller.service.ts.
function startEmailPoller(app: Awaited<ReturnType<typeof buildApp>>) {
  const FIVE_MINUTES = 5 * 60 * 1000
  setInterval(async () => {
    try {
      const tenant = await app.prisma.tenant.findFirst()
      if (tenant) await pollGmailInbox(app.prisma, tenant.id)
    } catch (err) {
      app.log.error({ err }, '[EmailPoller] cron tick failed')
    }
  }, FIVE_MINUTES).unref()
  app.log.info('[EmailPoller] started — polling every 5 minutes')
}

async function start() {
  const app = await buildApp()
  const port = Number(process.env.PORT ?? 8787)
  const host = process.env.HOST ?? '0.0.0.0'
  try {
    await app.listen({ port, host })
    app.log.info(`Procinix v2 API on port ${port}`)
    // In-process Gmail poller is disabled by default — n8n drives email
    // ingestion via POST /webhooks/n8n/invoice-ingest. Re-enable for fallback
    // testing by setting EMAIL_POLLER_ENABLED=true in server/.env.
    if (process.env.EMAIL_POLLER_ENABLED === 'true') {
      startEmailPoller(app)
    } else {
      app.log.info('[EmailPoller] disabled (EMAIL_POLLER_ENABLED!=true) — n8n drives ingestion')
    }
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
