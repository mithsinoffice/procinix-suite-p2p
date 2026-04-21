import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import {
  type UserMasterRecord,
  normalizeUserMasterRecord,
  getPrimaryEntityIdForUser,
  getUserAccessibleEntityIds,
} from '../types/userMaster';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Save, Send, FileText, Building2, DollarSign, Package, Calculator,
  MessageSquare, TrendingUp, ChevronLeft, ChevronRight, Upload, CheckCircle,
  X, Eye, Plus, Trash2, AlertTriangle, Info, Clock, Shield, Loader2, AlertCircle, User,
} from 'lucide-react';
import { useMasterData } from '../contexts/MasterDataContext';
import { isRecordMappedToEntity } from '../lib/masters/entityMapping';
import { DepartmentSelector } from './shared/DepartmentSelector';
import { OCRBanner } from './OCR/OCRBanner';
import { OCRFieldWrapper } from './OCR/OCRFieldWrapper';
import { OCRLearningPanel } from './OCR/OCRLearningPanel';
import { OCRScoreCards } from './OCR/OCRScoreCards';
import type { OCRCorrection, OCRInvoiceScores } from '../types/ocr';
import { JournalEntryPreview, TDSThresholdTracker } from './invoice';

function authHeaders(): Record<string, string> {
  const key = localStorage.getItem('apiSecretKey');
  return key ? { Authorization: `Bearer ${key}` } : {};
}

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

const MOCK_LINE_ITEMS: LineItem[] = [];

const APPROVAL_LEVELS: ApprovalLevel[] = [];

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
  body: (collapsed: boolean): React.CSSProperties => ({
    display: 'grid',
    gridTemplateColumns: collapsed ? '0 1fr' : '420px 1fr',
    gap: 0,
    alignItems: 'start',
    minHeight: '100vh',
  }),
  /* ---------- left panel ---------- */
  leftPanel: (collapsed: boolean): React.CSSProperties => ({
    width: collapsed ? 0 : 420,
    minWidth: collapsed ? 0 : 420,
    maxWidth: collapsed ? 0 : 420,
    background: '#fff',
    borderRight: collapsed ? 'none' : '0.5px solid #E1E6EA',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto' as const,
    position: 'sticky' as const,
    top: 0,
    height: '100vh',
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
    padding: 24,
  },
  rightPanelContent: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: 0,
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

function createFallbackOcrScores(): OCRInvoiceScores {
  const fields = {
    user: { value: null, confidence: 0.35, ocr_raw: null, match_status: 'not_found', conflict_candidates: [], validation_passed: false, validation_message: 'Enter manually' },
    entity: { value: null, confidence: 0.72, ocr_raw: 'Subko Coffee Pvt Ltd', match_status: 'conflict', conflict_candidates: [{ value: 'Subko Coffee Pvt Ltd', score: 0.92, source: 'entity_master' }], validation_passed: false, validation_message: 'Entity differs from master selection' },
    bill_to_gstin: { value: null, confidence: 0.35, ocr_raw: null, match_status: 'not_found', conflict_candidates: [], validation_passed: false, validation_message: null },
    vendor_name: { value: null, confidence: 0.72, ocr_raw: 'ACME SUPPLIES PVT. LIMITED', match_status: 'conflict', conflict_candidates: [{ value: 'Acme Supplies Pvt Ltd', score: 0.92, source: 'vendor_master' }], validation_passed: false, validation_message: 'Name differs from vendor master' },
    vendor_gstin: { value: null, confidence: 0.65, ocr_raw: '27AABCA1234B125', match_status: 'conflict', conflict_candidates: [{ value: '27AABCA1234B1Z5', score: 0.95, source: 'vendor_master' }], validation_passed: false, validation_message: 'GSTIN differs from vendor master' },
    vendor_pan: { value: null, confidence: 1, ocr_raw: null, match_status: 'not_found', conflict_candidates: [], validation_passed: true, validation_message: null },
    vendor_state: { value: null, confidence: 1, ocr_raw: null, match_status: 'not_found', conflict_candidates: [], validation_passed: true, validation_message: null },
    billing_location: { value: null, confidence: 0.35, ocr_raw: null, match_status: 'not_found', conflict_candidates: [], validation_passed: false, validation_message: null },
    department: { value: null, confidence: 0.38, ocr_raw: 'Admin & Facilities', match_status: 'low_confidence', conflict_candidates: [{ value: 'Administration', score: 0.55 }, { value: 'Facilities Management', score: 0.48 }], validation_passed: false, validation_message: 'No exact match in department master' },
    invoice_number: { value: null, confidence: 0.42, ocr_raw: null, match_status: 'low_confidence', conflict_candidates: [], validation_passed: false, validation_message: null },
    invoice_date: { value: null, confidence: 0.42, ocr_raw: null, match_status: 'low_confidence', conflict_candidates: [{ value: '2026-04-09', score: 0.75, context: "near 'Invoice Date'" }], validation_passed: false, validation_message: 'Multiple dates found' },
    due_date: { value: null, confidence: 0.35, ocr_raw: null, match_status: 'not_found', conflict_candidates: [], validation_passed: false, validation_message: null },
    total_amount: { value: null, confidence: 0.99, ocr_raw: '125000', match_status: 'matched', conflict_candidates: [], validation_passed: true, validation_message: null },
    tax_amount: { value: null, confidence: 0.99, ocr_raw: '22500', match_status: 'matched', conflict_candidates: [], validation_passed: true, validation_message: null },
    currency: { value: 'INR', confidence: 1, ocr_raw: 'INR', match_status: 'matched', conflict_candidates: [], validation_passed: true, validation_message: null },
    payment_terms: { value: null, confidence: 0.35, ocr_raw: null, match_status: 'not_found', conflict_candidates: [], validation_passed: false, validation_message: null },
  } as any;
  return {
    overall_confidence: 0.68,
    fields_matched: 3,
    fields_conflicted: 3,
    fields_low_confidence: 3,
    fields_not_found: 7,
    touchless_eligible: false,
    fields,
  };
}

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
    getExchangeRate,
  } = useMasterData();

  const [userMasterRecords, , userMasterHydrating] = useIncrementalMasterRecords<UserMasterRecord>(
    'user_master',
    []
  );

  const [masterItems] = useIncrementalMasterRecords<Record<string, unknown>>('item_master', []);
  const [tdsSectionRecords] = useIncrementalMasterRecords<Record<string, unknown>>('tds_section_master', []);
  const activeTdsSections = useMemo(
    () =>
      (tdsSectionRecords as any[]).filter(
        (section) =>
          String(section?.status ?? 'Active') === 'Active' &&
          String(section?.approvalStatus ?? 'Approved') === 'Approved'
      ),
    [tdsSectionRecords]
  );
  const defaultTdsConfig = activeTdsSections[0];

  const activeVendors = useMemo(() => allVendors.filter((v: any) => v.status === 'Active' || v.isActive), [allVendors]);
  const activeEntities = useMemo(() => allEntities.filter((e: any) => e.isActive !== false), [allEntities]);

  const normalizedInvoiceUsers = useMemo(
    () => userMasterRecords.map((u) => normalizeUserMasterRecord(u)),
    [userMasterRecords]
  );

  const pickableInvoiceUsers = useMemo(
    () =>
      normalizedInvoiceUsers.filter(
        (u) =>
          u.status === 'Active' &&
          u.approvalStatus !== 'Rejected' &&
          u.approvalStatus !== 'Pending'
      ),
    [normalizedInvoiceUsers]
  );

  /* ---- AI invoice hydration state ---- */
  const [aiInvoiceData, setAiInvoiceData] = useState<any>(null);
  const [aiHydrated, setAiHydrated] = useState(false);
  const [ocrSourceVendorName, setOcrSourceVendorName] = useState('');
  const [ocrSourceVendorGstin, setOcrSourceVendorGstin] = useState('');
  const [ocrSourceEntityName, setOcrSourceEntityName] = useState('');
  const [ocrSourceDepartment, setOcrSourceDepartment] = useState('');
  const [ocrVendorMappingWarning, setOcrVendorMappingWarning] = useState('');
  const [ocrLearningMessage, setOcrLearningMessage] = useState('');
  const [ocrScores, setOcrScores] = useState<OCRInvoiceScores | null>(null);
  const [pendingCorrections, setPendingCorrections] = useState<OCRCorrection[]>([]);

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
  const [eInvoice, setEInvoice] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'verified' | 'pending'>('pending');

  /* ---- line items ---- */
  const [lineItems, setLineItems] = useState<LineItem[]>(MOCK_LINE_ITEMS);

  /* ---- drawer ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* ---- form field state (populated by AI or manual entry) ---- */
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorGroup, setVendorGroup] = useState('');
  /** Legal entity for this invoice: drives vendor / department / currency filters and bill-to GSTIN. */
  const [entityName, setEntityName] = useState(() => currentCompany?.name || '');
  const [vendorLocation, setVendorLocation] = useState('');
  const [vendorGstin, setVendorGstin] = useState('');
  const [vendorState, setVendorState] = useState('');
  const [vendorPan, setVendorPan] = useState('');
  const [billingLocation, setBillingLocation] = useState(() => currentCompany?.name || '');
  const [billToGstin, setBillToGstin] = useState(() => (currentCompany as any)?.gstin || '');
  const [invoiceCurrency, setInvoiceCurrency] = useState(() => (currentCompany as any)?.currency || 'INR');
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
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);
  const [pdfPreviewError, setPdfPreviewError] = useState('');
  const pdfObjectUrlRef = useRef<string | null>(null);

  const setPreviewUrl = useCallback((nextUrl: string) => {
    if (pdfObjectUrlRef.current && pdfObjectUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(pdfObjectUrlRef.current);
    }
    pdfObjectUrlRef.current = nextUrl || null;
    setPdfPreviewUrl(nextUrl);
  }, []);

  const loadInvoicePdfPreview = useCallback(async (invoiceId: string) => {
    if (!invoiceId) return;
    setPdfPreviewLoading(true);
    setPdfPreviewError('');
    try {
      const baseUrl = `/api/invoices/${invoiceId}/pdf`;
      let res = await fetch(baseUrl, { headers: authHeaders() });
      if (!res.ok) {
        // Retry once with cache busting for intermittent stale route/file mount conditions.
        const retryUrl = `${baseUrl}?t=${Date.now()}`;
        res = await fetch(retryUrl, { headers: authHeaders() });
      }
      if (!res.ok) throw new Error('Source PDF not available');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err: any) {
      setPreviewUrl('');
      setPdfPreviewError(err?.message || 'Unable to load PDF preview');
    } finally {
      setPdfPreviewLoading(false);
    }
  }, [setPreviewUrl]);

  const applyEntitySelection = useCallback(
    (name: string) => {
      setEntityName(name);
      const ent = activeEntities.find((ee: any) => (ee.name || ee.legalName) === name);
      if (ent) {
        setBillToGstin((ent as any).gstin || '');
        setBillingLocation((ent as any).name || (ent as any).legalName || '');
        setInvoiceCurrency((ent as any).currency || 'INR');
        setVendorName('');
        setVendorGstin('');
        setVendorPan('');
        setVendorGroup('');
        setVendorState('');
        setDepartment('');
        setSubDepartment('');
      }
    },
    [activeEntities]
  );

  const applyEntityById = useCallback(
    (entityId: string) => {
      const ent = activeEntities.find((e: any) => e.id === entityId);
      if (!ent) return;
      applyEntitySelection((ent as any).name || (ent as any).legalName || '');
    },
    [activeEntities, applyEntitySelection]
  );

  const entityOptionsForInvoice = useMemo(() => {
    if (!selectedUserId) return activeEntities;
    const u = pickableInvoiceUsers.find((x) => x.id === selectedUserId);
    if (!u) return activeEntities;
    const allowed = getUserAccessibleEntityIds(u);
    if (allowed.length === 0) return activeEntities;
    return activeEntities.filter((e: any) => allowed.includes(e.id));
  }, [selectedUserId, pickableInvoiceUsers, activeEntities]);

  /* ---- Entity-derived filtering (must be after all useState) ---- */
  const selectedEntityObj = useMemo(() => activeEntities.find((e: any) => (e.name || e.legalName) === entityName), [activeEntities, entityName]);
  const selectedEntityId = selectedEntityObj?.id;
  const selectedEntityCurrency = (selectedEntityObj as any)?.currency;

  const filteredCurrencies = useMemo(() => {
    if (!selectedEntityId) return allCurrencies.filter((c: any) => c.isActive !== false);
    return allCurrencies.filter((c: any) => {
      if (c.isActive === false) return false;
      if (c.code === selectedEntityCurrency) return true;
      return isRecordMappedToEntity(c, selectedEntityId);
    });
  }, [allCurrencies, selectedEntityId, selectedEntityCurrency]);

  const filteredVendors = useMemo(() => {
    if (!selectedEntityId) return activeVendors;
    return activeVendors.filter((v: any) => isRecordMappedToEntity(v, selectedEntityId));
  }, [activeVendors, selectedEntityId]);

  /** Drop master vendor if bill-to entity does not include them (fixes OCR / stale state vs. entityId-only masters). */
  useEffect(() => {
    if (!selectedEntityId || !vendorName.trim()) return;
    const resolved = activeVendors.find((v: any) => (v.name || v.legalName) === vendorName);
    if (!resolved) return;
    if (!isRecordMappedToEntity(resolved, selectedEntityId)) {
      setVendorName('');
      setVendorGstin('');
      setVendorPan('');
      setVendorGroup('');
      setVendorState('');
    }
  }, [selectedEntityId, vendorName, activeVendors]);

  /** Clear department when it is not valid for the selected bill-to entity (e.g. India vs Dubai lists). */
  useEffect(() => {
    if (!department.trim()) return;
    if (!selectedEntityId) return;
    const allowed = allDepartments.filter(
      (d: any) =>
        d.isActive !== false &&
        (d as { status?: string }).status !== 'Inactive' &&
        isRecordMappedToEntity(d, selectedEntityId)
    );
    const ok = allowed.some((d: any) => d.name === department);
    if (!ok) {
      setDepartment('');
      setSubDepartment('');
    }
  }, [selectedEntityId, department, allDepartments]);

  /* ---- Hydrate from AI-ingested invoice ---- */
  useEffect(() => {
    const state = location.state as { fromAI?: boolean; dbId?: string } | null;
    if (!state?.fromAI || !state?.dbId || aiHydrated) return;

    const fetchAIInvoice = async () => {
      try {
        const res = await fetch(`/api/invoices/${state.dbId}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!json.success) return;
        const inv = json.data;
        const meta = inv.metadata?.extractedData || {};
        setAiInvoiceData(inv);
        try {
          const scoreRes = await fetch(`/api/invoices/${state.dbId}/ocr-scores`);
          if (scoreRes.ok) {
            const scoreJson = await scoreRes.json();
            const scorePayload = scoreJson?.data || null;
            setOcrScores(scorePayload);
            const matchedFields = Object.entries(scorePayload?.fields || {}).filter(([, s]: any) => s?.match_status === 'matched');
            for (const [key, score] of matchedFields as [string, any][]) {
              const value = String(score?.value || '');
              if (!value) continue;
              if (key === 'invoice_number') setInvoiceNumber(value);
              if (key === 'invoice_date') setInvoiceDate(value);
              if (key === 'due_date') setDueDate(value);
              if (key === 'payment_terms') setPaymentTerms(value);
              if (key === 'currency') setInvoiceCurrency(value);
            }
          }
        } catch {
          // non-blocking
        }

        // ── Master-first hydration: entity/vendor fields must resolve from master records only ──
        const incomingEntityName = inv.bill_to_entity || meta.bill_to_entity || '';
        const incomingDepartment = String(meta.department || inv.department || '').trim();
        setOcrSourceEntityName(incomingEntityName || '');
        setOcrSourceDepartment(incomingDepartment || '');
        let finalEntityName = incomingEntityName || '';
        if (incomingEntityName) {
          try {
            const entityResolveParams = new URLSearchParams({
              mapping_type: 'entity',
              entity_name: '',
              source_value: incomingEntityName,
            });
            const entityResolveRes = await fetch(`/api/ap/field-learning/resolve?${entityResolveParams.toString()}`);
            if (entityResolveRes.ok) {
              const entityResolveJson = await entityResolveRes.json();
              const learnedEntity = String(entityResolveJson?.mapping?.mapped_value || '').trim();
              if (learnedEntity) {
                finalEntityName = learnedEntity;
                setOcrLearningMessage('Applied learned entity mapping from previous correction.');
              }
            }
          } catch {
            // continue with direct entity match
          }
          const entityRecord = activeEntities.find(
            (e: any) => (e.name || e.legalName) === finalEntityName
          );
          if (entityRecord) {
            applyEntitySelection(finalEntityName);
          }
        }

        const incomingVendorName = inv.vendor_name || meta.vendor_name || '';
        const incomingVendorGstin = inv.vendor_gstin || meta.vendor_gstin || '';
        setOcrSourceVendorName(incomingVendorName);
        setOcrSourceVendorGstin(incomingVendorGstin);
        const targetEntityId = activeEntities.find(
          (e: any) => (e.name || e.legalName) === (finalEntityName || entityName)
        )?.id;
        const candidateVendors = targetEntityId
          ? activeVendors.filter((v: any) => isRecordMappedToEntity(v, targetEntityId))
          : activeVendors;
        let resolvedVendor: any = null;
        try {
          const resolveParams = new URLSearchParams({
            entity_name: incomingEntityName || entityName || '',
            vendor_name: incomingVendorName || '',
            vendor_gstin: incomingVendorGstin || '',
          });
          const resolveRes = await fetch(`/api/ap/vendor-learning/resolve?${resolveParams.toString()}`);
          if (resolveRes.ok) {
            const resolveJson = await resolveRes.json();
            const learnedName = String(resolveJson?.mapping?.master_vendor_name || '').trim().toLowerCase();
            if (learnedName) {
              resolvedVendor = candidateVendors.find(
                (v: any) => String((v as any).name || (v as any).legalName || '').trim().toLowerCase() === learnedName
              ) || null;
              if (resolvedVendor) {
                setOcrLearningMessage('Applied learned OCR vendor mapping from previous correction.');
              }
            }
          }
        } catch {
          // non-blocking: fallback to regular matching
        }
        if (!resolvedVendor) {
          resolvedVendor = candidateVendors.find((v: any) => {
            const vg = String((v as any).gstin || (v as any).vendorGstin || '').trim().toUpperCase();
            const vn = String((v as any).name || (v as any).legalName || '').trim().toLowerCase();
            const incomingG = String(incomingVendorGstin || '').trim().toUpperCase();
            const incomingN = String(incomingVendorName || '').trim().toLowerCase();
            return (incomingG && vg === incomingG) || (incomingN && vn === incomingN);
          }) || null;
        }

        if (resolvedVendor) {
          const resolvedName = (resolvedVendor as any).name || (resolvedVendor as any).legalName || '';
          const resolvedGstin = (resolvedVendor as any).gstin || (resolvedVendor as any).vendorGstin || '';
          setVendorName(resolvedName);
          setVendorGstin(resolvedGstin);
          setVendorPan((resolvedVendor as any).pan || (resolvedVendor as any).panNumber || '');
          setVendorGroup((resolvedVendor as any).group || (resolvedVendor as any).vendorGroup || '');
          setVendorState(resolvedGstin ? getStateFromGstin(resolvedGstin) : '');
          setOcrVendorMappingWarning('');
        } else {
          // Enforce "Vendor Master only": do not persist OCR vendor values into master-locked fields.
          setVendorName('');
          setVendorGstin('');
          setVendorPan('');
          setVendorGroup('');
          setVendorState('');
          setOcrVendorMappingWarning(
            `OCR vendor "${incomingVendorName || incomingVendorGstin || 'Unknown'}" was not found in Vendor Master for this entity. Select a Vendor Master record to map and auto-learn.`
          );
        }

        setUserName(inv.captured_by || meta.captured_by || inv.created_by || meta.created_by || '');
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

        if (incomingDepartment) {
          const availableDepartments = allDepartments.filter(
            (d: any) =>
              d.isActive !== false &&
              (d as { status?: string }).status !== 'Inactive' &&
              (!targetEntityId || isRecordMappedToEntity(d, targetEntityId))
          );
          let resolvedDepartment = availableDepartments.find((d: any) => d.name === incomingDepartment)?.name || '';
          if (!resolvedDepartment) {
            try {
              const deptResolveParams = new URLSearchParams({
                mapping_type: 'department',
                entity_name: finalEntityName || entityName || '',
                source_value: incomingDepartment,
              });
              const deptResolveRes = await fetch(`/api/ap/field-learning/resolve?${deptResolveParams.toString()}`);
              if (deptResolveRes.ok) {
                const deptResolveJson = await deptResolveRes.json();
                const learnedDepartment = String(deptResolveJson?.mapping?.mapped_value || '').trim();
                if (learnedDepartment && availableDepartments.some((d: any) => d.name === learnedDepartment)) {
                  resolvedDepartment = learnedDepartment;
                  setOcrLearningMessage((prev) =>
                    prev ? `${prev} Applied learned department mapping.` : 'Applied learned department mapping from previous correction.'
                  );
                }
              }
            } catch {
              // non-blocking
            }
          }
          if (resolvedDepartment) {
            setDepartment(resolvedDepartment);
          }
        }

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
            const inferredTdsRate = Number(li.tds_rate ?? li.tds_percent ?? 0) || 0;
            const matchedTdsSection = activeTdsSections.find((section: any) => {
              const rate = Number(section?.rateCompany ?? section?.rateIndividual ?? 0);
              return rate === inferredTdsRate;
            });
            const resolvedTdsSection = String(li.tds_section || matchedTdsSection?.sectionCode || '');
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
              tdsSection: resolvedTdsSection,
              tdsPercent: inferredTdsRate,
              tdsAmount: (amt * inferredTdsRate) / 100,
              lowerTds: false,
              sec206: false,
              netPayable: amt + gstAmt - (amt * inferredTdsRate) / 100,
              costCenter: '',
              profitCenter: '',
              shipTo: '',
              projectCode: '',
            };
          }));
        }

        // File info + PDF preview
        setUploadedFile({ name: `${inv.invoice_number || 'Invoice'}.pdf`, size: 'AI Extracted' });
        await loadInvoicePdfPreview(state.dbId);
        setCaptureMode('ocr');
        setAiHydrated(true);
        console.log('[DirectInvoice] Hydrated all fields from AI invoice:', inv.invoice_number);
      } catch (err) {
        console.error('[DirectInvoice] Failed to hydrate:', err);
      }
    };

    fetchAIInvoice();
  }, [location.state, aiHydrated, activeEntities, activeVendors, allDepartments, applyEntitySelection, entityName, loadInvoicePdfPreview, activeTdsSections]);

  /* ---- derived accounting entries ---- */
  const totalBase = lineItems.reduce((s, l) => s + l.amount, 0);
  const totalGst = lineItems.reduce((s, l) => s + l.totalGst, 0);
  const totalGross = lineItems.reduce((s, l) => s + l.grossAmount, 0);
  const totalTds = lineItems.reduce((s, l) => s + l.tdsAmount, 0);
  const totalNet = lineItems.reduce((s, l) => s + l.netPayable, 0);
  const directTdsValidationErrors = useMemo(() => {
    const errors: string[] = [];
    lineItems.forEach((item, index) => {
      const tdsPercent = Number(item.tdsPercent || 0);
      if (tdsPercent <= 0) {
        return;
      }

      if (!item.tdsSection) {
        errors.push(`Line ${index + 1}: TDS section is required when TDS rate is applied.`);
        return;
      }

      const section = activeTdsSections.find((s: any) => s.sectionCode === item.tdsSection);
      if (!section) {
        errors.push(`Line ${index + 1}: TDS section ${item.tdsSection} is inactive or not approved.`);
        return;
      }

      const thresholdAmount = Number(section.thresholdAmount || 0);
      if (thresholdAmount > 0 && Number(item.amount || 0) < thresholdAmount) {
        errors.push(
          `Line ${index + 1}: ${item.tdsSection} threshold ₹${thresholdAmount.toLocaleString('en-IN')} not met (base ₹${Number(item.amount || 0).toLocaleString('en-IN')}).`
        );
      }
    });
    return errors;
  }, [lineItems, activeTdsSections]);

  const debitEntries: AccountingEntry[] = [
    { account: 'Expense / Purchase A/c', amount: totalBase },
    { account: 'Input GST Receivable', amount: totalGst },
  ];
  const creditEntries: AccountingEntry[] = [
    { account: 'Vendor Payable', amount: totalNet },
    { account: 'TDS Payable', amount: totalTds },
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

  useEffect(() => {
    return () => {
      if (pdfObjectUrlRef.current && pdfObjectUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(pdfObjectUrlRef.current);
      }
    };
  }, []);

  /* ---- drag-drop handlers ---- */
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback(() => setIsDragging(false), []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setUploadedFile({ name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB` });
      setPdfPreviewError('');
      setPreviewUrl(URL.createObjectURL(file));
      setPreviewExpanded(true);
    }
  }, [setPreviewUrl]);
  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile({ name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB` });
      setPdfPreviewError('');
      setPreviewUrl(URL.createObjectURL(file));
      setPreviewExpanded(true);
    }
  }, [setPreviewUrl]);

  /* ---- add / remove line item ---- */
  const addLineItem = useCallback(() => {
    const defaultTdsPercent = Number(defaultTdsConfig?.rateCompany ?? defaultTdsConfig?.rateIndividual ?? 0);
    const defaultTdsSection = String(defaultTdsConfig?.sectionCode ?? '');
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
        tdsSection: defaultTdsSection,
        tdsPercent: defaultTdsPercent,
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
  }, [defaultTdsConfig]);

  const removeLineItem = useCallback((id: string) => {
    setLineItems(prev => prev.filter(l => l.id !== id));
  }, []);

  const effectiveOcrScores = useMemo(() => {
    if (ocrScores) return ocrScores;
    if (captureMode === 'ocr') return createFallbackOcrScores();
    return null;
  }, [ocrScores, captureMode]);

  const handleFieldCorrection = useCallback(async (correction: OCRCorrection) => {
    const state = location.state as { fromAI?: boolean; dbId?: string } | null;
    if (!state?.dbId) return;
    try {
      const res = await fetch(`/api/invoices/${state.dbId}/field-correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(correction),
      });
      if (!res.ok) return;
      const json = await res.json();
      setPendingCorrections((prev) => [...prev, { ...correction, id: String(json?.id || correction.id) }]);
    } catch {
      // Non-blocking.
    }
  }, [location.state]);

  const handleConfirmLearning = useCallback(async (ids: string[]) => {
    const state = location.state as { fromAI?: boolean; dbId?: string } | null;
    if (!state?.dbId || !ids.length) return;
    await fetch(`/api/invoices/${state.dbId}/confirm-learning`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correction_ids: ids }),
    });
    setPendingCorrections((prev) => prev.filter((c) => !ids.includes(c.id)));
  }, [location.state]);

  const handleConfirmAllLearnings = useCallback(async () => {
    const state = location.state as { fromAI?: boolean; dbId?: string } | null;
    if (!state?.dbId) return;
    await fetch(`/api/invoices/${state.dbId}/confirm-all-learnings`, { method: 'POST' });
    setPendingCorrections([]);
  }, [location.state]);

  const handleDiscardCorrection = useCallback(async (id: string) => {
    const state = location.state as { fromAI?: boolean; dbId?: string } | null;
    if (!state?.dbId) return;
    await fetch(`/api/invoices/${state.dbId}/discard-correction/${id}`, { method: 'DELETE' });
    setPendingCorrections((prev) => prev.filter((c) => c.id !== id));
  }, [location.state]);

  const handleAcceptAll = useCallback(() => {
    if (!effectiveOcrScores) return;
    const matched = Object.entries(effectiveOcrScores.fields).filter(([, score]) => score.match_status === 'matched');
    for (const [field, score] of matched) {
      const val = String(score.value || '');
      if (field === 'invoice_number') setInvoiceNumber(val);
      if (field === 'invoice_date') setInvoiceDate(val);
      if (field === 'due_date') setDueDate(val);
      if (field === 'vendor_name') setVendorName(val);
      if (field === 'vendor_gstin') setVendorGstin(val);
      if (field === 'vendor_pan') setVendorPan(val);
      if (field === 'vendor_state') setVendorState(val);
      if (field === 'billing_location') setBillingLocation(val);
      if (field === 'department') setDepartment(val);
      if (field === 'currency') setInvoiceCurrency(val);
      if (field === 'payment_terms') setPaymentTerms(val);
      if (field === 'bill_to_gstin') setBillToGstin(val);
      if (field === 'entity') applyEntitySelection(val);
      if (field === 'total_amount') setGrossAmount(val);
      if (field === 'tax_amount') setBaseAmount(val);
    }
  }, [effectiveOcrScores, applyEntitySelection]);

  const handleScrollToFirstConflict = useCallback(() => {
    const node = document.querySelector('.ocr-field-conflict, .ocr-field-low');
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
            className="btn-secondary"
            onClick={() => {
              alert('Invoice saved as draft');
            }}
          >
            <Save size={16} /> Save Draft
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              if (directTdsValidationErrors.length > 0) {
                alert(`Cannot Submit - TDS validation errors:\n${directTdsValidationErrors.join('\n')}`);
                return;
              }
              alert('✓ Invoice submitted for approval!');
              navigate('/invoices');
            }}
          >
            <Send size={16} /> Submit for Approval
          </button>
        </div>
      </header>

      {/* ──────────── BODY ──────────── */}
      <div style={S.body(leftCollapsed)}>
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
                            marginTop: 10, height: 'calc(100vh - 60px)', background: 'var(--color-cloud)',
                            border: '1px solid var(--color-silver)', borderRadius: 8,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--color-mercury-grey)', fontSize: 14, overflow: 'hidden',
                          }}
                        >
                          {pdfPreviewLoading ? (
                            <div style={{ textAlign: 'center' }}>
                              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
                              <div>Loading PDF preview...</div>
                            </div>
                          ) : pdfPreviewUrl ? (
                            <iframe
                              title="Invoice PDF Preview"
                              src={pdfPreviewUrl}
                              style={{ width: '100%', height: '100%', border: 'none' }}
                            />
                          ) : (
                            <div style={{ textAlign: 'center', padding: 12 }}>
                              <FileText size={32} color="var(--color-silver)" style={{ marginBottom: 8 }} />
                              <div>{pdfPreviewError || 'PDF Preview unavailable'}</div>
                            </div>
                          )}
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
            {effectiveOcrScores && (
              <>
                <OCRBanner scores={effectiveOcrScores} onAcceptAll={handleAcceptAll} onReviewConflicts={handleScrollToFirstConflict} />
                <OCRScoreCards scores={effectiveOcrScores} />
              </>
            )}

            {/* ═══════════ SECTION 1: Vendor & Organizational Details ═══════════ */}
            <div style={S.sectionCard}>
              <div style={S.sectionHeader}>
                <div style={S.sectionIcon}><Building2 size={18} /></div>
                <h2 style={S.sectionTitle}>Vendor &amp; Organizational Details</h2>
              </div>
              <div style={S.grid2}>
                {/* 1. User (User Master) — defaults entity from primary / default entity mapping */}
                <OCRFieldWrapper
                  fieldName="user"
                  label="User"
                  required
                  ocrScore={effectiveOcrScores?.fields?.user}
                  onCorrection={handleFieldCorrection}
                >
                  <div style={S.fieldLabel}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <User size={14} style={{ color: 'var(--color-mercury-grey)' }} aria-hidden />
                      User
                    </span>
                    <span style={S.required}>*</span>
                  </div>
                  <select
                    className="px-select"
                    value={selectedUserId}
                    disabled={userMasterHydrating}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedUserId(id);
                      if (!id) {
                        setUserName('');
                        return;
                      }
                      const u = pickableInvoiceUsers.find((x) => x.id === id);
                      if (u) {
                        setUserName(u.name);
                        const primaryEntityId = getPrimaryEntityIdForUser(u);
                        if (primaryEntityId) applyEntityById(primaryEntityId);
                        else {
                          const allowed = getUserAccessibleEntityIds(u);
                          if (allowed.length) applyEntityById(allowed[0]);
                        }
                      }
                    }}
                  >
                    <option value="">
                      {userMasterHydrating ? 'Loading users…' : 'Select user from User Master…'}
                    </option>
                    {pickableInvoiceUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.userCode ? `${u.userCode} — ` : ''}
                        {u.name}
                      </option>
                    ))}
                  </select>
                  {userName ? (
                    <p style={{ fontSize: 12, color: 'var(--color-mercury-grey)', marginTop: 6 }}>Captured as: {userName}</p>
                  ) : null}
                  {pickableInvoiceUsers.length === 0 && !userMasterHydrating ? (
                    <p style={{ fontSize: 12, color: 'var(--color-mercury-grey)', marginTop: 6 }}>
                      No approved active users in User Master. Add users under Masters → User Master.
                    </p>
                  ) : null}
                </OCRFieldWrapper>
                {/* 2. Entity — scoped to user&apos;s entities when a user is selected; change anytime; drives all filters */}
                <OCRFieldWrapper
                  fieldName="entity"
                  label="Entity"
                  required
                  ocrScore={effectiveOcrScores?.fields?.entity}
                  onCorrection={handleFieldCorrection}
                  onApplyValue={(value) => applyEntitySelection(value)}
                >
                  <div style={S.fieldLabel}>
                    <span>Entity</span>
                    <span style={S.required}>*</span>
                    {entityName && <OcrBadge />}
                  </div>
                  <select
                    className="px-select"
                    value={entityName}
                    onChange={(e) => {
                      const nextEntity = e.target.value;
                      applyEntitySelection(nextEntity);
                      if (aiInvoiceData && ocrSourceEntityName && nextEntity && nextEntity !== ocrSourceEntityName) {
                        fetch('/api/ap/field-learning/learn', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            mapping_type: 'entity',
                            entity_name: '',
                            source_value: ocrSourceEntityName,
                            mapped_value: nextEntity,
                            confidence: 100,
                          }),
                        })
                          .then((res) => {
                            if (res.ok) {
                              setOcrLearningMessage('Entity learning saved. Next similar OCR entity will auto-map.');
                            }
                          })
                          .catch(() => {});
                      }
                    }}
                  >
                    <option value="">Select entity...</option>
                    {entityOptionsForInvoice.map((e: any) => (
                      <option key={e.id} value={e.name || e.legalName}>
                        {e.name || e.legalName}
                        {e.country ? ` — ${e.country}` : ''}
                      </option>
                    ))}
                    {entityName &&
                      !entityOptionsForInvoice.some((e: any) => (e.name || e.legalName) === entityName) &&
                      activeEntities.some((e: any) => (e.name || e.legalName) === entityName) && (
                        <option value={entityName}>
                          {entityName} (not in selected user&apos;s access list — pick another entity or user)
                        </option>
                      )}
                  </select>
                  <p style={{ color: 'var(--color-mercury-grey)', marginTop: 6, maxWidth: 520, fontSize: 12, lineHeight: 1.45 }}>
                    Choosing a user loads their primary entity by default. You can change entity here; vendors, departments,
                    and currencies always follow the entity shown. Bill-to GSTIN and default currency follow this entity.
                  </p>
                </OCRFieldWrapper>
                {/* 3. Bill-to GSTIN (auto from entity) */}
                <OCRFieldWrapper
                  fieldName="bill_to_gstin"
                  label="Bill-to GSTIN"
                  ocrScore={effectiveOcrScores?.fields?.bill_to_gstin}
                  onCorrection={handleFieldCorrection}
                  onApplyValue={(value) => setBillToGstin(value)}
                >
                  <div style={S.fieldLabel}><span>Bill-to GSTIN</span> {billToGstin && <AutoBadge />}</div>
                  <input className="px-input-readonly" readOnly value={billToGstin || '—'} />
                </OCRFieldWrapper>
                {/* 4. Vendor (filtered by selected entity) */}
                <OCRFieldWrapper
                  fieldName="vendor_name"
                  label="Vendor"
                  required
                  ocrScore={effectiveOcrScores?.fields?.vendor_name}
                  onCorrection={handleFieldCorrection}
                  onApplyValue={(value) => setVendorName(value)}
                >
                  <div style={S.fieldLabel}><span>Vendor</span><span style={S.required}>*</span> {vendorName && <OcrBadge />}</div>
                  <select
                    className="px-select"
                    value={vendorName}
                    onChange={(e) => {
                      const name = e.target.value;
                      setVendorName(name);
                      const v = activeVendors.find((vv: any) => (vv.name || vv.legalName) === name);
                      if (v) {
                        setVendorGstin((v as any).gstin || (v as any).vendorGstin || '');
                        setVendorPan((v as any).pan || (v as any).panNumber || '');
                        setVendorGroup((v as any).group || (v as any).vendorGroup || '');
                        const gstin = (v as any).gstin || '';
                        if (gstin.length >= 2) setVendorState(getStateFromGstin(gstin));
                        setOcrVendorMappingWarning('');
                        if (aiInvoiceData && (ocrSourceVendorName || ocrSourceVendorGstin)) {
                          const body = {
                            entity_name: entityName,
                            source_vendor_name: ocrSourceVendorName,
                            source_vendor_gstin: ocrSourceVendorGstin,
                            master_vendor_name: (v as any).name || (v as any).legalName || '',
                            master_vendor_gstin: (v as any).gstin || (v as any).vendorGstin || '',
                            confidence: 100,
                          };
                          fetch('/api/ap/vendor-learning/learn', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                          })
                            .then((res) => {
                              if (res.ok) {
                                setOcrLearningMessage('Learning saved. Next similar OCR invoice will auto-map this vendor.');
                              }
                            })
                            .catch(() => {});
                        }
                      }
                    }}
                  >
                    <option value="">Select vendor...</option>
                    {filteredVendors.map((v: any) => (
                      <option key={v.id} value={v.name || v.legalName}>{v.name || v.legalName}{v.code ? ` (${v.code})` : ''}</option>
                    ))}
                  </select>
                  {ocrVendorMappingWarning && (
                    <p style={{ marginTop: 6, fontSize: 12, color: 'var(--color-error-dark)', lineHeight: 1.4 }}>
                      {ocrVendorMappingWarning}
                    </p>
                  )}
                  {ocrLearningMessage && (
                    <p style={{ marginTop: 6, fontSize: 12, color: 'var(--color-success-dark)', lineHeight: 1.4 }}>
                      {ocrLearningMessage}
                    </p>
                  )}
                </OCRFieldWrapper>
                {/* 5. Vendor Group (auto) */}
                <div>
                  <div style={S.fieldLabel}><span>Vendor Group</span> <AutoBadge /></div>
                  <input className="px-input-readonly" readOnly value={vendorGroup || '—'} />
                </div>
                {/* 6. Vendor GSTIN (auto from vendor) */}
                <OCRFieldWrapper
                  fieldName="vendor_gstin"
                  label="Vendor GSTIN"
                  ocrScore={effectiveOcrScores?.fields?.vendor_gstin}
                  onCorrection={handleFieldCorrection}
                  onApplyValue={(value) => setVendorGstin(value)}
                >
                  <div style={S.fieldLabel}><span>Vendor GSTIN</span> {vendorGstin && <AutoBadge />}</div>
                  <input className="px-input-readonly" readOnly value={vendorGstin || '—'} />
                </OCRFieldWrapper>
                {/* 7. Vendor PAN (auto from vendor) */}
                <OCRFieldWrapper
                  fieldName="vendor_pan"
                  label="Vendor PAN"
                  ocrScore={effectiveOcrScores?.fields?.vendor_pan}
                  onCorrection={handleFieldCorrection}
                  onApplyValue={(value) => setVendorPan(value)}
                >
                  <div style={S.fieldLabel}><span>Vendor PAN</span> {vendorPan && <AutoBadge />}</div>
                  <input className="px-input-readonly" readOnly value={vendorPan || '—'} />
                </OCRFieldWrapper>
                {/* Vendor State (auto from GSTIN) */}
                <OCRFieldWrapper
                  fieldName="vendor_state"
                  label="Vendor State"
                  ocrScore={effectiveOcrScores?.fields?.vendor_state}
                  onCorrection={handleFieldCorrection}
                  onApplyValue={(value) => setVendorState(value)}
                >
                  <div style={S.fieldLabel}><span>Vendor State</span> <AutoBadge /></div>
                  <input className="px-input-readonly" readOnly value={vendorState || (vendorGstin ? getStateFromGstin(vendorGstin) : '—')} />
                </OCRFieldWrapper>
                {/* Billing Location (auto from entity) */}
                <OCRFieldWrapper
                  fieldName="billing_location"
                  label="Billing Location"
                  required
                  ocrScore={effectiveOcrScores?.fields?.billing_location}
                  onCorrection={handleFieldCorrection}
                  onApplyValue={(value) => setBillingLocation(value)}
                >
                  <div style={S.fieldLabel}><span>Billing Location</span><span style={S.required}>*</span></div>
                  <input className="px-input" value={billingLocation} onChange={(e) => setBillingLocation(e.target.value)} placeholder="Enter billing location..." />
                </OCRFieldWrapper>
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
                {/* Currency (auto-set from entity, filtered by entity mapping) */}
                <OCRFieldWrapper
                  fieldName="currency"
                  label="Currency"
                  ocrScore={effectiveOcrScores?.fields?.currency}
                  onCorrection={handleFieldCorrection}
                  onApplyValue={(value) => setInvoiceCurrency(value)}
                >
                  <div style={S.fieldLabel}><span>Currency</span> <AutoBadge /></div>
                  <select className="px-select" value={invoiceCurrency} onChange={(e) => setInvoiceCurrency(e.target.value)}>
                    <option value="">Select currency...</option>
                    {filteredCurrencies.map((c: any) => (
                      <option key={c.id} value={c.code}>{c.code}{c.name ? ` — ${c.name}` : ''}{c.code === selectedEntityCurrency ? ' (Entity default)' : ''}</option>
                    ))}
                    {invoiceCurrency && !filteredCurrencies.some((c: any) => c.code === invoiceCurrency) && (
                      <option value={invoiceCurrency}>{invoiceCurrency}</option>
                    )}
                  </select>
                  {invoiceCurrency && invoiceCurrency !== 'INR' && (() => {
                    const rate = getExchangeRate(invoiceCurrency, 'INR');
                    return rate ? (
                      <div style={{ marginTop: 4, fontSize: '0.75rem', color: 'var(--color-teal)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontWeight: 600 }}>1 {invoiceCurrency} = {rate.toFixed(4)} INR</span>
                        <span style={{ color: 'var(--color-mercury-grey)' }}>(from Exchange Rate Master)</span>
                      </div>
                    ) : (
                      <div style={{ marginTop: 4, fontSize: '0.75rem', color: 'var(--color-warning)' }}>
                        No exchange rate found for {invoiceCurrency} to INR
                      </div>
                    );
                  })()}
                </OCRFieldWrapper>
                {/* Department (from Department Master, scoped by entity) */}
                <OCRFieldWrapper
                  fieldName="department"
                  label="Department"
                  required
                  ocrScore={effectiveOcrScores?.fields?.department}
                  onCorrection={handleFieldCorrection}
                  onApplyValue={(value) => setDepartment(value)}
                >
                  <div style={S.fieldLabel}><span>Department</span><span style={S.required}>*</span></div>
                  <DepartmentSelector
                    hideLabel
                    showMasterBadge={false}
                    selectClassName="px-select"
                    value={department}
                    onChange={(nextDepartment) => {
                      setDepartment(nextDepartment);
                      if (aiInvoiceData && ocrSourceDepartment && nextDepartment && nextDepartment !== ocrSourceDepartment) {
                        fetch('/api/ap/field-learning/learn', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            mapping_type: 'department',
                            entity_name: entityName || '',
                            source_value: ocrSourceDepartment,
                            mapped_value: nextDepartment,
                            confidence: 100,
                          }),
                        })
                          .then((res) => {
                            if (res.ok) {
                              setOcrLearningMessage('Department learning saved. Next similar OCR department will auto-map.');
                            }
                          })
                          .catch(() => {});
                      }
                    }}
                    entityId={selectedEntityId}
                    required
                    placeholder="Select department..."
                  />
                </OCRFieldWrapper>
                {/* Sub-Department */}
                <div>
                  <div style={S.fieldLabel}><span>Sub-Department</span></div>
                  <select className="px-select" value={subDepartment} onChange={(e) => setSubDepartment(e.target.value)}>
                    <option value="">Select sub-department...</option>
                    <option value="General">General</option>
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
                <OCRFieldWrapper
                  fieldName="invoice_number"
                  label="Invoice Number"
                  required
                  ocrScore={effectiveOcrScores?.fields?.invoice_number}
                  onCorrection={handleFieldCorrection}
                  onApplyValue={(value) => setInvoiceNumber(value)}
                >
                  <div style={S.fieldLabel}><span>Invoice Number</span><span style={S.required}>*</span> {invoiceNumber && <OcrBadge />}</div>
                  <input className="px-input" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="e.g. INV-2026-0042" />
                </OCRFieldWrapper>
                {/* Payment Due Date */}
                <OCRFieldWrapper
                  fieldName="due_date"
                  label="Payment Due Date"
                  required
                  ocrScore={effectiveOcrScores?.fields?.due_date}
                  onCorrection={handleFieldCorrection}
                  onApplyValue={(value) => setDueDate(value)}
                >
                  <div style={S.fieldLabel}><span>Payment Due Date</span><span style={S.required}>*</span></div>
                  <input className="px-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </OCRFieldWrapper>
                {/* Invoice Date */}
                <OCRFieldWrapper
                  fieldName="invoice_date"
                  label="Invoice Date"
                  required
                  ocrScore={effectiveOcrScores?.fields?.invoice_date}
                  onCorrection={handleFieldCorrection}
                  onApplyValue={(value) => setInvoiceDate(value)}
                >
                  <div style={S.fieldLabel}><span>Invoice Date</span><span style={S.required}>*</span> {invoiceDate && <OcrBadge />}</div>
                  <input className="px-input" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                </OCRFieldWrapper>
                {/* Gross Amount */}
                <OCRFieldWrapper
                  fieldName="total_amount"
                  label="Gross Amount (Incl. Taxes)"
                  required
                  ocrScore={effectiveOcrScores?.fields?.total_amount}
                  onCorrection={handleFieldCorrection}
                  onApplyValue={(value) => setGrossAmount(value)}
                >
                  <div style={S.fieldLabel}><span>Gross Amount (Incl. Taxes)</span><span style={S.required}>*</span> {grossAmount && <OcrBadge />}</div>
                  <input className="px-input" value={grossAmount || formatCurrency(totalGross)} onChange={(e) => setGrossAmount(e.target.value)} style={{ fontWeight: 600 }} />
                </OCRFieldWrapper>
                {/* Payment Terms */}
                <OCRFieldWrapper
                  fieldName="payment_terms"
                  label="Payment Terms"
                  ocrScore={effectiveOcrScores?.fields?.payment_terms}
                  onCorrection={handleFieldCorrection}
                  onApplyValue={(value) => setPaymentTerms(value)}
                >
                  <div style={S.fieldLabel}><span>Payment Terms</span> {paymentTerms && <OcrBadge />}</div>
                  <input className="px-input" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g. Net 30" />
                </OCRFieldWrapper>
                {/* Base Amount */}
                <OCRFieldWrapper
                  fieldName="tax_amount"
                  label="Base Amount (Excl. Taxes)"
                  required
                  ocrScore={effectiveOcrScores?.fields?.tax_amount}
                  onCorrection={handleFieldCorrection}
                  onApplyValue={(value) => setBaseAmount(value)}
                >
                  <div style={S.fieldLabel}><span>Base Amount (Excl. Taxes)</span><span style={S.required}>*</span> {baseAmount && <OcrBadge />}</div>
                  <input className="px-input" value={baseAmount || formatCurrency(totalBase)} onChange={(e) => setBaseAmount(e.target.value)} />
                </OCRFieldWrapper>
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
                        <td style={{ ...S.td, ...S.tdSticky, minWidth: 180 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <select
                              value={item.itemCode || ''}
                              onChange={(e) => {
                                const selectedCode = e.target.value;
                                const masterItem = (masterItems as any[]).find((mi: any) => (mi.itemCode || mi.code || mi.id) === selectedCode);
                                setLineItems(prev => prev.map(l => l.id === item.id ? {
                                  ...l,
                                  itemName: masterItem?.itemName || masterItem?.name || selectedCode,
                                  itemCode: selectedCode,
                                  itemDescription: masterItem?.description || l.itemDescription,
                                  glCode: masterItem?.glCode || masterItem?.hsnSacCode || l.glCode,
                                  rate: masterItem?.basePrice ? Number(masterItem.basePrice) : l.rate,
                                  gstPercent: masterItem?.taxRate ? Number(masterItem.taxRate) : l.gstPercent,
                                } : l));
                              }}
                              style={{ width: '100%', height: 30, border: '0.5px solid var(--color-silver)', borderRadius: 6, fontSize: 12, padding: '0 6px', backgroundColor: item.itemCode ? '#FAFEFF' : '#FFF' }}
                            >
                              <option value="">Select item...</option>
                              {(masterItems as any[]).map((mi: any) => (
                                <option key={mi.itemCode || mi.code || mi.id} value={mi.itemCode || mi.code || mi.id}>
                                  {mi.itemName || mi.name} ({mi.itemCode || mi.code})
                                </option>
                              ))}
                            </select>
                            {item.ocrItem && <OcrBadge />}
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

            <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
              <TDSThresholdTracker
                lineItems={lineItems.map((line) => ({
                  id: line.id,
                  qty: line.qty,
                  rate: line.rate,
                  taxableAmount: line.amount,
                  tdsSection: line.tdsSection || 'None',
                  tdsRate: line.tdsPercent || 0,
                  tdsAmount: line.tdsAmount || 0,
                  netPayable: line.netPayable || 0,
                  description: line.description || line.itemName || '',
                } as any))}
              />
              <JournalEntryPreview
                compact
                formValues={{
                  header: {
                    invoiceType: 'Direct',
                    invoiceNumber,
                    invoiceDate,
                    rcm: false,
                    exempt: false,
                    sez: false,
                  } as any,
                  vendor: {
                    id: vendorName || 'vendor',
                    name: vendorName || '',
                    vendorType: 'company',
                    panValid: true,
                    lowerCert: false,
                    lowerRate: 0,
                    tdsExempt: false,
                    itrFiled: true,
                    gstReg: 'reg',
                  } as any,
                  lineItems: lineItems.map((line) => ({
                    id: line.id,
                    description: line.description || line.itemName || '',
                    qty: line.qty,
                    rate: line.rate,
                    taxableAmount: line.amount,
                    gstRate: line.gstPercent,
                    igst: line.igst,
                    cgst: line.cgst,
                    sgst: line.sgst,
                    tdsSection: line.tdsSection || 'None',
                    tdsRate: line.tdsPercent || 0,
                    tdsAmount: line.tdsAmount || 0,
                    netPayable: line.netPayable || 0,
                  })),
                }}
              />
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

            {pendingCorrections.length > 0 && (
              <OCRLearningPanel
                corrections={pendingCorrections}
                onConfirm={handleConfirmLearning}
                onDiscard={handleDiscardCorrection}
                onConfirmAll={handleConfirmAllLearnings}
              />
            )}

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
                { time: 'Just now', action: 'Invoice created via OCR capture', user: userName.trim() || 'You' },
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
