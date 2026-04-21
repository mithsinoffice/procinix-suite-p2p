import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Send } from 'lucide-react';
import { useVendorInvitations } from '../contexts/VendorInvitationContext';
import { InviteBasicsReadonly, VendorMasterFormReadonly } from './VendorSubmissionReadonlySections';

const surface = 'var(--color-cloud)';
const border = 'var(--color-silver)';
const textMuted = 'var(--color-mercury-grey)';
const textMain = 'var(--color-ink)';
const accent = 'var(--color-teal)';

export function VendorInvitationReviewDetail() {
  const { invitationId } = useParams<{ invitationId: string }>();
  const navigate = useNavigate();
  const {
    getById,
    approveAndCreateVendorMaster,
    requestChanges,
    rejectInvitation,
    submitForInternalApproval,
  } = useVendorInvitations();

  const inv = invitationId ? getById(invitationId) : undefined;
  const [changeMsg, setChangeMsg] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!inv) {
    return (
      <div className="w-full min-w-0 p-8" style={{ backgroundColor: surface }}>
        <p style={{ color: textMuted }}>Invitation not found.</p>
        <Link to="/vendor-management/review" className="text-sm mt-2 inline-block" style={{ color: accent }}>
          Back to vendor review
        </Link>
      </div>
    );
  }

  const s = inv.submission;

  const handleApprove = () => {
    setBusy(true);
    setMsg(null);
    const r = approveAndCreateVendorMaster(inv.id);
    setBusy(false);
    if (r.ok) {
      setMsg(`Vendor master created with code ${r.code}.`);
      setTimeout(() => navigate('/vendor-management/master'), 1500);
    } else {
      setMsg('error' in r ? r.error : 'Unable to create vendor master.');
    }
  };

  const handleRequestChanges = () => {
    if (!changeMsg.trim()) {
      setMsg('Enter a message for the vendor.');
      return;
    }
    requestChanges(inv.id, changeMsg.trim());
    navigate('/vendor-management/review');
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      setMsg('Enter a rejection reason.');
      return;
    }
    rejectInvitation(inv.id, rejectReason.trim());
    navigate('/vendor-management/review');
  };

  const handleSendApproval = () => {
    submitForInternalApproval(inv.id);
    setMsg('Moved to internal approval queue.');
  };

  const canAct =
    inv.status === 'submitted_by_vendor' ||
    inv.status === 'pending_internal_review' ||
    inv.status === 'pending_approval';

  return (
    <div className="w-full min-w-0 p-6 md:p-8" style={{ backgroundColor: surface, minHeight: '100%' }}>
      <Link
        to="/vendor-management/review"
        className="inline-flex items-center gap-2 text-sm mb-6"
        style={{ color: accent }}
      >
        <ArrowLeft className="w-4 h-4" />
        Vendor review
      </Link>

      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: textMain }}>
            Review vendor onboarding
          </h1>
          <p className="text-sm mt-1 max-w-3xl" style={{ color: textMuted }}>
            Submission from the <strong style={{ color: textMain }}>invitation link</strong> using the same onboarding
            form as Vendor Master (trade name, GSTIN, address, bank). Status:{' '}
            <strong style={{ color: textMain }}>{inv.status.replace(/_/g, ' ')}</strong> · {inv.basic.legalName}
          </p>
        </div>

        <div className={`grid gap-6 ${s ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
          <InviteBasicsReadonly basic={inv.basic} />

          {s && (
            <section className="rounded-xl p-6" style={{ border: `1px solid ${border}`, backgroundColor: '#fff' }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: textMain }}>
                KYC validation summary
              </h2>
              <ul className="text-sm space-y-2">
                <li style={{ color: s.panValidated ? '#047857' : '#B91C1C' }}>
                  PAN (invite): {s.panValidated ? 'Format OK' : 'Flagged'}
                </li>
                <li style={{ color: s.gstinValidated ? '#047857' : '#B91C1C' }}>
                  GSTIN: {s.gstinValidated ? 'Format OK' : 'Flagged'}
                </li>
                <li style={{ color: s.bankValidated ? '#047857' : '#B91C1C' }}>
                  IFSC: {s.bankValidated ? 'Format OK' : 'Flagged'}
                </li>
                <li style={{ color: textMuted }}>Documents uploaded: {s.documents.length}</li>
              </ul>
            </section>
          )}
        </div>

        {s && <VendorMasterFormReadonly s={s} />}

        {!s && inv.status !== 'invited' && inv.status !== 'vendor_in_progress' && (
          <p className="text-sm" style={{ color: textMuted }}>
            No vendor submission yet.
          </p>
        )}

        {msg && (
          <p className="text-sm" style={{ color: msg.startsWith('Vendor') ? '#047857' : '#B91C1C' }}>
            {msg}
          </p>
        )}

        {canAct && s && (
          <div className="space-y-6 rounded-lg p-5" style={{ border: `1px solid ${border}`, backgroundColor: '#fff' }}>
            <h3 className="text-sm font-semibold" style={{ color: textMain }}>
              Actions
            </h3>
            <div className="flex flex-wrap gap-3">
              {inv.status === 'submitted_by_vendor' && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleSendApproval}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
                    style={{ backgroundColor: '#4338CA' }}
                  >
                    <Send className="w-4 h-4" />
                    Submit for internal approval
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleApprove}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
                    style={{ backgroundColor: accent }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve &amp; create vendor master
                  </button>
                </>
              )}
              {inv.status === 'pending_approval' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleApprove}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: accent }}
                >
                  <CheckCircle className="w-4 h-4" />
                  Final approve &amp; create vendor master
                </button>
              )}
            </div>

            {inv.status === 'submitted_by_vendor' && (
              <div className="space-y-2">
                <label className="text-sm" style={{ color: textMain }}>
                  Request changes (message to vendor)
                </label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: `1px solid ${border}`, color: textMain }}
                  rows={2}
                  value={changeMsg}
                  onChange={(e) => setChangeMsg(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleRequestChanges}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm border"
                  style={{ borderColor: border, color: textMain }}
                >
                  Send back for vendor correction
                </button>
              </div>
            )}

            <div className="space-y-2 pt-4" style={{ borderTop: `1px solid ${border}` }}>
              <label className="text-sm" style={{ color: textMain }}>
                Reject onboarding
              </label>
              <textarea
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: `1px solid ${border}`, color: textMain }}
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason (visible to audit trail)"
              />
              <button
                type="button"
                onClick={handleReject}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: '#B91C1C' }}
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
