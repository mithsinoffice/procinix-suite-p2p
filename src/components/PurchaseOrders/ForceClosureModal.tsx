import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { mysqlApiRequest } from '../../lib/mysql/client';

interface ClosurePreview {
  poNumber: string;
  totalValue: number;
  receivedValue: number;
  pendingValue: number;
  budgetToRelease: number;
  accrualImpact: number;
  lineItems: Array<{
    id: string;
    itemName: string;
    orderedQty: number;
    receivedQty: number;
    pendingQty: number;
    status: string;
  }>;
}

interface ForceClosureModalProps {
  poId: string;
  poNumber?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CLOSURE_REASONS = [
  'No longer required',
  'Vendor non-performance',
  'Budget revision',
  'Project cancelled',
  'Other',
] as const;

export function ForceClosureModal({ poId, poNumber, onClose, onSuccess }: ForceClosureModalProps) {
  const [preview, setPreview] = useState<ClosurePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [notifyVendor, setNotifyVendor] = useState(true);
  const [accrualReversal, setAccrualReversal] = useState(false);

  useEffect(() => {
    mysqlApiRequest<ClosurePreview>(`/api/purchase-orders/${poId}/closure-preview`)
      .then(setPreview)
      .catch(() => setError('Failed to load PO details'))
      .finally(() => setLoading(false));
  }, [poId]);

  const handleSubmit = async () => {
    if (!reason) {
      setError('Please select a reason');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await mysqlApiRequest(`/purchase-orders/${poId}/force-close`, {
        method: 'POST',
        body: JSON.stringify({ reason, remarks, notifyVendor, accrualReversal }),
      });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to close PO');
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v);

  const statusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'received':
        return 'var(--color-success)';
      case 'partial':
        return 'var(--color-warning)';
      case 'pending':
        return 'var(--color-error)';
      default:
        return 'var(--color-slate)';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--background)',
          borderRadius: 12,
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-silver)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--color-ink)' }}>
            Force Close PO
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-slate)',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Warning Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              backgroundColor: 'var(--color-error-light)',
              borderRadius: 12,
              marginBottom: 20,
            }}
          >
            <AlertTriangle size={20} style={{ color: 'var(--color-error)', flexShrink: 0 }} />
            <span style={{ color: 'var(--color-error-dark)', fontSize: 14, fontWeight: 500 }}>
              This action cannot be undone. The PO will be permanently closed.
            </span>
          </div>

          {loading && (
            <p style={{ textAlign: 'center', color: 'var(--color-slate)', padding: 40 }}>
              Loading PO details...
            </p>
          )}

          {error && !loading && (
            <p style={{ color: 'var(--color-error)', fontSize: 14, marginBottom: 16 }}>{error}</p>
          )}

          {preview && (
            <>
              {/* PO Summary Card */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 12,
                  padding: 16,
                  background: 'var(--color-cloud)',
                  borderRadius: 12,
                  marginBottom: 20,
                  border: '1px solid var(--color-silver)',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-slate)', marginBottom: 4 }}>
                    PO Number
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>
                    {preview.poNumber || poNumber}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-slate)', marginBottom: 4 }}>
                    Total Value
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>
                    {fmt(preview.totalValue)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-slate)', marginBottom: 4 }}>
                    Received
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-success)' }}>
                    {fmt(preview.receivedValue)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-slate)', marginBottom: 4 }}>
                    Pending
                  </div>
                  <div
                    style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-warning-dark)' }}
                  >
                    {fmt(preview.pendingValue)}
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div style={{ marginBottom: 20, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-silver)' }}>
                      {['Item', 'Ordered', 'Received', 'Pending', 'Status'].map((h) => (
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
                    {preview.lineItems.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--color-silver)' }}>
                        <td style={{ padding: '8px 12px', color: 'var(--color-ink)' }}>
                          {item.itemName}
                        </td>
                        <td style={{ padding: '8px 12px' }}>{item.orderedQty}</td>
                        <td style={{ padding: '8px 12px' }}>{item.receivedQty}</td>
                        <td style={{ padding: '8px 12px' }}>{item.pendingQty}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 10px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#fff',
                              backgroundColor: statusColor(item.status),
                            }}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Closure Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--color-ink)',
                      marginBottom: 6,
                    }}
                  >
                    Reason <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: 14,
                      border: '1px solid var(--color-silver)',
                      background: 'var(--color-cloud)',
                      color: 'var(--color-ink)',
                    }}
                  >
                    <option value="">Select reason...</option>
                    {CLOSURE_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--color-ink)',
                      marginBottom: 6,
                    }}
                  >
                    Remarks
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={3}
                    placeholder="Additional remarks..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: 14,
                      border: '1px solid var(--color-silver)',
                      background: 'var(--color-cloud)',
                      color: 'var(--color-ink)',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 24 }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      fontSize: 14,
                      color: 'var(--color-ink)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={notifyVendor}
                      onChange={(e) => setNotifyVendor(e.target.checked)}
                    />
                    Notify Vendor
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      fontSize: 14,
                      color: 'var(--color-ink)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={accrualReversal}
                      onChange={(e) => setAccrualReversal(e.target.checked)}
                    />
                    Accrual Reversal Required
                  </label>
                </div>
              </div>

              {/* Impact Preview */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  padding: 16,
                  background: 'var(--color-cloud)',
                  borderRadius: 12,
                  marginBottom: 20,
                  border: '1px solid var(--color-silver)',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-slate)', marginBottom: 4 }}>
                    Budget to be Released
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-success)' }}>
                    {fmt(preview.budgetToRelease)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-slate)', marginBottom: 4 }}>
                    Accrual Impact
                  </div>
                  <div
                    style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-warning-dark)' }}
                  >
                    {fmt(preview.accrualImpact)}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
            padding: '16px 24px',
            borderTop: '1px solid var(--color-silver)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              border: '1px solid var(--color-silver)',
              background: 'transparent',
              color: 'var(--color-ink)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || loading}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              background: 'var(--color-error)',
              color: '#fff',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting || loading ? 0.6 : 1,
            }}
          >
            {submitting ? 'Closing...' : 'Force Close PO'}
          </button>
        </div>
      </div>
    </div>
  );
}
