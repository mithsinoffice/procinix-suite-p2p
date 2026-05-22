// Invoice ingestion orchestrator
// Handles all channels: MANUAL_UPLOAD, VENDOR_PORTAL, EMAIL (via N8N)
// Pipeline: ingest → OCR → vendor identify → dedupe → score → route

import type { PrismaClient } from '@prisma/client'
import { extractInvoiceFromFile, type OcrInvoiceData } from './gemini-ocr.service.js'
import { calculateMatchScore, routeInvoiceToLane, type VendorMatchMethod, type VendorCandidate } from './match-scoring.service.js'
import { matchOcrLinesToItems } from './item-match.service.js'
import { saveInvoiceFile } from './invoice-file-storage.service.js'
import { detectDuplicates } from './duplicate-detector.service.js'
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

interface VendorResolution {
  vendorId:     string | null
  method:       VendorMatchMethod | null
  /** Top-3 fuzzy candidates including the winner. Populated for fuzzy_name resolution. */
  nearMatches:  VendorCandidate[]
}

async function identifyVendor(
  prisma: PrismaClient,
  tenantId: string,
  extracted: OcrInvoiceData,
): Promise<VendorResolution> {
  // 1. GSTIN exact match (most reliable). Winner is unambiguous — no near-matches.
  if (extracted.vendorGstin) {
    const byGstin = await prisma.vendor.findFirst({ where: { tenantId, gstin: extracted.vendorGstin } })
    if (byGstin) return { vendorId: byGstin.id, method: 'gstin_lookup', nearMatches: [] }
  }

  // 2. Fuzzy name match — return winner + top-3 candidates with scores so the
  //    detail page can surface a near-matches dropdown when confidence is low.
  if (extracted.vendorName) {
    const vendors = await prisma.vendor.findMany({
      where:  { tenantId, status: 'ACTIVE' },
      select: { id: true, vendorCode: true, legalName: true, tradeName: true, gstin: true },
    })
    const fuse = new Fuse(vendors, {
      keys: ['legalName', 'tradeName'],
      threshold: 0.5,           // loose enough to surface near-matches
      includeScore: true,
      ignoreLocation: true,
    })
    const results = fuse.search(extracted.vendorName, { limit: 3 })
    const nearMatches: VendorCandidate[] = results.map(r => ({
      id:         r.item.id,
      legalName:  r.item.legalName,
      vendorCode: r.item.vendorCode,
      gstin:      r.item.gstin,
      score:      Math.round((1 - Math.min(Math.max(r.score ?? 1, 0), 1)) * 100),
    }))
    const winner = results[0]
    if (winner && (winner.score ?? 1) < 0.3) {
      return { vendorId: winner.item.id, method: 'fuzzy_name', nearMatches }
    }
    // Winner not confident enough — return null vendor but expose near-matches
    // so the UI can render a "pick the right vendor" picker.
    return { vendorId: null, method: null, nearMatches }
  }

  return { vendorId: null, method: null, nearMatches: [] }
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

    // 3. Identify vendor — returns winner + method + near-matches for the UI.
    //    Invoice.vendorId is nullable; an unresolved vendor lands the invoice
    //    in UNMATCHED status (handled below) rather than 404'ing the ingestion.
    const vendorResolution = await identifyVendor(prisma, ctx.tenantId, extracted)
    const { vendorId, method: vendorMatchMethod, nearMatches: vendorNearMatches } = vendorResolution
    if (!vendorId) {
      await prisma.invoiceIngestionJob.update({
        where: { id: job.id },
        data:  { status: 'NO_VENDOR_MATCH', errorMessage: `No vendor matched (gstin=${extracted.vendorGstin ?? '—'}, name=${extracted.vendorName ?? '—'})` },
      })
      return err({
        code:       'NOT_FOUND' as const,
        message:    `No matching vendor (gstin=${extracted.vendorGstin ?? '—'}, name=${extracted.vendorName ?? '—'})`,
        httpStatus: 404,
      })
    }

    // 4. Dedupe check
    if (extracted.invoiceNumber) {
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

    // 5. Create invoice record (DRAFT). Honour TDS from extracted data — n8n
    //    OCR step or Gemini provider can populate it; falling back to 0 keeps
    //    older OCR payloads working.
    const subtotal    = extracted.subtotal ?? 0
    const totalTax    = extracted.totalTax ?? 0
    const totalAmount = extracted.totalAmount ?? (subtotal + totalTax)
    const tdsAmount   = (extracted as any).tdsAmount ?? 0

    // GST split — OCR providers (especially n8n with a flat-amount payload)
    // often deliver only the aggregate `totalTax`. We split it based on the
    // GSTIN state-code comparison:
    //   same state (intra-state) → CGST + SGST (50/50)
    //   different state (inter-state) → IGST (full)
    // When CGST/SGST/IGST already arrive non-zero (OCR provider has split
    // them) we preserve those exact values. When they're all zero and a
    // totalTax exists, we split. Defaults to intra-state when either GSTIN
    // is missing — the reviewer can correct on the form.
    const explicitCgst = extracted.cgst ?? 0
    const explicitSgst = extracted.sgst ?? 0
    const explicitIgst = extracted.igst ?? 0
    const explicitlySplit = explicitCgst + explicitSgst + explicitIgst > 0
    let cgstAmount = 0
    let sgstAmount = 0
    let igstAmount = 0
    if (explicitlySplit) {
      cgstAmount = explicitCgst
      sgstAmount = explicitSgst
      igstAmount = explicitIgst
    } else if (totalTax > 0) {
      // Resolve entity GSTIN for state-code comparison. ingestInvoice runs
      // without an entity attached for webhook ingest, so we look up the
      // tenant's default ACTIVE entity. Falls back to intra-state when no
      // entity match — the user can correct on the form.
      const vendorState = extracted.vendorGstin ? extracted.vendorGstin.slice(0, 2) : null
      const defaultEntity = await prisma.entity.findFirst({
        where:  { tenantId: ctx.tenantId, status: 'ACTIVE', gstin: { not: null } },
        select: { gstin: true },
        orderBy: { createdAt: 'asc' },
      })
      const entityState = defaultEntity?.gstin ? defaultEntity.gstin.slice(0, 2) : null
      const interState  = vendorState !== null && entityState !== null && vendorState !== entityState
      if (interState) {
        igstAmount = totalTax
      } else {
        cgstAmount = totalTax / 2
        sgstAmount = totalTax / 2
      }
    }
    const taxableAmount = subtotal

    // Resolve due date — prefer OCR value, otherwise auto-compute from the
    // vendor master's paymentTerms. Falls back to null if the vendor has no
    // paymentTerms (frontend renders an amber "configure on vendor master" warning).
    const ocrInvoiceDate = extracted.invoiceDate ? new Date(extracted.invoiceDate.split('/').reverse().join('-')) : new Date()
    let dueDate: Date | null = extracted.dueDate
      ? new Date(extracted.dueDate.split('/').reverse().join('-'))
      : null
    if (!dueDate) {
      const v = await prisma.vendor.findFirst({ where: { id: vendorId, tenantId: ctx.tenantId }, select: { paymentTerms: true } })
      if (v?.paymentTerms != null) {
        dueDate = new Date(ocrInvoiceDate)
        dueDate.setDate(dueDate.getDate() + v.paymentTerms)
      }
    }

    // Period dates — OCR returns DD/MM/YYYY; null when the invoice has no period.
    const dmyToDate = (s: string | null | undefined) =>
      s ? new Date(s.split('/').reverse().join('-')) : null

    const invoice = await prisma.invoice.create({
      data: {
        tenantId:          ctx.tenantId,
        invoiceNumber:     extracted.invoiceNumber ?? `DRAFT-${job.id.slice(0, 8)}`,
        vendorId,
        vendorGSTIN:       extracted.vendorGstin ?? undefined,
        vendorPAN:         extracted.vendorPan   ?? undefined,
        invoiceDate:       ocrInvoiceDate,
        dueDate,
        currencyCode:      extracted.currency ?? 'INR',
        subtotal,
        taxableAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        tdsAmount,
        totalAmount,
        netPayable:        totalAmount - tdsAmount,
        channelType:       payload.channelType,
        ocrConfidence,
        irnNumber:         extracted.irn,
        ocrRawData:        extracted as any,
        narration:         extracted.narration ?? undefined,
        periodFrom:        dmyToDate(extracted.periodFrom),
        periodTo:          dmyToDate(extracted.periodTo),
        vendorMatchMethod: vendorMatchMethod ?? undefined,
        status:            'DRAFT',
        apLane:            'MANUAL',
        createdByUserId:   ctx.userId,
      },
    })

    // Persist the original attachment to disk so the detail page can preview
    // it via GET /api/invoices/:id/file. Only when base64 was actually supplied —
    // structured-data paths (n8n pre-OCR) have nothing to store.
    if (payload.base64Data && payload.mimeType) {
      try {
        const saved = await saveInvoiceFile(
          ctx.tenantId, invoice.id,
          payload.base64Data, payload.mimeType, payload.fileName ?? 'invoice',
        )
        await prisma.invoice.update({
          where: { id: invoice.id },
          data:  { fileUrl: saved.fileUrl, fileName: saved.fileName, mimeType: saved.mimeType },
        })
      } catch {
        // Storage failures shouldn't sink the ingestion — log and continue.
      }
    }

    // Fuzzy-match each OCR line against item_master. The winner's itemId is
    // stored on InvoiceLine so the detail page can render the mapped item name
    // alongside the OCR raw description; the full top-3 set is fed into the
    // match agent (line-item match feeds the Amount bucket) and persisted on
    // the InvoiceMatchScore breakdown JSON for the UI dropdown.
    const itemMatches = await matchOcrLinesToItems(
      prisma, ctx.tenantId,
      (extracted.lineItems ?? []).map(l => l.description ?? ''),
    )

    if (extracted.lineItems?.length > 0) {
      await prisma.invoiceLine.createMany({
        data: extracted.lineItems.map((l, i) => ({
          invoiceId:    invoice.id,
          lineNumber:   i + 1,
          itemId:       itemMatches[i]?.winner?.id ?? null,
          itemCode:     itemMatches[i]?.winner?.itemCode ?? null,
          description:  l.description,
          quantity:     l.quantity  ?? 1,
          unitPrice:    l.unitPrice ?? 0,
          lineTotal:    l.amount    ?? 0,
          rcmApplicable: false,
        })),
      })
    }

    // Pull the entity's base currency for the currency-mismatch guardrail.
    const entity = invoice.entityId
      ? await prisma.entity.findFirst({ where: { id: invoice.entityId }, select: { baseCurrencyCode: true } })
      : null

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
      vendorMatchMethod,
      vendorNearMatches,
      itemMatches,
      entityDefaultCurrency: entity?.baseCurrencyCode ?? undefined,
    })

    await routeInvoiceToLane(prisma, invoice.id, ctx.tenantId, ctx.userId, scoreResult)

    // 6b. Fuzzy duplicate scan — runs *after* the invoice is persisted so the
    //     line rows exist (LINE_ITEM rule needs them) and we can exclude self
    //     via sourceId. Result is stored on duplicateFlag + duplicateMatches.
    //     An EXACT hit auto-holds the invoice; suspicious matches stay in the
    //     current lane (lane logic / LLM scorer handle final routing). Never
    //     throws — duplicate detection is advisory, not gating.
    try {
      const dupResult = await detectDuplicates({
        invoiceNumber: extracted.invoiceNumber,
        vendorId:      vendorId ?? undefined,
        vendorGstin:   extracted.vendorGstin,
        totalAmount,
        invoiceDate:   ocrInvoiceDate.toISOString().slice(0, 10),
        lineItems:     (extracted.lineItems ?? []).map(l => ({
          description: l.description ?? '',
          amount:      l.amount ?? 0,
        })),
        sourceId:      invoice.id,
      }, ctx.tenantId, prisma)
      if (dupResult.matches.length > 0) {
        const flag = dupResult.matches[0].matchType
        const patch: { duplicateFlag: string; duplicateMatches: unknown; status?: string } = {
          duplicateFlag:    flag,
          duplicateMatches: dupResult.matches as unknown,
        }
        if (dupResult.isDuplicate) patch.status = 'ON_HOLD'
        await prisma.invoice.update({ where: { id: invoice.id }, data: patch as never })
      }
    } catch {
      // Duplicate detection is advisory — never sink the ingestion.
    }

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
