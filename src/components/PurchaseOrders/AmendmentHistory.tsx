import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, FileText, ArrowRight } from 'lucide-react';
import { mysqlApiRequest } from '../../lib/mysql/client';

interface AmendmentChange {
  field: string;
  originalValue: string;
  newValue: string;
}

interface Amendment {
  id: string;
  amendmentNumber: number;
  type: 'price' | 'quantity' | 'delivery' | 'full';
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  submittedBy: string;
  submittedDate: string;
  approverName?: string;
  approverDate?: string;
  changes: AmendmentChange[];
  valueImpact: number;
}

interface AmendmentHistoryProps {
  poId: string;
}

const TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  price: { bg: 'var(--color-teal-tint)', fg: 'var(--color-teal-dark)' },
  quantity: { bg: 'var(--color-warning-light)', fg: 'var(--color-warning-dark)' },
  delivery: { bg: 'var(--color-success-light)', fg: 'var(--color-success-dark)' },
  full: { bg: 'var(--color-cloud)', fg: 'var(--color-ink)' },
};

const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  draft: { bg: 'var(--color-cloud)', fg: 'var(--color-slate)' },
  pending: { bg: 'var(--color-warning-light)', fg: 'var(--color-warning-dark)' },
  approved: { bg: 'var(--color-success-light)', fg: 'var(--color-success-dark)' },
  rejected: { bg: 'var(--color-error-light)', fg: 'var(--color-error-dark)' },
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  draft: <FileText size={14} />,
  pending: <Clock size={14} />,
  approved: <CheckCircle size={14} />,
  rejected: <XCircle size={14} />,
};

export function AmendmentHistory({ poId }: AmendmentHistoryProps) {
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mysqlApiRequest<Amendment[]>(`/api/purchase-orders/${poId}/amendments`)
      .then(setAmendments)
      .catch(() => {/* fail silently */})
      .finally(() => setLoading(false));
  }, [poId]);

  const fmt = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-slate)' }}>
        Loading amendment history...
      </div>
    );
  }

  if (amendments.length === 0) {
    return (
      <div style={{
        padding: 40, textAlign: 'center', color: 'var(--color-slate)',
        background: 'var(--color-cloud)', borderRadius: 12, border: '1px solid var(--color-silver)',
      }}>
        No amendments recorded for this PO.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 28 }}>
      {/* Vertical line */}
      <div style={{
        position: 'absolute', left: 11, top: 8, bottom: 8, width: 2,
        background: 'var(--color-silver)',
      }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {amendments.map((amendment) => {
          const typeStyle = TYPE_COLORS[amendment.type] ?? TYPE_COLORS.full;
          const statusStyle = STATUS_STYLES[amendment.status] ?? STATUS_STYLES.draft;

          return (
            <div key={amendment.id} style={{ position: 'relative' }}>
              {/* Timeline dot */}
              <div style={{
                position: 'absolute', left: -22, top: 16, width: 12, height: 12,
                borderRadius: '50%', border: '2px solid var(--color-teal)',
                background: 'var(--background)',
              }} />

              {/* Card */}
              <div style={{
                padding: 16, borderRadius: 12, background: 'var(--background)',
                border: '1px solid var(--color-silver)',
              }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  {/* Amendment # badge */}
                  <span style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: 12,
                    fontSize: 11, fontWeight: 600, background: '#EDE9FE', color: '#7C3AED',
                  }}>
                    Amendment #{amendment.amendmentNumber}
                  </span>

                  {/* Type badge */}
                  <span style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: 12,
                    fontSize: 11, fontWeight: 600, background: typeStyle.bg, color: typeStyle.fg,
                    textTransform: 'capitalize',
                  }}>
                    {amendment.type}
                  </span>

                  {/* Status badge */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px',
                    borderRadius: 12, fontSize: 11, fontWeight: 600,
                    background: statusStyle.bg, color: statusStyle.fg, textTransform: 'capitalize',
                  }}>
                    {STATUS_ICONS[amendment.status]}
                    {amendment.status}
                  </span>

                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-slate)' }}>
                    {fmtDate(amendment.submittedDate)} &middot; {amendment.submittedBy}
                  </span>
                </div>

                {/* Changes */}
                {amendment.changes.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    {amendment.changes.map((change, idx) => (
                      <div key={idx} style={{
                        display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
                        padding: '4px 0', color: 'var(--color-ink)',
                      }}>
                        <span style={{ color: 'var(--color-slate)', fontWeight: 500, minWidth: 80 }}>
                          {change.field}
                        </span>
                        <span style={{ color: 'var(--color-slate)', textDecoration: 'line-through' }}>
                          {change.originalValue}
                        </span>
                        <ArrowRight size={12} style={{ color: 'var(--color-slate)' }} />
                        <span style={{ fontWeight: 600 }}>{change.newValue}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer row */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingTop: 8, borderTop: '1px solid var(--color-silver)',
                }}>
                  {/* Value impact */}
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    color: amendment.valueImpact > 0 ? 'var(--color-error)' : amendment.valueImpact < 0 ? 'var(--color-success)' : 'var(--color-slate)',
                  }}>
                    Value impact: {amendment.valueImpact > 0 ? '+' : ''}{fmt(amendment.valueImpact)}
                  </span>

                  {/* Approver info */}
                  {amendment.approverName && (
                    <span style={{ fontSize: 12, color: 'var(--color-slate)' }}>
                      {amendment.status === 'approved' ? 'Approved' : 'Rejected'} by {amendment.approverName}
                      {amendment.approverDate ? ` on ${fmtDate(amendment.approverDate)}` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
