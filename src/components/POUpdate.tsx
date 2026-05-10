import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchPO } from '../contexts/ProcurementDataContext';
import type { PurchaseOrder as RelationalPO } from '../types/procurement';
import {
  listingHeader,
  listingTitle,
  listingSubtitle,
  metricStrip,
  metricCard,
  metricLabel,
  metricValue,
  listingPage,
  listingTable,
  listingThead,
  listingTh,
  listingTd,
  listingTdPrimary,
  badgeForStatus,
} from './ui/listingStyles';

/**
 * Purchase Order detail view.
 *
 * Replaces the original hardcoded "milestones" scaffold — fetches the real
 * PO via `/api/procurement/pos/:id` (server accepts both UUID and po_ref).
 * Shows header summary + line items. Loading + error states included.
 */
export function POUpdate() {
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();
  const [po, setPo] = useState<RelationalPO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!routeId) return;
    let alive = true;
    setLoading(true);
    setLoadError(null);
    fetchPO(routeId)
      .then((data) => {
        if (!alive) return;
        if (data) setPo(data);
        else setLoadError('PO not found');
      })
      .catch((err) => {
        if (!alive) return;
        setLoadError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [routeId]);

  const formatINR = (n: number | string | null | undefined) =>
    `₹${Number(n ?? 0).toLocaleString('en-IN')}`;

  return (
    <div style={listingPage}>
      <div style={listingHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/purchase-orders')}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-mercury-grey)',
              padding: 4,
            }}
            title="Back to Purchase Orders"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={listingTitle}>{po ? po.poRef : 'Purchase Order'}</h1>
            <p style={listingSubtitle}>
              {loading ? 'Loading…' : po ? `${po.vendorName} · ${po.status}` : loadError || ''}
            </p>
          </div>
        </div>
      </div>

      {loadError && !po && (
        <div
          style={{
            margin: '24px 20px',
            padding: '16px',
            borderRadius: 8,
            background: '#FFEBEE',
            color: '#C62828',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
          }}
        >
          <AlertCircle size={16} />
          {loadError}
        </div>
      )}

      {!po && loading && (
        <div
          style={{
            margin: '24px 20px',
            color: 'var(--color-mercury-grey)',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <RefreshCw size={14} className="animate-spin" />
          Loading purchase order…
        </div>
      )}

      {po && (
        <>
          <div style={metricStrip}>
            <div style={metricCard}>
              <div style={metricLabel}>Status</div>
              <div style={metricValue}>
                <span style={badgeForStatus(po.status)}>{po.status}</span>
              </div>
            </div>
            <div style={metricCard}>
              <div style={metricLabel}>Vendor</div>
              <div style={{ ...metricValue, fontSize: 14 }}>{po.vendorName}</div>
            </div>
            <div style={metricCard}>
              <div style={metricLabel}>Entity</div>
              <div style={{ ...metricValue, fontSize: 14 }}>{po.entityCode}</div>
            </div>
            <div style={metricCard}>
              <div style={metricLabel}>Total (incl. GST)</div>
              <div style={metricValue}>{formatINR(po.totalWithGst ?? po.totalAmount)}</div>
            </div>
            <div style={metricCard}>
              <div style={metricLabel}>Issued</div>
              <div style={{ ...metricValue, fontSize: 14 }}>
                {po.issuedAt ? po.issuedAt.split('T')[0] : '—'}
              </div>
            </div>
          </div>

          <div style={{ padding: '0 20px 20px' }}>
            <div style={{ marginTop: 12, background: '#FFFFFF' }}>
              <div
                style={{
                  padding: '8px 0',
                  borderBottom: '1px solid var(--color-fog)',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--color-ink)',
                }}
              >
                Line items ({po.lineItems.length})
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={listingTable}>
                  <thead style={listingThead}>
                    <tr>
                      <th style={listingTh}>#</th>
                      <th style={listingTh}>Item</th>
                      <th style={listingTh}>Description</th>
                      <th style={{ ...listingTh, textAlign: 'right' }}>Qty</th>
                      <th style={{ ...listingTh, textAlign: 'right' }}>Unit Price</th>
                      <th style={{ ...listingTh, textAlign: 'right' }}>GST %</th>
                      <th style={{ ...listingTh, textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.lineItems.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          style={{
                            padding: 24,
                            textAlign: 'center',
                            color: 'var(--color-mercury-grey)',
                            fontSize: 12,
                          }}
                        >
                          No line items.
                        </td>
                      </tr>
                    )}
                    {po.lineItems.map((li, idx) => (
                      <tr key={li.id}>
                        <td style={listingTd}>{idx + 1}</td>
                        <td style={listingTdPrimary}>{li.itemCode || '—'}</td>
                        <td style={listingTd}>{li.itemDescription || '—'}</td>
                        <td style={{ ...listingTd, textAlign: 'right' }}>
                          {Number(li.quantity ?? 0)} {li.unit || ''}
                        </td>
                        <td style={{ ...listingTd, textAlign: 'right' }}>
                          {formatINR(li.unitPrice)}
                        </td>
                        <td style={{ ...listingTd, textAlign: 'right' }}>
                          {Number(li.gstRate ?? 0)}%
                        </td>
                        <td style={{ ...listingTd, textAlign: 'right', fontWeight: 500 }}>
                          {formatINR(li.totalWithGst ?? li.lineAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
