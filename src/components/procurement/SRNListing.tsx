import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText } from 'lucide-react';
import { useProcurementData } from '../../contexts/ProcurementDataContext';
import {
  listingHeader,
  listingTitle,
  listingSubtitle,
  listingPrimaryBtn,
  listingPage,
  listingTable,
  listingThead,
  listingTh,
  listingTd,
  listingTdPrimary,
  badgeForStatus,
  metricStrip,
  metricCard,
  metricLabel,
  metricValue,
} from '../ui/listingStyles';

/**
 * Service Receipt Note listing.
 * Reads from relational /api/procurement/srns via ProcurementDataContext.
 * Drawer-based detail (in-component) keeps URL count low — mirrors the
 * VendorAdvances pattern. "Create SRN" navigates to the form route.
 */
export function SRNListing() {
  const navigate = useNavigate();
  const { srns, pos: relationalPOs } = useProcurementData();
  const [searchTerm, setSearchTerm] = useState('');

  const rows = useMemo(
    () =>
      srns.map((s) => {
        const po = relationalPOs.find((p) => p.id === s.poId);
        const totalConsumed = (s.items || []).reduce(
          (sum, li) => sum + Number(li.amountConsumed || 0),
          0
        );
        return {
          id: s.id,
          srnRef: s.srnRef,
          poRef: po?.poRef ?? '',
          vendor: po?.vendorName ?? '',
          servicePeriodFrom: s.servicePeriodFrom ?? '',
          servicePeriodTo: s.servicePeriodTo ?? '',
          amountConsumed: totalConsumed,
          status: s.status,
        };
      }),
    [srns, relationalPOs]
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [r.srnRef, r.poRef, r.vendor].join(' ').toLowerCase().includes(q));
  }, [rows, searchTerm]);

  const stats = {
    total: rows.length,
    confirmed: rows.filter((r) => r.status === 'confirmed').length,
    draft: rows.filter((r) => r.status === 'draft').length,
    totalValue: rows.reduce((sum, r) => sum + r.amountConsumed, 0),
  };

  return (
    <div style={listingPage}>
      <div style={listingHeader}>
        <div>
          <h1 style={listingTitle}>Service Receipt Notes</h1>
          <p style={listingSubtitle}>{filtered.length} visible · consumption against service POs</p>
        </div>
        <button style={listingPrimaryBtn} onClick={() => navigate('/procurement/srn/create')}>
          <Plus size={13} />
          Create SRN
        </button>
      </div>

      <div
        style={{
          padding: '8px 20px',
          background: 'var(--color-background-secondary)',
          borderBottom: '1px solid var(--color-fog)',
          display: 'flex',
          gap: 8,
        }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={13}
            style={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-mercury-grey)',
            }}
          />
          <input
            type="text"
            placeholder="Search by SRN ref, PO ref, or vendor…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              height: 28,
              padding: '0 10px 0 26px',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--color-silver)',
              background: '#FFFFFF',
              fontSize: 12,
              color: 'var(--color-ink)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      <div style={metricStrip}>
        <div style={metricCard}>
          <div style={metricLabel}>Total SRNs</div>
          <div style={metricValue}>{stats.total}</div>
        </div>
        <div style={metricCard}>
          <div style={metricLabel}>Confirmed</div>
          <div style={{ ...metricValue, color: '#0F8A5F' }}>{stats.confirmed}</div>
        </div>
        <div style={metricCard}>
          <div style={metricLabel}>Draft</div>
          <div style={{ ...metricValue, color: 'var(--color-mercury-grey)' }}>{stats.draft}</div>
        </div>
        <div style={metricCard}>
          <div style={metricLabel}>Total Consumed</div>
          <div style={metricValue}>₹{stats.totalValue.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ background: '#FFFFFF', marginTop: 12 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={listingTable}>
              <thead style={listingThead}>
                <tr>
                  <th style={listingTh}>SRN Ref</th>
                  <th style={listingTh}>PO Ref</th>
                  <th style={listingTh}>Vendor</th>
                  <th style={listingTh}>Service Period</th>
                  <th style={{ ...listingTh, textAlign: 'right' }}>Amount Consumed</th>
                  <th style={listingTh}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: 28,
                        textAlign: 'center',
                        color: 'var(--color-mercury-grey)',
                        fontSize: 12,
                      }}
                    >
                      <FileText size={20} style={{ marginBottom: 6 }} />
                      <div>No service receipt notes yet</div>
                    </td>
                  </tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td style={listingTdPrimary}>{r.srnRef}</td>
                    <td style={listingTd}>{r.poRef}</td>
                    <td style={listingTd}>{r.vendor}</td>
                    <td style={{ ...listingTd, color: 'var(--color-mercury-grey)' }}>
                      {r.servicePeriodFrom && r.servicePeriodTo
                        ? `${r.servicePeriodFrom} → ${r.servicePeriodTo}`
                        : '—'}
                    </td>
                    <td style={{ ...listingTd, textAlign: 'right', fontWeight: 500 }}>
                      ₹{r.amountConsumed.toLocaleString('en-IN')}
                    </td>
                    <td style={listingTd}>
                      <span style={badgeForStatus(r.status)}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
