import { useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { mysqlApiRequest } from '../../lib/mysql/client';

interface ExtendPOModalProps {
  poId: string;
  currentExpiry?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const EXTEND_REASONS = ['Delivery delay', 'Vendor request', 'Project extension', 'Other'] as const;

export function ExtendPOModal({ poId, currentExpiry, onClose, onSuccess }: ExtendPOModalProps) {
  const [newExpiry, setNewExpiry] = useState('');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currentDate = currentExpiry
    ? new Date(currentExpiry).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Not set';

  const minDate = currentExpiry
    ? new Date(new Date(currentExpiry).getTime() + 86400000).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const handleSubmit = async () => {
    if (!newExpiry) {
      setError('Please select a new expiry date');
      return;
    }
    if (!reason) {
      setError('Please select a reason');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await mysqlApiRequest(`/purchase-orders/${poId}/extend`, {
        method: 'POST',
        body: JSON.stringify({ newExpiry, reason, remarks }),
      });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to extend PO');
    } finally {
      setSubmitting(false);
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
          maxWidth: 480,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={20} style={{ color: 'var(--color-teal)' }} />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--color-ink)' }}>
              Extend PO Validity
            </h2>
          </div>
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

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <p style={{ color: 'var(--color-error)', fontSize: 14, margin: 0 }}>{error}</p>}

          {/* Current Expiry */}
          <div
            style={{
              padding: '12px 16px',
              background: 'var(--color-cloud)',
              borderRadius: 12,
              border: '1px solid var(--color-silver)',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--color-slate)', marginBottom: 4 }}>
              Current Expiry
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-ink)' }}>
              {currentDate}
            </div>
          </div>

          {/* New Expiry */}
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
              New Expiry Date <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <input
              type="date"
              value={newExpiry}
              min={minDate}
              onChange={(e) => setNewExpiry(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 14,
                border: '1px solid var(--color-silver)',
                background: 'var(--color-cloud)',
                color: 'var(--color-ink)',
              }}
            />
          </div>

          {/* Reason */}
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
              {EXTEND_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Remarks */}
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
            disabled={submitting}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              background: 'var(--color-teal)',
              color: '#fff',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Extending...' : 'Extend Validity'}
          </button>
        </div>
      </div>
    </div>
  );
}
