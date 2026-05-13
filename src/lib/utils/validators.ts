import { z } from 'zod'

// ── India-specific ──

export const gstinSchema = z
  .string().trim()
  .transform(s => s.toUpperCase())
  .refine(s => /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(s), {
    message: 'Invalid GSTIN (e.g. 27AABCU9603R1ZV)',
  })

export const gstinOptional = z.union([gstinSchema, z.literal('').transform(() => undefined), z.undefined()])

export const panSchema = z
  .string().trim()
  .transform(s => s.toUpperCase())
  .refine(s => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(s), {
    message: 'Invalid PAN (e.g. ABCDE1234F)',
  })

export const ifscSchema = z
  .string().trim()
  .transform(s => s.toUpperCase())
  .refine(s => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(s), {
    message: 'Invalid IFSC code (e.g. HDFC0001234)',
  })

export const bankAccountSchema = z
  .string().trim()
  .refine(s => /^\d{9,18}$/.test(s), {
    message: 'Bank account must be 9–18 digits',
  })

export const indianMobileSchema = z
  .string().trim()
  .refine(s => /^[6-9]\d{9}$/.test(s), {
    message: 'Enter a valid 10-digit Indian mobile number',
  })

export const pincodeSchema = z
  .string().trim()
  .refine(s => /^\d{6}$/.test(s), { message: 'PIN code must be 6 digits' })

export const tanSchema = z
  .string().trim()
  .transform(s => s.toUpperCase())
  .refine(s => /^[A-Z]{4}[0-9]{5}[A-Z]$/.test(s), { message: 'Invalid TAN' })
  .optional()

// ── Number formats ──

export const amountSchema = z
  .number({ invalid_type_error: 'Enter a valid amount' })
  .positive({ message: 'Amount must be greater than 0' })
  .multipleOf(0.01, { message: 'Maximum 2 decimal places' })
  .max(9_99_99_99_999.99, { message: 'Amount too large' })

export const amountStringSchema = z
  .string().trim()
  .min(1, 'Amount is required')
  .transform(s => parseFloat(s.replace(/,/g, '')))
  .pipe(amountSchema)

export const quantitySchema = z
  .number({ invalid_type_error: 'Enter a valid quantity' })
  .positive({ message: 'Quantity must be greater than 0' })
  .multipleOf(0.001, { message: 'Maximum 3 decimal places' })

export const percentageSchema = z
  .number()
  .min(0, 'Cannot be negative')
  .max(100, 'Cannot exceed 100%')
  .multipleOf(0.01)

// ── Date formats ──

export function parseDDMMYYYY(s: string): Date | null {
  const match = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const [, dd, mm, yyyy] = match
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
  if (
    d.getFullYear() !== Number(yyyy) ||
    d.getMonth()    !== Number(mm) - 1 ||
    d.getDate()     !== Number(dd)
  ) return null
  return d
}

export const ddmmyyyySchema = z
  .string().trim()
  .refine(s => parseDDMMYYYY(s) !== null, { message: 'Enter a valid date in DD/MM/YYYY format' })
  .transform(s => parseDDMMYYYY(s) as Date)

export const pastOrTodayDateSchema = ddmmyyyySchema
  .refine(d => d <= new Date(), { message: 'Date cannot be in the future' })

export const futureOrTodayDateSchema = ddmmyyyySchema
  .refine(d => d >= new Date(new Date().setHours(0, 0, 0, 0)), { message: 'Date cannot be in the past' })

export function getFiscalYear(date: Date): { start: Date; end: Date; label: string } {
  const month = date.getMonth()
  const year  = date.getFullYear()
  const fyStart = month >= 3 ? year : year - 1
  return {
    start: new Date(fyStart, 3, 1),
    end:   new Date(fyStart + 1, 2, 31),
    label: `FY ${fyStart}–${String(fyStart + 1).slice(2)}`,
  }
}

export function isCurrentFiscalYear(date: Date): boolean {
  const { start, end } = getFiscalYear(new Date())
  return date >= start && date <= end
}

// ── General ──

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address')

export const nonEmptyString = z.string().trim().min(1, 'This field is required')

export const optionalString = z
  .string().trim().optional()
  .or(z.literal(''))
  .transform(s => s || undefined)

export function getGstinStateCode(gstin: string): string { return gstin.slice(0, 2) }

export function isInterstate(entityGstin: string, vendorGstin: string): boolean {
  if (!entityGstin || !vendorGstin) return false
  return getGstinStateCode(entityGstin) !== getGstinStateCode(vendorGstin)
}
