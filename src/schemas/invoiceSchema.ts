import { z } from 'zod';

/**
 * Alignment note for follow-up migration:
 * - server/services/invoiceIngestion/validator.mjs currently runs ad-hoc checks.
 * - This schema is the canonical structure for client + server parity.
 * - Next migration should map validator checks to this schema and shared utility outputs
 *   (determineGST, determineTDS, buildJournalEntries) before replacing legacy checks.
 */

export const VendorGroupSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  relationshipType: z.enum(['Third party', 'Related party', 'Associate', 'JV']).optional(),
  entities: z.array(z.object({ id: z.string(), name: z.string() })).default([]),
});

export const VendorMasterSchema = z.object({
  id: z.string(),
  code: z.string().optional(),
  name: z.string(),
  legalName: z.string().optional(),
  vendorType: z.enum(['company', 'indiv']).default('company'),
  panValid: z.boolean().default(true),
  lowerCert: z.boolean().default(false),
  lowerRate: z.number().nonnegative().default(0),
  tdsExempt: z.boolean().default(false),
  itrFiled: z.boolean().default(true),
  gstReg: z.enum(['reg', 'urd', 'comp', 'foreign']).default('reg'),
  msme: z.boolean().default(false),
  msmeRegNumber: z.string().optional(),
  groupCode: z.string().optional(),
  groupName: z.string().optional(),
});

export const LineItemSchema = z.object({
  id: z.string(),
  itemCode: z.string().optional(),
  itemName: z.string().optional(),
  description: z.string().default(''),
  hsnSac: z.string().optional(),
  glCode: z.string().optional(),
  costCentre: z.string().optional(),
  profitCentre: z.string().optional(),
  wbsProject: z.string().optional(),
  qty: z.number().nonnegative(),
  uom: z.string().optional(),
  rate: z.number().nonnegative(),
  taxableAmount: z.number().nonnegative(),
  gstRate: z.number().nonnegative().default(0),
  igst: z.number().nonnegative().default(0),
  cgst: z.number().nonnegative().default(0),
  sgst: z.number().nonnegative().default(0),
  tdsSection: z.string().default('None'),
  tdsRate: z.number().nonnegative().default(0),
  tdsAmount: z.number().nonnegative().default(0),
  tdsOverride: z.string().optional(),
  netPayable: z.number(),
});

export const InvoiceHeaderSchema = z.object({
  invoiceType: z.string(),
  invoiceNumber: z.string().min(1),
  invoiceDate: z.string().min(1),
  dueDate: z.string().optional(),
  currency: z.string().default('INR'),
  exchangeRate: z.number().positive().default(1),
  poRef: z.string().optional(),
  entityId: z.string().optional(),
  placeOfSupply: z.string().optional(),
  interState: z.boolean().default(false),
  import: z.boolean().default(false),
  sez: z.boolean().default(false),
  exempt: z.boolean().default(false),
  rcm: z.boolean().default(false),
  gstr2bMatched: z.boolean().default(false),
});

export const RetentionSchema = z.object({
  enabled: z.boolean().default(false),
  mode: z.enum(['percent', 'fixed']).default('fixed'),
  value: z.number().nonnegative().default(0),
  amount: z.number().nonnegative().default(0),
  glCode: z.string().optional(),
  releaseCondition: z.string().optional(),
});

export const AdvanceAdjustmentSchema = z.object({
  ref: z.string(),
  originalAmount: z.number().nonnegative(),
  recoveryThisBill: z.number().nonnegative(),
  advanceGlCode: z.string().optional(),
});

export const DeductionSchema = z.object({
  type: z.enum(['LD/penalty', 'damage', 'material recovery', 'insurance', 'other']),
  amount: z.number().nonnegative(),
  glCode: z.string().optional(),
  reference: z.string().optional(),
});

export const BOEHeaderSchema = z.object({
  boeNo: z.string().optional(),
  boeDate: z.string().optional(),
  portOfEntry: z.string().optional(),
  chaName: z.string().optional(),
  countryOfOrigin: z.string().optional(),
  foreignCurrency: z.string().optional(),
  exchangeRate: z.number().positive().optional(),
  bcdPercent: z.number().nonnegative().default(0),
  swsPercent: z.number().nonnegative().default(10),
  igstPercent: z.number().nonnegative().default(0),
  addPercent: z.number().nonnegative().default(0),
  cessPercent: z.number().nonnegative().default(0),
});

export const BOELineSchema = z.object({
  id: z.string(),
  description: z.string(),
  hsCode: z.string().optional(),
  qty: z.number().nonnegative(),
  fobForeign: z.number().nonnegative(),
  cifInr: z.number().nonnegative(),
  bcdPercent: z.number().nonnegative(),
  bcdAmount: z.number().nonnegative(),
  swsPercent: z.number().nonnegative(),
  swsAmount: z.number().nonnegative(),
  igstBase: z.number().nonnegative(),
  igstAmount: z.number().nonnegative(),
  glCode: z.string().optional(),
  costCentre: z.string().optional(),
});

export const BOEChargeSchema = z.object({
  id: z.string(),
  type: z.enum([
    'Ocean freight',
    'Marine insurance',
    'CHA',
    'Inland freight',
    'Port storage',
    'Customs clearance',
    'Other',
  ]),
  amount: z.number().nonnegative(),
  gstPercent: z.number().nonnegative().default(0),
  glCode: z.string().optional(),
  tdsSection: z.string().optional(),
  includeInCustomsDutyBase: z.boolean().default(false),
});

export const InvoiceFormSchema = z.object({
  header: InvoiceHeaderSchema,
  vendor: VendorMasterSchema,
  vendorGroup: VendorGroupSchema.optional(),
  lineItems: z.array(LineItemSchema).min(1),
  retention: RetentionSchema.default({ enabled: false, mode: 'fixed', value: 0, amount: 0 }),
  advances: z.array(AdvanceAdjustmentSchema).default([]),
  deductions: z.array(DeductionSchema).default([]),
  narration: z.string().optional(),
  vendorNarration: z.string().optional(),
  internalRemarks: z.string().optional(),
  boe: z
    .object({
      header: BOEHeaderSchema,
      lines: z.array(BOELineSchema).default([]),
      charges: z.array(BOEChargeSchema).default([]),
      apportionmentMethod: z.enum(['value', 'qty', 'weight', 'equal']).default('value'),
    })
    .optional(),
});

export type VendorGroupValues = z.infer<typeof VendorGroupSchema>;
export type VendorMasterValues = z.infer<typeof VendorMasterSchema>;
export type LineItem = z.infer<typeof LineItemSchema>;
export type InvoiceHeaderValues = z.infer<typeof InvoiceHeaderSchema>;
export type RetentionValues = z.infer<typeof RetentionSchema>;
export type AdvanceAdjustmentValues = z.infer<typeof AdvanceAdjustmentSchema>;
export type DeductionValues = z.infer<typeof DeductionSchema>;
export type BOEHeaderValues = z.infer<typeof BOEHeaderSchema>;
export type BOELineValues = z.infer<typeof BOELineSchema>;
export type BOEChargeValues = z.infer<typeof BOEChargeSchema>;
export type InvoiceFormValues = z.infer<typeof InvoiceFormSchema>;
