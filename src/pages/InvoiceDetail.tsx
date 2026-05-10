import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle,
  CreditCard,
  DollarSign,
  Edit,
  FileText,
  Lock,
  Mail,
  Package,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { mysqlApiRequest } from '../lib/mysql/client';
import { useAuth } from '../contexts/AuthContext';

interface LineItem {
  id: string;
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  hsn_sac: string | null;
  gst_rate: number | null;
}

interface InvoiceDetailData {
  id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  vendor_name: string | null;
  vendor_gstin: string | null;
  vendor_pan: string | null;
  vendor_email: string | null;
  bill_to_entity: string | null;
  bill_to_gstin: string | null;
  currency: string;
  subtotal: number;
  tax_amount: number;
  tax_rate: number | null;
  total_amount: number;
  po_number: string | null;
  po_id: string | null;
  irn: string | null;
  payment_terms: string | null;
  bank_details: unknown;
  notes: string | null;
  status: string;
  source: string | null;
  lifecycle_state: string | null;
  touchless: number | null;
  touchless_score: number | null;
  touchless_fail_reasons: unknown;
  validated_by: string | null;
  validated_at: string | null;
  metadata: Record<string, unknown> | null;
  attachment_path: string | null;
  entity_id: string | null;
  created_at: string;
  updated_at: string;
  line_items: LineItem[];
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount: number | null | undefined, currency = 'INR'): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  const isEmpty = value == null || value === '' || value === '—';
  return (
    <div
      className="flex items-baseline gap-4 py-2.5"
      style={{ borderBottom: '1px solid var(--color-cloud)' }}
    >
      <span
        className="w-40 shrink-0 text-xs font-medium"
        style={{ color: 'var(--color-mercury-grey)' }}
      >
        {label}
      </span>
      <span
        className="text-sm"
        style={{ color: isEmpty ? 'var(--color-mercury-grey)' : 'var(--color-ink)' }}
      >
        {isEmpty ? '—' : value}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: '#ffffff', border: '1px solid var(--color-cloud)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: 'var(--color-teal)' }}>{icon}</span>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function getStatusConfig(status: string, lifecycleState: string | null) {
  const lc = lifecycleState || '';
  const label = lc || status || 'Unknown';
  if (lc === 'Processed' || lc === 'Queued for Payment')
    return { bg: '#DCFCE7', color: '#15803D', label };
  if (lc === 'Rejected') return { bg: '#FEE2E2', color: '#DC2626', label };
  if (lc === 'Under Verification') return { bg: '#DBEAFE', color: '#1D4ED8', label };
  if (lc === 'Exception Hold') return { bg: '#FEF9C3', color: '#A16207', label };
  if (lc === 'Ingested' || lc === 'OCR Extracted')
    return { bg: '#F3F4F6', color: '#6B7280', label };
  const lower = (status || '').toLowerCase();
  if (lower === 'approved' || lower === 'paid') return { bg: '#DCFCE7', color: '#15803D', label };
  if (lower === 'rejected') return { bg: '#FEE2E2', color: '#DC2626', label };
  if (lower === 'pending_approval' || lower === 'pending approval')
    return { bg: '#DBEAFE', color: '#1D4ED8', label: lc || 'Pending Approval' };
  return { bg: '#FEF9C3', color: '#A16207', label };
}

function getSourceConfig(source: string | null) {
  if (source === 'email_ingestion')
    return {
      label: 'Email Ingestion',
      icon: <Mail className="w-3 h-3" />,
      bg: '#CCFBF1',
      color: '#0F766E',
    };
  if (source === 'manual')
    return {
      label: 'Manual Entry',
      icon: <FileText className="w-3 h-3" />,
      bg: '#EEF2FF',
      color: '#4338CA',
    };
  return {
    label: 'AI OCR',
    icon: <Sparkles className="w-3 h-3" />,
    bg: '#F0FDFA',
    color: '#0F766E',
  };
}

function LoadingSkeleton() {
  return (
    <div className="p-8" style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="max-w-5xl mx-auto space-y-5">
        {[120, 160, 200, 160].map((h, i) => (
          <div
            key={i}
            className="rounded-2xl animate-pulse"
            style={{ height: `${h}px`, background: '#e5e7eb' }}
          />
        ))}
      </div>
    </div>
  );
}

function LifecycleBanner({
  lifecycleState,
  failReasons,
}: {
  lifecycleState: string | null;
  failReasons: string[];
}) {
  const lc = lifecycleState || '';

  if (lc === 'Ingested' || lc === 'OCR Extracted' || lc === '') {
    return (
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}
      >
        <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: '#C2410C' }} />
        <div className="min-w-0">
          <span className="text-sm font-medium" style={{ color: '#9A3412' }}>
            Awaiting workbench validation
          </span>
          {failReasons.length > 0 && (
            <p className="text-xs mt-0.5" style={{ color: '#C2410C' }}>
              {failReasons[0]}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (lc === 'Exception Hold') {
    const reason = failReasons[0] || 'Exception flagged — review required';
    return (
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ background: '#FEF9C3', border: '1px solid #FDE047' }}
      >
        <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#A16207' }} />
        <span className="text-sm font-medium" style={{ color: '#92400E' }}>
          Exception — {reason}
        </span>
      </div>
    );
  }

  if (lc === 'Processed') {
    return (
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ background: '#DCFCE7', border: '1px solid #86EFAC' }}
      >
        <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#15803D' }} />
        <span className="text-sm font-medium" style={{ color: '#15803D' }}>
          Approved
        </span>
      </div>
    );
  }

  if (lc === 'Queued for Payment') {
    return (
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ background: '#DCFCE7', border: '1px solid #86EFAC' }}
      >
        <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#15803D' }} />
        <span className="text-sm font-medium" style={{ color: '#15803D' }}>
          Approved — Queued for Payment
        </span>
      </div>
    );
  }

  if (lc === 'Rejected') {
    return (
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}
      >
        <XCircle className="w-4 h-4 shrink-0" style={{ color: '#DC2626' }} />
        <span className="text-sm font-medium" style={{ color: '#DC2626' }}>
          Rejected
        </span>
      </div>
    );
  }

  return null;
}

export function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<InvoiceDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('No invoice ID provided');
      setLoading(false);
      return;
    }
    mysqlApiRequest<{ success: boolean; data: InvoiceDetailData }>(`/invoices/${id}`)
      .then((res) => {
        if (res?.success && res.data) {
          setInvoice(res.data);
        } else {
          setError('Invoice not found');
        }
      })
      .catch(() => setError('Failed to load invoice'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const reload = () => {
    if (!id) return;
    mysqlApiRequest<{ success: boolean; data: InvoiceDetailData }>(`/invoices/${id}`).then(
      (res) => {
        if (res?.success && res.data) setInvoice(res.data);
      }
    );
  };

  const doAction = async (action: 'submit' | 'approve' | 'reject', reason?: string) => {
    if (!invoice || !id) return;
    setActionBusy(true);
    try {
      const tenantId = user?.tenantId || 'tenant-default-001';
      const token = sessionStorage.getItem('procinix.session.token') || '';
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '')}/api/invoices/${id}/${action}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-Id': tenantId,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            validated_by: user?.email,
            approved_by: user?.email,
            rejected_by: user?.email,
            reason,
          }),
        }
      );
      const data = await res.json();
      if (!data.success) {
        setToast(data.error || `${action} failed`);
        return;
      }
      setToast(
        action === 'submit'
          ? 'Submitted for approval'
          : action === 'approve'
            ? 'Invoice approved'
            : 'Invoice rejected'
      );
      reload();
    } catch {
      setToast(`${action} failed — check server`);
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) return <LoadingSkeleton />;

  if (error || !invoice) {
    return (
      <div
        className="p-8 flex items-center justify-center"
        style={{ minHeight: '100vh', backgroundColor: 'var(--color-cloud)' }}
      >
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3" style={{ color: '#DC2626' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
            {error || 'Invoice not found'}
          </p>
          <button
            className="mt-4 text-sm underline"
            style={{ color: 'var(--color-teal)' }}
            onClick={() => navigate('/invoices')}
          >
            Back to invoices
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(invoice.status, invoice.lifecycle_state);
  const sourceConfig = getSourceConfig(invoice.source);
  const lc = invoice.lifecycle_state || '';
  const meta = invoice.metadata as Record<string, unknown> | null;
  const ocrScores = meta?.ocrScores as Record<string, unknown> | undefined;
  const rawConfidence = (ocrScores?.overall_confidence ?? meta?.confidence_score) as
    | number
    | undefined;
  const confidencePct =
    rawConfidence != null
      ? rawConfidence > 1
        ? Math.round(rawConfidence)
        : Math.round(rawConfidence * 100)
      : null;
  const extractedData = meta?.extractedData as Record<string, unknown> | undefined;
  const payments = Array.isArray(extractedData?.payments)
    ? (extractedData.payments as Record<string, unknown>[])
    : [];

  const failReasons: string[] = (() => {
    const raw = invoice.touchless_fail_reasons;
    if (Array.isArray(raw)) return raw as string[];
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  })();

  const displayNumber = invoice.invoice_number || `INV-${invoice.id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="p-8" style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 100,
            backgroundColor: '#1A1A2E',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}
        >
          {toast}
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-5">
        {/* Action bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-1.5 text-sm font-medium rounded-xl px-4 py-2 hover:opacity-80 transition-opacity"
            style={{
              background: '#fff',
              color: 'var(--color-ink)',
              border: '1px solid var(--color-cloud)',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/invoices/edit/${invoice.id}`)}
              className="flex items-center gap-1.5 text-sm font-medium rounded-xl px-4 py-2 hover:opacity-80 transition-opacity"
              style={{
                background: '#fff',
                color: 'var(--color-ink)',
                border: '1px solid var(--color-cloud)',
              }}
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>

            {/* Submit for Approval — shown when in workbench */}
            {(lc === 'Ingested' || lc === 'OCR Extracted' || lc === '') && (
              <button
                disabled={actionBusy}
                onClick={() => doAction('submit')}
                className="flex items-center gap-1.5 text-sm font-semibold rounded-xl px-4 py-2 hover:opacity-80 transition-opacity"
                style={{
                  background: 'linear-gradient(135deg, var(--color-teal) 0%, #006E78 100%)',
                  color: '#fff',
                  opacity: actionBusy ? 0.6 : 1,
                }}
              >
                <CheckCircle className="w-4 h-4" />
                Submit for Approval
              </button>
            )}

            {/* Review Exception */}
            {lc === 'Exception Hold' && (
              <button
                onClick={() => navigate('/invoices/ai-ingestion')}
                className="flex items-center gap-1.5 text-sm font-semibold rounded-xl px-4 py-2 hover:opacity-80 transition-opacity"
                style={{ background: '#FEF9C3', color: '#92400E' }}
              >
                <AlertCircle className="w-4 h-4" />
                Review Exception
              </button>
            )}

            {/* Approve / Reject — shown when Under Verification */}
            {lc === 'Under Verification' && (
              <>
                <button
                  disabled={actionBusy}
                  onClick={() => doAction('reject')}
                  className="flex items-center gap-1.5 text-sm font-semibold rounded-xl px-4 py-2 hover:opacity-80 transition-opacity"
                  style={{
                    background: '#FEE2E2',
                    color: '#DC2626',
                    opacity: actionBusy ? 0.6 : 1,
                  }}
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
                <button
                  disabled={actionBusy}
                  onClick={() => doAction('approve')}
                  className="flex items-center gap-1.5 text-sm font-semibold rounded-xl px-5 py-2 hover:opacity-80 transition-opacity"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-teal) 0%, #006E78 100%)',
                    color: '#fff',
                    opacity: actionBusy ? 0.6 : 1,
                  }}
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
              </>
            )}

            {/* Add to Payment Batch — shown when Processed */}
            {(lc === 'Processed' || lc === 'Queued for Payment') && (
              <button
                onClick={() => navigate('/payments')}
                className="flex items-center gap-1.5 text-sm font-semibold rounded-xl px-4 py-2 hover:opacity-80 transition-opacity"
                style={{
                  background: 'linear-gradient(135deg, var(--color-teal) 0%, #006E78 100%)',
                  color: '#fff',
                }}
              >
                <CreditCard className="w-4 h-4" />
                Add to Payment Batch
              </button>
            )}

            {/* On Hold duplicate indicator */}
            {lc === 'Exception Hold' &&
              failReasons.some((r) => r.toLowerCase().includes('duplicate')) && (
                <span
                  className="flex items-center gap-1.5 text-xs font-semibold rounded-xl px-3 py-2"
                  style={{ background: '#F3F4F6', color: '#6B7280' }}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Possible Duplicate
                </span>
              )}
          </div>
        </div>

        {/* Lifecycle banner */}
        <LifecycleBanner lifecycleState={lc} failReasons={failReasons} />

        {/* Header card */}
        <div
          className="rounded-2xl p-6"
          style={{ background: '#fff', border: '1px solid var(--color-cloud)' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Invoice
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1"
                  style={{ background: sourceConfig.bg, color: sourceConfig.color }}
                >
                  {sourceConfig.icon}
                  {sourceConfig.label}
                </span>
              </div>
              <h1 className="text-2xl font-bold break-all" style={{ color: 'var(--color-teal)' }}>
                {displayNumber}
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-mercury-grey)' }}>
                {invoice.vendor_name || 'Unknown Vendor'}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span
                className="px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap"
                style={{ background: statusConfig.bg, color: statusConfig.color }}
              >
                {statusConfig.label}
              </span>
              {confidencePct != null && (
                <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                  OCR confidence: {confidencePct}%
                </span>
              )}
              <p className="text-xl font-bold" style={{ color: 'var(--color-ink)' }}>
                {formatCurrency(invoice.total_amount, invoice.currency)}
              </p>
            </div>
          </div>
        </div>

        {/* Vendor + Invoice Details side-by-side */}
        <div className="grid grid-cols-2 gap-5">
          <SectionCard title="Vendor" icon={<Building2 className="w-4 h-4" />}>
            <Field label="Vendor Name" value={invoice.vendor_name} />
            <Field label="GSTIN" value={invoice.vendor_gstin} />
            <Field label="PAN" value={invoice.vendor_pan} />
            <Field label="Email" value={invoice.vendor_email} />
            <Field label="Bill-To Entity" value={invoice.bill_to_entity} />
            <Field label="Bill-To GSTIN" value={invoice.bill_to_gstin} />
            <Field label="Currency" value={invoice.currency} />
          </SectionCard>

          <SectionCard title="Invoice Details" icon={<FileText className="w-4 h-4" />}>
            <Field label="Invoice Number" value={invoice.invoice_number} />
            <Field label="Invoice Date" value={formatDate(invoice.invoice_date)} />
            <Field label="Due Date" value={formatDate(invoice.due_date)} />
            <Field label="PO Number" value={invoice.po_number} />
            <Field label="IRN" value={invoice.irn} />
            <Field label="Payment Terms" value={invoice.payment_terms} />
            <Field label="Notes" value={invoice.notes} />
          </SectionCard>
        </div>

        {/* Amounts */}
        <SectionCard title="Amounts" icon={<DollarSign className="w-4 h-4" />}>
          <div className="grid grid-cols-3 gap-4">
            {(
              [
                { label: 'Subtotal', value: invoice.subtotal, highlight: false },
                { label: 'Tax Amount', value: invoice.tax_amount, highlight: false },
                { label: 'Total Amount', value: invoice.total_amount, highlight: true },
              ] as { label: string; value: number; highlight: boolean }[]
            ).map(({ label, value, highlight }) => (
              <div
                key={label}
                className="rounded-xl p-4"
                style={{ background: highlight ? '#F0FDFA' : 'var(--color-cloud)' }}
              >
                <p
                  className="text-xs font-medium mb-1"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  {label}
                </p>
                <p
                  className={`font-bold ${highlight ? 'text-xl' : 'text-base'}`}
                  style={{ color: highlight ? 'var(--color-teal)' : 'var(--color-ink)' }}
                >
                  {formatCurrency(value, invoice.currency)}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Line Items */}
        {invoice.line_items?.length > 0 && (
          <SectionCard title="Line Items" icon={<Package className="w-4 h-4" />}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-cloud)' }}>
                    {['#', 'Description', 'HSN/SAC', 'Qty', 'Unit Price', 'GST %', 'Amount'].map(
                      (h) => (
                        <th
                          key={h}
                          className="pb-2 pr-4 text-left text-xs font-semibold"
                          style={{ color: 'var(--color-mercury-grey)' }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {invoice.line_items.map((li) => (
                    <tr key={li.id} style={{ borderBottom: '1px solid var(--color-cloud)' }}>
                      <td
                        className="py-3 pr-4 text-xs"
                        style={{ color: 'var(--color-mercury-grey)' }}
                      >
                        {li.line_number}
                      </td>
                      <td className="py-3 pr-4" style={{ color: 'var(--color-ink)' }}>
                        {li.description || '—'}
                      </td>
                      <td
                        className="py-3 pr-4 text-xs font-mono"
                        style={{ color: 'var(--color-mercury-grey)' }}
                      >
                        {li.hsn_sac || '—'}
                      </td>
                      <td className="py-3 pr-4 text-right" style={{ color: 'var(--color-ink)' }}>
                        {li.quantity}
                      </td>
                      <td className="py-3 pr-4 text-right" style={{ color: 'var(--color-ink)' }}>
                        {formatCurrency(li.unit_price, invoice.currency)}
                      </td>
                      <td className="py-3 pr-4 text-right" style={{ color: 'var(--color-ink)' }}>
                        {li.gst_rate != null ? `${li.gst_rate}%` : '—'}
                      </td>
                      <td
                        className="py-3 text-right font-semibold"
                        style={{ color: 'var(--color-teal)' }}
                      >
                        {formatCurrency(li.amount, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {/* Payments */}
        {payments.length > 0 && (
          <SectionCard title="Payments" icon={<CreditCard className="w-4 h-4" />}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-cloud)' }}>
                    {['Date', 'Transaction ID', 'Mode', 'Amount'].map((h) => (
                      <th
                        key={h}
                        className="pb-2 pr-4 text-left text-xs font-semibold"
                        style={{ color: 'var(--color-mercury-grey)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-cloud)' }}>
                      <td className="py-3 pr-4" style={{ color: 'var(--color-ink)' }}>
                        {formatDate(p.date as string)}
                      </td>
                      <td
                        className="py-3 pr-4 font-mono text-xs"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        {(p.transaction_id as string) || '—'}
                      </td>
                      <td className="py-3 pr-4" style={{ color: 'var(--color-ink)' }}>
                        {(p.mode as string) || '—'}
                      </td>
                      <td className="py-3 font-semibold" style={{ color: 'var(--color-teal)' }}>
                        {formatCurrency(p.amount as number, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {/* Footer metadata */}
        <div
          className="text-xs flex flex-wrap gap-x-6 gap-y-1 pb-2"
          style={{ color: 'var(--color-mercury-grey)' }}
        >
          <span>Created: {formatDate(invoice.created_at)}</span>
          <span>Updated: {formatDate(invoice.updated_at)}</span>
          {invoice.entity_id && <span>Entity: {invoice.entity_id}</span>}
          {invoice.source && <span>Source: {invoice.source}</span>}
          {invoice.validated_by && (
            <span>
              Validated by: {invoice.validated_by}{' '}
              {invoice.validated_at ? `on ${formatDate(invoice.validated_at)}` : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
