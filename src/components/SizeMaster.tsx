import { ArrowLeft, Plus, Trash2, X, Hash, Ruler, FileText, Tag, Edit, Eye } from 'lucide-react';
import { MasterListToolbar } from './ui/MasterListToolbar';
import { tableHeaderBg, tableHeaderFg } from './ui/listingStyles';
import { useNavigate } from 'react-router-dom';
import { MasterPageShell } from './ui/MasterPageShell';
import { useState, useMemo, useCallback } from 'react';
import { ApprovalModal } from './ApprovalModal';
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

interface Size {
  id: string;
  sizeCode: string;
  sizeName: string;
  sizeCategory: string;
  sortOrder: string;
  status: string;
  entityMappings?: EntityScopeMapping[];
  approvalStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  originalData?: Size;
}

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

export function SizeMaster() {
  const navigate = useNavigate();
  const [sizes, setSizes] = useIncrementalMasterRecords<Size>('size_master', [
    {
      id: '1',
      sizeCode: '001',
      sizeName: 'XS',
      sizeCategory: 'Apparel',
      sortOrder: '1',
      status: 'Active',
      approvalStatus: 'Approved',
    },
    {
      id: '2',
      sizeCode: '002',
      sizeName: 'S',
      sizeCategory: 'Apparel',
      sortOrder: '2',
      status: 'Active',
      approvalStatus: 'Approved',
    },
    {
      id: '3',
      sizeCode: '003',
      sizeName: 'M',
      sizeCategory: 'Apparel',
      sortOrder: '3',
      status: 'Active',
      approvalStatus: 'Pending Approval',
    },
    {
      id: '4',
      sizeCode: '004',
      sizeName: 'L',
      sizeCategory: 'Apparel',
      sortOrder: '4',
      status: 'Active',
      approvalStatus: 'Approved',
    },
    {
      id: '5',
      sizeCode: '005',
      sizeName: 'XL',
      sizeCategory: 'Apparel',
      sortOrder: '5',
      status: 'Active',
      approvalStatus: 'Draft',
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [sizeCode, setSizeCode] = useState('');
  const [sizeName, setSizeName] = useState('');
  const [sizeCategory, setSizeCategory] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [status, setStatus] = useState('Active');
  const [entityMappings, setEntityMappings] = useState<EntityScopeMapping[]>([]);

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<Size | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<string[]>([]);

  const filteredSizes = useMemo(() => {
    return sizes.filter((size) => {
      const haystack = [size.sizeCode, size.sizeName, size.sizeCategory, size.sortOrder]
        .join(' ')
        .toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(size.status);
      const matchesApproval =
        approvalFilter.length === 0 || approvalFilter.includes(size.approvalStatus);
      return matchesSearch && matchesStatus && matchesApproval;
    });
  }, [sizes, searchTerm, statusFilter, approvalFilter]);

  const handleSubmit = (approvalStatus: Size['approvalStatus'] = 'Pending Approval') => {
    if (isEditMode && editingId) {
      const originalRecord = sizes.find((s) => s.id === editingId);

      const updatedSize: Size = {
        id: editingId,
        sizeCode,
        sizeName,
        sizeCategory,
        sortOrder,
        status,
        approvalStatus,
        originalData: originalRecord,
        entityMappings,
      };

      setSizes(sizes.map((s) => (s.id === editingId ? updatedSize : s)));
    } else {
      const newSize: Size = {
        id: Date.now().toString(),
        sizeCode,
        sizeName,
        sizeCategory,
        sortOrder,
        status,
        approvalStatus,
        entityMappings,
      };
      setSizes([...sizes, newSize]);
    }

    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setSizeCode('');
    setSizeName('');
    setSizeCategory('');
    setSortOrder('');
    setStatus('Active');
    setEntityMappings([]);
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (size: Size) => {
    setIsEditMode(true);
    setEditingId(size.id);
    setSizeCode(size.sizeCode);
    setSizeName(size.sizeName);
    setSizeCategory(size.sizeCategory);
    setSortOrder(size.sortOrder);
    setStatus(size.status);
    setEntityMappings(size.entityMappings || []);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const size = sizes.find((s) => s.id === id);

    if (size?.approvalStatus === 'Approved') {
      alert(
        'Cannot delete approved/live records. You can only modify them through the approval workflow.'
      );
      return;
    }

    setSizes(sizes.filter((s) => s.id !== id));
  };

  const handleReview = (size: Size) => {
    const changes: Change[] = [];

    if (size.originalData) {
      const original = size.originalData;

      if (original.sizeCode !== size.sizeCode) {
        changes.push({ field: 'Size Code', oldValue: original.sizeCode, newValue: size.sizeCode });
      }
      if (original.sizeName !== size.sizeName) {
        changes.push({ field: 'Size Name', oldValue: original.sizeName, newValue: size.sizeName });
      }
      if (original.sizeCategory !== size.sizeCategory) {
        changes.push({
          field: 'Size Category',
          oldValue: original.sizeCategory,
          newValue: size.sizeCategory,
        });
      }
      if (original.sortOrder !== size.sortOrder) {
        changes.push({
          field: 'Sort Order',
          oldValue: original.sortOrder,
          newValue: size.sortOrder,
        });
      }
      if (original.status !== size.status) {
        changes.push({ field: 'Status', oldValue: original.status, newValue: size.status });
      }
    }

    setCurrentReviewRecord(size);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction(
        'size_master',
        sizes,
        currentReviewRecord.id,
        'approve'
      );
      setSizes(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction(
        'size_master',
        sizes,
        currentReviewRecord.id,
        'reject'
      );
      setSizes(nextRecords);
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
      const nextRecords = await applyMasterApprovalAction(
        'size_master',
        sizes,
        currentReviewRecord.id,
        'request_info',
        comments
      );
      setSizes(nextRecords);
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
    const fields = [sizeCode, sizeName, sortOrder];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [sizeCode, sizeName, sortOrder]);

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
        masterName="Size Master"
        title={editingId ? 'Edit Size' : 'Create Size'}
        subtitle="Manage size variants with approval workflow"
        modeLabel={editingId ? 'Edit Master Record' : 'Create Master Record'}
        draftStatus={editingId ? 'Draft' : 'New'}
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
        <FormSection title="Size Details" columns={2}>
          <PxFormField label="Size Code" required filled={!!sizeCode.trim()}>
            <input
              type="text"
              value={sizeCode}
              onChange={(e) => setSizeCode(e.target.value)}
              placeholder="e.g., 006"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Size Name" required filled={!!sizeName.trim()}>
            <input
              type="text"
              value={sizeName}
              onChange={(e) => setSizeName(e.target.value)}
              placeholder="e.g., XXL"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Size Category" filled={!!sizeCategory}>
            <select
              value={sizeCategory}
              onChange={(e) => setSizeCategory(e.target.value)}
              className="px-select"
            >
              <option value="">Select Category</option>
              <option value="Apparel">Apparel</option>
              <option value="Footwear">Footwear</option>
              <option value="Accessories">Accessories</option>
            </select>
          </PxFormField>
          <PxFormField label="Sort Order" filled={!!sortOrder.trim()} hint="Numeric display order">
            <input
              type="text"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="e.g., 6"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Status" required filled={!!status}>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-select"
            >
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
    <MasterPageShell masterName="Size Master" description="Manage size definitions">
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
          Add Size
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
                {isEditMode ? 'Edit Size' : 'Add New Size'}
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
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Size Code <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <div className="relative">
                    <Hash
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                      style={{ color: 'var(--color-mercury-grey)' }}
                    />
                    <input
                      type="text"
                      value={sizeCode}
                      onChange={(e) => setSizeCode(e.target.value)}
                      placeholder="e.g., 006"
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                    />
                  </div>
                </div>
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Size Name <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <div className="relative">
                    <Ruler
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                      style={{ color: 'var(--color-mercury-grey)' }}
                    />
                    <input
                      type="text"
                      value={sizeName}
                      onChange={(e) => setSizeName(e.target.value)}
                      placeholder="e.g., XXL"
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                    />
                  </div>
                </div>
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Size Category
                  </label>
                  <div className="relative">
                    <Tag
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                      style={{ color: 'var(--color-mercury-grey)' }}
                    />
                    <select
                      value={sizeCategory}
                      onChange={(e) => setSizeCategory(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                    >
                      <option value="">Select Category</option>
                      <option value="Apparel">Apparel</option>
                      <option value="Footwear">Footwear</option>
                      <option value="Accessories">Accessories</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Sort Order
                  </label>
                  <input
                    type="text"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    placeholder="e.g., 6"
                    className="w-full px-3 py-2 rounded-lg"
                    style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Status <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <div className="relative">
                    <FileText
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                      style={{ color: 'var(--color-mercury-grey)' }}
                    />
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
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
        recordType="Size Master"
        recordId={currentReviewRecord?.sizeCode || ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />

      <MasterListToolbar
        masterName="Size Master"
        masterKey="size_master"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: ['Active', 'Inactive'],
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
        records={filteredSizes}
        columns={[
          { key: 'sizeCode', label: 'Size Code' },
          { key: 'sizeName', label: 'Size Name' },
          { key: 'sizeCategory', label: 'Category' },
          { key: 'sortOrder', label: 'Sort Order' },
          { key: 'status', label: 'Status' },
          { key: 'entityMappings', label: 'Entity Mappings' },
          { key: 'approvalStatus', label: 'Approval Status' },
        ]}
      />

      <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: tableHeaderBg }}>
              <tr>
                <th
                  className="px-6 py-4 text-left text-xs uppercase tracking-[0.05em]"
                  style={{ color: tableHeaderFg, fontWeight: 500 }}
                >
                  Size Code
                </th>
                <th
                  className="px-6 py-4 text-left text-xs uppercase tracking-[0.05em]"
                  style={{ color: tableHeaderFg, fontWeight: 500 }}
                >
                  Size Name
                </th>
                <th
                  className="px-6 py-4 text-left text-xs uppercase tracking-[0.05em]"
                  style={{ color: tableHeaderFg, fontWeight: 500 }}
                >
                  Category
                </th>
                <th
                  className="px-6 py-4 text-left text-xs uppercase tracking-[0.05em]"
                  style={{ color: tableHeaderFg, fontWeight: 500 }}
                >
                  Sort Order
                </th>
                <th
                  className="px-6 py-4 text-left text-xs uppercase tracking-[0.05em]"
                  style={{ color: tableHeaderFg, fontWeight: 500 }}
                >
                  Status
                </th>
                <th
                  className="px-6 py-4 text-left text-xs uppercase tracking-[0.05em]"
                  style={{ color: tableHeaderFg, fontWeight: 500 }}
                >
                  Approval Status
                </th>
                <th
                  className="px-6 py-4 text-left text-xs uppercase tracking-[0.05em]"
                  style={{ color: tableHeaderFg, fontWeight: 500 }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSizes.map((size, index) => (
                <tr
                  key={size.id}
                  style={{ borderTop: index === 0 ? 'none' : '1px solid var(--color-silver)' }}
                >
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                    {size.sizeCode}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                    {size.sizeName}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    {size.sizeCategory}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    {size.sortOrder}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-sm"
                      style={{
                        backgroundColor:
                          size.status === 'Active' ? 'var(--color-teal-tint)' : '#FFE8EA',
                        color:
                          size.status === 'Active' ? 'var(--color-teal)' : 'var(--color-error)',
                      }}
                    >
                      {size.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-sm"
                      style={getStatusBadgeStyle(size.approvalStatus)}
                    >
                      {size.approvalStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {size.approvalStatus === 'Pending Approval' && (
                        <button
                          onClick={() => handleReview(size)}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: 'var(--color-teal)' }}
                          title="Review Changes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(size)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'var(--color-mercury-grey)' }}
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(size.id)}
                        className="p-2 rounded-lg transition-colors"
                        style={{
                          color:
                            size.approvalStatus === 'Approved' ? '#C4C4C4' : 'var(--color-error)',
                          cursor: size.approvalStatus === 'Approved' ? 'not-allowed' : 'pointer',
                        }}
                        title={
                          size.approvalStatus === 'Approved'
                            ? 'Cannot delete approved records'
                            : 'Delete'
                        }
                        disabled={size.approvalStatus === 'Approved'}
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
