import { z } from 'zod'
import { gstinOptional, panSchema, ifscSchema, bankAccountSchema, indianMobileSchema, emailSchema, pincodeSchema, nonEmptyString, optionalString, cinOptional, udyamOptional } from '../../src/lib/utils/validators'

export const vendorFormSchema = z.object({
  legalName:     nonEmptyString.max(200),
  tradeName:     optionalString,
  gstin:         gstinOptional,
  pan:           panSchema,
  cin:           cinOptional,
  udyamNumber:   udyamOptional,
  vendorType:    z.enum(['SUPPLIER', 'SERVICE_PROVIDER', 'CONTRACTOR', 'EMPLOYEE', 'INTERCOMPANY']),
  email:         emailSchema.optional().or(z.literal('')),
  mobile:        indianMobileSchema.optional().or(z.literal('')),
  city:          optionalString,
  state:         optionalString,
  pincode:       pincodeSchema.optional().or(z.literal('')),
  bankAccountNo: bankAccountSchema.optional().or(z.literal('')),
  ifscCode:      ifscSchema.optional().or(z.literal('')),
  bankName:      optionalString,
  paymentTerms:  z.coerce.number().int().min(0).max(365).default(30),
  tdsApplicable: z.boolean().default(false),
  tdsSectionCode: optionalString,
  panCompliance: z.enum(['COMPLIANT', 'NON_FILER', 'LOWER_DEDUCTION', 'EXEMPTED']).default('COMPLIANT'),
}).refine(d => {
  if (d.bankAccountNo && !d.ifscCode) return false
  return true
}, { message: 'IFSC code is required when bank account is provided', path: ['ifscCode'] })

export type VendorFormInput = z.infer<typeof vendorFormSchema>
