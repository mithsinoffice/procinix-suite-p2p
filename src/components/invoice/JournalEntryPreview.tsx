import { useMemo } from 'react';
import { InvoiceFormValues } from '../../schemas/invoiceSchema';
import { buildJournalEntries } from '../../utils/buildJournalEntries';

interface JournalEntryPreviewProps {
  formValues: Partial<InvoiceFormValues>;
  compact?: boolean;
}

export function JournalEntryPreview({ formValues, compact = false }: JournalEntryPreviewProps) {
  const journal = useMemo(
    () =>
      buildJournalEntries({
        lines: (formValues.lineItems || []).map((line) => ({
          description: line.description || line.itemName,
          taxableAmount: line.taxableAmount || 0,
          igst: line.igst || 0,
          cgst: line.cgst || 0,
          sgst: line.sgst || 0,
          isRcm: Boolean(formValues.header?.rcm),
          exempt: Boolean(formValues.header?.exempt || formValues.header?.sez),
          itcEligible: !(
            formValues.header?.rcm ||
            formValues.header?.exempt ||
            formValues.header?.sez
          ),
          tdsAmount: line.tdsAmount || 0,
          tdsSection: line.tdsSection || '',
          tdsRate: line.tdsRate || 0,
          expenseGlCode: line.glCode || '',
          costCentre: line.costCentre || '',
        })),
        vendor: {
          groupCode: formValues.vendor?.groupCode,
          groupName: formValues.vendor?.groupName,
        },
        retention: {
          amount: formValues.retention?.amount || 0,
          glCode: formValues.retention?.glCode,
          releaseCondition: formValues.retention?.releaseCondition,
        },
        advances: (formValues.advances || []).map((advance) => ({
          recoveryAmount: advance.recoveryThisBill || 0,
          advanceGlCode: advance.advanceGlCode,
          reference: advance.ref,
        })),
      }),
    [formValues]
  );

  return (
    <div className="rounded-lg border" style={{ borderColor: 'var(--color-silver)' }}>
      <div
        className="px-3 py-2 text-sm"
        style={{ borderBottom: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
      >
        Journal Entry Preview
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
            <tr>
              <th className="px-2 py-2 text-left">#</th>
              <th className="px-2 py-2 text-left">Particulars</th>
              <th className="px-2 py-2 text-left">GL code</th>
              <th className="px-2 py-2 text-left">Cost centre</th>
              {!compact && <th className="px-2 py-2 text-left">Vendor group</th>}
              <th className="px-2 py-2 text-right">Dr</th>
              <th className="px-2 py-2 text-right">Cr</th>
              {!compact && <th className="px-2 py-2 text-left">Note</th>}
            </tr>
          </thead>
          <tbody>
            {journal.entries.map((entry) => (
              <tr
                key={`${entry.seq}-${entry.particulars}`}
                style={{ borderTop: '1px solid var(--color-silver)' }}
              >
                <td className="px-2 py-2">{entry.seq}</td>
                <td className="px-2 py-2">{entry.particulars}</td>
                <td className="px-2 py-2">{entry.glCode}</td>
                <td className="px-2 py-2">{entry.costCentre || '-'}</td>
                {!compact && (
                  <td
                    className="px-2 py-2"
                    style={{ backgroundColor: entry.vendorGroup ? '#F3E8FF' : 'transparent' }}
                  >
                    {entry.vendorGroup || '-'}
                  </td>
                )}
                <td className="px-2 py-2 text-right">{entry.dr.toLocaleString('en-IN')}</td>
                <td className="px-2 py-2 text-right">{entry.cr.toLocaleString('en-IN')}</td>
                {!compact && <td className="px-2 py-2">{entry.note || '-'}</td>}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr
              style={{
                borderTop: '2px solid var(--color-silver)',
                backgroundColor: 'var(--color-cloud)',
              }}
            >
              <td className="px-2 py-2" colSpan={compact ? 4 : 5}>
                {journal.balanced ? 'Balanced ✓' : 'Mismatch ✗'}
              </td>
              <td className="px-2 py-2 text-right">{journal.totalDr.toLocaleString('en-IN')}</td>
              <td className="px-2 py-2 text-right">{journal.totalCr.toLocaleString('en-IN')}</td>
              {!compact && <td className="px-2 py-2" />}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
