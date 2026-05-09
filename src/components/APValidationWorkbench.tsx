import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  Upload,
  Settings,
  Search,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  FileText,
  Eye,
  X,
  Loader2,
  MoreHorizontal,
  Download,
  Zap,
  TrendingUp,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { CreateVendorSlideOver } from './CreateVendorSlideOver';

/* ─── Constants ─────────────────────────────────────────────────── */
const API = import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || '';

/* ─── API helpers ───────────────────────────────────────────────── */
function authHeaders(): Record<string, string> {
  const key =
    (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('procinix.session.token')) ||
    import.meta.env.VITE_API_SECRET_KEY ||
    '';
  return key ? { Authorization: `Bearer ${key}` } : {};
}

/* ─── Helpers ───────────────────────────────────────────────────── */
const normalizeScore = (s: any): number => {
  const n = Number(s) || 0;
  return n > 1 ? Math.round(n) : Math.round(n * 100);
};

const getLane = (inv: any): 'green' | 'amber' | 'red' => {
  const ls = (inv.lifecycle_state || '').toLowerCase();
  if (ls === 'processed' || ls === 'queued for payment') return 'green';
  if (inv.touchless) return 'green';
  const score = normalizeScore(inv.readiness_score ?? inv.touchless_score);
  if (ls === 'exception hold') return 'red';
  if (ls === 'rejected') return 'red';
  if (score < 70) return 'red';
  if (score >= 70 && ls === 'ingested') return 'amber';
  return score >= 80 ? 'green' : score >= 50 ? 'amber' : 'red';
};

const getNextAction = (invoice: any) => {
  const score = normalizeScore(invoice.readiness_score);
  if (score >= 65 && !invoice.exceptions?.length)
    return { label: '\u2192 Send for approval', bg: '#059669', action: 'approve' };
  const vendorStatus = invoice.vendor_match_status || '';
  if (vendorStatus.includes('not_found') || vendorStatus.includes('unmatched'))
    return { label: '+ Create vendor', bg: '#185FA5', action: 'create_vendor' };
  if (score < 30) return { label: '\u2191 Re-upload PDF', bg: '#7F77DD', action: 'reupload' };
  if (!invoice.matched_po_id) return { label: '\u21CC Link PO', bg: '#007D87', action: 'link_po' };
  return { label: '\uD83D\uDC41 Review data', bg: '#185FA5', action: 'review' };
};

const getExceptionTag = (invoice: any) => {
  const vendorStatus = invoice.vendor_match_status || '';
  if (vendorStatus.includes('not_found') || vendorStatus.includes('unmatched'))
    return { label: '! Vendor missing', bg: '#FEE2E2', color: '#DC2626', border: '#FECACA' };
  if (!invoice.matched_po_id && invoice.total_amount > 0)
    return { label: '\u26A0 No PO', bg: '#FFF8EC', color: '#9A6800', border: '#FFE4A0' };
  const score = normalizeScore(invoice.readiness_score);
  if (score < 30)
    return { label: '\u2298 OCR issues', bg: '#F0EDFF', color: '#4A3BAF', border: '#C5BFEF' };
  if (score >= 80)
    return { label: '\u2713 None', bg: '#F6F9FC', color: '#6E7A82', border: '#E1E6EA' };
  return { label: '\u26A0 Review', bg: '#FFF8EC', color: '#9A6800', border: '#FFE4A0' };
};

const formatCurrency = (amount: number, currency: string) => {
  const sym = currency === 'INR' ? '\u20B9' : currency === 'USD' ? '$' : currency;
  return `${sym} ${Number(amount || 0).toLocaleString('en-IN')}`;
};

const formatDate = (d: string | null) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/* ═══════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export function APValidationWorkbench() {
  const navigate = useNavigate();

  /* ── state ──────────────────────────────────────────────────── */
  const [invoices, setInvoices] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [pulling, setPulling] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [vendorSlideOver, setVendorSlideOver] = useState<{
    open: boolean;
    invoiceId: string;
    prefill: any;
  } | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [revalidating, setRevalidating] = useState<string | null>(null);
  const [reviewInvoice, setReviewInvoice] = useState<any | null>(null);
  const [reviewOriginal, setReviewOriginal] = useState<any | null>(null);
  const [reviewDecisions, setReviewDecisions] = useState<any[]>([]);
  const [reviewExplanations, setReviewExplanations] = useState<any[]>([]);
  const [correctionReason, setCorrectionReason] = useState('');
  const [learnFromCorrection, setLearnFromCorrection] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [savingReview, setSavingReview] = useState(false);

  /* ── data fetching ──────────────────────────────────────────── */
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/invoice-ingestion/workbench-stats`, {
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
      });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch {
      /* silent */
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/invoices`, {
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
      });
      const data = await res.json();
      if (data.success) setInvoices(Array.isArray(data.data) ? data.data : []);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchInvoices();
  }, [fetchStats, fetchInvoices]);

  /* ── toast auto-clear ──────────────────────────────────────── */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── filtering + sorting ───────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = [...invoices];
    if (activeTab !== 'all') {
      if (activeTab === 'pending') {
        list = list.filter(
          (i) => i.lifecycle_state === 'Under Verification' || i.status === 'pending_approval'
        );
      } else {
        list = list.filter((i) => getLane(i) === activeTab);
      }
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (i) =>
          (i.invoice_number || '').toLowerCase().includes(q) ||
          (i.vendor_name || '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return new Date(a.invoice_date || 0).getTime() - new Date(b.invoice_date || 0).getTime();
        case 'date_desc':
          return new Date(b.invoice_date || 0).getTime() - new Date(a.invoice_date || 0).getTime();
        case 'amount_desc':
          return (b.total_amount || 0) - (a.total_amount || 0);
        case 'amount_asc':
          return (a.total_amount || 0) - (b.total_amount || 0);
        case 'score_asc':
          return normalizeScore(a.readiness_score) - normalizeScore(b.readiness_score);
        case 'score_desc':
          return normalizeScore(b.readiness_score) - normalizeScore(a.readiness_score);
        default:
          return 0;
      }
    });
    return list;
  }, [invoices, activeTab, searchTerm, sortBy]);

  /* ── lane counts from stats ────────────────────────────────── */
  const laneCounts = stats.lane_counts || { green: 0, amber: 0, red: 0, pending: 0 };
  const totalCount = stats.total_processed || invoices.length;

  /* ── actions ────────────────────────────────────────────────── */
  const handlePull = async () => {
    setPulling(true);
    try {
      await fetch(`${API}/api/invoice-ingestion/trigger`, {
        method: 'POST',
        headers: authHeaders(),
      });
      await Promise.all([fetchInvoices(), fetchStats()]);
      setToast('Inbox scanned. New invoices pulled.');
    } catch {
      setToast('Pull failed. Check server connection.');
    } finally {
      setPulling(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await fetch(`${API}/api/ap/process-invoice`, {
        method: 'POST',
        headers: authHeaders(),
        body: form,
      });
      await Promise.all([fetchInvoices(), fetchStats()]);
      setToast('Invoice processed successfully.');
    } catch {
      setToast('Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleRevalidate = async (invoiceId: string) => {
    setRevalidating(invoiceId);
    try {
      await fetch(`${API}/api/invoice-ingestion/revalidate/${invoiceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
      });
      await Promise.all([fetchInvoices(), fetchStats()]);
    } finally {
      setRevalidating(null);
    }
  };

  const handleNextAction = (invoice: any) => {
    const action = getNextAction(invoice);
    if (action.action === 'create_vendor') {
      setVendorSlideOver({
        open: true,
        invoiceId: invoice.id,
        prefill: {
          vendorName: invoice.vendor_name || '',
          email: invoice.vendor_email || '',
          gstin: invoice.vendor_gstin || '',
          country: 'India',
        },
      });
    } else if (action.action === 'approve') {
      handleSubmitForApproval(invoice);
    } else if (action.action === 'review') {
      openReview(invoice.id);
    }
  };

  const openReview = (invoiceId: string) => {
    if (!invoiceId) {
      setToast('Unable to open invoice detail.');
      return;
    }
    navigate(`/invoices/${invoiceId}`);
  };

  const handleSubmitForApproval = async (inv: any) => {
    const invoiceId = inv.id;
    if (!invoiceId) return;
    const tenantId =
      JSON.parse(sessionStorage.getItem('procinix.session.user') ?? '{}')?.tenantId ||
      'tenant-default-001';
    const validatedBy =
      JSON.parse(sessionStorage.getItem('procinix.session.user') ?? '{}')?.email || null;
    try {
      const res = await fetch(`${API}/api/invoices/${invoiceId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId, ...authHeaders() },
        body: JSON.stringify({ validated_by: validatedBy }),
      });
      const data = await res.json();
      if (!data.success) {
        setToast(data.error || 'Submit failed.');
        return;
      }
      await Promise.all([fetchInvoices(), fetchStats()]);
      setToast('Invoice submitted for approval.');
    } catch {
      setToast('Submit failed. Check server connection.');
    }
  };

  const updateReviewField = (field: string, value: any) => {
    setReviewInvoice((prev: any) => (prev ? { ...prev, [field]: value } : prev));
  };

  const updateReviewLine = (idx: number, field: string, value: any) => {
    setReviewInvoice((prev: any) => {
      if (!prev) return prev;
      const nextLines = Array.isArray(prev.line_items) ? [...prev.line_items] : [];
      const line = { ...(nextLines[idx] || {}) };
      line[field] = value;
      nextLines[idx] = line;
      return { ...prev, line_items: nextLines };
    });
  };

  const addReviewLine = () => {
    setReviewInvoice((prev: any) => {
      if (!prev) return prev;
      const nextLines = Array.isArray(prev.line_items) ? [...prev.line_items] : [];
      nextLines.push({
        description: '',
        quantity: 1,
        unit_price: 0,
        amount: 0,
        hsn_sac: '',
        gst_rate: null,
      });
      return { ...prev, line_items: nextLines };
    });
  };

  const removeReviewLine = (idx: number) => {
    setReviewInvoice((prev: any) => {
      if (!prev) return prev;
      const nextLines = Array.isArray(prev.line_items)
        ? prev.line_items.filter((_: any, i: number) => i !== idx)
        : [];
      return { ...prev, line_items: nextLines };
    });
  };

  const saveReview = async () => {
    if (!reviewInvoice?.id) return;
    const changedFields: Record<string, any> = {};
    const compareFields = [
      'invoice_number',
      'invoice_date',
      'due_date',
      'vendor_name',
      'vendor_gstin',
      'vendor_pan',
      'vendor_email',
      'bill_to_entity',
      'bill_to_gstin',
      'currency',
      'subtotal',
      'tax_amount',
      'tax_rate',
      'total_amount',
      'po_number',
      'irn',
      'hsn_sac_summary',
      'payment_terms',
      'notes',
    ];
    for (const key of compareFields) {
      const before = reviewOriginal?.[key] ?? null;
      const after = reviewInvoice?.[key] ?? null;
      if (String(before ?? '') !== String(after ?? '')) {
        changedFields[key] = after;
      }
    }
    const lineChanged =
      JSON.stringify(reviewOriginal?.line_items || []) !==
      JSON.stringify(reviewInvoice?.line_items || []);
    if (lineChanged) {
      changedFields.line_items = reviewInvoice?.line_items || [];
    }
    if (Object.keys(changedFields).length > 0 && !correctionReason.trim()) {
      setToast('Please add reasoning before saving corrections.');
      return;
    }

    setSavingReview(true);
    try {
      const invoicePayload = {
        invoice_number: reviewInvoice.invoice_number,
        invoice_date: reviewInvoice.invoice_date || null,
        due_date: reviewInvoice.due_date || null,
        vendor_name: reviewInvoice.vendor_name,
        vendor_gstin: reviewInvoice.vendor_gstin || null,
        vendor_pan: reviewInvoice.vendor_pan || null,
        vendor_email: reviewInvoice.vendor_email || null,
        bill_to_entity: reviewInvoice.bill_to_entity || null,
        bill_to_gstin: reviewInvoice.bill_to_gstin || null,
        currency: reviewInvoice.currency || 'INR',
        subtotal: Number(reviewInvoice.subtotal || 0),
        tax_amount: Number(reviewInvoice.tax_amount || 0),
        tax_rate: reviewInvoice.tax_rate ?? null,
        total_amount: Number(reviewInvoice.total_amount || 0),
        po_number: reviewInvoice.po_number || null,
        irn: reviewInvoice.irn || null,
        hsn_sac_summary: reviewInvoice.hsn_sac_summary || null,
        payment_terms: reviewInvoice.payment_terms || null,
        notes: reviewInvoice.notes || null,
        status: reviewInvoice.status || 'draft',
        metadata: reviewInvoice.metadata || {},
      };

      const lineItems = (reviewInvoice.line_items || []).map((line: any, idx: number) => ({
        id: line.id,
        line_number: idx + 1,
        description: line.description || '',
        quantity: Number(line.quantity || 0),
        unit_price: Number(line.unit_price || 0),
        amount: Number(line.amount || 0),
        hsn_sac: line.hsn_sac || null,
        gst_rate: line.gst_rate === '' || line.gst_rate == null ? null : Number(line.gst_rate),
      }));

      const res = await fetch(`${API}/api/invoices/${reviewInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ invoice: invoicePayload, line_items: lineItems }),
      });
      const data = await res.json();
      if (!data.success) {
        setToast(data.error || 'Failed to save corrections.');
        return;
      }

      if (Object.keys(changedFields).length > 0) {
        await fetch(`${API}/api/ap/invoices/${reviewInvoice.id}/correct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({
            corrections: {
              ...changedFields,
              _learn_from_correction: learnFromCorrection,
            },
            comments: correctionReason,
          }),
        });
      }

      setReviewInvoice(data.data);
      setReviewOriginal(JSON.parse(JSON.stringify(data.data)));
      await Promise.all([fetchInvoices(), fetchStats()]);
      setToast('Corrections saved.');
    } catch {
      setToast('Failed to save corrections.');
    } finally {
      setSavingReview(false);
    }
  };

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === filtered.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(filtered.map((i) => i.id)));
  };

  /* ═════════════════════════════════════════════════════════════
     RENDER
     ═════════════════════════════════════════════════════════════ */

  const STAT_CARDS = [
    {
      label: 'Total Processed',
      value: stats.total_processed ?? 0,
      sub: `${stats.stp_count ?? 0} auto-posted`,
      gradient: 'linear-gradient(135deg, #E0F7F4 0%, #B2EBDC 100%)',
      iconBg: '#059669',
      Icon: FileText,
    },
    {
      label: 'STP Rate',
      value: `${stats.stp_rate ?? 0}%`,
      sub: 'Straight-through',
      gradient: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
      iconBg: '#10B981',
      Icon: Zap,
    },
    {
      label: 'Avg Readiness',
      value: `${stats.avg_readiness ?? 0}%`,
      sub: 'Posting readiness',
      gradient: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
      iconBg: '#3B82F6',
      Icon: TrendingUp,
    },
    {
      label: 'Exceptions',
      value: stats.unresolved_exceptions ?? 0,
      sub: 'Unresolved',
      gradient: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
      iconBg: '#F59E0B',
      Icon: AlertTriangle,
    },
  ];

  const TABS = [
    { key: 'all', label: 'All', count: totalCount, color: '#6B7280' },
    { key: 'green', label: 'Green', count: laneCounts.green, color: '#059669' },
    { key: 'amber', label: 'Amber', count: laneCounts.amber, color: '#D97706' },
    { key: 'red', label: 'Red', count: laneCounts.red, color: '#DC2626' },
    { key: 'pending', label: 'Pending', count: laneCounts.pending, color: '#7C3AED' },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      {/* ── TOAST ─────────────────────────────────────────────── */}
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
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            animation: 'slideInToast 300ms ease-out',
          }}
        >
          <CheckCircle style={{ width: 16, height: 16, color: '#34D399' }} />
          {toast}
          <button
            onClick={() => setToast(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
      )}

      {/* ── PAGE HEADER ────────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '20px 32px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: '#10B981',
              boxShadow: '0 0 0 3px rgba(16,185,129,0.25)',
              animation: 'pulse 2s infinite',
            }}
          />
          <div>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#1A1A2E',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              AP Validation Workbench
            </h1>
            <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0', fontWeight: 400 }}>
              Procinix Technologies Pvt Ltd &middot; Last synced{' '}
              {stats.last_poll_time
                ? new Date(stats.last_poll_time).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '--:--'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handlePull}
            disabled={pulling}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 10,
              border: '1px solid var(--color-teal, #007D87)',
              backgroundColor: pulling ? 'var(--color-teal, #007D87)' : '#FFFFFF',
              color: pulling ? '#FFFFFF' : 'var(--color-teal, #007D87)',
              fontSize: 13,
              fontWeight: 600,
              cursor: pulling ? 'wait' : 'pointer',
              transition: 'all 150ms',
            }}
          >
            {pulling ? (
              <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />
            ) : (
              <RefreshCw style={{ width: 15, height: 15 }} />
            )}
            {pulling ? 'Pulling...' : 'Pull from email'}
          </button>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: 'var(--color-teal, #007D87)',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 600,
              cursor: uploading ? 'wait' : 'pointer',
              opacity: uploading ? 0.7 : 1,
            }}
          >
            {uploading ? (
              <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />
            ) : (
              <Upload style={{ width: 15, height: 15 }} />
            )}
            Process Invoice
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              style={{ display: 'none' }}
              disabled={uploading}
              onChange={(e) => {
                if (e.target.files?.[0]) handleUpload(e.target.files[0]);
              }}
            />
          </label>

          <button
            onClick={() => navigate('/invoices/agent-config')}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: '1px solid #E5E7EB',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Settings style={{ width: 16, height: 16, color: '#9CA3AF' }} />
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {/* ── STAT CARDS ────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            marginBottom: 24,
          }}
        >
          {STAT_CARDS.map((card, i) => (
            <div
              key={i}
              style={{
                background: card.gradient,
                borderRadius: 14,
                padding: '20px 22px',
                border: '1px solid rgba(0,0,0,0.04)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: '#6B7280',
                      margin: 0,
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {card.label}
                  </p>
                  <p
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: '#1A1A2E',
                      margin: '6px 0 0',
                      lineHeight: 1,
                    }}
                  >
                    {card.value}
                  </p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: '6px 0 0', fontWeight: 400 }}>
                    {card.sub}
                  </p>
                </div>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: card.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 4px 12px ${card.iconBg}44`,
                  }}
                >
                  <card.Icon style={{ width: 20, height: 20, color: '#FFFFFF' }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── LANE TABS ─────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginBottom: 16,
            backgroundColor: '#FFFFFF',
            borderRadius: 10,
            padding: 4,
            border: '1px solid #E5E7EB',
            width: 'fit-content',
          }}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  backgroundColor: active ? `${tab.color}14` : 'transparent',
                  color: active ? tab.color : '#9CA3AF',
                  transition: 'all 150ms',
                }}
              >
                {tab.label}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: 10,
                    backgroundColor: active ? tab.color : '#E5E7EB',
                    color: active ? '#FFFFFF' : '#9CA3AF',
                    minWidth: 20,
                    textAlign: 'center',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── SEARCH + SORT ─────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#FFFFFF',
              borderRadius: 10,
              padding: '6px 14px',
              border: '1px solid #E5E7EB',
              width: 340,
            }}
          >
            <Search style={{ width: 15, height: 15, color: '#9CA3AF' }} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice # or vendor..."
              style={{
                border: 'none',
                outline: 'none',
                flex: 1,
                fontSize: 13,
                color: '#1A1A2E',
                backgroundColor: 'transparent',
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <X style={{ width: 14, height: 14, color: '#9CA3AF' }} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                fontSize: 13,
                color: '#1A1A2E',
                backgroundColor: '#FFFFFF',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="date_desc">Date (newest)</option>
              <option value="date_asc">Date (oldest)</option>
              <option value="amount_desc">Amount (high)</option>
              <option value="amount_asc">Amount (low)</option>
              <option value="score_desc">Score (high)</option>
              <option value="score_asc">Score (low)</option>
            </select>
          </div>
        </div>

        {/* ── INVOICE TABLE ─────────────────────────────────────── */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #E5E7EB',
            overflow: 'hidden',
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '64px 0',
              }}
            >
              <FileText style={{ width: 40, height: 40, color: '#D1D5DB', marginBottom: 12 }} />
              <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>No invoices found</p>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                      <th style={{ ...thStyle, width: 40 }}>
                        <input
                          type="checkbox"
                          checked={selectedRows.size === filtered.length && filtered.length > 0}
                          onChange={toggleAll}
                          style={{ cursor: 'pointer', accentColor: 'var(--color-teal, #007D87)' }}
                        />
                      </th>
                      {[
                        'Invoice #',
                        'Vendor',
                        'Amount',
                        'Date',
                        'Lane',
                        'Readiness',
                        'Exception',
                        'Next Action',
                        'Status',
                        '',
                      ].map((h) => (
                        <th key={h} style={thStyle}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv) => {
                      const score = normalizeScore(inv.readiness_score);
                      const lane = getLane(inv);
                      const nextAction = getNextAction(inv);
                      const exTag = getExceptionTag(inv);
                      const isExpanded = expandedRow === inv.id;
                      const isSelected = selectedRows.has(inv.id);

                      const laneColors: Record<string, { bg: string; fg: string }> = {
                        green: { bg: '#DCFCE7', fg: '#15803D' },
                        amber: { bg: '#FEF3C7', fg: '#92400E' },
                        red: { bg: '#FEE2E2', fg: '#B91C1C' },
                      };
                      const lc = laneColors[lane] || laneColors.red;

                      const scoreBarColor =
                        score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';

                      const vendorDot = (inv.vendor_match_status || '').includes('not_found')
                        ? '#EF4444'
                        : (inv.vendor_match_status || '').includes('matched')
                          ? '#10B981'
                          : '#F59E0B';

                      return (
                        <tbody key={inv.id}>
                          <tr
                            style={{
                              borderBottom: isExpanded ? 'none' : '1px solid #F3F4F6',
                              backgroundColor: isSelected
                                ? '#F0FDFA'
                                : isExpanded
                                  ? '#FAFBFC'
                                  : '#FFFFFF',
                              cursor: 'pointer',
                              transition: 'background-color 100ms',
                            }}
                            onClick={() => setExpandedRow(isExpanded ? null : inv.id)}
                            onMouseEnter={(e) => {
                              if (!isSelected && !isExpanded)
                                (e.currentTarget as HTMLElement).style.backgroundColor = '#F9FAFB';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected && !isExpanded)
                                (e.currentTarget as HTMLElement).style.backgroundColor = '#FFFFFF';
                            }}
                          >
                            {/* Checkbox */}
                            <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleRow(inv.id)}
                                style={{
                                  cursor: 'pointer',
                                  accentColor: 'var(--color-teal, #007D87)',
                                }}
                              />
                            </td>

                            {/* Invoice # */}
                            <td style={tdStyle}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 10px',
                                  borderRadius: 6,
                                  backgroundColor: '#F0EDFF',
                                  color: '#5B21B6',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  letterSpacing: '0.01em',
                                }}
                              >
                                {inv.invoice_number || 'N/A'}
                              </span>
                            </td>

                            {/* Vendor */}
                            <td style={tdStyle}>
                              <div>
                                <span style={{ color: '#1A1A2E', fontWeight: 600, fontSize: 13 }}>
                                  {inv.vendor_name || 'Unknown'}
                                </span>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    marginTop: 2,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: '50%',
                                      backgroundColor: vendorDot,
                                    }}
                                  />
                                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                                    {(inv.vendor_match_status || 'pending').replace(/_/g, ' ')}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Amount */}
                            <td style={{ ...tdStyle, fontWeight: 700, color: '#1A1A2E' }}>
                              {formatCurrency(inv.total_amount, inv.currency || 'INR')}
                            </td>

                            {/* Date */}
                            <td style={{ ...tdStyle, color: '#6B7280' }}>
                              {formatDate(inv.invoice_date)}
                            </td>

                            {/* Lane */}
                            <td style={tdStyle}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '3px 10px',
                                  borderRadius: 20,
                                  backgroundColor: lc.bg,
                                  color: lc.fg,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  textTransform: 'capitalize',
                                }}
                              >
                                {lane === 'green' && (
                                  <CheckCircle style={{ width: 12, height: 12 }} />
                                )}
                                {lane === 'amber' && (
                                  <AlertCircle style={{ width: 12, height: 12 }} />
                                )}
                                {lane === 'red' && <XCircle style={{ width: 12, height: 12 }} />}
                                {lane}
                              </span>
                            </td>

                            {/* Readiness */}
                            <td style={tdStyle}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  minWidth: 100,
                                }}
                              >
                                <div
                                  style={{
                                    flex: 1,
                                    height: 6,
                                    borderRadius: 3,
                                    backgroundColor: '#F3F4F6',
                                    overflow: 'hidden',
                                  }}
                                >
                                  <div
                                    style={{
                                      height: '100%',
                                      borderRadius: 3,
                                      width: `${Math.min(100, score)}%`,
                                      backgroundColor: scoreBarColor,
                                      transition: 'width 600ms ease-out',
                                    }}
                                  />
                                </div>
                                <span
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: scoreBarColor,
                                    minWidth: 32,
                                    textAlign: 'right',
                                  }}
                                >
                                  {score}%
                                </span>
                              </div>
                            </td>

                            {/* Exception tag */}
                            <td style={tdStyle}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  backgroundColor: exTag.bg,
                                  color: exTag.color,
                                  border: `1px solid ${exTag.border}`,
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}
                              >
                                {exTag.label}
                              </span>
                            </td>

                            {/* Next action */}
                            <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleNextAction(inv)}
                                disabled={revalidating === inv.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '5px 12px',
                                  borderRadius: 8,
                                  backgroundColor: nextAction.bg,
                                  color: '#FFFFFF',
                                  border: 'none',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  opacity: revalidating === inv.id ? 0.6 : 1,
                                  transition: 'opacity 150ms',
                                }}
                              >
                                {revalidating === inv.id ? (
                                  <Loader2
                                    style={{
                                      width: 12,
                                      height: 12,
                                      animation: 'spin 1s linear infinite',
                                    }}
                                  />
                                ) : (
                                  nextAction.label
                                )}
                              </button>
                            </td>

                            {/* Status */}
                            <td style={tdStyle}>
                              <StatusChip status={inv.status} />
                            </td>

                            {/* More menu */}
                            <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <button
                                  onClick={() => openReview(inv.id)}
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 6,
                                    border: '1px solid #E5E7EB',
                                    backgroundColor: '#FFFFFF',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  title="View detail"
                                >
                                  <Eye style={{ width: 13, height: 13, color: '#6B7280' }} />
                                </button>
                                <button
                                  onClick={() => handleRevalidate(inv.id)}
                                  disabled={revalidating === inv.id}
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 6,
                                    border: '1px solid #E5E7EB',
                                    backgroundColor: '#FFFFFF',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  title="Revalidate"
                                >
                                  {revalidating === inv.id ? (
                                    <Loader2
                                      style={{
                                        width: 13,
                                        height: 13,
                                        color: '#6B7280',
                                        animation: 'spin 1s linear infinite',
                                      }}
                                    />
                                  ) : (
                                    <RefreshCw
                                      style={{ width: 13, height: 13, color: '#6B7280' }}
                                    />
                                  )}
                                </button>
                                <button
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 6,
                                    border: '1px solid #E5E7EB',
                                    backgroundColor: '#FFFFFF',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  title="More options"
                                >
                                  <MoreHorizontal
                                    style={{ width: 13, height: 13, color: '#6B7280' }}
                                  />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded row detail */}
                          {isExpanded && (
                            <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                              <td colSpan={11} style={{ padding: 0 }}>
                                <ExpandedRowDetail
                                  invoice={inv}
                                  onCreateVendor={() =>
                                    setVendorSlideOver({
                                      open: true,
                                      invoiceId: inv.id,
                                      prefill: {
                                        vendorName: inv.vendor_name || '',
                                        email: inv.vendor_email || '',
                                        gstin: inv.vendor_gstin || '',
                                        country: 'India',
                                      },
                                    })
                                  }
                                  onRevalidate={() => handleRevalidate(inv.id)}
                                  onSubmitForApproval={() => handleSubmitForApproval(inv)}
                                  revalidating={revalidating === inv.id}
                                />
                              </td>
                            </tr>
                          )}
                        </tbody>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table footer */}
              <div
                style={{
                  padding: '12px 20px',
                  borderTop: '1px solid #E5E7EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#F9FAFB',
                }}
              >
                <span style={{ fontSize: 13, color: '#6B7280' }}>
                  {filtered.length} invoice{filtered.length !== 1 ? 's' : ''}
                  {selectedRows.size > 0 && (
                    <span
                      style={{
                        color: 'var(--color-teal, #007D87)',
                        fontWeight: 600,
                        marginLeft: 8,
                      }}
                    >
                      ({selectedRows.size} selected)
                    </span>
                  )}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {selectedRows.size > 0 && (
                    <button
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 16px',
                        borderRadius: 8,
                        backgroundColor: 'var(--color-teal, #007D87)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Bulk resolve {'\u2192'}
                    </button>
                  )}
                  <button
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 16px',
                      borderRadius: 8,
                      backgroundColor: '#FFFFFF',
                      color: '#6B7280',
                      border: '1px solid #E5E7EB',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    <Download style={{ width: 14, height: 14 }} />
                    Export
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── VENDOR SLIDE-OVER ──────────────────────────────────── */}
      {vendorSlideOver?.open && (
        <CreateVendorSlideOver
          isOpen
          onClose={() => setVendorSlideOver(null)}
          onVendorCreated={() => {
            fetchInvoices();
            fetchStats();
            setToast('Vendor created. Invoice revalidated.');
          }}
          invoiceId={vendorSlideOver.invoiceId}
          prefill={vendorSlideOver.prefill}
        />
      )}

      {reviewOpen && reviewInvoice && (
        <InvoiceReviewModal
          invoice={reviewInvoice}
          decisions={reviewDecisions}
          explanations={reviewExplanations}
          correctionReason={correctionReason}
          onCorrectionReasonChange={setCorrectionReason}
          learnFromCorrection={learnFromCorrection}
          onLearnFromCorrectionChange={setLearnFromCorrection}
          onClose={() => setReviewOpen(false)}
          onFieldChange={updateReviewField}
          onLineChange={updateReviewLine}
          onAddLine={addReviewLine}
          onRemoveLine={removeReviewLine}
          onSave={saveReview}
          saving={savingReview}
        />
      )}

      {/* ── GLOBAL STYLES ─────────────────────────────────────── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.15); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideInToast {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */

const thStyle: React.CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  color: '#9CA3AF',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  verticalAlign: 'middle',
};

function StatusChip({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  let bg = '#F3F4F6';
  let color = '#6B7280';
  if (s === 'processed' || s === 'approved') {
    bg = '#DCFCE7';
    color = '#15803D';
  } else if (s === 'pending_approval') {
    bg = '#EDE9FE';
    color = '#7C3AED';
  } else if (s === 'failed' || s === 'rejected') {
    bg = '#FEE2E2';
    color = '#DC2626';
  } else if (s === 'draft') {
    bg = '#F3F4F6';
    color = '#6B7280';
  }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 6,
        backgroundColor: bg,
        color,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'capitalize',
      }}
    >
      {(status || 'draft').replace(/_/g, ' ')}
    </span>
  );
}

function ExpandedRowDetail({
  invoice,
  onCreateVendor,
  onRevalidate,
  onSubmitForApproval,
  revalidating,
}: {
  invoice: any;
  onCreateVendor: () => void;
  onRevalidate: () => void;
  onSubmitForApproval: () => void;
  revalidating: boolean;
}) {
  const score = normalizeScore(invoice.readiness_score ?? invoice.touchless_score);
  const exceptions = invoice.exceptions || [];
  const unresolvedExceptions = exceptions.filter((e: any) => !e.resolved);
  const failReasons: string[] =
    Array.isArray(invoice.touchless_fail_reasons)
      ? invoice.touchless_fail_reasons
      : typeof invoice.touchless_fail_reasons === 'string'
        ? JSON.parse(invoice.touchless_fail_reasons || '[]')
        : [];

  return (
    <div
      style={{
        padding: '16px 20px',
        backgroundColor: '#FAFBFC',
        borderTop: '1px solid #F3F4F6',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        {/* Left: key fields */}
        <div>
          <h4
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#374151',
              margin: '0 0 10px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Key Fields
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <DetailField label="GSTIN" value={invoice.vendor_gstin || '-'} />
            <DetailField label="PO Number" value={invoice.po_number || 'None'} />
            <DetailField label="PO Matched" value={invoice.matched_po_id ? 'Yes' : 'No'} />
            <DetailField label="Currency" value={invoice.currency || 'INR'} />
            <DetailField label="Source" value={(invoice.source || 'manual').replace(/_/g, ' ')} />
          </div>
        </div>

        {/* Center: exceptions */}
        <div>
          <h4
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#374151',
              margin: '0 0 10px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Routing Flags ({unresolvedExceptions.length + failReasons.length})
          </h4>
          {unresolvedExceptions.length === 0 && failReasons.length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                backgroundColor: '#F0FDF4',
                borderRadius: 8,
              }}
            >
              <CheckCircle style={{ width: 14, height: 14, color: '#10B981' }} />
              <span style={{ fontSize: 13, color: '#15803D', fontWeight: 500 }}>
                No exceptions - ready for approval
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {failReasons.map((reason: string, idx: number) => (
                <div
                  key={`fr-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    backgroundColor: '#FFF7ED',
                    borderRadius: 8,
                    border: '1px solid #FED7AA',
                  }}
                >
                  <AlertCircle
                    style={{ width: 13, height: 13, color: '#C2410C', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 12, color: '#9A3412' }}>{reason}</span>
                </div>
              ))}
              {unresolvedExceptions.slice(0, 4 - failReasons.length).map((ex: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    backgroundColor: '#FEF2F2',
                    borderRadius: 8,
                    border: '1px solid #FECACA',
                  }}
                >
                  <AlertTriangle
                    style={{ width: 13, height: 13, color: '#DC2626', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 12, color: '#991B1B' }}>
                    {ex.description || ex.type || 'Unknown exception'}
                  </span>
                </div>
              ))}
              {unresolvedExceptions.length > 4 && (
                <span style={{ fontSize: 11, color: '#9CA3AF', paddingLeft: 12 }}>
                  +{unresolvedExceptions.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: quick actions */}
        <div>
          <h4
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#374151',
              margin: '0 0 10px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Quick Actions
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(invoice.lifecycle_state === 'Ingested' ||
              invoice.lifecycle_state === 'Exception Hold' ||
              !invoice.lifecycle_state) && (
              <button
                onClick={onSubmitForApproval}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: 'var(--color-teal, #007D87)',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <CheckCircle style={{ width: 14, height: 14 }} />
                Submit for Approval
              </button>
            )}
            <button
              onClick={onRevalidate}
              disabled={revalidating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                backgroundColor: '#FFFFFF',
                fontSize: 13,
                fontWeight: 500,
                color: '#374151',
                cursor: 'pointer',
                opacity: revalidating ? 0.6 : 1,
              }}
            >
              {revalidating ? (
                <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
              ) : (
                <RefreshCw style={{ width: 14, height: 14 }} />
              )}
              Revalidate
            </button>
            <button
              onClick={onCreateVendor}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                backgroundColor: '#FFFFFF',
                fontSize: 13,
                fontWeight: 500,
                color: '#374151',
                cursor: 'pointer',
              }}
            >
              <Plus style={{ width: 14, height: 14 }} />
              Create Vendor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 0',
      }}
    >
      <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 12, color: '#1A1A2E', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function InvoiceReviewModal({
  invoice,
  decisions,
  explanations,
  correctionReason,
  onCorrectionReasonChange,
  learnFromCorrection,
  onLearnFromCorrectionChange,
  onClose,
  onFieldChange,
  onLineChange,
  onAddLine,
  onRemoveLine,
  onSave,
  saving,
}: {
  invoice: any;
  decisions: any[];
  explanations: any[];
  correctionReason: string;
  onCorrectionReasonChange: (value: string) => void;
  learnFromCorrection: boolean;
  onLearnFromCorrectionChange: (value: boolean) => void;
  onClose: () => void;
  onFieldChange: (field: string, value: any) => void;
  onLineChange: (idx: number, field: string, value: any) => void;
  onAddLine: () => void;
  onRemoveLine: (idx: number) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const rows = Array.isArray(invoice.line_items) ? invoice.line_items : [];
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const loadPdf = async () => {
      if (!invoice?.id) return;
      setPdfLoading(true);
      setPdfError(null);
      setPdfUrl(null);
      try {
        const res = await fetch(`${API}/api/invoices/${invoice.id}/pdf`, {
          headers: authHeaders(),
        });
        if (!res.ok) {
          throw new Error('Source PDF not available for this invoice.');
        }
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      } catch (err: any) {
        if (!cancelled) {
          setPdfError(err?.message || 'Unable to load source PDF.');
        }
      } finally {
        if (!cancelled) {
          setPdfLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [invoice?.id]);

  const toDateInputValue = (value: any) => {
    if (!value || typeof value !== 'string') return '';
    return value.includes('T') ? value.slice(0, 10) : value;
  };

  const normalizeDecisionScore = (value: any) => {
    const n = Number(value ?? 0);
    if (Number.isNaN(n)) return 0;
    return n <= 1 ? Math.round(n * 100) : Math.round(n);
  };

  const decisionCards = (decisions || []).slice(-8).map((d: any) => ({
    label: d.agent_name || d.stage || d.decision_type || 'Agent',
    score: normalizeDecisionScore(d.confidence_score ?? d.score ?? d.readiness_score),
    status: d.decision || d.result || d.lane || '-',
  }));

  const extractedConfidence = Number(
    invoice?.metadata?.extractedData?.confidence_score ??
      invoice?.metadata?.extraction?.overallConfidence ??
      0
  );
  const extractionScore = normalizeDecisionScore(extractedConfidence);
  const lowConfidenceFields = [
    {
      key: 'invoice_number',
      label: 'Invoice Number',
      score: extractionScore,
      reason: 'OCR confidence on header fields is below preferred threshold.',
    },
    {
      key: 'invoice_date',
      label: 'Invoice Date',
      score: extractionScore,
      reason: 'Date parsing can drift when layout is noisy or handwritten.',
    },
    {
      key: 'vendor_name',
      label: 'Vendor Name',
      score: normalizeDecisionScore(invoice?.vendor_match_confidence ?? extractedConfidence),
      reason: 'Vendor identity confidence indicates possible mismatch.',
    },
    {
      key: 'total_amount',
      label: 'Total Amount',
      score: normalizeDecisionScore(invoice?.readiness_score ?? extractedConfidence),
      reason: 'Totals should be cross-checked against the PDF footer.',
    },
    {
      key: 'po_number',
      label: 'PO Number',
      score: normalizeDecisionScore(invoice?.match_confidence ?? extractedConfidence),
      reason: 'PO linking confidence is low or unresolved.',
    },
  ]
    .filter((f) => f.score > 0 && f.score < 80)
    .sort((a, b) => a.score - b.score);

  const lowConfidenceKeySet = new Set(lowConfidenceFields.map((f) => f.key));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        zIndex: 110,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: 'min(1200px, 96vw)',
          maxHeight: '92vh',
          overflow: 'auto',
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid #E5E7EB',
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 1,
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1A1A2E' }}>
              Review & Correct OCR Fields
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6B7280' }}>
              {invoice.invoice_number || invoice.id}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                background: '#fff',
                color: '#374151',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--color-teal, #007D87)',
                color: '#fff',
                cursor: 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Save corrections'}
            </button>
          </div>
        </div>

        <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
          <div
            style={{
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              minHeight: 560,
              backgroundColor: '#F9FAFB',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '10px 12px',
                borderBottom: '1px solid #E5E7EB',
                fontSize: 12,
                color: '#6B7280',
                fontWeight: 600,
              }}
            >
              Source document preview (original layout)
            </div>
            {pdfLoading ? (
              <div style={{ padding: 20, fontSize: 13, color: '#6B7280' }}>
                Loading PDF preview...
              </div>
            ) : pdfError ? (
              <div style={{ padding: 20 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#991B1B' }}>{pdfError}</p>
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6B7280' }}>
                  This usually means attachment path is missing/unavailable for older records.
                </p>
              </div>
            ) : pdfUrl ? (
              <iframe
                title="Invoice PDF Preview"
                src={pdfUrl}
                style={{ width: '100%', height: 700, border: 'none' }}
              />
            ) : null}
          </div>

          <div>
            <div
              style={{
                border: '1px solid #E5E7EB',
                borderRadius: 10,
                padding: 10,
                marginBottom: 10,
                backgroundColor: '#F8FAFC',
              }}
            >
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#1A1A2E' }}>
                Agent Confidence Snapshot
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                    padding: 8,
                    backgroundColor: '#fff',
                  }}
                >
                  <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>Lane</p>
                  <p
                    style={{
                      margin: '2px 0 0',
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#111827',
                      textTransform: 'capitalize',
                    }}
                  >
                    {invoice.lane || 'red'}
                  </p>
                </div>
                <div
                  style={{
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                    padding: 8,
                    backgroundColor: '#fff',
                  }}
                >
                  <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>Readiness</p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: '#111827' }}>
                    {normalizeDecisionScore(
                      invoice.readiness_score ?? invoice.posting_readiness_score
                    )}
                    %
                  </p>
                </div>
              </div>
              {decisionCards.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {decisionCards.map((d, idx) => (
                    <div
                      key={`${d.label}-${idx}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#fff',
                        border: '1px solid #E5E7EB',
                        borderRadius: 8,
                        padding: '6px 8px',
                      }}
                    >
                      <span style={{ fontSize: 12, color: '#374151' }}>{d.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0F766E' }}>
                        {d.score}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {decisionCards.length === 0 && (
                <p style={{ margin: '8px 0 0', fontSize: 11, color: '#9CA3AF' }}>
                  No agent decision logs found for this invoice yet.
                </p>
              )}
            </div>

            <div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}
            >
              {[
                ['invoice_number', 'Invoice Number', 'text'],
                ['invoice_date', 'Invoice Date', 'date'],
                ['due_date', 'Due Date', 'date'],
                ['vendor_name', 'Vendor Name', 'text'],
                ['vendor_gstin', 'Vendor GSTIN', 'text'],
                ['vendor_email', 'Vendor Email', 'text'],
                ['bill_to_entity', 'Bill To Entity', 'text'],
                ['currency', 'Currency', 'text'],
                ['po_number', 'PO Number', 'text'],
                ['subtotal', 'Subtotal', 'number'],
                ['tax_amount', 'Tax Amount', 'number'],
                ['total_amount', 'Total Amount', 'number'],
              ].map(([field, label, type]) => (
                <label
                  key={field}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    fontSize: 12,
                    color: '#6B7280',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {label}
                    {lowConfidenceKeySet.has(field) && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#B45309',
                          backgroundColor: '#FEF3C7',
                          border: '1px solid #FDE68A',
                          borderRadius: 9999,
                          padding: '1px 6px',
                        }}
                      >
                        review first
                      </span>
                    )}
                  </span>
                  <input
                    type={type as string}
                    value={
                      type === 'date' ? toDateInputValue(invoice[field]) : (invoice[field] ?? '')
                    }
                    onChange={(e) => onFieldChange(field, e.target.value)}
                    style={{
                      height: 38,
                      border: lowConfidenceKeySet.has(field)
                        ? '1.5px solid #F59E0B'
                        : '1px solid #E5E7EB',
                      borderRadius: 8,
                      padding: '8px 10px',
                      color: '#111827',
                      backgroundColor: lowConfidenceKeySet.has(field) ? '#FFFBEB' : '#FFFFFF',
                    }}
                  />
                </label>
              ))}
            </div>

            {lowConfidenceFields.length > 0 && (
              <div
                style={{
                  marginTop: 10,
                  border: '1px solid #FDE68A',
                  borderRadius: 10,
                  padding: 10,
                  backgroundColor: '#FFFBEB',
                }}
              >
                <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#92400E' }}>
                  Low-confidence fields first
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {lowConfidenceFields.map((f) => (
                    <div
                      key={f.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid #FDE68A',
                        borderRadius: 8,
                        padding: '6px 8px',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      <div>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#111827' }}>
                          {f.label}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6B7280' }}>
                          {f.reason}
                        </p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#B45309' }}>
                        {f.score}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>
                  Line Items
                </p>
                <button
                  onClick={onAddLine}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: '1px solid #E5E7EB',
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  + Add line
                </button>
              </div>
              <div
                style={{
                  border: '1px solid #E5E7EB',
                  borderRadius: 10,
                  overflow: 'auto',
                  maxHeight: 360,
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F9FAFB' }}>
                      {['Description', 'Qty', 'Unit', 'Amount', 'HSN/SAC', 'GST %', ''].map((h) => (
                        <th
                          key={h}
                          style={{ textAlign: 'left', fontSize: 11, color: '#6B7280', padding: 8 }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((line: any, idx: number) => (
                      <tr key={line.id || idx} style={{ borderTop: '1px solid #F3F4F6' }}>
                        <td style={{ padding: 8 }}>
                          <input
                            value={line.description || ''}
                            onChange={(e) => onLineChange(idx, 'description', e.target.value)}
                            style={{
                              width: '100%',
                              border: '1px solid #E5E7EB',
                              borderRadius: 6,
                              padding: '6px 8px',
                            }}
                          />
                        </td>
                        <td style={{ padding: 8 }}>
                          <input
                            value={line.quantity ?? ''}
                            onChange={(e) => onLineChange(idx, 'quantity', e.target.value)}
                            style={{
                              width: 90,
                              border: '1px solid #E5E7EB',
                              borderRadius: 6,
                              padding: '6px 8px',
                            }}
                          />
                        </td>
                        <td style={{ padding: 8 }}>
                          <input
                            value={line.unit_price ?? ''}
                            onChange={(e) => onLineChange(idx, 'unit_price', e.target.value)}
                            style={{
                              width: 110,
                              border: '1px solid #E5E7EB',
                              borderRadius: 6,
                              padding: '6px 8px',
                            }}
                          />
                        </td>
                        <td style={{ padding: 8 }}>
                          <input
                            value={line.amount ?? ''}
                            onChange={(e) => onLineChange(idx, 'amount', e.target.value)}
                            style={{
                              width: 110,
                              border: '1px solid #E5E7EB',
                              borderRadius: 6,
                              padding: '6px 8px',
                            }}
                          />
                        </td>
                        <td style={{ padding: 8 }}>
                          <input
                            value={line.hsn_sac || ''}
                            onChange={(e) => onLineChange(idx, 'hsn_sac', e.target.value)}
                            style={{
                              width: 120,
                              border: '1px solid #E5E7EB',
                              borderRadius: 6,
                              padding: '6px 8px',
                            }}
                          />
                        </td>
                        <td style={{ padding: 8 }}>
                          <input
                            value={line.gst_rate ?? ''}
                            onChange={(e) => onLineChange(idx, 'gst_rate', e.target.value)}
                            style={{
                              width: 90,
                              border: '1px solid #E5E7EB',
                              borderRadius: 6,
                              padding: '6px 8px',
                            }}
                          />
                        </td>
                        <td style={{ padding: 8 }}>
                          <button
                            onClick={() => onRemoveLine(idx)}
                            style={{
                              border: '1px solid #FCA5A5',
                              color: '#B91C1C',
                              background: '#fff',
                              borderRadius: 6,
                              padding: '6px 8px',
                              cursor: 'pointer',
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              style={{ marginTop: 12, border: '1px solid #E5E7EB', borderRadius: 10, padding: 10 }}
            >
              <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#1A1A2E' }}>
                Correction reasoning (required for learning)
              </p>
              <textarea
                value={correctionReason}
                onChange={(e) => onCorrectionReasonChange(e.target.value)}
                placeholder="Why are you correcting these fields? Mention source cues (invoice header, GST block, totals, line table)."
                style={{
                  width: '100%',
                  minHeight: 72,
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  padding: 8,
                  fontSize: 12,
                  color: '#111827',
                  resize: 'vertical',
                }}
              />
              <label
                style={{
                  marginTop: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  color: '#374151',
                }}
              >
                <input
                  type="checkbox"
                  checked={learnFromCorrection}
                  onChange={(e) => onLearnFromCorrectionChange(e.target.checked)}
                />
                Use this correction as feedback for agent tuning
              </label>
              {Array.isArray(explanations) && explanations.length > 0 && (
                <p style={{ margin: '8px 0 0', fontSize: 11, color: '#6B7280' }}>
                  Latest agent rationale:{' '}
                  {String(explanations[explanations.length - 1]?.explanation || '').slice(0, 180)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
