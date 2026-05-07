import { LineItem } from '../../schemas/invoiceSchema';

interface TDSThresholdTrackerProps {
  lineItems: LineItem[];
}

const LIMITS: Record<string, number> = {
  '194C': 100000,
  '194J': 30000,
  '194I': 240000,
  '194Q': 5000000,
};

const BASE_COLORS: Record<string, string> = {
  '194C': '#2563EB',
  '194J': '#059669',
  '194I': '#7C3AED',
  '194Q': '#F97316',
};

function pct(amount: number, limit: number) {
  if (limit <= 0) return 0;
  return Math.min((amount / limit) * 100, 100);
}

export function TDSThresholdTracker({ lineItems }: TDSThresholdTrackerProps) {
  const totals = lineItems.reduce<Record<string, number>>((acc, line) => {
    const sec = line.tdsSection;
    if (!LIMITS[sec]) return acc;
    acc[sec] = (acc[sec] || 0) + (line.taxableAmount || 0);
    return acc;
  }, {});

  return (
    <div className="rounded-lg border p-3 space-y-3" style={{ borderColor: 'var(--color-silver)' }}>
      <div className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: 600 }}>
        TDS Threshold Tracker
      </div>
      {Object.entries(LIMITS).map(([section, limit]) => {
        const amount = totals[section] || 0;
        const progress = pct(amount, limit);
        const barColor =
          progress >= 100 ? '#DC2626' : progress >= 75 ? '#D97706' : BASE_COLORS[section];
        const warning =
          progress >= 100
            ? 'Threshold crossed - TDS applies on all prior payments this FY'
            : progress >= 75
              ? 'Approaching limit'
              : '';

        return (
          <div key={section} className="space-y-1">
            <div
              className="flex items-center justify-between text-xs"
              style={{ color: 'var(--color-mercury-grey)' }}
            >
              <span>
                {section} ({limit.toLocaleString('en-IN')})
              </span>
              <span>{amount.toLocaleString('en-IN')}</span>
            </div>
            <div className="h-2 rounded-full" style={{ backgroundColor: '#E5E7EB' }}>
              <div
                className="h-2 rounded-full"
                style={{ width: `${progress}%`, backgroundColor: barColor }}
              />
            </div>
            {warning && (
              <span
                className="inline-block px-2 py-1 rounded-full text-xs"
                style={{
                  backgroundColor: progress >= 100 ? '#FEE2E2' : '#FEF3C7',
                  color: progress >= 100 ? '#B91C1C' : '#92400E',
                }}
              >
                {warning}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
