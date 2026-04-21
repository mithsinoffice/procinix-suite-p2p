import { ArrowLeft, Plus, Trash2, X, Hash, Building2, FileText, Edit, Eye } from 'lucide-react';
import { MasterListToolbar } from './ui/MasterListToolbar';
import { useLocation, useNavigate } from 'react-router-dom';
import { MasterPageShell } from './ui/MasterPageShell';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useMasterData } from '../contexts/MasterDataContext';
import { useAuth } from '../contexts/AuthContext';
import { ApprovalModal } from './ApprovalModal';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { invalidateRelationalMasterRecords } from '../lib/mysql/masterTables';
import { FormShell, FormSection, PxFormField, CheckCard, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

type EntityRecord = {
  id: string;
  code: string;
  legalName: string;
  name: string;
  region?: 'GCC' | 'India' | 'South East Asia';
  country: string;
  currency: string;
  taxRegime: string;
  isActive: boolean;
  approvalStatus?: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Changes Requested';
  originalData?: EntityRecord;
  entityMappings?: any[];
  // Legal & Registration
  legalEntityType?: string;
  businessLicenseNumber?: string;
  incorporationDate?: string;
  natureOfBusiness?: string;
  // Tax & Compliance
  taxRegistrationNumber?: string;
  panNumber?: string;
  msmeNumber?: string;
  // Registered Address
  registeredAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  // Bank Details
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankBranch?: string;
};

const countryFlags: Record<string, string> = {
  'India': '\u{1F1EE}\u{1F1F3}', 'USA': '\u{1F1FA}\u{1F1F8}', 'United States': '\u{1F1FA}\u{1F1F8}', 'UAE': '\u{1F1E6}\u{1F1EA}',
  'United Kingdom': '\u{1F1EC}\u{1F1E7}', 'UK': '\u{1F1EC}\u{1F1E7}', 'Singapore': '\u{1F1F8}\u{1F1EC}', 'Australia': '\u{1F1E6}\u{1F1FA}',
  'Canada': '\u{1F1E8}\u{1F1E6}', 'Germany': '\u{1F1E9}\u{1F1EA}', 'France': '\u{1F1EB}\u{1F1F7}', 'Japan': '\u{1F1EF}\u{1F1F5}',
  'China': '\u{1F1E8}\u{1F1F3}', 'Brazil': '\u{1F1E7}\u{1F1F7}', 'South Africa': '\u{1F1FF}\u{1F1E6}', 'Netherlands': '\u{1F1F3}\u{1F1F1}',
  'Switzerland': '\u{1F1E8}\u{1F1ED}', 'Italy': '\u{1F1EE}\u{1F1F9}', 'Spain': '\u{1F1EA}\u{1F1F8}', 'Saudi Arabia': '\u{1F1F8}\u{1F1E6}',
  'Qatar': '\u{1F1F6}\u{1F1E6}', 'Kuwait': '\u{1F1F0}\u{1F1FC}', 'Bahrain': '\u{1F1E7}\u{1F1ED}', 'Oman': '\u{1F1F4}\u{1F1F2}',
  'Malaysia': '\u{1F1F2}\u{1F1FE}', 'Thailand': '\u{1F1F9}\u{1F1ED}', 'Indonesia': '\u{1F1EE}\u{1F1E9}', 'Vietnam': '\u{1F1FB}\u{1F1F3}',
  'Sri Lanka': '\u{1F1F1}\u{1F1F0}', 'Bangladesh': '\u{1F1E7}\u{1F1E9}', 'Nepal': '\u{1F1F3}\u{1F1F5}', 'Myanmar': '\u{1F1F2}\u{1F1F2}',
};

const LEGAL_ENTITY_TYPES = [
  'Pvt Ltd', 'Public Ltd', 'LLP', 'Partnership', 'Sole Proprietor', 'Trust', 'Society', 'NGO', 'Government Body',
];

const NATURE_OF_BUSINESS_OPTIONS = [
  'Manufacturing', 'Trading', 'Services', 'IT/Software', 'FMCG', 'Healthcare',
  'Education', 'Financial Services', 'Construction', 'Logistics', 'Hospitality', 'Other',
];
const REGION_OPTIONS: Array<'GCC' | 'India' | 'South East Asia'> = ['GCC', 'India', 'South East Asia'];
const GCC_COUNTRIES = ['UAE', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Oman'];
const SOUTH_EAST_ASIA_COUNTRIES = ['Singapore', 'Malaysia', 'Thailand', 'Indonesia', 'Vietnam', 'Myanmar'];

const deriveRegionFromCountry = (value: string): 'GCC' | 'India' | 'South East Asia' => {
  if (value === 'India') return 'India';
  if (GCC_COUNTRIES.includes(value)) return 'GCC';
  if (SOUTH_EAST_ASIA_COUNTRIES.includes(value)) return 'South East Asia';
  return 'India';
};

function authHeaders(userId?: string): Record<string, string> {
  const key = localStorage.getItem('token') || import.meta.env.VITE_API_SECRET_KEY || '';
  return {
    'Content-Type': 'application/json',
    ...(key ? { Authorization: `Bearer ${key}` } : {}),
    ...(userId ? { 'x-user-id': userId } : {}),
  };
}

export function EntityMaster() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { entities: baseEntities, currencies: masterCurrencies } = useMasterData();
  const uniqueCountries = [...new Set(baseEntities.map((e: any) => e.country).filter(Boolean))].sort();
  const [entities, setEntities] = useIncrementalMasterRecords<EntityRecord>('entity_master', baseEntities as EntityRecord[]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<EntityRecord | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [legalName, setLegalName] = useState('');
  const [region, setRegion] = useState<'GCC' | 'India' | 'South East Asia'>('India');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('');
  const [taxRegime, setTaxRegime] = useState('GST');
  const [isActive, setIsActive] = useState(true);
  // Legal & Registration
  const [legalEntityType, setLegalEntityType] = useState('');
  const [businessLicenseNumber, setBusinessLicenseNumber] = useState('');
  const [incorporationDate, setIncorporationDate] = useState('');
  const [natureOfBusiness, setNatureOfBusiness] = useState('');
  // Tax & Compliance
  const [taxRegistrationNumber, setTaxRegistrationNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [msmeNumber, setMsmeNumber] = useState('');
  // Registered Address
  const [registeredAddress, setRegisteredAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  // Bank Details
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankBranch, setBankBranch] = useState('');

  const approvalContextFromStorage = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('masterApprovalReviewContext');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        fromApprovals?: boolean;
        approvalId?: string;
        recordId?: string;
        masterKey?: string;
        route?: string;
        savedAt?: number;
      };
      if (!parsed?.fromApprovals || parsed.masterKey !== 'entity_master') return null;
      if (!parsed.approvalId || !parsed.recordId) return null;
      if (parsed.route && parsed.route !== location.pathname) return null;
      if (parsed.savedAt && Date.now() - parsed.savedAt > 30 * 60 * 1000) return null;
      return parsed;
    } catch {
      return null;
    }
  }, [location.pathname]);

  const approvalsParams = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const fromApprovals = sp.get('fromApprovals') === '1' || Boolean(approvalContextFromStorage?.fromApprovals);
    const approvalId = sp.get('approvalId') || approvalContextFromStorage?.approvalId || '';
    const recordId = sp.get('recordId') || approvalContextFromStorage?.recordId || '';
    return { fromApprovals, approvalId, recordId };
  }, [approvalContextFromStorage, location.search]);

  const isApproverReview = Boolean(approvalsParams.fromApprovals && approvalsParams.approvalId && approvalsParams.recordId);
  const [approvalActionBusy, setApprovalActionBusy] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    if (!country) return;
    setRegion(deriveRegionFromCountry(country));
  }, [country]);

  useEffect(() => {
    if (!isApproverReview) return;
    if (!entities.length) return;
    const found = entities.find((e) => e.id === approvalsParams.recordId);
    if (!found) return;
    handleEdit(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApproverReview, approvalsParams.recordId, entities.length]);

  const filteredEntities = useMemo(() => {
    return entities.filter((entity) => {
      const haystack = [entity.code, entity.legalName, entity.name, entity.region, entity.country, entity.currency].join(' ').toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const statusStr = entity.isActive ? 'Active' : 'Inactive';
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(statusStr);
      const matchesApproval = approvalFilter.length === 0 || approvalFilter.includes(entity.approvalStatus ?? 'Approved');
      return matchesSearch && matchesStatus && matchesApproval;
    });
  }, [entities, searchTerm, statusFilter, approvalFilter]);

  const resetForm = () => {
    setEditingId(null);
    setCode('');
    setLegalName('');
    setRegion('India');
    setCountry('');
    setCurrency('');
    setTaxRegime('GST');
    setIsActive(true);
    setLegalEntityType('');
    setBusinessLicenseNumber('');
    setIncorporationDate('');
    setNatureOfBusiness('');
    setTaxRegistrationNumber('');
    setPanNumber('');
    setMsmeNumber('');
    setRegisteredAddress('');
    setCity('');
    setState('');
    setPincode('');
    setBankName('');
    setBankAccountNumber('');
    setBankIfsc('');
    setBankBranch('');
  };

  const handleEdit = (entity: EntityRecord) => {
    setEditingId(entity.id);
    setCode(entity.code);
    setLegalName(entity.legalName);
    setRegion((entity.region as 'GCC' | 'India' | 'South East Asia') || 'India');
    setCountry(entity.country);
    setCurrency(entity.currency);
    setTaxRegime(entity.taxRegime);
    setIsActive(entity.isActive);
    setLegalEntityType(entity.legalEntityType || '');
    setBusinessLicenseNumber(entity.businessLicenseNumber || '');
    setIncorporationDate(entity.incorporationDate || '');
    setNatureOfBusiness(entity.natureOfBusiness || '');
    setTaxRegistrationNumber(entity.taxRegistrationNumber || '');
    setPanNumber(entity.panNumber || '');
    setMsmeNumber(entity.msmeNumber || '');
    setRegisteredAddress(entity.registeredAddress || '');
    setCity(entity.city || '');
    setState(entity.state || '');
    setPincode(entity.pincode || '');
    setBankName(entity.bankName || '');
    setBankAccountNumber(entity.bankAccountNumber || '');
    setBankIfsc(entity.bankIfsc || '');
    setBankBranch(entity.bankBranch || '');
    setShowForm(true);
  };

  const generateCode = () => {
    const countryPrefix = (country || 'XX').substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    return `ENT-${countryPrefix}-${timestamp}`;
  };

  const handleSubmit = (approvalStatus: EntityRecord['approvalStatus'] = 'Pending Approval') => {
    const originalRecord = entities.find((entity) => entity.id === editingId);
    const finalCode = code.trim() || generateCode();
    const record: EntityRecord = {
      ...(entities.find((entity: any) => entity.id === editingId) || {}),
      id: editingId || Date.now().toString(),
      code: finalCode,
      legalName,
      name: legalName,
      region,
      country,
      currency,
      taxRegime,
      isActive,
      approvalStatus,
      originalData: editingId ? originalRecord : undefined,
      legalEntityType: legalEntityType || undefined,
      businessLicenseNumber: businessLicenseNumber || undefined,
      incorporationDate: incorporationDate || undefined,
      natureOfBusiness: natureOfBusiness || undefined,
      taxRegistrationNumber: taxRegistrationNumber || undefined,
      panNumber: panNumber || undefined,
      msmeNumber: msmeNumber || undefined,
      registeredAddress: registeredAddress || undefined,
      city: city || undefined,
      state: state || undefined,
      pincode: pincode || undefined,
      bankName: bankName || undefined,
      bankAccountNumber: bankAccountNumber || undefined,
      bankIfsc: bankIfsc || undefined,
      bankBranch: bankBranch || undefined,
    };

    if (editingId) {
      setEntities(entities.map((entity: any) => entity.id === editingId ? record : entity));
    } else {
      setEntities([...entities, record]);
    }

    setShowForm(false);
    resetForm();
  };

  const handleReview = (entity: EntityRecord) => {
    const changes: Change[] = [];
    const original = entity.originalData;
    if (original) {
      if (original.code !== entity.code) changes.push({ field: 'Entity Code', oldValue: original.code, newValue: entity.code });
      if (original.legalName !== entity.legalName) changes.push({ field: 'Legal Name', oldValue: original.legalName, newValue: entity.legalName });
      if (original.country !== entity.country) changes.push({ field: 'Country', oldValue: original.country, newValue: entity.country });
      if ((original.region || '') !== (entity.region || '')) changes.push({ field: 'Region', oldValue: original.region || '', newValue: entity.region || '' });
      if (original.currency !== entity.currency) changes.push({ field: 'Currency', oldValue: original.currency, newValue: entity.currency });
      if (original.taxRegime !== entity.taxRegime) changes.push({ field: 'Tax Regime', oldValue: original.taxRegime, newValue: entity.taxRegime });
      if (original.isActive !== entity.isActive) changes.push({ field: 'Status', oldValue: original.isActive ? 'Active' : 'Inactive', newValue: entity.isActive ? 'Active' : 'Inactive' });
      if ((original.legalEntityType || '') !== (entity.legalEntityType || '')) changes.push({ field: 'Legal Entity Type', oldValue: original.legalEntityType || '', newValue: entity.legalEntityType || '' });
      if ((original.businessLicenseNumber || '') !== (entity.businessLicenseNumber || '')) changes.push({ field: 'Business License Number', oldValue: original.businessLicenseNumber || '', newValue: entity.businessLicenseNumber || '' });
      if ((original.incorporationDate || '') !== (entity.incorporationDate || '')) changes.push({ field: 'Incorporation Date', oldValue: original.incorporationDate || '', newValue: entity.incorporationDate || '' });
      if ((original.natureOfBusiness || '') !== (entity.natureOfBusiness || '')) changes.push({ field: 'Nature of Business', oldValue: original.natureOfBusiness || '', newValue: entity.natureOfBusiness || '' });
      if ((original.taxRegistrationNumber || '') !== (entity.taxRegistrationNumber || '')) changes.push({ field: 'Tax Registration Number', oldValue: original.taxRegistrationNumber || '', newValue: entity.taxRegistrationNumber || '' });
      if ((original.panNumber || '') !== (entity.panNumber || '')) changes.push({ field: 'PAN Number', oldValue: original.panNumber || '', newValue: entity.panNumber || '' });
      if ((original.msmeNumber || '') !== (entity.msmeNumber || '')) changes.push({ field: 'MSME Number', oldValue: original.msmeNumber || '', newValue: entity.msmeNumber || '' });
      if ((original.registeredAddress || '') !== (entity.registeredAddress || '')) changes.push({ field: 'Registered Address', oldValue: original.registeredAddress || '', newValue: entity.registeredAddress || '' });
      if ((original.city || '') !== (entity.city || '')) changes.push({ field: 'City', oldValue: original.city || '', newValue: entity.city || '' });
      if ((original.state || '') !== (entity.state || '')) changes.push({ field: 'State', oldValue: original.state || '', newValue: entity.state || '' });
      if ((original.pincode || '') !== (entity.pincode || '')) changes.push({ field: 'Pincode', oldValue: original.pincode || '', newValue: entity.pincode || '' });
      if ((original.bankName || '') !== (entity.bankName || '')) changes.push({ field: 'Bank Name', oldValue: original.bankName || '', newValue: entity.bankName || '' });
      if ((original.bankAccountNumber || '') !== (entity.bankAccountNumber || '')) changes.push({ field: 'Account Number', oldValue: original.bankAccountNumber || '', newValue: entity.bankAccountNumber || '' });
      if ((original.bankIfsc || '') !== (entity.bankIfsc || '')) changes.push({ field: 'IFSC Code', oldValue: original.bankIfsc || '', newValue: entity.bankIfsc || '' });
      if ((original.bankBranch || '') !== (entity.bankBranch || '')) changes.push({ field: 'Bank Branch', oldValue: original.bankBranch || '', newValue: entity.bankBranch || '' });
    }
    setCurrentReviewRecord(entity);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (!currentReviewRecord) return;
    const nextRecords = await applyMasterApprovalAction('entity_master', entities, currentReviewRecord.id, 'approve');
    setEntities(nextRecords);
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (!currentReviewRecord) return;
    const nextRecords = await applyMasterApprovalAction('entity_master', entities, currentReviewRecord.id, 'reject');
    setEntities(nextRecords);
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleRequestInfo = async () => {
    if (!currentReviewRecord) return;
    const comments = window.prompt('Enter comments for the request:', '');
    if (comments === null) return;
    const nextRecords = await applyMasterApprovalAction('entity_master', entities, currentReviewRecord.id, 'request_info', comments);
    setEntities(nextRecords);
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const getStatusBadgeStyle = (isActive: boolean) => {
    return isActive
      ? { backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal)' }
      : { backgroundColor: '#FFE8EA', color: 'var(--color-error)' };
  };

  const getApprovalBadgeStyle = (approvalStatus?: string) => {
    switch (approvalStatus) {
      case 'Pending Approval':
        return { backgroundColor: '#FFF9E6', color: '#D97706' };
      case 'Rejected':
        return { backgroundColor: '#FFE8EA', color: 'var(--color-error)' };
      case 'Changes Requested':
        return { backgroundColor: '#E0F2FE', color: '#0284C7' };
      case 'Draft':
        return { backgroundColor: '#E5E7EB', color: 'var(--color-mercury-grey)' };
      default:
        return { backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal)' };
    }
  };

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const completeness = useMemo(() => {
    const fields = [legalName, region, country, currency, taxRegime, legalEntityType, taxRegistrationNumber, registeredAddress, city, state];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [legalName, region, country, currency, taxRegime, legalEntityType, taxRegistrationNumber, registeredAddress, city, state]);

  const handleSaveDraft = useCallback(() => {
    setSaveStatus('saving');
    handleSubmit('Draft');
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  }, [handleSubmit]);

  useFormKeyboardSave(isApproverReview ? undefined : handleSaveDraft);

  const handleApproveFromApprovals = useCallback(async () => {
    if (!isApproverReview) return;
    if (approvalActionBusy) return;
    setApprovalActionBusy('approve');
    try {
      const res = await fetch(`/api/approvals/${approvalsParams.approvalId}/approve`, {
        method: 'POST',
        headers: authHeaders(user?.id),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        alert(`Approve failed${text ? `: ${text}` : ''}`);
        return;
      }
      invalidateRelationalMasterRecords('entity_master');
      sessionStorage.removeItem('masterApprovalReviewContext');
      navigate('/approvals');
    } catch (e) {
      alert(`Approve failed: ${String(e)}`);
    } finally {
      setApprovalActionBusy(null);
    }
  }, [approvalActionBusy, approvalsParams.approvalId, isApproverReview, navigate, user?.id]);

  const handleRejectFromApprovals = useCallback(async () => {
    if (!isApproverReview) return;
    if (approvalActionBusy) return;
    const reason = window.prompt('Rejection reason (required)', '') ?? '';
    if (!reason.trim()) return;
    setApprovalActionBusy('reject');
    try {
      const res = await fetch(`/api/approvals/${approvalsParams.approvalId}/reject`, {
        method: 'POST',
        headers: authHeaders(user?.id),
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        alert(`Reject failed${text ? `: ${text}` : ''}`);
        return;
      }
      invalidateRelationalMasterRecords('entity_master');
      sessionStorage.removeItem('masterApprovalReviewContext');
      navigate('/approvals');
    } catch (e) {
      alert(`Reject failed: ${String(e)}`);
    } finally {
      setApprovalActionBusy(null);
    }
  }, [approvalActionBusy, approvalsParams.approvalId, isApproverReview, navigate, user?.id]);

  if (showForm) {
    const scrutinizerInsights: Array<{ severity: 'high' | 'medium' | 'low'; title: string; detail: string }> = [];
    if (!taxRegistrationNumber.trim() && (country === 'India' || taxRegime === 'GST')) {
      scrutinizerInsights.push({
        severity: 'high',
        title: 'Missing tax registration number',
        detail: 'For India/GST entities, missing GSTIN can block invoice validation and returns.',
      });
    }
    if (country === 'India' && panNumber.trim() && panNumber.trim().length !== 10) {
      scrutinizerInsights.push({
        severity: 'medium',
        title: 'PAN format looks unusual',
        detail: 'PAN is typically 10 characters. Re-check before approving if this is a key compliance field.',
      });
    }
    if (!registeredAddress.trim()) {
      scrutinizerInsights.push({
        severity: 'low',
        title: 'Registered address missing',
        detail: 'Address gaps can reduce match accuracy during vendor KYC and document processing.',
      });
    }

    return (
      <FormShell masterName="Entity Master"
        title={isApproverReview ? 'Review Entity' : (editingId ? 'Edit Entity' : 'Create Entity')}
        subtitle="Manage legal entities, companies, and branches"
        modeLabel={isApproverReview ? 'Approval Review' : (editingId ? 'Edit Master Record' : 'Create Master Record')}
        draftStatus={isApproverReview ? ((entities.find((entity) => entity.id === editingId)?.approvalStatus) || 'Pending Approval') : (editingId ? 'Draft' : 'New')}
        completeness={completeness}
        onBack={() => {
          if (isApproverReview) {
            navigate('/approvals');
            return;
          }
          setShowForm(false);
        }}
        onCancel={isApproverReview ? undefined : (() => { setShowForm(false); resetForm(); })}
        onSaveDraft={isApproverReview ? undefined : handleSaveDraft}
        onSubmit={isApproverReview ? undefined : (() => handleSubmit('Pending Approval'))}
        submitLabel={isApproverReview ? undefined : 'Submit'}
        draftLabel={isApproverReview ? undefined : 'Save Draft'}
        saveStatus={saveStatus}
        extraActions={isApproverReview ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRejectFromApprovals}
              disabled={approvalActionBusy !== null}
              className="flex items-center gap-2 px-6 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: approvalActionBusy ? 'var(--color-silver)' : '#FFE8EA',
                color: approvalActionBusy ? 'var(--color-mercury-grey)' : 'var(--color-error)',
                border: '1px solid #FFB4BC',
                fontWeight: 700,
              }}
            >
              Reject
            </button>
            <button
              type="button"
              onClick={handleApproveFromApprovals}
              disabled={approvalActionBusy !== null}
              className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors"
              style={{ backgroundColor: approvalActionBusy ? 'var(--color-silver)' : 'var(--color-teal)', fontWeight: 700 }}
            >
              {approvalActionBusy === 'approve' ? 'Approving…' : 'Approve'}
            </button>
          </div>
        ) : undefined}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 min-w-0">
            <FormSection title="Entity Details" columns={2}>
          <PxFormField label="Entity Code" filled={!!code.trim()} hint="Auto-generated on save">
            <input type="text" value={code} readOnly placeholder="Auto-generated" className="px-input" style={{ backgroundColor: 'var(--color-cloud)', color: 'var(--color-mercury-grey)', cursor: 'not-allowed' }} />
          </PxFormField>
          <PxFormField label="Legal Name" required filled={!!legalName.trim()}>
            <input type="text" value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Enter legal entity name" className="px-input" disabled={isApproverReview} />
          </PxFormField>
          <PxFormField label="Region" required filled={!!region}>
            <select value={region} onChange={(e) => setRegion(e.target.value as 'GCC' | 'India' | 'South East Asia')} className="px-select" disabled={isApproverReview}>
              {REGION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </PxFormField>
          <PxFormField label="Country" required filled={!!country.trim()} hint="Country of incorporation">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {country && countryFlags[country] && (
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{countryFlags[country]}</span>
              )}
              <select value={country} onChange={(e) => setCountry(e.target.value)} className="px-select" style={{ flex: 1 }} disabled={isApproverReview}>
                <option value="">Select country...</option>
                {uniqueCountries.map((c: string) => <option key={c} value={c}>{countryFlags[c] ? `${countryFlags[c]} ${c}` : c}</option>)}
                {country && !uniqueCountries.includes(country) && <option value={country}>{countryFlags[country] ? `${countryFlags[country]} ${country}` : country}</option>}
                <option value="India">{countryFlags['India']} India</option>
                <option value="UAE">{countryFlags['UAE']} UAE</option>
                <option value="USA">{countryFlags['USA']} USA</option>
                <option value="UK">{countryFlags['UK']} UK</option>
                <option value="Singapore">{countryFlags['Singapore']} Singapore</option>
              </select>
            </div>
          </PxFormField>
          <PxFormField label="Currency" required filled={!!currency.trim()} hint="ISO 4217 code">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="px-select" disabled={isApproverReview}>
              <option value="">Select currency...</option>
              {masterCurrencies.filter((c: any) => c.isActive !== false).map((c: any) => (
                <option key={c.id} value={c.code}>{c.code}{c.name ? ` — ${c.name}` : ''}</option>
              ))}
              {currency && !masterCurrencies.some((c: any) => c.code === currency) && <option value={currency}>{currency}</option>}
            </select>
          </PxFormField>
          <PxFormField label="Tax Regime" required filled={!!taxRegime}>
            <select value={taxRegime} onChange={(e) => setTaxRegime(e.target.value)} className="px-select" disabled={isApproverReview}>
              <option value="GST">GST</option>
              <option value="VAT">VAT</option>
              <option value="Sales Tax">Sales Tax</option>
            </select>
          </PxFormField>
            </FormSection>

            <FormSection title="Legal & Registration" columns={2}>
          <PxFormField label="Legal Entity Type" filled={!!legalEntityType}>
            <select value={legalEntityType} onChange={(e) => setLegalEntityType(e.target.value)} className="px-select" disabled={isApproverReview}>
              <option value="">Select type...</option>
              {LEGAL_ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </PxFormField>
          <PxFormField label="Business License Number" filled={!!businessLicenseNumber.trim()}>
            <input type="text" value={businessLicenseNumber} onChange={(e) => setBusinessLicenseNumber(e.target.value)} placeholder="Enter license number" className="px-input" disabled={isApproverReview} />
          </PxFormField>
          <PxFormField label="Incorporation Date" filled={!!incorporationDate}>
            <input type="date" value={incorporationDate} onChange={(e) => setIncorporationDate(e.target.value)} className="px-input" disabled={isApproverReview} />
          </PxFormField>
          <PxFormField label="Nature of Business" filled={!!natureOfBusiness}>
            <select value={natureOfBusiness} onChange={(e) => setNatureOfBusiness(e.target.value)} className="px-select" disabled={isApproverReview}>
              <option value="">Select nature...</option>
              {NATURE_OF_BUSINESS_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </PxFormField>
            </FormSection>

            <FormSection title="Tax & Compliance" columns={2}>
          <PxFormField label="Tax Registration Number" filled={!!taxRegistrationNumber.trim()} hint="GST/VAT registration number">
            <input type="text" value={taxRegistrationNumber} onChange={(e) => setTaxRegistrationNumber(e.target.value)} placeholder="e.g., 27AABCU9603R1ZM" className="px-input" disabled={isApproverReview} />
          </PxFormField>
          <PxFormField label="PAN Number" filled={!!panNumber.trim()} hint="Permanent Account Number">
            <input type="text" value={panNumber} onChange={(e) => setPanNumber(e.target.value.toUpperCase())} placeholder="e.g., AABCU9603R" className="px-input" disabled={isApproverReview} />
          </PxFormField>
          <PxFormField label="MSME Number" filled={!!msmeNumber.trim()} hint="Udyam registration number, if applicable">
            <input type="text" value={msmeNumber} onChange={(e) => setMsmeNumber(e.target.value)} placeholder="e.g., UDYAM-XX-00-0000000" className="px-input" disabled={isApproverReview} />
          </PxFormField>
            </FormSection>

            <FormSection title="Registered Office Address" columns={2}>
          <PxFormField label="Registered Address" filled={!!registeredAddress.trim()} colSpan={2}>
            <textarea value={registeredAddress} onChange={(e) => setRegisteredAddress(e.target.value)} placeholder="Full registered office address" className="px-input" rows={3} style={{ resize: 'vertical' }} disabled={isApproverReview} />
          </PxFormField>
          <PxFormField label="City" filled={!!city.trim()}>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Enter city" className="px-input" disabled={isApproverReview} />
          </PxFormField>
          <PxFormField label="State" filled={!!state.trim()}>
            <input type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="Enter state / province" className="px-input" disabled={isApproverReview} />
          </PxFormField>
          <PxFormField label="Pincode" filled={!!pincode.trim()}>
            <input type="text" value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="Enter pincode / ZIP" className="px-input" disabled={isApproverReview} />
          </PxFormField>
            </FormSection>

            <FormSection title="Bank Account Details (Optional)" columns={2}>
          <PxFormField label="Bank Name" filled={!!bankName.trim()}>
            <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Enter bank name" className="px-input" disabled={isApproverReview} />
          </PxFormField>
          <PxFormField label="Account Number" filled={!!bankAccountNumber.trim()}>
            <input type="text" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} placeholder="Enter account number" className="px-input" disabled={isApproverReview} />
          </PxFormField>
          <PxFormField label="IFSC Code" filled={!!bankIfsc.trim()} hint="Indian Financial System Code">
            <input type="text" value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value.toUpperCase())} placeholder="e.g., SBIN0001234" className="px-input" disabled={isApproverReview} />
          </PxFormField>
          <PxFormField label="Branch" filled={!!bankBranch.trim()}>
            <input type="text" value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} placeholder="Enter branch name" className="px-input" disabled={isApproverReview} />
          </PxFormField>
            </FormSection>

            <FormSection title="Status" columns={1}>
          <CheckCard
            title="Entity is Active"
            subtitle="Inactive entities are hidden from transaction forms"
            checked={isActive}
            onChange={isApproverReview ? () => {} : setIsActive}
          />
            </FormSection>
          </div>

          <div className="min-w-0">
            <div className="bg-white rounded-xl p-5" style={{ border: '1px solid var(--color-silver)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>Scrutinizer Insights</div>
                  <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                    Signals & guidance for approvers
                  </div>
                </div>
                <span className="badge-neutral text-xs">Entity</span>
              </div>

              {scrutinizerInsights.length === 0 ? (
                <div className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  No major risk signals detected for this entity snapshot.
                </div>
              ) : (
                <div className="space-y-3">
                  {scrutinizerInsights.map((ins) => (
                    <div
                      key={ins.title}
                      className="rounded-lg p-3"
                      style={{
                        border: '1px solid var(--color-silver)',
                        backgroundColor:
                          ins.severity === 'high' ? '#FFF1F2' : ins.severity === 'medium' ? '#FFFBEB' : '#EFF6FF',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{ins.title}</div>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor:
                              ins.severity === 'high' ? '#FEE2E2' : ins.severity === 'medium' ? '#FEF3C7' : '#DBEAFE',
                            color:
                              ins.severity === 'high' ? '#B91C1C' : ins.severity === 'medium' ? '#B45309' : '#1D4ED8',
                            fontWeight: 700,
                          }}
                        >
                          {ins.severity.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>{ins.detail}</div>
                    </div>
                  ))}
                </div>
              )}

              {isApproverReview && (
                <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--color-silver)' }}>
                  <div className="text-sm font-semibold mb-2" style={{ color: 'var(--color-ink)' }}>Approval Actions</div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleRejectFromApprovals}
                      disabled={approvalActionBusy !== null}
                      className="px-4 py-2 rounded-lg w-full"
                      style={{
                        backgroundColor: approvalActionBusy ? 'var(--color-silver)' : '#FFE8EA',
                        color: approvalActionBusy ? 'var(--color-mercury-grey)' : 'var(--color-error)',
                        border: '1px solid #FFB4BC',
                        fontWeight: 800,
                      }}
                    >
                      {approvalActionBusy === 'reject' ? 'Rejecting…' : 'Reject'}
                    </button>
                    <button
                      type="button"
                      onClick={handleApproveFromApprovals}
                      disabled={approvalActionBusy !== null}
                      className="px-4 py-2 rounded-lg w-full text-white"
                      style={{ backgroundColor: approvalActionBusy ? 'var(--color-silver)' : 'var(--color-teal)', fontWeight: 800 }}
                    >
                      {approvalActionBusy === 'approve' ? 'Approving…' : 'Approve'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                        invalidateRelationalMasterRecords('entity_master');
                      sessionStorage.removeItem('masterApprovalReviewContext');
                      navigate('/approvals');
                    }}
                    className="mt-3 px-4 py-2 rounded-lg w-full"
                    style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-silver)', color: 'var(--color-ink)', fontWeight: 600 }}
                  >
                    Back to My Approvals
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </FormShell>
    );
  }

  return (
    <MasterPageShell masterName="Entity Master" description="Manage legal entities, companies, and branches">
      <div className="flex items-center justify-end mb-8">
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-colors"
          style={{ backgroundColor: 'var(--color-teal)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
        >
          <Plus className="w-5 h-5" />
          Add Entity
        </button>
      </div>

      <MasterListToolbar
        masterName="Entity Master"
        masterKey="entity_master"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={[
          { key: 'status', label: 'Status', options: ['Active', 'Inactive'], selected: statusFilter },
          { key: 'approval', label: 'Approval', options: ['Draft', 'Pending Approval', 'Approved', 'Rejected'], selected: approvalFilter },
        ]}
        onFilterChange={(key, values) => {
          if (key === 'status') setStatusFilter(values);
          if (key === 'approval') setApprovalFilter(values);
        }}
        records={filteredEntities}
        columns={[
          { key: 'code', label: 'Entity Code' },
          { key: 'legalName', label: 'Legal Name' },
          { key: 'name', label: 'Display Name' },
          { key: 'region', label: 'Region' },
          { key: 'country', label: 'Country' },
          { key: 'currency', label: 'Currency' },
          { key: 'taxRegime', label: 'Tax Regime' },
          { key: 'legalEntityType', label: 'Legal Entity Type' },
          { key: 'businessLicenseNumber', label: 'Business License Number' },
          { key: 'incorporationDate', label: 'Incorporation Date' },
          { key: 'natureOfBusiness', label: 'Nature of Business' },
          { key: 'taxRegistrationNumber', label: 'Tax Registration Number' },
          { key: 'panNumber', label: 'PAN Number' },
          { key: 'msmeNumber', label: 'MSME Number' },
          { key: 'registeredAddress', label: 'Registered Address' },
          { key: 'city', label: 'City' },
          { key: 'state', label: 'State' },
          { key: 'pincode', label: 'Pincode' },
          { key: 'bankName', label: 'Bank Name' },
          { key: 'bankAccountNumber', label: 'Bank Account Number' },
          { key: 'bankIfsc', label: 'Bank IFSC' },
          { key: 'bankBranch', label: 'Bank Branch' },
          { key: 'isActive', label: 'Is Active' },
          { key: 'entityMappings', label: 'Entity Mappings' },
          { key: 'approvalStatus', label: 'Approval Status' },
        ]}
      />

      <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Entity Code</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Legal Name</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Region</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Country</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Currency</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Tax Regime</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Status</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Approval</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntities.map((entity, index) => (
                <tr key={entity.id} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--color-silver)' }}>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{entity.code}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{entity.legalName}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>{entity.region || 'India'}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>{entity.country}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>{entity.currency}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>{entity.taxRegime}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={getStatusBadgeStyle(entity.isActive)}>
                      {entity.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={getApprovalBadgeStyle(entity.approvalStatus)}>
                      {entity.approvalStatus ?? 'Approved'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        className="p-2 rounded-lg transition-colors" 
                        style={{ color: 'var(--color-mercury-grey)' }} 
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-2 rounded-lg transition-colors" 
                        style={{ color: 'var(--color-mercury-grey)' }} 
                        title="Edit"
                        onClick={() => handleEdit(entity)}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {(entity.approvalStatus === 'Pending Approval' || entity.approvalStatus === 'Changes Requested' || entity.approvalStatus === 'Draft') && (
                        <button
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: 'var(--color-teal)' }}
                          title="Review Changes"
                          onClick={() => handleReview(entity)}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Banner */}
      <div 
        className="mt-6 p-4 rounded-lg"
        style={{ backgroundColor: '#FFF9E6', border: '1px solid #FCD34D' }}
      >
        <p className="text-sm" style={{ color: '#D97706' }}>
          ℹ️ Entity Master is populated from the canonical entity registry. Showing {entities.length} active entities.
        </p>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-xl">
            <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: 'var(--color-silver)' }}>
              <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>{editingId ? 'Edit Entity' : 'Add Entity'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg" style={{ color: 'var(--color-mercury-grey)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Entity Code" className="px-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)' }} />
              <input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Legal Name" className="px-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)' }} />
              <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" className="px-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)' }} />
              <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder="Currency" className="px-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)' }} />
              <select value={taxRegime} onChange={(e) => setTaxRegime(e.target.value)} className="px-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
                <option value="GST">GST</option>
                <option value="VAT">VAT</option>
                <option value="None">None</option>
              </select>
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-ink)' }}><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />Active</label>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-3" style={{ borderColor: 'var(--color-silver)' }}>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)', backgroundColor: '#FFFFFF', color: 'var(--color-mercury-grey)' }}>Cancel</button>
              <button onClick={() => handleSubmit('Draft')} className="px-4 py-2 rounded-lg" style={{ border: '1px solid #BFE8EC', color: '#0F8A95', backgroundColor: '#ECFEFF', fontWeight: 700 }}>Save Draft</button>
              <button onClick={() => handleSubmit('Pending Approval')} className="px-4 py-2 rounded-lg text-white" style={{ backgroundColor: 'var(--color-teal)' }}>Submit</button>
            </div>
          </div>
        </div>
      )}

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        recordType="Entity Master"
        recordId={currentReviewRecord?.id ?? ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />
    </MasterPageShell>
  );
}
