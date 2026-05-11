import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Edit, Eye, Trash2 } from 'lucide-react';
import { MasterListToolbar } from './ui/MasterListToolbar';
import { MasterPageShell } from './ui/MasterPageShell';
import { ApprovalModal } from './ApprovalModal';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { tableHeaderBg, tableHeaderFg } from './ui/listingStyles';
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

interface Category {
  id: string;
  categoryCode: string;
  categoryName: string;
  parentCategory: string;
  description: string;
  status: string;
  approvalStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  entityMappings?: EntityScopeMapping[];
  originalData?: Category;
}

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

export function CategoryMaster() {
  const navigate = useNavigate();
  const [categories, setCategories] = useIncrementalMasterRecords<Category>('category_master', [
    {
      id: '1',
      categoryCode: 'CAT001',
      categoryName: 'Top Wear',
      parentCategory: 'Garments',
      description: 'T-Shirts, Shirts, Jackets',
      status: 'Active',
      approvalStatus: 'Approved',
    },
    {
      id: '2',
      categoryCode: 'CAT002',
      categoryName: 'Bottom Wear',
      parentCategory: 'Garments',
      description: 'Trousers, Jeans, Shorts',
      status: 'Active',
      approvalStatus: 'Approved',
    },
    {
      id: '3',
      categoryCode: 'CAT003',
      categoryName: 'Footwear',
      parentCategory: 'Accessories',
      description: 'Shoes, Sandals, Boots',
      status: 'Active',
      approvalStatus: 'Pending Approval',
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [categoryCode, setCategoryCode] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [parentCategory, setParentCategory] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Active');
  const [entityMappings, setEntityMappings] = useState<EntityScopeMapping[]>([]);

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<Category | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<string[]>([]);

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const haystack = [cat.categoryCode, cat.categoryName, cat.parentCategory, cat.description]
        .join(' ')
        .toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(cat.status);
      const matchesApproval =
        approvalFilter.length === 0 || approvalFilter.includes(cat.approvalStatus);
      return matchesSearch && matchesStatus && matchesApproval;
    });
  }, [categories, searchTerm, statusFilter, approvalFilter]);

  const handleSubmit = (approvalStatus: Category['approvalStatus'] = 'Pending Approval') => {
    if (isEditMode && editingId) {
      const originalRecord = categories.find((c) => c.id === editingId);

      const updatedCategory: Category = {
        id: editingId,
        categoryCode,
        categoryName,
        parentCategory,
        description,
        status,
        approvalStatus,
        originalData: originalRecord,
        entityMappings,
      };

      setCategories(categories.map((c) => (c.id === editingId ? updatedCategory : c)));
    } else {
      const newCategory: Category = {
        id: Date.now().toString(),
        categoryCode,
        categoryName,
        parentCategory,
        description,
        status,
        approvalStatus,
        entityMappings,
      };
      setCategories([...categories, newCategory]);
    }

    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setCategoryCode('');
    setCategoryName('');
    setParentCategory('');
    setDescription('');
    setStatus('Active');
    setEntityMappings([]);
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (category: Category) => {
    setIsEditMode(true);
    setEditingId(category.id);
    setCategoryCode(category.categoryCode);
    setCategoryName(category.categoryName);
    setParentCategory(category.parentCategory);
    setDescription(category.description);
    setStatus(category.status);
    setEntityMappings(category.entityMappings || []);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const category = categories.find((c) => c.id === id);

    if (category?.approvalStatus === 'Approved') {
      alert(
        'Cannot delete approved/live records. You can only modify them through the approval workflow.'
      );
      return;
    }

    setCategories(categories.filter((c) => c.id !== id));
  };

  const handleReview = (category: Category) => {
    const changes: Change[] = [];

    if (category.originalData) {
      const original = category.originalData;

      if (original.categoryCode !== category.categoryCode) {
        changes.push({
          field: 'Category Code',
          oldValue: original.categoryCode,
          newValue: category.categoryCode,
        });
      }
      if (original.categoryName !== category.categoryName) {
        changes.push({
          field: 'Category Name',
          oldValue: original.categoryName,
          newValue: category.categoryName,
        });
      }
      if (original.parentCategory !== category.parentCategory) {
        changes.push({
          field: 'Parent Category',
          oldValue: original.parentCategory,
          newValue: category.parentCategory,
        });
      }
      if (original.description !== category.description) {
        changes.push({
          field: 'Description',
          oldValue: original.description,
          newValue: category.description,
        });
      }
      if (original.status !== category.status) {
        changes.push({ field: 'Status', oldValue: original.status, newValue: category.status });
      }
    }

    setCurrentReviewRecord(category);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction(
        'category_master',
        categories,
        currentReviewRecord.id,
        'approve'
      );
      setCategories(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction(
        'category_master',
        categories,
        currentReviewRecord.id,
        'reject'
      );
      setCategories(nextRecords);
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
        'category_master',
        categories,
        currentReviewRecord.id,
        'request_info',
        comments
      );
      setCategories(nextRecords);
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
    const fields = [categoryCode, categoryName, description];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [categoryCode, categoryName, description]);

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
        masterName="Category Master"
        title={editingId ? 'Edit Category' : 'Create Category'}
        subtitle="Manage categories with approval workflow"
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
        <FormSection title="Category Details" columns={2}>
          <PxFormField label="Category Code" required filled={!!categoryCode.trim()}>
            <input
              type="text"
              value={categoryCode}
              onChange={(e) => setCategoryCode(e.target.value)}
              placeholder="e.g., CAT004"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Category Name" required filled={!!categoryName.trim()}>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g., Winter Wear"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Parent Category" filled={!!parentCategory}>
            <select
              value={parentCategory}
              onChange={(e) => setParentCategory(e.target.value)}
              className="px-select"
            >
              <option value="">Select Parent</option>
              <option value="Garments">Garments</option>
              <option value="Accessories">Accessories</option>
              <option value="Raw Materials">Raw Materials</option>
            </select>
          </PxFormField>
          <PxFormField label="Status" filled={!!status}>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-select"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </PxFormField>
          <PxFormField label="Description" filled={!!description.trim()}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter category description"
              rows={4}
              className="px-input"
            />
          </PxFormField>
          <EntityMappingSelector value={entityMappings} onChange={setEntityMappings} />
        </FormSection>
      </FormShell>
    );
  }

  return (
    <MasterPageShell masterName="Category Master" description="Manage product categories">
      {/* Header */}
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
          Add Category
        </button>
      </div>

      {/* Approval Modal */}
      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        recordType="Category Master"
        recordId={currentReviewRecord?.categoryCode || ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />

      <MasterListToolbar
        masterName="Category Master"
        masterKey="category_master"
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
        records={filteredCategories}
        columns={[
          { key: 'categoryCode', label: 'Category Code' },
          { key: 'categoryName', label: 'Category Name' },
          { key: 'parentCategory', label: 'Parent Category' },
          { key: 'description', label: 'Description' },
          { key: 'status', label: 'Status' },
          { key: 'entityMappings', label: 'Entity Mappings' },
          { key: 'approvalStatus', label: 'Approval Status' },
        ]}
      />

      {/* Categories List */}
      <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: tableHeaderBg }}>
              <tr>
                <th
                  className="px-6 py-4 text-left text-xs uppercase tracking-[0.05em]"
                  style={{ color: tableHeaderFg, fontWeight: 500 }}
                >
                  Category Code
                </th>
                <th
                  className="px-6 py-4 text-left text-xs uppercase tracking-[0.05em]"
                  style={{ color: tableHeaderFg, fontWeight: 500 }}
                >
                  Category Name
                </th>
                <th
                  className="px-6 py-4 text-left text-xs uppercase tracking-[0.05em]"
                  style={{ color: tableHeaderFg, fontWeight: 500 }}
                >
                  Parent Category
                </th>
                <th
                  className="px-6 py-4 text-left text-xs uppercase tracking-[0.05em]"
                  style={{ color: tableHeaderFg, fontWeight: 500 }}
                >
                  Description
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
              {filteredCategories.map((category, index) => (
                <tr
                  key={category.id}
                  style={{
                    borderTop: index === 0 ? 'none' : '1px solid var(--color-silver)',
                  }}
                >
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                    {category.categoryCode}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                    {category.categoryName}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    {category.parentCategory}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    {category.description}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-sm"
                      style={{
                        backgroundColor:
                          category.status === 'Active'
                            ? 'var(--color-teal-tint)'
                            : 'var(--color-cloud)',
                        color:
                          category.status === 'Active'
                            ? 'var(--color-teal)'
                            : 'var(--color-mercury-grey)',
                      }}
                    >
                      {category.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-sm"
                      style={getStatusBadgeStyle(category.approvalStatus)}
                    >
                      {category.approvalStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {category.approvalStatus === 'Pending Approval' && (
                        <button
                          onClick={() => handleReview(category)}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: 'var(--color-teal)' }}
                          title="Review Changes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'var(--color-mercury-grey)' }}
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-2 rounded-lg transition-colors"
                        style={{
                          color:
                            category.approvalStatus === 'Approved'
                              ? '#C4C4C4'
                              : 'var(--color-error)',
                          cursor:
                            category.approvalStatus === 'Approved' ? 'not-allowed' : 'pointer',
                        }}
                        title={
                          category.approvalStatus === 'Approved'
                            ? 'Cannot delete approved records'
                            : 'Delete'
                        }
                        disabled={category.approvalStatus === 'Approved'}
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
