import { useState, useMemo } from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';

interface LineItem {
  id: string;
  itemName: string;
  currentQty: number;
  receivedQty: number;
  unitPrice: number;
}

interface QuantityChange {
  lineItemId: string;
  fieldChanged: string;
  originalValue: string;
  newValue: string;
}

interface QuantityAmendmentFormProps {
  lineItems: LineItem[];
  onChange: (changes: QuantityChange[]) => void;
}

export function QuantityAmendmentForm({ lineItems, onChange }: QuantityAmendmentFormProps) {
  const [newQtys, setNewQtys] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    lineItems.forEach((item) => {
      initial[item.id] = item.currentQty;
    });
    return initial;
  });

  const handleQtyChange = (id: string, value: number) => {
    const updated = { ...newQtys, [id]: value };
    setNewQtys(updated);

    const changes: QuantityChange[] = lineItems
      .filter((item) => updated[item.id] !== item.currentQty)
      .map((item) => ({
        lineItemId: item.id,
        fieldChanged: 'quantity',
        originalValue: String(item.currentQty),
        newValue: String(updated[item.id]),
      }));
    onChange(changes);
  };

  const warnings = useMemo(() => {
    const msgs: string[] = [];
    lineItems.forEach((item) => {
      const newQty = newQtys[item.id] ?? item.currentQty;
      if (newQty < item.receivedQty && newQty > 0) {
        msgs.push(
          `${item.itemName}: New qty (${newQty}) is below received qty (${item.receivedQty})`
        );
      }
    });
    return msgs;
  }, [lineItems, newQtys]);

  const hasCancellation = lineItems.some((item) => (newQtys[item.id] ?? item.currentQty) === 0);

  const summary = useMemo(() => {
    const originalTotal = lineItems.reduce((sum, i) => sum + i.currentQty * i.unitPrice, 0);
    const newTotal = lineItems.reduce(
      (sum, i) => sum + (newQtys[i.id] ?? i.currentQty) * i.unitPrice,
      0
    );
    return { originalTotal, newTotal, netChange: newTotal - originalTotal };
  }, [lineItems, newQtys]);

  const fmt = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v);

  return (
    <div>
      {/* Cancellation Warning */}
      {hasCancellation && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            background: 'var(--color-error-light)',
            borderRadius: 12,
            marginBottom: 16,
            border: '1px solid var(--color-error)',
          }}
        >
          <XCircle size={18} style={{ color: 'var(--color-error)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--color-error-dark)', fontWeight: 500 }}>
            One or more items have quantity set to zero. These will be cancelled from the PO.
          </span>
        </div>
      )}

      {/* Below-received Warning */}
      {warnings.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '10px 14px',
            background: 'var(--color-warning-light)',
            borderRadius: 12,
            marginBottom: 16,
            border: '1px solid var(--color-warning)',
          }}
        >
          <AlertTriangle
            size={18}
            style={{ color: 'var(--color-warning-dark)', flexShrink: 0, marginTop: 2 }}
          />
          <div style={{ fontSize: 13, color: 'var(--color-warning-dark)' }}>
            {warnings.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 20 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--color-silver)' }}>
            {['Item', 'Current Qty', 'Received Qty', 'New Qty', 'Change'].map((h) => (
              <th
                key={h}
                style={{
                  padding: '8px 12px',
                  textAlign: 'left',
                  color: 'var(--color-slate)',
                  fontWeight: 500,
                  fontSize: 12,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item) => {
            const newQty = newQtys[item.id] ?? item.currentQty;
            const change = newQty - item.currentQty;
            const belowReceived = newQty < item.receivedQty;
            const isCancelled = newQty === 0;

            return (
              <tr
                key={item.id}
                style={{
                  borderBottom: '1px solid var(--color-silver)',
                  backgroundColor: isCancelled
                    ? 'var(--color-error-light)'
                    : belowReceived
                      ? 'var(--color-warning-light)'
                      : 'transparent',
                }}
              >
                <td
                  style={{
                    padding: '8px 12px',
                    color: 'var(--color-ink)',
                    fontWeight: 500,
                    textDecoration: isCancelled ? 'line-through' : 'none',
                  }}
                >
                  {item.itemName}
                </td>
                <td style={{ padding: '8px 12px', color: 'var(--color-slate)' }}>
                  {item.currentQty}
                </td>
                <td style={{ padding: '8px 12px', color: 'var(--color-teal)' }}>
                  {item.receivedQty}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <input
                    type="number"
                    value={newQty}
                    min={0}
                    step={1}
                    onChange={(e) => handleQtyChange(item.id, parseInt(e.target.value) || 0)}
                    style={{
                      width: 100,
                      padding: '6px 10px',
                      borderRadius: 6,
                      fontSize: 13,
                      border: `1px solid ${belowReceived ? 'var(--color-warning)' : 'var(--color-silver)'}`,
                      background: 'var(--color-cloud)',
                      color: 'var(--color-ink)',
                    }}
                  />
                </td>
                <td
                  style={{
                    padding: '8px 12px',
                    fontWeight: 600,
                    color:
                      change > 0
                        ? 'var(--color-success)'
                        : change < 0
                          ? 'var(--color-error)'
                          : 'var(--color-slate)',
                  }}
                >
                  {change > 0 ? '+' : ''}
                  {change}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          padding: 16,
          background: 'var(--color-cloud)',
          borderRadius: 12,
          border: '1px solid var(--color-silver)',
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: 'var(--color-slate)', marginBottom: 4 }}>
            Original Value
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-ink)' }}>
            {fmt(summary.originalTotal)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--color-slate)', marginBottom: 4 }}>
            New Value
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-ink)' }}>
            {fmt(summary.newTotal)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--color-slate)', marginBottom: 4 }}>
            Net Change
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color:
                summary.netChange > 0
                  ? 'var(--color-error)'
                  : summary.netChange < 0
                    ? 'var(--color-success)'
                    : 'var(--color-slate)',
            }}
          >
            {summary.netChange > 0 ? '+' : ''}
            {fmt(summary.netChange)}
          </div>
        </div>
      </div>
    </div>
  );
}
