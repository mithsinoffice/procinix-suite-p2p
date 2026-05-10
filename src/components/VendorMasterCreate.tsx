import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, Users, MapPin, ShieldCheck, Landmark, Link2 } from 'lucide-react';
import { FormShell, FormSection, PxFormField } from './ui/form-primitives';
import { SimpleInlineTable, AddRowButton, type SimpleColumn } from './shared/SimpleInlineTable';
import { mysqlApiBaseUrl, mysqlApiRequest } from '../lib/mysql/client';
import { useMasterData, type VendorMaster } from '../contexts/MasterDataContext';
import {
  ensureRelationalMasterRecords,
  saveRelationalMasterRecords,
} from '../lib/mysql/masterTables';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const API = mysqlApiBaseUrl?.replace(/\/api$/, '') || '';

const VENDOR_TYPES = [
  { value: 'goods_supplier', label: 'Goods Supplier' },
  { value: 'service_provider', label: 'Service Provider' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'intercompany', label: 'Inter-company' },
  { value: 'one_time', label: 'One-time Vendor' },
];

const ENTITY_TYPES = [
  { value: 'company', label: 'Company (Pvt Ltd / Ltd)' },
  { value: 'llp', label: 'LLP' },
  { value: 'partnership', label: 'Partnership Firm' },
  { value: 'proprietorship', label: 'Proprietorship' },
  { value: 'trust', label: 'Trust / Society' },
  { value: 'individual', label: 'Individual / HUF' },
  { value: 'foreign', label: 'Foreign Entity' },
];

const PAN_STATUSES = [
  { value: 'not_verified', label: 'Not Verified' },
  { value: 'verified', label: 'Verified' },
  { value: 'inoperative', label: 'Inoperative' },
  { value: 'invalid', label: 'Invalid' },
];

const MSME_CATEGORIES = [
  { value: '', label: 'Not Applicable' },
  { value: 'micro', label: 'Micro' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
];

const SECTION_206AB = [
  { value: 'not_applicable', label: 'Not Applicable' },
  { value: 'specified_person', label: 'Specified Person (Higher TDS)' },
  { value: 'non_filer', label: 'Non-filer of Returns' },
];

const GST_RETURN_FILED = [
  { value: 'regular_filer', label: 'Regular Filer' },
  { value: 'late_filer', label: 'Late Filer' },
  { value: 'non_filer', label: 'Non-Filer' },
  { value: 'not_applicable', label: 'Not Applicable (Unregistered)' },
];

const RCM_OPTIONS = [
  { value: 'no_forward_charge', label: 'No - Forward Charge' },
  { value: 'yes_section_9_3', label: 'Yes - Section 9(3)' },
  { value: 'yes_section_9_4', label: 'Yes - Section 9(4)' },
];

const LOWER_TDS_OPTIONS = [
  { value: 'not_applicable', label: 'Not Applicable' },
  { value: 'section_197', label: 'Section 197 Certificate' },
  { value: 'section_206aa', label: 'Section 206AA (No PAN)' },
];

const TDS_SECTIONS_OPTIONS = [
  { value: '194C_IND', label: '194C (Individuals/HUF)' },
  { value: '194C_OTH', label: '194C (Others)' },
  { value: '194J_PRO', label: '194J (Professional)' },
  { value: '194J_TECH', label: '194J (Technical)' },
  { value: '194I_A', label: '194I(a) (Plant & Machinery Rent)' },
  { value: '194I_B', label: '194I(b) (Land/Building Rent)' },
  { value: '194H', label: '194H (Commission)' },
  { value: '194Q', label: '194Q (Purchase of Goods)' },
  { value: '194A', label: '194A (Interest)' },
  { value: '194R', label: '194R (Perquisites)' },
];

const GST_TYPES = [
  { value: 'regular', label: 'Regular' },
  { value: 'composition', label: 'Composition' },
  { value: 'unregistered', label: 'Unregistered' },
  { value: 'sez', label: 'SEZ' },
  { value: 'embassy', label: 'Embassy / UN Body' },
  { value: 'input_service_distributor', label: 'Input Service Distributor' },
];

const ACCOUNT_TYPES = [
  { value: 'current', label: 'Current Account' },
  { value: 'savings', label: 'Savings Account' },
  { value: 'cc', label: 'Cash Credit' },
  { value: 'od', label: 'Overdraft' },
];

const CURRENCIES = [
  { value: 'INR', label: 'INR' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
];

const PAYMENT_TERMS_OPTIONS = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'net_7', label: 'Net 7' },
  { value: 'net_15', label: 'Net 15' },
  { value: 'net_30', label: 'Net 30' },
  { value: 'net_45', label: 'Net 45' },
  { value: 'net_60', label: 'Net 60' },
  { value: 'net_90', label: 'Net 90' },
];

/** GST state codes mapping */
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
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
};

const INDIAN_STATES = Object.values(GST_STATE_CODES);

function normalizeIdentityValue(value: string | undefined) {
  return (value || '').trim().toUpperCase();
}

function generateSystemVendorCode() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const stamp = String(now.getTime()).slice(-6);
  return `VND-${yyyy}${mm}${dd}-${stamp}`;
}

function duplicateVendorErrorMessage(
  currentRows: any[],
  currentVendorId: string | undefined,
  nextVendor: VendorMaster
) {
  const nextId = normalizeIdentityValue(currentVendorId || nextVendor.id);
  const nextCode = normalizeIdentityValue(nextVendor.code);
  const nextPan = normalizeIdentityValue(nextVendor.pan);
  const nextGstin = normalizeIdentityValue(nextVendor.gstin);

  const duplicate = currentRows.find((row: any) => {
    const rowId = normalizeIdentityValue(row?.id);
    if (nextId && rowId === nextId) {
      return false;
    }

    const rowCode = normalizeIdentityValue(row?.vendorCode || row?.code);
    const rowPan = normalizeIdentityValue(row?.pan);
    const rowGstin = normalizeIdentityValue(row?.gstin);

    return (
      (nextCode && rowCode === nextCode) ||
      (nextPan && rowPan === nextPan) ||
      (nextGstin && rowGstin === nextGstin)
    );
  });

  if (!duplicate) {
    return '';
  }

  const duplicateCode = duplicate.vendorCode || duplicate.code;
  const duplicateName =
    duplicate.legalName || duplicate.name || duplicate.vendor_legal_name || 'existing vendor';

  if (nextCode && normalizeIdentityValue(duplicateCode) === nextCode) {
    return `Vendor code ${nextVendor.code} already exists for ${duplicateName}.`;
  }
  if (nextGstin && normalizeIdentityValue(duplicate.gstin) === nextGstin) {
    return `GSTIN ${nextVendor.gstin} already exists for ${duplicateName}.`;
  }
  if (nextPan && normalizeIdentityValue(duplicate.pan) === nextPan) {
    return `PAN ${nextVendor.pan} already exists for ${duplicateName}.`;
  }

  return `A duplicate vendor already exists for ${duplicateName}.`;
}

/* ------------------------------------------------------------------ */
/*  Input style helper                                                 */
/* ------------------------------------------------------------------ */

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  fontSize: 13,
  border: '1.5px solid var(--color-silver)',
  borderRadius: 8,
  outline: 'none',
  color: 'var(--color-ink)',
  backgroundColor: '#fff',
  transition: 'border-color 0.15s',
};

const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'auto' as any };

/* ------------------------------------------------------------------ */
/*  Column definitions                                                 */
/* ------------------------------------------------------------------ */

const SPOC_COLUMNS: SimpleColumn[] = [
  { key: 'spoc_name', label: 'Name', type: 'text', required: true, placeholder: 'Full name' },
  { key: 'designation', label: 'Designation', type: 'text', placeholder: 'e.g. Accounts Manager' },
  { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'email@company.com' },
  { key: 'phone', label: 'Phone', type: 'text', placeholder: '+91-XXXXXXXXXX' },
  { key: 'location_label', label: 'Location', type: 'text', placeholder: 'e.g. Head Office' },
  { key: 'city', label: 'City', type: 'text' },
  {
    key: 'state',
    label: 'State',
    type: 'select',
    options: INDIAN_STATES.map((s) => ({ value: s, label: s })),
  },
  { key: 'pin_code', label: 'PIN', type: 'text', placeholder: '400001', width: '90px' },
];

const GST_COLUMNS: SimpleColumn[] = [
  { key: 'gst_type', label: 'Type', type: 'select', required: true, options: GST_TYPES },
  { key: 'gstin', label: 'GSTIN', type: 'text', required: true, placeholder: '22AAAAA0000A1Z5' },
  { key: 'address', label: 'Address', type: 'text', placeholder: 'Registered address' },
  { key: 'pin_code', label: 'PIN', type: 'text', placeholder: 'PIN Code', width: '90px' },
  { key: 'city', label: 'City', type: 'text', placeholder: 'City' },
  { key: 'state', label: 'State', type: 'readonly' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'suspended', label: 'Suspended' },
    ],
  },
];

const BANK_COLUMNS: SimpleColumn[] = [
  { key: 'bank_name', label: 'Bank Name', type: 'text', placeholder: 'e.g. HDFC Bank' },
  {
    key: 'account_number',
    label: 'Account Number',
    type: 'text',
    required: true,
    placeholder: 'Account number',
  },
  {
    key: 'ifsc_code',
    label: 'IFSC',
    type: 'text',
    required: true,
    placeholder: 'HDFC0001234',
    width: '130px',
  },
  { key: 'branch_name', label: 'Branch', type: 'text', placeholder: 'Branch' },
  { key: 'account_type', label: 'Account Type', type: 'select', options: ACCOUNT_TYPES },
  { key: 'currency', label: 'Currency', type: 'select', options: CURRENCIES, width: '100px' },
];

// Entity mapping columns defined dynamically inside the component (entityMappingColumns memo)
// to populate entity_id options from /api/entities.

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

const defaultVendor = {
  vendor_code: '',
  client_erp_vendor_code: '',
  vendor_legal_name: '',
  vendor_trade_name: '',
  vendor_group_id: '',
  vendor_group_name: '',
  vendor_group_code: '',
  vendor_type: 'goods_supplier',
  address_line: '',
  city: '',
  state: '',
  pin_code: '',
  country: 'India',
  status: 'draft',
};

const defaultPan = {
  pan: '',
  entity_type: '',
  pan_status: 'not_verified',
  cin_number: '',
  msme_number: '',
  msme_category: '',
  section_206ab: 'not_applicable',
  gst_return_filed: 'regular_filer',
  tds_sections: [] as string[],
  rcm_applicable: 'no_forward_charge',
  lower_tds_section: 'not_applicable',
  lower_tds_cert_number: '',
  lower_tds_cert_valid_from: '',
  lower_tds_cert_valid_to: '',
  lower_tds_cert_rate: '',
  // KYC source-tracking (read from server, displayed as chips)
  pan_verification_source: '' as string,
  pan_verified_at: '' as string,
  msme_verification_source: '' as string,
  msme_verified_at: '' as string,
  cin_verification_source: '' as string,
  cin_verified_at: '' as string,
  section_206ab_verification_source: '' as string,
  section_206ab_verified_at: '' as string,
};

const emptySpoc = () => ({
  spoc_name: '',
  designation: '',
  email: '',
  phone: '',
  is_primary: false,
  location_label: '',
  city: '',
  state: '',
  pin_code: '',
});

const emptyGst = () => ({
  gstin: '',
  gst_type: 'regular',
  gst_state_code: '',
  state: '',
  city: '',
  pin_code: '',
  address: '',
  spoc_id: '',
  status: 'active',
});

const emptyBank = () => ({
  account_number: '',
  ifsc_code: '',
  bank_name: '',
  branch_name: '',
  account_type: 'current',
  currency: 'INR',
  is_primary: false,
  status: 'active',
});

const emptyEntityMapping = () => ({
  entity_id: '',
  gl_code_expense: '',
  gl_code_expense_desc: '',
  gl_code_cogs: '',
  gl_code_cogs_desc: '',
  payment_terms: '',
  credit_days: '',
  credit_limit: '',
  cost_centre_id: '',
  profit_centre_id: '',
  block_for_po: false,
  block_for_po_reason: '',
  block_for_payment: false,
  block_for_payment_reason: '',
});

/* ------------------------------------------------------------------ */
/*  GSTIN helpers                                                      */
/* ------------------------------------------------------------------ */

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function extractGstState(gstin: string): { code: string; state: string } | null {
  if (gstin.length < 2) return null;
  const code = gstin.substring(0, 2);
  const state = GST_STATE_CODES[code];
  return state ? { code, state } : null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function VendorMasterCreate() {
  const { vendorId } = useParams<{ vendorId?: string }>();
  const navigate = useNavigate();
  const isEdit = !!vendorId;
  const { addVendor, updateVendor: updateVendorMaster, entities, vendorGroups } = useMasterData();

  /* ---- state ---- */
  const [vendor, setVendor] = useState({ ...defaultVendor });
  const [spocs, setSpocs] = useState<any[]>([]);
  const [panCompliance, setPanCompliance] = useState({ ...defaultPan });
  const [gstRegistrations, setGstRegistrations] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [entityOptions, setEntityOptions] = useState<{ value: string; label: string }[]>([]);
  const [entityMappings, setEntityMappings] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  /* ---- KYC verification state (Ongrid Gridlines) ---- */
  const [kycLoading, setKycLoading] = useState(false);
  const [kycResult, setKycResult] = useState<any>(null);
  const [kycError, setKycError] = useState('');
  const [kycVerified, setKycVerified] = useState(false);
  const [kycConsent, setKycConsent] = useState(false);
  const [kycSource, setKycSource] = useState<string>('');
  const [kycTxnId, setKycTxnId] = useState<string>('');
  const [kycMockMode, setKycMockMode] = useState(false);

  /* MSME / Udyam verification */
  const [msmeLoading, setMsmeLoading] = useState(false);
  const [msmeResult, setMsmeResult] = useState<any>(null);
  const [msmeError, setMsmeError] = useState('');

  /* Bank verification (per-row) */
  const [bankVerifying, setBankVerifying] = useState<Record<number, boolean>>({});
  const [bankResults, setBankResults] = useState<Record<number, any>>({});
  const [bankErrors, setBankErrors] = useState<Record<number, string>>({});

  const toMasterVendor = useCallback(
    (savedId?: string, effectiveStatus?: string): VendorMaster => {
      const nextStatus = effectiveStatus || vendor.status;
      const normalizedApprovalStatus =
        nextStatus === 'pending_approval'
          ? 'Pending Approval'
          : nextStatus === 'approved'
            ? 'Approved'
            : nextStatus === 'rejected'
              ? 'Rejected'
              : nextStatus === 'changes_requested'
                ? 'Changes Requested'
                : 'Draft';
      const normalizedStatus: VendorMaster['status'] =
        nextStatus === 'inactive' ? 'Inactive' : nextStatus === 'blocked' ? 'Blocked' : 'Active';
      const primaryEntity = entityMappings[0];
      const primaryGst = gstRegistrations[0];
      const resolvedVendorCode =
        vendor.vendor_code || savedId || vendorId || generateSystemVendorCode();

      return {
        id: savedId || vendorId || resolvedVendorCode,
        code: resolvedVendorCode,
        clientErpVendorCode: vendor.client_erp_vendor_code || undefined,
        name: vendor.vendor_trade_name || vendor.vendor_legal_name || 'Unnamed Vendor',
        legalName: vendor.vendor_legal_name || vendor.vendor_trade_name || 'Unnamed Vendor',
        approvalStatus: normalizedApprovalStatus,
        pan: panCompliance.pan || '',
        gstin: primaryGst?.gstin || '',
        email: spocs[0]?.email || '',
        phone: spocs[0]?.phone || '',
        category: vendor.vendor_group_name || 'Independent Vendors',
        vendorType:
          vendor.vendor_type === 'intercompany' || vendor.vendor_type === 'foreign'
            ? 'Import'
            : 'Domestic',
        msmeRegistered: Boolean(panCompliance.msme_number),
        msmeNumber: panCompliance.msme_number || undefined,
        msmeCategory: (panCompliance.msme_category
          ? `${panCompliance.msme_category}`.charAt(0).toUpperCase() +
            `${panCompliance.msme_category}`.slice(1)
          : undefined) as VendorMaster['msmeCategory'],
        status: normalizedStatus,
        paymentTerms: primaryEntity?.payment_terms || 'Net 30',
        creditDays: Number(primaryEntity?.credit_days) || 30,
        bankAccounts: bankAccounts.map((b, idx) => ({
          id: b.id || `${savedId || vendorId || 'bank'}-${idx}`,
          accountNumber: b.account_number || '',
          accountName: b.account_name || vendor.vendor_legal_name || '',
          ifscCode: b.ifsc_code || '',
          bankName: b.bank_name || '',
          branchName: b.branch_name || '',
          accountType: b.account_type === 'savings' ? 'Savings' : 'Current',
          isPrimary: Boolean(b.is_primary),
          verified: Boolean(bankResults[idx]?.success || bankResults[idx]?.verified),
          verifiedDate: bankResults[idx] ? new Date().toISOString().split('T')[0] : undefined,
        })),
        addresses: gstRegistrations.map((g, idx) => ({
          id: g.id || `${savedId || vendorId || 'gst'}-${idx}`,
          type: 'Registered',
          addressLine1: g.address || vendor.address_line || '',
          city: g.city || vendor.city || '',
          state: g.state || vendor.state || '',
          stateCode: g.gst_state_code || '',
          pincode: g.pin_code || vendor.pin_code || '',
          country: vendor.country || 'India',
          gstin: g.gstin || undefined,
          isPrimary: idx === 0,
        })),
        createdBy: 'System',
        createdDate: new Date().toISOString().split('T')[0],
        entityId: primaryEntity?.entity_id || undefined,
        entityName: primaryEntity?.entity_id || undefined,
        country: vendor.country || 'India',
        currency: bankAccounts[0]?.currency || 'INR',
        tdsApplicable: Array.isArray(panCompliance.tds_sections)
          ? panCompliance.tds_sections.length > 0
          : false,
        tdsSection:
          Array.isArray(panCompliance.tds_sections) && panCompliance.tds_sections.length > 0
            ? panCompliance.tds_sections[0]
            : undefined,
        section206ABApplicable:
          panCompliance.section_206ab === 'specified_person' ||
          panCompliance.section_206ab === 'non_filer',
      };
    },
    [
      vendor,
      vendorId,
      panCompliance,
      spocs,
      gstRegistrations,
      entityMappings,
      bankAccounts,
      bankResults,
    ]
  );

  const verifyMsme = useCallback(async () => {
    const udyam = (panCompliance.msme_number || '').toUpperCase().trim();
    if (!udyam) {
      setMsmeError('Enter Udyam number first');
      return;
    }
    if (!kycConsent) {
      setMsmeError('Tick the consent checkbox above first.');
      return;
    }
    setMsmeLoading(true);
    setMsmeError('');
    try {
      const data = await mysqlApiRequest<any>('/kyc/verify-msme', {
        method: 'POST',
        body: JSON.stringify({
          udyam_number: udyam,
          consent: 'Y',
          reason: 'Vendor onboarding KYC',
        }),
      });
      if (data.success) {
        setMsmeResult({
          ...data.data,
          source: data.source,
          transaction_id: data.transaction_id,
          mock_mode: data.mock_mode,
        });
        if (data.data.enterprise_type && !panCompliance.msme_category) {
          setPanCompliance((prev) => ({ ...prev, msme_category: data.data.enterprise_type }));
        }
      } else {
        setMsmeError(data.error || 'MSME verification failed');
      }
    } catch {
      setMsmeError('KYC service unavailable');
    } finally {
      setMsmeLoading(false);
    }
  }, [panCompliance.msme_number, panCompliance.msme_category, kycConsent]);

  const verifyBankRow = useCallback(
    async (idx: number) => {
      const row = bankAccounts[idx];
      if (!row?.account_number || !row?.ifsc_code) {
        setBankErrors((prev) => ({ ...prev, [idx]: 'Account number and IFSC required' }));
        return;
      }
      if (!kycConsent) {
        setBankErrors((prev) => ({ ...prev, [idx]: 'Tick the consent checkbox above first.' }));
        return;
      }
      setBankVerifying((prev) => ({ ...prev, [idx]: true }));
      setBankErrors((prev) => ({ ...prev, [idx]: '' }));
      try {
        const data = await mysqlApiRequest<any>('/kyc/verify-bank', {
          method: 'POST',
          body: JSON.stringify({
            account_number: row.account_number,
            ifsc: row.ifsc_code.toUpperCase(),
            consent: 'Y',
            reason: 'Vendor onboarding KYC',
          }),
        });
        if (data.success) {
          setBankResults((prev) => ({
            ...prev,
            [idx]: {
              ...data.data,
              source: data.source,
              transaction_id: data.transaction_id,
              mock_mode: data.mock_mode,
            },
          }));
          setBankAccounts((prev) =>
            prev.map((r, i) =>
              i === idx
                ? {
                    ...r,
                    bank_name: r.bank_name || data.data.bank_name || '',
                    branch_name: r.branch_name || data.data.branch || '',
                  }
                : r
            )
          );
        } else {
          setBankErrors((prev) => ({ ...prev, [idx]: data.error || 'Bank verification failed' }));
        }
      } catch {
        setBankErrors((prev) => ({ ...prev, [idx]: 'KYC service unavailable' }));
      } finally {
        setBankVerifying((prev) => ({ ...prev, [idx]: false }));
      }
    },
    [bankAccounts, kycConsent]
  );

  /* ---- fetch for edit ---- */
  useEffect(() => {
    if (!vendorId) return;
    setLoading(true);
    mysqlApiRequest<any>(`/vendors/${vendorId}`)
      .then((res) => {
        if (!res.success) throw new Error(res.error || 'Failed to load vendor');
        const d = res.data;
        setVendor({
          vendor_code: d.vendor_code || '',
          client_erp_vendor_code: d.client_erp_vendor_code || d.clientErpVendorCode || '',
          vendor_legal_name: d.vendor_legal_name || '',
          vendor_trade_name: d.vendor_trade_name || '',
          vendor_group_id: d.vendor_group_id || '',
          vendor_group_name: d.vendor_group_name || '',
          vendor_group_code: d.vendor_group_code || '',
          vendor_type: d.vendor_type || 'goods_supplier',
          address_line: d.address_line || '',
          city: d.city || '',
          state: d.state || '',
          pin_code: d.pin_code || '',
          country: d.country || 'India',
          status: d.status || 'draft',
        });
        setSpocs(d.spocs || []);
        if (d.pan_compliance) {
          setPanCompliance({
            pan: d.pan_compliance.pan || '',
            entity_type: d.pan_compliance.entity_type || '',
            pan_status: d.pan_compliance.pan_status || 'not_verified',
            cin_number: d.pan_compliance.cin_number || '',
            msme_number: d.pan_compliance.msme_number || '',
            msme_category: d.pan_compliance.msme_category || '',
            section_206ab: d.pan_compliance.section_206ab || 'not_applicable',
            gst_return_filed: d.pan_compliance.gst_return_filed || 'regular_filer',
            tds_sections: d.pan_compliance.tds_sections || [],
            rcm_applicable: d.pan_compliance.rcm_applicable || 'no_forward_charge',
            lower_tds_section: d.pan_compliance.lower_tds_section || 'not_applicable',
            lower_tds_cert_number: d.pan_compliance.lower_tds_cert_number || '',
            lower_tds_cert_valid_from: d.pan_compliance.lower_tds_cert_valid_from || '',
            lower_tds_cert_valid_to: d.pan_compliance.lower_tds_cert_valid_to || '',
            lower_tds_cert_rate: d.pan_compliance.lower_tds_cert_rate ?? '',
            pan_verification_source: d.pan_compliance.pan_verification_source || '',
            pan_verified_at: d.pan_compliance.pan_verified_at || '',
            msme_verification_source: d.pan_compliance.msme_verification_source || '',
            msme_verified_at: d.pan_compliance.msme_verified_at || '',
            cin_verification_source: d.pan_compliance.cin_verification_source || '',
            cin_verified_at: d.pan_compliance.cin_verified_at || '',
            section_206ab_verification_source:
              d.pan_compliance.section_206ab_verification_source || '',
            section_206ab_verified_at: d.pan_compliance.section_206ab_verified_at || '',
          });
        }
        setGstRegistrations(d.gst_registrations || []);
        setBankAccounts(d.bank_accounts || []);
        setEntityMappings(d.entity_mappings || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [vendorId]);

  /* ---- entities for entity-mapping dropdown (sourced from MasterDataContext) ---- */
  useEffect(() => {
    if (!entities || entities.length === 0) return;
    setEntityOptions(
      entities.map((e) => ({
        value: e.id,
        label: `${e.name}${e.code ? ` (${e.code})` : ''}`,
      }))
    );
  }, [entities]);

  // Build entity mapping columns with dynamic entity options
  const entityMappingColumns = useMemo<SimpleColumn[]>(
    () => [
      { key: 'entity_id', label: 'Entity', type: 'select', required: true, options: entityOptions },
      { key: 'gl_code_expense', label: 'GL Code', type: 'text', placeholder: 'e.g. 2108-VENDO' },
      {
        key: 'payment_terms',
        label: 'Payment Terms',
        type: 'select',
        options: PAYMENT_TERMS_OPTIONS,
      },
      {
        key: 'credit_days',
        label: 'Credit Days',
        type: 'number',
        placeholder: 'e.g. 30',
        width: '120px',
      },
      { key: 'credit_limit', label: 'Credit Limit', type: 'number', placeholder: 'e.g. 5000000' },
      { key: 'block_for_po', label: 'Block PO', type: 'checkbox', align: 'center', width: '90px' },
      {
        key: 'block_for_payment',
        label: 'Block Pay',
        type: 'checkbox',
        align: 'center',
        width: '90px',
      },
    ],
    [entityOptions]
  );

  /* ---- field update helpers ---- */
  const updateVendor = useCallback((field: string, value: any) => {
    setVendor((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updatePan = useCallback((field: string, value: any) => {
    setPanCompliance((prev) => ({ ...prev, [field]: value }));
  }, []);

  /* ---- spoc row handlers ---- */
  const handleSpocChange = useCallback((idx: number, field: string, value: any) => {
    setSpocs((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }, []);

  const handleSpocPrimary = useCallback((idx: number) => {
    setSpocs((prev) => prev.map((r, i) => ({ ...r, is_primary: i === idx })));
  }, []);

  /* ---- GST row handlers with auto-fill ---- */
  const handleGstChange = useCallback((idx: number, field: string, value: any) => {
    setGstRegistrations((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const updated = { ...r, [field]: value };
        if (field === 'gstin' && typeof value === 'string') {
          const info = extractGstState(value.toUpperCase());
          if (info) {
            updated.gst_state_code = info.code;
            updated.state = info.state;
          } else {
            updated.gst_state_code = '';
            updated.state = '';
          }
          updated.gstin = value.toUpperCase();
        }
        return updated;
      })
    );
  }, []);

  /* ---- bank row handlers ---- */
  const handleBankChange = useCallback((idx: number, field: string, value: any) => {
    setBankAccounts((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }, []);

  const handleBankPrimary = useCallback((idx: number) => {
    setBankAccounts((prev) => prev.map((r, i) => ({ ...r, is_primary: i === idx })));
  }, []);

  /* ---- entity mapping row handlers ---- */
  const handleEntityMappingChange = useCallback((idx: number, field: string, value: any) => {
    setEntityMappings((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }, []);

  /* ---- completeness ---- */
  const completeness = useMemo(() => {
    let filled = 0;
    const total = 5;
    if (vendor.vendor_legal_name) filled++;
    if (vendor.vendor_type) filled++;
    if (spocs.length > 0 && spocs.some((s) => s.spoc_name && s.email)) filled++;
    if (panCompliance.pan) filled++;
    if (gstRegistrations.length > 0) filled++;
    return Math.round((filled / total) * 100);
  }, [vendor, spocs, panCompliance, gstRegistrations]);

  /* ---- save ---- */
  const handleSave = useCallback(
    async (status?: string) => {
      if (!vendor.vendor_legal_name) {
        setError('Vendor Legal Name is required');
        return;
      }
      setSaving(true);
      setError('');
      const effectiveStatus = status || vendor.status || 'draft';
      try {
        // For new vendors, vendor_code is auto-generated by the server.
        // Try the API first so we can use the assigned code for the local master list.
        let serverAssignedCode = '';
        const apiPayload = {
          ...vendor,
          status: effectiveStatus,
          spocs,
          pan_compliance: panCompliance,
          gst_registrations: gstRegistrations,
          bank_accounts: bankAccounts,
          entity_mappings: entityMappings,
        };
        try {
          const path = isEdit ? `/vendors/${vendorId}` : '/vendors';
          const data = await mysqlApiRequest<any>(path, {
            method: isEdit ? 'PUT' : 'POST',
            body: JSON.stringify(apiPayload),
          });
          if (data?.success && data?.data?.vendor_code) {
            serverAssignedCode = String(data.data.vendor_code);
          }
          if (
            effectiveStatus === 'pending_approval' &&
            !isEdit &&
            data?.success &&
            data?.data?.id
          ) {
            await mysqlApiRequest(`/vendors/${data.data.id}/submit`, { method: 'POST' });
          }
        } catch {
          // Network/API failure — fall back to client-generated code so the
          // local master list still gets a saved row.
        }

        // Use server code when available; fall back to client preview only if
        // the API call failed (preserves offline-friendly behavior).
        const resolvedVendorCode =
          serverAssignedCode || vendor.vendor_code || generateSystemVendorCode();
        const savedId = vendorId || resolvedVendorCode;
        if (!vendor.vendor_code || vendor.vendor_code !== resolvedVendorCode) {
          setVendor((prev) => ({ ...prev, vendor_code: resolvedVendorCode }));
        }
        const masterVendor = toMasterVendor(savedId, effectiveStatus);
        const currentMasterRows = await ensureRelationalMasterRecords<any>('vendor_master', []);
        const duplicateError = duplicateVendorErrorMessage(
          currentMasterRows,
          savedId,
          masterVendor
        );
        if (duplicateError) {
          setError(duplicateError);
          setSaving(false);
          return;
        }
        const existingIdx = currentMasterRows.findIndex((row: any) => row.id === savedId);
        const nextMasterRows =
          existingIdx >= 0
            ? currentMasterRows.map((row: any, idx: number) =>
                idx === existingIdx ? masterVendor : row
              )
            : [masterVendor, ...currentMasterRows];
        await saveRelationalMasterRecords('vendor_master', nextMasterRows);

        if (isEdit) {
          updateVendorMaster(masterVendor);
        } else {
          addVendor(masterVendor);
        }

        navigate('/vendors');
      } catch (e: any) {
        setError(e.message || 'Save failed');
      } finally {
        setSaving(false);
      }
    },
    [
      vendor,
      spocs,
      panCompliance,
      gstRegistrations,
      bankAccounts,
      entityMappings,
      isEdit,
      vendorId,
      navigate,
      toMasterVendor,
      addVendor,
      updateVendorMaster,
    ]
  );

  /* ---- render helpers ---- */
  const renderKycSourceChip = (source: string, verifiedAt: string, fieldValue: string) => {
    if (!fieldValue) return null;
    const chipConfig: Record<string, { label: string; bg: string; color: string }> = {
      manual: { label: 'Manual', bg: '#F3F4F6', color: '#6B7280' },
      api_surepass: { label: 'Verified (Surepass)', bg: '#D1FAE5', color: '#065F46' },
      api_ongrid: { label: 'Verified (Ongrid)', bg: '#D1FAE5', color: '#065F46' },
      pending_verification: { label: 'Pending', bg: '#DBEAFE', color: '#1E40AF' },
      not_verified: { label: 'Not verified', bg: '#FEF3C7', color: '#92400E' },
    };
    const cfg = chipConfig[source] || chipConfig.not_verified;
    return (
      <span
        title={verifiedAt ? `Verified at: ${verifiedAt}` : 'Not yet verified'}
        style={{
          display: 'inline-block',
          fontSize: 10,
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: 10,
          backgroundColor: cfg.bg,
          color: cfg.color,
          marginLeft: 6,
          cursor: 'default',
          verticalAlign: 'middle',
        }}
      >
        {cfg.label}
      </span>
    );
  };

  const renderMultiSelect = (
    field: string,
    selected: string[],
    options: { value: string; label: string }[],
    onChange: (f: string, v: string[]) => void
  ) => (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        padding: '6px 8px',
        border: '1.5px solid var(--color-silver)',
        borderRadius: 8,
        minHeight: 38,
        backgroundColor: '#fff',
      }}
    >
      {options.map((o) => {
        const isSelected = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => {
              const next = isSelected
                ? selected.filter((s) => s !== o.value)
                : [...selected, o.value];
              onChange(field, next);
            }}
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: '3px 10px',
              borderRadius: 14,
              cursor: 'pointer',
              border: isSelected ? '1.5px solid #007D87' : '1px solid #D1D5DB',
              backgroundColor: isSelected ? '#E6FBF5' : '#F9FAFB',
              color: isSelected ? '#007D60' : '#6B7280',
              transition: 'all 0.15s',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );

  const renderInput = (
    field: string,
    placeholder: string,
    value: string,
    onChange: (f: string, v: string) => void
  ) => (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(field, e.target.value)}
      style={inputStyle}
      onFocus={(e) => {
        (e.target as HTMLInputElement).style.borderColor = 'var(--color-teal)';
      }}
      onBlur={(e) => {
        (e.target as HTMLInputElement).style.borderColor = 'var(--color-silver)';
      }}
    />
  );

  const renderSelect = (
    field: string,
    value: string,
    options: { value: string; label: string }[],
    onChange: (f: string, v: string) => void
  ) => (
    <select value={value} onChange={(e) => onChange(field, e.target.value)} style={selectStyle}>
      <option value="">Select...</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: '3px solid var(--color-silver)',
              borderTopColor: 'var(--color-teal)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }}
          />
          <p style={{ color: 'var(--color-mercury-grey)', fontSize: 14 }}>Loading vendor...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <FormShell
      title={isEdit ? 'Edit Vendor' : 'Create Vendor'}
      subtitle={
        isEdit
          ? `Editing ${vendor.vendor_legal_name || 'vendor'}`
          : 'Add a new vendor to the system'
      }
      headerExtra={
        kycVerified ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              backgroundColor: '#E6FBF5',
              color: '#007D60',
              border: '0.5px solid #9FE8D0',
            }}
          >
            &#10003; KYC Verified
          </span>
        ) : undefined
      }
      masterName="Vendor Master"
      onBack={() => navigate('/vendors')}
      onSaveDraft={() => handleSave('draft')}
      onSubmit={() => handleSave('pending_approval')}
      submitLabel="Submit for Approval"
      draftLabel={saving ? 'Saving...' : 'Save Draft'}
      completeness={completeness}
    >
      {error && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: 16,
            borderRadius: 8,
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#DC2626',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* ── Single outer container wraps all sections ────────── */}
      <div
        className="bg-white rounded-xl border-2 px-8"
        style={{ borderColor: 'var(--color-silver)' }}
      >
        {/* ── Section 1: Basic Details ────────────────────────── */}
        <FormSection
          title="Basic Details"
          subtitle="Core vendor identification"
          columns={3}
          icon={<Building2 style={{ width: 20, height: 20, color: 'var(--color-teal)' }} />}
          flat
          style={{ borderTop: 'none', paddingTop: 24 }}
        >
          <PxFormField label="Vendor Code" hint="Auto-generated by the system on save">
            <input
              type="text"
              value={vendor.vendor_code}
              placeholder="(assigned on save)"
              readOnly
              tabIndex={-1}
              style={{
                ...inputStyle,
                backgroundColor: 'var(--color-cloud)',
                cursor: 'not-allowed',
              }}
            />
          </PxFormField>
          <PxFormField label="Client ERP Vendor Code" hint="Update after ERP integration">
            {renderInput(
              'client_erp_vendor_code',
              'ERP vendor code from client system',
              vendor.client_erp_vendor_code,
              updateVendor
            )}
          </PxFormField>
          <PxFormField label="Legal Name" required>
            {renderInput(
              'vendor_legal_name',
              'Registered company name',
              vendor.vendor_legal_name,
              updateVendor
            )}
          </PxFormField>
          <PxFormField label="Trade Name">
            {renderInput(
              'vendor_trade_name',
              'Brand or trade name',
              vendor.vendor_trade_name,
              updateVendor
            )}
          </PxFormField>
          <PxFormField label="Vendor Group">
            <select
              value={vendor.vendor_group_id || ''}
              onChange={(e) => {
                const id = e.target.value;
                const grp = vendorGroups.find((g) => g.id === id);
                setVendor((prev) => ({
                  ...prev,
                  vendor_group_id: id,
                  vendor_group_code: grp?.recordCode ?? grp?.code ?? '',
                  vendor_group_name: grp?.recordName ?? grp?.name ?? grp?.group_name ?? '',
                }));
              }}
              style={selectStyle}
            >
              <option value="">Select group…</option>
              {vendorGroups.map((g) => {
                const code = g.recordCode ?? g.code ?? '';
                const name = g.recordName ?? g.name ?? g.group_name ?? code;
                return (
                  <option key={g.id ?? code ?? name} value={g.id ?? ''}>
                    {code ? `${code} — ${name}` : name}
                  </option>
                );
              })}
            </select>
          </PxFormField>
          <PxFormField label="Group Code">
            <input
              type="text"
              value={vendor.vendor_group_code}
              readOnly
              placeholder="(auto-filled from group)"
              style={{ ...selectStyle, background: 'var(--color-cloud)' }}
            />
          </PxFormField>
          <PxFormField label="Vendor Type" required>
            {renderSelect('vendor_type', vendor.vendor_type, VENDOR_TYPES, updateVendor)}
          </PxFormField>
        </FormSection>

        {/* ── Section 2: SPOC Contacts ────────────────────────── */}
        <FormSection
          title="Contact Details"
          subtitle="Key contact persons at the vendor"
          columns={1}
          icon={<Users style={{ width: 20, height: 20, color: 'var(--color-teal)' }} />}
          action={
            <AddRowButton
              label="Add Contact"
              onClick={() => setSpocs((prev) => [...prev, emptySpoc()])}
            />
          }
          flat
        >
          <SimpleInlineTable
            columns={SPOC_COLUMNS}
            rows={spocs}
            onRowChange={handleSpocChange}
            onRemoveRow={(idx) => setSpocs((prev) => prev.filter((_, i) => i !== idx))}
            primaryField="is_primary"
            onPrimaryChange={handleSpocPrimary}
            emptyMessage="No contacts yet. Click “Add Contact” to create one."
          />
        </FormSection>

        {/* ── Section 3: Registered Address ───────────────────── */}
        <FormSection
          title="Registered Address"
          subtitle="Primary registered address"
          columns={3}
          icon={<MapPin style={{ width: 20, height: 20, color: 'var(--color-teal)' }} />}
          flat
        >
          <PxFormField label="Address Line" colSpan={3}>
            <textarea
              value={vendor.address_line}
              onChange={(e) => updateVendor('address_line', e.target.value)}
              placeholder="Full address"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
              onFocus={(e) => {
                (e.target as HTMLTextAreaElement).style.borderColor = 'var(--color-teal)';
              }}
              onBlur={(e) => {
                (e.target as HTMLTextAreaElement).style.borderColor = 'var(--color-silver)';
              }}
            />
          </PxFormField>
          <PxFormField label="City">
            {renderInput('city', 'City', vendor.city, updateVendor)}
          </PxFormField>
          <PxFormField label="State">
            {renderSelect(
              'state',
              vendor.state,
              INDIAN_STATES.map((s) => ({ value: s, label: s })),
              updateVendor
            )}
          </PxFormField>
          <PxFormField label="PIN Code">
            {renderInput('pin_code', '400001', vendor.pin_code, updateVendor)}
          </PxFormField>
          <PxFormField label="Country">
            {renderInput('country', 'Country', vendor.country, updateVendor)}
          </PxFormField>
        </FormSection>

        {/* ── Section 4: Tax & Compliance ─────────────────────── */}
        <FormSection
          title="Tax & Compliance"
          subtitle="PAN, TDS, GST, and MSME details"
          columns={1}
          icon={<ShieldCheck style={{ width: 20, height: 20, color: 'var(--color-teal)' }} />}
          flat
        >
          {/* PAN sub-section */}
          <div style={{ marginBottom: 24 }}>
            <h3
              style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 12 }}
            >
              PAN & Identity
            </h3>

            {/* Consent banner */}
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 12px',
                marginBottom: 12,
                borderRadius: 8,
                border: `1px solid ${kycConsent ? '#9FE8D0' : 'var(--color-silver)'}`,
                backgroundColor: kycConsent ? '#F0FBF7' : '#FAFBFC',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={kycConsent}
                onChange={(e) => setKycConsent(e.target.checked)}
                style={{ marginTop: 2, accentColor: '#007D87' }}
              />
              <span style={{ fontSize: 12, color: 'var(--color-ink)', lineHeight: 1.5 }}>
                I confirm that the vendor has provided consent to verify PAN, GSTIN, bank account
                and Udyam/MSME details via Ongrid Gridlines for onboarding KYC. Required by law
                before any verification call.
              </span>
            </label>

            <div className="grid grid-cols-3 gap-6">
              <PxFormField label="PAN Number">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    {renderInput('pan', 'AAAAA9999A', panCompliance.pan, updatePan)}
                    {renderKycSourceChip(
                      panCompliance.pan_verification_source,
                      panCompliance.pan_verified_at,
                      panCompliance.pan
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      if (!panCompliance.pan || panCompliance.pan.length !== 10) {
                        setKycError('Enter valid 10-char PAN first');
                        return;
                      }
                      if (!kycConsent) {
                        setKycError('Vendor consent is required before running KYC checks.');
                        return;
                      }
                      setKycLoading(true);
                      setKycError('');
                      const pan = panCompliance.pan.toUpperCase();
                      const isCompany = pan.charAt(3) === 'C' || pan.charAt(3) === 'L';
                      const endpoint = isCompany
                        ? '/kyc/verify-pan-comprehensive'
                        : '/kyc/verify-pan';
                      try {
                        const data = await mysqlApiRequest<any>(endpoint, {
                          method: 'POST',
                          body: JSON.stringify({
                            pan,
                            consent: 'Y',
                            reason: 'Vendor onboarding KYC',
                          }),
                        });
                        if (data.success) {
                          setKycResult(data.data);
                          setKycVerified(true);
                          setKycSource(data.source || 'ongrid');
                          setKycTxnId(data.transaction_id || '');
                          setKycMockMode(Boolean(data.mock_mode));
                        } else {
                          setKycError(data.error || 'Verification failed');
                        }
                      } catch {
                        setKycError('KYC service unavailable');
                      } finally {
                        setKycLoading(false);
                      }
                    }}
                    disabled={kycLoading || kycVerified || !kycConsent}
                    style={{
                      height: 30,
                      padding: '0 12px',
                      borderRadius: 6,
                      fontSize: '11.5px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: kycLoading || kycVerified || !kycConsent ? 'not-allowed' : 'pointer',
                      backgroundColor: kycVerified
                        ? '#E6FBF5'
                        : kycLoading || !kycConsent
                          ? '#F6F9FC'
                          : '#007D87',
                      color: kycVerified
                        ? '#007D60'
                        : kycLoading || !kycConsent
                          ? '#9CA3AF'
                          : '#FFFFFF',
                      whiteSpace: 'nowrap',
                    }}
                    title={!kycConsent ? 'Tick the consent checkbox to enable KYC' : ''}
                  >
                    {kycVerified
                      ? '\u2713 Verified'
                      : kycLoading
                        ? 'Verifying...'
                        : 'Verify PAN \u2192'}
                  </button>
                </div>
              </PxFormField>
              <PxFormField label="Entity Type">
                {renderSelect('entity_type', panCompliance.entity_type, ENTITY_TYPES, updatePan)}
              </PxFormField>
              <PxFormField label="PAN Status">
                {renderSelect('pan_status', panCompliance.pan_status, PAN_STATUSES, updatePan)}
              </PxFormField>
              <PxFormField label="CIN Number">
                {renderInput('cin_number', 'Company CIN', panCompliance.cin_number, updatePan)}
                {renderKycSourceChip(
                  panCompliance.cin_verification_source,
                  panCompliance.cin_verified_at,
                  panCompliance.cin_number
                )}
              </PxFormField>
              <PxFormField
                label="MSME / Udyam Number"
                hint={
                  msmeResult
                    ? `Verified via ${msmeResult.source} — ${msmeResult.enterprise_name}`
                    : msmeError || undefined
                }
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    {renderInput(
                      'msme_number',
                      'UDYAM-XX-00-0000000',
                      panCompliance.msme_number,
                      updatePan
                    )}
                  </div>
                  <button
                    onClick={verifyMsme}
                    disabled={msmeLoading || !panCompliance.msme_number || !kycConsent}
                    style={{
                      height: 30,
                      padding: '0 12px',
                      borderRadius: 6,
                      fontSize: '11.5px',
                      fontWeight: 600,
                      border: 'none',
                      cursor:
                        msmeLoading || !panCompliance.msme_number || !kycConsent
                          ? 'not-allowed'
                          : 'pointer',
                      backgroundColor: msmeResult
                        ? '#E6FBF5'
                        : msmeLoading || !kycConsent
                          ? '#F6F9FC'
                          : '#007D87',
                      color: msmeResult
                        ? '#007D60'
                        : msmeLoading || !kycConsent
                          ? '#9CA3AF'
                          : '#FFFFFF',
                      whiteSpace: 'nowrap',
                    }}
                    title={!kycConsent ? 'Tick the consent checkbox above first' : ''}
                  >
                    {msmeResult
                      ? '\u2713 Verified'
                      : msmeLoading
                        ? 'Verifying...'
                        : 'Verify Udyam \u2192'}
                  </button>
                </div>
                {renderKycSourceChip(
                  panCompliance.msme_verification_source,
                  panCompliance.msme_verified_at,
                  panCompliance.msme_number
                )}
              </PxFormField>
              <PxFormField label="MSME Category">
                {renderSelect(
                  'msme_category',
                  panCompliance.msme_category,
                  MSME_CATEGORIES,
                  updatePan
                )}
              </PxFormField>
            </div>

            {/* KYC Result Panel */}
            {kycResult && (
              <div
                style={{
                  border: '1.5px solid #9FE8D0',
                  borderRadius: 12,
                  backgroundColor: '#E6FBF5',
                  padding: 16,
                  marginTop: 12,
                  marginBottom: 12,
                }}
              >
                {kycMockMode && (
                  <div
                    style={{
                      padding: '6px 10px',
                      marginBottom: 10,
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor: '#FEF3C7',
                      color: '#92400E',
                      border: '1px solid #FCD34D',
                    }}
                  >
                    ⚠ Mock mode — Ongrid API key not configured. Set ONGRID_API_KEY to use live
                    verification.
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#007D60', fontSize: 16 }}>{'\u2713'}</span>
                    <span style={{ fontWeight: 600, color: '#007D60', fontSize: 14 }}>
                      KYC Verified — {kycResult.name}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 11,
                      color: '#6E7A82',
                    }}
                  >
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 600,
                        backgroundColor: '#FFFFFF',
                        color: '#007D87',
                        border: '1px solid #9FE8EE',
                      }}
                    >
                      {kycSource || 'ongrid'}
                    </span>
                    {kycTxnId && (
                      <span title={kycTxnId}>txn: {String(kycTxnId).slice(0, 12)}…</span>
                    )}
                  </div>
                </div>
                {/* PAN-GSTIN cross-check warning */}
                {(() => {
                  const mismatches = (kycResult.gstin_list || []).filter((g: any) => {
                    const gPan = g.gstin?.slice(2, 12);
                    return gPan && gPan !== kycResult.pan;
                  });
                  if (mismatches.length === 0) return null;
                  return (
                    <div
                      style={{
                        padding: '6px 10px',
                        marginBottom: 10,
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 500,
                        backgroundColor: '#FEF2F2',
                        color: '#B91C1C',
                        border: '1px solid #FECACA',
                      }}
                    >
                      ⚠ {mismatches.length} GSTIN(s) belong to a different PAN — please review
                      before auto-filling.
                    </div>
                  );
                })()}
                <div
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}
                >
                  <div>
                    <span style={{ color: '#6E7A82' }}>Entity Type:</span>{' '}
                    <strong>{kycResult.entity_type}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6E7A82' }}>PAN Status:</span>{' '}
                    <strong style={{ color: '#007D60' }}>{kycResult.pan_status}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6E7A82' }}>Incorporation:</span>{' '}
                    <strong>{kycResult.date_of_incorporation || '\u2014'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6E7A82' }}>CIN:</span>{' '}
                    <strong>{kycResult.cin || '\u2014'}</strong>
                  </div>
                  {kycResult.directors?.length > 0 && (
                    <div style={{ gridColumn: '1/3' }}>
                      <span style={{ color: '#6E7A82' }}>Directors:</span>{' '}
                      <strong>{kycResult.directors.join(', ')}</strong>
                    </div>
                  )}
                  {kycResult.gstin_list?.length > 0 && (
                    <div style={{ gridColumn: '1/3' }}>
                      <span style={{ color: '#6E7A82' }}>GST Registrations:</span>{' '}
                      <strong>{kycResult.gstin_list.length} found</strong>
                      <div style={{ marginTop: 4 }}>
                        {kycResult.gstin_list.map((g: any, i: number) => (
                          <span
                            key={i}
                            style={{
                              display: 'inline-block',
                              margin: '4px 4px 0 0',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 11,
                              backgroundColor: '#D6F7F9',
                              color: '#007D87',
                            }}
                          >
                            {g.gstin} &middot; {g.state}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => {
                      setVendor((prev) => ({
                        ...prev,
                        vendor_legal_name: kycResult.name || prev.vendor_legal_name,
                        address_line: kycResult.registered_address?.address || prev.address_line,
                        city: kycResult.registered_address?.city || prev.city,
                        state: kycResult.registered_address?.state || prev.state,
                        pin_code: kycResult.registered_address?.pin || prev.pin_code,
                      }));
                      setPanCompliance((prev) => ({
                        ...prev,
                        entity_type: kycResult.entity_type || prev.entity_type,
                        pan_status: kycResult.pan_status || 'active',
                        cin_number: kycResult.cin || prev.cin_number,
                      }));
                      if (kycResult.gstin_list?.length) {
                        setGstRegistrations(
                          kycResult.gstin_list.map((g: any) => ({
                            gstin: g.gstin,
                            gst_type: g.gst_type || 'registered_regular',
                            state: g.state || '',
                            gst_state_code: g.gstin?.substring(0, 2) || '',
                            status: g.status || 'active',
                            city: '',
                            pin_code: '',
                            address: '',
                            spoc_id: '',
                          }))
                        );
                      }
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: '#007D87',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {'\u2713'} Fill all fields ({(kycResult.gstin_list?.length || 0) + 5} fields)
                  </button>
                </div>
              </div>
            )}
            {kycError && (
              <div
                style={{
                  color: '#DC2626',
                  fontSize: 12,
                  marginTop: 8,
                  padding: '8px 12px',
                  backgroundColor: '#FEE2E2',
                  borderRadius: 8,
                }}
              >
                {kycError}
              </div>
            )}
          </div>

          {/* TDS sub-section */}
          <div style={{ marginBottom: 24 }}>
            <h3
              style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 12 }}
            >
              TDS & Compliance
            </h3>
            <div className="grid grid-cols-3 gap-6">
              <PxFormField label="Section 206AB">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {renderSelect(
                    'section_206ab',
                    panCompliance.section_206ab,
                    SECTION_206AB,
                    updatePan
                  )}
                  {renderKycSourceChip(
                    panCompliance.section_206ab_verification_source,
                    panCompliance.section_206ab_verified_at,
                    panCompliance.section_206ab
                  )}
                </div>
              </PxFormField>
              <PxFormField label="GST Return Filing">
                {renderSelect(
                  'gst_return_filed',
                  panCompliance.gst_return_filed,
                  GST_RETURN_FILED,
                  updatePan
                )}
              </PxFormField>
              <PxFormField label="RCM Applicable">
                {renderSelect(
                  'rcm_applicable',
                  panCompliance.rcm_applicable,
                  RCM_OPTIONS,
                  updatePan
                )}
              </PxFormField>
            </div>

            <div style={{ marginTop: 16 }}>
              <PxFormField label="Default TDS Sections">
                {renderMultiSelect(
                  'tds_sections',
                  panCompliance.tds_sections,
                  TDS_SECTIONS_OPTIONS,
                  updatePan
                )}
              </PxFormField>
            </div>

            <div className="grid grid-cols-3 gap-6" style={{ marginTop: 16 }}>
              <PxFormField label="Lower TDS">
                {renderSelect(
                  'lower_tds_section',
                  panCompliance.lower_tds_section,
                  LOWER_TDS_OPTIONS,
                  updatePan
                )}
              </PxFormField>
              <PxFormField label="Lower TDS Cert Number">
                {renderInput(
                  'lower_tds_cert_number',
                  'Certificate number',
                  panCompliance.lower_tds_cert_number,
                  updatePan
                )}
              </PxFormField>
            </div>
            {/* Lower TDS Certificate validity — shown when cert number is present */}
            {panCompliance.lower_tds_cert_number && (
              <div className="grid grid-cols-3 gap-6" style={{ marginTop: 12 }}>
                <PxFormField
                  label="Cert Valid From"
                  hint={
                    !panCompliance.lower_tds_cert_valid_from && panCompliance.lower_tds_cert_number
                      ? 'Required when cert number is set'
                      : undefined
                  }
                >
                  <input
                    type="date"
                    value={panCompliance.lower_tds_cert_valid_from}
                    onChange={(e) => updatePan('lower_tds_cert_valid_from', e.target.value)}
                    style={inputStyle}
                  />
                </PxFormField>
                <PxFormField
                  label="Cert Valid To"
                  hint={
                    !panCompliance.lower_tds_cert_valid_to && panCompliance.lower_tds_cert_number
                      ? 'Required when cert number is set'
                      : undefined
                  }
                >
                  <input
                    type="date"
                    value={panCompliance.lower_tds_cert_valid_to}
                    onChange={(e) => updatePan('lower_tds_cert_valid_to', e.target.value)}
                    style={inputStyle}
                  />
                </PxFormField>
                <PxFormField
                  label="Cert Rate (%)"
                  hint={
                    !panCompliance.lower_tds_cert_rate && panCompliance.lower_tds_cert_number
                      ? 'Required when cert number is set'
                      : undefined
                  }
                >
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={panCompliance.lower_tds_cert_rate}
                    placeholder="e.g. 2.00"
                    onChange={(e) => updatePan('lower_tds_cert_rate', e.target.value)}
                    style={inputStyle}
                  />
                </PxFormField>
              </div>
            )}
          </div>

          {/* GST sub-section */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
                Vendor Locations &amp; GST Details
              </h3>
              <AddRowButton
                label="Add Location"
                onClick={() => setGstRegistrations((prev) => [...prev, emptyGst()])}
              />
            </div>
            <SimpleInlineTable
              columns={GST_COLUMNS}
              rows={gstRegistrations}
              onRowChange={handleGstChange}
              onRemoveRow={(idx) => setGstRegistrations((prev) => prev.filter((_, i) => i !== idx))}
              emptyMessage="No GST registrations yet. Click “Add Location” to create one."
            />
            {gstRegistrations.some((g) => g.gstin && !GSTIN_REGEX.test(g.gstin)) && (
              <p style={{ color: 'var(--color-error-dark)', fontSize: 12, marginTop: 6 }}>
                One or more GSTIN values appear invalid. Expected format: 22AAAAA0000A1Z5
              </p>
            )}
          </div>
        </FormSection>

        {/* ── Section 5: Banking Details ──────────────────────── */}
        <FormSection
          title="Banking & Payment Details"
          subtitle="Bank accounts for payment processing"
          columns={1}
          icon={<Landmark style={{ width: 20, height: 20, color: 'var(--color-teal)' }} />}
          action={
            <AddRowButton
              label="Add Bank Account"
              onClick={() => setBankAccounts((prev) => [...prev, emptyBank()])}
            />
          }
          flat
        >
          <SimpleInlineTable
            columns={BANK_COLUMNS}
            rows={bankAccounts}
            onRowChange={handleBankChange}
            onRemoveRow={(idx) => setBankAccounts((prev) => prev.filter((_, i) => i !== idx))}
            primaryField="is_primary"
            onPrimaryChange={handleBankPrimary}
            emptyMessage="No bank accounts yet. Click “Add Bank Account” to create one."
          />

          {/* Penny-drop verification strip — one row per bank account */}
          {bankAccounts.length > 0 && (
            <div
              style={{
                marginTop: 16,
                padding: '12px 14px',
                borderRadius: 10,
                backgroundColor: '#FAFBFC',
                border: '1px solid var(--color-silver)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
                  Penny-Drop Verification
                </h4>
                <span style={{ fontSize: 11, color: 'var(--color-mercury-grey)' }}>
                  Verify each account with ₹1 penny drop via Ongrid
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {bankAccounts.map((row, idx) => {
                  const result = bankResults[idx];
                  const err = bankErrors[idx];
                  const loading = bankVerifying[idx];
                  const nameMatch =
                    result && vendor.vendor_legal_name
                      ? result.account_holder_name
                          ?.toUpperCase()
                          .replace(/[^A-Z]/g, '')
                          .includes(
                            vendor.vendor_legal_name
                              .toUpperCase()
                              .replace(/[^A-Z]/g, '')
                              .slice(0, 8)
                          )
                      : null;
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        flexWrap: 'wrap',
                        padding: '8px 10px',
                        borderRadius: 8,
                        backgroundColor: result ? '#F0FBF7' : '#FFFFFF',
                        border: `1px solid ${result ? '#9FE8D0' : 'var(--color-silver)'}`,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: 'var(--color-ink)',
                          fontWeight: 600,
                          minWidth: 170,
                        }}
                      >
                        {row.account_number || (
                          <span style={{ color: 'var(--color-mercury-grey)', fontWeight: 400 }}>
                            (no account #)
                          </span>
                        )}
                      </span>
                      <span
                        style={{ fontSize: 12, color: 'var(--color-mercury-grey)', minWidth: 120 }}
                      >
                        {row.ifsc_code || '—'}
                      </span>
                      {result ? (
                        <>
                          <span style={{ fontSize: 12, color: '#007D60', flex: 1, minWidth: 180 }}>
                            {'\u2713'} {result.account_holder_name || 'Account holder verified'}
                            {result.bank_name ? ` · ${result.bank_name}` : ''}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              padding: '2px 8px',
                              borderRadius: 10,
                              backgroundColor: '#FFFFFF',
                              color: '#007D87',
                              border: '1px solid #9FE8EE',
                              fontWeight: 600,
                            }}
                          >
                            {result.source}
                          </span>
                          {result.mock_mode && (
                            <span
                              style={{
                                fontSize: 10,
                                padding: '2px 8px',
                                borderRadius: 10,
                                backgroundColor: '#FEF3C7',
                                color: '#92400E',
                                fontWeight: 600,
                              }}
                            >
                              mock
                            </span>
                          )}
                          {nameMatch === false && (
                            <span
                              style={{
                                fontSize: 10,
                                padding: '2px 8px',
                                borderRadius: 10,
                                backgroundColor: '#FEF2F2',
                                color: '#B91C1C',
                                border: '1px solid #FECACA',
                                fontWeight: 600,
                              }}
                            >
                              ⚠ name mismatch
                            </span>
                          )}
                        </>
                      ) : err ? (
                        <span style={{ fontSize: 12, color: '#B91C1C', flex: 1 }}>{err}</span>
                      ) : (
                        <span style={{ flex: 1 }} />
                      )}
                      <button
                        onClick={() => verifyBankRow(idx)}
                        disabled={
                          loading ||
                          !!result ||
                          !row.account_number ||
                          !row.ifsc_code ||
                          !kycConsent
                        }
                        style={{
                          height: 28,
                          padding: '0 12px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          border: 'none',
                          cursor:
                            loading ||
                            !!result ||
                            !row.account_number ||
                            !row.ifsc_code ||
                            !kycConsent
                              ? 'not-allowed'
                              : 'pointer',
                          backgroundColor: result
                            ? '#E6FBF5'
                            : loading || !kycConsent || !row.account_number || !row.ifsc_code
                              ? '#F6F9FC'
                              : '#007D87',
                          color: result
                            ? '#007D60'
                            : loading || !kycConsent || !row.account_number || !row.ifsc_code
                              ? '#9CA3AF'
                              : '#FFFFFF',
                          whiteSpace: 'nowrap',
                        }}
                        title={
                          !kycConsent ? 'Tick the consent checkbox in Tax & Compliance first' : ''
                        }
                      >
                        {result ? '\u2713 Verified' : loading ? 'Verifying...' : 'Penny Drop'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </FormSection>

        {/* ── Section 6: Entity Mapping ───────────────────────── */}
        <FormSection
          title="Entity & Accounting Controls"
          subtitle="Map this vendor to legal entities with GL codes and payment terms"
          columns={1}
          icon={<Link2 style={{ width: 20, height: 20, color: 'var(--color-teal)' }} />}
          action={
            <AddRowButton
              label="Add Entity Mapping"
              onClick={() => setEntityMappings((prev) => [...prev, emptyEntityMapping()])}
            />
          }
          flat
        >
          <SimpleInlineTable
            columns={entityMappingColumns}
            rows={entityMappings}
            onRowChange={handleEntityMappingChange}
            onRemoveRow={(idx) => setEntityMappings((prev) => prev.filter((_, i) => i !== idx))}
            emptyMessage="No entity mappings yet. Click “Add Entity Mapping” to create one."
          />
        </FormSection>
      </div>
      {/* ── /Single outer container ──────────────────────────── */}
    </FormShell>
  );
}

export default VendorMasterCreate;
