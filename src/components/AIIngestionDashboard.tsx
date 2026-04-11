import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, Upload, CheckCircle, AlertTriangle,
  AlertCircle, Clock, Mail, FileText, X, Loader2, Eye,
} from 'lucide-react';

type LogStatus = 'received' | 'processing' | 'processed' | 'failed' | 'skipped';
type Severity = 'low' | 'medium' | 'high';

interface IngestionLog {
  id: string;
  sender_email: string;
  sender_name: string;
  subject: string;
  attachment_count: number;
  status: LogStatus;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
  invoice_ids: string[] | null;
}

interface InvoiceException {
  id: string;
  invoice_id: string;
  exception_type: string;
  exception_detail: string;
  severity: Severity;
  resolved: boolean;
  created_at: string;
}

const API_BASE = '/api/invoice-ingestion';

function getAuthHeaders(): Record<string, string> {
  const key = localStorage.getItem('apiSecretKey');
  return key ? { Authorization: `Bearer ${key}` } : {};
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`http://127.0.0.1:8787${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...opts.headers },
  });
  return res.json();
}

const STATUS_CONFIG: Record<LogStatus, { label: string; className: string; icon: typeof CheckCircle }> = {
  received: { label: 'Received', className: 'badge-draft', icon: Mail },
  processing: { label: 'Processing', className: 'badge-draft', icon: Loader2 },
  processed: { label: 'Processed', className: 'badge-active', icon: CheckCircle },
  failed: { label: 'Failed', className: 'badge-error', icon: AlertCircle },
  skipped: { label: 'Skipped', className: 'badge-inactive', icon: X },
};

const SEVERITY_CONFIG: Record<Severity, { className: string; icon: typeof AlertTriangle }> = {
  high: { className: 'badge-error', icon: AlertCircle },
  medium: { className: 'badge-inactive', icon: AlertTriangle },
  low: { className: 'badge-draft', icon: Clock },
};

interface ParsedInvoice {
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
  metadata: any;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
    hsn_sac: string | null;
    gst_rate: number | null;
  }>;
}

export function AIIngestionDashboard() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<IngestionLog[]>([]);
  const [exceptions, setExceptions] = useState<InvoiceException[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<ParsedInvoice | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [logsRes, excRes] = await Promise.all([
        apiFetch(`${API_BASE}/logs?limit=50`),
        apiFetch(`${API_BASE}/exceptions`),
      ]);
      if (logsRes.success) setLogs(logsRes.data || []);
      if (excRes.success) setExceptions(excRes.data || []);
    } catch {
      // API may not be running
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTriggerPoll = async () => {
    setPolling(true);
    try {
      await apiFetch(`${API_BASE}/trigger`, { method: 'POST' });
      await fetchData();
    } finally {
      setPolling(false);
    }
  };

  const handleResolve = async (exId: string) => {
    await apiFetch(`${API_BASE}/exceptions/${exId}/resolve`, { method: 'PATCH' });
    setExceptions((prev) => prev.filter((e) => e.id !== exId));
  };

  const handleViewInvoice = async (invoiceId: string) => {
    setLoadingInvoice(true);
    try {
      const res = await apiFetch(`/api/invoices/${invoiceId}`);
      if (res.success) setSelectedInvoice(res.data);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      await apiFetch(`${API_BASE}/manual-upload`, {
        method: 'POST',
        body: JSON.stringify({ file: base64, mimeType: file.type, filename: file.name }),
      });
      await fetchData();
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
      handleFileUpload(file);
    }
  };

  // Stats
  const today = new Date().toISOString().split('T')[0];
  const todayIngested = logs.filter((l) => l.created_at?.startsWith(today)).length;
  const pendingReview = logs.filter((l) => l.status === 'received' || l.status === 'processing').length;
  const autoMatched = logs.filter((l) => l.status === 'processed').length;
  const exceptionCount = exceptions.length;

  const stats = [
    { label: 'Today Ingested', value: todayIngested, icon: Mail, color: 'var(--color-teal)' },
    { label: 'Pending Review', value: pendingReview, icon: Clock, color: 'var(--color-warning)' },
    { label: 'Auto-matched to PO', value: autoMatched, icon: CheckCircle, color: 'var(--color-success)' },
    { label: 'Exceptions', value: exceptionCount, icon: AlertTriangle, color: 'var(--color-error)' },
  ];

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/invoices')} className="p-2 rounded-lg" style={{ border: '1px solid var(--color-silver)', color: 'var(--color-mercury-grey)' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-ink)' }}>AI Invoice Ingestion</h1>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Automated email-to-invoice pipeline powered by Claude AI</p>
          </div>
          <button onClick={handleTriggerPoll} disabled={polling} className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-lg">
            <RefreshCw className={`w-4 h-4 ${polling ? 'animate-spin' : ''}`} />
            {polling ? 'Polling...' : 'Poll Now'}
          </button>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-5" style={{ border: '1px solid var(--color-silver)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>{s.label}</span>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <p className="text-3xl font-bold" style={{ color: 'var(--color-ink)' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-5 gap-6">
          {/* Left: Ingestion Logs (3 cols) */}
          <div className="col-span-3 bg-white rounded-xl" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-silver)' }}>
              <h2 className="text-base font-semibold" style={{ color: 'var(--color-ink)' }}>Ingestion Log</h2>
              <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>{logs.length} entries</span>
            </div>
            <div className="overflow-auto" style={{ maxHeight: '500px' }}>
              {loading ? (
                <div className="p-8 text-center" style={{ color: 'var(--color-mercury-grey)' }}>
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading...
                </div>
              ) : logs.length === 0 ? (
                <div className="p-8 text-center" style={{ color: 'var(--color-mercury-grey)' }}>
                  <Mail className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-silver)' }} />
                  <p className="text-sm">No ingestion logs yet</p>
                  <p className="text-xs mt-1">Trigger a poll or upload an invoice manually</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-cloud)' }}>
                      <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--color-mercury-grey)' }}>Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--color-mercury-grey)' }}>Sender</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--color-mercury-grey)' }}>Subject</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: 'var(--color-mercury-grey)' }}>Files</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: 'var(--color-mercury-grey)' }}>Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: 'var(--color-mercury-grey)' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const cfg = STATUS_CONFIG[log.status] || STATUS_CONFIG.received;
                      const StatusIcon = cfg.icon;
                      const invoiceIds = Array.isArray(log.invoice_ids) ? log.invoice_ids : [];
                      return (
                        <tr key={log.id} style={{ borderBottom: '1px solid var(--color-silver)' }}>
                          <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--color-mercury-grey)' }}>
                            {log.created_at ? new Date(log.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '—'}
                          </td>
                          <td className="px-4 py-3" style={{ color: 'var(--color-ink)' }}>
                            <div className="font-medium truncate max-w-[160px]">{log.sender_name || log.sender_email}</div>
                          </td>
                          <td className="px-4 py-3" style={{ color: 'var(--color-ink)' }}>
                            <div className="truncate max-w-[200px]">{log.subject || '(no subject)'}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="badge-draft">{log.attachment_count}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={cfg.className + ' inline-flex items-center gap-1'}>
                              <StatusIcon className="w-3 h-3" />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {invoiceIds.length > 0 && (
                              <button
                                onClick={() => handleViewInvoice(invoiceIds[0])}
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
                                style={{ color: 'var(--color-teal)', border: '1px solid var(--color-teal-light)' }}
                              >
                                <Eye className="w-3 h-3" /> View
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right: Exceptions (2 cols) */}
          <div className="col-span-2 bg-white rounded-xl" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-silver)' }}>
              <h2 className="text-base font-semibold" style={{ color: 'var(--color-ink)' }}>Exceptions</h2>
              <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>{exceptions.length} unresolved</span>
            </div>
            <div className="overflow-auto" style={{ maxHeight: '500px' }}>
              {exceptions.length === 0 ? (
                <div className="p-8 text-center" style={{ color: 'var(--color-mercury-grey)' }}>
                  <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-success)' }} />
                  <p className="text-sm">No exceptions</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--color-silver)' }}>
                  {(['high', 'medium', 'low'] as Severity[]).map((sev) => {
                    const items = exceptions.filter((e) => e.severity === sev);
                    if (items.length === 0) return null;
                    const cfg = SEVERITY_CONFIG[sev];
                    const SevIcon = cfg.icon;
                    return (
                      <div key={sev}>
                        <div className="px-4 py-2 text-xs font-semibold uppercase" style={{ backgroundColor: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' }}>
                          {sev} severity ({items.length})
                        </div>
                        {items.map((ex) => (
                          <div key={ex.id} className="px-4 py-3 flex items-start gap-3" style={{ borderBottom: '1px solid var(--color-silver)' }}>
                            <SevIcon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: sev === 'high' ? 'var(--color-error)' : sev === 'medium' ? 'var(--color-warning)' : 'var(--color-mercury-grey)' }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold" style={{ color: 'var(--color-ink)' }}>{ex.exception_type.replace(/_/g, ' ')}</p>
                              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-mercury-grey)' }}>{ex.exception_detail}</p>
                            </div>
                            <button onClick={() => handleResolve(ex.id)} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--color-teal)', border: '1px solid var(--color-teal-light)' }}>
                              Resolve
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Parsed Invoice Preview */}
        {(selectedInvoice || loadingInvoice) && (
          <div className="bg-white rounded-xl" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-silver)' }}>
              <h2 className="text-base font-semibold" style={{ color: 'var(--color-ink)' }}>
                Extracted Invoice Data
              </h2>
              <button onClick={() => setSelectedInvoice(null)} className="p-1 rounded" style={{ color: 'var(--color-mercury-grey)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            {loadingInvoice ? (
              <div className="p-8 text-center" style={{ color: 'var(--color-mercury-grey)' }}>
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading...
              </div>
            ) : selectedInvoice && (
              <div className="p-6">
                {/* Header info */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="badge-active">{selectedInvoice.status}</span>
                  <span className="badge-draft">{selectedInvoice.source}</span>
                  {selectedInvoice.metadata?.confidence_score && (
                    <span className="badge-draft">
                      Confidence: {(selectedInvoice.metadata.confidence_score * 100).toFixed(0)}%
                    </span>
                  )}
                  {selectedInvoice.metadata?.extractedData?._provider && (
                    <span className="badge-draft">
                      OCR: {selectedInvoice.metadata.extractedData._provider}
                    </span>
                  )}
                </div>

                {/* Two-column fields */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Invoice Number', value: selectedInvoice.invoice_number },
                    { label: 'Invoice Date', value: selectedInvoice.invoice_date },
                    { label: 'Due Date', value: selectedInvoice.due_date || '—' },
                    { label: 'Vendor Name', value: selectedInvoice.vendor_name },
                    { label: 'Vendor GSTIN', value: selectedInvoice.vendor_gstin || '—' },
                    { label: 'Vendor Email', value: selectedInvoice.vendor_email || '—' },
                    { label: 'Bill To', value: selectedInvoice.bill_to_entity || '—' },
                    { label: 'PO Number', value: selectedInvoice.po_number || '—' },
                    { label: 'Currency', value: selectedInvoice.currency },
                  ].map((f) => (
                    <div key={f.label}>
                      <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>{f.label}</p>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{f.value}</p>
                    </div>
                  ))}
                </div>

                {/* Amounts */}
                <div className="grid grid-cols-3 gap-4 mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)' }}>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Subtotal</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--color-ink)' }}>
                      {selectedInvoice.currency} {Number(selectedInvoice.subtotal).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Tax</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--color-ink)' }}>
                      {selectedInvoice.currency} {Number(selectedInvoice.tax_amount).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Total</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--color-teal)' }}>
                      {selectedInvoice.currency} {Number(selectedInvoice.total_amount).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Line Items */}
                {selectedInvoice.line_items && selectedInvoice.line_items.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-ink)' }}>
                      Line Items ({selectedInvoice.line_items.length})
                    </h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: 'var(--color-cloud)' }}>
                          <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--color-mercury-grey)' }}>#</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--color-mercury-grey)' }}>Description</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: 'var(--color-mercury-grey)' }}>Qty</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: 'var(--color-mercury-grey)' }}>Unit Price</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: 'var(--color-mercury-grey)' }}>Amount</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: 'var(--color-mercury-grey)' }}>HSN/SAC</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: 'var(--color-mercury-grey)' }}>GST %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.line_items.map((li, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--color-silver)' }}>
                            <td className="px-3 py-2" style={{ color: 'var(--color-mercury-grey)' }}>{i + 1}</td>
                            <td className="px-3 py-2" style={{ color: 'var(--color-ink)' }}>{li.description}</td>
                            <td className="px-3 py-2 text-right" style={{ color: 'var(--color-ink)' }}>{li.quantity}</td>
                            <td className="px-3 py-2 text-right" style={{ color: 'var(--color-ink)' }}>{Number(li.unit_price).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right font-medium" style={{ color: 'var(--color-ink)' }}>{Number(li.amount).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right" style={{ color: 'var(--color-mercury-grey)' }}>{li.hsn_sac || '—'}</td>
                            <td className="px-3 py-2 text-right" style={{ color: 'var(--color-mercury-grey)' }}>{li.gst_rate != null ? `${(Number(li.gst_rate) * 100).toFixed(0)}%` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Manual Upload Zone */}
        <div
          className={`bg-white rounded-xl p-8 text-center transition-colors ${dragOver ? 'ring-2' : ''}`}
          style={{
            border: `2px dashed ${dragOver ? 'var(--color-teal)' : 'var(--color-silver)'}`,
            ...(dragOver ? { backgroundColor: 'var(--color-teal-tint)' } : {}),
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {uploading ? (
            <div>
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: 'var(--color-teal)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>Processing invoice with Claude AI...</p>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--color-mercury-grey)' }} />
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-ink)' }}>Drop invoice here or click to upload</p>
              <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>PDF, PNG, JPG supported. Claude AI will extract all fields automatically.</p>
              <label className="btn-primary inline-flex items-center gap-2 mt-4 cursor-pointer px-5 py-2.5 rounded-lg">
                <FileText className="w-4 h-4" />
                Choose File
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
