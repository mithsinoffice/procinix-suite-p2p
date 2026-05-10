import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useProcurementData } from '../../contexts/ProcurementDataContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { mysqlApiRequest } from '../../lib/mysql/client';
import {
  listingHeader,
  listingTitle,
  listingSubtitle,
  listingPrimaryBtn,
  listingPage,
} from '../ui/listingStyles';

interface ServiceLine {
  poItemId: string;
  serviceDescription: string;
  poLineValue: number;
  amountConsumed: number;
}

/**
 * SRN create form. Picks a service PO (poType=service, status=issued or
 * partially_received), pre-populates line items, then POSTs to
 * /api/procurement/srns. Server enforces over-consumption guard.
 */
export function SRNForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentCompany, entities } = useMasterData();
  const { pos, refresh } = useProcurementData();

  const servicePOs = useMemo(
    () =>
      pos.filter(
        (p) => p.poType === 'service' && ['issued', 'partially_received'].includes(p.status)
      ),
    [pos]
  );

  const [poId, setPoId] = useState('');
  const [servicePeriodFrom, setServicePeriodFrom] = useState('');
  const [servicePeriodTo, setServicePeriodTo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<ServiceLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // When a PO is picked, pre-fill its service lines.
  useEffect(() => {
    if (!poId) {
      setLines([]);
      return;
    }
    const po = pos.find((p) => p.id === poId);
    if (!po) return;
    setLines(
      po.lineItems
        .filter((li) => li.itemType === 'service')
        .map((li) => ({
          poItemId: li.id,
          serviceDescription: li.itemDescription,
          poLineValue: Number(li.lineAmount || 0),
          amountConsumed: 0,
        }))
    );
  }, [poId, pos]);

  const updateLine = (idx: number, patch: Partial<ServiceLine>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!poId) {
      setSubmitError('Select a PO.');
      return;
    }
    if (lines.length === 0) {
      setSubmitError('Add at least one line item.');
      return;
    }
    const entityRecord =
      entities.find((e) => e.id === currentCompany?.id || e.name === currentCompany?.name) ??
      entities[0];

    setSubmitting(true);
    try {
      const res = await mysqlApiRequest<{ success: boolean; data: { id: string } }>(
        '/procurement/srns',
        {
          method: 'POST',
          body: JSON.stringify({
            poId,
            entityId: currentCompany?.id ?? entityRecord?.id ?? '',
            entityCode: entityRecord?.code ?? currentCompany?.code ?? '',
            receiptDate: new Date().toISOString().split('T')[0],
            servicePeriodFrom: servicePeriodFrom || null,
            servicePeriodTo: servicePeriodTo || null,
            acceptedBy: user?.name ?? null,
            remarks: remarks || null,
            items: lines.map((l) => ({
              poItemId: l.poItemId,
              serviceDescription: l.serviceDescription,
              amountConsumed: Number(l.amountConsumed) || 0,
            })),
          }),
        }
      );
      if (res?.success) {
        await refresh();
        navigate('/procurement/srn');
      } else {
        setSubmitError('Failed to create SRN.');
      }
    } catch (err) {
      const apiErr = err as { message?: string; details?: string[] };
      setSubmitError(
        apiErr?.details?.length
          ? apiErr.details.join(' · ')
          : apiErr?.message || 'Failed to create SRN.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={listingPage}>
      <div style={listingHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/procurement/srn')}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-mercury-grey)',
              padding: 4,
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={listingTitle}>Create Service Receipt Note</h1>
            <p style={listingSubtitle}>
              Record consumption against a service PO. Server enforces over-consumption guards.
            </p>
          </div>
        </div>
        <button
          style={{ ...listingPrimaryBtn, opacity: submitting ? 0.5 : 1 }}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Saving…' : 'Save SRN'}
        </button>
      </div>

      {submitError && (
        <div
          role="alert"
          style={{
            margin: '12px 20px 0',
            padding: '10px 14px',
            borderRadius: 6,
            background: '#FFEBEE',
            color: '#C62828',
            fontSize: 13,
          }}
        >
          {submitError}
        </div>
      )}

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Section title="Header">
          <Field label="Service PO" required>
            <select value={poId} onChange={(e) => setPoId(e.target.value)} style={inputStyle}>
              <option value="">— Select a service PO —</option>
              {servicePOs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.poRef} · {p.vendorName} · ₹{Number(p.totalAmount).toLocaleString('en-IN')}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Service period from">
            <input
              type="date"
              value={servicePeriodFrom}
              onChange={(e) => setServicePeriodFrom(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Service period to">
            <input
              type="date"
              value={servicePeriodTo}
              onChange={(e) => setServicePeriodTo(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Remarks">
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>
        </Section>

        <Section title="Line items">
          {lines.length === 0 ? (
            <div style={{ color: 'var(--color-mercury-grey)', fontSize: 13 }}>
              Pick a PO above to load service lines.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--color-background-secondary)' }}>
                  <th style={th}>Service</th>
                  <th style={{ ...th, textAlign: 'right' }}>PO Line Value</th>
                  <th style={{ ...th, textAlign: 'right' }}>Amount Consumed</th>
                  <th style={{ ...th, textAlign: 'right' }}>Remaining</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={l.poItemId}>
                    <td style={td}>{l.serviceDescription}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      ₹{l.poLineValue.toLocaleString('en-IN')}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <input
                        type="number"
                        min={0}
                        max={l.poLineValue}
                        step="0.01"
                        value={l.amountConsumed}
                        onChange={(e) =>
                          updateLine(idx, { amountConsumed: Number(e.target.value) || 0 })
                        }
                        style={{ ...inputStyle, textAlign: 'right', width: 140 }}
                      />
                    </td>
                    <td style={{ ...td, textAlign: 'right', color: 'var(--color-mercury-grey)' }}>
                      ₹{(l.poLineValue - l.amountConsumed).toLocaleString('en-IN')}
                    </td>
                    <td style={td}>
                      <button
                        onClick={() => removeLine(idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#C62828',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid var(--color-fog)',
        borderRadius: 8,
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          marginBottom: 12,
          color: 'var(--color-ink)',
        }}
      >
        {title}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'block', fontSize: 11, color: 'var(--color-mercury-grey)' }}>
      <span style={{ display: 'block', marginBottom: 4 }}>
        {label} {required && <span style={{ color: '#C62828' }}>*</span>}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 28,
  padding: '0 10px',
  border: '1px solid var(--color-silver)',
  borderRadius: 'var(--border-radius-md)',
  fontSize: 12,
  color: 'var(--color-ink)',
  background: '#FFFFFF',
};

const th: React.CSSProperties = {
  padding: '6px 10px',
  textAlign: 'left',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: 0.4,
  textTransform: 'uppercase',
  color: 'var(--color-mercury-grey)',
  borderBottom: '1px solid var(--color-fog)',
};

const td: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: 12,
  color: 'var(--color-ink)',
  borderBottom: '1px solid var(--color-fog)',
  verticalAlign: 'middle',
};
