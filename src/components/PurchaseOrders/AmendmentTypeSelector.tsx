import { DollarSign, Package, Truck, FileText } from 'lucide-react';

type AmendmentType = 'price' | 'quantity' | 'delivery' | 'full';

interface AmendmentTypeSelectorProps {
  selected: AmendmentType | null;
  onSelect: (type: AmendmentType) => void;
}

const AMENDMENT_TYPES: Array<{
  type: AmendmentType;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    type: 'price',
    label: 'Price Change',
    description: 'Modify unit prices or line amounts',
    icon: <DollarSign size={24} />,
  },
  {
    type: 'quantity',
    label: 'Quantity Change',
    description: 'Adjust order quantities',
    icon: <Package size={24} />,
  },
  {
    type: 'delivery',
    label: 'Delivery Change',
    description: 'Update delivery dates or locations',
    icon: <Truck size={24} />,
  },
  {
    type: 'full',
    label: 'Full Amendment',
    description: 'Comprehensive PO revision',
    icon: <FileText size={24} />,
  },
];

export function AmendmentTypeSelector({ selected, onSelect }: AmendmentTypeSelectorProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {AMENDMENT_TYPES.map(({ type, label, description, icon }) => {
        const isSelected = selected === type;
        return (
          <button
            key={type}
            onClick={() => onSelect(type)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 8, padding: '20px 16px', borderRadius: 12, cursor: 'pointer',
              background: isSelected ? 'var(--color-teal-tint)' : 'var(--background)',
              border: `2px solid ${isSelected ? 'var(--color-teal)' : 'var(--color-silver)'}`,
              transition: 'all 0.15s ease',
              textAlign: 'center',
            }}
          >
            <div style={{ color: isSelected ? 'var(--color-teal)' : 'var(--color-slate)' }}>
              {icon}
            </div>
            <div style={{
              fontSize: 14, fontWeight: 600,
              color: isSelected ? 'var(--color-teal-dark)' : 'var(--color-ink)',
            }}>
              {label}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-slate)', lineHeight: 1.4 }}>
              {description}
            </div>
          </button>
        );
      })}
    </div>
  );
}
