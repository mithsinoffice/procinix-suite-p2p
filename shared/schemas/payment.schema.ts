import { z } from 'zod'
import { optionalString, amountStringSchema } from '../../src/lib/utils/validators'
import { currencySchema, paymentModeSchema } from './common.schema'

export const paymentFormSchema = z.object({
  invoiceId:    z.string().uuid('Select an invoice'),
  amount:       amountStringSchema,
  currency:     currencySchema,
  paymentMode:  paymentModeSchema.default('NEFT'),
  paymentDate:  optionalString,
  narration:    z.string().max(500).optional(),
})

export type PaymentFormInput = z.infer<typeof paymentFormSchema>

export const paymentFilterSchema = z.object({
  status:   z.string().optional(),
  vendorId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo:   z.string().optional(),
  cursor:   z.string().optional(),
  take:     z.coerce.number().int().min(1).max(100).default(25),
})

export type PaymentFilter = z.infer<typeof paymentFilterSchema>
