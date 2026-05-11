import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Send,
  FileText,
  Building2,
  DollarSign,
  Package,
  Calculator,
  MessageSquare,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Upload,
  CheckCircle,
  X,
  Eye,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  Clock,
  Shield,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useMasterData } from '../contexts/MasterDataContext';
import { mysqlApiRequest } from '../lib/mysql/client';

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

interface LineItem {
  id: string;
  itemName: string;
  itemCode: string;
  itemDescription: string;
  ocrItem: string;
  ocrConfidence: 'High' | 'Medium' | 'Low';
  glCode: string;
  qty: number;
  rate: number;
  amount: number;
  gstPercent: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalGst: number;
  grossAmount: number;
  tdsSection: string;
  tdsPercent: number;
  tdsAmount: number;
  lowerTds: boolean;
  sec206: string;
  netPayable: number;
  costCenter: string;
  profitCenter: string;
  shipTo: string;
  projectCode: string;
}

/* ═══════════════════════════════════════════════════════════
   INLINE STYLES (CSS-in-JS using Procinix variables only)
   ═══════════════════════════════════════════════════════════ */

const S = {
  /* ---------- layout ---------- */
  wrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  headerBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    padding: '0 24px',
    background: '#fff',
    borderBottom: '1px solid var(--color-silver)',
    flexShrink: 0,
    zIndex: 10,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 600,
    color: 'var(--color-ink)',
    margin: 0,
    lineHeight: 1.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'var(--color-mercury-grey)',
    margin: 0,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  /* ---------- left panel ---------- */
  leftPanel: (collapsed: boolean): React.CSSProperties => ({
    width: collapsed ? 0 : '35%',
    minWidth: collapsed ? 0 : 340,
    maxWidth: collapsed ? 0 : 520,
    background: '#fff',
    borderRight: collapsed ? 'none' : '1px solid var(--color-silver)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'width 0.3s ease, min-width 0.3s ease, max-width 0.3s ease',
    flexShrink: 0,
  }),
  leftPanelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--color-silver)',
    flexShrink: 0,
  },
  leftPanelScroll: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: 20,
  },
  /* ---------- right panel ---------- */
  rightPanel: {
    flex: 1,
    background: 'var(--color-cloud)',
    overflowY: 'auto' as const,
    position: 'relative' as const,
  },
  rightPanelContent: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: 32,
  },
  restoreBtn: {
    position: 'absolute' as const,
    left: 0,
    top: 20,
    background: '#fff',
    border: '1px solid var(--color-silver)',
    borderLeft: 'none',
    borderRadius: '0 8px 8px 0',
    padding: '10px 8px',
    cursor: 'pointer',
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '2px 2px 8px rgba(0,0,0,0.06)',
  },
  /* ---------- upload zone ---------- */
  uploadZone: (dragging: boolean): React.CSSProperties => ({
    border: `2px dashed ${dragging ? 'var(--color-teal)' : 'var(--color-silver)'}`,
    borderRadius: 8,
    padding: 32,
    textAlign: 'center',
    cursor: 'pointer',
    background: dragging ? 'var(--color-teal-tint)' : 'var(--color-cloud)',
    transition: 'all 0.2s',
  }),
  /* ---------- section card ---------- */
  sectionCard: {
    background: '#fff',
    border: '1px solid var(--color-silver)',
    borderRadius: 8,
    padding: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: 'var(--color-teal-tint)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-teal-dark)',
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--color-ink)',
    margin: 0,
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  /* ---------- form field ---------- */
  fieldLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--color-ink)',
    marginBottom: 6,
  },
  required: {
    color: 'var(--color-error)',
  },
  /* ---------- badges ---------- */
  ocrBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    padding: '1px 8px',
    background: 'var(--color-success-light)',
    color: 'var(--color-success-dark)',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 9999,
    lineHeight: '18px',
  },
  autoBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    padding: '1px 8px',
    background: 'var(--color-teal-tint)',
    color: 'var(--color-teal-dark)',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 9999,
    lineHeight: '18px',
  },
  suggestedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    padding: '1px 8px',
    background: 'var(--color-warning-light)',
    color: 'var(--color-warning-dark)',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 9999,
    lineHeight: '18px',
  },
  /* ---------- table ---------- */
  tableWrap: {
    overflowX: 'auto' as const,
    border: '1px solid var(--color-silver)',
    borderRadius: 8,
  },
  table: {
    minWidth: 2400,
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 13,
  },
  th: {
    background: 'var(--color-cloud)',
    color: 'var(--color-mercury-grey)',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    padding: '10px 10px',
    textAlign: 'left' as const,
    whiteSpace: 'nowrap' as const,
    borderBottom: '1px solid var(--color-silver)',
  },
  thSticky: {
    position: 'sticky' as const,
    left: 0,
    zIndex: 2,
    background: 'var(--color-cloud)',
    minWidth: 200,
  },
  td: {
    padding: '10px 10px',
    borderBottom: '1px solid var(--color-silver)',
    verticalAlign: 'middle' as const,
    color: 'var(--color-ink)',
    whiteSpace: 'nowrap' as const,
  },
  tdSticky: {
    position: 'sticky' as const,
    left: 0,
    zIndex: 1,
    background: '#fff',
    minWidth: 200,
  },
  /* ---------- confidence badges ---------- */
  confHigh: {
    display: 'inline-flex',
    padding: '2px 8px',
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 600,
    background: 'var(--color-success-light)',
    color: 'var(--color-success-dark)',
  },
  confMed: {
    display: 'inline-flex',
    padding: '2px 8px',
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 600,
    background: 'var(--color-warning-light)',
    color: 'var(--color-warning-dark)',
  },
  confLow: {
    display: 'inline-flex',
    padding: '2px 8px',
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 600,
    background: 'var(--color-error-light)',
    color: 'var(--color-error-dark)',
  },
  /* ---------- toggle ---------- */
  toggleTrack: (on: boolean): React.CSSProperties => ({
    width: 40,
    height: 22,
    borderRadius: 11,
    background: on ? 'var(--color-teal)' : 'var(--color-silver)',
    position: 'relative',
    cursor: 'pointer',
    transition: 'background 0.2s',
    flexShrink: 0,
  }),
  toggleThumb: (on: boolean): React.CSSProperties => ({
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#fff',
    position: 'absolute',
    top: 2,
    left: on ? 20 : 2,
    transition: 'left 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  }),
  /* ---------- accounting ---------- */
  accountingGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 24,
  },
  accountingCol: (headerBg: string): React.CSSProperties => ({
    border: '1px solid var(--color-silver)',
    borderRadius: 8,
    overflow: 'hidden',
  }),
  accountingHeader: (bg: string, color: string): React.CSSProperties => ({
    padding: '10px 16px',
    background: bg,
    color: color,
    fontSize: 13,
    fontWeight: 600,
    display: 'flex',
    justifyContent: 'space-between',
  }),
  accountingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 16px',
    fontSize: 13,
    borderBottom: '1px solid var(--color-silver)',
  },
  accountingTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 600,
    background: 'var(--color-teal-tint)',
  },
  /* ---------- drawer ---------- */
  backdrop: (open: boolean): React.CSSProperties => ({
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    zIndex: 999,
    opacity: open ? 1 : 0,
    pointerEvents: open ? 'auto' : 'none',
    transition: 'opacity 0.25s',
  }),
  drawer: (open: boolean): React.CSSProperties => ({
    position: 'fixed',
    top: 0,
    right: 0,
    width: 480,
    height: '100vh',
    background: '#fff',
    zIndex: 1000,
    transform: open ? 'translateX(0)' : 'translateX(100%)',
    transition: 'transform 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
  }),
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '1px solid var(--color-silver)',
    flexShrink: 0,
  },
  drawerBody: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: 24,
  },
  /* ---------- radio ---------- */
  radio: (active: boolean): React.CSSProperties => ({
    width: 18,
    height: 18,
    borderRadius: '50%',
    border: active ? '5px solid var(--color-teal)' : '2px solid var(--color-silver)',
    boxSizing: 'border-box',
    flexShrink: 0,
    cursor: 'pointer',
    transition: 'border 0.15s',
  }),
  /* ---------- file info ---------- */
  fileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    background: 'var(--color-success-light)',
    borderRadius: 8,
    marginBottom: 16,
  },
  /* ---------- ocr status card ---------- */
  ocrStatusCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    background: 'var(--color-success-light)',
    border: '1px solid var(--color-success)',
    borderRadius: 8,
  },
  /* ---------- workflow row ---------- */
  workflowRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 0',
  },
  /* ---------- utility ---------- */
  fullWidth: { gridColumn: '1 / -1' },
  mb16: { marginBottom: 16 },
  mb24: { marginBottom: 24 },
  flexCenter: { display: 'flex', alignItems: 'center', gap: 8 },
  flexBetween: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  textMuted: { fontSize: 13, color: 'var(--color-mercury-grey)' },
  textSmall: { fontSize: 12, color: 'var(--color-mercury-grey)' },
  monospace: { fontFamily: 'SFMono-Regular, Menlo, monospace', fontSize: 13 },
};

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function OcrBadge() {
  return <span style={S.ocrBadge}>&#x1F9E0; OCR</span>;
}

function AutoBadge() {
  return <span style={S.autoBadge}>Auto</span>;
}

function SuggestedBadge() {
  return <span style={S.suggestedBadge}>Suggested</span>;
}

function ConfBadge({ level }: { level: 'High' | 'Medium' | 'Low' }) {
  const map = { High: S.confHigh, Medium: S.confMed, Low: S.confLow };
  return <span style={map[level]}>{level}</span>;
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      style={S.toggleTrack(value)}
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
    >
      <div style={S.toggleThumb(value)} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
};

function getStateFromGstin(gstin: string): string {
  if (!gstin || gstin.length < 2) return '';
  return GST_STATE_CODES[gstin.substring(0, 2)] || '';
}

export function InvoiceFormDirectV2() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    vendors: allVendors,
    entities: allEntities,
    departments: allDepartments,
    currencies: allCurrencies,
    currentCompany,
  } = useMasterData();

  const activeVendors = useMemo(
    () => allVendors.filter((v: any) => v.status === 'Active' || v.isActive),
    [allVendors]
  );
  const activeEntities = useMemo(
    () => allEntities.filter((e: any) => e.isActive !== false),
    [allEntities]
  );
  const activeDepartments = useMemo(
    () => allDepartments.filter((d: any) => d.isActive !== false && d.status !== 'Inactive'),
    [allDepartments]
  );

  /* ---- AI invoice hydration state ---- */
  const [aiInvoiceData, setAiInvoiceData] = useState<any>(null);
  const [aiHydrated, setAiHydrated] = useState(false);

  /* ---- panel state ---- */
  const [leftCollapsed, setLeftCollapsed] = useState(false);

  /* ---- file upload ---- */
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---- capture mode ---- */
  const [captureMode, setCaptureMode] = useState<'ocr' | 'manual'>('ocr');

  /* ---- form toggles ---- */
  const [eInvoice, setEInvoice] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'verified' | 'pending'>('verified');

  /* ---- line items ---- */
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  /* ---- form field state (populated by AI or manual entry) ---- */
  const [vendorName, setVendorName] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [vendorGroup, setVendorGroup] = useState('');
  const [entityName, setEntityName] = useState(() => currentCompany?.name || '');
  const [vendorLocation, setVendorLocation] = useState('');
  const [vendorGstin, setVendorGstin] = useState('');
  const [vendorState, setVendorState] = useState('');
  const [vendorPan, setVendorPan] = useState('');
  const [billingLocation, setBillingLocation] = useState(() => currentCompany?.name || '');
  const [billToGstin, setBillToGstin] = useState(() => (currentCompany as any)?.gstin || '');
  const [invoiceCurrency, setInvoiceCurrency] = useState(
    () => (currentCompany as any)?.currency || 'INR'
  );
  const [department, setDepartment] = useState('');
  const [subDepartment, setSubDepartment] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [grossAmount, setGrossAmount] = useState('');
  const [baseAmount, setBaseAmount] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [retentionName, setRetentionName] = useState('');
  const [retentionAmount, setRetentionAmount] = useState('');
  const [retentionReason, setRetentionReason] = useState('');
  const [retentionDate, setRetentionDate] = useState('');
  const [expenseFrom, setExpenseFrom] = useState('');
  const [expenseTo, setExpenseTo] = useState('');
  const [narration, setNarration] = useState('');
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');

  /* ---- Entity-derived filtering (must be after all useState) ---- */
  const selectedEntityObj = useMemo(
    () => activeEntities.find((e: any) => (e.name || e.legalName) === entityName),
    [activeEntities, entityName]
  );
  const selectedEntityId = selectedEntityObj?.id;
  const selectedEntityCurrency = (selectedEntityObj as any)?.currency;

  const filteredCurrencies = useMemo(() => {
    if (!selectedEntityId) return allCurrencies.filter((c: any) => c.isActive !== false);
    return allCurrencies.filter((c: any) => {
      if (c.isActive === false) return false;
      if (c.code === selectedEntityCurrency) return true;
      const mappings = Array.isArray(c.entityMappings) ? c.entityMappings : [];
      return mappings.length === 0 || mappings.some((m: any) => m.entityId === selectedEntityId);
    });
  }, [allCurrencies, selectedEntityId, selectedEntityCurrency]);

  const filteredVendors = useMemo(() => {
    if (!selectedEntityId) return activeVendors;
    return activeVendors.filter((v: any) => {
      const mappings = Array.isArray(v.entityMappings) ? v.entityMappings : [];
      return mappings.length === 0 || mappings.some((m: any) => m.entityId === selectedEntityId);
    });
  }, [activeVendors, selectedEntityId]);

  const filteredDepartments = useMemo(() => {
    if (!selectedEntityId) return activeDepartments;
    return activeDepartments.filter((d: any) => {
      const mappings = Array.isArray(d.entityMappings) ? d.entityMappings : [];
      return mappings.length === 0 || mappings.some((m: any) => m.entityId === selectedEntityId);
    });
  }, [activeDepartments, selectedEntityId]);

  /* ---- Hydrate from AI-ingested invoice ---- */
  useEffect(() => {
    const state = location.state as { fromAI?: boolean; dbId?: string } | null;
    if (!state?.fromAI || !state?.dbId || aiHydrated) return;

    const fetchAIInvoice = async () => {
      try {
        const json = await mysqlApiRequest<{ success: boolean; data: any }>(
          `/invoices/${state.dbId}`
        );
        if (!json?.success) return;
        const inv = json.data;
        const meta = inv.metadata?.extractedData || {};
        setAiInvoiceData(inv);

        // ── Populate every form field from DB/OCR data ──
        setVendorName(inv.vendor_name || '');
        setVendorId(inv.vendor_id || '');
        setVendorCode(inv.vendor_code || '');
        setVendorGstin(inv.vendor_gstin || meta.vendor_gstin || '');
        setVendorPan(inv.vendor_pan || meta.vendor_pan || '');
        setVendorState(meta.vendor_gstin ? getStateFromGstin(meta.vendor_gstin) : '');
        setEntityName(inv.bill_to_entity || meta.bill_to_entity || '');
        setBillToGstin(inv.bill_to_gstin || meta.bill_to_gstin || '');
        setBillingLocation(inv.bill_to_entity || '');
        setInvoiceCurrency(inv.currency || 'INR');
        setInvoiceNumber(inv.invoice_number || '');
        setInvoiceDate(inv.invoice_date ? String(inv.invoice_date).split('T')[0] : '');
        setDueDate(inv.due_date ? String(inv.due_date).split('T')[0] : '');
        setGrossAmount(
          inv.total_amount
            ? `${inv.currency || '₹'} ${Number(inv.total_amount).toLocaleString('en-IN')}`
            : ''
        );
        setBaseAmount(
          inv.subtotal
            ? `${inv.currency || '₹'} ${Number(inv.subtotal).toLocaleString('en-IN')}`
            : ''
        );
        setPaymentTerms(inv.payment_terms || meta.payment_terms || '');
        setNarration(inv.notes || meta.notes || '');

        // Bank details → retention suggestion
        const bank = meta.bank_details || inv.bank_details;
        if (bank?.bank_name) {
          setRetentionName(`Payment via ${bank.bank_name}`);
        }

        // Line items
        if (Array.isArray(inv.line_items) && inv.line_items.length > 0) {
          setLineItems(
            inv.line_items.map((li: any, i: number) => {
              const amt = Number(li.amount) || 0;
              const gstPct = li.gst_rate != null ? Number(li.gst_rate) * 100 : 0;
              const gstAmt = amt * (gstPct / 100);
              const halfGst = gstAmt / 2;
              return {
                id: String(i + 1),
                itemName: li.description || 'Extracted Item',
                itemCode: li.hsn_sac || '',
                description: li.description || '',
                ocrItem: li.description || '',
                ocrConfidence: 'High' as const,
                glCode: '',
                qty: Number(li.quantity) || 1,
                rate: Number(li.unit_price) || 0,
                amount: amt,
                gstPct,
                cgst: halfGst,
                sgst: halfGst,
                igst: 0,
                cess: 0,
                totalGst: gstAmt,
                grossAmount: amt + gstAmt,
                tdsSection: '',
                tdsPct: 0,
                tdsAmount: 0,
                lowerTds: false,
                sec206: false,
                netPayable: amt + gstAmt,
                costCenter: '',
                profitCenter: '',
                shipTo: '',
                projectCode: '',
              };
            })
          );
        }

        // File info + PDF preview
        setUploadedFile({ name: `${inv.invoice_number || 'Invoice'}.pdf`, size: 'AI Extracted' });
        if (inv.attachment_path) {
          setPdfPreviewUrl(inv.attachment_path);
        }
        setCaptureMode('ocr');
        setAiHydrated(true);
        console.log('[DirectInvoice] Hydrated all fields from AI invoice:', inv.invoice_number);
      } catch (err) {
        console.error('[DirectInvoice] Failed to hydrate:', err);
      }
    };

    fetchAIInvoice();
  }, [location.state, aiHydrated]);

  /* ---- derived totals ---- */
  const totalBase = lineItems.reduce((s, l) => s + l.amount, 0);
  const totalGst = lineItems.reduce((s, l) => s + l.totalGst, 0);
  const totalGross = lineItems.reduce((s, l) => s + l.grossAmount, 0);
  const totalTds = lineItems.reduce((s, l) => s + l.tdsAmount, 0);
  const totalNet = lineItems.reduce((s, l) => s + l.netPayable, 0);

  /* ---- submit state ---- */
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitErrorDetails, setSubmitErrorDetails] = useState<string[]>([]);

  const parseAmount = (s: string): number => {
    const cleaned = String(s ?? '').replace(/[^\d.-]/g, '');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  };

  const submitInvoice = async (status: 'Draft' | 'Pending Approval') => {
    setSubmitError(null);
    setSubmitErrorDetails([]);

    if (!vendorId) {
      setSubmitError('Pick a vendor before submitting.');
      return;
    }
    if (!selectedEntityId) {
      setSubmitError('Bill-to Entity is required.');
      return;
    }
    if (!invoiceDate) {
      setSubmitError('Invoice Date is required.');
      return;
    }

    const payload = {
      invoice_date: invoiceDate,
      vendor_id: vendorId,
      vendor_name: vendorName,
      vendor_code: vendorCode,
      invoice_type: 'non_po' as const,
      total_amount: parseAmount(grossAmount || '0'),
      currency: invoiceCurrency,
      entity_id: selectedEntityId,
      status: status === 'Draft' ? 'draft' : 'pending_approval',
      lifecycle_state: status === 'Draft' ? 'Ingested' : 'Under Verification',
      line_items: lineItems,
    };

    setSubmitting(true);
    try {
      const res = await mysqlApiRequest<{ success: boolean; data: { id: string } }>('/invoices', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res?.success) {
        setSubmitError('Failed to save invoice.');
        return;
      }
      navigate('/invoices');
    } catch (err) {
      const apiErr = err as { message?: string; details?: string[] };
      if (Array.isArray(apiErr?.details) && apiErr.details.length > 0) {
        setSubmitErrorDetails(apiErr.details);
        setSubmitError('Server rejected the invoice:');
      } else {
        setSubmitError(apiErr?.message || 'Failed to save invoice.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = () => void submitInvoice('Draft');
  const handleSubmitForApproval = () => void submitInvoice('Pending Approval');

  /* ---- drag-drop handlers ---- */
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const onDragLeave = useCallback(() => setIsDragging(false), []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file)
      setUploadedFile({ name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB` });
  }, []);
  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file)
      setUploadedFile({ name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB` });
  }, []);

  /* ---- add / remove line item ---- */
  const addLineItem = useCallback(() => {
    setLineItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        itemName: '',
        itemCode: '',
        itemDescription: '',
        ocrItem: '',
        ocrConfidence: 'Low',
        glCode: '',
        qty: 0,
        rate: 0,
        amount: 0,
        gstPercent: 18,
        cgst: 0,
        sgst: 0,
        igst: 0,
        cess: 0,
        totalGst: 0,
        grossAmount: 0,
        tdsSection: '',
        tdsPercent: 0,
        tdsAmount: 0,
        lowerTds: false,
        sec206: '',
        netPayable: 0,
        costCenter: '',
        profitCenter: '',
        shipTo: '',
        projectCode: '',
      },
    ]);
  }, []);

  const removeLineItem = useCallback((id: string) => {
    setLineItems((prev) => prev.filter((l) => l.id !== id));
  }, []);

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <div style={S.wrapper}>
      {/* ──────────── HEADER BAR ──────────── */}
      <header style={S.headerBar}>
        <div style={S.headerLeft}>
          <button
            className="btn-secondary"
            style={{ padding: '6px 10px', border: 'none', background: 'transparent' }}
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft size={20} color="var(--color-mercury-grey)" />
          </button>
          <div>
            <h1 style={S.headerTitle}>Create Vendor Invoice — Non PO</h1>
            <p style={S.headerSubtitle}>Direct expense entry without purchase order</p>
          </div>
        </div>
        <div style={S.headerRight}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleSaveDraft}
            disabled={submitting}
          >
            <Save size={16} /> {submitting ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmitForApproval}
            disabled={submitting}
          >
            <Send size={16} /> {submitting ? 'Submitting…' : 'Submit for Approval'}
          </button>
        </div>
      </header>

      {submitError && (
        <div
          role="alert"
          style={{
            padding: '12px 24px',
            background: '#FCEBEB',
            borderBottom: '1px solid #F09595',
            color: '#791F1F',
            fontSize: 13,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 500 }}>{submitError}</div>
              {submitErrorDetails.length > 0 && (
                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                  {submitErrorDetails.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────── BODY ──────────── */}
      <div style={S.body}>
        {/* ═══════ LEFT PANEL — Document ═══════ */}
        <aside style={S.leftPanel(leftCollapsed)}>
          {!leftCollapsed && (
            <>
              <div style={S.leftPanelHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={18} color="var(--color-teal-dark)" />
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-ink)' }}>
                    Invoice Document
                  </span>
                </div>
                <button
                  onClick={() => setLeftCollapsed(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                  aria-label="Collapse document panel"
                >
                  <ChevronLeft size={20} color="var(--color-mercury-grey)" />
                </button>
              </div>

              <div style={S.leftPanelScroll}>
                {/* ---- File upload zone / file info ---- */}
                {!uploadedFile ? (
                  <div
                    style={S.uploadZone(isDragging)}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      style={{ display: 'none' }}
                      onChange={onFileSelect}
                    />
                    <Upload
                      size={32}
                      color="var(--color-mercury-grey)"
                      style={{ marginBottom: 8 }}
                    />
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: 'var(--color-ink)',
                        margin: '8px 0 4px',
                      }}
                    >
                      Drag & drop invoice file
                    </p>
                    <p style={S.textSmall}>PDF, JPG, PNG up to 10 MB</p>
                  </div>
                ) : (
                  <>
                    {/* File info card */}
                    <div style={S.fileCard}>
                      <FileText size={20} color="var(--color-success-dark)" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: 'var(--color-ink)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {uploadedFile.name}
                        </div>
                        <div style={S.textSmall}>{uploadedFile.size}</div>
                      </div>
                      <button
                        onClick={() => setUploadedFile(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 4,
                        }}
                        aria-label="Remove file"
                      >
                        <X size={16} color="var(--color-mercury-grey)" />
                      </button>
                    </div>

                    {/* Collapsible document preview */}
                    <div style={{ marginBottom: 20 }}>
                      <button
                        onClick={() => setPreviewExpanded(!previewExpanded)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: 13,
                          fontWeight: 500,
                          color: 'var(--color-teal-dark)',
                        }}
                      >
                        <Eye size={14} />
                        {previewExpanded ? 'Hide Preview' : 'Show Preview'}
                        {previewExpanded ? (
                          <ChevronLeft size={14} style={{ transform: 'rotate(-90deg)' }} />
                        ) : (
                          <ChevronRight size={14} style={{ transform: 'rotate(90deg)' }} />
                        )}
                      </button>
                      {previewExpanded && (
                        <div
                          style={{
                            marginTop: 10,
                            height: 360,
                            background: 'var(--color-cloud)',
                            border: '1px solid var(--color-silver)',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-mercury-grey)',
                            fontSize: 14,
                          }}
                        >
                          <div style={{ textAlign: 'center' }}>
                            <FileText
                              size={32}
                              color="var(--color-silver)"
                              style={{ marginBottom: 8 }}
                            />
                            <div>PDF Preview</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ---- Capture Mode ---- */}
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--color-ink)',
                      marginBottom: 10,
                    }}
                  >
                    Capture Mode
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* OCR */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        border: `1px solid ${captureMode === 'ocr' ? 'var(--color-teal)' : 'var(--color-silver)'}`,
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: captureMode === 'ocr' ? 'var(--color-teal-tint)' : '#fff',
                      }}
                      onClick={() => setCaptureMode('ocr')}
                    >
                      <div style={S.radio(captureMode === 'ocr')} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)' }}>
                          OCR
                        </div>
                        <div style={S.textSmall}>Recommended — auto-extract fields</div>
                      </div>
                    </label>
                    {/* Manual */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        border: `1px solid ${captureMode === 'manual' ? 'var(--color-teal)' : 'var(--color-silver)'}`,
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: captureMode === 'manual' ? 'var(--color-teal-tint)' : '#fff',
                      }}
                      onClick={() => setCaptureMode('manual')}
                    >
                      <div style={S.radio(captureMode === 'manual')} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)' }}>
                          Manual Entry
                        </div>
                        <div style={S.textSmall}>Enter all fields manually</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* ---- OCR Status ---- */}
                {captureMode === 'ocr' && uploadedFile && (
                  <div style={S.ocrStatusCard}>
                    <CheckCircle size={20} color="var(--color-success-dark)" />
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'var(--color-success-dark)',
                        }}
                      >
                        OCR Completed
                      </div>
                      <div style={S.textSmall}>
                        Fields auto-filled &bull; {lineItems.length} items extracted
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </aside>

        {/* ═══════ RIGHT PANEL — Form ═══════ */}
        <main style={S.rightPanel}>
          {/* Restore button when left panel is collapsed */}
          {leftCollapsed && (
            <button
              style={S.restoreBtn}
              onClick={() => setLeftCollapsed(false)}
              aria-label="Restore document panel"
            >
              <ChevronRight size={18} color="var(--color-teal-dark)" />
            </button>
          )}

          <div style={S.rightPanelContent}>
            {/* ═══════════ SECTION 1: Vendor & Organizational Details ═══════════ */}
            <div style={S.sectionCard}>
              <div style={S.sectionHeader}>
                <div style={S.sectionIcon}>
                  <Building2 size={18} />
                </div>
                <h2 style={S.sectionTitle}>Vendor &amp; Organizational Details</h2>
              </div>
              <div style={S.grid2}>
                {/* 1. Bill-to Entity (FIRST — drives vendor filtering) */}
                <div>
                  <div style={S.fieldLabel}>
                    <span>Bill-to Entity</span>
                    <span style={S.required}>*</span> {entityName && <OcrBadge />}
                  </div>
                  <select
                    className="px-select"
                    value={entityName}
                    onChange={(e) => {
                      const name = e.target.value;
                      setEntityName(name);
                      const ent = activeEntities.find(
                        (ee: any) => (ee.name || ee.legalName) === name
                      );
                      if (ent) {
                        setBillToGstin((ent as any).gstin || '');
                        setBillingLocation((ent as any).name || (ent as any).legalName || '');
                        // Auto-set currency from entity
                        setInvoiceCurrency((ent as any).currency || 'INR');
                        // Reset dependent fields when entity changes
                        setVendorName('');
                        setVendorId('');
                        setVendorCode('');
                        setVendorGstin('');
                        setVendorPan('');
                        setVendorGroup('');
                        setVendorState('');
                        setDepartment('');
                        setSubDepartment('');
                      }
                    }}
                  >
                    <option value="">Select entity...</option>
                    {activeEntities.map((e: any) => (
                      <option key={e.id} value={e.name || e.legalName}>
                        {e.name || e.legalName}
                        {e.country ? ` — ${e.country}` : ''}
                      </option>
                    ))}
                    {entityName &&
                      !activeEntities.some((e: any) => (e.name || e.legalName) === entityName) && (
                        <option value={entityName}>{entityName} (OCR extracted)</option>
                      )}
                  </select>
                </div>
                {/* 2. Bill-to GSTIN (auto from entity) */}
                <div>
                  <div style={S.fieldLabel}>
                    <span>Bill-to GSTIN</span> {billToGstin && <AutoBadge />}
                  </div>
                  <input className="px-input-readonly" readOnly value={billToGstin || '—'} />
                </div>
                {/* 3. Vendor (filtered by selected entity) */}
                <div>
                  <div style={S.fieldLabel}>
                    <span>Vendor</span>
                    <span style={S.required}>*</span> {vendorName && <OcrBadge />}
                  </div>
                  <select
                    className="px-select"
                    value={vendorName}
                    onChange={(e) => {
                      const name = e.target.value;
                      setVendorName(name);
                      const v = activeVendors.find((vv: any) => (vv.name || vv.legalName) === name);
                      if (v) {
                        setVendorId((v as any).id || '');
                        setVendorCode((v as any).code || '');
                        setVendorGstin((v as any).gstin || (v as any).vendorGstin || '');
                        setVendorPan((v as any).pan || (v as any).panNumber || '');
                        setVendorGroup((v as any).group || (v as any).vendorGroup || '');
                        const gstin = (v as any).gstin || '';
                        if (gstin.length >= 2) setVendorState(getStateFromGstin(gstin));
                      } else {
                        setVendorId('');
                        setVendorCode('');
                      }
                    }}
                  >
                    <option value="">Select vendor...</option>
                    {filteredVendors.map((v: any) => (
                      <option key={v.id} value={v.name || v.legalName}>
                        {v.name || v.legalName}
                        {v.code ? ` (${v.code})` : ''}
                      </option>
                    ))}
                    {vendorName &&
                      !activeVendors.some((v: any) => (v.name || v.legalName) === vendorName) && (
                        <option value={vendorName}>{vendorName} (OCR extracted)</option>
                      )}
                  </select>
                </div>
                {/* 4. Vendor Group (auto) */}
                <div>
                  <div style={S.fieldLabel}>
                    <span>Vendor Group</span> <AutoBadge />
                  </div>
                  <input className="px-input-readonly" readOnly value={vendorGroup || '—'} />
                </div>
                {/* 5. Vendor GSTIN (auto from vendor) */}
                <div>
                  <div style={S.fieldLabel}>
                    <span>Vendor GSTIN</span> {vendorGstin && <AutoBadge />}
                  </div>
                  <input className="px-input-readonly" readOnly value={vendorGstin || '—'} />
                </div>
                {/* 6. Vendor PAN (auto from vendor) */}
                <div>
                  <div style={S.fieldLabel}>
                    <span>Vendor PAN</span> {vendorPan && <AutoBadge />}
                  </div>
                  <input className="px-input-readonly" readOnly value={vendorPan || '—'} />
                </div>
                {/* Vendor State (auto from GSTIN) */}
                <div>
                  <div style={S.fieldLabel}>
                    <span>Vendor State</span> <AutoBadge />
                  </div>
                  <input
                    className="px-input-readonly"
                    readOnly
                    value={vendorState || (vendorGstin ? getStateFromGstin(vendorGstin) : '—')}
                  />
                </div>
                {/* Billing Location (auto from entity) */}
                <div>
                  <div style={S.fieldLabel}>
                    <span>Billing Location</span>
                    <span style={S.required}>*</span>
                  </div>
                  <input
                    className="px-input"
                    value={billingLocation}
                    onChange={(e) => setBillingLocation(e.target.value)}
                    placeholder="Enter billing location..."
                  />
                </div>
                {/* e-Invoice Toggle + Verify */}
                <div>
                  <div style={S.fieldLabel}>
                    <span>e-Invoice</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Toggle value={eInvoice} onChange={setEInvoice} />
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 12px' }}>
                      Verify e-Invoice / GST Returns
                    </button>
                    {verificationStatus === 'verified' && (
                      <span
                        className="badge-success"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <CheckCircle size={12} /> Verified
                      </span>
                    )}
                  </div>
                </div>
                {/* Currency (auto-set from entity, filtered by entity mapping) */}
                <div>
                  <div style={S.fieldLabel}>
                    <span>Currency</span> <AutoBadge />
                  </div>
                  <select
                    className="px-select"
                    value={invoiceCurrency}
                    onChange={(e) => setInvoiceCurrency(e.target.value)}
                  >
                    <option value="">Select currency...</option>
                    {filteredCurrencies.map((c: any) => (
                      <option key={c.id} value={c.code}>
                        {c.code}
                        {c.name ? ` — ${c.name}` : ''}
                        {c.code === selectedEntityCurrency ? ' (Entity default)' : ''}
                      </option>
                    ))}
                    {invoiceCurrency &&
                      !filteredCurrencies.some((c: any) => c.code === invoiceCurrency) && (
                        <option value={invoiceCurrency}>{invoiceCurrency}</option>
                      )}
                  </select>
                </div>
                {/* Department (from Department Master) */}
                <div>
                  <div style={S.fieldLabel}>
                    <span>Department</span>
                    <span style={S.required}>*</span>
                  </div>
                  <select
                    className="px-select"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option value="">Select department...</option>
                    {filteredDepartments.map((d: any) => (
                      <option key={d.id} value={d.deptName || d.name}>
                        {d.deptName || d.name}
                        {d.deptCode || d.code ? ` (${d.deptCode || d.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Sub-Department */}
                <div>
                  <div style={S.fieldLabel}>
                    <span>Sub-Department</span>
                  </div>
                  <select
                    className="px-select"
                    value={subDepartment}
                    onChange={(e) => setSubDepartment(e.target.value)}
                  >
                    <option value="">Select sub-department...</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ═══════════ SECTION 2: Invoice Details ═══════════ */}
            <div style={S.sectionCard}>
              <div style={S.sectionHeader}>
                <div style={S.sectionIcon}>
                  <DollarSign size={18} />
                </div>
                <h2 style={S.sectionTitle}>Invoice Details</h2>
              </div>
              <div style={S.grid2}>
                {/* Invoice Number (system-generated) */}
                <div>
                  <div style={S.fieldLabel}>
                    <span>Invoice Number</span> <AutoBadge />
                  </div>
                  <input
                    className="px-input-readonly"
                    readOnly
                    value={invoiceNumber}
                    placeholder="Auto-generated on save"
                  />
                </div>
                {/* Payment Due Date */}
                <div>
                  <div style={S.fieldLabel}>
                    <span>Payment Due Date</span>
                    <span style={S.required}>*</span>
                  </div>
                  <input
                    className="px-input"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                {/* Invoice Date */}
                <div>
                  <div style={S.fieldLabel}>
                    <span>Invoice Date</span>
                    <span style={S.required}>*</span> {invoiceDate && <OcrBadge />}
                  </div>
                  <input
                    className="px-input"
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
                {/* Gross Amount */}
                <div>
                  <div style={S.fieldLabel}>
                    <span>Gross Amount (Incl. Taxes)</span>
                    <span style={S.required}>*</span> {grossAmount && <OcrBadge />}
                  </div>
                  <input
                    className="px-input"
                    value={grossAmount || formatCurrency(totalGross)}
                    onChange={(e) => setGrossAmount(e.target.value)}
                    style={{ fontWeight: 600 }}
                  />
                </div>
                {/* Payment Terms */}
                <div>
                  <div style={S.fieldLabel}>
                    <span>Payment Terms</span> {paymentTerms && <OcrBadge />}
                  </div>
                  <input
                    className="px-input"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="e.g. Net 30"
                  />
                </div>
                {/* Base Amount */}
                <div>
                  <div style={S.fieldLabel}>
                    <span>Base Amount (Excl. Taxes)</span>
                    <span style={S.required}>*</span> {baseAmount && <OcrBadge />}
                  </div>
                  <input
                    className="px-input"
                    value={baseAmount || formatCurrency(totalBase)}
                    onChange={(e) => setBaseAmount(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* ═══════════ SECTION 3: Item / Expense Details ═══════════ */}
            <div style={S.sectionCard}>
              <div style={S.sectionHeader}>
                <div style={S.sectionIcon}>
                  <Package size={18} />
                </div>
                <h2 style={S.sectionTitle}>Item / Expense Details</h2>
              </div>
              <div style={S.tableWrap}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={{ ...S.th, ...S.thSticky }}>Item Name</th>
                      <th style={S.th}>Item Code</th>
                      <th style={S.th}>Description</th>
                      <th style={S.th}>OCR Item</th>
                      <th style={S.th}>OCR Status</th>
                      <th style={S.th}>GL Code</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>Qty</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>Rate</th>
                      <th
                        style={{
                          ...S.th,
                          textAlign: 'right',
                          background: 'var(--color-teal-tint)',
                        }}
                      >
                        Amount
                      </th>
                      <th style={{ ...S.th, textAlign: 'right' }}>GST%</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>CGST</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>SGST</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>IGST</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>CESS</th>
                      <th
                        style={{
                          ...S.th,
                          textAlign: 'right',
                          background: 'var(--color-success-light)',
                        }}
                      >
                        Total GST
                      </th>
                      <th style={{ ...S.th, textAlign: 'right', background: 'var(--color-cloud)' }}>
                        Gross Amt
                      </th>
                      <th style={S.th}>TDS Section</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>TDS%</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>TDS Amt</th>
                      <th style={S.th}>Lower TDS</th>
                      <th style={S.th}>Sec 206</th>
                      <th
                        style={{
                          ...S.th,
                          textAlign: 'right',
                          background: 'var(--color-warning-light)',
                          fontWeight: 700,
                        }}
                      >
                        Net Payable
                      </th>
                      <th style={S.th}>Cost Center</th>
                      <th style={S.th}>Profit Center</th>
                      <th style={S.th}>Ship To</th>
                      <th style={S.th}>Project Code</th>
                      <th style={{ ...S.th, textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item) => (
                      <tr key={item.id}>
                        <td style={{ ...S.td, ...S.tdSticky }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: 160,
                                display: 'inline-block',
                              }}
                            >
                              {item.itemName}
                            </span>
                            <OcrBadge />
                          </div>
                        </td>
                        <td style={S.td}>
                          <span style={S.monospace}>{item.itemCode}</span>
                        </td>
                        <td
                          style={{
                            ...S.td,
                            maxWidth: 180,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.itemDescription}
                        </td>
                        <td
                          style={{
                            ...S.td,
                            fontStyle: 'italic',
                            color: 'var(--color-mercury-grey)',
                          }}
                        >
                          {item.ocrItem}
                        </td>
                        <td style={S.td}>
                          <ConfBadge level={item.ocrConfidence} />
                        </td>
                        <td style={S.td}>
                          <span style={S.monospace}>{item.glCode}</span>
                        </td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{item.qty.toLocaleString()}</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{formatCurrency(item.rate)}</td>
                        <td
                          style={{
                            ...S.td,
                            textAlign: 'right',
                            background: 'var(--color-teal-tint)',
                            fontWeight: 500,
                          }}
                        >
                          {formatCurrency(item.amount)}
                        </td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{item.gstPercent}%</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{formatCurrency(item.cgst)}</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{formatCurrency(item.sgst)}</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{formatCurrency(item.igst)}</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{formatCurrency(item.cess)}</td>
                        <td
                          style={{
                            ...S.td,
                            textAlign: 'right',
                            background: 'var(--color-success-light)',
                            fontWeight: 500,
                          }}
                        >
                          {formatCurrency(item.totalGst)}
                        </td>
                        <td
                          style={{
                            ...S.td,
                            textAlign: 'right',
                            background: 'var(--color-cloud)',
                            fontWeight: 500,
                          }}
                        >
                          {formatCurrency(item.grossAmount)}
                        </td>
                        <td style={S.td}>{item.tdsSection}</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{item.tdsPercent}%</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>
                          {formatCurrency(item.tdsAmount)}
                        </td>
                        <td style={{ ...S.td, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={item.lowerTds}
                            onChange={() => {
                              setLineItems((prev) =>
                                prev.map((l) =>
                                  l.id === item.id ? { ...l, lowerTds: !l.lowerTds } : l
                                )
                              );
                            }}
                            style={{ width: 16, height: 16, accentColor: 'var(--color-teal)' }}
                          />
                        </td>
                        <td style={S.td}>{item.sec206}</td>
                        <td
                          style={{
                            ...S.td,
                            textAlign: 'right',
                            background: 'var(--color-warning-light)',
                            fontWeight: 700,
                          }}
                        >
                          {formatCurrency(item.netPayable)}
                        </td>
                        <td style={S.td}>
                          <span style={S.monospace}>{item.costCenter}</span>
                        </td>
                        <td style={S.td}>
                          <span style={S.monospace}>{item.profitCenter}</span>
                        </td>
                        <td style={S.td}>{item.shipTo}</td>
                        <td style={S.td}>
                          <span style={S.monospace}>{item.projectCode}</span>
                        </td>
                        <td style={{ ...S.td, textAlign: 'center' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              justifyContent: 'center',
                            }}
                          >
                            <button
                              className="btn-secondary"
                              style={{ padding: '4px 10px', fontSize: 12 }}
                            >
                              <Eye size={12} /> Review
                            </button>
                            <button
                              onClick={() => removeLineItem(item.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 4,
                                color: 'var(--color-error)',
                              }}
                              aria-label="Delete row"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Add row */}
              <button
                className="btn-secondary"
                style={{ marginTop: 16, fontSize: 13 }}
                onClick={addLineItem}
              >
                <Plus size={14} /> Add Line Item
              </button>
            </div>

            {/* ═══════════ SECTION 4: GST & TDS Retention ═══════════ */}
            <div style={S.sectionCard}>
              <div style={S.sectionHeader}>
                <div style={S.sectionIcon}>
                  <Calculator size={18} />
                </div>
                <h2 style={S.sectionTitle}>GST &amp; TDS Retention</h2>
              </div>
              <div style={S.grid2}>
                {/* Retention Name */}
                <div>
                  <div style={S.fieldLabel}>
                    <span>Retention Name</span> <SuggestedBadge />
                  </div>
                  <input className="px-input" defaultValue="Quality Hold — Green Beans" />
                </div>
                {/* Retention Amount */}
                <div>
                  <div style={S.fieldLabel}>
                    <span>Retention Amount</span> <SuggestedBadge />
                  </div>
                  <input className="px-input" defaultValue="6,300.00" />
                </div>
                {/* Retention Reason */}
                <div style={S.fullWidth}>
                  <div style={S.fieldLabel}>
                    <span>Retention Reason</span> <SuggestedBadge />
                  </div>
                  <input
                    className="px-input"
                    defaultValue="10% retention pending quality inspection clearance (per contract CL-2026-019)"
                    style={{ width: '100%' }}
                  />
                </div>
                {/* Expected Payment Date */}
                <div>
                  <div style={S.fieldLabel}>
                    <span>Expected Payment Date</span> <SuggestedBadge />
                  </div>
                  <input className="px-input" type="date" defaultValue="2026-06-10" />
                </div>
              </div>
            </div>

            {/* ═══════════ SECTION 5: Narration & Period ═══════════ */}
            <div style={S.sectionCard}>
              <div style={S.sectionHeader}>
                <div style={S.sectionIcon}>
                  <MessageSquare size={18} />
                </div>
                <h2 style={S.sectionTitle}>Narration &amp; Period</h2>
              </div>
              <div style={S.grid2}>
                {/* Expense Period From */}
                <div>
                  <div style={S.fieldLabel}>
                    <span>Expense Period From</span>
                  </div>
                  <input
                    className="px-input"
                    type="date"
                    value={expenseFrom}
                    onChange={(e) => setExpenseFrom(e.target.value)}
                  />
                </div>
                {/* Expense Period To */}
                <div>
                  <div style={S.fieldLabel}>
                    <span>Expense Period To</span>
                  </div>
                  <input
                    className="px-input"
                    type="date"
                    value={expenseTo}
                    onChange={(e) => setExpenseTo(e.target.value)}
                  />
                </div>
                {/* Narration */}
                <div style={S.fullWidth}>
                  <div style={S.fieldLabel}>
                    <span>Narration</span> {narration && <OcrBadge />}
                  </div>
                  <textarea
                    className="px-input"
                    rows={6}
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                    placeholder="Add notes or description..."
                    style={{
                      height: 'auto',
                      padding: '10px 12px',
                      resize: 'vertical',
                      lineHeight: 1.5,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
