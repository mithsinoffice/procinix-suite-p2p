import { z } from 'zod'

export const uuidSchema = z.string().uuid('Invalid ID')

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  take:   z.coerce.number().int().min(1).max(100).default(25),
})

export const dateRangeSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo:   z.string().optional(),
}).refine(d => {
  if (d.dateFrom && d.dateTo) return new Date(d.dateFrom) <= new Date(d.dateTo)
  return true
}, { message: 'dateFrom must be before dateTo' })

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'] as const
export const currencySchema = z.enum(CURRENCIES).default('INR')

export const PAYMENT_MODES = ['NEFT', 'RTGS', 'IMPS', 'CHEQUE', 'CASH', 'UPI', 'WIRE'] as const
export const paymentModeSchema = z.enum(PAYMENT_MODES)
