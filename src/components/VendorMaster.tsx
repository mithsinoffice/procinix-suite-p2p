import { Plus, Trash2, Edit, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MasterListToolbar } from './ui/MasterListToolbar';
import { MasterPageShell } from './ui/MasterPageShell';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { ApprovalModal } from './ApprovalModal';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { mysqlApiBaseUrl } from '../lib/mysql/client';
import type { EntityScopeMapping } from '../lib/masters/entityMapping';

const VENDOR_API = (mysqlApiBaseUrl?.replace(/\/api$/, '') || '') + '/api/vendors';

/* ───────────────────────── Types ───────────────────────── */

interface Vendor {
  id: string;
  vendorCode: string;
  clientErpVendorCode: string;
  legalName: string;
  tradeName: string;
  vendorType: string;
  gstin: string;
  pan: string;
  msmeNumber: string;
  msmeCategory: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankBranch: string;
  paymentTerms: string;
  creditLimit: number;
  tdsApplicable: boolean;
  tdsSection: string;
  tdsRate: number;
  status: 'Active' | 'Inactive';
  approvalStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  entityMappings?: EntityScopeMapping[];
  originalData?: Vendor;
}

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

function normalizeApprovalStatus(value: string | undefined): Vendor['approvalStatus'] {
  if (value === 'pending_approval') return 'Pending Approval';
  if (value === 'approved') return 'Approved';
  if (value === 'rejected') return 'Rejected';
  return (value as Vendor['approvalStatus']) || 'Draft';
}

function normalizeVendor(raw: any): Vendor {
  return {
    id: raw.id,
    vendorCode: raw.vendorCode || raw.code || '',
    clientErpVendorCode: raw.clientErpVendorCode || raw.client_erp_vendor_code || '',
    legalName: raw.legalName || raw.vendor_legal_name || raw.name || '',
    tradeName: raw.tradeName || raw.vendor_trade_name || raw.name || '',
    vendorType: raw.vendorType || raw.vendor_type || '',
    gstin: raw.gstin || '',
    pan: raw.pan || '',
    msmeNumber: raw.msmeNumber || raw.msme_number || '',
    msmeCategory: raw.msmeCategory || raw.msme_category || '',
    contactName: raw.contactName || raw.spocs?.[0]?.spoc_name || '',
    contactEmail: raw.contactEmail || raw.spocs?.[0]?.email || raw.email || '',
    contactPhone: raw.contactPhone || raw.spocs?.[0]?.phone || raw.phone || '',
    address: raw.address || raw.address_line || '',
    city: raw.city || '',
    state: raw.state || '',
    pincode: raw.pincode || raw.pin_code || '',
    country: raw.country || 'India',
    bankName: raw.bankName || raw.bank_accounts?.[0]?.bank_name || '',
    bankAccountNumber: raw.bankAccountNumber || raw.bank_accounts?.[0]?.account_number || '',
    bankIfsc: raw.bankIfsc || raw.bank_accounts?.[0]?.ifsc_code || '',
    bankBranch: raw.bankBranch || raw.bank_accounts?.[0]?.branch_name || '',
    paymentTerms: raw.paymentTerms || raw.payment_terms || 'Net 30',
    creditLimit: Number(raw.creditLimit || raw.credit_limit || 0),
    tdsApplicable: Boolean(raw.tdsApplicable),
    tdsSection: raw.tdsSection || '',
    tdsRate: Number(raw.tdsRate || 0),
    status: raw.status === 'Inactive' ? 'Inactive' : 'Active',
    approvalStatus: normalizeApprovalStatus(raw.approvalStatus || raw.status),
    entityMappings: raw.entityMappings || raw.entity_mappings || [],
    originalData: raw.originalData,
  };
}

/* ───────────────────────── Helpers ─────────────────────── */

const VENDOR_TYPES = ['Supplier', 'Service Provider', 'Contractor', 'Distributor'];

const FIELD_LABELS: Record<string, string> = {
  vendorCode: 'Vendor Code', clientErpVendorCode: 'Client ERP Vendor Code', legalName: 'Legal Name', tradeName: 'Trade Name', vendorType: 'Type',
  gstin: 'GSTIN', pan: 'PAN', msmeNumber: 'MSME Number', msmeCategory: 'MSME Category',
  contactName: 'Contact Name', contactEmail: 'Email', contactPhone: 'Phone',
  address: 'Address', city: 'City', state: 'State', pincode: 'Pincode', country: 'Country',
  bankName: 'Bank Name', bankAccountNumber: 'Account Number', bankIfsc: 'IFSC', bankBranch: 'Branch',
  paymentTerms: 'Payment Terms', creditLimit: 'Credit Limit',
  tdsApplicable: 'TDS Applicable', tdsSection: 'TDS Section', tdsRate: 'TDS Rate',
  status: 'Status',
};

function isLikelyMockVendor(vendor: Vendor): boolean {
  const code = (vendor.vendorCode || '').toUpperCase();
  const legalName = (vendor.legalName || '').toLowerCase();
  const tradeName = (vendor.tradeName || '').toLowerCase();

  const mockCodePrefix =
    code.startsWith('PROC-IN-') ||
    code.startsWith('SUBKO-IN-') ||
    code.startsWith('SUBKO-UAE-') ||
    /^VND-\d{3}$/.test(code);

  const mockNameMarkers = [
    'tech solutions india',
    'office mart supplies',
    'coorg coffee estates',
    'premium packaging solutions',
    'urban logistics',
    'arabian coffee trading',
    'gulf packaging industries',
  ];

  return mockCodePrefix || mockNameMarkers.some((marker) => legalName.includes(marker) || tradeName.includes(marker));
}

/* ──────────────────── Component ───────────────────────── */

export function VendorMaster() {
  const navigate = useNavigate();
  const [masterVendors, setMasterVendors] = useIncrementalMasterRecords<any>('vendor_master', []);
  const [apiVendors, setApiVendors] = useState<any[]>([]);

  // Fetch vendors from live API; fall back to master records cache
  const fetchApiVendors = useCallback(async () => {
    try {
      const res = await fetch(VENDOR_API);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setApiVendors(data.data);
      }
    } catch {
      // API unavailable — apiVendors stays empty, master cache used as fallback
    }
  }, []);

  useEffect(() => { fetchApiVendors(); }, [fetchApiVendors]);

  // Merge: API vendors are primary source, master records fill any gaps (by id)
  const vendors = useMemo(() => {
    if (apiVendors.length === 0) return masterVendors;
    const apiIds = new Set(apiVendors.map((v: any) => v.id));
    const masterOnly = masterVendors.filter((v: any) => !apiIds.has(v.id));
    return [...apiVendors, ...masterOnly];
  }, [apiVendors, masterVendors]);

  const setVendors = setMasterVendors;

  /* ── list state ── */
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<Vendor | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<string[]>([]);

  const normalizedVendors = useMemo(() => vendors.map((v) => normalizeVendor(v)), [vendors]);

  /* ── filtered list ── */
  const filteredVendors = useMemo(() => {
    return normalizedVendors
      .filter((v) => !isLikelyMockVendor(v))
      .filter((v) => {
      const haystack = [v.vendorCode || '', v.clientErpVendorCode || '', v.legalName || '', v.tradeName || '', v.vendorType || '', v.gstin || '', v.city || '', v.status || '', v.approvalStatus || ''].join(' ').toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesType = typeFilter.length === 0 || typeFilter.includes(v.vendorType || '');
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(v.status || '');
      const matchesApproval = approvalFilter.length === 0 || approvalFilter.includes(v.approvalStatus || '');
      return matchesSearch && matchesType && matchesStatus && matchesApproval;
    });
  }, [normalizedVendors, searchTerm, typeFilter, statusFilter, approvalFilter]);

  /* ── navigation to create/edit screens ── */
  const handleAdd = () => navigate('/vendors/create');
  const handleEdit = (vendor: Vendor) => navigate(`/vendors/edit/${vendor.id}`);

  const handleDelete = (id: string) => {
    const v = normalizedVendors.find(d => d.id === id);
    if (v?.approvalStatus === 'Approved') {
      alert('Cannot delete approved/live records. You can only modify them through the approval workflow.');
      return;
    }
    setVendors(vendors.filter((d: any) => d.id !== id));
  };

  /* ── approval workflow ── */
  const handleReview = (vendor: Vendor) => {
    const changes: Change[] = [];
    if (vendor.originalData) {
      const orig = vendor.originalData;
      for (const key of Object.keys(FIELD_LABELS) as (keyof Vendor)[]) {
        const oldVal = String(orig[key] ?? '');
        const newVal = String(vendor[key] ?? '');
        if (oldVal !== newVal) {
          changes.push({ field: FIELD_LABELS[key] || key, oldValue: oldVal, newValue: newVal });
        }
      }
    }
    setCurrentReviewRecord(vendor);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (currentReviewRecord) {
      const next = await applyMasterApprovalAction('vendor_master', vendors, currentReviewRecord.id, 'approve');
      setVendors(next);
    }
    setShowApprovalModal(false); setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (currentReviewRecord) {
      const next = await applyMasterApprovalAction('vendor_master', vendors, currentReviewRecord.id, 'reject');
      setVendors(next);
    }
    setShowApprovalModal(false); setCurrentReviewRecord(null);
  };

  const handleRequestInfo = async () => {
    if (currentReviewRecord) {
      const comments = window.prompt('Enter comments for the request:', '');
      if (comments === null) return;
      const next = await applyMasterApprovalAction('vendor_master', vendors, currentReviewRecord.id, 'request_info', comments);
      setVendors(next);
    }
    setShowApprovalModal(false); setCurrentReviewRecord(null);
  };

  /* ── badge helper ── */
  const getStatusBadgeStyle = (approvalStatus: string) => {
    switch (approvalStatus) {
      case 'Approved': return { backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal)' };
      case 'Pending Approval': return { backgroundColor: '#FFF9E6', color: '#D97706' };
      case 'Draft': return { backgroundColor: '#E5E7EB', color: 'var(--color-mercury-grey)' };
      case 'Rejected': return { backgroundColor: '#FFE8EA', color: 'var(--color-error)' };
      default: return { backgroundColor: '#E5E7EB', color: 'var(--color-mercury-grey)' };
    }
  };

  /* ═══════════════════ LIST VIEW ═══════════════════════ */

  return (
    <MasterPageShell masterName="Vendor Master" description="Manage vendor records with approval workflow">
      <div className="flex items-center justify-end mb-8">
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-colors"
          style={{ backgroundColor: 'var(--color-teal)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
        >
          <Plus className="w-5 h-5" />
          Add Vendor
        </button>
      </div>

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        recordType="Vendor Master"
        recordId={currentReviewRecord?.vendorCode || ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />

      <MasterListToolbar
        masterName="Vendor Master"
        masterKey="vendor_master"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={[
          { key: 'type', label: 'Type', options: VENDOR_TYPES, selected: typeFilter },
          { key: 'status', label: 'Status', options: ['Active', 'Inactive'], selected: statusFilter },
          { key: 'approval', label: 'Approval', options: ['Draft', 'Pending Approval', 'Approved', 'Rejected'], selected: approvalFilter },
        ]}
        onFilterChange={(key, values) => {
          if (key === 'type') setTypeFilter(values);
          if (key === 'status') setStatusFilter(values);
          if (key === 'approval') setApprovalFilter(values);
        }}
        records={filteredVendors}
        columns={[
          { key: 'vendorCode', label: 'Vendor Code' },
          { key: 'clientErpVendorCode', label: 'Client ERP Vendor Code' },
          { key: 'legalName', label: 'Legal Name' },
          { key: 'tradeName', label: 'Trade Name' },
          { key: 'vendorType', label: 'Type' },
          { key: 'gstin', label: 'GSTIN' },
          { key: 'pan', label: 'PAN' },
          { key: 'msmeNumber', label: 'MSME Number' },
          { key: 'msmeCategory', label: 'MSME Category' },
          { key: 'contactName', label: 'Contact Name' },
          { key: 'contactEmail', label: 'Email' },
          { key: 'contactPhone', label: 'Phone' },
          { key: 'address', label: 'Address' },
          { key: 'city', label: 'City' },
          { key: 'state', label: 'State' },
          { key: 'pincode', label: 'Pincode' },
          { key: 'country', label: 'Country' },
          { key: 'bankName', label: 'Bank Name' },
          { key: 'bankAccountNumber', label: 'Account Number' },
          { key: 'bankIfsc', label: 'IFSC' },
          { key: 'bankBranch', label: 'Branch' },
          { key: 'paymentTerms', label: 'Payment Terms' },
          { key: 'creditLimit', label: 'Credit Limit' },
          { key: 'tdsApplicable', label: 'TDS Applicable' },
          { key: 'tdsSection', label: 'TDS Section' },
          { key: 'tdsRate', label: 'TDS Rate' },
          { key: 'status', label: 'Status' },
          { key: 'entityMappings', label: 'Entity Mappings' },
          { key: 'approvalStatus', label: 'Approval Status' },
        ]}
      />

      <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Vendor Code</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Legal Name</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Type</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>GSTIN</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>City</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Status</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Approval</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.map((vendor, index) => (
                <tr key={vendor.id} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--color-silver)' }}>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{vendor.vendorCode}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{vendor.legalName}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>{vendor.vendorType}</td>
                  <td className="px-6 py-4 font-mono text-sm" style={{ color: 'var(--color-mercury-grey)' }}>{vendor.gstin || '—'}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>{vendor.city}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: vendor.status === 'Active' ? 'var(--color-teal-tint)' : '#FFE8EA', color: vendor.status === 'Active' ? 'var(--color-teal)' : 'var(--color-error)' }}>
                      {vendor.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={getStatusBadgeStyle(vendor.approvalStatus)}>
                      {vendor.approvalStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {vendor.approvalStatus === 'Pending Approval' && (
                        <button onClick={() => handleReview(vendor)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-teal)' }} title="Review Changes">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleEdit(vendor)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-mercury-grey)' }} title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(vendor.id)} className="p-2 rounded-lg transition-colors" style={{ color: vendor.approvalStatus === 'Approved' ? '#C4C4C4' : 'var(--color-error)', cursor: vendor.approvalStatus === 'Approved' ? 'not-allowed' : 'pointer' }} title={vendor.approvalStatus === 'Approved' ? 'Cannot delete approved records' : 'Delete'} disabled={vendor.approvalStatus === 'Approved'}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MasterPageShell>
  );
}
