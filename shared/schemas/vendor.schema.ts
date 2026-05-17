import { z } from 'zod'
import {
  gstinOptional, gstinSchema, panSchema, ifscSchema, bankAccountSchema,
  indianMobileSchema, emailSchema, pincodeSchema,
  nonEmptyString, optionalString, cinOptional, udyamOptional,
} from '../../src/lib/utils/validators'

// ── Sub-table row schemas ──

export const bankAccountRowSchema = z.object({
  id:                z.string().optional(),
  accountNo:         bankAccountSchema,
  ifsc:              ifscSchema,
  bankName:          optionalString,
  branch:            optionalString,
  accountType:       z.enum(['CURRENT', 'SAVINGS', 'ESCROW', 'OD']).default('CURRENT'),
  currencyCode:      z.string().default('INR'),
  accountHolderName: optionalString,
  isPrimary:         z.boolean().default(false),
})

export const gstRegistrationRowSchema = z.object({
  id:               z.string().optional(),
  stateCode:        nonEmptyString.max(2),
  gstin:            gstinSchema,
  registrationType: z.enum(['REGULAR', 'COMPOSITION', 'UNREGISTERED', 'SEZ', 'EXPORT', 'ISD']).default('REGULAR'),
  isPrimary:        z.boolean().default(false),
  spocName:         optionalString,
  spocEmail:        emailSchema.optional().or(z.literal('')),
  spocPhone:        optionalString,
})

export const entityMappingRowSchema = z.object({
  id:              z.string().optional(),
  entityId:        nonEmptyString,
  glCodeId:        z.string().optional(),
  costCentreId:    z.string().optional(),
  profitCentreId:  z.string().optional(),
  currencyCode:    z.string().default('INR'),
  creditLimit:     z.coerce.number().min(0).optional(),
  blockPO:         z.boolean().default(false),
  blockPayment:    z.boolean().default(false),
  blockReason:     optionalString,
  paymentTermsDays: z.coerce.number().int().min(0).max(365).default(30),
  paymentMode:     z.string().default('NEFT'),
  erpVendorCode:   optionalString,
  erpSystem:       optionalString,
})

export type BankAccountRow     = z.infer<typeof bankAccountRowSchema>
export type GstRegistrationRow = z.infer<typeof gstRegistrationRowSchema>
export type EntityMappingRow   = z.infer<typeof entityMappingRowSchema>

// ── Main vendor form schema ──

export const vendorFormSchema = z.object({
  // A. Identity & Classification
  legalName:        nonEmptyString.max(200),
  tradeName:        optionalString,
  vendorType:       z.enum(['SUPPLIER', 'SERVICE_PROVIDER', 'CONTRACTOR', 'EMPLOYEE', 'INTERCOMPANY']),
  vendorCategoryId: z.string().optional(),
  vendorGroupId:    z.string().optional(),
  countryCode:      z.string().default('IN'),

  // B. Contact
  email:       emailSchema.optional().or(z.literal('')),
  mobile:      indianMobileSchema.optional().or(z.literal('')),
  contactName: optionalString,
  website:     optionalString,

  // C. Address
  addressLine1: optionalString,
  addressLine2: optionalString,
  city:         optionalString,
  state:        optionalString,
  stateCode:    optionalString,
  pincode:      pincodeSchema.optional().or(z.literal('')),

  // D. Statutory
  pan:            panSchema,
  panCompliance:  z.enum(['COMPLIANT', 'NON_FILER', 'LOWER_DEDUCTION', 'EXEMPTED']).default('COMPLIANT'),
  panEntityType:  z.string().optional(),
  aadharNo:       z.string().optional(),
  msmeCategory:   z.string().optional(),
  gstin:          gstinOptional,
  cin:            cinOptional,
  tan:            z.string().optional(),
  udyamNumber:    udyamOptional,

  // E. GST Registrations (inline table)
  gstRegistrations: z.array(gstRegistrationRowSchema).default([]),

  // F. TDS & Withholding
  tdsApplicable:     z.boolean().default(false),
  tdsSectionCode:    optionalString,
  tdsSectionId:      z.string().optional(),
  tdsRate:           z.coerce.number().min(0).max(100).optional(),
  tdsExempt:         z.boolean().default(false),
  lowerTdsCertNo:    optionalString,
  lowerTdsSection:   optionalString,
  lowerTdsRate:      z.coerce.number().min(0).max(100).optional(),
  lowerTdsValidFrom: z.string().optional(),
  lowerTdsValidTo:   z.string().optional(),
  lowerTdsAlertDays: z.coerce.number().int().min(0).max(365).default(30),
  einvoiceRequired:  z.boolean().default(false),
  is206ABApplicable: z.boolean().default(false),

  // G. Bank Accounts (inline table)
  bankAccounts: z.array(bankAccountRowSchema).default([]),

  // H. Entity Mappings — includes payment + ERP settings per entity
  entityMappings: z.array(entityMappingRowSchema).default([]),

  // Entity-type-dependent statutory fields
  llpRegNo:   z.string().optional(),
  trustRegNo: z.string().optional(),
}).superRefine((val, ctx) => {
  if ((val.panEntityType === 'INDIVIDUAL' || val.panEntityType === 'HUF') && !val.aadharNo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Aadhaar required for Individual / HUF vendors',
      path: ['aadharNo'],
    })
  }
})

export type VendorFormInput = z.infer<typeof vendorFormSchema>
