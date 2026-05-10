import {
  ArrowLeft,
  Plus,
  Trash2,
  X,
  Hash,
  FileText,
  Calendar,
  Building,
  Edit,
  Eye,
  Upload,
  IndianRupee,
  Package,
  Barcode,
  Clock,
} from 'lucide-react';
import { MasterListToolbar } from './ui/MasterListToolbar';
import { useNavigate } from 'react-router-dom';
import { MasterPageShell } from './ui/MasterPageShell';
import { useState, useMemo, useCallback } from 'react';
import { ApprovalModal } from './ApprovalModal';
import { AdvancedFilter, FilterConfig } from './AdvancedFilter';
import { applyFilters } from '../utils/filterUtils';
import {
  logCreate,
  logUpdate,
  logDelete,
  logApproval,
  logSubmit,
  logRequestInfo,
} from '../utils/auditLog';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import {
  FormShell,
  FormSection,
  PxFormField,
  CheckCard,
  type SaveStatus,
} from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';
import { EntityMappingSelector } from './shared/EntityMappingSelector';
import type { EntityScopeMapping } from '../lib/masters/entityMapping';
import { useMasterData } from '../contexts/MasterDataContext';

interface Contract {
  id: string;
  contractId: string;
  vendor: string;
  skuId?: string;
  contractStartDate: string;
  contractEndDate: string;
  productId: string;
  ratePerUnit: string;
  currency: string;
  leadTime?: string;
  status: string;
  paymentTerms: string;
  contractAttachment?: File | null;
  approvalStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  entityMappings?: EntityScopeMapping[];
  originalData?: Contract;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

const mockProducts = [
  { id: 'P001', name: 'Steel Rod 12mm' },
  { id: 'P002', name: 'Cement Portland 53 Grade' },
  { id: 'P003', name: 'Paint - Exterior Emulsion' },
  { id: 'P004', name: 'Electrical Cable 2.5mm' },
  { id: 'P005', name: 'Plywood 18mm Marine Grade' },
];

export function ContractMaster() {
  const navigate = useNavigate();
  const { getActiveVendors } = useMasterData();
  const [contracts, setContracts] = useIncrementalMasterRecords<Contract>('contract_master', [
    {
      id: '1',
      contractId: 'CON-2024-001',
      vendor: 'Tata Steel Ltd.',
      skuId: 'SKU-001',
      contractStartDate: '2024-01-01',
      contractEndDate: '2024-12-31',
      productId: 'Steel Rod 12mm',
      ratePerUnit: '65.50',
      currency: 'INR',
      leadTime: '15',
      status: 'Active',
      paymentTerms: 'Net 30 days',
      approvalStatus: 'Approved',
      createdBy: 'Admin',
      createdAt: '2024-01-01',
    },
    {
      id: '2',
      contractId: 'CON-2024-002',
      vendor: 'Reliance Industries',
      contractStartDate: '2024-02-15',
      contractEndDate: '2025-02-14',
      productId: 'Cement Portland 53 Grade',
      ratePerUnit: '420.00',
      currency: 'INR',
      leadTime: '10',
      status: 'Active',
      paymentTerms: 'Advance 20%, balance within 45 days',
      approvalStatus: 'Approved',
      createdBy: 'Admin',
      createdAt: '2024-02-01',
    },
    {
      id: '3',
      contractId: 'CON-2024-003',
      vendor: 'Hindustan Unilever Ltd.',
      skuId: 'SKU-HUL-045',
      contractStartDate: '2024-03-01',
      contractEndDate: '2024-12-31',
      productId: 'Paint - Exterior Emulsion',
      ratePerUnit: '850.00',
      currency: 'INR',
      leadTime: '7',
      status: 'Expired',
      paymentTerms: 'Net 45 days',
      approvalStatus: 'Pending Approval',
      createdBy: 'User',
      createdAt: '2024-03-01',
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filterConfig, setFilterConfig] = useState<FilterConfig | null>(null);

  // Form fields
  const [contractId, setContractId] = useState('CON-NEW');
  const [vendor, setVendor] = useState('');
  const [skuId, setSkuId] = useState('');
  const [contractStartDate, setContractStartDate] = useState('');
  const [contractEndDate, setContractEndDate] = useState('');
  const [productId, setProductId] = useState('');
  const [ratePerUnit, setRatePerUnit] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [leadTime, setLeadTime] = useState('');
  const [status, setStatus] = useState('Active');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [contractAttachment, setContractAttachment] = useState<File | null>(null);
  const [entityMappings, setEntityMappings] = useState<EntityScopeMapping[]>([]);

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<Contract | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);
  const vendorOptions = getActiveVendors();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Required field validations
    if (!vendor || vendor === '') {
      newErrors.vendor = 'Vendor is required';
    }

    if (!contractStartDate) {
      newErrors.contractStartDate = 'Contract start date is required';
    }

    if (!contractEndDate) {
      newErrors.contractEndDate = 'Contract end date is required';
    }

    if (!productId || productId === '') {
      newErrors.productId = 'Product ID is required';
    }

    if (!ratePerUnit || ratePerUnit.trim() === '') {
      newErrors.ratePerUnit = 'Rate per unit is required';
    } else if (isNaN(parseFloat(ratePerUnit)) || parseFloat(ratePerUnit) <= 0) {
      newErrors.ratePerUnit = 'Rate must be a valid positive number';
    }

    if (!currency) {
      newErrors.currency = 'Currency is required';
    }

    if (!status) {
      newErrors.status = 'Status is required';
    }

    if (!paymentTerms || paymentTerms.trim() === '') {
      newErrors.paymentTerms = 'Payment terms are required';
    }

    // Date validations
    if (contractStartDate && contractEndDate) {
      const startDate = new Date(contractStartDate);
      const endDate = new Date(contractEndDate);

      if (endDate <= startDate) {
        newErrors.contractEndDate = 'End date must be after start date';
      }
    }

    // Lead time validation (if provided)
    if (leadTime && leadTime.trim() !== '') {
      const leadTimeNum = parseInt(leadTime);
      if (isNaN(leadTimeNum) || leadTimeNum < 0) {
        newErrors.leadTime = 'Lead time must be a valid non-negative number';
      }
    }

    // File validation (if provided)
    if (contractAttachment) {
      const validTypes = ['application/pdf'];
      if (!validTypes.includes(contractAttachment.type)) {
        newErrors.contractAttachment = 'Only PDF files are allowed';
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (contractAttachment.size > maxSize) {
        newErrors.contractAttachment = 'File size must be less than 10MB';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (approvalStatus: Contract['approvalStatus'] = 'Pending Approval') => {
    if (!validateForm()) {
      return;
    }

    if (isEditMode && editingId) {
      const originalRecord = contracts.find((c) => c.id === editingId);

      const updatedContract: Contract = {
        id: editingId,
        contractId,
        vendor,
        skuId: skuId || undefined,
        contractStartDate,
        contractEndDate,
        productId,
        ratePerUnit,
        currency,
        leadTime: leadTime || undefined,
        status,
        paymentTerms,
        contractAttachment,
        approvalStatus,
        originalData: originalRecord,
        entityMappings,
        updatedBy: 'Admin',
        updatedAt: new Date().toISOString(),
      };

      setContracts(contracts.map((c) => (c.id === editingId ? updatedContract : c)));

      // Audit log for update
      if (originalRecord) {
        logUpdate(
          'Masters',
          'Contract Master',
          updatedContract.contractId,
          originalRecord as any,
          updatedContract as any
        );
      }
    } else {
      const newContract: Contract = {
        id: Date.now().toString(),
        contractId: `CON-${new Date().getFullYear()}-${String(contracts.length + 1).padStart(3, '0')}`,
        vendor,
        skuId: skuId || undefined,
        contractStartDate,
        contractEndDate,
        productId,
        ratePerUnit,
        currency,
        leadTime: leadTime || undefined,
        status,
        paymentTerms,
        contractAttachment,
        approvalStatus,
        entityMappings,
        createdBy: 'Admin',
        createdAt: new Date().toISOString(),
      };
      setContracts([...contracts, newContract]);

      // Audit log for create
      logCreate('Masters', 'Contract Master', newContract.contractId, newContract as any);
    }

    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setContractId('CON-NEW');
    setVendor('');
    setSkuId('');
    setContractStartDate('');
    setContractEndDate('');
    setProductId('');
    setRatePerUnit('');
    setCurrency('INR');
    setLeadTime('');
    setStatus('Active');
    setPaymentTerms('');
    setContractAttachment(null);
    setIsEditMode(false);
    setEditingId(null);
    setErrors({});
    setEntityMappings([]);
  };

  const handleEdit = (contract: Contract) => {
    setIsEditMode(true);
    setEditingId(contract.id);
    setContractId(contract.contractId);
    setVendor(contract.vendor);
    setSkuId(contract.skuId || '');
    setContractStartDate(contract.contractStartDate);
    setContractEndDate(contract.contractEndDate);
    setProductId(contract.productId);
    setRatePerUnit(contract.ratePerUnit);
    setCurrency(contract.currency);
    setLeadTime(contract.leadTime || '');
    setStatus(contract.status);
    setPaymentTerms(contract.paymentTerms);
    setContractAttachment(contract.contractAttachment || null);
    setEntityMappings(contract.entityMappings || []);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const contract = contracts.find((c) => c.id === id);

    if (contract?.approvalStatus === 'Approved') {
      alert(
        'Cannot delete approved/live records. You can only modify them through the approval workflow.'
      );
      return;
    }

    if (contract) {
      logDelete('Masters', 'Contract Master', contract.contractId, contract as any);
    }

    setContracts(contracts.filter((c) => c.id !== id));
  };

  const handleReview = (contract: Contract) => {
    const changes: Change[] = [];

    if (contract.originalData) {
      const original = contract.originalData;

      if (original.vendor !== contract.vendor) {
        changes.push({ field: 'Vendor', oldValue: original.vendor, newValue: contract.vendor });
      }
      if (original.skuId !== contract.skuId) {
        changes.push({
          field: 'SKU ID',
          oldValue: original.skuId || 'N/A',
          newValue: contract.skuId || 'N/A',
        });
      }
      if (original.contractStartDate !== contract.contractStartDate) {
        changes.push({
          field: 'Contract Start Date',
          oldValue: original.contractStartDate,
          newValue: contract.contractStartDate,
        });
      }
      if (original.contractEndDate !== contract.contractEndDate) {
        changes.push({
          field: 'Contract End Date',
          oldValue: original.contractEndDate,
          newValue: contract.contractEndDate,
        });
      }
      if (original.productId !== contract.productId) {
        changes.push({
          field: 'Product ID',
          oldValue: original.productId,
          newValue: contract.productId,
        });
      }
      if (original.ratePerUnit !== contract.ratePerUnit) {
        changes.push({
          field: 'Rate Per Unit',
          oldValue: `₹${original.ratePerUnit}`,
          newValue: `₹${contract.ratePerUnit}`,
        });
      }
      if (original.currency !== contract.currency) {
        changes.push({
          field: 'Currency',
          oldValue: original.currency,
          newValue: contract.currency,
        });
      }
      if (original.leadTime !== contract.leadTime) {
        changes.push({
          field: 'Lead Time',
          oldValue: original.leadTime ? `${original.leadTime} days` : 'N/A',
          newValue: contract.leadTime ? `${contract.leadTime} days` : 'N/A',
        });
      }
      if (original.status !== contract.status) {
        changes.push({ field: 'Status', oldValue: original.status, newValue: contract.status });
      }
      if (original.paymentTerms !== contract.paymentTerms) {
        changes.push({
          field: 'Payment Terms',
          oldValue: original.paymentTerms,
          newValue: contract.paymentTerms,
        });
      }
    }

    setCurrentReviewRecord(contract);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction(
        'contract_master',
        contracts,
        currentReviewRecord.id,
        'approve'
      );
      setContracts(nextRecords);
      logApproval('Masters', 'Contract Master', currentReviewRecord.contractId, true);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction(
        'contract_master',
        contracts,
        currentReviewRecord.id,
        'reject'
      );
      setContracts(nextRecords);
      logApproval('Masters', 'Contract Master', currentReviewRecord.contractId, false);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleRequestInfo = async () => {
    if (currentReviewRecord) {
      const comments = window.prompt(
        'Enter comments for the request:',
        'Please provide additional details'
      );
      if (comments === null) {
        return;
      }
      const nextRecords = await applyMasterApprovalAction(
        'contract_master',
        contracts,
        currentReviewRecord.id,
        'request_info',
        comments
      );
      setContracts(nextRecords);
      logRequestInfo('Masters', 'Contract Master', currentReviewRecord.contractId, comments);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setContractAttachment(file);

      // Clear any previous file errors
      if (errors.contractAttachment) {
        const newErrors = { ...errors };
        delete newErrors.contractAttachment;
        setErrors(newErrors);
      }
    }
  };

  const getStatusBadgeStyle = (approvalStatus: string) => {
    switch (approvalStatus) {
      case 'Approved':
        return { backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal)' };
      case 'Pending Approval':
        return { backgroundColor: '#FFF9E6', color: '#D97706' };
      case 'Draft':
        return { backgroundColor: '#E5E7EB', color: 'var(--color-mercury-grey)' };
      case 'Rejected':
        return { backgroundColor: '#FFE8EA', color: 'var(--color-error)' };
      default:
        return { backgroundColor: '#E5E7EB', color: 'var(--color-mercury-grey)' };
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<string[]>([]);

  // Filter configuration
  const filterFields = [
    { key: 'contractId', label: 'Contract ID', type: 'text' as const },
    { key: 'vendor', label: 'Vendor', type: 'text' as const },
    { key: 'skuId', label: 'SKU ID', type: 'text' as const },
    { key: 'contractStartDate', label: 'Start Date', type: 'date' as const },
    { key: 'contractEndDate', label: 'End Date', type: 'date' as const },
    { key: 'productId', label: 'Product ID', type: 'text' as const },
    { key: 'ratePerUnit', label: 'Rate Per Unit', type: 'number' as const },
    {
      key: 'currency',
      label: 'Currency',
      type: 'select' as const,
      options: [
        { value: 'INR', label: 'INR' },
        { value: 'USD', label: 'USD' },
        { value: 'EUR', label: 'EUR' },
        { value: 'GBP', label: 'GBP' },
      ],
    },
    { key: 'leadTime', label: 'Lead Time', type: 'number' as const },
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'Active', label: 'Active' },
        { value: 'Inactive', label: 'Inactive' },
        { value: 'Expired', label: 'Expired' },
        { value: 'Terminated', label: 'Terminated' },
      ],
    },
    { key: 'paymentTerms', label: 'Payment Terms', type: 'text' as const },
    {
      key: 'approvalStatus',
      label: 'Approval Status',
      type: 'select' as const,
      options: [
        { value: 'Draft', label: 'Draft' },
        { value: 'Pending Approval', label: 'Pending Approval' },
        { value: 'Approved', label: 'Approved' },
        { value: 'Rejected', label: 'Rejected' },
      ],
    },
    { key: 'createdBy', label: 'Created By', type: 'text' as const },
  ];

  // Apply filters using useMemo for performance
  const filteredContracts = useMemo(() => {
    const baseFiltered = applyFilters(contracts, filterConfig);
    return baseFiltered.filter((contract) => {
      const haystack = [contract.contractId, contract.vendor, contract.productId, contract.status]
        .join(' ')
        .toLowerCase();
      const matchesSearch = !searchTerm.trim() || haystack.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(contract.status);
      const matchesApproval =
        approvalFilter.length === 0 || approvalFilter.includes(contract.approvalStatus);
      return matchesSearch && matchesStatus && matchesApproval;
    });
  }, [contracts, filterConfig, searchTerm, statusFilter, approvalFilter]);

  const handleApplyFilter = (config: FilterConfig) => {
    setFilterConfig(config);
  };

  const handleClearFilter = () => {
    setFilterConfig(null);
  };

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const completeness = useMemo(() => {
    const fields = [
      vendor,
      contractStartDate,
      contractEndDate,
      productId,
      ratePerUnit,
      currency,
      status,
      paymentTerms,
    ];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [
    vendor,
    contractStartDate,
    contractEndDate,
    productId,
    ratePerUnit,
    currency,
    status,
    paymentTerms,
  ]);

  const handleSaveDraft = useCallback(() => {
    setSaveStatus('saving');
    handleSubmit('Draft');
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  }, [handleSubmit]);

  useFormKeyboardSave(handleSaveDraft);

  if (showForm) {
    return (
      <FormShell
        masterName="Contract Master"
        title={isEditMode ? 'Edit Contract' : 'Create Contract'}
        subtitle="Manage vendor contracts with approval workflow"
        modeLabel={isEditMode ? 'Edit Master Record' : 'Create Master Record'}
        draftStatus={isEditMode ? 'Draft' : 'New'}
        completeness={completeness}
        onBack={() => {
          setShowForm(false);
          resetForm();
        }}
        onCancel={() => {
          setShowForm(false);
          resetForm();
        }}
        onSaveDraft={handleSaveDraft}
        onSubmit={() => handleSubmit('Pending Approval')}
        submitLabel="Submit"
        draftLabel="Save Draft"
        saveStatus={saveStatus}
      >
        <FormSection title="Contract Details" columns={3}>
          <PxFormField label="Contract ID" filled={!!contractId.trim()}>
            <input type="text" value={contractId} disabled className="px-input bg-gray-50" />
          </PxFormField>
          <PxFormField label="Vendor" required filled={!!vendor}>
            <select
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="px-select"
            >
              <option value="">Select vendor</option>
              {vendorOptions.map((vendorOption) => (
                <option key={vendorOption.id} value={vendorOption.name}>
                  {vendorOption.name}
                </option>
              ))}
            </select>
            {errors.vendor && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>
                {errors.vendor}
              </p>
            )}
          </PxFormField>
          <PxFormField label="SKU ID" filled={!!skuId.trim()}>
            <input
              type="text"
              value={skuId}
              onChange={(e) => setSkuId(e.target.value)}
              placeholder="Optional"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Contract Start Date" required filled={!!contractStartDate}>
            <input
              type="date"
              value={contractStartDate}
              onChange={(e) => setContractStartDate(e.target.value)}
              className="px-input"
            />
            {errors.contractStartDate && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>
                {errors.contractStartDate}
              </p>
            )}
          </PxFormField>
          <PxFormField label="Contract End Date" required filled={!!contractEndDate}>
            <input
              type="date"
              value={contractEndDate}
              onChange={(e) => setContractEndDate(e.target.value)}
              className="px-input"
            />
            {errors.contractEndDate && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>
                {errors.contractEndDate}
              </p>
            )}
          </PxFormField>
          <PxFormField label="Product ID" required filled={!!productId}>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="px-select"
            >
              <option value="">Select product</option>
              {mockProducts.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.productId && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>
                {errors.productId}
              </p>
            )}
          </PxFormField>
        </FormSection>

        <FormSection title="Financial Terms" columns={3}>
          <PxFormField label="Rate Per Unit" required filled={!!ratePerUnit.trim()}>
            <input
              type="text"
              value={ratePerUnit}
              onChange={(e) => setRatePerUnit(e.target.value)}
              placeholder="Vendor price"
              className="px-input"
            />
            {errors.ratePerUnit && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>
                {errors.ratePerUnit}
              </p>
            )}
          </PxFormField>
          <PxFormField label="Currency" required filled={!!currency}>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="px-select"
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </PxFormField>
          <PxFormField label="Lead Time (Days)" filled={!!leadTime.trim()}>
            <input
              type="text"
              value={leadTime}
              onChange={(e) => setLeadTime(e.target.value)}
              placeholder="Optional"
              className="px-input"
            />
            {errors.leadTime && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>
                {errors.leadTime}
              </p>
            )}
          </PxFormField>
          <PxFormField label="Payment Terms" required filled={!!paymentTerms.trim()}>
            <textarea
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="e.g. 30 days credit, advance 20% etc."
              rows={3}
              className="px-input resize-none"
            />
            {errors.paymentTerms && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>
                {errors.paymentTerms}
              </p>
            )}
          </PxFormField>
        </FormSection>

        <FormSection title="Settings" columns={3}>
          <PxFormField label="Status" required filled={!!status}>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-select"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Expired">Expired</option>
              <option value="Terminated">Terminated</option>
            </select>
          </PxFormField>
          <PxFormField
            label="Contract Attachment (PDF)"
            filled={!!contractAttachment}
            hint="Optional - upload signed agreement"
          >
            <input type="file" accept=".pdf" onChange={handleFileChange} className="px-input" />
            {errors.contractAttachment && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>
                {errors.contractAttachment}
              </p>
            )}
          </PxFormField>
          <EntityMappingSelector value={entityMappings} onChange={setEntityMappings} />
        </FormSection>
      </FormShell>
    );
  }

  return (
    <MasterPageShell masterName="Contract Master" description="Manage vendor contracts">
      <div className="flex items-center justify-end mb-8">
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-colors"
          style={{ backgroundColor: 'var(--color-teal)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal)')}
        >
          <Plus className="w-5 h-5" />
          Add Contract
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div
              className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0"
              style={{ borderColor: 'var(--color-silver)' }}
            >
              <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>
                {isEditMode ? 'Edit Contract' : 'Add New Contract'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--color-mercury-grey)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-3 gap-4">
                {/* Row 1: Contract ID, Vendor, SKU ID */}
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Contract ID
                  </label>
                  <div className="relative">
                    <Hash
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                      style={{ color: 'var(--color-teal)' }}
                    />
                    <input
                      type="text"
                      value={contractId}
                      disabled
                      className="w-full pl-10 pr-3 py-2 rounded-lg bg-gray-50"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-mercury-grey)',
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Vendor <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <div className="relative">
                    <Building
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                      style={{ color: 'var(--color-teal)' }}
                    />
                    <select
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: errors.vendor
                          ? '1px solid var(--color-error)'
                          : '1px solid var(--color-silver)',
                        color: vendor ? 'var(--color-ink)' : 'var(--color-mercury-grey)',
                      }}
                    >
                      <option value="">Select vendor</option>
                      {vendorOptions.map((vendorOption) => (
                        <option key={vendorOption.id} value={vendorOption.name}>
                          {vendorOption.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.vendor && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>
                      {errors.vendor}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    SKU ID
                  </label>
                  <div className="relative">
                    <Barcode
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                      style={{ color: 'var(--color-teal)' }}
                    />
                    <input
                      type="text"
                      value={skuId}
                      onChange={(e) => setSkuId(e.target.value)}
                      placeholder="Optional"
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                    />
                  </div>
                </div>

                {/* Row 2: Start Date, End Date, Product ID */}
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Contract Start Date <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <div className="relative">
                    <Calendar
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                      style={{ color: 'var(--color-teal)' }}
                    />
                    <input
                      type="date"
                      value={contractStartDate}
                      onChange={(e) => setContractStartDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: errors.contractStartDate
                          ? '1px solid var(--color-error)'
                          : '1px solid var(--color-silver)',
                        color: 'var(--color-ink)',
                      }}
                    />
                  </div>
                  {errors.contractStartDate && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>
                      {errors.contractStartDate}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Contract End Date <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <div className="relative">
                    <Calendar
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                      style={{ color: 'var(--color-teal)' }}
                    />
                    <input
                      type="date"
                      value={contractEndDate}
                      onChange={(e) => setContractEndDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: errors.contractEndDate
                          ? '1px solid var(--color-error)'
                          : '1px solid var(--color-silver)',
                        color: 'var(--color-ink)',
                      }}
                    />
                  </div>
                  {errors.contractEndDate && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>
                      {errors.contractEndDate}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Product ID <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <div className="relative">
                    <Package
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                      style={{ color: '#007D87' }}
                    />
                    <select
                      value={productId}
                      onChange={(e) => setProductId(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: errors.productId
                          ? '1px solid var(--color-error)'
                          : '1px solid var(--color-silver)',
                        color: productId ? 'var(--color-ink)' : 'var(--color-mercury-grey)',
                      }}
                    >
                      <option value="">Select product</option>
                      {mockProducts.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.productId && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>
                      {errors.productId}
                    </p>
                  )}
                </div>

                {/* Row 3: Rate Per Unit, Currency, Lead Time, Status */}
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Rate Per Unit <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <div className="relative">
                    <IndianRupee
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                      style={{ color: 'var(--color-teal)' }}
                    />
                    <input
                      type="text"
                      value={ratePerUnit}
                      onChange={(e) => setRatePerUnit(e.target.value)}
                      placeholder="Vendor price"
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: errors.ratePerUnit
                          ? '1px solid var(--color-error)'
                          : '1px solid var(--color-silver)',
                        color: 'var(--color-ink)',
                      }}
                    />
                  </div>
                  {errors.ratePerUnit && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>
                      {errors.ratePerUnit}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Currency <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <div className="relative">
                    <IndianRupee
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                      style={{ color: 'var(--color-teal)' }}
                    />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Lead Time (Days)
                  </label>
                  <div className="relative">
                    <Clock
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                      style={{ color: 'var(--color-teal)' }}
                    />
                    <input
                      type="text"
                      value={leadTime}
                      onChange={(e) => setLeadTime(e.target.value)}
                      placeholder="Optional"
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: errors.leadTime
                          ? '1px solid var(--color-error)'
                          : '1px solid var(--color-silver)',
                        color: 'var(--color-ink)',
                      }}
                    />
                  </div>
                  {errors.leadTime && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>
                      {errors.leadTime}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Status <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <div className="relative">
                    <div
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full"
                      style={{ backgroundColor: '#007D87' }}
                    ></div>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-lg"
                      style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Expired">Expired</option>
                      <option value="Terminated">Terminated</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Full Width Fields */}
              <div className="grid grid-cols-1 gap-4 mt-4">
                {/* Payment Terms */}
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Payment Terms <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <div className="relative">
                    <FileText
                      className="absolute left-3 top-3 w-4 h-4"
                      style={{ color: 'var(--color-teal)' }}
                    />
                    <textarea
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      placeholder="e.g. 30 days credit, advance 20% etc."
                      rows={3}
                      className="w-full pl-10 pr-3 py-2 rounded-lg resize-none"
                      style={{
                        border: errors.paymentTerms
                          ? '1px solid var(--color-error)'
                          : '1px solid var(--color-silver)',
                        color: 'var(--color-ink)',
                      }}
                    />
                  </div>
                  {errors.paymentTerms && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>
                      {errors.paymentTerms}
                    </p>
                  )}
                </div>

                {/* Contract Attachment */}
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Contract Attachment (PDF)
                  </label>
                  <div className="relative">
                    <Upload
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                      style={{ color: 'var(--color-teal)' }}
                    />
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: errors.contractAttachment
                          ? '1px solid var(--color-error)'
                          : '1px solid var(--color-silver)',
                        color: 'var(--color-ink)',
                      }}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
                    Optional - upload signed agreement
                  </p>
                  {errors.contractAttachment && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>
                      {errors.contractAttachment}
                    </p>
                  )}
                </div>

                {/* Audit Info */}
                <div className="pt-4" style={{ borderTop: '1px solid var(--color-silver)' }}>
                  <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                    Created / Updated by: Admin (auto). Audit details will come from backend.
                  </p>
                </div>
              </div>
            </div>
            <div
              className="border-t px-6 py-4 flex justify-end gap-3 flex-shrink-0"
              style={{ borderColor: 'var(--color-silver)' }}
            >
              <button
                onClick={() => setShowForm(false)}
                className="px-6 py-2 rounded-lg transition-colors"
                style={{
                  border: '1px solid var(--color-silver)',
                  color: 'var(--color-mercury-grey)',
                  backgroundColor: 'white',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit()}
                className="px-6 py-2 rounded-lg text-white transition-colors"
                style={{ backgroundColor: 'var(--color-teal)' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal)')}
              >
                {isEditMode ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        recordType="Contract Master"
        recordId={currentReviewRecord?.contractId || ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />

      <MasterListToolbar
        masterName="Contract Master"
        masterKey="contract_master"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: ['Active', 'Inactive', 'Expired', 'Terminated'],
            selected: statusFilter,
          },
          {
            key: 'approval',
            label: 'Approval',
            options: ['Draft', 'Pending Approval', 'Approved', 'Rejected'],
            selected: approvalFilter,
          },
        ]}
        onFilterChange={(key, values) => {
          if (key === 'status') setStatusFilter(values);
          if (key === 'approval') setApprovalFilter(values);
        }}
        records={filteredContracts}
        columns={[
          { key: 'contractId', label: 'Contract ID' },
          { key: 'vendor', label: 'Vendor' },
          { key: 'skuId', label: 'SKU ID' },
          { key: 'contractStartDate', label: 'Contract Start Date' },
          { key: 'contractEndDate', label: 'Contract End Date' },
          { key: 'productId', label: 'Product ID' },
          { key: 'ratePerUnit', label: 'Rate Per Unit' },
          { key: 'currency', label: 'Currency' },
          { key: 'leadTime', label: 'Lead Time' },
          { key: 'paymentTerms', label: 'Payment Terms' },
          { key: 'createdBy', label: 'Created By' },
          { key: 'createdAt', label: 'Created At' },
          { key: 'updatedBy', label: 'Updated By' },
          { key: 'updatedAt', label: 'Updated At' },
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
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Contract ID
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Vendor Name
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Start Date
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  End Date
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Status
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Approval Status
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map((contract, index) => (
                <tr
                  key={contract.id}
                  style={{ borderTop: index === 0 ? 'none' : '1px solid var(--color-silver)' }}
                >
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                    {contract.contractId}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                    {contract.vendor}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    {contract.contractStartDate}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    {contract.contractEndDate}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-sm"
                      style={{
                        backgroundColor:
                          contract.status === 'Active' ? 'var(--color-teal-tint)' : '#FFE8EA',
                        color:
                          contract.status === 'Active' ? 'var(--color-teal)' : 'var(--color-error)',
                      }}
                    >
                      {contract.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-sm"
                      style={getStatusBadgeStyle(contract.approvalStatus)}
                    >
                      {contract.approvalStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {contract.approvalStatus === 'Pending Approval' && (
                        <button
                          onClick={() => handleReview(contract)}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: 'var(--color-teal)' }}
                          title="Review Changes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(contract)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'var(--color-mercury-grey)' }}
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(contract.id)}
                        className="p-2 rounded-lg transition-colors"
                        style={{
                          color:
                            contract.approvalStatus === 'Approved'
                              ? '#C4C4C4'
                              : 'var(--color-error)',
                          cursor:
                            contract.approvalStatus === 'Approved' ? 'not-allowed' : 'pointer',
                        }}
                        title={
                          contract.approvalStatus === 'Approved'
                            ? 'Cannot delete approved records'
                            : 'Delete'
                        }
                        disabled={contract.approvalStatus === 'Approved'}
                      >
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
