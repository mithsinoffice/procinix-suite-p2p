import { ArrowLeft, Plus, Trash2, X, Hash, FileText, Percent, Edit, Eye, Search, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMemo, useState, useCallback } from 'react';
import { ApprovalModal } from './ApprovalModal';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { PremiumActionButton, PremiumFilterMenu, toggleMultiSelect } from './ui/premium-register';
import { FormShell, FormSection, PxFormField, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';
import { EntityMappingSelector } from './shared/EntityMappingSelector';
import type { EntityScopeMapping } from '../lib/masters/entityMapping';

interface TaxCode {
  id: string;
  taxCode: string;
  description: string;
  taxRate: string;
  status: string;
  approvalStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  originalData?: TaxCode;
}

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

export function TaxCodeMaster() {
  const navigate = useNavigate();
  const [taxCodes, setTaxCodes] = useIncrementalMasterRecords<TaxCode>('tax_code_master', [
    { id: '1', taxCode: '6109', description: 'T-shirts, singlets and other vests, knitted', taxRate: '12%', status: 'Active', approvalStatus: 'Approved' },
    { id: '2', taxCode: '6115', description: 'Pantyhose, tights, stockings and leggings', taxRate: '12%', status: 'Active', approvalStatus: 'Approved' },
    { id: '3', taxCode: '6201', description: 'Men\'s or boys\' overcoats and jackets', taxRate: '12%', status: 'Active', approvalStatus: 'Pending Approval' },
    { id: '4', taxCode: '6203', description: 'Men\'s or boys\' suits and trousers', taxRate: '12%', status: 'Active', approvalStatus: 'Approved' },
    { id: '5', taxCode: '998314', description: 'Business support service (SAC)', taxRate: '18%', status: 'Active', approvalStatus: 'Draft' }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [taxCode, setTaxCode] = useState('');
  const [description, setDescription] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [status, setStatus] = useState('Active');
  const [entityMappings, setEntityMappings] = useState<EntityScopeMapping[]>([]);


  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<TaxCode | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<string[]>([]);

  const filteredTaxCodes = useMemo(() => {
    return taxCodes.filter((tax) => {
      const haystack = [tax.taxCode, tax.description, tax.taxRate].join(' ').toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(tax.status);
      const matchesApproval = approvalFilter.length === 0 || approvalFilter.includes(tax.approvalStatus);
      return matchesSearch && matchesStatus && matchesApproval;
    });
  }, [taxCodes, searchTerm, statusFilter, approvalFilter]);

  const hasActiveFilters = searchTerm.trim().length > 0 || statusFilter.length > 0 || approvalFilter.length > 0;

  const handleSubmit = (approvalStatus: TaxCode['approvalStatus'] = 'Pending Approval') => {
    if (isEditMode && editingId) {
      const originalRecord = taxCodes.find(t => t.id === editingId);
      
      const updatedTaxCode: TaxCode = {
        id: editingId,
        taxCode,
        description,
        taxRate,
        status,
        approvalStatus,
        originalData: originalRecord,
        entityMappings,
      };
      
      setTaxCodes(taxCodes.map(t => t.id === editingId ? updatedTaxCode : t));
    } else {
      const newTaxCode: TaxCode = {
        id: Date.now().toString(),
        taxCode,
        description,
        taxRate,
        status,
        approvalStatus,
        entityMappings,
      };
      setTaxCodes([...taxCodes, newTaxCode]);
    }
    
    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setTaxCode('');
    setDescription('');
    setTaxRate('');
    setStatus('Active');
    setEntityMappings([]);
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (tax: TaxCode) => {
    setIsEditMode(true);
    setEditingId(tax.id);
    setTaxCode(tax.taxCode);
    setDescription(tax.description);
    setTaxRate(tax.taxRate);
    setStatus(tax.status);
    setEntityMappings(tax.entityMappings || []);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const tax = taxCodes.find(t => t.id === id);
    
    if (tax?.approvalStatus === 'Approved') {
      alert('Cannot delete approved/live records. You can only modify them through the approval workflow.');
      return;
    }
    
    setTaxCodes(taxCodes.filter(t => t.id !== id));
  };

  const handleReview = (tax: TaxCode) => {
    const changes: Change[] = [];
    
    if (tax.originalData) {
      const original = tax.originalData;
      
      if (original.taxCode !== tax.taxCode) {
        changes.push({ field: 'Tax Code', oldValue: original.taxCode, newValue: tax.taxCode });
      }
      if (original.description !== tax.description) {
        changes.push({ field: 'Description', oldValue: original.description, newValue: tax.description });
      }
      if (original.taxRate !== tax.taxRate) {
        changes.push({ field: 'Tax Rate', oldValue: original.taxRate, newValue: tax.taxRate });
      }
      if (original.status !== tax.status) {
        changes.push({ field: 'Status', oldValue: original.status, newValue: tax.status });
      }
    }
    
    setCurrentReviewRecord(tax);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction('tax_code_master', taxCodes, currentReviewRecord.id, 'approve');
      setTaxCodes(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction('tax_code_master', taxCodes, currentReviewRecord.id, 'reject');
      setTaxCodes(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleRequestInfo = async () => {
    if (currentReviewRecord) {
      const comments = window.prompt('Enter comments for the request:', '');
      if (comments === null) {
        return;
      }
      const nextRecords = await applyMasterApprovalAction('tax_code_master', taxCodes, currentReviewRecord.id, 'request_info', comments);
      setTaxCodes(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
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

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const completeness = useMemo(() => {
    const fields = [taxCode, taxRate, status];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [taxCode, taxRate, status]);

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
        title={isEditMode ? 'Edit Tax Code' : 'Create Tax Code'}
        subtitle="Manage tax codes with approval workflow"
        modeLabel={isEditMode ? 'Edit Master Record' : 'Create Master Record'}
        draftStatus={isEditMode ? 'Draft' : 'New'}
        completeness={completeness}
        onBack={() => setShowForm(false)}
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
        <FormSection title="Tax Code Details" columns={2}>
          <PxFormField label="Tax Code" required filled={!!taxCode.trim()} hint="HSN / SAC code">
            <input type="text" value={taxCode} onChange={(e) => setTaxCode(e.target.value)} placeholder="e.g., 6301" className="px-input" />
          </PxFormField>
          <PxFormField label="Tax Rate" required filled={!!taxRate.trim()} hint="Composite GST rate">
            <input type="text" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="e.g., 18%" className="px-input" />
          </PxFormField>
          <PxFormField label="Description" filled={!!description.trim()}>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter tax code description" rows={4} className="px-input" />
          </PxFormField>
          <PxFormField label="Status" required filled={!!status}>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-select">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </PxFormField>
                  <EntityMappingSelector value={entityMappings} onChange={setEntityMappings} />
        </FormSection>
      </FormShell>
    );
  }

  return (
    <div className="p-8" style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/masters')} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-mercury-grey)' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl" style={{ color: 'var(--color-ink)' }}>Tax Code Master</h1>
            <p style={{ color: 'var(--color-mercury-grey)' }}>Manage tax codes with approval workflow</p>
          </div>
        </div>
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
          Add Tax Code
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--color-silver)' }}>
              <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>
                {isEditMode ? 'Edit Tax Code' : 'Add New Tax Code'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-mercury-grey)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Tax Code <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    <input type="text" value={taxCode} onChange={(e) => setTaxCode(e.target.value)} placeholder="e.g., 6301" className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Tax Rate <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    <input type="text" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="e.g., 18%" className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }} />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter tax code description" rows={3} className="w-full px-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }} />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Status <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-3 flex-shrink-0" style={{ borderColor: 'var(--color-silver)' }}>
              <button onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg transition-colors" style={{ border: '1px solid var(--color-silver)', color: 'var(--color-mercury-grey)', backgroundColor: 'white' }}>
                Cancel
              </button>
              <button onClick={handleSubmit} className="px-6 py-2 rounded-lg text-white transition-colors" style={{ backgroundColor: 'var(--color-teal)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}>
                {isEditMode ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        recordType="Tax Code Master"
        recordId={currentReviewRecord?.taxCode || ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />

      <div className="rounded-[24px] overflow-hidden bg-white" style={{ border: '1px solid var(--color-fog)', boxShadow: '0 18px 42px rgba(15, 23, 42, 0.06)' }}>
        <div className="overflow-x-auto">
          <div style={{ minWidth: '1120px' }}>
            <div className="grid gap-4 px-6 py-4" style={{ gridTemplateColumns: '1.1fr 2.5fr 1fr 1fr 1.3fr 0.9fr', borderBottom: '1px solid #E8F0F4' }}>
              <div className="space-y-2">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-mercury-grey)' }} />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search tax codes..."
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl text-sm"
                    style={{ backgroundColor: '#F8FBFD', border: '1px solid var(--color-fog)', color: 'var(--color-ink)' }}
                  />
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter([]);
                      setApprovalFilter([]);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                    style={{ backgroundColor: '#FFF5F5', border: '1px solid #FED7D7', color: '#C53030', fontWeight: 600 }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
              <div />
              <div />
              <div className="flex items-start">
                <PremiumFilterMenu
                  label="Status"
                  options={['Active', 'Inactive']}
                  selected={statusFilter}
                  onToggle={(value) => setStatusFilter((current) => toggleMultiSelect(current, value))}
                />
              </div>
              <div className="flex items-start">
                <PremiumFilterMenu
                  label="Approval"
                  options={['Draft', 'Pending Approval', 'Approved', 'Rejected']}
                  selected={approvalFilter}
                  onToggle={(value) => setApprovalFilter((current) => toggleMultiSelect(current, value))}
                />
              </div>
              <div />
            </div>

            <div className="grid gap-4 px-6 py-4" style={{ gridTemplateColumns: '1.1fr 2.5fr 1fr 1fr 1.3fr 0.9fr', background: 'linear-gradient(180deg, #F8FBFD 0%, #F3F8FB 100%)', borderBottom: '1px solid #E4EDF2' }}>
              {['Tax Code', 'Description', 'Tax Rate', 'Status', 'Approval Status', 'Action'].map((column) => (
                <div key={column} className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--color-mercury-grey)', fontWeight: 700 }}>
                  {column}
                </div>
              ))}
            </div>

            <div>
              {filteredTaxCodes.map((tax, index) => (
                <div
                  key={tax.id}
                  className="grid gap-4 px-6 py-4 items-center"
                  style={{
                    gridTemplateColumns: '1.1fr 2.5fr 1fr 1fr 1.3fr 0.9fr',
                    borderBottom: index === filteredTaxCodes.length - 1 ? 'none' : '1px solid #EDF3F7',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <div style={{ color: 'var(--color-ink)', fontWeight: 700 }}>{tax.taxCode}</div>
                  <div style={{ color: 'var(--color-mercury-grey)' }}>{tax.description}</div>
                  <div style={{ color: 'var(--color-ink)' }}>{tax.taxRate}</div>
                  <div>
                    <span className="px-3 py-1.5 rounded-full text-xs" style={{ backgroundColor: tax.status === 'Active' ? 'var(--color-teal-tint)' : '#FFE8EA', color: tax.status === 'Active' ? 'var(--color-teal)' : 'var(--color-error)', fontWeight: 700 }}>
                      {tax.status}
                    </span>
                  </div>
                  <div>
                    <span className="px-3 py-1.5 rounded-full text-xs" style={{ ...getStatusBadgeStyle(tax.approvalStatus), fontWeight: 700 }}>
                      {tax.approvalStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {tax.approvalStatus === 'Pending Approval' && (
                      <PremiumActionButton label="Review tax code" icon={<Eye className="w-4 h-4" />} tone="teal" onClick={() => handleReview(tax)} />
                    )}
                    <PremiumActionButton label="Edit tax code" icon={<Edit className="w-4 h-4" />} tone="violet" onClick={() => handleEdit(tax)} />
                    <PremiumActionButton label="Open tax code" icon={<ArrowUpRight className="w-4 h-4" />} tone="blue" onClick={() => handleEdit(tax)} />
                    <PremiumActionButton label="Delete tax code" icon={<Trash2 className="w-4 h-4" />} tone="amber" onClick={() => handleDelete(tax.id)} />
                  </div>
                </div>
              ))}
              {filteredTaxCodes.length === 0 && (
                <div className="px-8 py-16 text-center">
                  <p className="text-base mb-1" style={{ color: 'var(--color-ink)', fontWeight: 700 }}>No tax codes match the current filters</p>
                  <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Clear one or more filters to bring the full register back.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
