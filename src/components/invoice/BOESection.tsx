import { useMemo } from 'react';
import { apportionBOECharges, BOEApportionMethod } from '../../utils/apportionBOECharges';
import { BOEChargeValues, BOEHeaderValues, BOELineValues } from '../../schemas/invoiceSchema';

interface BOESectionProps {
  invoiceType?: string;
  header: BOEHeaderValues;
  lines: BOELineValues[];
  charges: BOEChargeValues[];
  apportionmentMethod: BOEApportionMethod;
  exchangeRate: number;
  onHeaderChange: (next: BOEHeaderValues) => void;
  onLinesChange: (next: BOELineValues[]) => void;
  onChargesChange: (next: BOEChargeValues[]) => void;
  onMethodChange: (method: BOEApportionMethod) => void;
}

export function BOESection({
  invoiceType,
  header,
  lines,
  charges,
  apportionmentMethod,
  exchangeRate,
  onHeaderChange,
  onLinesChange,
  onChargesChange,
  onMethodChange,
}: BOESectionProps) {
  const show = invoiceType === 'Import invoice' || invoiceType === 'Bill of entry';
  const landed = useMemo(
    () =>
      apportionBOECharges(
        lines.map((line) => ({
          id: line.id,
          value: line.cifInr,
          qty: line.qty,
          baseAmount: line.cifInr + line.bcdAmount + line.swsAmount + line.igstAmount,
        })),
        charges.map((charge) => ({ id: charge.id, amount: charge.amount })),
        apportionmentMethod
      ),
    [lines, charges, apportionmentMethod]
  );

  if (!show) return null;

  return (
    <div className="rounded-lg border p-4 space-y-4" style={{ borderColor: 'var(--color-silver)' }}>
      <div className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: 600 }}>
        Bill of Entry
      </div>
      <div className="grid grid-cols-2 gap-4">
        <input
          placeholder="BOE no"
          value={header.boeNo || ''}
          onChange={(e) => onHeaderChange({ ...header, boeNo: e.target.value })}
          className="px-3 py-2 rounded border"
          style={{ borderColor: 'var(--color-silver)' }}
        />
        <input
          placeholder="Port of entry"
          value={header.portOfEntry || ''}
          onChange={(e) => onHeaderChange({ ...header, portOfEntry: e.target.value })}
          className="px-3 py-2 rounded border"
          style={{ borderColor: 'var(--color-silver)' }}
        />
        <input
          placeholder="CHA name"
          value={header.chaName || ''}
          onChange={(e) => onHeaderChange({ ...header, chaName: e.target.value })}
          className="px-3 py-2 rounded border"
          style={{ borderColor: 'var(--color-silver)' }}
        />
        <input
          placeholder="Exchange rate"
          type="number"
          value={header.exchangeRate || exchangeRate || 1}
          onChange={(e) => onHeaderChange({ ...header, exchangeRate: Number(e.target.value) || 1 })}
          className="px-3 py-2 rounded border"
          style={{ borderColor: 'var(--color-silver)' }}
        />
      </div>

      <div className="flex gap-2">
        {(['value', 'qty', 'weight', 'equal'] as BOEApportionMethod[]).map((method) => (
          <button
            type="button"
            key={method}
            className="px-2 py-1 rounded border text-xs"
            style={{
              borderColor: 'var(--color-silver)',
              backgroundColor: apportionmentMethod === method ? 'var(--color-cloud)' : '#fff',
            }}
            onClick={() => onMethodChange(method)}
          >
            {method}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
            <tr>
              <th className="px-2 py-2 text-left">Description</th>
              <th className="px-2 py-2 text-right">CIF</th>
              <th className="px-2 py-2 text-right">BCD</th>
              <th className="px-2 py-2 text-right">SWS</th>
              <th className="px-2 py-2 text-right">IGST</th>
              <th className="px-2 py-2 text-right">Allocated charges</th>
              <th className="px-2 py-2 text-right">Landed cost</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={line.id} style={{ borderTop: '1px solid var(--color-silver)' }}>
                <td className="px-2 py-2">{line.description}</td>
                <td className="px-2 py-2 text-right">{line.cifInr.toLocaleString('en-IN')}</td>
                <td className="px-2 py-2 text-right">{line.bcdAmount.toLocaleString('en-IN')}</td>
                <td className="px-2 py-2 text-right">{line.swsAmount.toLocaleString('en-IN')}</td>
                <td className="px-2 py-2 text-right">{line.igstAmount.toLocaleString('en-IN')}</td>
                <td className="px-2 py-2 text-right">
                  {(landed[index]?.allocatedCharge || 0).toLocaleString('en-IN')}
                </td>
                <td className="px-2 py-2 text-right">
                  {(landed[index]?.landedCost || 0).toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
