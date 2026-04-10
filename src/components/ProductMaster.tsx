import { ArrowLeft, Plus, Trash2, X, Hash, FileText, Tag, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { MasterFormPage } from './ui/MasterFormPage';

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
      approvalStatus
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
  };

  const handleDelete = (id: string) => {
    setProducts(products.filter(product => product.id !== id));
  };

  if (showForm) {
    return (
      <MasterFormPage
        title="Create Product"
        subtitle="Define products with codes, descriptions, and HSN classification"
        modeLabel="Create Master Record"
        onBack={() => setShowForm(false)}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Product ID</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
                <input type="text" value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="PROD-NEW" className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Catalogue <span style={{ color: '#FF4E5B' }}>*</span></label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
                <select value={catalogue} onChange={(e) => setCatalogue(e.target.value)} className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
                  <option value="">Select catalogue</option>
                  <option value="Top Wear">Top Wear</option>
                  <option value="Bottom Wear">Bottom Wear</option>
                  <option value="Footwear">Footwear</option>
                  <option value="Accessories">Accessories</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Product Name <span style={{ color: '#FF4E5B' }}>*</span></label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
                <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g., Legging" className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Product Code <span style={{ color: '#FF4E5B' }}>*</span></label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
                <input type="text" value={productCode} onChange={(e) => setProductCode(e.target.value)} placeholder="Internal short code" className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Product Description</label>
              <div className="relative">
                <Info className="absolute left-3 top-3 w-4 h-4" style={{ color: '#6E7A82' }} />
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed info (optional)" rows={4} className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF', resize: 'vertical' }} />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>HSN Code</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
                <select value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
                  <option value="">Tax classification (optional)</option>
                  <option value="6109">6109 (T-Shirts)</option>
                  <option value="6115">6115 (Leggings)</option>
                  <option value="6201">6201 (Jackets)</option>
                  <option value="6203">6203 (Trousers)</option>
                  <option value="6212">6212 (Bras)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Status <span style={{ color: '#FF4E5B' }}>*</span></label>
              <div className="relative">
                <Info className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </MasterFormPage>
    );
  }

  return (
    <div className="p-8" style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
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
            <h1 className="text-3xl" style={{ color: '#0A0F14' }}>Product Master</h1>
            <p style={{ color: '#6E7A82' }}>Dummy product data for now.</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-colors"
          style={{ backgroundColor: '#00A9B7' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
        >
          <Plus className="w-5 h-5" />
          Add New
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl">
            {/* Modal Header */}
            <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: '#E1E6EA' }}>
              <h2 className="text-xl" style={{ color: '#0A0F14' }}>Add New Product Master</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: '#6E7A82' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-6">
                {/* Product ID */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                    Product ID
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
                    <input
                      type="text"
                      value={productId}
                      onChange={(e) => setProductId(e.target.value)}
                      placeholder="PROD-NEW"
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
                      }}
                    />
                  </div>
                </div>

                {/* Catalogue */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                    Catalogue *
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
                    <select
                      value={catalogue}
                      onChange={(e) => setCatalogue(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
                      }}
                    >
                      <option value="">Select catalogue</option>
                      <option value="Top Wear">Top Wear</option>
                      <option value="Bottom Wear">Bottom Wear</option>
                      <option value="Footwear">Footwear</option>
                      <option value="Accessories">Accessories</option>
                    </select>
                  </div>
                </div>

                {/* Product Name */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                    Product Name *
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
                    <input
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="e.g., Legging"
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
                      }}
                    />
                  </div>
                </div>

                {/* Product Code */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                    Product Code *
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
                    <input
                      type="text"
                      value={productCode}
                      onChange={(e) => setProductCode(e.target.value)}
                      placeholder="Internal short code"
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
                      }}
                    />
                  </div>
                </div>

                {/* Product Description */}
                <div className="col-span-2">
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                    Product Description
                  </label>
                  <div className="relative">
                    <Info className="absolute left-3 top-3 w-4 h-4" style={{ color: '#6E7A82' }} />
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detailed info (optional)"
                      rows={3}
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
                      }}
                    />
                  </div>
                </div>

                {/* HSN Code */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                    HSN Code
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
                    <select
                      value={hsnCode}
                      onChange={(e) => setHsnCode(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
                      }}
                    >
                      <option value="">Tax classification (optional)</option>
                      <option value="6109">6109 (T-Shirts)</option>
                      <option value="6115">6115 (Leggings)</option>
                      <option value="6201">6201 (Jackets)</option>
                      <option value="6203">6203 (Trousers)</option>
                      <option value="6212">6212 (Bras)</option>
                    </select>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                    Status *
                  </label>
                  <div className="relative">
                    <Info className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
                      }}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Audit Info */}
              <div className="pt-4" style={{ borderTop: '1px solid #E1E6EA' }}>
                <p className="text-sm" style={{ color: '#6E7A82' }}>
                  Created by: Admin (auto)
                  <span className="float-right">Audit info will come from backend.</span>
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t px-6 py-4 flex justify-end gap-3" style={{ borderColor: '#E1E6EA' }}>
              <button
                onClick={() => setShowForm(false)}
                className="px-6 py-2 rounded-lg transition-colors"
                style={{
                  border: '1px solid #E1E6EA',
                  color: '#6E7A82',
                  backgroundColor: 'white'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2 rounded-lg text-white transition-colors"
                style={{ backgroundColor: '#00A9B7' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products List */}
      <div className="bg-white rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: '#F6F9FC' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>
                  PRODUCT ID
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>
                  PRODUCT NAME
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>
                  CODE
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>
                  CATEGORY
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>
                  DESCRIPTION
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>
                  STATUS
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, index) => (
                <tr
                  key={product.id}
                  style={{
                    borderTop: index === 0 ? 'none' : '1px solid #E1E6EA'
                  }}
                >
                  <td className="px-6 py-4" style={{ color: '#0A0F14' }}>
                    {product.productId}
                  </td>
                  <td className="px-6 py-4" style={{ color: '#0A0F14' }}>
                    {product.productName}
                  </td>
                  <td className="px-6 py-4" style={{ color: '#6E7A82' }}>
                    {product.productCode}
                  </td>
                  <td className="px-6 py-4" style={{ color: '#6E7A82' }}>
                    {product.category}
                  </td>
                  <td className="px-6 py-4" style={{ color: '#6E7A82' }}>
                    {product.description}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-sm"
                      style={{
                        backgroundColor: product.status === 'Active' ? '#E8F7F8' : '#FFE8EA',
                        color: product.status === 'Active' ? '#00A9B7' : '#FF4E5B'
                      }}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: '#FF4E5B' }}
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
