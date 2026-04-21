import { VendorMasterValues } from '../../schemas/invoiceSchema';

interface VendorMasterChipsProps {
  vendor: VendorMasterValues;
}

function Chip({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span className="px-2 py-1 rounded-full text-xs" style={{ backgroundColor: bg, color }}>
      {label}
    </span>
  );
}

export function VendorMasterChips({ vendor }: VendorMasterChipsProps) {
  const chips: Array<{ label: string; bg: string; color: string }> = [];

  chips.push({
    label: vendor.vendorType === 'company' ? 'Company/LLP' : 'Individual/HUF',
    bg: vendor.vendorType === 'company' ? '#DBEAFE' : '#FEF3C7',
    color: vendor.vendorType === 'company' ? '#1D4ED8' : '#B45309',
  });

  chips.push({
    label:
      vendor.gstReg === 'reg'
        ? 'GST Registered'
        : vendor.gstReg === 'urd'
          ? 'GST URD'
          : vendor.gstReg === 'comp'
            ? 'GST Composition'
            : 'Foreign Vendor',
    bg: vendor.gstReg === 'reg' ? '#DCFCE7' : vendor.gstReg === 'urd' ? '#FEE2E2' : '#FEF3C7',
    color: vendor.gstReg === 'reg' ? '#166534' : vendor.gstReg === 'urd' ? '#B91C1C' : '#92400E',
  });

  chips.push({
    label: vendor.panValid ? 'PAN Valid' : 'PAN Missing · 206AA risk',
    bg: vendor.panValid ? '#DCFCE7' : '#FEE2E2',
    color: vendor.panValid ? '#166534' : '#B91C1C',
  });

  if (vendor.lowerCert) {
    chips.push({
      label: `Form 13 · ${vendor.lowerRate}%`,
      bg: '#CCFBF1',
      color: '#115E59',
    });
  }

  if (!vendor.itrFiled) {
    chips.push({
      label: '206AB risk',
      bg: '#FEE2E2',
      color: '#B91C1C',
    });
  }

  if (vendor.msme) {
    chips.push({
      label: `MSME${vendor.msmeRegNumber ? ` · ${vendor.msmeRegNumber}` : ''}`,
      bg: '#FFE4E6',
      color: '#BE123C',
    });
    chips.push({
      label: 'MSME pay within 45 days',
      bg: '#FEF3C7',
      color: '#92400E',
    });
  }

  if (vendor.tdsExempt) {
    chips.push({
      label: 'TDS Exempt',
      bg: '#CCFBF1',
      color: '#115E59',
    });
  }

  if (vendor.groupCode || vendor.groupName) {
    chips.push({
      label: `${vendor.groupCode || 'N/A'} · ${vendor.groupName || 'Vendor group'}`,
      bg: '#F3E8FF',
      color: '#6B21A8',
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Chip key={chip.label} label={chip.label} bg={chip.bg} color={chip.color} />
      ))}
    </div>
  );
}

