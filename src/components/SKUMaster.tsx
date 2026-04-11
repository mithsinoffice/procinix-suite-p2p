import { ArrowLeft, Plus, Trash2, X, Hash, FileText, Palette, Ruler, Barcode, Tag, Calendar, Circle, Upload, ListFilter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo, useCallback } from 'react';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { FormShell, FormSection, PxFormField, CheckCard, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';

interface SKU {
  id: string;
  skuCode: string;
  product: string;
  size: string;
  color: string;
  status: string;
  approvalStatus?: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
}

interface ColorOption {
  id: string;
  name: string;
  code: string;
}

interface SizeOption {
  id: string;
  name: string;
  code: string;
}

export function SKUMaster() {
  const navigate = useNavigate();
  const [skus, setSKUs] = useIncrementalMasterRecords<SKU>('sku_master', [
    { id: '1', skuCode: '399003102', product: 'Ultimate Leggings', size: 'M', color: 'White', status: 'Active' },
    { id: '2', skuCode: '399004101', product: 'Ultimate Leggings', size: 'L', color: 'Black', status: 'Inactive' },
    { id: '3', skuCode: '414002103', product: 'Flair Pants', size: 'S', color: 'Navy Blue', status: 'Active' },
    { id: '4', skuCode: '414003105', product: 'Flair Pants', size: 'M', color: 'Olive Green', status: 'Inactive' },
    { id: '5', skuCode: '502001102', product: 'Sports Bra', size: 'XS', color: 'White', status: 'Active' },
    { id: '6', skuCode: '502004104', product: 'Sports Bra', size: 'L', color: 'Maroon', status: 'Inactive' },
    { id: '7', skuCode: '667003101', product: 'Sports T-Shirt', size: 'M', color: 'Black', status: 'Active' },
    { id: '8', skuCode: '667006102', product: 'Sports T-Shirt', size: 'XXL', color: 'White', status: 'Inactive' },
    { id: '9', skuCode: '812004103', product: 'Running Jacket', size: 'L', color: 'Navy Blue', status: 'Active' },
    { id: '10', skuCode: '812005105', product: 'Running Jacket', size: 'XL', color: 'Olive Green', status: 'Inactive' }
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showVariationGenerator, setShowVariationGenerator] = useState(false);

  // Add Form State
  const [skuId, setSKUId] = useState('');
  const [skuName, setSKUName] = useState('');
  const [catalogue, setCatalogue] = useState('');
  const [product, setProduct] = useState('');
  const [colorCode, setColorCode] = useState('');
  const [sizeCode, setSizeCode] = useState('');
  const [finalSKUCode, setFinalSKUCode] = useState('');
  const [barcodeNumber, setBarcodeNumber] = useState('');
  const [styleCode, setStyleCode] = useState('');
  const [season, setSeason] = useState('');
  const [status, setStatus] = useState('Active');

  // Variation Generator State
  const [parentItemCode, setParentItemCode] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [previewSKUs, setPreviewSKUs] = useState<SKU[]>([]);
  const [selectedPreviewSKUs, setSelectedPreviewSKUs] = useState<string[]>([]);

  const colorOptions: ColorOption[] = [
    { id: '101', name: 'Black', code: '101' },
    { id: '102', name: 'White', code: '102' },
    { id: '103', name: 'Navy Blue', code: '103' },
    { id: '104', name: 'Maroon', code: '104' },
    { id: '105', name: 'Olive Green', code: '105' }
  ];

  const sizeOptions: SizeOption[] = [
    { id: '001', name: 'XS', code: '001' },
    { id: '002', name: 'S', code: '002' },
    { id: '003', name: 'M', code: '003' },
    { id: '004', name: 'L', code: '004' },
    { id: '005', name: 'XL', code: '005' },
    { id: '006', name: 'XXL', code: '006' }
  ];

  const handleColorToggle = (colorId: string) => {
    if (selectedColors.includes(colorId)) {
      setSelectedColors(selectedColors.filter(id => id !== colorId));
    } else {
      setSelectedColors([...selectedColors, colorId]);
    }
  };

  const handleSizeToggle = (sizeId: string) => {
    if (selectedSizes.includes(sizeId)) {
      setSelectedSizes(selectedSizes.filter(id => id !== sizeId));
    } else {
      setSelectedSizes([...selectedSizes, sizeId]);
    }
  };

  const handleSubmit = (approvalStatus: NonNullable<SKU['approvalStatus']> = 'Pending Approval') => {
    const newSKU: SKU = {
      id: Date.now().toString(),
      skuCode: finalSKUCode || 'SKU-NEW',
      product: product || 'New Product',
      size: sizeCode || 'M',
      color: colorCode || 'Black',
      status,
      approvalStatus
    };
    setSKUs([...skus, newSKU]);
    setShowAddForm(false);
    resetAddForm();
  };

  const resetAddForm = () => {
    setSKUId('');
    setSKUName('');
    setCatalogue('');
    setProduct('');
    setColorCode('');
    setSizeCode('');
    setFinalSKUCode('');
    setBarcodeNumber('');
    setStyleCode('');
    setSeason('');
    setStatus('Active');
  };

  const handleGenerateCombinations = () => {
    // Validate inputs
    if (!selectedProduct) {
      alert('Please select a product first');
      return;
    }
    if (selectedColors.length === 0 || selectedSizes.length === 0) {
      alert('Please select at least one color and one size');
      return;
    }

    // Generate all combinations for preview
    const newSKUs: SKU[] = [];
    const parentCode = parentItemCode || '999'; // Default parent code if not provided

    selectedSizes.forEach((sizeId) => {
      const sizeOption = sizeOptions.find(s => s.id === sizeId);
      selectedColors.forEach((colorId) => {
        const colorOption = colorOptions.find(c => c.id === colorId);
        
        if (sizeOption && colorOption) {
          // Generate SKU code: ParentCode + SizeCode + ColorCode
          const generatedSKUCode = `${parentCode}${sizeOption.code}${colorOption.code}`;
          
          const newSKU: SKU = {
            id: `preview-${sizeId}-${colorId}`,
            skuCode: generatedSKUCode,
            product: selectedProduct,
            size: sizeOption.name,
            color: colorOption.name,
            status: 'Active'
          };
          
          newSKUs.push(newSKU);
        }
      });
    });

    // Set preview SKUs and select all by default
    setPreviewSKUs(newSKUs);
    setSelectedPreviewSKUs(newSKUs.map(sku => sku.id));
  };

  const handlePreviewToggle = (skuId: string) => {
    if (selectedPreviewSKUs.includes(skuId)) {
      setSelectedPreviewSKUs(selectedPreviewSKUs.filter(id => id !== skuId));
    } else {
      setSelectedPreviewSKUs([...selectedPreviewSKUs, skuId]);
    }
  };

  const handleSelectAllPreview = () => {
    if (selectedPreviewSKUs.length === previewSKUs.length) {
      setSelectedPreviewSKUs([]);
    } else {
      setSelectedPreviewSKUs(previewSKUs.map(sku => sku.id));
    }
  };

  const handleConfirmGeneration = () => {
    // Filter only selected SKUs
    const selectedSKUs = previewSKUs.filter(sku => selectedPreviewSKUs.includes(sku.id));
    
    if (selectedSKUs.length === 0) {
      alert('Please select at least one SKU to generate');
      return;
    }

    // Add selected SKUs to the main list with new IDs
    const finalSKUs = selectedSKUs.map(sku => ({
      ...sku,
      id: `${Date.now()}-${Math.random()}`
    }));
    
    setSKUs([...skus, ...finalSKUs]);
    
    // Reset and close
    setShowVariationGenerator(false);
    setParentItemCode('');
    setSelectedProduct('');
    setSelectedColors([]);
    setSelectedSizes([]);
    setPreviewSKUs([]);
    setSelectedPreviewSKUs([]);
    
    // Show success message
    alert(`Successfully generated ${finalSKUs.length} SKU(s)!`);
  };

  const handleDelete = (id: string) => {
    setSKUs(skus.filter(sku => sku.id !== id));
  };

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const completeness = useMemo(() => {
    const fields = [skuName, catalogue, product, colorCode, sizeCode, status];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [skuName, catalogue, product, colorCode, sizeCode, status]);

  const handleSaveDraft = useCallback(() => {
    setSaveStatus('saving');
    handleSubmit('Draft');
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  }, [handleSubmit]);

  useFormKeyboardSave(handleSaveDraft);

  if (showAddForm) {
    return (
      <FormShell
        title="Create SKU"
        subtitle="Define a sellable stock keeping unit with product, color, size, and code mappings"
        modeLabel="Create Master Record"
        draftStatus="New"
        completeness={completeness}
        onBack={() => setShowAddForm(false)}
        onCancel={() => {
          setShowAddForm(false);
          resetAddForm();
        }}
        onSaveDraft={handleSaveDraft}
        onSubmit={() => handleSubmit('Pending Approval')}
        submitLabel="Submit"
        draftLabel="Save Draft"
        saveStatus={saveStatus}
      >
        <FormSection title="SKU Details" columns={3}>
          <PxFormField label="SKU ID" filled={!!skuId.trim()}>
            <input type="text" value={skuId} onChange={(e) => setSKUId(e.target.value)} placeholder="SKU-NEW" className="px-input" />
          </PxFormField>
          <PxFormField label="SKU Name" required filled={!!skuName.trim()}>
            <input type="text" value={skuName} onChange={(e) => setSKUName(e.target.value)} placeholder="e.g., Legging - Black - XL" className="px-input" />
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
          <PxFormField label="Product" required filled={!!product}>
            <select value={product} onChange={(e) => setProduct(e.target.value)} className="px-select">
              <option value="">Select product</option>
              <option value="Ultimate Leggings">Ultimate Leggings</option>
              <option value="Flair Pants">Flair Pants</option>
              <option value="Sports Bra">Sports Bra</option>
              <option value="Sports T-Shirt">Sports T-Shirt</option>
              <option value="Running Jacket">Running Jacket</option>
            </select>
          </PxFormField>
          <PxFormField label="Color Code" required filled={!!colorCode}>
            <select value={colorCode} onChange={(e) => setColorCode(e.target.value)} className="px-select">
              <option value="">Select color</option>
              <option value="Black">Black (101)</option>
              <option value="White">White (102)</option>
              <option value="Navy Blue">Navy Blue (103)</option>
              <option value="Maroon">Maroon (104)</option>
              <option value="Olive Green">Olive Green (105)</option>
            </select>
          </PxFormField>
          <PxFormField label="Size Code" required filled={!!sizeCode}>
            <select value={sizeCode} onChange={(e) => setSizeCode(e.target.value)} className="px-select">
              <option value="">Select size</option>
              <option value="XS">XS (001)</option>
              <option value="S">S (002)</option>
              <option value="M">M (003)</option>
              <option value="L">L (004)</option>
              <option value="XL">XL (005)</option>
              <option value="XXL">XXL (006)</option>
            </select>
          </PxFormField>
          <PxFormField label="Final SKU Code" filled={!!finalSKUCode.trim()}>
            <input type="text" value={finalSKUCode} onChange={(e) => setFinalSKUCode(e.target.value)} placeholder="auto on save" className="px-input" />
          </PxFormField>
          <PxFormField label="Barcode Number" filled={!!barcodeNumber.trim()}>
            <input type="text" value={barcodeNumber} onChange={(e) => setBarcodeNumber(e.target.value)} placeholder="Optional" className="px-input" />
          </PxFormField>
          <PxFormField label="Style Code" filled={!!styleCode.trim()}>
            <input type="text" value={styleCode} onChange={(e) => setStyleCode(e.target.value)} placeholder="Optional" className="px-input" />
          </PxFormField>
          <PxFormField label="Season" filled={!!season.trim()}>
            <input type="text" value={season} onChange={(e) => setSeason(e.target.value)} placeholder="e.g., SS24, FW25" className="px-input" />
          </PxFormField>
          <PxFormField label="Status" required filled={!!status}>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-select">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </PxFormField>
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
            <h1 className="text-3xl" style={{ color: 'var(--color-ink)' }}>SKU Master</h1>
            <p style={{ color: 'var(--color-mercury-grey)' }}>Dummy SKU data</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{ 
              border: '1px solid var(--color-silver)',
              color: 'var(--color-mercury-grey)',
              backgroundColor: 'white'
            }}
          >
            <ListFilter className="w-4 h-4" />
            Audit Trail
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
            style={{ backgroundColor: 'var(--color-teal)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
          >
            <Plus className="w-4 h-4" />
            Add New
          </button>
          <button
            onClick={() => setShowVariationGenerator(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
            style={{ backgroundColor: 'var(--color-teal)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
          >
            <Plus className="w-4 h-4" />
            Add SKU
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{ 
              border: '1px solid var(--color-silver)',
              color: 'var(--color-mercury-grey)',
              backgroundColor: 'white'
            }}
          >
            <Upload className="w-4 h-4" />
            Import Excel
          </button>
        </div>
      </div>

      {/* Add New SKU Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: 'var(--color-silver)' }}>
              <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>Add New SKU Master</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--color-mercury-grey)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="grid grid-cols-3 gap-6">
                {/* SKU ID */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    SKU ID
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                    <input
                      type="text"
                      value={skuId}
                      onChange={(e) => setSKUId(e.target.value)}
                      placeholder="SKU-NEW"
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    />
                  </div>
                </div>

                {/* SKU Name */}
                <div className="col-span-2">
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    SKU Name *
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                    <input
                      type="text"
                      value={skuName}
                      onChange={(e) => setSKUName(e.target.value)}
                      placeholder="e.g., 'Legging - Black - XL'"
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    />
                  </div>
                </div>

                {/* Catalogue */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    Catalogue *
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                    <select
                      value={catalogue}
                      onChange={(e) => setCatalogue(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: catalogue ? 'var(--color-ink)' : 'var(--color-mercury-grey)'
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

                {/* Product */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    Product *
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                    <select
                      value={product}
                      onChange={(e) => setProduct(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: product ? 'var(--color-ink)' : 'var(--color-mercury-grey)'
                      }}
                    >
                      <option value="">Select product</option>
                      <option value="Ultimate Leggings">Ultimate Leggings</option>
                      <option value="Flair Pants">Flair Pants</option>
                      <option value="Sports Bra">Sports Bra</option>
                      <option value="Sports T-Shirt">Sports T-Shirt</option>
                      <option value="Running Jacket">Running Jacket</option>
                    </select>
                  </div>
                </div>

                {/* Color Code */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    Color Code *
                  </label>
                  <div className="relative">
                    <Palette className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                    <select
                      value={colorCode}
                      onChange={(e) => setColorCode(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: colorCode ? 'var(--color-ink)' : 'var(--color-mercury-grey)'
                      }}
                    >
                      <option value="">Select color</option>
                      <option value="Black">Black (101)</option>
                      <option value="White">White (102)</option>
                      <option value="Navy Blue">Navy Blue (103)</option>
                      <option value="Maroon">Maroon (104)</option>
                      <option value="Olive Green">Olive Green (105)</option>
                    </select>
                  </div>
                </div>

                {/* Size Code */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    Size Code *
                  </label>
                  <div className="relative">
                    <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                    <select
                      value={sizeCode}
                      onChange={(e) => setSizeCode(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: sizeCode ? 'var(--color-ink)' : 'var(--color-mercury-grey)'
                      }}
                    >
                      <option value="">Select size</option>
                      <option value="XS">XS (001)</option>
                      <option value="S">S (002)</option>
                      <option value="M">M (003)</option>
                      <option value="L">L (004)</option>
                      <option value="XL">XL (005)</option>
                      <option value="XXL">XXL (006)</option>
                    </select>
                  </div>
                </div>

                {/* Final SKU Code */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    Final SKU Code
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                    <input
                      type="text"
                      value={finalSKUCode}
                      onChange={(e) => setFinalSKUCode(e.target.value)}
                      placeholder="auto on save"
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    />
                  </div>
                </div>

                {/* Barcode Number */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    Barcode Number
                  </label>
                  <div className="relative">
                    <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                    <input
                      type="text"
                      value={barcodeNumber}
                      onChange={(e) => setBarcodeNumber(e.target.value)}
                      placeholder="Optional"
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    />
                  </div>
                </div>

                {/* Style Code */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    Style Code
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                    <input
                      type="text"
                      value={styleCode}
                      onChange={(e) => setStyleCode(e.target.value)}
                      placeholder="Optional"
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    />
                  </div>
                </div>

                {/* Season */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    Season
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                    <input
                      type="text"
                      value={season}
                      onChange={(e) => setSeason(e.target.value)}
                      placeholder="e.g., SS24, FW25"
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    Status *
                  </label>
                  <div className="relative">
                    <Circle className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="col-span-3 pt-4" style={{ borderTop: '1px solid var(--color-silver)' }}>
                  <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    Created / Updated by: Admin (auto)
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3" style={{ borderColor: 'var(--color-silver)' }}>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-6 py-2 rounded-lg transition-colors"
                style={{
                  border: '1px solid var(--color-silver)',
                  color: 'var(--color-mercury-grey)',
                  backgroundColor: 'white'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2 rounded-lg text-white transition-colors"
                style={{ backgroundColor: '#007D87' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6D28D9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SKU Variation Generator Modal */}
      {showVariationGenerator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--color-silver)' }}>
              <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>SKU Variation Generator</h2>
              <button
                onClick={() => setShowVariationGenerator(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--color-mercury-grey)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-6">
                {/* Parent Item Code */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    Parent Item Code
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                    <input
                      type="text"
                      value={parentItemCode}
                      onChange={(e) => setParentItemCode(e.target.value)}
                      placeholder="e.g., 399"
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    />
                  </div>
                </div>

                {/* Select Product */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    Select Product
                  </label>
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg"
                    style={{
                      border: '1px solid var(--color-silver)',
                      color: selectedProduct ? 'var(--color-ink)' : 'var(--color-mercury-grey)'
                    }}
                  >
                    <option value="">-- Select Product --</option>
                    <option value="Ultimate Leggings">Ultimate Leggings</option>
                    <option value="Flair Pants">Flair Pants</option>
                    <option value="Sports Bra">Sports Bra</option>
                    <option value="Sports T-Shirt">Sports T-Shirt</option>
                    <option value="Running Jacket">Running Jacket</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Variation 1: Color Options */}
                <div>
                  <label className="block text-sm mb-3" style={{ color: 'var(--color-ink)' }}>
                    Variation 1: Color Options
                  </label>
                  <div className="space-y-2">
                    {colorOptions.map((color) => (
                      <label key={color.id} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedColors.includes(color.id)}
                          onChange={() => handleColorToggle(color.id)}
                          className="w-4 h-4 rounded"
                          style={{ accentColor: '#007D87' }}
                        />
                        <span style={{ color: 'var(--color-ink)' }}>
                          {color.name} ({color.code})
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-sm mt-3" style={{ color: 'var(--color-mercury-grey)' }}>
                    Selected colors: {selectedColors.length}
                  </p>
                </div>

                {/* Variation 2: Size Options */}
                <div>
                  <label className="block text-sm mb-3" style={{ color: 'var(--color-ink)' }}>
                    Variation 2: Size Options
                  </label>
                  <div className="space-y-2">
                    {sizeOptions.map((size) => (
                      <label key={size.id} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedSizes.includes(size.id)}
                          onChange={() => handleSizeToggle(size.id)}
                          className="w-4 h-4 rounded"
                          style={{ accentColor: '#007D87' }}
                        />
                        <span style={{ color: 'var(--color-ink)' }}>
                          {size.name} ({size.code})
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-sm mt-3" style={{ color: 'var(--color-mercury-grey)' }}>
                    Selected sizes: {selectedSizes.length}
                  </p>
                </div>
              </div>

              {/* Preview Section */}
              {previewSKUs.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg" style={{ color: 'var(--color-ink)' }}>Preview SKUs</h3>
                    <button
                      onClick={handleSelectAllPreview}
                      className="text-sm text-blue-500 cursor-pointer"
                    >
                      {selectedPreviewSKUs.length === previewSKUs.length ? 'Unselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto p-4 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)', border: '1px solid var(--color-silver)' }}>
                    {previewSKUs.map(sku => (
                      <div key={sku.id} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedPreviewSKUs.includes(sku.id)}
                          onChange={() => handlePreviewToggle(sku.id)}
                          className="w-4 h-4 rounded"
                          style={{ accentColor: '#007D87' }}
                        />
                        <span style={{ color: 'var(--color-ink)' }}>
                          {sku.skuCode} - {sku.product} - {sku.size} - {sku.color}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm mt-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    Selected: {selectedPreviewSKUs.length} of {previewSKUs.length} SKUs
                  </p>
                </div>
              )}

              {/* Warning Message */}
              {selectedColors.length === 0 || selectedSizes.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--color-error)' }}>
                  Select colors and sizes to see combinations
                </p>
              ) : null}
            </div>

            {/* Modal Footer - Fixed */}
            <div className="border-t px-6 py-4 flex justify-end gap-3 flex-shrink-0" style={{ borderColor: 'var(--color-silver)' }}>
              <button
                onClick={() => setShowVariationGenerator(false)}
                className="px-6 py-2 rounded-lg transition-colors"
                style={{
                  border: '1px solid var(--color-silver)',
                  color: 'var(--color-mercury-grey)',
                  backgroundColor: 'white'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateCombinations}
                disabled={selectedColors.length === 0 || selectedSizes.length === 0}
                className="px-6 py-2 rounded-lg text-white transition-colors"
                style={{ 
                  backgroundColor: (selectedColors.length === 0 || selectedSizes.length === 0) ? 'var(--color-silver)' : '#007D87',
                  cursor: (selectedColors.length === 0 || selectedSizes.length === 0) ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (selectedColors.length > 0 && selectedSizes.length > 0) {
                    e.currentTarget.style.backgroundColor = '#6D28D9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedColors.length > 0 && selectedSizes.length > 0) {
                    e.currentTarget.style.backgroundColor = '#007D87';
                  }
                }}
              >
                Generate Combinations
              </button>
              <button
                onClick={handleConfirmGeneration}
                disabled={selectedPreviewSKUs.length === 0}
                className="px-6 py-2 rounded-lg text-white transition-colors"
                style={{ 
                  backgroundColor: selectedPreviewSKUs.length === 0 ? 'var(--color-silver)' : '#007D87',
                  cursor: selectedPreviewSKUs.length === 0 ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (selectedPreviewSKUs.length > 0) {
                    e.currentTarget.style.backgroundColor = '#6D28D9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedPreviewSKUs.length > 0) {
                    e.currentTarget.style.backgroundColor = '#007D87';
                  }
                }}
              >
                Confirm Generation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SKU List Table */}
      <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  SKU
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  PRODUCT
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  SIZE
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  COLOR
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
              {skus.map((sku, index) => (
                <tr
                  key={sku.id}
                  style={{
                    borderTop: index === 0 ? 'none' : '1px solid var(--color-silver)'
                  }}
                >
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                    {sku.skuCode}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                    {sku.product}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    {sku.size}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    {sku.color}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-sm"
                      style={{
                        backgroundColor: sku.status === 'Active' ? 'var(--color-teal-tint)' : '#FFE8EA',
                        color: sku.status === 'Active' ? 'var(--color-teal)' : 'var(--color-error)'
                      }}
                    >
                      {sku.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDelete(sku.id)}
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
