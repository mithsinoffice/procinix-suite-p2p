// Pure helpers around PurchaseOrder consumption tracking — extracted from the
// procurement + invoice routes so they're testable without a live Prisma client.

// Prisma returns Decimal for money columns; Number() coerces it correctly at
// runtime, but the type system needs to know the field accepts more than just
// number | string. Anything with a usable `toString()` works.
export type DecimalLike = number | string | { toString(): string }

export interface POForAugment {
  id:             string
  poRef:          string
  totalAmount:    DecimalLike
  consumedAmount: DecimalLike
  _count?:        { grns: number }
}

export interface AugmentedPO {
  id:             string
  poRef:          string
  totalAmount:    DecimalLike
  consumedAmount: DecimalLike
  openValue:      number
  grnCount:       number
}

// Compute openValue = totalAmount - consumedAmount and flatten the GRN count.
// Pure function — no Prisma, no I/O.
export function augmentPOWithOpenValue<T extends POForAugment>(po: T): T & { openValue: number; grnCount: number } {
  const total    = Number(po.totalAmount)
  const consumed = Number(po.consumedAmount)
  return {
    ...po,
    openValue: total - consumed,
    grnCount:  po._count?.grns ?? 0,
  }
}

// Filter to POs that still have headroom. Used by GET /api/po?hasOpenValue=true.
export function filterByOpenValue<T extends AugmentedPO>(pos: T[], hasOpenValue: boolean): T[] {
  if (!hasOpenValue) return pos
  return pos.filter(p => p.openValue > 0)
}

export interface POLinkInput {
  poId:          string
  invoiceAmount: number
}

export interface POAvailability {
  id:             string
  poRef:          string
  totalAmount:    number | string
  consumedAmount: number | string
}

export type ConsumptionValidationError =
  | { code: 'PO_NOT_FOUND';     poId: string }
  | { code: 'AMOUNT_EXCEEDS';   poRef: string; invoiceAmount: number; openValue: number }

export type ConsumptionValidationResult =
  | { ok: true }
  | { ok: false; error: ConsumptionValidationError }

// Validate that each requested invoice link respects the PO's open value.
// Rounded to 2dp on both sides to absorb float drift.
export function validatePOConsumption(
  links: POLinkInput[],
  pos:   POAvailability[],
): ConsumptionValidationResult {
  for (const link of links) {
    const po = pos.find(p => p.id === link.poId)
    if (!po) return { ok: false, error: { code: 'PO_NOT_FOUND', poId: link.poId } }
    const total     = Number(po.totalAmount)
    const consumed  = Number(po.consumedAmount)
    const openValue = total - consumed
    if (link.invoiceAmount > openValue + 0.01) {
      return {
        ok:    false,
        error: { code: 'AMOUNT_EXCEEDS', poRef: po.poRef, invoiceAmount: link.invoiceAmount, openValue },
      }
    }
  }
  return { ok: true }
}
