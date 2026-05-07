import { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { LineItem, VendorMasterValues } from '../../schemas/invoiceSchema';
import { determineGST } from '../../utils/determineGST';
import { determineTDS } from '../../utils/determineTDS';

interface InvoiceFlagsInput {
  rcm: boolean;
  exempt: boolean;
  sez: boolean;
  interState: boolean;
  import: boolean;
  itcblock?: boolean;
}

interface LineItemRowProps {
  line: LineItem;
  vendorMaster: VendorMasterValues;
  invoiceFlags: InvoiceFlagsInput;
  supplyType?: string;
  onChange: (line: LineItem) => void;
  onDelete: () => void;
}

function Chip({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span className="px-2 py-1 rounded-full text-xs" style={{ backgroundColor: bg, color }}>
      {label}
    </span>
  );
}

export function LineItemRow({
  line,
  vendorMaster,
  invoiceFlags,
  onChange,
  onDelete,
}: LineItemRowProps) {
  const gstResult = useMemo(
    () =>
      determineGST({
        itemMaster: { gstRate: line.gstRate || 0, rcmCategory: false },
        vendorMaster: { gstReg: vendorMaster.gstReg },
        invoiceFlags,
        amount: line.taxableAmount,
      }),
    [line.gstRate, line.taxableAmount, vendorMaster.gstReg, invoiceFlags]
  );

  const tdsResult = useMemo(
    () =>
      determineTDS({
        itemMaster: {
          tdsSec: (line.tdsSection as any) || 'None',
          threshold: 0,
        },
        vendorMaster: {
          type: vendorMaster.vendorType,
          panValid: vendorMaster.panValid,
          lowerCert: vendorMaster.lowerCert,
          lowerRate: vendorMaster.lowerRate,
          tdsExempt: vendorMaster.tdsExempt,
          itrFiled: vendorMaster.itrFiled,
        },
        amount: line.taxableAmount,
      }),
    [line.tdsSection, line.taxableAmount, vendorMaster]
  );

  const handleNumeric = (key: keyof LineItem, value: string) => {
    const next = Number(value || 0);
    const taxableAmount =
      key === 'qty' || key === 'rate'
        ? (key === 'qty' ? next : line.qty) * (key === 'rate' ? next : line.rate)
        : line.taxableAmount;
    const updated: LineItem = { ...line, [key]: next, taxableAmount };

    const gst = determineGST({
      itemMaster: { gstRate: updated.gstRate, rcmCategory: false },
      vendorMaster: { gstReg: vendorMaster.gstReg },
      invoiceFlags,
      amount: taxableAmount,
    });
    const tds = determineTDS({
      itemMaster: { tdsSec: (updated.tdsSection as any) || 'None', threshold: 0 },
      vendorMaster: {
        type: vendorMaster.vendorType,
        panValid: vendorMaster.panValid,
        lowerCert: vendorMaster.lowerCert,
        lowerRate: vendorMaster.lowerRate,
        tdsExempt: vendorMaster.tdsExempt,
        itrFiled: vendorMaster.itrFiled,
      },
      amount: taxableAmount,
    });

    updated.igst = gst.igst;
    updated.cgst = gst.cgst;
    updated.sgst = gst.sgst;
    updated.tdsRate = tds.rate;
    updated.tdsAmount = tds.netTDS;
    updated.tdsOverride = tds.override;
    updated.netPayable = taxableAmount + gst.igst + gst.cgst + gst.sgst - tds.netTDS;
    onChange(updated);
  };

  return (
    <tr className="border-t" style={{ borderColor: 'var(--color-silver)' }}>
      <td className="px-2 py-2">
        <input
          value={line.itemName || ''}
          onChange={(e) => onChange({ ...line, itemName: e.target.value })}
          className="w-full px-2 py-1 rounded border"
          style={{ borderColor: 'var(--color-silver)' }}
        />
      </td>
      <td className="px-2 py-2">
        <input
          value={line.hsnSac || ''}
          onChange={(e) => onChange({ ...line, hsnSac: e.target.value })}
          className="w-full px-2 py-1 rounded border"
          style={{ borderColor: 'var(--color-silver)' }}
        />
      </td>
      <td className="px-2 py-2">
        <input
          value={line.glCode || ''}
          onChange={(e) => onChange({ ...line, glCode: e.target.value })}
          className="w-full px-2 py-1 rounded border"
          style={{ borderColor: 'var(--color-silver)' }}
        />
      </td>
      <td className="px-2 py-2">
        <input
          value={line.costCentre || ''}
          onChange={(e) => onChange({ ...line, costCentre: e.target.value })}
          className="w-full px-2 py-1 rounded border"
          style={{ borderColor: 'var(--color-silver)' }}
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="number"
          value={line.qty}
          onChange={(e) => handleNumeric('qty', e.target.value)}
          className="w-full px-2 py-1 rounded border text-right"
          style={{ borderColor: 'var(--color-silver)' }}
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="number"
          value={line.rate}
          onChange={(e) => handleNumeric('rate', e.target.value)}
          className="w-full px-2 py-1 rounded border text-right"
          style={{ borderColor: 'var(--color-silver)' }}
        />
      </td>
      <td className="px-2 py-2 text-right">{line.taxableAmount.toLocaleString('en-IN')}</td>
      <td className="px-2 py-2 text-right">{(line.gstRate || 0).toFixed(2)}%</td>
      <td className="px-2 py-2 text-right">{gstResult.igst.toLocaleString('en-IN')}</td>
      <td className="px-2 py-2 text-right">{gstResult.cgst.toLocaleString('en-IN')}</td>
      <td className="px-2 py-2 text-right">{gstResult.sgst.toLocaleString('en-IN')}</td>
      <td className="px-2 py-2">
        <div className="flex flex-col gap-1">
          <Chip label={line.tdsSection || 'None'} bg="#DBEAFE" color="#1E3A8A" />
          <Chip
            label={tdsResult.override}
            bg={
              tdsResult.override === '206AA' || tdsResult.override === '206AB'
                ? '#FEE2E2'
                : '#F3F4F6'
            }
            color={
              tdsResult.override === '206AA' || tdsResult.override === '206AB'
                ? '#B91C1C'
                : '#4B5563'
            }
          />
          <Chip
            label={tdsResult.rate > 0 ? `${tdsResult.rate}% applied` : 'Skipped'}
            bg={tdsResult.rate > 0 ? '#DCFCE7' : '#F3F4F6'}
            color={tdsResult.rate > 0 ? '#166534' : '#4B5563'}
          />
        </div>
      </td>
      <td className="px-2 py-2 text-right">{tdsResult.rate.toFixed(2)}%</td>
      <td className="px-2 py-2 text-right">{tdsResult.netTDS.toLocaleString('en-IN')}</td>
      <td className="px-2 py-2 text-right">
        {(
          line.taxableAmount +
          gstResult.igst +
          gstResult.cgst +
          gstResult.sgst -
          tdsResult.netTDS
        ).toLocaleString('en-IN')}
      </td>
      <td className="px-2 py-2 text-center">
        <button
          type="button"
          onClick={onDelete}
          className="p-1 rounded hover:bg-red-50"
          style={{ color: 'var(--color-error)' }}
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}
