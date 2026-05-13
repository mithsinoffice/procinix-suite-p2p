import type { PrismaClient } from '@prisma/client'

export interface AuditEntry {
  tenantId:   string
  userId:     string
  action:     string
  entityType: string
  entityId:   string
  before?:    Record<string, unknown>
  after?:     Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export async function writeAuditLog(prisma: PrismaClient, entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({ data: entry })
  } catch (err) {
    console.error('[AuditLog] Write failed:', {
      action: entry.action,
      entityId: entry.entityId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

export function sanitiseForAudit(
  obj: Record<string, unknown>,
  omit: string[] = ['passwordHash', 'token', 'refreshToken']
): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !omit.includes(k)))
}

export const AuditAction = {
  INVOICE_CREATED:   'invoice.created',
  INVOICE_SUBMITTED: 'invoice.submitted',
  INVOICE_APPROVED:  'invoice.approved',
  INVOICE_REJECTED:  'invoice.rejected',
  INVOICE_CANCELLED: 'invoice.cancelled',
  PAYMENT_CREATED:   'payment.created',
  PAYMENT_APPROVED:  'payment.approved',
  PAYMENT_PROCESSED: 'payment.processed',
  VENDOR_CREATED:    'vendor.created',
  VENDOR_UPDATED:    'vendor.updated',
  VENDOR_BLOCKED:    'vendor.blocked',
  USER_LOGIN:        'auth.login',
  USER_LOGOUT:       'auth.logout',
  USER_LOGIN_FAILED: 'auth.login_failed',
} as const
