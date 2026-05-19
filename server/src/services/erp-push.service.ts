// Stub ERP push adapter. Real ERP integration (Tally/SAP/Zoho/Oracle Fusion)
// plugs in here later — same Promise<ErpPushResult> contract, swap the body
// for HTTP calls + retry semantics. The accounting module is intentionally
// decoupled from the ERP so we can ship the GL workflow without waiting on a
// production adapter.
//
// Update path: erpStatus → SYNCED on success, FAILED on error (with
// errorMessage in erpResponse). retryCount increments on every attempt;
// retryFailed() backs off at retryCount >= 3.

import type { PrismaClient, JournalEntry } from '@prisma/client'

export interface ErpPushResult {
  success:      boolean
  erpRef?:      string
  errorMessage?: string
  payload?:     Record<string, unknown>
  response?:    Record<string, unknown>
}

export interface ErpConfig {
  system?:    string | null
  endpoint?:  string | null
  authType?:  string | null
}

// Stub: builds a deterministic erpRef from the JV id so subsequent retries are
// idempotent. Logs the payload server-side so we can verify the shape during
// QA without a live ERP. Returns success=true unconditionally — the failure
// branch is exercised by tests that inject a different adapter.
export async function pushJournalEntry(
  prisma: PrismaClient,
  jv:     JournalEntry,
  _erpConfig: ErpConfig = {},
): Promise<ErpPushResult> {
  const payload = {
    jvId:        jv.id,
    period:      jv.period,
    entryDate:   jv.entryDate.toISOString(),
    postingDate: jv.postingDate.toISOString(),
    entryType:   jv.entryType,
    debit:       { gl: jv.debitGlCode,  amount: Number(jv.amount) },
    credit:      { gl: jv.creditGlCode, amount: Number(jv.amount) },
    narration:   jv.narration,
    currency:    jv.currencyCode,
    invoiceId:   jv.invoiceId,
  }
  console.log('[ErpPush] STUB push', payload)

  const erpRef = `ERP/STUB-${jv.id.slice(0, 8)}`

  await prisma.journalEntry.update({
    where: { id: jv.id },
    data: {
      erpStatus:   'SYNCED',
      erpRef,
      erpPushedAt: new Date(),
      erpPayload:  payload,
      erpResponse: { ok: true, ref: erpRef },
      retryCount:  { increment: 1 },
      lastRetryAt: new Date(),
    },
  })

  return { success: true, erpRef, payload, response: { ok: true, ref: erpRef } }
}

// Bulk retry — picks up FAILED JVs with retryCount < 3. Caps attempts to
// avoid hot-looping on a broken ERP endpoint. Returns counts the UI can show
// inline. Caller must hold tenant context.
export async function retryFailed(
  prisma:   PrismaClient,
  tenantId: string,
): Promise<{ retried: number, succeeded: number }> {
  const failed = await prisma.journalEntry.findMany({
    where: { tenantId, erpStatus: 'FAILED', retryCount: { lt: 3 } },
    take:  100,
  })

  let succeeded = 0
  for (const jv of failed) {
    const r = await pushJournalEntry(prisma, jv)
    if (r.success) succeeded++
  }
  return { retried: failed.length, succeeded }
}

// Convenience: push a batch by id (manual selection in the UI).
export async function pushBulk(
  prisma:   PrismaClient,
  tenantId: string,
  ids:      string[],
): Promise<{ pushed: number, succeeded: number }> {
  if (ids.length === 0) return { pushed: 0, succeeded: 0 }
  const jvs = await prisma.journalEntry.findMany({
    where: { tenantId, id: { in: ids } },
  })
  let succeeded = 0
  for (const jv of jvs) {
    const r = await pushJournalEntry(prisma, jv)
    if (r.success) succeeded++
  }
  return { pushed: jvs.length, succeeded }
}
