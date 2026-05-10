import { ArrowLeft, Plus, Trash2, X, Hash, FileText, Tag, Info, Edit, Eye } from 'lucide-react';
import { MasterListToolbar } from './ui/MasterListToolbar';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo, useCallback } from 'react';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { ApprovalModal } from './ApprovalModal';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { MasterPageShell } from './ui/MasterPageShell';
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

interface Product {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  category: string;
  description: string;
  hsnCode: string;
  status: string;
  entityMappings?: EntityScopeMapping[];
  approvalStatus?: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  originalData?: Product;
}

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

export function ProductMaster() {
  const navigate = useNavigate();
  const [products, setProducts] = useIncrementalMasterRecords<Product>('product_master', [
    {
      id: '1',
      productId: '1',
      productName: 'Ultimate Leggings',
      productCode: '399',
      category: 'Bottom Wear',
      description: 'High-stretch performance leggings ideal for gym or casual wear.',
      hsnCode: '6115',
      status: 'Active',
    },
    {
      id: '2',
      productId: '2',
      productName: 'Flair Pants',
      productCode: '414',
      category: 'Bottom Wear',
      description: 'Soft-flowing flare pants designed for comfort and style.',
      hsnCode: '6203',
      status: 'Inactive',
    },
    {
      id: '3',
      productId: '3',
      productName: 'Sports Bra',
      productCode: '502',
      category: 'Top Wear',
      description: 'Breathable, high-support sports bra suitable for workouts.',
      hsnCode: '6212',
      status: 'Inactive',
    },
    {
      id: '4',
      productId: '4',
      productName: 'Sports T-shirt',
      productCode: '667',
      category: 'Top Wear',
      description: 'Lightweight moisture-wicking T-shirt ideal for running and training.',
      hsnCode: '6109',
      status: 'Active',
    },
    {
      id: '5',
      productId: '5',
      productName: 'Running Jacket',
      productCode: '812',
      category: 'Top Wear',
      description: 'Wind-resistant running jacket designed for outdoor activities.',
      hsnCode: '6201',
      status: 'Active',
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [catalogue, setCatalogue] = useState('');
  const [description, setDescription] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [status, setStatus] = useState('Active');
  const [entityMappings, setEntityMappings] = useState<EntityScopeMapping[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<Product | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<string[]>([]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const haystack = [p.productCode, p.productName, p.category, p.description]
        .join(' ')
        .toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(p.status);
      const matchesApproval =
        approvalFilter.length === 0 || approvalFilter.includes(p.approvalStatus ?? 'Approved');
      return matchesSearch && matchesStatus && matchesApproval;
    });
  }, [products, searchTerm, statusFilter, approvalFilter]);

  const handleSubmit = (
    approvalStatus: NonNullable<Product['approvalStatus']> = 'Pending Approval'
  ) => {
    if (isEditMode && editingId) {
      const originalRecord = products.find((p) => p.id === editingId);
      const updatedProduct: Product = {
        id: editingId,
        productId,
        productName,
        productCode,
        category: catalogue,
        description,
        hsnCode,
        status,
        approvalStatus,
        originalData: originalRecord,
        entityMappings,
      };
      setProducts(products.map((p) => (p.id === editingId ? updatedProduct : p)));
    } else {
      const newProduct: Product = {
        id: Date.now().toString(),
        productId: productId || 'PROD-NEW',
        productName,
        productCode,
        category: catalogue,
        description,
        hsnCode,
        status,
        approvalStatus,
        entityMappings,
      };
      setProducts([...products, newProduct]);
    }
    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setProductId('');
    setProductName('');
    setProductCode('');
    setCatalogue('');
    setDescription('');
    setHsnCode('');
    setStatus('Active');
    setEntityMappings([]);
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (product: Product) => {
    setIsEditMode(true);
    setEditingId(product.id);
    setProductId(product.productId);
    setProductName(product.productName);
    setProductCode(product.productCode);
    setCatalogue(product.category);
    setDescription(product.description);
    setHsnCode(product.hsnCode);
    setStatus(product.status);
    setEntityMappings((product as any).entityMappings || []);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const product = products.find((p) => p.id === id);
    if (product?.approvalStatus === 'Approved') {
      alert(
        'Cannot delete approved/live records. You can only modify them through the approval workflow.'
      );
      return;
    }
    setProducts(products.filter((p) => p.id !== id));
  };

  const handleReview = (product: Product) => {
    const changes: Change[] = [];
    if (product.originalData) {
      const original = product.originalData;
      if (original.productName !== product.productName)
        changes.push({
          field: 'Product Name',
          oldValue: original.productName,
          newValue: product.productName,
        });
      if (original.productCode !== product.productCode)
        changes.push({
          field: 'Product Code',
          oldValue: original.productCode,
          newValue: product.productCode,
        });
      if (original.category !== product.category)
        changes.push({
          field: 'Category',
          oldValue: original.category,
          newValue: product.category,
        });
      if (original.description !== product.description)
        changes.push({
          field: 'Description',
          oldValue: original.description,
          newValue: product.description,
        });
      if (original.hsnCode !== product.hsnCode)
        changes.push({ field: 'HSN Code', oldValue: original.hsnCode, newValue: product.hsnCode });
      if (original.status !== product.status)
        changes.push({ field: 'Status', oldValue: original.status, newValue: product.status });
    }
    setCurrentReviewRecord(product);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction(
        'product_master',
        products,
        currentReviewRecord.id,
        'approve'
      );
      setProducts(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction(
        'product_master',
        products,
        currentReviewRecord.id,
        'reject'
      );
      setProducts(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleRequestInfo = async () => {
    if (currentReviewRecord) {
      const comments = window.prompt('Enter comments for the request:', '');
      if (comments === null) return;
      const nextRecords = await applyMasterApprovalAction(
        'product_master',
        products,
        currentReviewRecord.id,
        'request_info',
        comments
      );
      setProducts(nextRecords);
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
    const fields = [productName, productCode, catalogue, status];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [productName, productCode, catalogue, status]);

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
        masterName="Product Master"
        title="Create Product"
        subtitle="Define products with codes, descriptions, and HSN classification"
        modeLabel="Create Master Record"
        draftStatus="New"
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
        <FormSection title="Product Details" columns={2}>
          <PxFormField label="Product ID" filled={!!productId.trim()}>
            <input
              type="text"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="PROD-NEW"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Catalogue" required filled={!!catalogue}>
            <select
              value={catalogue}
              onChange={(e) => setCatalogue(e.target.value)}
              className="px-select"
            >
              <option value="">Select catalogue</option>
              <option value="Top Wear">Top Wear</option>
              <option value="Bottom Wear">Bottom Wear</option>
              <option value="Footwear">Footwear</option>
              <option value="Accessories">Accessories</option>
            </select>
          </PxFormField>
          <PxFormField label="Product Name" required filled={!!productName.trim()}>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g., Legging"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Product Code" required filled={!!productCode.trim()}>
            <input
              type="text"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              placeholder="Internal short code"
              className="px-input"
            />
          </PxFormField>
        </FormSection>
        <FormSection title="Additional Information" columns={2}>
          <PxFormField label="Product Description" filled={!!description.trim()}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed info (optional)"
              rows={4}
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="HSN Code" filled={!!hsnCode}>
            <select
              value={hsnCode}
              onChange={(e) => setHsnCode(e.target.value)}
              className="px-select"
            >
              <option value="">Tax classification (optional)</option>
              <option value="6109">6109 (T-Shirts)</option>
              <option value="6115">6115 (Leggings)</option>
              <option value="6201">6201 (Jackets)</option>
              <option value="6203">6203 (Trousers)</option>
              <option value="6212">6212 (Bras)</option>
            </select>
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
    <MasterPageShell masterName="Product Master" description="Manage product definitions">
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
          Add New
        </button>
      </div>

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        recordType="Product Master"
        recordId={currentReviewRecord?.productCode || ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />

      <MasterListToolbar
        masterName="Product Master"
        masterKey="product_master"
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
        records={filteredProducts}
        columns={[
          { key: 'productId', label: 'Product ID' },
          { key: 'productName', label: 'Product Name' },
          { key: 'productCode', label: 'Product Code' },
          { key: 'category', label: 'Category' },
          { key: 'description', label: 'Description' },
          { key: 'hsnCode', label: 'HSN Code' },
          { key: 'status', label: 'Status' },
          { key: 'entityMappings', label: 'Entity Mappings' },
          { key: 'approvalStatus', label: 'Approval Status' },
        ]}
      />

      {/* Products List */}
      <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
              <tr>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Product ID
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Product Name
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Code
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Category
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Description
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
              {filteredProducts.map((product, index) => (
                <tr
                  key={product.id}
                  style={{ borderTop: index === 0 ? 'none' : '1px solid var(--color-silver)' }}
                >
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                    {product.productId}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                    {product.productName}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    {product.productCode}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    {product.category}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    {product.description}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-sm"
                      style={{
                        backgroundColor:
                          product.status === 'Active' ? 'var(--color-teal-tint)' : '#FFE8EA',
                        color:
                          product.status === 'Active' ? 'var(--color-teal)' : 'var(--color-error)',
                      }}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-sm"
                      style={getStatusBadgeStyle(product.approvalStatus || 'Approved')}
                    >
                      {product.approvalStatus || 'Approved'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {product.approvalStatus === 'Pending Approval' && (
                        <button
                          onClick={() => handleReview(product)}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: 'var(--color-teal)' }}
                          title="Review Changes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'var(--color-mercury-grey)' }}
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 rounded-lg transition-colors"
                        style={{
                          color:
                            product.approvalStatus === 'Approved'
                              ? '#C4C4C4'
                              : 'var(--color-error)',
                          cursor: product.approvalStatus === 'Approved' ? 'not-allowed' : 'pointer',
                        }}
                        title={
                          product.approvalStatus === 'Approved'
                            ? 'Cannot delete approved records'
                            : 'Delete'
                        }
                        disabled={product.approvalStatus === 'Approved'}
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
