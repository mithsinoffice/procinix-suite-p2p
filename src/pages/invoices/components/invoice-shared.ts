// Shared pure helpers used by every invoice form (Form / CreatePO / CreateDirect).
// Pure functions only — no React, no fetch, no side effects.

export interface LineItem {
  itemId?:         string
  itemCode?:       string
  description:     string
  quantity:        number
  uom?:            string
  unitPrice:       number
  discountPct?:    number
  discountAmount:  number
  taxableAmount:   number
  gstRate?:        number
  cgstAmount:      number
  sgstAmount:      number
  igstAmount:      number
  tdsRate?:        number
  tdsAmount:       number
  rcmApplicable:   boolean
  hsnCode?:        string
  sacCode?:        string
  glCodeId?:       string
  costCentreId?:   string
  profitCentreId?: string
  lineTotal:       number
}

// OCR returns DD/MM/YYYY; HTML date input wants YYYY-MM-DD.
export function dmyToIso(s: string | null | undefined): string | undefined {
  if (!s) return undefined
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (!m) return s.length === 10 ? s : undefined
  const [, d, mo, y] = m
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

// Read a File as base64 (sans data: prefix) — used by OCR upload paths.
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload  = e => resolve(((e.target?.result as string) || '').split(',')[1] ?? '')
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

// Recalculate a single line — discount → taxable → GST split (intra vs inter) → TDS → total.
export function recalcLine(line: LineItem, vendorState: string, entityState: string): LineItem {
  const qty       = Number(line.quantity)    || 0
  const unitPrice = Number(line.unitPrice)   || 0
  const discPct   = Number(line.discountPct) || 0
  const gstRate   = Number(line.gstRate)     || 0
  const tdsRate   = Number(line.tdsRate)     || 0

  const lineBase     = qty * unitPrice
  const discountAmt  = (lineBase * discPct) / 100
  const taxableAmt   = lineBase - discountAmt
  const gstAmt       = (taxableAmt * gstRate) / 100
  const tdsAmt       = (taxableAmt * tdsRate) / 100
  const isInterstate = vendorState && entityState && vendorState !== entityState
  const cgst         = isInterstate ? 0 : gstAmt / 2
  const sgst         = isInterstate ? 0 : gstAmt / 2
  const igst         = isInterstate ? gstAmt : 0
  const total        = taxableAmt + gstAmt - tdsAmt

  return {
    ...line,
    discountAmount: discountAmt,
    taxableAmount:  taxableAmt,
    cgstAmount:     cgst,
    sgstAmount:     sgst,
    igstAmount:     igst,
    tdsAmount:      tdsAmt,
    lineTotal:      total,
  }
}

export function recalcTotals(lines: LineItem[]) {
  return {
    subtotal:       lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0),
    discountAmount: lines.reduce((s, l) => s + Number(l.discountAmount), 0),
    taxableAmount:  lines.reduce((s, l) => s + Number(l.taxableAmount), 0),
    cgstAmount:     lines.reduce((s, l) => s + Number(l.cgstAmount), 0),
    sgstAmount:     lines.reduce((s, l) => s + Number(l.sgstAmount), 0),
    igstAmount:     lines.reduce((s, l) => s + Number(l.igstAmount), 0),
    tdsAmount:      lines.reduce((s, l) => s + Number(l.tdsAmount), 0),
    totalAmount:    lines.reduce((s, l) => s + Number(l.lineTotal), 0),
    netPayable:     lines.reduce((s, l) => s + Number(l.lineTotal), 0),
  }
}

export const emptyLine = (): LineItem => ({
  description: '', quantity: 1, unitPrice: 0, discountPct: 0,
  discountAmount: 0, taxableAmount: 0, gstRate: 0,
  cgstAmount: 0, sgstAmount: 0, igstAmount: 0, tdsRate: 0,
  tdsAmount: 0, rcmApplicable: false, lineTotal: 0,
})

// Master-data response coercion — some endpoints return [], others { data: [] }.
export const toArray = (r: any): any[] => Array.isArray(r) ? r : (r?.data ?? [])
