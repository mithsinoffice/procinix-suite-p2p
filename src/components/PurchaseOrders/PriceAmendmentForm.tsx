import { useState, useMemo } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

interface LineItem {
  id: string;
  itemName: string;
  currentPrice: number;
  quantity: number;
}

interface PriceChange {
  lineItemId: string;
  fieldChanged: string;
  originalValue: string;
  newValue: string;
}

interface PriceAmendmentFormProps {
  lineItems: LineItem[];
  onChange: (changes: PriceChange[]) => void;
}

export function PriceAmendmentForm({ lineItems, onChange }: PriceAmendmentFormProps) {
  const [newPrices, setNewPrices] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    lineItems.forEach((item) => { initial[item.id] = item.currentPrice; });
    return initial;
  });

  const handlePriceChange = (id: string, value: number) => {
    const updated = { ...newPrices, [id]: value };
    setNewPrices(updated);

    const changes: PriceChange[] = lineItems
      .filter((item) => updated[item.id] !== item.currentPrice)
      .map((item) => ({
        lineItemId: item.id,
        fieldChanged: 'unitPrice',
        originalValue: String(item.currentPrice),
        newValue: String(updated[item.id]),
      }));
    onChange(changes);
  };

  const summary = useMemo(() => {
    const originalTotal = lineItems.reduce((sum, i) => sum + i.currentPrice * i.quantity, 0);
    const newTotal = lineItems.reduce((sum, i) => sum + (newPrices[i.id] ?? i.currentPrice) * i.quantity, 0);
    const netChange = newTotal - originalTotal;
    const pctChange = originalTotal > 0 ? (netChange / originalTotal) * 100 : 0;
    return { originalTotal, newTotal, netChange, pctChange };
  }, [lineItems, newPrices]);

  const fmt = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v);

  const requiresApproval = Math.abs(summary.pctChange) > 10;

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {/* Table */}
      <div style={{ flex: 1, overflowX: 'auto' }}>
        {requiresApproval && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
            background: 'var(--color-warning-light)', borderRadius: 12, marginBottom: 16,
            border: '1px solid var(--color-warning)',
          }}>
            <AlertTriangle size={18} style={{ color: 'var(--color-warning-dark)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--color-warning-dark)', fontWeight: 500 }}>
              This change requires CFO approval (exceeds 10% threshold)
            </span>
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-silver)' }}>
              {['Item', 'Current Price', 'New Price', 'Change', 'Change %'].map((h) => (
                <th key={h} style={{
                  padding: '8px 12px', textAlign: 'left',
                  color: 'var(--color-slate)', fontWeight: 500, fontSize: 12,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item) => {
              const newPrice = newPrices[item.id] ?? item.currentPrice;
              const change = newPrice - item.currentPrice;
              const changePct = item.currentPrice > 0 ? (change / item.currentPrice) * 100 : 0;
              const isHigh = Math.abs(changePct) > 10;

              return (
                <tr key={item.id} style={{
                  borderBottom: '1px solid var(--color-silver)',
                  backgroundColor: isHigh ? 'var(--color-error-light)' : 'transparent',
                }}>
                  <td style={{ padding: '8px 12px', color: 'var(--color-ink)', fontWeight: 500 }}>
                    {item.itemName}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--color-slate)' }}>
                    {fmt(item.currentPrice)}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <input
                      type="number"
                      value={newPrice}
                      min={0}
                      step={0.01}
                      onChange={(e) => handlePriceChange(item.id, parseFloat(e.target.value) || 0)}
                      style={{
                        width: 120, padding: '6px 10px', borderRadius: 6, fontSize: 13,
                        border: `1px solid ${isHigh ? 'var(--color-error)' : 'var(--color-silver)'}`,
                        background: 'var(--color-cloud)', color: 'var(--color-ink)',
                      }}
                    />
                  </td>
                  <td style={{
                    padding: '8px 12px', fontWeight: 500,
                    color: change > 0 ? 'var(--color-error)' : change < 0 ? 'var(--color-success)' : 'var(--color-slate)',
                  }}>
                    {change > 0 ? '+' : ''}{fmt(change)}
                  </td>
                  <td style={{
                    padding: '8px 12px', fontWeight: 600,
                    color: Math.abs(changePct) > 10 ? 'var(--color-error)' : 'var(--color-slate)',
                  }}>
                    {changePct > 0 ? '+' : ''}{changePct.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Card */}
      <div style={{
        width: 220, flexShrink: 0, padding: 16, borderRadius: 12,
        background: 'var(--color-cloud)', border: '1px solid var(--color-silver)',
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 16 }}>
          Amendment Summary
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-slate)', marginBottom: 2 }}>Original Total</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-ink)' }}>{fmt(summary.originalTotal)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-slate)', marginBottom: 2 }}>New Total</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-ink)' }}>{fmt(summary.newTotal)}</div>
          </div>
          <div style={{ borderTop: '1px solid var(--color-silver)', paddingTop: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--color-slate)', marginBottom: 2 }}>Net Change</div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 16, fontWeight: 700,
              color: summary.netChange > 0 ? 'var(--color-error)' : summary.netChange < 0 ? 'var(--color-success)' : 'var(--color-slate)',
            }}>
              {summary.netChange > 0 ? <TrendingUp size={16} /> : summary.netChange < 0 ? <TrendingDown size={16} /> : null}
              {summary.netChange > 0 ? '+' : ''}{fmt(summary.netChange)}
            </div>
            <div style={{
              fontSize: 12, fontWeight: 600, marginTop: 2,
              color: Math.abs(summary.pctChange) > 10 ? 'var(--color-error)' : 'var(--color-slate)',
            }}>
              {summary.pctChange > 0 ? '+' : ''}{summary.pctChange.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
