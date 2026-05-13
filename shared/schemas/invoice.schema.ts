import { z } from 'zod'
import { nonEmptyString, optionalString, amountStringSchema, pastOrTodayDateSchema } from '../../src/lib/utils/validators'
import { currencySchema } from './common.schema'

export const invoiceLineSchema = z.object({
  lineNumber:  z.number().int().positive(),
  description: nonEmptyString.max(500),
  quantity:    z.coerce.number().positive('Quantity must be > 0'),
  unitPrice:   amountStringSchema,
  taxCodeId:   optionalString,
  isRcm:       z.boolean().default(false),
  glCodeId:    optionalString,
  costCentreId: optionalString,
})

export const invoiceFormSchema = z.object({
  invoiceNumber: nonEmptyString.max(100),
  vendorId:      z.string().uuid('Select a vendor'),
  invoiceDate:   pastOrTodayDateSchema,
  dueDate:       optionalString,
  currency:      currencySchema,
  glCodeId:      optionalString,
  costCentreId:  optionalString,
  departmentId:  optionalString,
  poId:          optionalString,
  grnId:         optionalString,
  lines:         z.array(invoiceLineSchema).min(1, 'Add at least one line item'),
  narration:     z.string().max(1000).optional(),
}).superRefine((data, ctx) => {
  if (data.dueDate) {
    const due = new Date(data.dueDate)
    const inv = data.invoiceDate as unknown as Date
    if (due < inv) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dueDate'], message: 'Due date cannot be before invoice date' })
  }
})

export type InvoiceFormInput = z.infer<typeof invoiceFormSchema>
export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>

export const invoiceFilterSchema = z.object({
  status:   z.string().optional(),
  vendorId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo:   z.string().optional(),
  search:   z.string().max(100).optional(),
  cursor:   z.string().optional(),
  take:     z.coerce.number().int().min(1).max(100).default(25),
})

export type InvoiceFilter = z.infer<typeof invoiceFilterSchema>
