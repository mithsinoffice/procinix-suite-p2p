import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, ChevronRight, Filter } from 'lucide-react';
import { useVendorInvitations } from '../contexts/VendorInvitationContext';
import type { VendorInvitationStatus } from '../types/vendorInvitation';
import {
  hasVendorSubmission,
  isPendingBuyerReview,
  submissionSubmittedAt,
} from '../lib/vendorSubmissionReview';
import { formatInvitationDisplayId } from '../lib/invitationDisplay';

const surface = 'var(--color-cloud)';
const border = 'var(--color-silver)';
const textMuted = 'var(--color-mercury-grey)';
const textMain = 'var(--color-ink)';
const accent = 'var(--color-teal)';

function statusStyle(st: VendorInvitationStatus): { bg: string; color: string } {
  switch (st) {
    case 'approved':
      return { bg: '#ECFDF5', color: '#047857' };
    case 'rejected':
      return { bg: '#FEF2F2', color: '#B91C1C' };
    case 'submitted_by_vendor':
    case 'pending_internal_review':
      return { bg: '#EEF2FF', color: '#4338CA' };
    case 'pending_approval':
      return { bg: '#FFFBEB', color: '#B45309' };
    case 'changes_requested':
      return { bg: '#FFF7ED', color: '#C2410C' };
    default:
      return { bg: '#F1F4F6', color: 'var(--color-mercury-grey)' };
  }
}

function Kpi({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="rounded-lg px-4 py-3 flex flex-col justify-center min-w-[120px]"
      style={{ border: `1px solid ${border}`, backgroundColor: '#fff' }}
    >
      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: textMuted }}>
        {label}
      </span>
      <span className="text-2xl font-semibold tabular-nums" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

export function VendorReview() {
  const { invitations } = useVendorInvitations();
  const [pendingOnly, setPendingOnly] = useState(true);

  const submitted = useMemo(
    () => invitations.filter((inv) => hasVendorSubmission(inv)),
    [invitations]
  );

  const kpis = useMemo(() => {
    const total = submitted.length;
    const pending = submitted.filter((inv) => isPendingBuyerReview(inv)).length;
    const approved = submitted.filter((inv) => inv.status === 'approved').length;
    const rejected = submitted.filter((inv) => inv.status === 'rejected').length;
    return { total, pending, approved, rejected };
  }, [submitted]);

  const queue = useMemo(() => {
    const rows = pendingOnly ? submitted.filter((inv) => isPendingBuyerReview(inv)) : submitted;
    return [...rows].sort(
      (a, b) => new Date(submissionSubmittedAt(b)).getTime() - new Date(submissionSubmittedAt(a)).getTime()
    );
  }, [submitted, pendingOnly]);

  return (
    <div className="p-6 md:p-8" style={{ backgroundColor: surface, minHeight: '100%' }}>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold" style={{ color: textMain }}>
          Vendor Review
        </h1>
        <p className="text-sm mt-1 max-w-3xl" style={{ color: textMuted }}>
          All onboarding forms submitted by vendors through the <strong style={{ color: textMain }}>invitation link</strong>
          . The same form collects the vendor master fields (identity, GSTIN, address, bank) used when you approve and
          create the vendor master record.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi label="Submitted" value={kpis.total} color="#2563EB" />
        <Kpi label="Pending review" value={kpis.pending} color="#CA8A04" />
        <Kpi label="Approved" value={kpis.approved} color="#047857" />
        <Kpi label="Rejected" value={kpis.rejected} color="#B91C1C" />
      </div>

      <div
        className="rounded-lg p-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        style={{ border: `1px solid ${border}`, backgroundColor: '#fff' }}
      >
        <p className="text-sm" style={{ color: textMuted }}>
          {pendingOnly
            ? 'Showing invitations that need buyer action (submitted, not final).'
            : 'Showing every invitation with a vendor submission.'}
        </p>
        <button
          type="button"
          onClick={() => setPendingOnly((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border shrink-0"
          style={{
            borderColor: border,
            color: textMain,
            backgroundColor: pendingOnly ? `${accent}14` : '#fff',
          }}
        >
          <Filter className="w-4 h-4" />
          {pendingOnly ? 'Show all submissions' : 'Pending review only'}
        </button>
      </div>

      <div
        className="rounded-lg overflow-hidden"
        style={{ border: `1px solid ${border}`, backgroundColor: '#fff' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}`, backgroundColor: surface }}>
                <th className="py-3 px-4 font-semibold uppercase text-xs tracking-wide" style={{ color: textMuted }}>
                  Invitation
                </th>
                <th className="py-3 px-4 font-semibold uppercase text-xs tracking-wide" style={{ color: textMuted }}>
                  Legal name
                </th>
                <th className="py-3 px-4 font-semibold uppercase text-xs tracking-wide" style={{ color: textMuted }}>
                  Email
                </th>
                <th className="py-3 px-4 font-semibold uppercase text-xs tracking-wide" style={{ color: textMuted }}>
                  Submitted
                </th>
                <th className="py-3 px-4 font-semibold uppercase text-xs tracking-wide" style={{ color: textMuted }}>
                  Status
                </th>
                <th className="w-12 px-2" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {queue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center" style={{ color: textMuted }}>
                    <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    {submitted.length === 0 ? (
                      <>
                        No submitted forms yet.{' '}
                        <Link to="/vendor-management/invite-vendors" style={{ color: accent }}>
                          Invite vendors
                        </Link>{' '}
                        to send a link; when they fill the onboarding form, it will appear here.
                      </>
                    ) : (
                      'No rows match this filter.'
                    )}
                  </td>
                </tr>
              ) : (
                queue.map((row) => {
                  const st = statusStyle(row.status);
                  const submittedAt = row.submission?.submittedAt ?? row.createdAt;
                  return (
                    <tr key={row.id} style={{ borderBottom: `1px solid ${border}` }}>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-medium" style={{ color: accent }}>
                          {formatInvitationDisplayId(row)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium" style={{ color: textMain }}>
                        {row.basic.legalName}
                      </td>
                      <td className="py-3 px-4" style={{ color: textMuted }}>
                        {row.basic.email}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs" style={{ color: textMuted }}>
                        {new Date(submittedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: st.bg, color: st.color }}
                        >
                          {row.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Link
                          to={`/vendor-management/review/${row.id}`}
                          className="inline-flex p-2 rounded-lg"
                          style={{ color: accent }}
                          aria-label="Open submission"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
