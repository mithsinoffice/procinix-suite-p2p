// Vendor portal transactional endpoints (Sprint 4).
//
// Two exported route functions:
//   vendorPortalSessionRoutes        — UNAUTH login + auth'd logout, mounted at /api/portal/vendor/session
//   vendorPortalTransactionsRoutes   — vendor-session-gated, mounted at /api/portal/vendor
//
// Splitting keeps the auth boundary obvious: anything in transactionsRoutes
// goes through requireVendorSession. The login route is the one window
// where no session exists yet.

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { requireVendorSession } from '../middleware/requireVendorSession.js'
import {
  nextAsnNumber,
  nextDisputeNumber,
  resolveVendorJoinKeys,
  buildReconSummary,
} from '../services/vendor-portal/portal-transactions.service.js'

const SESSION_TTL_DAYS = 7
const SESSION_TTL_MS   = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000

// ── Validation schemas ───────────────────────────────────────────────────

const poListQuerySchema = z.object({
  status: z.string().optional(),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
}).strict()

const acknowledgeBodySchema = z.object({
  acknowledgementType:  z.enum(['FULL', 'PARTIAL', 'REJECTED']),
  comments:             z.string().max(2000).optional(),
  expectedDeliveryDate: z.string().optional(),
}).strict()

const asnListQuerySchema = z.object({
  status: z.string().optional(),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
}).strict()

const asnCreateBodySchema = z.object({
  poId:                 z.string().min(1),
  lines:                z.array(z.object({
    poLineId: z.string().min(1),
    quantity: z.coerce.number().positive(),
    uom:      z.string().min(1),
  })).min(1),
  dispatchDate:         z.string().min(1),
  expectedDeliveryDate: z.string().min(1),
  carrierName:          z.string().optional(),
  trackingNumber:       z.string().optional(),
  comments:             z.string().max(2000).optional(),
}).strict()

const invoiceListQuerySchema = z.object({
  status: z.string().optional(),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
}).strict()

const invoiceSubmitBodySchema = z.object({
  invoiceType:   z.enum(['PO_BACKED', 'NON_PO']),
  poId:          z.string().optional(),
  lines:         z.array(z.object({
    description: z.string().min(1),
    qty:         z.coerce.number().positive(),
    unitPrice:   z.coerce.number().nonnegative(),
    lineTotal:   z.coerce.number().nonnegative().optional(),
  })).min(1),
  invoiceNumber: z.string().min(1),
  invoiceDate:   z.string().min(1),
  totalAmount:   z.coerce.number().nonnegative(),
  currencyCode:  z.string().length(3).default('INR'),
  taxAmount:     z.coerce.number().nonnegative().optional(),
  attachmentBlobUrl: z.string().url().optional(),
}).strict()

const paymentsQuerySchema = z.object({
  fromDate: z.string().optional(),
  toDate:   z.string().optional(),
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
}).strict()

const disputeBodySchema = z.object({
  invoiceId:         z.string().optional(),
  paymentId:         z.string().optional(),
  disputeType:       z.enum(['PAYMENT_DELAY', 'AMOUNT_MISMATCH', 'DUPLICATE_PAYMENT', 'WRONG_DEDUCTION', 'OTHER']),
  description:       z.string().min(1).max(5000),
  attachmentBlobUrl: z.string().url().optional(),
}).strict()

const loginBodySchema = z.object({
  token: z.string().min(8).max(128),
}).strict()

const poIdParamSchema = z.object({ poId: z.string().min(1) })

// ── UNAUTHENTICATED session routes ───────────────────────────────────────

export async function vendorPortalSessionRoutes(app: FastifyInstance) {
  // POST /api/portal/vendor/session/login
  // The Sprint 1 invitation token is reused here as the magic-link: after
  // onboarding, the same token logs the vendor into the portal. tokenUsedAt
  // being set is fine (vendor has already submitted); we only refuse on
  // tokenExpiresAt in the past.
  app.post('/login', async (req, reply) => {
    const body = loginBodySchema.safeParse(req.body)
    if (!body.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'token required' })
    }

    const request = await app.prisma.vendorOnboardingRequest.findUnique({
      where:  { portalToken: body.data.token },
      select: {
        id: true, tenantId: true, vendorEmail: true, tokenExpiresAt: true,
        profile: { select: { id: true } },
      },
    })
    if (!request) {
      return reply.code(401).send({ error: 'INVALID_TOKEN' })
    }
    if (request.tokenExpiresAt && request.tokenExpiresAt.getTime() < Date.now()) {
      return reply.code(401).send({ error: 'TOKEN_EXPIRED' })
    }
    if (!request.profile) {
      // Vendor hasn't completed onboarding yet — send them to the onboarding
      // flow instead of the portal.
      return reply.code(409).send({ error: 'ONBOARDING_INCOMPLETE' })
    }

    const sessionToken = randomUUID()
    const expiresAt    = new Date(Date.now() + SESSION_TTL_MS)
    const ipAddress    = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ?? req.ip
    const userAgent    = (req.headers['user-agent'] as string | undefined) ?? null

    const session = await app.prisma.vendorPortalSession.create({
      data: {
        vendorId:     request.profile.id,
        email:        request.vendorEmail,
        sessionToken,
        authMethod:   'MAGIC_LINK',
        ipAddress,
        userAgent,
        expiresAt,
      },
    })

    // Set the cookie as httpOnly + Secure (prod) so XSS can't lift it. The
    // body also returns the token so SPAs that prefer header auth can stash
    // it themselves.
    reply.setCookie('vendorSessionToken', sessionToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path:     '/',
      expires:  expiresAt,
    })

    return reply.send({
      sessionToken,
      vendorId:  session.vendorId,
      email:     session.email,
      expiresAt: session.expiresAt,
    })
  })

  // POST /api/portal/vendor/session/logout
  app.post('/logout', { preHandler: [requireVendorSession] }, async (req, reply) => {
    if (!req.vendor) {
      return reply.code(401).send({ error: 'VENDOR_SESSION_INVALID' })
    }
    await app.prisma.vendorPortalSession.delete({
      where: { id: req.vendor.vendorSessionId },
    }).catch(() => {/* already gone */})
    reply.clearCookie('vendorSessionToken', { path: '/' })
    return reply.send({ success: true })
  })
}

// ── Authenticated transactional routes ──────────────────────────────────

export async function vendorPortalTransactionsRoutes(app: FastifyInstance) {
  const guard = { preHandler: [requireVendorSession] }

  // GET /api/portal/vendor/pos
  app.get('/pos', guard, async (req, reply) => {
    const parsed = poListQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'Invalid query', issues: parsed.error.flatten() })
    }
    const { status, page, limit } = parsed.data

    const keys = await resolveVendorJoinKeys(app.prisma, req.vendor!.vendorId)
    if (!keys || !keys.apVendorId) {
      // Profile not yet ERP-synced → no buyer-side POs exist for it.
      return reply.send({ rows: [], total: 0, page, limit })
    }

    const where: any = { tenantId: keys.tenantId, vendorId: keys.apVendorId }
    if (status) where.status = status

    const [total, pos] = await Promise.all([
      app.prisma.purchaseOrder.count({ where }),
      app.prisma.purchaseOrder.findMany({
        where,
        orderBy: { poDate: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
        select: {
          id: true, poRef: true, poDate: true, totalAmount: true,
          currencyCode: true, status: true,
          _count: { select: { lines: true } },
          acknowledgements: {
            orderBy: { acknowledgedAt: 'desc' },
            take:    1,
            select:  { id: true, acknowledgementType: true, status: true, acknowledgedAt: true },
          },
        },
      }),
    ])

    return reply.send({
      rows: pos.map((p) => ({
        id:           p.id,
        poRef:        p.poRef,
        poDate:       p.poDate.toISOString().slice(0, 10),
        totalAmount:  Number(p.totalAmount),
        currencyCode: p.currencyCode,
        status:       p.status,
        lineCount:    p._count.lines,
        latestAck:    p.acknowledgements[0] ?? null,
      })),
      total, page, limit,
    })
  })

  // POST /api/portal/vendor/pos/:poId/acknowledge
  app.post('/pos/:poId/acknowledge', guard, async (req, reply) => {
    const params = poIdParamSchema.safeParse(req.params)
    const body   = acknowledgeBodySchema.safeParse(req.body)
    if (!params.success || !body.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'Invalid request' })
    }
    const keys = await resolveVendorJoinKeys(app.prisma, req.vendor!.vendorId)
    if (!keys || !keys.apVendorId) {
      return reply.code(403).send({ error: 'VENDOR_NOT_LINKED', message: 'Profile is not yet ERP-synced' })
    }

    // Tenant + vendor gate — make sure this PO actually belongs to the
    // session vendor before recording an acknowledgement.
    const po = await app.prisma.purchaseOrder.findFirst({
      where:  { id: params.data.poId, tenantId: keys.tenantId, vendorId: keys.apVendorId },
      select: { id: true },
    })
    if (!po) {
      return reply.code(404).send({ code: 'NOT_FOUND', message: 'PO not found' })
    }

    const ack = await app.prisma.pOAcknowledgement.create({
      data: {
        tenantId:            keys.tenantId,
        purchaseOrderId:     po.id,
        vendorId:            keys.apVendorId,
        acknowledgementType: body.data.acknowledgementType,
        status:              body.data.acknowledgementType === 'REJECTED' ? 'REJECTED' : 'ACKNOWLEDGED',
        comments:            body.data.comments,
        expectedDeliveryDate: body.data.expectedDeliveryDate ? new Date(body.data.expectedDeliveryDate) : null,
        acknowledgedByEmail: req.vendor!.email,
      },
    })
    return reply.code(201).send(ack)
  })

  // GET /api/portal/vendor/asn
  app.get('/asn', guard, async (req, reply) => {
    const parsed = asnListQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'Invalid query' })
    }
    const { status, page, limit } = parsed.data
    const keys = await resolveVendorJoinKeys(app.prisma, req.vendor!.vendorId)
    if (!keys || !keys.apVendorId) {
      return reply.send({ rows: [], total: 0, page, limit })
    }

    const where: any = { tenantId: keys.tenantId, vendorId: keys.apVendorId }
    if (status) where.status = status

    const [total, rows] = await Promise.all([
      app.prisma.advanceShipmentNotice.count({ where }),
      app.prisma.advanceShipmentNotice.findMany({
        where,
        orderBy: { dispatchDate: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
        include: {
          purchaseOrder: { select: { poRef: true } },
          _count:        { select: { lines: true } },
        },
      }),
    ])
    return reply.send({
      rows: rows.map((a) => ({
        id:                   a.id,
        asnNumber:            a.asnNumber,
        poRef:                a.purchaseOrder.poRef,
        status:               a.status,
        dispatchDate:         a.dispatchDate.toISOString().slice(0, 10),
        expectedDeliveryDate: a.expectedDeliveryDate.toISOString().slice(0, 10),
        carrierName:          a.carrierName,
        trackingNumber:       a.trackingNumber,
        lineCount:            a._count.lines,
      })),
      total, page, limit,
    })
  })

  // POST /api/portal/vendor/asn
  app.post('/asn', guard, async (req, reply) => {
    const body = asnCreateBodySchema.safeParse(req.body)
    if (!body.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'Invalid payload', issues: body.error.flatten() })
    }
    const keys = await resolveVendorJoinKeys(app.prisma, req.vendor!.vendorId)
    if (!keys || !keys.apVendorId) {
      return reply.code(403).send({ error: 'VENDOR_NOT_LINKED' })
    }
    const po = await app.prisma.purchaseOrder.findFirst({
      where:  { id: body.data.poId, tenantId: keys.tenantId, vendorId: keys.apVendorId },
      select: { id: true },
    })
    if (!po) {
      return reply.code(404).send({ code: 'NOT_FOUND', message: 'PO not found' })
    }

    const asnNumber = await nextAsnNumber(app.prisma, keys.tenantId)
    const result = await app.prisma.$transaction(async (tx) => {
      const asn = await tx.advanceShipmentNotice.create({
        data: {
          tenantId:             keys.tenantId,
          asnNumber,
          purchaseOrderId:      po.id,
          vendorId:             keys.apVendorId!,
          status:               'CREATED',
          dispatchDate:         new Date(body.data.dispatchDate),
          expectedDeliveryDate: new Date(body.data.expectedDeliveryDate),
          carrierName:          body.data.carrierName,
          trackingNumber:       body.data.trackingNumber,
          comments:             body.data.comments,
        },
      })
      await tx.advanceShipmentLine.createMany({
        data: body.data.lines.map((l) => ({
          asnId:    asn.id,
          poLineId: l.poLineId,
          quantity: l.quantity,
          uom:      l.uom,
        })),
      })
      return asn
    })

    return reply.code(201).send({ asnId: result.id, asnNumber: result.asnNumber, status: result.status })
  })

  // GET /api/portal/vendor/invoices
  app.get('/invoices', guard, async (req, reply) => {
    const parsed = invoiceListQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'Invalid query' })
    }
    const { status, page, limit } = parsed.data
    const keys = await resolveVendorJoinKeys(app.prisma, req.vendor!.vendorId)
    if (!keys || !keys.apVendorId) {
      return reply.send({ rows: [], total: 0, page, limit })
    }

    const where: any = { tenantId: keys.tenantId, vendorId: keys.apVendorId }
    if (status) where.status = status

    const [total, rows] = await Promise.all([
      app.prisma.invoice.count({ where }),
      app.prisma.invoice.findMany({
        where,
        orderBy: { invoiceDate: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
        select: {
          id: true, invoiceNumber: true, invoiceDate: true, poRef: true,
          totalAmount: true, currencyCode: true, status: true, paymentStatus: true,
        },
      }),
    ])
    return reply.send({
      rows: rows.map((i) => ({
        id:             i.id,
        invoiceNumber:  i.invoiceNumber,
        invoiceDate:    i.invoiceDate.toISOString().slice(0, 10),
        poRef:          i.poRef,
        totalAmount:    Number(i.totalAmount),
        currencyCode:   i.currencyCode,
        status:         i.status,
        paymentStatus:  i.paymentStatus,
      })),
      total, page, limit,
    })
  })

  // POST /api/portal/vendor/invoices
  app.post('/invoices', guard, async (req, reply) => {
    const body = invoiceSubmitBodySchema.safeParse(req.body)
    if (!body.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'Invalid payload', issues: body.error.flatten() })
    }
    const keys = await resolveVendorJoinKeys(app.prisma, req.vendor!.vendorId)
    if (!keys || !keys.apVendorId) {
      return reply.code(403).send({ error: 'VENDOR_NOT_LINKED' })
    }

    let poRef: string | null = null
    let grnRef: string | null = null

    if (body.data.invoiceType === 'PO_BACKED') {
      if (!body.data.poId) {
        return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'poId required for PO_BACKED invoice' })
      }
      const po = await app.prisma.purchaseOrder.findFirst({
        where:   { id: body.data.poId, tenantId: keys.tenantId, vendorId: keys.apVendorId },
        select:  { id: true, poRef: true, grns: { take: 1, select: { grnRef: true }, orderBy: { createdAt: 'desc' } } },
      })
      if (!po) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: 'PO not found' })
      }
      poRef  = po.poRef
      grnRef = po.grns[0]?.grnRef ?? null
    }

    const inv = await app.prisma.invoice.create({
      data: {
        tenantId:      keys.tenantId,
        invoiceNumber: body.data.invoiceNumber,
        invoiceDate:   new Date(body.data.invoiceDate),
        vendorId:      keys.apVendorId,
        channelType:   'VENDOR_PORTAL',
        status:        'SUBMITTED',
        isPOInvoice:   body.data.invoiceType === 'PO_BACKED',
        poRef,
        grnRef,
        totalAmount:   body.data.totalAmount,
        netPayable:    body.data.totalAmount,
        currencyCode:  body.data.currencyCode,
        // Tax-amount: the legacy Invoice model has separate cgst/sgst/igst
        // columns; the portal submits a single aggregate, so we stash it in
        // igstAmount as a conservative default. Buyer-side review will
        // re-split per the actual jurisdiction during validation.
        igstAmount:    body.data.taxAmount ?? 0,
        // attachmentBlobUrl is stored separately on the legacy fileUrl field
        // (already @db.Text) when present.
        fileUrl:       body.data.attachmentBlobUrl ?? null,
        // createdByUserId is required on Invoice and there's no buyer User
        // in a vendor-portal flow. Stash the vendor session id with a
        // namespaced prefix so audit downstream can recognise the channel.
        createdByUserId: `vendor-portal:${req.vendor!.vendorSessionId}`,
      },
      select: { id: true, invoiceNumber: true, status: true },
    })
    return reply.code(201).send({ invoiceId: inv.id, invoiceNumber: inv.invoiceNumber, status: inv.status })
  })

  // GET /api/portal/vendor/payments
  app.get('/payments', guard, async (req, reply) => {
    const parsed = paymentsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'Invalid query' })
    }
    const { fromDate, toDate, page, limit } = parsed.data
    const keys = await resolveVendorJoinKeys(app.prisma, req.vendor!.vendorId)
    if (!keys || !keys.apVendorId) {
      return reply.send({ rows: [], total: 0, page, limit })
    }

    const where: any = { tenantId: keys.tenantId, vendorId: keys.apVendorId }
    if (fromDate || toDate) {
      where.paymentDate = {}
      if (fromDate) where.paymentDate.gte = new Date(fromDate)
      if (toDate)   where.paymentDate.lte = new Date(toDate)
    }

    const [total, rows] = await Promise.all([
      app.prisma.payment.count({ where }),
      app.prisma.payment.findMany({
        where,
        orderBy: { paymentDate: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
        select: {
          id: true, paymentDate: true, amount: true, currency: true,
          transbnkUtr: true, invoiceId: true, paymentRef: true, status: true,
        },
      }),
    ])

    return reply.send({
      rows: rows.map((p) => ({
        id:           p.id,
        paymentRef:   p.paymentRef,
        paymentDate:  p.paymentDate ? p.paymentDate.toISOString().slice(0, 10) : null,
        amount:       Number(p.amount),
        currencyCode: p.currency,
        utr:          p.transbnkUtr,
        invoiceId:    p.invoiceId,
        status:       p.status,
      })),
      total, page, limit,
    })
  })

  // GET /api/portal/vendor/recon
  app.get('/recon', guard, async (req, reply) => {
    const keys = await resolveVendorJoinKeys(app.prisma, req.vendor!.vendorId)
    if (!keys || !keys.apVendorId) {
      return reply.send({
        totalInvoiced: 0, totalPaid: 0, outstanding: 0,
        invoiceCount: 0, paidInvoiceCount: 0,
        invoices: [], unmatchedPayments: [],
      })
    }
    const summary = await buildReconSummary(app.prisma, keys.tenantId, keys.apVendorId)
    return reply.send(summary)
  })

  // POST /api/portal/vendor/recon/dispute
  app.post('/recon/dispute', guard, async (req, reply) => {
    const body = disputeBodySchema.safeParse(req.body)
    if (!body.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'Invalid payload', issues: body.error.flatten() })
    }
    if (!body.data.invoiceId && !body.data.paymentId) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'Either invoiceId or paymentId is required' })
    }
    const keys = await resolveVendorJoinKeys(app.prisma, req.vendor!.vendorId)
    if (!keys || !keys.apVendorId) {
      return reply.code(403).send({ error: 'VENDOR_NOT_LINKED' })
    }

    // Tenant + vendor gate the referenced invoice / payment — vendors can't
    // raise disputes against another vendor's documents.
    if (body.data.invoiceId) {
      const inv = await app.prisma.invoice.findFirst({
        where: { id: body.data.invoiceId, tenantId: keys.tenantId, vendorId: keys.apVendorId },
        select: { id: true },
      })
      if (!inv) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Invoice not found' })
    }
    if (body.data.paymentId) {
      const pay = await app.prisma.payment.findFirst({
        where: { id: body.data.paymentId, tenantId: keys.tenantId, vendorId: keys.apVendorId },
        select: { id: true },
      })
      if (!pay) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Payment not found' })
    }

    const disputeNumber = await nextDisputeNumber(app.prisma, keys.tenantId)
    const dispute = await app.prisma.vendorDispute.create({
      data: {
        tenantId:          keys.tenantId,
        disputeNumber,
        vendorId:          keys.apVendorId,
        invoiceId:         body.data.invoiceId ?? null,
        paymentId:         body.data.paymentId ?? null,
        disputeType:       body.data.disputeType,
        description:       body.data.description,
        status:            'OPEN',
        attachmentBlobUrl: body.data.attachmentBlobUrl,
      },
    })
    return reply.code(201).send({
      disputeId:     dispute.id,
      disputeNumber: dispute.disputeNumber,
      status:        dispute.status,
    })
  })
}
