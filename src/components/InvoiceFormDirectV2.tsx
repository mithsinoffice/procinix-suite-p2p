import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Save, Send, FileText, Building2, DollarSign, Package, Calculator,
  MessageSquare, TrendingUp, ChevronLeft, ChevronRight, Upload, CheckCircle,
  X, Eye, Plus, Trash2, AlertTriangle, Info, Clock, Shield
} from 'lucide-react';

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

interface AccountingEntry {
  account: string;
  amount: number;
}

interface ApprovalLevel {
  level: number;
  title: string;
  approver: string;
  role: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/* ═══════════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════════ */

const MOCK_LINE_ITEMS: LineItem[] = [
  {
    id: '1',
    itemName: 'Green Coffee Beans — Ethiopia Yirgacheffe',
    itemCode: 'RM-COF-001',
    itemDescription: 'Single origin, washed process, Grade 1',
    ocrItem: 'Ethiopian Yirgacheffe Coffee Beans',
    ocrConfidence: 'High',
    glCode: '5001-10',
    qty: 50,
    rate: 1200,
    amount: 60000,
    gstPercent: 5,
    cgst: 1500,
    sgst: 1500,
    igst: 0,
    cess: 0,
    totalGst: 3000,
    grossAmount: 63000,
    tdsSection: '194C',
    tdsPercent: 2,
    tdsAmount: 1200,
    lowerTds: false,
    sec206: 'N/A',
    netPayable: 61800,
    costCenter: 'CC-ROAST-01',
    profitCenter: 'PC-MUM-01',
    shipTo: 'Mumbai Roastery',
    projectCode: 'PRJ-2026-Q2',
  },
  {
    id: '2',
    itemName: 'Packaging — 250g Kraft Bags',
    itemCode: 'PK-BAG-250',
    itemDescription: 'Kraft paper bags with valve, matte finish',
    ocrItem: 'Kraft Bags 250g w/ Valve',
    ocrConfidence: 'Medium',
    glCode: '5002-20',
    qty: 2000,
    rate: 12,
    amount: 24000,
    gstPercent: 18,
    cgst: 2160,
    sgst: 2160,
    igst: 0,
    cess: 0,
    totalGst: 4320,
    grossAmount: 28320,
    tdsSection: '194C',
    tdsPercent: 2,
    tdsAmount: 480,
    lowerTds: false,
    sec206: 'N/A',
    netPayable: 27840,
    costCenter: 'CC-PKG-01',
    profitCenter: 'PC-MUM-01',
    shipTo: 'Mumbai Warehouse',
    projectCode: 'PRJ-2026-Q2',
  },
];

const APPROVAL_LEVELS: ApprovalLevel[] = [
  {
    level: 1,
    title: 'Department Head',
    approver: 'Rahul Mehta',
    role: 'Operations Manager',
    color: 'var(--color-teal-dark)',
    bgColor: 'var(--color-teal-tint)',
    borderColor: 'var(--color-teal)',
  },
  {
    level: 2,
    title: 'Finance Controller',
    approver: 'Priya Sharma',
    role: 'Finance Head',
    color: 'var(--color-warning-dark)',
    bgColor: 'var(--color-warning-light)',
    borderColor: 'var(--color-warning)',
  },
  {
    level: 3,
    title: 'CFO Approval',
    approver: 'Vikram Desai',
    role: 'Chief Financial Officer',
    color: 'var(--color-error-dark)',
    bgColor: 'var(--color-error-light)',
    borderColor: 'var(--color-error)',
  },
];

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
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
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
    <div style={S.toggleTrack(value)} onClick={() => onChange(!value)} role="switch" aria-checked={value}>
      <div style={S.toggleThumb(value)} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
  '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
  '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa',
  '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar',
  '36': 'Telangana', '37': 'Andhra Pradesh',
};

function getStateFromGstin(gstin: string): string {
  if (!gstin || gstin.length < 2) return '';
  return GST_STATE_CODES[gstin.substring(0, 2)] || '';
}

export function InvoiceFormDirectV2() {
  const navigate = useNavigate();
  const location = useLocation();

  /* ---- AI invoice hydration state ---- */
  const [aiInvoiceData, setAiInvoiceData] = useState<any>(null);
  const [aiHydrated, setAiHydrated] = useState(false);

  /* ---- panel state ---- */
  const [leftCollapsed, setLeftCollapsed] = useState(false);

  /* ---- file upload ---- */
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>({
    name: 'subko_invoice_2026_0042.pdf',
    size: '2.4 MB',
  });
  const [isDragging, setIsDragging] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---- capture mode ---- */
  const [captureMode, setCaptureMode] = useState<'ocr' | 'manual'>('ocr');

  /* ---- form toggles ---- */
  const [eInvoice, setEInvoice] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'verified' | 'pending'>('verified');

  /* ---- line items ---- */
  const [lineItems, setLineItems] = useState<LineItem[]>(MOCK_LINE_ITEMS);

  /* ---- drawer ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* ---- form field state (populated by AI or manual entry) ---- */
  const [vendorName, setVendorName] = useState('');
  const [vendorGroup, setVendorGroup] = useState('');
  const [entityName, setEntityName] = useState('');
  const [vendorLocation, setVendorLocation] = useState('');
  const [vendorGstin, setVendorGstin] = useState('');
  const [vendorState, setVendorState] = useState('');
  const [vendorPan, setVendorPan] = useState('');
  const [billingLocation, setBillingLocation] = useState('');
  const [billToGstin, setBillToGstin] = useState('');
  const [invoiceCurrency, setInvoiceCurrency] = useState('INR');
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

  /* ---- Hydrate from AI-ingested invoice ---- */
  useEffect(() => {
    const state = location.state as { fromAI?: boolean; dbId?: string } | null;
    if (!state?.fromAI || !state?.dbId || aiHydrated) return;

    const fetchAIInvoice = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8787/api/invoices/${state.dbId}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!json.success) return;
        const inv = json.data;
        const meta = inv.metadata?.extractedData || {};
        setAiInvoiceData(inv);

        // ── Populate every form field from DB/OCR data ──
        setVendorName(inv.vendor_name || '');
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
        setGrossAmount(inv.total_amount ? `${inv.currency || '₹'} ${Number(inv.total_amount).toLocaleString('en-IN')}` : '');
        setBaseAmount(inv.subtotal ? `${inv.currency || '₹'} ${Number(inv.subtotal).toLocaleString('en-IN')}` : '');
        setPaymentTerms(inv.payment_terms || meta.payment_terms || '');
        setNarration(inv.notes || meta.notes || '');

        // Bank details → retention suggestion
        const bank = meta.bank_details || inv.bank_details;
        if (bank?.bank_name) {
          setRetentionName(`Payment via ${bank.bank_name}`);
        }

        // Line items
        if (Array.isArray(inv.line_items) && inv.line_items.length > 0) {
          setLineItems(inv.line_items.map((li: any, i: number) => {
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
          }));
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

  /* ---- derived accounting entries ---- */
  const totalBase = lineItems.reduce((s, l) => s + l.amount, 0);
  const totalGst = lineItems.reduce((s, l) => s + l.totalGst, 0);
  const totalGross = lineItems.reduce((s, l) => s + l.grossAmount, 0);
  const totalTds = lineItems.reduce((s, l) => s + l.tdsAmount, 0);
  const totalNet = lineItems.reduce((s, l) => s + l.netPayable, 0);

  const debitEntries: AccountingEntry[] = [
    { account: 'Raw Material Purchases (5001-10)', amount: 60000 },
    { account: 'Packaging Supplies (5002-20)', amount: 24000 },
    { account: 'Input CGST Receivable (1301)', amount: 3660 },
    { account: 'Input SGST Receivable (1302)', amount: 3660 },
  ];
  const creditEntries: AccountingEntry[] = [
    { account: 'Vendor Payable — Subko (2101)', amount: totalNet },
    { account: 'TDS Payable — 194C (2201)', amount: totalTds },
  ];
  const debitTotal = debitEntries.reduce((s, e) => s + e.amount, 0);
  const creditTotal = creditEntries.reduce((s, e) => s + e.amount, 0);

  /* ---- ESC to close drawer ---- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) setDrawerOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [drawerOpen]);

  /* ---- drag-drop handlers ---- */
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback(() => setIsDragging(false), []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setUploadedFile({ name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB` });
  }, []);
  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadedFile({ name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB` });
  }, []);

  /* ---- add / remove line item ---- */
  const addLineItem = useCallback(() => {
    setLineItems(prev => [
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
    setLineItems(prev => prev.filter(l => l.id !== id));
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
          <button className="btn-secondary">
            <Save size={16} /> Save Draft
          </button>
          <button className="btn-primary">
            <Send size={16} /> Submit for Approval
          </button>
        </div>
      </header>

      {/* ──────────── BODY ──────────── */}
      <div style={S.body}>
        {/* ═══════ LEFT PANEL — Document ═══════ */}
        <aside style={S.leftPanel(leftCollapsed)}>
          {!leftCollapsed && (
            <>
              <div style={S.leftPanelHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={18} color="var(--color-teal-dark)" />
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-ink)' }}>Invoice Document</span>
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
                    <Upload size={32} color="var(--color-mercury-grey)" style={{ marginBottom: 8 }} />
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)', margin: '8px 0 4px' }}>
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
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {uploadedFile.name}
                        </div>
                        <div style={S.textSmall}>{uploadedFile.size}</div>
                      </div>
                      <button
                        onClick={() => setUploadedFile(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
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
                          display: 'flex', alignItems: 'center', gap: 6, background: 'none',
                          border: 'none', cursor: 'pointer', padding: 0, fontSize: 13,
                          fontWeight: 500, color: 'var(--color-teal-dark)',
                        }}
                      >
                        <Eye size={14} />
                        {previewExpanded ? 'Hide Preview' : 'Show Preview'}
                        {previewExpanded ? <ChevronLeft size={14} style={{ transform: 'rotate(-90deg)' }} /> : <ChevronRight size={14} style={{ transform: 'rotate(90deg)' }} />}
                      </button>
                      {previewExpanded && (
                        <div
                          style={{
                            marginTop: 10, height: 360, background: 'var(--color-cloud)',
                            border: '1px solid var(--color-silver)', borderRadius: 8,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--color-mercury-grey)', fontSize: 14,
                          }}
                        >
                          <div style={{ textAlign: 'center' }}>
                            <FileText size={32} color="var(--color-silver)" style={{ marginBottom: 8 }} />
                            <div>PDF Preview</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ---- Capture Mode ---- */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 10 }}>
                    Capture Mode
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* OCR */}
                    <label
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                        border: `1px solid ${captureMode === 'ocr' ? 'var(--color-teal)' : 'var(--color-silver)'}`,
                        borderRadius: 8, cursor: 'pointer',
                        background: captureMode === 'ocr' ? 'var(--color-teal-tint)' : '#fff',
                      }}
                      onClick={() => setCaptureMode('ocr')}
                    >
                      <div style={S.radio(captureMode === 'ocr')} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)' }}>OCR</div>
                        <div style={S.textSmall}>Recommended — auto-extract fields</div>
                      </div>
                    </label>
                    {/* Manual */}
                    <label
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                        border: `1px solid ${captureMode === 'manual' ? 'var(--color-teal)' : 'var(--color-silver)'}`,
                        borderRadius: 8, cursor: 'pointer',
                        background: captureMode === 'manual' ? 'var(--color-teal-tint)' : '#fff',
                      }}
                      onClick={() => setCaptureMode('manual')}
                    >
                      <div style={S.radio(captureMode === 'manual')} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)' }}>Manual Entry</div>
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
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-success-dark)' }}>
                        OCR Completed
                      </div>
                      <div style={S.textSmall}>Fields auto-filled &bull; {lineItems.length} items extracted</div>
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
                <div style={S.sectionIcon}><Building2 size={18} /></div>
                <h2 style={S.sectionTitle}>Vendor &amp; Organizational Details</h2>
              </div>
              <div style={S.grid2}>
                {/* Vendor */}
                <div>
                  <div style={S.fieldLabel}><span>Vendor</span><span style={S.required}>*</span> {vendorName && <OcrBadge />}</div>
                  <input className="px-input" value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Select or enter vendor..." />
                </div>
                {/* Vendor Group */}
                <div>
                  <div style={S.fieldLabel}><span>Vendor Group</span> <AutoBadge /></div>
                  <input className="px-input-readonly" readOnly value={vendorGroup || '—'} />
                </div>
                {/* Entity (Bill-to) */}
                <div>
                  <div style={S.fieldLabel}><span>Bill-to Entity</span><span style={S.required}>*</span> {entityName && <OcrBadge />}</div>
                  <input className="px-input" value={entityName} onChange={(e) => setEntityName(e.target.value)} placeholder="Enter entity..." />
                </div>
                {/* Bill-to GSTIN */}
                <div>
                  <div style={S.fieldLabel}><span>Bill-to GSTIN</span> {billToGstin && <OcrBadge />}</div>
                  <input className="px-input" value={billToGstin} onChange={(e) => setBillToGstin(e.target.value)} placeholder="e.g. 27AAQCP4516R1ZJ" />
                </div>
                {/* Vendor GSTIN */}
                <div>
                  <div style={S.fieldLabel}><span>Vendor GSTIN</span> {vendorGstin && <OcrBadge />}</div>
                  <input className="px-input" value={vendorGstin} onChange={(e) => setVendorGstin(e.target.value)} placeholder="15-char GST number" />
                </div>
                {/* Vendor PAN */}
                <div>
                  <div style={S.fieldLabel}><span>Vendor PAN</span> {vendorPan && <OcrBadge />}</div>
                  <input className="px-input" value={vendorPan} onChange={(e) => setVendorPan(e.target.value)} placeholder="e.g. AACCW2231J" />
                </div>
                {/* Vendor State */}
                <div>
                  <div style={S.fieldLabel}><span>Vendor State</span> <AutoBadge /></div>
                  <input className="px-input-readonly" readOnly value={vendorState || (vendorGstin ? getStateFromGstin(vendorGstin) : '—')} />
                </div>
                {/* Billing Location */}
                <div>
                  <div style={S.fieldLabel}><span>Billing Location</span><span style={S.required}>*</span></div>
                  <input className="px-input" value={billingLocation} onChange={(e) => setBillingLocation(e.target.value)} placeholder="Enter billing location..." />
                </div>
                {/* e-Invoice Toggle + Verify */}
                <div>
                  <div style={S.fieldLabel}><span>e-Invoice</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Toggle value={eInvoice} onChange={setEInvoice} />
                    <button
                      className="btn-secondary"
                      style={{ fontSize: 12, padding: '4px 12px' }}
                    >
                      Verify e-Invoice / GST Returns
                    </button>
                    {verificationStatus === 'verified' && (
                      <span className="badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={12} /> Verified
                      </span>
                    )}
                  </div>
                </div>
                {/* Currency */}
                <div>
                  <div style={S.fieldLabel}><span>Currency</span> {invoiceCurrency && <OcrBadge />}</div>
                  <select className="px-select" value={invoiceCurrency} onChange={(e) => setInvoiceCurrency(e.target.value)}>
                    <option value="INR">INR — Indian Rupee</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — British Pound</option>
                    <option value="AED">AED — UAE Dirham</option>
                    <option value="SGD">SGD — Singapore Dollar</option>
                  </select>
                </div>
                {/* Department */}
                <div>
                  <div style={S.fieldLabel}><span>Department</span><span style={S.required}>*</span></div>
                  <select className="px-select" defaultValue="ops">
                    <option value="">Select department...</option>
                    <option value="ops">Operations</option>
                    <option value="fin">Finance</option>
                  </select>
                </div>
                {/* Sub-Department */}
                <div>
                  <div style={S.fieldLabel}><span>Sub-Department</span><span style={S.required}>*</span></div>
                  <select className="px-select" defaultValue="roast">
                    <option value="">Select sub-department...</option>
                    <option value="roast">Roasting</option>
                    <option value="pkg">Packaging</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ═══════════ SECTION 2: Invoice Details ═══════════ */}
            <div style={S.sectionCard}>
              <div style={S.sectionHeader}>
                <div style={S.sectionIcon}><DollarSign size={18} /></div>
                <h2 style={S.sectionTitle}>Invoice Details</h2>
              </div>
              <div style={S.grid2}>
                {/* Invoice Number */}
                <div>
                  <div style={S.fieldLabel}><span>Invoice Number</span><span style={S.required}>*</span> {invoiceNumber && <OcrBadge />}</div>
                  <input className="px-input" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="e.g. INV-2026-0042" />
                </div>
                {/* Payment Due Date */}
                <div>
                  <div style={S.fieldLabel}><span>Payment Due Date</span><span style={S.required}>*</span></div>
                  <input className="px-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                {/* Invoice Date */}
                <div>
                  <div style={S.fieldLabel}><span>Invoice Date</span><span style={S.required}>*</span> {invoiceDate && <OcrBadge />}</div>
                  <input className="px-input" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                </div>
                {/* Gross Amount */}
                <div>
                  <div style={S.fieldLabel}><span>Gross Amount (Incl. Taxes)</span><span style={S.required}>*</span> {grossAmount && <OcrBadge />}</div>
                  <input className="px-input" value={grossAmount || formatCurrency(totalGross)} onChange={(e) => setGrossAmount(e.target.value)} style={{ fontWeight: 600 }} />
                </div>
                {/* Payment Terms */}
                <div>
                  <div style={S.fieldLabel}><span>Payment Terms</span> {paymentTerms && <OcrBadge />}</div>
                  <input className="px-input" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g. Net 30" />
                </div>
                {/* Base Amount */}
                <div>
                  <div style={S.fieldLabel}><span>Base Amount (Excl. Taxes)</span><span style={S.required}>*</span> {baseAmount && <OcrBadge />}</div>
                  <input className="px-input" value={baseAmount || formatCurrency(totalBase)} onChange={(e) => setBaseAmount(e.target.value)} />
                </div>
              </div>
            </div>

            {/* ═══════════ SECTION 3: Item / Expense Details ═══════════ */}
            <div style={S.sectionCard}>
              <div style={S.sectionHeader}>
                <div style={S.sectionIcon}><Package size={18} /></div>
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
                      <th style={{ ...S.th, textAlign: 'right', background: 'var(--color-teal-tint)' }}>Amount</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>GST%</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>CGST</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>SGST</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>IGST</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>CESS</th>
                      <th style={{ ...S.th, textAlign: 'right', background: 'var(--color-success-light)' }}>Total GST</th>
                      <th style={{ ...S.th, textAlign: 'right', background: 'var(--color-cloud)' }}>Gross Amt</th>
                      <th style={S.th}>TDS Section</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>TDS%</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>TDS Amt</th>
                      <th style={S.th}>Lower TDS</th>
                      <th style={S.th}>Sec 206</th>
                      <th style={{ ...S.th, textAlign: 'right', background: 'var(--color-warning-light)', fontWeight: 700 }}>Net Payable</th>
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
                            <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160, display: 'inline-block' }}>{item.itemName}</span>
                            <OcrBadge />
                          </div>
                        </td>
                        <td style={S.td}><span style={S.monospace}>{item.itemCode}</span></td>
                        <td style={{ ...S.td, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.itemDescription}</td>
                        <td style={{ ...S.td, fontStyle: 'italic', color: 'var(--color-mercury-grey)' }}>{item.ocrItem}</td>
                        <td style={S.td}><ConfBadge level={item.ocrConfidence} /></td>
                        <td style={S.td}><span style={S.monospace}>{item.glCode}</span></td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{item.qty.toLocaleString()}</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{formatCurrency(item.rate)}</td>
                        <td style={{ ...S.td, textAlign: 'right', background: 'var(--color-teal-tint)', fontWeight: 500 }}>{formatCurrency(item.amount)}</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{item.gstPercent}%</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{formatCurrency(item.cgst)}</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{formatCurrency(item.sgst)}</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{formatCurrency(item.igst)}</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{formatCurrency(item.cess)}</td>
                        <td style={{ ...S.td, textAlign: 'right', background: 'var(--color-success-light)', fontWeight: 500 }}>{formatCurrency(item.totalGst)}</td>
                        <td style={{ ...S.td, textAlign: 'right', background: 'var(--color-cloud)', fontWeight: 500 }}>{formatCurrency(item.grossAmount)}</td>
                        <td style={S.td}>{item.tdsSection}</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{item.tdsPercent}%</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{formatCurrency(item.tdsAmount)}</td>
                        <td style={{ ...S.td, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={item.lowerTds}
                            onChange={() => {
                              setLineItems(prev => prev.map(l => l.id === item.id ? { ...l, lowerTds: !l.lowerTds } : l));
                            }}
                            style={{ width: 16, height: 16, accentColor: 'var(--color-teal)' }}
                          />
                        </td>
                        <td style={S.td}>{item.sec206}</td>
                        <td style={{ ...S.td, textAlign: 'right', background: 'var(--color-warning-light)', fontWeight: 700 }}>{formatCurrency(item.netPayable)}</td>
                        <td style={S.td}><span style={S.monospace}>{item.costCenter}</span></td>
                        <td style={S.td}><span style={S.monospace}>{item.profitCenter}</span></td>
                        <td style={S.td}>{item.shipTo}</td>
                        <td style={S.td}><span style={S.monospace}>{item.projectCode}</span></td>
                        <td style={{ ...S.td, textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                            <button
                              className="btn-secondary"
                              style={{ padding: '4px 10px', fontSize: 12 }}
                            >
                              <Eye size={12} /> Review
                            </button>
                            <button
                              onClick={() => removeLineItem(item.id)}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
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
                <div style={S.sectionIcon}><Calculator size={18} /></div>
                <h2 style={S.sectionTitle}>GST &amp; TDS Retention</h2>
              </div>
              <div style={S.grid2}>
                {/* Retention Name */}
                <div>
                  <div style={S.fieldLabel}><span>Retention Name</span> <SuggestedBadge /></div>
                  <input className="px-input" defaultValue="Quality Hold — Green Beans" />
                </div>
                {/* Retention Amount */}
                <div>
                  <div style={S.fieldLabel}><span>Retention Amount</span> <SuggestedBadge /></div>
                  <input className="px-input" defaultValue="6,300.00" />
                </div>
                {/* Retention Reason */}
                <div style={S.fullWidth}>
                  <div style={S.fieldLabel}><span>Retention Reason</span> <SuggestedBadge /></div>
                  <input className="px-input" defaultValue="10% retention pending quality inspection clearance (per contract CL-2026-019)" style={{ width: '100%' }} />
                </div>
                {/* Expected Payment Date */}
                <div>
                  <div style={S.fieldLabel}><span>Expected Payment Date</span> <SuggestedBadge /></div>
                  <input className="px-input" type="date" defaultValue="2026-06-10" />
                </div>
              </div>
            </div>

            {/* ═══════════ SECTION 5: Narration & Period ═══════════ */}
            <div style={S.sectionCard}>
              <div style={S.sectionHeader}>
                <div style={S.sectionIcon}><MessageSquare size={18} /></div>
                <h2 style={S.sectionTitle}>Narration &amp; Period</h2>
              </div>
              <div style={S.grid2}>
                {/* Expense Period From */}
                <div>
                  <div style={S.fieldLabel}><span>Expense Period From</span></div>
                  <input className="px-input" type="date" value={expenseFrom} onChange={(e) => setExpenseFrom(e.target.value)} />
                </div>
                {/* Expense Period To */}
                <div>
                  <div style={S.fieldLabel}><span>Expense Period To</span></div>
                  <input className="px-input" type="date" value={expenseTo} onChange={(e) => setExpenseTo(e.target.value)} />
                </div>
                {/* Narration */}
                <div style={S.fullWidth}>
                  <div style={S.fieldLabel}><span>Narration</span> {narration && <OcrBadge />}</div>
                  <textarea
                    className="px-input"
                    rows={6}
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                    placeholder="Add notes or description..."
                    style={{ height: 'auto', padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 }}
                  />
                </div>
              </div>
            </div>

            {/* ═══════════ SECTION 6: Accounting Entry Preview ═══════════ */}
            <div style={S.sectionCard}>
              <div style={S.sectionHeader}>
                <div style={S.sectionIcon}><TrendingUp size={18} /></div>
                <h2 style={S.sectionTitle}>Accounting Entry Preview</h2>
              </div>
              <div style={S.accountingGrid}>
                {/* Debit Side */}
                <div style={{ border: '1px solid var(--color-silver)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{
                    padding: '10px 16px', background: 'var(--color-teal-tint)', color: 'var(--color-teal-dark)',
                    fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between',
                  }}>
                    <span>Debit</span><span>Amount</span>
                  </div>
                  {debitEntries.map((e, i) => (
                    <div key={i} style={S.accountingRow}>
                      <span>{e.account}</span>
                      <span style={{ fontWeight: 500 }}>{formatCurrency(e.amount)}</span>
                    </div>
                  ))}
                  <div style={S.accountingTotal}>
                    <span>Total Debit</span>
                    <span>{formatCurrency(debitTotal)}</span>
                  </div>
                </div>

                {/* Credit Side */}
                <div style={{ border: '1px solid var(--color-silver)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{
                    padding: '10px 16px', background: 'var(--color-error-light)', color: 'var(--color-error-dark)',
                    fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between',
                  }}>
                    <span>Credit</span><span>Amount</span>
                  </div>
                  {creditEntries.map((e, i) => (
                    <div key={i} style={S.accountingRow}>
                      <span>{e.account}</span>
                      <span style={{ fontWeight: 500 }}>{formatCurrency(e.amount)}</span>
                    </div>
                  ))}
                  <div style={S.accountingTotal}>
                    <span>Total Credit</span>
                    <span>{formatCurrency(creditTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{
                marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', background: 'var(--color-cloud)', borderRadius: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Info size={14} color="var(--color-mercury-grey)" />
                  <span style={S.textMuted}>Posting Mode: Accrual basis &bull; Auto-reversed on payment</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
                    Net Payable:
                  </span>
                  <span style={{
                    fontSize: 15, fontWeight: 700, color: 'var(--color-teal-dark)',
                    padding: '2px 12px', background: 'var(--color-teal-tint)', borderRadius: 6,
                  }}>
                    {formatCurrency(totalNet)}
                  </span>
                </div>
              </div>
            </div>

            {/* ═══════════ SECTION 7: Workflow Preview ═══════════ */}
            <div style={S.sectionCard}>
              <div style={S.sectionHeader}>
                <div style={S.sectionIcon}><Shield size={18} /></div>
                <h2 style={S.sectionTitle}>Workflow Preview</h2>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge-teal">{APPROVAL_LEVELS.length} Approvers</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={14} color="var(--color-mercury-grey)" />
                    <span style={S.textMuted}>SLA: 48 hours</span>
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(true)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontSize: 14, fontWeight: 500, color: 'var(--color-teal-dark)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  View Details <ChevronRight size={16} />
                </button>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* ═══════════ WORKFLOW DRAWER ═══════════ */}
      {/* Backdrop */}
      <div
        style={S.backdrop(drawerOpen)}
        onClick={() => setDrawerOpen(false)}
      />
      {/* Drawer */}
      <div style={S.drawer(drawerOpen)}>
        {/* Drawer Header */}
        <div style={S.drawerHeader}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--color-ink)' }}>
            Workflow Details
          </h3>
          <button
            onClick={() => setDrawerOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            aria-label="Close drawer"
          >
            <X size={20} color="var(--color-mercury-grey)" />
          </button>
        </div>

        {/* Drawer Body */}
        <div style={S.drawerBody}>
          {/* Approval Levels */}
          <div style={S.mb24}>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 14px' }}>
              Approval Levels
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {APPROVAL_LEVELS.map((lvl) => (
                <div
                  key={lvl.level}
                  style={{
                    padding: '14px 16px',
                    background: lvl.bgColor,
                    border: `1px solid ${lvl.borderColor}`,
                    borderRadius: 8,
                    borderLeft: `4px solid ${lvl.borderColor}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: lvl.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Level {lvl.level} — {lvl.title}
                    </span>
                    <span style={{
                      fontSize: 11, padding: '1px 8px', borderRadius: 9999,
                      background: lvl.borderColor, color: '#fff', fontWeight: 600,
                    }}>
                      Pending
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)' }}>
                    {lvl.approver}
                  </div>
                  <div style={S.textSmall}>{lvl.role}</div>
                </div>
              ))}
            </div>
          </div>

          {/* SLA & Escalations */}
          <div style={S.mb24}>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 14px' }}>
              SLA &amp; Escalations
            </h4>
            <div style={{
              padding: 16, background: 'var(--color-cloud)', borderRadius: 8,
              border: '1px solid var(--color-silver)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={S.textMuted}>Total SLA</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>48 hours</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={S.textMuted}>Per-level SLA</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)' }}>16 hours each</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={S.textMuted}>Escalation</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-warning-dark)' }}>
                  Auto-escalate after 4 hrs
                </span>
              </div>
            </div>
          </div>

          {/* Routing Rules */}
          <div style={S.mb24}>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 14px' }}>
              Routing Rules
            </h4>
            <div style={{
              padding: 16, background: 'var(--color-cloud)', borderRadius: 8,
              border: '1px solid var(--color-silver)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <AlertTriangle size={14} color="var(--color-warning-dark)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 13, color: 'var(--color-ink)' }}>
                  Invoice amount exceeds department threshold. CFO approval (Level 3) added automatically.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Info size={14} color="var(--color-teal-dark)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 13, color: 'var(--color-ink)' }}>
                  Non-PO invoices above INR 50,000 require Finance Controller sign-off.
                </span>
              </div>
            </div>
          </div>

          {/* Audit Trail Preview */}
          <div style={S.mb24}>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 14px' }}>
              Audit Trail Preview
            </h4>
            <div style={{
              padding: 16, background: 'var(--color-cloud)', borderRadius: 8,
              border: '1px solid var(--color-silver)',
            }}>
              {[
                { time: 'Just now', action: 'Invoice created via OCR capture', user: 'You' },
                { time: 'Auto', action: 'OCR extracted 2 line items (High/Med confidence)', user: 'System' },
                { time: 'Auto', action: 'GST validation passed — GSTIN verified', user: 'System' },
                { time: 'Pending', action: 'Awaiting Level 1 approval', user: 'Rahul Mehta' },
              ].map((entry, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 12, padding: '8px 0',
                  borderBottom: i < 3 ? '1px solid var(--color-silver)' : 'none',
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: 'var(--color-mercury-grey)',
                    minWidth: 60, flexShrink: 0,
                  }}>
                    {entry.time}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--color-ink)' }}>{entry.action}</div>
                    <div style={S.textSmall}>{entry.user}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Policy Information */}
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 14px' }}>
              Policy Information
            </h4>
            <div style={{
              padding: 16, background: 'var(--color-teal-tint)', borderRadius: 8,
              border: '1px solid var(--color-teal)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <Shield size={14} color="var(--color-teal-dark)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 13, color: 'var(--color-ink)', fontWeight: 500 }}>
                  Non-PO Procurement Policy v3.2
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 38, fontSize: 13, color: 'var(--color-ink)', lineHeight: 1.8 }}>
                <li>Maximum single invoice value: INR 5,00,000</li>
                <li>Mandatory e-Invoice verification for GST-registered vendors</li>
                <li>TDS deduction required for services above INR 30,000</li>
                <li>Retention clause applicable for new vendors (first 3 invoices)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
