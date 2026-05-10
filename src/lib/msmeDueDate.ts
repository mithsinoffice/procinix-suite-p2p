/**
 * MSME 45-day rule (MSMED Act, Section 15):
 * Buyers must pay registered Micro and Small enterprises within 45 days of
 * acceptance of goods/services, or earlier if the contract specifies.
 *
 * Used by InvoiceFormPO and NonPOInvoiceForm to warn — not block — when an
 * MSME-vendor invoice's due date exceeds the statutory cap.
 */

export const MSME_MAX_PAYMENT_DAYS = 45;

function parseISODate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function maxMsmeDueDate(invoiceDate: string | undefined | null): string | null {
  const d = parseISODate(invoiceDate);
  if (!d) return null;
  d.setDate(d.getDate() + MSME_MAX_PAYMENT_DAYS);
  return toISO(d);
}

/** Vendors are MSME if msmeRegistered is true OR category === 'MSME' (AP shape proxy). */
export function isMsmeVendor(
  vendor: { msmeRegistered?: boolean; category?: string } | null | undefined
): boolean {
  if (!vendor) return false;
  if (vendor.msmeRegistered === true) return true;
  if (typeof vendor.category === 'string' && vendor.category.toUpperCase() === 'MSME') return true;
  return false;
}

/** Returns warning string when MSME rule is violated, otherwise null. */
export function msmeDueDateWarning(args: {
  invoiceDate: string | undefined | null;
  dueDate: string | undefined | null;
  msmeRegistered: boolean | undefined;
}): { violated: boolean; maxDate: string | null; message: string | null } {
  const maxDate = maxMsmeDueDate(args.invoiceDate);
  if (!args.msmeRegistered || !maxDate || !args.dueDate) {
    return { violated: false, maxDate, message: null };
  }
  if (args.dueDate > maxDate) {
    return {
      violated: true,
      maxDate,
      message: `⚠ MSME Vendor: Due date exceeds 45-day payment rule (MSMED Act). Maximum due date: ${maxDate}`,
    };
  }
  return { violated: false, maxDate, message: null };
}
