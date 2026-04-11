import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Settings, Upload, CheckCircle, AlertTriangle, AlertCircle,
  Clock, FileText, Eye, X, Loader2, Shield, Sparkles, ChevronRight,
  ChevronDown, Building2, DollarSign, Package, Calculator, TrendingUp,
  Zap, Search, RefreshCw, ThumbsUp, ThumbsDown, Pause, MessageSquare,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────────── */
const API = 'http://127.0.0.1:8787';

type Lane = 'all' | 'green' | 'amber' | 'red';
type ViewMode = 'list' | 'detail';

interface DashboardStats {
  total_processed: number;
  stp_rate: number;
  avg_readiness_score: number;
  unresolved_exceptions: number;
}

interface InvoiceSummary {
  id: string;
  invoice_number: string;
  vendor_name: string;
  total_amount: number;
  currency: string;
  invoice_date: string;
  lane: 'green' | 'amber' | 'red';
  readiness_score: number;
  status: string;
}

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  vendor_name: string;
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
  status: string;
  source: string;
  metadata: Record<string, unknown>;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
    hsn_sac: string | null;
    gst_rate: number | null;
  }>;
}

interface AgentDecision {
  id: string;
  agent_name: string;
  decision: 'pass' | 'fail' | 'flagged';
  confidence: number;
  explanation: string;
  processing_time_ms: number;
}

interface AgentConfigRow {
  id: string;
  agent_name: string;
  config_key: string;
  config_value: string;
  config_type: 'number' | 'text' | 'boolean';
  label: string;
  description: string;
}

/* ─── API helpers ───────────────────────────────────────────────── */
function authHeaders(): Record<string, string> {
  const key = localStorage.getItem('apiSecretKey');
  return key ? { Authorization: `Bearer ${key}` } : {};
}

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...opts.headers },
  });
  return res.json();
}

/* ─── Lane badge helpers ────────────────────────────────────────── */
const LANE_META_FALLBACK = { label: 'Pending', bg: 'var(--color-cloud)', fg: 'var(--color-mercury-grey)', icon: Clock };

const LANE_META: Record<string, { label: string; bg: string; fg: string; icon: typeof CheckCircle }> = {
  green: { label: 'Green', bg: 'var(--color-success-light)', fg: 'var(--color-success-dark)', icon: CheckCircle },
  amber: { label: 'Amber', bg: 'var(--color-warning-light)', fg: 'var(--color-warning-dark)', icon: AlertTriangle },
  red: { label: 'Red', bg: 'var(--color-error-light)', fg: 'var(--color-error-dark)', icon: AlertCircle },
};

const AGENT_ICONS: Record<string, typeof Shield> = {
  'Intake Agent': FileText,
  'Extraction Agent': Sparkles,
  'Vendor Identity Agent': Building2,
  'Duplicate Detection Agent': Search,
  'PO Match Agent': Package,
  'Tax Compliance Agent': Calculator,
  'Budget Gate Agent': DollarSign,
  'Final Scoring Agent': TrendingUp,
};

/* ═══════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export function APValidationWorkbench() {
  const navigate = useNavigate();

  /* ── state ──────────────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState<Lane>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [agentDecisions, setAgentDecisions] = useState<AgentDecision[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ total_processed: 0, stp_rate: 0, avg_readiness_score: 0, unresolved_exceptions: 0 });
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);
  const [agentConfig, setAgentConfig] = useState<AgentConfigRow[]>([]);
  const [expandedAgents, setExpandedAgents] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  /* ── data fetching ──────────────────────────────────────────── */
  const fetchStats = useCallback(async () => {
    try {
      const res = await apiFetch<any>('/api/ap/dashboard/stats');
      const d = res?.data || res || {};
      setStats({
        total_processed: d.total || 0,
        stp_rate: Number(d.stpRate) || 0,
        avg_readiness_score: Number(d.avgReadiness) || 0,
        unresolved_exceptions: d.exceptions || 0,
      });
    } catch { /* silently fallback to defaults */ }
  }, []);

  const fetchInvoices = useCallback(async (lane: Lane) => {
    setLoading(true);
    try {
      const query = lane === 'all' ? '' : `?lane=${lane}`;
      const res = await apiFetch<any>(`/api/ap/invoices${query}`);
      const data = res?.data || res || [];
      setInvoices(Array.isArray(data) ? data : []);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInvoiceDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const [detailRes, decisionsRes] = await Promise.all([
        apiFetch<any>(`/api/invoices/${id}`),
        apiFetch<any>(`/api/ap/invoices/${id}/decisions`),
      ]);
      setSelectedInvoice(detailRes?.data || detailRes || null);
      const decs = decisionsRes?.data?.decisions || decisionsRes?.data || decisionsRes || [];
      setAgentDecisions(Array.isArray(decs) ? decs : []);
      setViewMode('detail');
    } catch {
      setSelectedInvoice(null);
      setAgentDecisions([]);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const fetchAgentConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const res = await apiFetch<any>('/api/ap/agent-config');
      const data = res?.data || res || [];
      setAgentConfig(Array.isArray(data) ? data : []);
    } catch {
      setAgentConfig([]);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => { fetchStats(); fetchInvoices(activeTab); }, [activeTab, fetchStats, fetchInvoices]);

  /* ── lane counts ────────────────────────────────────────────── */
  const laneCounts = {
    all: invoices.length,
    green: invoices.filter(i => i.lane === 'green').length,
    amber: invoices.filter(i => i.lane === 'amber').length,
    red: invoices.filter(i => i.lane === 'red').length,
  };

  /* ── actions ────────────────────────────────────────────────── */
  const handleApprove = async () => {
    if (!selectedInvoice) return;
    setActionInProgress('approve');
    try {
      await apiFetch(`/api/ap/invoices/${selectedInvoice.id}/approve`, { method: 'POST' });
      setViewMode('list');
      setSelectedInvoice(null);
      fetchInvoices(activeTab);
      fetchStats();
    } finally { setActionInProgress(null); }
  };

  const handleReject = async () => {
    if (!selectedInvoice) return;
    setActionInProgress('reject');
    try {
      await apiFetch(`/api/ap/invoices/${selectedInvoice.id}/reject`, { method: 'POST' });
      setViewMode('list');
      setSelectedInvoice(null);
      fetchInvoices(activeTab);
      fetchStats();
    } finally { setActionInProgress(null); }
  };

  const handleCorrect = async () => {
    if (!selectedInvoice) return;
    setActionInProgress('correct');
    try {
      await apiFetch(`/api/ap/invoices/${selectedInvoice.id}/correct`, {
        method: 'POST',
        body: JSON.stringify({ corrections: {}, comments: 'Approved with corrections' }),
      });
      setViewMode('list');
      setSelectedInvoice(null);
      fetchInvoices(activeTab);
      fetchStats();
    } finally { setActionInProgress(null); }
  };

  const handleProcessInvoice = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await fetch(`${API}/api/ap/process-invoice`, {
        method: 'POST',
        headers: authHeaders(),
        body: form,
      });
      fetchInvoices(activeTab);
      fetchStats();
    } finally { setUploading(false); }
  };

  const handleSaveConfig = async (agentName: string) => {
    setSavingConfig(agentName);
    try {
      const rows = agentConfig.filter(c => c.agent_name === agentName);
      await Promise.all(rows.map(r =>
        apiFetch('/api/ap/agent-config', {
          method: 'PUT',
          body: JSON.stringify({ id: r.id, config_value: r.config_value }),
        })
      ));
    } finally { setSavingConfig(null); }
  };

  const updateConfigValue = (id: string, value: string) => {
    setAgentConfig(prev => prev.map(c => c.id === id ? { ...c, config_value: value } : c));
  };

  /* ── filtered invoices ──────────────────────────────────────── */
  const filtered = invoices.filter(inv => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return inv.invoice_number.toLowerCase().includes(q)
        || inv.vendor_name.toLowerCase().includes(q);
    }
    return true;
  });

  /* ── grouped agent config ───────────────────────────────────── */
  const configByAgent: Record<string, AgentConfigRow[]> = {};
  agentConfig.forEach(c => {
    if (!configByAgent[c.agent_name]) configByAgent[c.agent_name] = [];
    configByAgent[c.agent_name].push(c);
  });

  /* ═════════════════════════════════════════════════════════════
     RENDER
     ═════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-cloud)' }}>

      {/* ── TOP BAR ──────────────────────────────────────────── */}
      <div className="bg-white px-6 py-4" style={{ borderBottom: '2px solid var(--color-silver)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Left: back + title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg transition-all"
              style={{ border: '1px solid var(--color-silver)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-cloud)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <ArrowLeft className="w-4 h-4" style={{ color: 'var(--color-ink)' }} />
            </button>
            <div>
              <h1 className="text-xl" style={{ color: 'var(--color-ink)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
                AP Validation Workbench
              </h1>
              <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                Governed multi-agent invoice processing
              </p>
            </div>
          </div>

          {/* Center: lane tabs */}
          <div className="flex items-center gap-1 bg-white rounded-lg p-1" style={{ border: '1px solid var(--color-silver)' }}>
            {(['all', 'green', 'amber', 'red'] as Lane[]).map(lane => {
              const isActive = activeTab === lane;
              const meta = lane === 'all' ? null : LANE_META[lane];
              return (
                <button
                  key={lane}
                  onClick={() => { setActiveTab(lane); setViewMode('list'); setSelectedInvoice(null); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all"
                  style={{
                    fontWeight: isActive ? 600 : 400,
                    backgroundColor: isActive ? (meta?.bg || 'var(--color-teal-tint)') : 'transparent',
                    color: isActive ? (meta?.fg || 'var(--color-teal-dark)') : 'var(--color-mercury-grey)',
                  }}
                >
                  {meta && <meta.icon className="w-3.5 h-3.5" />}
                  {lane === 'all' ? 'All' : meta!.label}
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{
                      fontWeight: 600,
                      backgroundColor: isActive ? (meta?.fg || 'var(--color-teal)') : 'var(--color-silver)',
                      color: isActive ? '#FFFFFF' : 'var(--color-mercury-grey)',
                      fontSize: 10,
                      minWidth: 20,
                      textAlign: 'center',
                    }}
                  >
                    {laneCounts[lane]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: process + gear */}
          <div className="flex items-center gap-2">
            <label
              className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg text-sm cursor-pointer"
              style={{ fontWeight: 600, opacity: uploading ? 0.6 : 1, backgroundColor: 'var(--color-teal)', color: '#FFFFFF' }}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Process Invoice
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                disabled={uploading}
                onChange={e => { if (e.target.files?.[0]) handleProcessInvoice(e.target.files[0]); }}
              />
            </label>
            <button
              onClick={() => navigate('/invoices/agent-config')}
              className="p-2 rounded-lg transition-all"
              style={{ border: '1px solid var(--color-silver)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-cloud)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Settings className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
            </button>
          </div>
        </div>
      </div>

      {/* ── STATS ROW ────────────────────────────────────────── */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Processed', value: stats.total_processed, icon: FileText, color: 'var(--color-teal)', bg: 'var(--color-teal-tint)' },
            { label: 'STP Rate', value: `${stats.stp_rate}%`, icon: Zap, color: 'var(--color-success-dark)', bg: 'var(--color-success-light)' },
            { label: 'Avg Readiness Score', value: Number(stats.avg_readiness_score || 0).toFixed(1), icon: TrendingUp, color: 'var(--color-teal-dark)', bg: 'var(--color-teal-tint)' },
            { label: 'Unresolved Exceptions', value: stats.unresolved_exceptions, icon: AlertCircle, color: 'var(--color-error-dark)', bg: 'var(--color-error-light)' },
          ].map((m, i) => (
            <div key={i} className="bg-white rounded-xl p-4 flex items-center gap-4" style={{ border: '1px solid var(--color-silver)' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: m.bg }}>
                <m.icon className="w-5 h-5" style={{ color: m.color }} />
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: 500 }}>{m.label}</div>
                <div className="text-xl" style={{ color: 'var(--color-ink)', fontWeight: 700 }}>{m.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <div className="px-6 pb-6">
        {viewMode === 'list' ? renderInvoiceList() : renderInvoiceDetail()}
      </div>

      {/* ── AGENT CONFIG DRAWER ──────────────────────────────── */}
      {configDrawerOpen && renderConfigDrawer()}
    </div>
  );

  /* ═════════════════════════════════════════════════════════════
     INVOICE LIST
     ═════════════════════════════════════════════════════════════ */
  function renderInvoiceList() {
    return (
      <div className="bg-white rounded-xl" style={{ border: '1px solid var(--color-silver)' }}>
        {/* search bar */}
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-silver)' }}>
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <Search className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
            <input
              className="px-input text-sm flex-1"
              placeholder="Search by invoice # or vendor..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', backgroundColor: 'transparent', outline: 'none', color: 'var(--color-ink)' }}
            />
          </div>
          <button
            onClick={() => { fetchInvoices(activeTab); fetchStats(); }}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all"
            style={{ color: 'var(--color-teal)', fontWeight: 500 }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-teal-tint)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-teal)' }} />
            <span className="ml-2 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Loading invoices...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FileText className="w-10 h-10 mb-3" style={{ color: 'var(--color-silver)' }} />
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>No invoices found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-silver)', backgroundColor: 'var(--color-cloud)' }}>
                {['Invoice #', 'Vendor', 'Amount', 'Date', 'Lane', 'Readiness Score', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const lm = LANE_META[inv.lane] || LANE_META_FALLBACK;
                return (
                  <tr
                    key={inv.id}
                    className="transition-all"
                    style={{ borderBottom: '1px solid var(--color-silver)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-cloud)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td className="px-5 py-3" style={{ color: 'var(--color-ink)', fontWeight: 600 }}>
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--color-teal)' }} />
                        {inv.invoice_number}
                      </div>
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--color-ink)' }}>{inv.vendor_name}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--color-ink)', fontWeight: 600 }}>
                      {inv.currency === 'INR' ? '₹' : inv.currency} {Number(inv.total_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--color-mercury-grey)' }}>
                      {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                        style={{ backgroundColor: lm.bg, color: lm.fg, fontWeight: 600 }}
                      >
                        <lm.icon className="w-3 h-3" />
                        {lm.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: 'var(--color-silver)' }}>
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, inv.readiness_score)}%`,
                              backgroundColor: inv.readiness_score >= 80 ? 'var(--color-success)' : inv.readiness_score >= 50 ? 'var(--color-warning)' : 'var(--color-error)',
                            }}
                          />
                        </div>
                        <span className="text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: 600, minWidth: 32 }}>
                          {inv.readiness_score}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`badge-${inv.status === 'processed' ? 'active' : inv.status === 'failed' ? 'error' : 'draft'} text-xs px-2 py-0.5 rounded-full`}
                        style={{ fontWeight: 500 }}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => fetchInvoiceDetail(inv.id)}
                        disabled={loadingDetail}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all"
                        style={{ backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal-dark)', fontWeight: 600 }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-teal)', e.currentTarget.style.color = '#FFFFFF')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--color-teal-tint)', e.currentTarget.style.color = 'var(--color-teal-dark)')}
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  /* ═════════════════════════════════════════════════════════════
     INVOICE DETAIL — 3-panel layout
     ═════════════════════════════════════════════════════════════ */
  function renderInvoiceDetail() {
    if (loadingDetail || !selectedInvoice) {
      return (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-teal)' }} />
          <span className="ml-2 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Loading invoice detail...</span>
        </div>
      );
    }

    const inv = selectedInvoice;

    return (
      <>
        {/* 3-panel grid */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '30% 40% 30%' }}>

          {/* ── LEFT: Document Preview ─────────────────────── */}
          <div className="bg-white rounded-xl" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-silver)' }}>
              <FileText className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
              <span className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: 600 }}>Document Preview</span>
            </div>
            <div className="p-4">
              {inv.attachment_path ? (
                <embed
                  src={`http://127.0.0.1:8787/api/invoices/${inv.id}/pdf`}
                  type="application/pdf"
                  className="w-full rounded-lg"
                  style={{ height: 520, border: '1px solid var(--color-silver)' }}
                />
              ) : (
                <div
                  className="rounded-lg flex flex-col items-center justify-center"
                  style={{ backgroundColor: 'var(--color-cloud)', border: '2px dashed var(--color-silver)', minHeight: 420 }}
                >
                  <FileText className="w-12 h-12 mb-3" style={{ color: 'var(--color-silver)' }} />
                  <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', fontWeight: 600 }}>No PDF available</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>Source: {inv.source || 'manual'}</p>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                <span>Invoice #{inv.invoice_number}</span>
                <span>{inv.currency} {Number(inv.total_amount).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* ── CENTER: Extracted Data ─────────────────────── */}
          <div className="bg-white rounded-xl overflow-auto" style={{ border: '1px solid var(--color-silver)', maxHeight: 'calc(100vh - 260px)' }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-silver)' }}>
              <Sparkles className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
              <span className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: 600 }}>Extracted Invoice Data</span>
            </div>
            <div className="p-4 space-y-5">
              {/* Vendor & Entity */}
              <FieldSection title="Vendor & Entity" icon={Building2}>
                <FieldRow label="Vendor Name" value={inv.vendor_name} confidence={0.97} />
                <FieldRow label="GSTIN" value={inv.vendor_gstin || '-'} confidence={inv.vendor_gstin ? 0.94 : 0} />
                <FieldRow label="PAN" value={inv.vendor_pan || '-'} confidence={inv.vendor_pan ? 0.92 : 0} />
                <FieldRow label="Bill-to Entity" value={inv.bill_to_entity || '-'} confidence={inv.bill_to_entity ? 0.96 : 0} />
                <FieldRow label="Bill-to GSTIN" value={inv.bill_to_gstin || '-'} confidence={inv.bill_to_gstin ? 0.95 : 0} />
              </FieldSection>

              {/* Invoice Details */}
              <FieldSection title="Invoice Details" icon={FileText}>
                <FieldRow label="Invoice Number" value={inv.invoice_number} confidence={0.99} />
                <FieldRow label="Invoice Date" value={inv.invoice_date || '-'} confidence={0.97} />
                <FieldRow label="Due Date" value={inv.due_date || '-'} confidence={inv.due_date ? 0.90 : 0} />
                <FieldRow label="Currency" value={inv.currency} confidence={0.99} />
                <FieldRow label="Subtotal" value={`${inv.currency} ${Number(inv.subtotal).toLocaleString('en-IN')}`} confidence={0.96} />
                <FieldRow label="Tax Amount" value={`${inv.currency} ${Number(inv.tax_amount).toLocaleString('en-IN')}`} confidence={0.94} />
                <FieldRow label="Total Amount" value={`${inv.currency} ${Number(inv.total_amount).toLocaleString('en-IN')}`} confidence={0.98} />
                {inv.po_number && <FieldRow label="PO Number" value={inv.po_number} confidence={0.92} />}
              </FieldSection>

              {/* Line Items */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                  <span className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: 600 }}>Line Items</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal-dark)', fontWeight: 600 }}>
                    {inv.line_items?.length || 0}
                  </span>
                </div>
                {inv.line_items && inv.line_items.length > 0 ? (
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-silver)' }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ backgroundColor: 'var(--color-cloud)' }}>
                          {['Description', 'Qty', 'Rate', 'Amount', 'HSN', 'GST%'].map(h => (
                            <th key={h} className="px-3 py-2 text-left" style={{ color: 'var(--color-mercury-grey)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {inv.line_items.map((li, idx) => (
                          <tr key={idx} style={{ borderTop: '1px solid var(--color-silver)' }}>
                            <td className="px-3 py-2" style={{ color: 'var(--color-ink)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{li.description}</td>
                            <td className="px-3 py-2" style={{ color: 'var(--color-ink)' }}>{li.quantity}</td>
                            <td className="px-3 py-2" style={{ color: 'var(--color-ink)' }}>{Number(li.unit_price).toLocaleString('en-IN')}</td>
                            <td className="px-3 py-2" style={{ color: 'var(--color-ink)', fontWeight: 600 }}>{Number(li.amount).toLocaleString('en-IN')}</td>
                            <td className="px-3 py-2" style={{ color: 'var(--color-mercury-grey)' }}>{li.hsn_sac || '-'}</td>
                            <td className="px-3 py-2" style={{ color: 'var(--color-mercury-grey)' }}>{li.gst_rate != null ? `${li.gst_rate}%` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>No line items extracted</p>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Agent Decision Timeline ─────────────── */}
          <div className="bg-white rounded-xl overflow-auto" style={{ border: '1px solid var(--color-silver)', maxHeight: 'calc(100vh - 260px)' }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-silver)' }}>
              <Shield className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
              <span className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: 600 }}>Agent Decision Timeline</span>
            </div>
            <div className="p-4 space-y-3">
              {agentDecisions.length === 0 ? (
                <p className="text-xs text-center py-8" style={{ color: 'var(--color-mercury-grey)' }}>No agent decisions available</p>
              ) : (
                agentDecisions.map((d, idx) => {
                  const Icon = AGENT_ICONS[d.agent_name] || Shield;
                  const dc = d.decision === 'pass'
                    ? { bg: 'var(--color-success-light)', fg: 'var(--color-success-dark)', label: 'Pass' }
                    : d.decision === 'fail'
                    ? { bg: 'var(--color-error-light)', fg: 'var(--color-error-dark)', label: 'Fail' }
                    : { bg: 'var(--color-warning-light)', fg: 'var(--color-warning-dark)', label: 'Flagged' };
                  const barColor = d.confidence >= 0.8 ? 'var(--color-success)' : d.confidence >= 0.5 ? 'var(--color-warning)' : 'var(--color-error)';

                  return (
                    <div key={d.id || idx}>
                      {/* connector line */}
                      {idx > 0 && (
                        <div className="flex justify-center -mt-3 mb-1">
                          <div style={{ width: 2, height: 12, backgroundColor: 'var(--color-silver)' }} />
                        </div>
                      )}
                      <div className="rounded-lg p-3" style={{ border: '1px solid var(--color-silver)', backgroundColor: dc.bg + '33' }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: dc.bg }}>
                              <Icon className="w-3.5 h-3.5" style={{ color: dc.fg }} />
                            </div>
                            <span className="text-xs" style={{ color: 'var(--color-ink)', fontWeight: 600 }}>{d.agent_name}</span>
                          </div>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: dc.bg, color: dc.fg, fontWeight: 600 }}
                          >
                            {dc.label}
                          </span>
                        </div>
                        {/* confidence bar */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-silver)' }}>
                            <div
                              className="h-1.5 rounded-full"
                              style={{ width: `${Math.round(d.confidence * 100)}%`, backgroundColor: barColor }}
                            />
                          </div>
                          <span className="text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: 600 }}>{Math.round(d.confidence * 100)}%</span>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--color-mercury-grey)', lineHeight: 1.5 }}>{d.explanation}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <Clock className="w-3 h-3" style={{ color: 'var(--color-mercury-grey)' }} />
                          <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>{d.processing_time_ms}ms</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Overall recommendation */}
              {agentDecisions.length > 0 && (
                <div className="rounded-lg p-4 mt-2" style={{ backgroundColor: 'var(--color-teal-tint)', border: '1px solid var(--color-teal)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4" style={{ color: 'var(--color-teal-dark)' }} />
                    <span className="text-sm" style={{ color: 'var(--color-teal-dark)', fontWeight: 700 }}>Overall Recommendation</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Posting Readiness:</span>
                    <span className="text-sm" style={{ color: 'var(--color-teal-dark)', fontWeight: 700 }}>
                      {Math.round(agentDecisions.reduce((sum, d) => sum + d.confidence, 0) / agentDecisions.length * 100)}%
                    </span>
                  </div>
                  {(() => {
                    const fails = agentDecisions.filter(d => d.decision === 'fail').length;
                    const flagged = agentDecisions.filter(d => d.decision === 'flagged').length;
                    const lane = fails > 0 ? 'red' : flagged > 0 ? 'amber' : 'green';
                    const lm = LANE_META[lane] || LANE_META_FALLBACK;
                    return (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                        style={{ backgroundColor: lm.bg, color: lm.fg, fontWeight: 600 }}
                      >
                        <lm.icon className="w-3 h-3" />
                        Lane: {lm.label}
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── BOTTOM ACTION BAR ──────────────────────────────── */}
        <div className="mt-4 bg-white rounded-xl px-5 py-3 flex items-center justify-between" style={{ border: '1px solid var(--color-silver)' }}>
          <div className="flex items-center gap-2">
            <button
              onClick={handleApprove}
              disabled={!!actionInProgress}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all"
              style={{ backgroundColor: 'var(--color-success)', color: '#FFFFFF', fontWeight: 600, opacity: actionInProgress ? 0.6 : 1 }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-success-dark)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--color-success)')}
            >
              {actionInProgress === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
              Approve
            </button>
            <button
              onClick={handleCorrect}
              disabled={!!actionInProgress}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all"
              style={{ backgroundColor: 'var(--color-warning)', color: 'var(--color-ink)', fontWeight: 600, opacity: actionInProgress ? 0.6 : 1 }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-warning-dark)', e.currentTarget.style.color = '#FFFFFF')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--color-warning)', e.currentTarget.style.color = 'var(--color-ink)')}
            >
              {actionInProgress === 'correct' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Approve with Corrections
            </button>
            <button
              onClick={handleReject}
              disabled={!!actionInProgress}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all"
              style={{ backgroundColor: 'var(--color-error)', color: '#FFFFFF', fontWeight: 600, opacity: actionInProgress ? 0.6 : 1 }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-error-dark)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--color-error)')}
            >
              {actionInProgress === 'reject' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4" />}
              Reject
            </button>
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all"
              style={{ border: '1px solid var(--color-silver)', color: 'var(--color-mercury-grey)', fontWeight: 500 }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-cloud)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Pause className="w-4 h-4" /> Hold
            </button>
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all"
              style={{ border: '1px solid var(--color-silver)', color: 'var(--color-mercury-grey)', fontWeight: 500 }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-cloud)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <MessageSquare className="w-4 h-4" /> Send Query
            </button>
          </div>
          <button
            onClick={() => { setViewMode('list'); setSelectedInvoice(null); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all"
            style={{ color: 'var(--color-teal-dark)', fontWeight: 600 }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-teal-tint)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <ArrowLeft className="w-4 h-4" /> Back to list
          </button>
        </div>
      </>
    );
  }

  /* ═════════════════════════════════════════════════════════════
     AGENT CONFIG DRAWER
     ═════════════════════════════════════════════════════════════ */
  function renderConfigDrawer() {
    return (
      <>
        {/* backdrop */}
        <div
          className="fixed inset-0"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 40 }}
          onClick={() => setConfigDrawerOpen(false)}
        />
        {/* drawer */}
        <div
          className="fixed top-0 right-0 h-full bg-white overflow-auto"
          style={{ width: 520, zIndex: 50, borderLeft: '2px solid var(--color-silver)', boxShadow: '-4px 0 24px rgba(0,0,0,0.08)' }}
        >
          {/* header */}
          <div className="px-5 py-4 flex items-center justify-between sticky top-0 bg-white" style={{ borderBottom: '1px solid var(--color-silver)', zIndex: 1 }}>
            <div>
              <h2 className="text-lg" style={{ color: 'var(--color-ink)', fontWeight: 700 }}>Agent Configuration</h2>
              <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Configure thresholds and rules for all processing agents</p>
            </div>
            <button
              onClick={() => setConfigDrawerOpen(false)}
              className="p-2 rounded-lg transition-all"
              style={{ border: '1px solid var(--color-silver)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-cloud)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <X className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
            </button>
          </div>

          {/* content */}
          <div className="p-5">
            {loadingConfig ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-teal)' }} />
                <span className="ml-2 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Loading configuration...</span>
              </div>
            ) : Object.keys(configByAgent).length === 0 ? (
              <div className="text-center py-16">
                <Settings className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--color-silver)' }} />
                <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>No agent configurations found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(configByAgent).map(([agentName, rows]) => {
                  const isExpanded = expandedAgents[agentName] ?? false;
                  const Icon = AGENT_ICONS[agentName] || Shield;
                  return (
                    <div key={agentName} className="rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
                      {/* accordion header */}
                      <button
                        className="w-full flex items-center justify-between px-4 py-3 transition-all"
                        style={{ backgroundColor: isExpanded ? 'var(--color-teal-tint)' : 'transparent' }}
                        onClick={() => setExpandedAgents(prev => ({ ...prev, [agentName]: !isExpanded }))}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                          <span className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: 600 }}>{agentName}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-cloud)', color: 'var(--color-mercury-grey)', fontWeight: 500 }}>
                            {rows.length} config{rows.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                          : <ChevronRight className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                        }
                      </button>

                      {/* accordion body */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 space-y-3" style={{ borderTop: '1px solid var(--color-silver)' }}>
                          {rows.map(cfg => (
                            <div key={cfg.id}>
                              <label className="block text-xs mb-1" style={{ color: 'var(--color-ink)', fontWeight: 600 }}>{cfg.label}</label>
                              <p className="text-xs mb-1.5" style={{ color: 'var(--color-mercury-grey)' }}>{cfg.description}</p>
                              {cfg.config_type === 'boolean' ? (
                                <button
                                  onClick={() => updateConfigValue(cfg.id, cfg.config_value === 'true' ? 'false' : 'true')}
                                  className="relative inline-flex items-center h-6 rounded-full w-11 transition-all"
                                  style={{ backgroundColor: cfg.config_value === 'true' ? 'var(--color-teal)' : 'var(--color-silver)' }}
                                >
                                  <span
                                    className="inline-block w-4 h-4 rounded-full bg-white transition-transform"
                                    style={{ transform: cfg.config_value === 'true' ? 'translateX(22px)' : 'translateX(4px)' }}
                                  />
                                </button>
                              ) : (
                                <input
                                  type={cfg.config_type === 'number' ? 'number' : 'text'}
                                  value={cfg.config_value}
                                  onChange={e => updateConfigValue(cfg.id, e.target.value)}
                                  className="px-input w-full text-sm px-3 py-2 rounded-lg"
                                  style={{
                                    border: '1px solid var(--color-silver)',
                                    backgroundColor: 'var(--color-cloud)',
                                    color: 'var(--color-ink)',
                                    outline: 'none',
                                  }}
                                />
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => handleSaveConfig(agentName)}
                            disabled={savingConfig === agentName}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all mt-2"
                            style={{ backgroundColor: 'var(--color-teal)', color: '#FFFFFF', fontWeight: 600, opacity: savingConfig === agentName ? 0.6 : 1 }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--color-teal)')}
                          >
                            {savingConfig === agentName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            Save {agentName}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }
}

/* ═══════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */

function FieldSection({ title, icon: Icon, children }: { title: string; icon: typeof Building2; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
        <span className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: 600 }}>{title}</span>
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

function FieldRow({ label, value, confidence }: { label: string; value: string; confidence: number }) {
  const badge = confidence >= 0.95
    ? { label: 'High', bg: 'var(--color-success-light)', fg: 'var(--color-success-dark)' }
    : confidence >= 0.80
    ? { label: 'Med', bg: 'var(--color-warning-light)', fg: 'var(--color-warning-dark)' }
    : confidence > 0
    ? { label: 'Low', bg: 'var(--color-error-light)', fg: 'var(--color-error-dark)' }
    : null;

  return (
    <div className="flex items-center justify-between py-1.5 px-3 rounded-md" style={{ backgroundColor: 'var(--color-cloud)' }}>
      <span className="text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: 500, minWidth: 110 }}>{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: 'var(--color-ink)', fontWeight: 600 }}>{value}</span>
        {badge && (
          <span
            className="text-xs px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: badge.bg, color: badge.fg, fontWeight: 600, fontSize: 9 }}
          >
            {badge.label}
          </span>
        )}
      </div>
    </div>
  );
}
