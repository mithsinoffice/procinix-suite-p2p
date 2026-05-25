import { useState } from "react";
import {
  FileCheck, Clock, AlertTriangle, CheckCircle2, XCircle, ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { KPICard } from "../components/design-system/KPICard";
import { StatusBadge } from "../components/design-system/StatusBadge";
import { Button } from "../components/ui/button";
import {
  useValidationQueue,
  useApproveDocument,
  useRejectDocument,
  useVerifyBankAccount,
} from "../../../../../hooks/vendor-portal/useValidation";

// Validation Dashboard (Sprint 6) — buyer-side compliance review queue.
// Three parallel queues (documents, bank accounts, compliance records)
// stacked on one page so reviewers don't have to navigate between them.
// All scoped to the calling tenant; mutations invalidate the queue so
// approved/rejected items disappear from the list immediately.
export function ValidationDashboardPage() {
  const queue       = useValidationQueue();
  const approveDoc  = useApproveDocument();
  const rejectDoc   = useRejectDocument();
  const verifyBank  = useVerifyBankAccount();

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  if (queue.isLoading) {
    return <div className="p-8 text-sm text-[#64748B]">Loading validation queue…</div>;
  }
  if (queue.error || !queue.data) {
    return <div className="p-8 text-sm text-red-600">Failed to load queue.</div>;
  }

  const { pendingDocuments, pendingBankVerifications, pendingComplianceRecords, summary } = queue.data;

  async function onApproveDoc(id: string) {
    try {
      await approveDoc.mutateAsync(id);
      toast.success('Document approved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval failed');
    }
  }

  async function onRejectDoc(id: string) {
    if (!rejectReason.trim()) {
      toast.error('Reason is required to reject a document');
      return;
    }
    try {
      await rejectDoc.mutateAsync({ id, reason: rejectReason });
      toast.success('Document rejected');
      setRejectingId(null);
      setRejectReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rejection failed');
    }
  }

  async function onVerifyBank(id: string) {
    try {
      await verifyBank.mutateAsync(id);
      toast.success('Bank account verified');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Verification failed');
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F9FC]">
      <div className="bg-white border-b border-[#E6EEF2] px-8 py-6">
        <h1 className="text-2xl font-semibold text-[#0A0F14]">Validation Dashboard</h1>
        <p className="text-sm text-[#64748B] mt-1">Review compliance documents, verify banking, and clear sanctions findings.</p>
      </div>

      {/* KPI strip */}
      <div className="px-8 pt-6">
        <div className="grid grid-cols-4 gap-4">
          <KPICard title="Pending documents"      value={summary.byType.documents}         icon={<FileCheck className="w-5 h-5" />} />
          <KPICard title="Bank accounts to verify" value={summary.byType.bankAccounts}      icon={<Clock className="w-5 h-5" />} />
          <KPICard title="Compliance records"     value={summary.byType.complianceRecords} icon={<AlertTriangle className="w-5 h-5" />} />
          <KPICard title="Total in queue"         value={summary.total}                    icon={<ShieldAlert className="w-5 h-5" />} />
        </div>
      </div>

      {/* Documents queue */}
      <Section title="Documents pending review" count={pendingDocuments.length} icon={<FileCheck className="w-4 h-4" />}>
        <table className="w-full text-sm">
          <thead className="bg-[#F6F9FC] border-b border-[#E6EEF2]">
            <tr>
              {['Vendor', 'Document', 'Country', 'Uploaded', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left py-3 px-6 text-xs font-semibold text-[#64748B] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6EEF2]">
            {pendingDocuments.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-[#64748B] text-sm">No documents pending review</td></tr>
            ) : pendingDocuments.map(d => (
              <tr key={d.id} className="hover:bg-[#F6F9FC]">
                <td className="py-3 px-6 text-sm">{d.vendor.legalName}</td>
                <td className="py-3 px-6 text-sm font-mono text-xs">{d.documentType} <span className="text-[#94A3B8]">· {d.fileName}</span></td>
                <td className="py-3 px-6 text-xs text-[#64748B]">{d.vendor.countryCode}</td>
                <td className="py-3 px-6 text-xs text-[#64748B]">{d.uploadedAt.slice(0,10)}</td>
                <td className="py-3 px-6"><StatusBadge status="warning" label="Pending" size="sm" /></td>
                <td className="py-3 px-6 text-right">
                  {rejectingId === d.id ? (
                    <div className="flex items-center gap-2 justify-end">
                      <input
                        autoFocus
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason"
                        className="border border-[#E6EEF2] rounded px-2 py-1 text-xs w-32"
                      />
                      <Button variant="outline" size="sm" onClick={() => onRejectDoc(d.id)} disabled={rejectDoc.isPending}>Confirm</Button>
                      <Button variant="ghost" size="sm" onClick={() => { setRejectingId(null); setRejectReason(''); }}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => onApproveDoc(d.id)} disabled={approveDoc.isPending}>
                        <CheckCircle2 className="w-4 h-4 mr-1 text-green-600" /> Approve
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setRejectingId(d.id)}>
                        <XCircle className="w-4 h-4 mr-1 text-red-600" /> Reject
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Bank verifications */}
      <Section title="Bank accounts pending verification" count={pendingBankVerifications.length} icon={<Clock className="w-4 h-4" />}>
        <table className="w-full text-sm">
          <thead className="bg-[#F6F9FC] border-b border-[#E6EEF2]">
            <tr>
              {['Vendor', 'Account', 'Bank', 'Country', 'Actions'].map(h => (
                <th key={h} className="text-left py-3 px-6 text-xs font-semibold text-[#64748B] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6EEF2]">
            {pendingBankVerifications.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-[#64748B] text-sm">No bank accounts pending verification</td></tr>
            ) : pendingBankVerifications.map(b => (
              <tr key={b.id} className="hover:bg-[#F6F9FC]">
                <td className="py-3 px-6 text-sm">{b.vendor.legalName}</td>
                <td className="py-3 px-6 text-xs font-mono">{b.accountName} <span className="text-[#94A3B8]">·{b.accountNumber.slice(-4)}</span></td>
                <td className="py-3 px-6 text-sm">{b.bankName}</td>
                <td className="py-3 px-6 text-xs text-[#64748B]">{b.vendor.countryCode}</td>
                <td className="py-3 px-6 text-right">
                  <Button variant="ghost" size="sm" onClick={() => onVerifyBank(b.id)} disabled={verifyBank.isPending}>
                    <CheckCircle2 className="w-4 h-4 mr-1 text-green-600" /> Verify
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Compliance records (read-only — verification flow lives in compliance-records routes) */}
      <Section title="Compliance records awaiting verification" count={pendingComplianceRecords.length} icon={<AlertTriangle className="w-4 h-4" />}>
        <table className="w-full text-sm">
          <thead className="bg-[#F6F9FC] border-b border-[#E6EEF2]">
            <tr>
              {['Vendor', 'Document Type', 'Number', 'Country'].map(h => (
                <th key={h} className="text-left py-3 px-6 text-xs font-semibold text-[#64748B] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6EEF2]">
            {pendingComplianceRecords.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-[#64748B] text-sm">No compliance records pending</td></tr>
            ) : pendingComplianceRecords.map(c => (
              <tr key={c.id} className="hover:bg-[#F6F9FC]">
                <td className="py-3 px-6 text-sm">{c.vendor.legalName}</td>
                <td className="py-3 px-6 text-xs font-mono">{c.documentType}</td>
                <td className="py-3 px-6 text-xs">{c.documentNumber ?? '—'}</td>
                <td className="py-3 px-6 text-xs text-[#64748B]">{c.vendor.countryCode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

function Section({ title, count, icon, children }: { title: string; count: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="px-8 py-6">
      <div className="bg-white border border-[#E6EEF2] rounded-lg overflow-hidden">
        <div className="bg-[#F6F9FC] px-6 py-3 border-b border-[#E6EEF2] flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-semibold text-[#0A0F14]">{title}</h2>
          <span className="ml-auto text-xs text-[#64748B]">{count} pending</span>
        </div>
        {children}
      </div>
    </div>
  );
}
