import { ArrowLeft, Plus, Trash2, X, Hash, FileText, Tag, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo, useCallback } from 'react';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { FormShell, FormSection, PxFormField, CheckCard, type SaveStatus } from './ui/form-primitives';
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
  approvalStatus?: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
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
      status: 'Active'
    },
    {
      id: '2',
      productId: '2',
      productName: 'Flair Pants',
      productCode: '414',
      category: 'Bottom Wear',
      description: 'Soft-flowing flare pants designed for comfort and style.',
      hsnCode: '6203',
      status: 'Inactive'
    },
    {
      id: '3',
      productId: '3',
      productName: 'Sports Bra',
      productCode: '502',
      category: 'Top Wear',
      description: 'Breathable, high-support sports bra suitable for workouts.',
      hsnCode: '6212',
      status: 'Inactive'
    },
    {
      id: '4',
      productId: '4',
      productName: 'Sports T-shirt',
      productCode: '667',
      category: 'Top Wear',
      description: 'Lightweight moisture-wicking T-shirt ideal for running and training.',
      hsnCode: '6109',
      status: 'Active'
    },
    {
      id: '5',
      productId: '5',
      productName: 'Running Jacket',
      productCode: '812',
      category: 'Top Wear',
      description: 'Wind-resistant running jacket designed for outdoor activities.',
      hsnCode: '6201',
      status: 'Active'
    }
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


  const handleSubmit = (approvalStatus: NonNullable<Product['approvalStatus']> = 'Pending Approval') => {
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
  };

  const handleDelete = (id: string) => {
    setProducts(products.filter(product => product.id !== id));
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
            <input type="text" value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="PROD-NEW" className="px-input" />
          </PxFormField>
          <PxFormField label="Catalogue" required filled={!!catalogue}>
            <select value={catalogue} onChange={(e) => setCatalogue(e.target.value)} className="px-select">
              <option value="">Select catalogue</option>
              <option value="Top Wear">Top Wear</option>
              <option value="Bottom Wear">Bottom Wear</option>
              <option value="Footwear">Footwear</option>
              <option value="Accessories">Accessories</option>
            </select>
          </PxFormField>
          <PxFormField label="Product Name" required filled={!!productName.trim()}>
            <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g., Legging" className="px-input" />
          </PxFormField>
          <PxFormField label="Product Code" required filled={!!productCode.trim()}>
            <input type="text" value={productCode} onChange={(e) => setProductCode(e.target.value)} placeholder="Internal short code" className="px-input" />
          </PxFormField>
        </FormSection>
        <FormSection title="Additional Information" columns={2}>
          <PxFormField label="Product Description" filled={!!description.trim()}>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed info (optional)" rows={4} className="px-input" />
          </PxFormField>
          <PxFormField label="HSN Code" filled={!!hsnCode}>
            <select value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} className="px-select">
              <option value="">Tax classification (optional)</option>
              <option value="6109">6109 (T-Shirts)</option>
              <option value="6115">6115 (Leggings)</option>
              <option value="6201">6201 (Jackets)</option>
              <option value="6203">6203 (Trousers)</option>
              <option value="6212">6212 (Bras)</option>
            </select>
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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/masters')}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-mercury-grey)' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl" style={{ color: 'var(--color-ink)' }}>Product Master</h1>
            <p style={{ color: 'var(--color-mercury-grey)' }}>Dummy product data for now.</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-colors"
          style={{ backgroundColor: 'var(--color-teal)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
        >
          <Plus className="w-5 h-5" />
          Add New
        </button>
      </div>

      {/* Products List */}
      <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  PRODUCT ID
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  PRODUCT NAME
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  CODE
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  CATEGORY
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  DESCRIPTION
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  STATUS
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, index) => (
                <tr
                  key={product.id}
                  style={{
                    borderTop: index === 0 ? 'none' : '1px solid var(--color-silver)'
                  }}
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
                        backgroundColor: product.status === 'Active' ? 'var(--color-teal-tint)' : '#FFE8EA',
                        color: product.status === 'Active' ? 'var(--color-teal)' : 'var(--color-error)'
                      }}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--color-error)' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
