import { ArrowLeft, Plus, Trash2, X, Hash, FileText, Calendar, Building, Edit, Eye, Upload, IndianRupee, Package, Barcode, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { ApprovalModal } from './ApprovalModal';
import { AdvancedFilter, FilterConfig } from './AdvancedFilter';
import { applyFilters } from '../utils/filterUtils';
import { logCreate, logUpdate, logDelete, logApproval, logSubmit, logRequestInfo } from '../utils/auditLog';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { MasterFormPage } from './ui/MasterFormPage';

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

// Mock vendor and product data
const mockVendors = [
  { id: 'V001', name: 'Tata Steel Ltd.' },
  { id: 'V002', name: 'Reliance Industries' },
  { id: 'V003', name: 'Hindustan Unilever Ltd.' },
  { id: 'V004', name: 'Larsen & Toubro Ltd.' },
  { id: 'V005', name: 'Asian Paints Ltd.' }
];

const mockProducts = [
  { id: 'P001', name: 'Steel Rod 12mm' },
  { id: 'P002', name: 'Cement Portland 53 Grade' },
  { id: 'P003', name: 'Paint - Exterior Emulsion' },
  { id: 'P004', name: 'Electrical Cable 2.5mm' },
  { id: 'P005', name: 'Plywood 18mm Marine Grade' }
];

export function ContractMaster() {
  const navigate = useNavigate();
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
      createdAt: '2024-01-01'
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
      createdAt: '2024-02-01'
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
      createdAt: '2024-03-01'
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

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<Contract | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);

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
      const originalRecord = contracts.find(c => c.id === editingId);
      
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
        updatedBy: 'Admin',
        updatedAt: new Date().toISOString()
      };
      
      setContracts(contracts.map(c => c.id === editingId ? updatedContract : c));
      
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
        createdBy: 'Admin',
        createdAt: new Date().toISOString()
      };
      setContracts([...contracts, newContract]);
      
      // Audit log for create
      logCreate(
        'Masters',
        'Contract Master',
        newContract.contractId,
        newContract as any
      );
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
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const contract = contracts.find(c => c.id === id);
    
    if (contract?.approvalStatus === 'Approved') {
      alert('Cannot delete approved/live records. You can only modify them through the approval workflow.');
      return;
    }
    
    if (contract) {
      logDelete('Masters', 'Contract Master', contract.contractId, contract as any);
    }
    
    setContracts(contracts.filter(c => c.id !== id));
  };

  const handleReview = (contract: Contract) => {
    const changes: Change[] = [];
    
    if (contract.originalData) {
      const original = contract.originalData;
      
      if (original.vendor !== contract.vendor) {
        changes.push({ field: 'Vendor', oldValue: original.vendor, newValue: contract.vendor });
      }
      if (original.skuId !== contract.skuId) {
        changes.push({ field: 'SKU ID', oldValue: original.skuId || 'N/A', newValue: contract.skuId || 'N/A' });
      }
      if (original.contractStartDate !== contract.contractStartDate) {
        changes.push({ field: 'Contract Start Date', oldValue: original.contractStartDate, newValue: contract.contractStartDate });
      }
      if (original.contractEndDate !== contract.contractEndDate) {
        changes.push({ field: 'Contract End Date', oldValue: original.contractEndDate, newValue: contract.contractEndDate });
      }
      if (original.productId !== contract.productId) {
        changes.push({ field: 'Product ID', oldValue: original.productId, newValue: contract.productId });
      }
      if (original.ratePerUnit !== contract.ratePerUnit) {
        changes.push({ field: 'Rate Per Unit', oldValue: `₹${original.ratePerUnit}`, newValue: `₹${contract.ratePerUnit}` });
      }
      if (original.currency !== contract.currency) {
        changes.push({ field: 'Currency', oldValue: original.currency, newValue: contract.currency });
      }
      if (original.leadTime !== contract.leadTime) {
        changes.push({ field: 'Lead Time', oldValue: original.leadTime ? `${original.leadTime} days` : 'N/A', newValue: contract.leadTime ? `${contract.leadTime} days` : 'N/A' });
      }
      if (original.status !== contract.status) {
        changes.push({ field: 'Status', oldValue: original.status, newValue: contract.status });
      }
      if (original.paymentTerms !== contract.paymentTerms) {
        changes.push({ field: 'Payment Terms', oldValue: original.paymentTerms, newValue: contract.paymentTerms });
      }
    }
    
    setCurrentReviewRecord(contract);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction('contract_master', contracts, currentReviewRecord.id, 'approve');
      setContracts(nextRecords);
      logApproval('Masters', 'Contract Master', currentReviewRecord.contractId, true);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction('contract_master', contracts, currentReviewRecord.id, 'reject');
      setContracts(nextRecords);
      logApproval('Masters', 'Contract Master', currentReviewRecord.contractId, false);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleRequestInfo = async () => {
    if (currentReviewRecord) {
      const comments = window.prompt('Enter comments for the request:', 'Please provide additional details');
      if (comments === null) {
        return;
      }
      const nextRecords = await applyMasterApprovalAction('contract_master', contracts, currentReviewRecord.id, 'request_info', comments);
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
        return { backgroundColor: '#E8F7F8', color: '#00A9B7' };
      case 'Pending Approval':
        return { backgroundColor: '#FFF9E6', color: '#D97706' };
      case 'Draft':
        return { backgroundColor: '#E5E7EB', color: '#6E7A82' };
      case 'Rejected':
        return { backgroundColor: '#FFE8EA', color: '#FF4E5B' };
      default:
        return { backgroundColor: '#E5E7EB', color: '#6E7A82' };
    }
  };

  // Filter configuration
  const filterFields = [
    { key: 'contractId', label: 'Contract ID', type: 'text' as const },
    { key: 'vendor', label: 'Vendor', type: 'text' as const },
    { key: 'skuId', label: 'SKU ID', type: 'text' as const },
    { key: 'contractStartDate', label: 'Start Date', type: 'date' as const },
    { key: 'contractEndDate', label: 'End Date', type: 'date' as const },
    { key: 'productId', label: 'Product ID', type: 'text' as const },
    { key: 'ratePerUnit', label: 'Rate Per Unit', type: 'number' as const },
    { key: 'currency', label: 'Currency', type: 'select' as const, options: [
      { value: 'INR', label: 'INR' },
      { value: 'USD', label: 'USD' },
      { value: 'EUR', label: 'EUR' },
      { value: 'GBP', label: 'GBP' }
    ]},
    { key: 'leadTime', label: 'Lead Time', type: 'number' as const },
    { key: 'status', label: 'Status', type: 'select' as const, options: [
      { value: 'Active', label: 'Active' },
      { value: 'Inactive', label: 'Inactive' },
      { value: 'Expired', label: 'Expired' },
      { value: 'Terminated', label: 'Terminated' }
    ]},
    { key: 'paymentTerms', label: 'Payment Terms', type: 'text' as const },
    { key: 'approvalStatus', label: 'Approval Status', type: 'select' as const, options: [
      { value: 'Draft', label: 'Draft' },
      { value: 'Pending Approval', label: 'Pending Approval' },
      { value: 'Approved', label: 'Approved' },
      { value: 'Rejected', label: 'Rejected' }
    ]},
    { key: 'createdBy', label: 'Created By', type: 'text' as const }
  ];

  // Apply filters using useMemo for performance
  const filteredContracts = useMemo(() => {
    return applyFilters(contracts, filterConfig);
  }, [contracts, filterConfig]);

  const handleApplyFilter = (config: FilterConfig) => {
    setFilterConfig(config);
  };

  const handleClearFilter = () => {
    setFilterConfig(null);
  };

  if (showForm) {
    return (
      <MasterFormPage
        title={isEditMode ? 'Edit Contract' : 'Create Contract'}
        subtitle="Manage vendor contracts with approval workflow"
        modeLabel={isEditMode ? 'Edit Master Record' : 'Create Master Record'}
        onBack={() => {
          setShowForm(false);
          resetForm();
        }}
        onCancel={() => {
          setShowForm(false);
          resetForm();
        }}
        onSaveDraft={() => handleSubmit('Draft')}
        onSubmit={() => handleSubmit('Pending Approval')}
        submitLabel="Submit"
        draftLabel="Save Draft"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Contract ID</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#00A9B7' }} />
                <input type="text" value={contractId} disabled className="w-full pl-10 pr-3 py-3 rounded-xl bg-gray-50" style={{ border: '1px solid #D7E3EA', color: '#6E7A82' }} />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Vendor <span style={{ color: '#FF4E5B' }}>*</span></label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#00A9B7' }} />
                <select value={vendor} onChange={(e) => setVendor(e.target.value)} className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: errors.vendor ? '1px solid #FF4E5B' : '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
                  <option value="">Select vendor</option>
                  {mockVendors.map((v) => <option key={v.id} value={v.name}>{v.name}</option>)}
                </select>
              </div>
              {errors.vendor && <p className="text-xs mt-1" style={{ color: '#FF4E5B' }}>{errors.vendor}</p>}
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>SKU ID</label>
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#00A9B7' }} />
                <input type="text" value={skuId} onChange={(e) => setSkuId(e.target.value)} placeholder="Optional" className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Contract Start Date <span style={{ color: '#FF4E5B' }}>*</span></label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#00A9B7' }} />
                <input type="date" value={contractStartDate} onChange={(e) => setContractStartDate(e.target.value)} className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: errors.contractStartDate ? '1px solid #FF4E5B' : '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
              </div>
              {errors.contractStartDate && <p className="text-xs mt-1" style={{ color: '#FF4E5B' }}>{errors.contractStartDate}</p>}
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Contract End Date <span style={{ color: '#FF4E5B' }}>*</span></label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#00A9B7' }} />
                <input type="date" value={contractEndDate} onChange={(e) => setContractEndDate(e.target.value)} className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: errors.contractEndDate ? '1px solid #FF4E5B' : '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
              </div>
              {errors.contractEndDate && <p className="text-xs mt-1" style={{ color: '#FF4E5B' }}>{errors.contractEndDate}</p>}
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Product ID <span style={{ color: '#FF4E5B' }}>*</span></label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#7C3AED' }} />
                <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: errors.productId ? '1px solid #FF4E5B' : '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
                  <option value="">Select product</option>
                  {mockProducts.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              {errors.productId && <p className="text-xs mt-1" style={{ color: '#FF4E5B' }}>{errors.productId}</p>}
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Rate Per Unit <span style={{ color: '#FF4E5B' }}>*</span></label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#00A9B7' }} />
                <input type="text" value={ratePerUnit} onChange={(e) => setRatePerUnit(e.target.value)} placeholder="Vendor price" className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: errors.ratePerUnit ? '1px solid #FF4E5B' : '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
              </div>
              {errors.ratePerUnit && <p className="text-xs mt-1" style={{ color: '#FF4E5B' }}>{errors.ratePerUnit}</p>}
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Currency <span style={{ color: '#FF4E5B' }}>*</span></label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#00A9B7' }} />
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Lead Time (Days)</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#00A9B7' }} />
                <input type="text" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} placeholder="Optional" className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: errors.leadTime ? '1px solid #FF4E5B' : '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
              </div>
              {errors.leadTime && <p className="text-xs mt-1" style={{ color: '#FF4E5B' }}>{errors.leadTime}</p>}
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Status <span style={{ color: '#FF4E5B' }}>*</span></label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Expired">Expired</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Payment Terms <span style={{ color: '#FF4E5B' }}>*</span></label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4" style={{ color: '#00A9B7' }} />
                <textarea value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g. 30 days credit, advance 20% etc." rows={3} className="w-full pl-10 pr-3 py-3 rounded-xl resize-none" style={{ border: errors.paymentTerms ? '1px solid #FF4E5B' : '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
              </div>
              {errors.paymentTerms && <p className="text-xs mt-1" style={{ color: '#FF4E5B' }}>{errors.paymentTerms}</p>}
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Contract Attachment (PDF)</label>
              <div className="relative">
                <Upload className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#00A9B7' }} />
                <input type="file" accept=".pdf" onChange={handleFileChange} className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: errors.contractAttachment ? '1px solid #FF4E5B' : '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
              </div>
              <p className="text-xs mt-1" style={{ color: '#6E7A82' }}>Optional - upload signed agreement</p>
              {errors.contractAttachment && <p className="text-xs mt-1" style={{ color: '#FF4E5B' }}>{errors.contractAttachment}</p>}
            </div>
          </div>
        </div>
      </MasterFormPage>
    );
  }

  return (
    <div className="p-8" style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/masters')} className="p-2 rounded-lg transition-colors" style={{ color: '#6E7A82' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl" style={{ color: '#0A0F14' }}>Contract Master</h1>
            <p style={{ color: '#6E7A82' }}>Manage vendor contracts with approval workflow</p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-colors"
          style={{ backgroundColor: '#00A9B7' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
        >
          <Plus className="w-5 h-5" />
          Add Contract
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderColor: '#E1E6EA' }}>
              <h2 className="text-xl" style={{ color: '#0A0F14' }}>
                {isEditMode ? 'Edit Contract' : 'Add New Contract'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg transition-colors" style={{ color: '#6E7A82' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-3 gap-4">
                {/* Row 1: Contract ID, Vendor, SKU ID */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Contract ID</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#00A9B7' }} />
                    <input 
                      type="text" 
                      value={contractId} 
                      disabled
                      className="w-full pl-10 pr-3 py-2 rounded-lg bg-gray-50" 
                      style={{ border: '1px solid #E1E6EA', color: '#6E7A82' }} 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                    Vendor <span style={{ color: '#FF4E5B' }}>*</span>
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#00A9B7' }} />
                    <select 
                      value={vendor} 
                      onChange={(e) => setVendor(e.target.value)} 
                      className="w-full pl-10 pr-3 py-2 rounded-lg" 
                      style={{ 
                        border: errors.vendor ? '1px solid #FF4E5B' : '1px solid #E1E6EA', 
                        color: vendor ? '#0A0F14' : '#6E7A82' 
                      }}
                    >
                      <option value="">Select vendor</option>
                      {mockVendors.map(v => (
                        <option key={v.id} value={v.name}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  {errors.vendor && <p className="text-xs mt-1" style={{ color: '#FF4E5B' }}>{errors.vendor}</p>}
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>SKU ID</label>
                  <div className="relative">
                    <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#00A9B7' }} />
                    <input 
                      type="text" 
                      value={skuId} 
                      onChange={(e) => setSkuId(e.target.value)} 
                      placeholder="Optional" 
                      className="w-full pl-10 pr-3 py-2 rounded-lg" 
                      style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }} 
                    />
                  </div>
                </div>

                {/* Row 2: Start Date, End Date, Product ID */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                    Contract Start Date <span style={{ color: '#FF4E5B' }}>*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#00A9B7' }} />
                    <input 
                      type="date" 
                      value={contractStartDate} 
                      onChange={(e) => setContractStartDate(e.target.value)} 
                      className="w-full pl-10 pr-3 py-2 rounded-lg" 
                      style={{ 
                        border: errors.contractStartDate ? '1px solid #FF4E5B' : '1px solid #E1E6EA', 
                        color: '#0A0F14' 
                      }} 
                    />
                  </div>
                  {errors.contractStartDate && <p className="text-xs mt-1" style={{ color: '#FF4E5B' }}>{errors.contractStartDate}</p>}
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                    Contract End Date <span style={{ color: '#FF4E5B' }}>*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#00A9B7' }} />
                    <input 
                      type="date" 
                      value={contractEndDate} 
                      onChange={(e) => setContractEndDate(e.target.value)} 
                      className="w-full pl-10 pr-3 py-2 rounded-lg" 
                      style={{ 
                        border: errors.contractEndDate ? '1px solid #FF4E5B' : '1px solid #E1E6EA', 
                        color: '#0A0F14' 
                      }} 
                    />
                  </div>
                  {errors.contractEndDate && <p className="text-xs mt-1" style={{ color: '#FF4E5B' }}>{errors.contractEndDate}</p>}
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                    Product ID <span style={{ color: '#FF4E5B' }}>*</span>
                  </label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#7C3AED' }} />
                    <select 
                      value={productId} 
                      onChange={(e) => setProductId(e.target.value)} 
                      className="w-full pl-10 pr-3 py-2 rounded-lg" 
                      style={{ 
                        border: errors.productId ? '1px solid #FF4E5B' : '1px solid #E1E6EA', 
                        color: productId ? '#0A0F14' : '#6E7A82' 
                      }}
                    >
                      <option value="">Select product</option>
                      {mockProducts.map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  {errors.productId && <p className="text-xs mt-1" style={{ color: '#FF4E5B' }}>{errors.productId}</p>}
                </div>

                {/* Row 3: Rate Per Unit, Currency, Lead Time, Status */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                    Rate Per Unit <span style={{ color: '#FF4E5B' }}>*</span>
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#00A9B7' }} />
                    <input 
                      type="text" 
                      value={ratePerUnit} 
                      onChange={(e) => setRatePerUnit(e.target.value)} 
                      placeholder="Vendor price" 
                      className="w-full pl-10 pr-3 py-2 rounded-lg" 
                      style={{ 
                        border: errors.ratePerUnit ? '1px solid #FF4E5B' : '1px solid #E1E6EA', 
                        color: '#0A0F14' 
                      }} 
                    />
                  </div>
                  {errors.ratePerUnit && <p className="text-xs mt-1" style={{ color: '#FF4E5B' }}>{errors.ratePerUnit}</p>}
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                    Currency <span style={{ color: '#FF4E5B' }}>*</span>
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#00A9B7' }} />
                    <select 
                      value={currency} 
                      onChange={(e) => setCurrency(e.target.value)} 
                      className="w-full pl-10 pr-3 py-2 rounded-lg" 
                      style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Lead Time (Days)</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#00A9B7' }} />
                    <input 
                      type="text" 
                      value={leadTime} 
                      onChange={(e) => setLeadTime(e.target.value)} 
                      placeholder="Optional" 
                      className="w-full pl-10 pr-3 py-2 rounded-lg" 
                      style={{ 
                        border: errors.leadTime ? '1px solid #FF4E5B' : '1px solid #E1E6EA', 
                        color: '#0A0F14' 
                      }} 
                    />
                  </div>
                  {errors.leadTime && <p className="text-xs mt-1" style={{ color: '#FF4E5B' }}>{errors.leadTime}</p>}
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                    Status <span style={{ color: '#FF4E5B' }}>*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full" style={{ backgroundColor: '#7C3AED' }}></div>
                    <select 
                      value={status} 
                      onChange={(e) => setStatus(e.target.value)} 
                      className="w-full pl-8 pr-3 py-2 rounded-lg" 
                      style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
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
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                    Payment Terms <span style={{ color: '#FF4E5B' }}>*</span>
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4" style={{ color: '#00A9B7' }} />
                    <textarea 
                      value={paymentTerms} 
                      onChange={(e) => setPaymentTerms(e.target.value)} 
                      placeholder="e.g. 30 days credit, advance 20% etc." 
                      rows={3}
                      className="w-full pl-10 pr-3 py-2 rounded-lg resize-none" 
                      style={{ 
                        border: errors.paymentTerms ? '1px solid #FF4E5B' : '1px solid #E1E6EA', 
                        color: '#0A0F14' 
                      }} 
                    />
                  </div>
                  {errors.paymentTerms && <p className="text-xs mt-1" style={{ color: '#FF4E5B' }}>{errors.paymentTerms}</p>}
                </div>

                {/* Contract Attachment */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Contract Attachment (PDF)</label>
                  <div className="relative">
                    <Upload className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#00A9B7' }} />
                    <input 
                      type="file" 
                      accept=".pdf"
                      onChange={handleFileChange} 
                      className="w-full pl-10 pr-3 py-2 rounded-lg" 
                      style={{ 
                        border: errors.contractAttachment ? '1px solid #FF4E5B' : '1px solid #E1E6EA', 
                        color: '#0A0F14' 
                      }} 
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: '#6E7A82' }}>Optional - upload signed agreement</p>
                  {errors.contractAttachment && <p className="text-xs mt-1" style={{ color: '#FF4E5B' }}>{errors.contractAttachment}</p>}
                </div>

                {/* Audit Info */}
                <div className="pt-4" style={{ borderTop: '1px solid #E1E6EA' }}>
                  <p className="text-xs" style={{ color: '#6E7A82' }}>
                    Created / Updated by: Admin (auto). Audit details will come from backend.
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-3 flex-shrink-0" style={{ borderColor: '#E1E6EA' }}>
              <button onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg transition-colors" style={{ border: '1px solid #E1E6EA', color: '#6E7A82', backgroundColor: 'white' }}>
                Cancel
              </button>
              <button onClick={handleSubmit} className="px-6 py-2 rounded-lg text-white transition-colors" style={{ backgroundColor: '#00A9B7' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}>
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

      {/* Filter and Records Summary */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <AdvancedFilter
            fields={filterFields}
            onApplyFilter={handleApplyFilter}
            onClearFilter={handleClearFilter}
          />
          <div className="text-sm" style={{ color: '#6E7A82' }}>
            Showing {filteredContracts.length} of {contracts.length} records
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: '#F6F9FC' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Contract ID</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Vendor Name</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Start Date</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>End Date</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Status</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Approval Status</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map((contract, index) => (
                <tr key={contract.id} style={{ borderTop: index === 0 ? 'none' : '1px solid #E1E6EA' }}>
                  <td className="px-6 py-4" style={{ color: '#0A0F14' }}>{contract.contractId}</td>
                  <td className="px-6 py-4" style={{ color: '#0A0F14' }}>{contract.vendor}</td>
                  <td className="px-6 py-4" style={{ color: '#6E7A82' }}>{contract.contractStartDate}</td>
                  <td className="px-6 py-4" style={{ color: '#6E7A82' }}>{contract.contractEndDate}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: contract.status === 'Active' ? '#E8F7F8' : '#FFE8EA', color: contract.status === 'Active' ? '#00A9B7' : '#FF4E5B' }}>
                      {contract.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={getStatusBadgeStyle(contract.approvalStatus)}>
                      {contract.approvalStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {contract.approvalStatus === 'Pending Approval' && (
                        <button onClick={() => handleReview(contract)} className="p-2 rounded-lg transition-colors" style={{ color: '#00A9B7' }} title="Review Changes">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleEdit(contract)} className="p-2 rounded-lg transition-colors" style={{ color: '#6E7A82' }} title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(contract.id)} className="p-2 rounded-lg transition-colors" style={{ color: contract.approvalStatus === 'Approved' ? '#C4C4C4' : '#FF4E5B', cursor: contract.approvalStatus === 'Approved' ? 'not-allowed' : 'pointer' }} title={contract.approvalStatus === 'Approved' ? 'Cannot delete approved records' : 'Delete'} disabled={contract.approvalStatus === 'Approved'}>
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
    </div>
  );
}
