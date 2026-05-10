import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Download,
  FileCheck2,
  FileUp,
  Landmark,
  Plug,
  Plus,
  RefreshCw,
  Send,
  Upload,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { mysqlApiRequest, mysqlApiBaseUrl } from '../../lib/mysql/client';
import { formatINR, formatINRCompact } from '../../lib/formatCurrency';
import type {
  BankAccount,
  BankName,
  BatchDetailResponse,
  BatchStatus,
  IntegrationMode,
  PaymentBatch,
  PaymentMode,
  PayoutFormat,
  AccountType,
} from '../../types/payments';

// ============================================================================
// Helpers
// ============================================================================

const APPROVER_ROLES = new Set(['payment_approver', 'cfo', 'admin']);
function normaliseRole(role: string | null | undefined) {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

const BANK_BADGE: Record<BankName, { bg: string; text: string }> = {
  HDFC: { bg: 'bg-teal/10 text-teal', text: 'HDFC' },
  ICICI: { bg: 'bg-orange-100 text-orange-700', text: 'ICICI' },
  SBI: { bg: 'bg-blue-100 text-blue-700', text: 'SBI' },
  AXIS: { bg: 'bg-purple-100 text-purple-700', text: 'AXIS' },
  KOTAK: { bg: 'bg-red-100 text-red-700', text: 'KOTAK' },
  OTHER: { bg: 'bg-slate-100 text-slate-700', text: 'OTHER' },
};

const STATUS_PILL: Record<BatchStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending_approval: 'bg-amber-50 text-amber-700',
  approved: 'bg-blue-50 text-blue-700',
  file_generated: 'bg-cyan-50 text-cyan-700',
  uploaded: 'bg-purple-50 text-purple-700',
  processing: 'bg-orange-50 text-orange-700',
  executed: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-600',
  cancelled: 'bg-slate-100 text-slate-500',
};

function maskAccount(no: string): string {
  if (!no) return '****';
  return `****${no.slice(-4)}`;
}

function defaultPayoutFormatFor(bank: BankName): PayoutFormat {
  if (bank === 'HDFC') return 'HDFC_BULK';
  if (bank === 'ICICI') return 'ICICI_BULK';
  return 'GENERIC_CSV';
}

// ============================================================================
// Account modal
// ============================================================================

interface AccountFormState {
  accountName: string;
  bankName: BankName;
  accountNumber: string;
  ifscCode: string;
  accountType: AccountType;
  integrationMode: IntegrationMode;
  payoutFormat: PayoutFormat;
  isDefault: boolean;
}

function emptyAccountForm(): AccountFormState {
  return {
    accountName: '',
    bankName: 'HDFC',
    accountNumber: '',
    ifscCode: '',
    accountType: 'current',
    integrationMode: 'manual',
    payoutFormat: 'HDFC_BULK',
    isDefault: false,
  };
}

function AccountModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: BankAccount;
  onClose: () => void;
  onSave: (form: AccountFormState, id?: string) => Promise<void>;
}) {
  const [form, setForm] = useState<AccountFormState>(() =>
    initial
      ? {
          accountName: initial.accountName,
          bankName: initial.bankName,
          accountNumber: initial.accountNumber,
          ifscCode: initial.ifscCode,
          accountType: initial.accountType,
          integrationMode: initial.integrationMode,
          payoutFormat: initial.payoutFormat,
          isDefault: initial.isDefault,
        }
      : emptyAccountForm()
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(initial);

  const update = <K extends keyof AccountFormState>(k: K, v: AccountFormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    setError(null);
    if (!form.accountName || !form.accountNumber || !form.ifscCode) {
      setError('Account name, number and IFSC are required');
      return;
    }
    setBusy(true);
    try {
      await onSave(form, initial?.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} aria-hidden />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-[520px] max-w-[92vw]">
        <div className="px-6 py-4 border-b-2 border-silver flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">
            {isEdit ? 'Edit bank account' : 'Add bank account'}
          </h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-cloud rounded-lg">
            <X className="w-5 h-5 text-mercury-grey" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3 text-sm">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-xs">
              {error}
            </div>
          )}
          <div>
            <label className="block text-mercury-grey mb-1">Account name</label>
            <input
              type="text"
              value={form.accountName}
              onChange={(e) => update('accountName', e.target.value)}
              placeholder="e.g. HDFC — Vendor Payments"
              className="w-full px-3 py-2 border-2 border-silver rounded-lg text-ink"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-mercury-grey mb-1">Bank</label>
              <select
                value={form.bankName}
                onChange={(e) => {
                  const bank = e.target.value as BankName;
                  update('bankName', bank);
                  // sensible default for payout format
                  update('payoutFormat', defaultPayoutFormatFor(bank));
                }}
                className="w-full px-3 py-2 border-2 border-silver rounded-lg text-ink"
              >
                <option value="HDFC">HDFC</option>
                <option value="ICICI">ICICI</option>
                <option value="SBI">SBI</option>
                <option value="AXIS">Axis</option>
                <option value="KOTAK">Kotak</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-mercury-grey mb-1">Account type</label>
              <select
                value={form.accountType}
                onChange={(e) => update('accountType', e.target.value as AccountType)}
                className="w-full px-3 py-2 border-2 border-silver rounded-lg text-ink"
              >
                <option value="current">Current</option>
                <option value="savings">Savings</option>
                <option value="cc">CC / OD</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-mercury-grey mb-1">Account number</label>
              <input
                type="text"
                value={form.accountNumber}
                onChange={(e) => update('accountNumber', e.target.value)}
                className="w-full px-3 py-2 border-2 border-silver rounded-lg text-ink"
              />
            </div>
            <div>
              <label className="block text-mercury-grey mb-1">IFSC code</label>
              <input
                type="text"
                value={form.ifscCode}
                onChange={(e) => update('ifscCode', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border-2 border-silver rounded-lg text-ink uppercase"
              />
            </div>
          </div>
          <div className="border-t border-silver pt-3">
            <label className="block text-mercury-grey mb-2 text-xs uppercase font-semibold">
              Integration mode
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-2 p-2 border-2 border-silver rounded-lg cursor-pointer hover:bg-cloud">
                <input
                  type="radio"
                  checked={form.integrationMode === 'connected'}
                  onChange={() => update('integrationMode', 'connected')}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-ink">Connected (API)</div>
                  <div className="text-xs text-mercury-grey">
                    Live balance + auto payment initiation. API credentials are configured by your
                    system administrator.
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-2 p-2 border-2 border-silver rounded-lg cursor-pointer hover:bg-cloud">
                <input
                  type="radio"
                  checked={form.integrationMode === 'manual'}
                  onChange={() => update('integrationMode', 'manual')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-ink">Manual payout file</div>
                  <div className="text-xs text-mercury-grey">
                    Generate a bulk-upload file, upload to your bank portal, ingest UTR
                    acknowledgement back.
                  </div>
                  {form.integrationMode === 'manual' && (
                    <div className="mt-2">
                      <label className="block text-xs text-mercury-grey mb-1">Payout format</label>
                      <select
                        value={form.payoutFormat}
                        onChange={(e) => update('payoutFormat', e.target.value as PayoutFormat)}
                        className="w-full px-2 py-1 border border-silver rounded text-sm"
                      >
                        <option value="HDFC_BULK">HDFC Bulk Upload</option>
                        <option value="ICICI_BULK">ICICI CIB Bulk</option>
                        <option value="GENERIC_CSV">Generic CSV</option>
                      </select>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => update('isDefault', e.target.checked)}
            />
            Use as default bank account
          </label>
        </div>
        <div className="px-6 py-4 border-t-2 border-silver flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border-2 border-silver rounded-lg text-mercury-grey hover:bg-cloud"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="flex-1 px-4 py-2 bg-teal hover:bg-teal-dark text-white rounded-lg font-medium disabled:opacity-50"
          >
            {busy ? 'Saving…' : isEdit ? 'Update account' : 'Add account'}
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Bank account card
// ============================================================================

function BankAccountCard({
  account,
  onEdit,
  onFetchBalance,
}: {
  account: BankAccount;
  onEdit: () => void;
  onFetchBalance: () => Promise<void>;
}) {
  const [fetching, setFetching] = useState(false);
  const badge = BANK_BADGE[account.bankName];

  return (
    <div className="bg-white rounded-xl border-2 border-silver p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs ${badge.bg}`}
          >
            {badge.text}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-ink truncate">{account.accountName}</div>
            <div className="text-xs text-mercury-grey">
              {maskAccount(account.accountNumber)} · {account.ifscCode}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-teal hover:underline shrink-0"
        >
          Edit
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {account.integrationMode === 'connected' ? (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 font-medium">
            <Plug className="w-3 h-3" /> Connected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
            <FileCheck2 className="w-3 h-3" /> Manual file
          </span>
        )}
        {account.integrationMode === 'manual' && (
          <span className="text-xs px-2 py-1 rounded-full bg-cloud text-mercury-grey font-medium">
            {account.payoutFormat.replace('_', ' ')}
          </span>
        )}
        {account.isDefault && (
          <span className="text-xs px-2 py-1 rounded-full bg-teal/10 text-teal font-medium">
            Default
          </span>
        )}
      </div>
      {account.integrationMode === 'connected' && (
        <div className="border-t border-silver pt-3 mt-2 flex items-center justify-between">
          <div>
            <div className="text-xs text-mercury-grey">Live balance</div>
            <div className="text-lg font-semibold text-ink">
              {fetching
                ? 'Fetching…'
                : account.lastBalance != null
                  ? formatINR(account.lastBalance)
                  : '—'}
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              setFetching(true);
              try {
                await onFetchBalance();
              } finally {
                setFetching(false);
              }
            }}
            disabled={fetching}
            className="px-3 py-1.5 text-xs border-2 border-silver bg-white rounded-lg hover:bg-cloud"
          >
            <RefreshCw className={`inline w-3 h-3 mr-1 ${fetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Eligible invoices for a new batch
// ============================================================================

interface EligibleInvoice {
  id: string;
  ref: string;
  vendor: string;
  amount: number;
  due: string;
  isMSME: boolean;
}

function EligibleInvoicesPanel({
  invoices,
  selectedIds,
  onToggle,
  onToggleAll,
  loading,
}: {
  invoices: EligibleInvoice[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  loading: boolean;
}) {
  const allSelected = invoices.length > 0 && invoices.every((i) => selectedIds.has(i.id));
  return (
    <div className="bg-white rounded-xl border-2 border-silver overflow-hidden">
      <div className="px-4 py-3 border-b-2 border-silver flex items-center justify-between">
        <h3 className="font-semibold text-ink">Eligible invoices</h3>
        {invoices.length > 0 && (
          <label className="text-xs text-mercury-grey flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => onToggleAll(e.target.checked)}
            />
            Select all ({invoices.length})
          </label>
        )}
      </div>
      {loading ? (
        <div className="py-8 text-center text-mercury-grey text-sm">Loading…</div>
      ) : invoices.length === 0 ? (
        <div className="py-8 text-center text-mercury-grey text-sm">
          No invoices ready for payment.
        </div>
      ) : (
        <div className="max-h-[260px] overflow-y-auto">
          {invoices.map((inv) => {
            const checked = selectedIds.has(inv.id);
            return (
              <label
                key={inv.id}
                className={`grid grid-cols-[28px_1fr_140px_120px_120px] items-center gap-3 px-4 py-2 border-b border-silver text-sm cursor-pointer ${
                  inv.isMSME ? 'bg-amber-50/30' : ''
                } ${checked ? 'bg-teal/5' : 'hover:bg-cloud'}`}
              >
                <input type="checkbox" checked={checked} onChange={() => onToggle(inv.id)} />
                <div className="min-w-0">
                  <div className="text-ink truncate">{inv.vendor}</div>
                  <div className="text-xs text-mercury-grey truncate">{inv.ref}</div>
                </div>
                <div className="text-right text-ink font-medium">{formatINR(inv.amount)}</div>
                <div className="text-mercury-grey text-xs">{inv.due || '—'}</div>
                <div>
                  {inv.isMSME && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                      MSME
                    </span>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Batch detail card (Mode A and Mode B flows)
// ============================================================================

function BatchDetailCard({
  detail,
  bankAccount,
  onRefresh,
  isApprover,
}: {
  detail: BatchDetailResponse;
  bankAccount: BankAccount | undefined;
  onRefresh: () => void;
  isApprover: boolean;
}) {
  const { batch, items } = detail;
  const [busy, setBusy] = useState<string | null>(null);
  const [downloadInfo, setDownloadInfo] = useState<{ url: string; filename: string } | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    matched: number;
    unmatched: number;
    jvRef: string | null;
  } | null>(null);
  const [markedUploaded, setMarkedUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const submit = async () => {
    setBusy('submit');
    try {
      await mysqlApiRequest(`/ap/banking/batches/${batch.id}/submit`, { method: 'POST' });
      onRefresh();
    } finally {
      setBusy(null);
    }
  };
  const approve = async () => {
    setBusy('approve');
    try {
      await mysqlApiRequest(`/ap/banking/batches/${batch.id}/approve`, { method: 'POST' });
      onRefresh();
    } finally {
      setBusy(null);
    }
  };
  const reject = async () => {
    const reason = window.prompt('Reject reason (optional)') || '';
    setBusy('reject');
    try {
      await mysqlApiRequest(`/ap/banking/batches/${batch.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      onRefresh();
    } finally {
      setBusy(null);
    }
  };
  const generateFile = async () => {
    setBusy('generate');
    try {
      const res = await mysqlApiRequest<{
        success: boolean;
        data: { downloadUrl: string; filename: string };
      }>(`/ap/banking/batches/${batch.id}/generate-file`, { method: 'POST' });
      setDownloadInfo({ url: res.data.downloadUrl, filename: res.data.filename });
      onRefresh();
    } finally {
      setBusy(null);
    }
  };
  const downloadFile = () => {
    // Direct browser navigation triggers the streaming attachment download.
    const path = downloadInfo?.url || `/ap/banking/batches/${batch.id}/download-file`;
    const url = `${mysqlApiBaseUrl}${path}`;
    window.open(url, '_blank', 'noopener');
  };
  const initiate = async () => {
    setBusy('initiate');
    try {
      await mysqlApiRequest(`/ap/banking/batches/${batch.id}/initiate`, { method: 'POST' });
      onRefresh();
    } finally {
      setBusy(null);
    }
  };
  const handleUpload = async (file: File) => {
    setBusy('upload');
    try {
      const fd = new FormData();
      fd.append('utrFile', file);
      const url = `${mysqlApiBaseUrl}/ap/banking/batches/${batch.id}/upload-utr`;
      const headers: Record<string, string> = {};
      if (typeof sessionStorage !== 'undefined') {
        const tok = sessionStorage.getItem('procinix.session.token');
        if (tok) headers.Authorization = `Bearer ${tok}`;
        const u = sessionStorage.getItem('procinix.session.user');
        if (u) {
          try {
            const parsed = JSON.parse(u);
            if (parsed?.tenantId) headers['X-Tenant-Id'] = parsed.tenantId;
          } catch {
            /* ignore */
          }
        }
      }
      const res = await fetch(url, { method: 'POST', body: fd, headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Upload failed');
      setUploadResult({
        matched: json.data?.matchCount || 0,
        unmatched: json.data?.unmatchedCount || 0,
        jvRef: json.data?.jvRef || null,
      });
      onRefresh();
    } finally {
      setBusy(null);
    }
  };

  const isManual = batch.integrationMode === 'manual';
  const stepIdx =
    batch.status === 'approved'
      ? 1
      : batch.status === 'file_generated'
        ? 2
        : batch.status === 'uploaded' || markedUploaded
          ? 3
          : batch.status === 'processing'
            ? 4
            : batch.status === 'executed'
              ? 5
              : 0;

  return (
    <div className="bg-white rounded-xl border-2 border-silver">
      <div className="px-6 py-4 border-b-2 border-silver flex items-center justify-between">
        <div>
          <div className="text-xs text-mercury-grey">{batch.batchRef}</div>
          <h2 className="text-lg font-semibold text-ink">
            {bankAccount?.accountName || 'Bank account'} · {formatINR(batch.totalAmount)} ·{' '}
            {batch.itemCount} item{batch.itemCount === 1 ? '' : 's'}
          </h2>
        </div>
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${STATUS_PILL[batch.status]}`}
        >
          {batch.status.replace('_', ' ')}
        </span>
      </div>

      <div className="px-6 py-4 space-y-4">
        {batch.status === 'draft' && (
          <button
            type="button"
            onClick={submit}
            disabled={busy === 'submit'}
            className="px-4 py-2 bg-teal hover:bg-teal-dark text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Send className="inline w-4 h-4 mr-1" />
            Submit for approval
          </button>
        )}
        {batch.status === 'pending_approval' && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={approve}
              disabled={!isApprover || busy === 'approve'}
              className="px-4 py-2 bg-teal hover:bg-teal-dark text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isApprover ? 'Approver role required' : ''}
            >
              <CheckCircle className="inline w-4 h-4 mr-1" />
              Approve
            </button>
            <button
              type="button"
              onClick={reject}
              disabled={!isApprover || busy === 'reject'}
              className="px-4 py-2 border-2 border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
            {!isApprover && (
              <span className="text-xs text-mercury-grey self-center">
                Awaiting approver review
              </span>
            )}
          </div>
        )}

        {/* Mode A: Connected — single Initiate button */}
        {!isManual && batch.status === 'approved' && (
          <button
            type="button"
            onClick={initiate}
            disabled={busy === 'initiate'}
            className="px-4 py-2 bg-teal hover:bg-teal-dark text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {busy === 'initiate' ? (
              'Sending to bank…'
            ) : (
              <>
                <Send className="inline w-4 h-4 mr-1" />
                Initiate payment
              </>
            )}
          </button>
        )}

        {/* Mode B: Manual — 5-step stepper */}
        {isManual && batch.status !== 'draft' && batch.status !== 'pending_approval' && (
          <div className="border border-silver rounded-lg p-4">
            <ol className="grid grid-cols-5 gap-2 text-xs mb-4">
              {['Approved', 'Generate file', 'Upload to bank', 'Upload UTR', 'JV created'].map(
                (label, i) => {
                  const active = stepIdx >= i + 1;
                  return (
                    <li
                      key={label}
                      className={`text-center px-2 py-1 rounded ${
                        active ? 'bg-teal text-white font-semibold' : 'bg-cloud text-mercury-grey'
                      }`}
                    >
                      {i + 1}. {label}
                    </li>
                  );
                }
              )}
            </ol>

            {batch.status === 'approved' && (
              <button
                type="button"
                onClick={generateFile}
                disabled={busy === 'generate'}
                className="px-4 py-2 bg-teal hover:bg-teal-dark text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {busy === 'generate' ? 'Generating…' : 'Generate payout file'}
              </button>
            )}

            {(batch.status === 'file_generated' || downloadInfo) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
                  <div className="text-sm text-cyan-800">
                    File ready: <code className="text-xs">{downloadInfo?.filename || '—'}</code>
                  </div>
                  <button
                    type="button"
                    onClick={downloadFile}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-cyan-300 text-cyan-700 rounded-lg text-xs font-medium hover:bg-cyan-100"
                  >
                    <Download className="w-3 h-3" /> Download
                  </button>
                </div>
                <div className="text-xs text-mercury-grey">
                  Upload the downloaded file to your bank's payment portal, then mark as uploaded
                  below.
                </div>
                <button
                  type="button"
                  onClick={() => setMarkedUploaded(true)}
                  className="px-3 py-1.5 border-2 border-silver text-xs rounded-lg hover:bg-cloud"
                >
                  Mark as uploaded
                </button>
              </div>
            )}

            {(markedUploaded || batch.status === 'uploaded' || batch.status === 'processing') && (
              <div className="mt-3 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy === 'upload'}
                  className="w-full p-4 border-2 border-dashed border-silver hover:border-teal hover:bg-cloud rounded-lg text-sm text-mercury-grey hover:text-ink"
                >
                  <FileUp className="inline w-4 h-4 mr-2" />
                  {busy === 'upload'
                    ? 'Parsing UTR file…'
                    : 'Drag UTR acknowledgement file here or click to upload'}
                </button>
                {uploadResult && (
                  <div className="p-3 rounded-lg border bg-green-50 border-green-200 text-sm text-green-800">
                    {uploadResult.matched} of {uploadResult.matched + uploadResult.unmatched}{' '}
                    payments matched · UTR captured
                    {uploadResult.unmatched > 0 && (
                      <span className="text-red-600 ml-2">
                        ({uploadResult.unmatched} unmatched)
                      </span>
                    )}
                    {uploadResult.jvRef && (
                      <div className="text-xs mt-1 text-green-700/80">JV: {uploadResult.jvRef}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {batch.status === 'executed' && batch.jvRef && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            <CheckCircle className="inline w-4 h-4 mr-1" />
            Payments executed · JV ref: <code className="text-xs">{batch.jvRef}</code>
          </div>
        )}

        {batch.status === 'cancelled' && batch.rejectReason && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
            Cancelled — {batch.rejectReason}
          </div>
        )}

        {/* Line items table */}
        <div className="border border-silver rounded-lg overflow-hidden">
          <div className="grid grid-cols-[2fr_120px_80px_140px_120px] gap-2 px-4 py-2 bg-cloud border-b border-silver text-xs uppercase font-semibold text-mercury-grey">
            <span>Vendor</span>
            <span className="text-right">Amount</span>
            <span>Mode</span>
            <span>UTR</span>
            <span>Status</span>
          </div>
          {items.map((it) => (
            <div
              key={it.id}
              className="grid grid-cols-[2fr_120px_80px_140px_120px] gap-2 px-4 py-2 border-b border-silver text-sm"
            >
              <div className="min-w-0">
                <div className="text-ink truncate">{it.vendorName}</div>
                <div className="text-xs text-mercury-grey truncate">{it.clientRef}</div>
              </div>
              <div className="text-right text-ink">{formatINR(it.amount)}</div>
              <div className="text-mercury-grey">{it.paymentMode}</div>
              <div className="font-mono text-xs text-ink truncate">{it.utr || '—'}</div>
              <div className="text-xs">
                <span
                  className={`px-2 py-0.5 rounded-full ${
                    it.utrStatus === 'confirmed'
                      ? 'bg-green-50 text-green-700'
                      : it.utrStatus === 'failed'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {it.utrStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main page
// ============================================================================

type SecondaryTab = 'batches' | 'accounts';

export function PaymentBanking() {
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? null;
  const isApprover = APPROVER_ROLES.has(normaliseRole(user?.role));

  const [secondaryTab, setSecondaryTab] = useState<SecondaryTab>('batches');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [batches, setBatches] = useState<PaymentBatch[]>([]);
  const [eligible, setEligible] = useState<EligibleInvoice[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('NEFT');
  const [paymentDate, setPaymentDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [creating, setCreating] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | undefined>(undefined);
  const [activeBatchDetail, setActiveBatchDetail] = useState<BatchDetailResponse | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  // Load accounts + batches + eligible invoices
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tenantId) return;
      try {
        const [acctRes, batchRes, queueRes] = await Promise.all([
          mysqlApiRequest<{ success: boolean; data: BankAccount[] }>('/ap/banking/accounts'),
          mysqlApiRequest<{ success: boolean; data: PaymentBatch[] }>('/ap/banking/batches'),
          mysqlApiRequest<{
            success: boolean;
            data: Array<{
              id: string;
              ref: string;
              name: string;
              amount: number;
              paidAmt: number;
              due: string;
              status: string;
              isMSME: boolean;
              flags: unknown[];
              cleared: boolean;
            }>;
          }>('/ap/payment-queue?status=queued'),
        ]);
        if (cancelled) return;
        setAccounts(acctRes.data || []);
        setBatches(batchRes.data || []);
        const elig = (queueRes.data || [])
          .filter((it) => (it.flags?.length ?? 0) === 0 || it.cleared)
          .filter((it) => it.status === 'queued')
          .map((it) => ({
            id: it.id,
            ref: it.ref,
            vendor: it.name,
            amount: Math.max(0, it.amount - it.paidAmt),
            due: it.due,
            isMSME: it.isMSME,
          }));
        setEligible(elig);
        if (!bankAccountId && acctRes.data && acctRes.data.length > 0) {
          const def = acctRes.data.find((a) => a.isDefault) || acctRes.data[0];
          setBankAccountId(def.id);
        }
      } catch {
        if (!cancelled) {
          setAccounts([]);
          setBatches([]);
          setEligible([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-pick RTGS when total > ₹2L
  const selectedTotal = useMemo(() => {
    let s = 0;
    for (const inv of eligible) if (selectedIds.has(inv.id)) s += inv.amount;
    return s;
  }, [eligible, selectedIds]);

  useEffect(() => {
    if (selectedTotal > 200000 && paymentMode === 'NEFT') {
      setPaymentMode('RTGS');
    }
  }, [selectedTotal, paymentMode]);

  const toggleInvoice = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(eligible.map((e) => e.id)) : new Set());
  };

  const createBatch = async () => {
    if (selectedIds.size === 0 || !bankAccountId) return;
    setCreating(true);
    try {
      const res = await mysqlApiRequest<{ success: boolean; data: BatchDetailResponse }>(
        '/ap/banking/batches',
        {
          method: 'POST',
          body: JSON.stringify({
            bankAccountId,
            invoiceIds: Array.from(selectedIds),
            paymentMode,
            paymentDate,
          }),
        }
      );
      setActiveBatchDetail(res.data);
      setSelectedIds(new Set());
      setSecondaryTab('batches');
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Create batch failed');
    } finally {
      setCreating(false);
    }
  };

  const openBatch = async (batchId: string) => {
    const res = await mysqlApiRequest<{ success: boolean; data: BatchDetailResponse }>(
      `/ap/banking/batches/${batchId}`
    );
    setActiveBatchDetail(res.data);
  };

  const handleSaveAccount = async (form: AccountFormState, id?: string) => {
    if (id) {
      await mysqlApiRequest(`/ap/banking/accounts/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          accountName: form.accountName,
          integrationMode: form.integrationMode,
          payoutFormat: form.payoutFormat,
          isDefault: form.isDefault,
        }),
      });
    } else {
      await mysqlApiRequest('/ap/banking/accounts', {
        method: 'POST',
        body: JSON.stringify(form),
      });
    }
    setShowAccountModal(false);
    setEditingAccount(undefined);
    refresh();
  };

  const handleFetchBalance = async (accountId: string) => {
    await mysqlApiRequest(`/ap/banking/accounts/${accountId}/fetch-balance`, { method: 'POST' });
    refresh();
  };

  const activeBankAccount = useMemo(
    () =>
      activeBatchDetail
        ? accounts.find((a) => a.id === activeBatchDetail.batch.bankAccountId)
        : undefined,
    [accounts, activeBatchDetail]
  );

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-ink mb-1">Banking</h1>
          <p className="text-mercury-grey">
            Bank accounts, payment batches and UTR reconciliation.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 border-2 border-silver bg-white rounded-lg text-mercury-grey"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Secondary tabs */}
      <div className="bg-white border-2 border-silver rounded-xl mb-4 inline-flex p-1">
        {(['batches', 'accounts'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSecondaryTab(t)}
            className={`px-4 py-1.5 text-sm rounded-lg transition-colors capitalize ${
              secondaryTab === t ? 'bg-teal text-white' : 'text-mercury-grey hover:text-ink'
            }`}
          >
            {t === 'batches' ? 'Batches' : 'Bank accounts'}
          </button>
        ))}
      </div>

      {secondaryTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
              <Landmark className="w-5 h-5 text-mercury-grey" /> Registered bank accounts
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditingAccount(undefined);
                setShowAccountModal(true);
              }}
              className="flex items-center gap-1 px-4 py-2 bg-teal hover:bg-teal-dark text-white rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Add bank account
            </button>
          </div>
          {accounts.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-silver p-8 text-center text-mercury-grey">
              No bank accounts yet. Add your first account to enable payment batches.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {accounts.map((acct) => (
                <BankAccountCard
                  key={acct.id}
                  account={acct}
                  onEdit={() => {
                    setEditingAccount(acct);
                    setShowAccountModal(true);
                  }}
                  onFetchBalance={() => handleFetchBalance(acct.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {secondaryTab === 'batches' && (
        <div className="space-y-6">
          {/* Create batch panel — only when there are eligible invoices and no active detail */}
          {!activeBatchDetail && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-mercury-grey" /> Create payment batch
              </h2>
              {accounts.length === 0 ? (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Add a bank account first.
                </div>
              ) : (
                <>
                  <EligibleInvoicesPanel
                    invoices={eligible}
                    selectedIds={selectedIds}
                    onToggle={toggleInvoice}
                    onToggleAll={toggleAll}
                    loading={false}
                  />
                  {selectedIds.size > 0 && (
                    <div className="bg-white rounded-xl border-2 border-silver p-4 space-y-3">
                      <div className="text-sm">
                        <strong className="text-ink">{selectedIds.size}</strong> invoice
                        {selectedIds.size === 1 ? '' : 's'} selected ·{' '}
                        <strong className="text-ink">{formatINRCompact(selectedTotal)}</strong>{' '}
                        total
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-mercury-grey mb-1">
                            Bank account
                          </label>
                          <select
                            value={bankAccountId}
                            onChange={(e) => setBankAccountId(e.target.value)}
                            className="w-full px-2 py-1.5 border-2 border-silver rounded-lg text-sm"
                          >
                            {accounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.accountName} ({maskAccount(a.accountNumber)})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-mercury-grey mb-1">
                            Payment mode
                          </label>
                          <select
                            value={paymentMode}
                            onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                            className="w-full px-2 py-1.5 border-2 border-silver rounded-lg text-sm"
                          >
                            <option value="NEFT">NEFT</option>
                            <option value="RTGS">RTGS</option>
                            <option value="IMPS">IMPS</option>
                            <option value="UPI">UPI</option>
                          </select>
                          {selectedTotal > 200000 && paymentMode === 'RTGS' && (
                            <div className="text-xs text-mercury-grey mt-1">
                              RTGS auto-selected (total &gt; ₹2L)
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-mercury-grey mb-1">
                            Payment date
                          </label>
                          <input
                            type="date"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            className="w-full px-2 py-1.5 border-2 border-silver rounded-lg text-sm"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={createBatch}
                        disabled={creating}
                        className="w-full px-4 py-2 bg-teal hover:bg-teal-dark text-white rounded-lg font-medium disabled:opacity-50"
                      >
                        {creating ? 'Creating…' : 'Create batch'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Active batch detail */}
          {activeBatchDetail && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setActiveBatchDetail(null)}
                className="text-xs text-teal hover:underline flex items-center gap-1"
              >
                ← Back to batches
              </button>
              <BatchDetailCard
                detail={activeBatchDetail}
                bankAccount={activeBankAccount}
                onRefresh={async () => {
                  refresh();
                  if (activeBatchDetail) {
                    await openBatch(activeBatchDetail.batch.id);
                  }
                }}
                isApprover={isApprover}
              />
            </div>
          )}

          {/* Batch list */}
          {!activeBatchDetail && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
                <Building2 className="w-5 h-5 text-mercury-grey" /> Recent batches
              </h2>
              <div className="bg-white rounded-xl border-2 border-silver overflow-hidden">
                {batches.length === 0 ? (
                  <div className="py-12 text-center text-mercury-grey text-sm">
                    No payment batches yet. Create one above.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-[1.5fr_1fr_70px_140px_140px_120px] items-center gap-3 px-4 py-2 bg-cloud border-b-2 border-silver text-xs uppercase font-semibold text-mercury-grey">
                      <span>Batch ref</span>
                      <span>Bank</span>
                      <span className="text-right">Items</span>
                      <span className="text-right">Total</span>
                      <span>Status</span>
                      <span>Created</span>
                    </div>
                    {batches.map((b) => {
                      const acct = accounts.find((a) => a.id === b.bankAccountId);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => openBatch(b.id)}
                          className="w-full grid grid-cols-[1.5fr_1fr_70px_140px_140px_120px] items-center gap-3 px-4 py-3 border-b border-silver hover:bg-cloud text-sm text-left"
                        >
                          <div className="font-medium text-ink">
                            {b.batchRef}
                            <ChevronRight className="inline w-3 h-3 ml-1 text-mercury-grey" />
                          </div>
                          <span className="text-mercury-grey text-xs">
                            {acct?.bankName || '—'}{' '}
                            {acct ? `· ${maskAccount(acct.accountNumber)}` : ''}
                          </span>
                          <span className="text-right text-mercury-grey">{b.itemCount}</span>
                          <span className="text-right text-ink font-medium">
                            {formatINR(b.totalAmount)}
                          </span>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_PILL[b.status]}`}
                          >
                            {b.status.replace('_', ' ')}
                          </span>
                          <span className="text-mercury-grey text-xs">
                            {b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN') : '—'}
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {showAccountModal && (
        <AccountModal
          initial={editingAccount}
          onClose={() => {
            setShowAccountModal(false);
            setEditingAccount(undefined);
          }}
          onSave={handleSaveAccount}
        />
      )}

      {/* Decorative — keeps tree-shaking honest */}
      <span className="hidden">
        <ChevronDown />
        <Upload />
      </span>
    </div>
  );
}

export default PaymentBanking;
