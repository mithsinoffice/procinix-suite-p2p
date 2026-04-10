import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Edit, Eye, Trash2 } from 'lucide-react';
import { ApprovalModal } from './ApprovalModal';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { MasterFormPage } from './ui/MasterFormPage';

interface Category {
  id: string;
  categoryCode: string;
  categoryName: string;
  parentCategory: string;
  description: string;
  status: string;
  approvalStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
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
      approvalStatus: 'Approved'
    },
    {
      id: '2',
      categoryCode: 'CAT002',
      categoryName: 'Bottom Wear',
      parentCategory: 'Garments',
      description: 'Trousers, Jeans, Shorts',
      status: 'Active',
      approvalStatus: 'Approved'
    },
    {
      id: '3',
      categoryCode: 'CAT003',
      categoryName: 'Footwear',
      parentCategory: 'Accessories',
      description: 'Shoes, Sandals, Boots',
      status: 'Active',
      approvalStatus: 'Pending Approval'
    }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [categoryCode, setCategoryCode] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [parentCategory, setParentCategory] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Active');

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<Category | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);

  const handleSubmit = (approvalStatus: Category['approvalStatus'] = 'Pending Approval') => {
    if (isEditMode && editingId) {
      const originalRecord = categories.find(c => c.id === editingId);
      
      const updatedCategory: Category = {
        id: editingId,
        categoryCode,
        categoryName,
        parentCategory,
        description,
        status,
        approvalStatus,
        originalData: originalRecord
      };
      
      setCategories(categories.map(c => c.id === editingId ? updatedCategory : c));
    } else {
      const newCategory: Category = {
        id: Date.now().toString(),
        categoryCode,
        categoryName,
        parentCategory,
        description,
        status,
        approvalStatus
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
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const category = categories.find(c => c.id === id);
    
    if (category?.approvalStatus === 'Approved') {
      alert('Cannot delete approved/live records. You can only modify them through the approval workflow.');
      return;
    }
    
    setCategories(categories.filter(c => c.id !== id));
  };

  const handleReview = (category: Category) => {
    const changes: Change[] = [];
    
    if (category.originalData) {
      const original = category.originalData;
      
      if (original.categoryCode !== category.categoryCode) {
        changes.push({ field: 'Category Code', oldValue: original.categoryCode, newValue: category.categoryCode });
      }
      if (original.categoryName !== category.categoryName) {
        changes.push({ field: 'Category Name', oldValue: original.categoryName, newValue: category.categoryName });
      }
      if (original.parentCategory !== category.parentCategory) {
        changes.push({ field: 'Parent Category', oldValue: original.parentCategory, newValue: category.parentCategory });
      }
      if (original.description !== category.description) {
        changes.push({ field: 'Description', oldValue: original.description, newValue: category.description });
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
      const nextRecords = await applyMasterApprovalAction('category_master', categories, currentReviewRecord.id, 'approve');
      setCategories(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction('category_master', categories, currentReviewRecord.id, 'reject');
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
      const nextRecords = await applyMasterApprovalAction('category_master', categories, currentReviewRecord.id, 'request_info', comments);
      setCategories(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
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

  if (showForm) {
    return (
      <MasterFormPage
        title="Category Master"
        subtitle="Manage categories with approval workflow"
        modeLabel={isEditMode ? 'Edit Category' : 'Create Category'}
        onBack={() => setShowForm(false)}
        onCancel={() => setShowForm(false)}
        onSaveDraft={() => handleSubmit('Draft')}
        onSubmit={() => handleSubmit('Pending Approval')}
        submitLabel="Submit"
        draftLabel="Save Draft"
      >
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
              Category Code <span style={{ color: '#FF4E5B' }}>*</span>
            </label>
            <input
              type="text"
              value={categoryCode}
              onChange={(e) => setCategoryCode(e.target.value)}
              placeholder="e.g., CAT004"
              className="w-full px-3 py-2 rounded-lg"
              style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
            />
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
              Category Name <span style={{ color: '#FF4E5B' }}>*</span>
            </label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g., Winter Wear"
              className="w-full px-3 py-2 rounded-lg"
              style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
            />
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
              Parent Category
            </label>
            <select
              value={parentCategory}
              onChange={(e) => setParentCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg"
              style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
            >
              <option value="">Select Parent</option>
              <option value="Garments">Garments</option>
              <option value="Accessories">Accessories</option>
              <option value="Raw Materials">Raw Materials</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg"
              style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter category description"
              rows={4}
              className="w-full px-3 py-2 rounded-lg"
              style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
            />
          </div>
        </div>
      </MasterFormPage>
    );
  }

  return (
    <div className="p-8" style={{ backgroundColor: '#F6F9FC' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/masters')}
            className="p-2 rounded-lg transition-colors"
            style={{ color: '#6E7A82' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl" style={{ color: '#0A0F14' }}>Category Master</h1>
            <p style={{ color: '#6E7A82' }}>Manage categories with approval workflow</p>
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

      {/* Categories List */}
      <div className="bg-white rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: '#F6F9FC' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>
                  Category Code
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>
                  Category Name
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>
                  Parent Category
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>
                  Description
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>
                  Approval Status
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category, index) => (
                <tr
                  key={category.id}
                  style={{
                    borderTop: index === 0 ? 'none' : '1px solid #E1E6EA'
                  }}
                >
                  <td className="px-6 py-4" style={{ color: '#0A0F14' }}>
                    {category.categoryCode}
                  </td>
                  <td className="px-6 py-4" style={{ color: '#0A0F14' }}>
                    {category.categoryName}
                  </td>
                  <td className="px-6 py-4" style={{ color: '#6E7A82' }}>
                    {category.parentCategory}
                  </td>
                  <td className="px-6 py-4" style={{ color: '#6E7A82' }}>
                    {category.description}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-sm"
                      style={{
                        backgroundColor: category.status === 'Active' ? '#E8F7F8' : '#F6F9FC',
                        color: category.status === 'Active' ? '#00A9B7' : '#6E7A82'
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
                          style={{ color: '#00A9B7' }}
                          title="Review Changes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: '#6E7A82' }}
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-2 rounded-lg transition-colors"
                        style={{
                          color: category.approvalStatus === 'Approved' ? '#C4C4C4' : '#FF4E5B',
                          cursor: category.approvalStatus === 'Approved' ? 'not-allowed' : 'pointer'
                        }}
                        title={category.approvalStatus === 'Approved' ? 'Cannot delete approved records' : 'Delete'}
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
    </div>
  );
}
