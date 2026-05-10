import { useEffect, useState } from 'react';
import { X, Clock, FileText, ShoppingCart, Package, Wrench } from 'lucide-react';
import { fetchAuditTrail } from '../../contexts/ProcurementDataContext';
import type { ProcurementAuditEntry } from '../../types/procurement';

type DocType = 'PR' | 'PO' | 'GRN' | 'SRN';

interface AuditTrailDrawerProps {
  open: boolean;
  onClose: () => void;
  docType: DocType;
  docId: string;
  docRef?: string;
}

const DOC_TYPE_PATH: Record<DocType, 'prs' | 'pos' | 'grns' | 'srns'> = {
  PR: 'prs',
  PO: 'pos',
  GRN: 'grns',
  SRN: 'srns',
};

const DOC_TYPE_BADGE: Record<DocType, { bg: string; color: string; icon: typeof FileText }> = {
  PR: { bg: '#EEF7FF', color: '#2563EB', icon: FileText },
  PO: { bg: '#E8FFF2', color: '#0F9D69', icon: ShoppingCart },
  GRN: { bg: '#FFF7E8', color: '#B45309', icon: Package },
  SRN: { bg: '#F3E8FF', color: '#7C3AED', icon: Wrench },
};

const ACTION_TONE: Record<string, { bg: string; color: string }> = {
  created: { bg: '#EFF6FF', color: '#1D4ED8' },
  updated: { bg: '#FFF7E8', color: '#B45309' },
  submitted: { bg: '#F3E8FF', color: '#7C3AED' },
  approved: { bg: '#E8FFF2', color: '#0F9D69' },
  rejected: { bg: '#FEF2F2', color: '#B91C1C' },
  cancelled: { bg: '#F3F4F6', color: '#6B7280' },
  issued: { bg: '#EEF7FF', color: '#2563EB' },
  closed: { bg: '#F3F4F6', color: '#6B7280' },
  confirmed: { bg: '#E8FFF2', color: '#0F9D69' },
};

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function AuditTrailDrawer({ open, onClose, docType, docId, docRef }: AuditTrailDrawerProps) {
  const [entries, setEntries] = useState<ProcurementAuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !docId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchAuditTrail(DOC_TYPE_PATH[docType], docId);
        if (!cancelled) {
          setEntries(rows);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load audit trail');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, docId, docType]);

  if (!open) return null;

  const badge = DOC_TYPE_BADGE[docType];
  const Icon = badge.icon;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.35)',
          zIndex: 1000,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 480,
          maxWidth: '95vw',
          background: '#FFFFFF',
          zIndex: 1001,
          boxShadow: '-12px 0 40px rgba(15, 23, 42, 0.18)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-start justify-between"
          style={{ borderBottom: '1px solid var(--color-silver)' }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: badge.bg, color: badge.color }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{ background: badge.bg, color: badge.color, fontWeight: 700 }}
                >
                  {docType}
                </span>
                <span style={{ color: 'var(--color-mercury-grey)', fontSize: 12 }}>
                  Audit Trail
                </span>
              </div>
              <h3
                className="text-base"
                style={{ color: 'var(--color-ink)', fontWeight: 600, margin: 0 }}
              >
                {docRef || docId}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close audit trail"
            className="p-1.5 rounded hover:bg-gray-100"
          >
            <X className="w-5 h-5" style={{ color: 'var(--color-mercury-grey)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--color-cloud)',
                    borderRadius: 12,
                    height: 72,
                    animation: 'pulse 2s ease-in-out infinite',
                  }}
                />
              ))}
            </div>
          )}

          {!loading && error && (
            <div
              className="px-4 py-3 rounded-lg text-sm"
              style={{
                background: 'var(--color-error-light)',
                color: 'var(--color-error-dark)',
              }}
            >
              {error}
            </div>
          )}

          {!loading && !error && entries.length === 0 && (
            <div className="text-center py-12">
              <Clock
                className="w-12 h-12 mx-auto mb-3"
                style={{ color: 'var(--color-mercury-grey)' }}
              />
              <p className="text-sm" style={{ color: 'var(--color-ink)', margin: 0 }}>
                No audit entries yet
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
                State changes will appear here once the document is updated.
              </p>
            </div>
          )}

          {!loading && !error && entries.length > 0 && (
            <div className="space-y-3">
              {entries.map((e) => {
                const tone = ACTION_TONE[e.action] || ACTION_TONE.updated;
                return (
                  <div
                    key={e.id}
                    className="px-4 py-3 rounded-xl"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid var(--color-fog)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs uppercase"
                        style={{ background: tone.bg, color: tone.color, fontWeight: 700 }}
                      >
                        {e.action.replace(/_/g, ' ')}
                      </span>
                      <span style={{ color: 'var(--color-mercury-grey)', fontSize: 12 }}>
                        {formatTimestamp(e.changedAt)}
                      </span>
                    </div>
                    <p
                      className="text-sm mb-1"
                      style={{ color: 'var(--color-ink)', margin: 0, fontWeight: 600 }}
                    >
                      {e.changedByName || e.changedBy || 'System'}
                    </p>
                    {e.fieldName && (
                      <p
                        className="text-sm"
                        style={{ color: 'var(--color-mercury-grey)', margin: 0 }}
                      >
                        Changed {e.fieldName}: <strong>{e.oldValue || '—'}</strong> →{' '}
                        <strong>{e.newValue || '—'}</strong>
                      </p>
                    )}
                    {e.remarks && (
                      <p
                        className="text-sm mt-1"
                        style={{ color: 'var(--color-mercury-grey)', margin: 0 }}
                      >
                        {e.remarks}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
