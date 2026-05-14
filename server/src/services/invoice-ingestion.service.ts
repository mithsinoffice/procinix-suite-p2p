// Invoice ingestion orchestrator
// Handles all channels: MANUAL_UPLOAD, VENDOR_PORTAL, EMAIL (via N8N)
// Pipeline: ingest → OCR → vendor identify → dedupe → score → route

import type { PrismaClient } from '@prisma/client'
import { extractInvoiceFromFile, type OcrInvoiceData } from './gemini-ocr.service.js'
import { calculateMatchScore, routeInvoiceToLane } from './match-scoring.service.js'
import { writeAuditLog } from '../lib/audit.js'
import { ok, err, type Result } from '../lib/result.js'
import Fuse from 'fuse.js'

export type ChannelType = 'MANUAL_UPLOAD' | 'VENDOR_PORTAL' | 'EMAIL' | 'FOLDER_WATCH' | 'API'

export interface IngestPayload {
  channelType:   ChannelType
  base64Data?:   string
  mimeType?:     'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp'
  fileName?:     string
  emailFrom?:    string
  emailSubject?: string
  // For structured input (vendor portal / API) — skip OCR
  structuredData?: Partial<OcrInvoiceData>
}

interface IngestCtx { tenantId: string; userId: string; ip?: string }

// ── Vendor identification from OCR data ──

async function identifyVendor(
  prisma: PrismaClient,
  tenantId: string,
  extracted: OcrInvoiceData
): Promise<string | null> {
  // 1. GSTIN exact match (most reliable)
  if (extracted.vendorGstin) {
    const byGstin = await prisma.vendor.findFirst({ where: { tenantId, gstin: extracted.vendorGstin } })
    if (byGstin) return byGstin.id
  }

  // 2. Fuzzy name match using fuse.js
  if (extracted.vendorName) {
    const vendors = await prisma.vendor.findMany({
      where:  { tenantId, status: 'ACTIVE' },
      select: { id: true, legalName: true, tradeName: true },
    })
    const fuse    = new Fuse(vendors, { keys: ['legalName', 'tradeName'], threshold: 0.3, includeScore: true })
    const results = fuse.search(extracted.vendorName, { limit: 1 })
    if (results.length > 0 && (results[0].score ?? 1) < 0.3) return results[0].item.id
  }

  // 3. Email domain match (for email channel)
  return null
}

// ── Main ingestion function ──

export async function ingestInvoice(
  prisma: PrismaClient,
  payload: IngestPayload,
  ctx: IngestCtx
): Promise<Result<{ jobId: string; invoiceId?: string; lane?: string; score?: number }>> {

  // 1. Create ingestion job record
  const job = await prisma.invoiceIngestionJob.create({
    data: {
      tenantId:    ctx.tenantId,
      channelType: payload.channelType,
      status:      'PROCESSING',
      fileName:    payload.fileName,
      mimeType:    payload.mimeType,
      emailFrom:   payload.emailFrom,
      emailSubject: payload.emailSubject,
    },
  })

  try {
    // 2. OCR extraction (skip for structured input)
    let extracted: OcrInvoiceData | null = null
    let ocrConfidence = 100

    if (payload.base64Data && payload.mimeType) {
      const ocrResult = await extractInvoiceFromFile(payload.base64Data, payload.mimeType)
      if (!ocrResult.ok) {
        await prisma.invoiceIngestionJob.update({
          where: { id: job.id },
          data:  { status: 'FAILED', errorMessage: ocrResult.error.message },
        })
        return err(ocrResult.error)
      }
      extracted      = ocrResult.data
      ocrConfidence  = extracted.overallConfidence
      await prisma.invoiceIngestionJob.update({ where: { id: job.id }, data: { extractedData: extracted as any } })
    } else if (payload.structuredData) {
      extracted = payload.structuredData as OcrInvoiceData
    }

    if (!extracted) {
      return err({ code: 'VALIDATION_ERROR' as const, message: 'No file or structured data provided', httpStatus: 400 })
    }

    // 3. Identify vendor
    const vendorId = await identifyVendor(prisma, ctx.tenantId, extracted)

    // 4. Dedupe check (if vendor identified)
    if (vendorId && extracted.invoiceNumber) {
      const dupe = await prisma.invoice.findFirst({
        where: { tenantId: ctx.tenantId, vendorId, invoiceNumber: extracted.invoiceNumber },
      })
      if (dupe) {
        await prisma.invoiceIngestionJob.update({
          where: { id: job.id },
          data:  { status: 'DUPLICATE', invoiceId: dupe.id, errorMessage: `Duplicate of invoice ${dupe.id}` },
        })
        return err({ code: 'DUPLICATE_RECORD' as const, message: `Invoice ${extracted.invoiceNumber} already exists`, httpStatus: 409 })
      }
    }

    // 5. Create invoice record (DRAFT)
    const subtotal    = extracted.subtotal ?? 0
    const taxAmount   = extracted.totalTax ?? 0
    const totalAmount = extracted.totalAmount ?? (subtotal + taxAmount)

    const invoice = await prisma.invoice.create({
      data: {
        tenantId:        ctx.tenantId,
        invoiceNumber:   extracted.invoiceNumber ?? `DRAFT-${job.id.slice(0, 8)}`,
        vendorId:        vendorId ?? ctx.userId, // fallback to creator if vendor not found
        invoiceDate:     extracted.invoiceDate ? new Date(extracted.invoiceDate.split('/').reverse().join('-')) : new Date(),
        dueDate:         extracted.dueDate ? new Date(extracted.dueDate.split('/').reverse().join('-')) : null,
        currency:        extracted.currency ?? 'INR',
        subtotal,
        taxAmount,
        tdsAmount:       0,
        totalAmount,
        netPayable:      totalAmount,
        channelType:     payload.channelType,
        ocrConfidence,
        irn:             extracted.irn,
        isEInvoice:      extracted.isEInvoice,
        ocrRawData:      extracted as any,
        status:          'DRAFT',
        approvalLane:    'MANUAL',
        createdByUserId: ctx.userId,
      },
    })

    // Create line items from OCR
    if (extracted.lineItems?.length > 0) {
      await prisma.invoiceLine.createMany({
        data: extracted.lineItems.map((l, i) => ({
          invoiceId:   invoice.id,
          lineNumber:  i + 1,
          description: l.description,
          quantity:    l.quantity  ?? 1,
          unitPrice:   l.unitPrice ?? 0,
          amount:      l.amount    ?? 0,
          isRcm:       false,
        })),
      })
    }

    // 6. Calculate match score + route to lane
    const isFirstInvoice = vendorId ? (await prisma.invoice.count({ where: { tenantId: ctx.tenantId, vendorId, id: { not: invoice.id } } })) === 0 : true

    const scoreResult = await calculateMatchScore(prisma, {
      invoiceId:     invoice.id,
      tenantId:      ctx.tenantId,
      vendorId:      vendorId ?? '',
      totalAmount,
      ocrConfidence,
      extractedData: extracted,
      isFirstInvoice,
    })

    await routeInvoiceToLane(prisma, invoice.id, ctx.tenantId, ctx.userId, scoreResult)

    // 7. Update job as done
    await prisma.invoiceIngestionJob.update({
      where: { id: job.id },
      data:  { status: 'DONE', invoiceId: invoice.id },
    })

    await writeAuditLog(prisma, {
      tenantId: ctx.tenantId, userId: ctx.userId,
      action: 'invoice.ingested', entityType: 'invoice', entityId: invoice.id,
      after: { channel: payload.channelType, score: scoreResult.totalScore, lane: scoreResult.lane },
      ipAddress: ctx.ip,
    })

    return ok({ jobId: job.id, invoiceId: invoice.id, lane: scoreResult.lane, score: scoreResult.totalScore })

  } catch (e) {
    await prisma.invoiceIngestionJob.update({
      where: { id: job.id },
      data:  { status: 'FAILED', errorMessage: e instanceof Error ? e.message : String(e) },
    })
    return err({ code: 'INTERNAL_ERROR' as const, message: 'Ingestion pipeline failed', httpStatus: 500 })
  }
}
