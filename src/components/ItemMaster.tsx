import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit, Eye } from 'lucide-react';
import { MasterListToolbar } from './ui/MasterListToolbar';
import { MasterPageShell } from './ui/MasterPageShell';
import { ApprovalModal } from './ApprovalModal';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { FormShell, FormSection, PxFormField, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';
import { EntityGLMappingTable } from './shared/EntityGLMappingTable';
import type { EntityScopeMapping } from '../lib/masters/entityMapping';
import { mysqlApiRequest } from '../lib/mysql/client';

interface Item {
  id: string;
  itemCode: string;
  itemName: string;
  description: string;
  category: string;
  subCategory: string;
  hsnSacCode: string;
  uom: string;
  basePrice: string;
  currency: string;
  taxRate: string;
  taxType: string;
  brand: string;
  material: string;
  weight: string;
  dimensions: string;
  status: string;
  approvalStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  originalData?: Item;
  entityMappings?: EntityScopeMapping[];
}

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

export function ItemMaster() {
  const navigate = useNavigate();
  const [items, setItems] = useIncrementalMasterRecords<Item>('item_master', [
    {
      id: '1',
      itemCode: 'ITM-001',
      itemName: 'Arabica Green Beans',
      description: 'Premium single-origin Arabica green coffee beans from Chikmagalur estate',
      category: 'Raw Materials',
      subCategory: 'Coffee Beans',
      hsnSacCode: '0901',
      uom: 'KG',
      basePrice: '850',
      currency: 'INR',
      taxRate: '5',
      taxType: 'GST',
      brand: 'Subko',
      material: '',
      weight: '1',
      dimensions: '',
      status: 'Active',
      approvalStatus: 'Approved',
    },
    {
      id: '2',
      itemCode: 'ITM-002',
      itemName: 'Espresso Paper Cups 8oz',
      description: 'Double-wall insulated paper cups for hot beverages',
      category: 'Consumables',
      subCategory: 'Packaging',
      hsnSacCode: '4823',
      uom: 'PCS',
      basePrice: '4.50',
      currency: 'INR',
      taxRate: '18',
      taxType: 'GST',
      brand: '',
      material: 'Paper',
      weight: '0.02',
      dimensions: '8oz',
      status: 'Active',
      approvalStatus: 'Approved',
    },
    {
      id: '3',
      itemCode: 'ITM-003',
      itemName: 'Equipment Maintenance Service',
      description: 'Annual maintenance contract for espresso machines',
      category: 'Services',
      subCategory: 'Maintenance',
      hsnSacCode: '9987',
      uom: 'EA',
      basePrice: '25000',
      currency: 'INR',
      taxRate: '18',
      taxType: 'GST',
      brand: '',
      material: '',
      weight: '',
      dimensions: '',
      status: 'Active',
      approvalStatus: 'Approved',
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [hsnSacCode, setHsnSacCode] = useState('');
  const [uom, setUom] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [taxRate, setTaxRate] = useState('');
  const [taxType, setTaxType] = useState('');
  const [brand, setBrand] = useState('');
  const [material, setMaterial] = useState('');
  const [weight, setWeight] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [status, setStatus] = useState('Active');
  const [entityGLData, setEntityGLData] = useState<{ selectedEntityIds: string[]; glMappings: any[] }>({ selectedEntityIds: [], glMappings: [] });

  // Approval workflow state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<Item | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<string[]>([]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const haystack = [item.itemCode, item.itemName, item.category, item.description, item.brand].join(' ').toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(item.status);
      const matchesApproval = approvalFilter.length === 0 || approvalFilter.includes(item.approvalStatus);
      return matchesSearch && matchesStatus && matchesApproval;
    });
  }, [items, searchTerm, statusFilter, approvalFilter]);

  const handleSubmit = (approvalStatus: Item['approvalStatus'] = 'Pending Approval') => {
    const entityMappings: EntityScopeMapping[] = entityGLData.selectedEntityIds.map(eid => ({ entityId: eid }));
    const glMappings = entityGLData.glMappings;

    if (isEditMode && editingId) {
      const originalRecord = items.find(i => i.id === editingId);

      const updatedItem: Item = {
        id: editingId,
        itemCode, itemName, description, category, subCategory, hsnSacCode, uom,
        basePrice, currency, taxRate, taxType, brand, material, weight, dimensions,
        status, approvalStatus,
        originalData: originalRecord,
        entityMappings,
      };

      setItems(items.map(i => i.id === editingId ? updatedItem : i));

      // Save GL mappings for existing item
      if (glMappings.length > 0 && editingId) {
        mysqlApiRequest(`/items/${editingId}/gl-mappings`, {
          method: 'POST',
          body: JSON.stringify({ mappings: glMappings }),
        }).catch(err => console.warn('GL mapping save failed:', err));
      }
    } else {
      const newItemId = Date.now().toString();
      const newItem: Item = {
        id: newItemId,
        itemCode, itemName, description, category, subCategory, hsnSacCode, uom,
        basePrice, currency, taxRate, taxType, brand, material, weight, dimensions,
        status, approvalStatus,
        entityMappings,
      };
      setItems([...items, newItem]);

      // Save GL mappings for new item
      if (glMappings.length > 0) {
        mysqlApiRequest(`/items/${newItemId}/gl-mappings`, {
          method: 'POST',
          body: JSON.stringify({ mappings: glMappings }),
        }).catch(err => console.warn('GL mapping save failed:', err));
      }
    }

    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setItemCode('');
    setItemName('');
    setDescription('');
    setCategory('');
    setSubCategory('');
    setHsnSacCode('');
    setUom('');
    setBasePrice('');
    setCurrency('INR');
    setTaxRate('');
    setTaxType('');
    setBrand('');
    setMaterial('');
    setWeight('');
    setDimensions('');
    setStatus('Active');
    setEntityGLData({ selectedEntityIds: [], glMappings: [] });
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (item: Item) => {
    setIsEditMode(true);
    setEditingId(item.id);
    setItemCode(item.itemCode || '');
    setItemName(item.itemName || '');
    setDescription(item.description || '');
    setCategory(item.category || '');
    setSubCategory(item.subCategory || '');
    setHsnSacCode(item.hsnSacCode || '');
    setUom(item.uom || '');
    setBasePrice(item.basePrice || '');
    setCurrency(item.currency || 'INR');
    setTaxRate(item.taxRate || '');
    setTaxType(item.taxType || '');
    setBrand(item.brand || '');
    setMaterial(item.material || '');
    setWeight(item.weight || '');
    setDimensions(item.dimensions || '');
    setStatus(item.status || 'Active');
    // entityGLData is loaded by EntityGLMappingTable via itemId + initialEntityIds
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const item = items.find(i => i.id === id);

    if (item?.approvalStatus === 'Approved') {
      alert('Cannot delete approved/live records. You can only modify them through the approval workflow.');
      return;
    }

    setItems(items.filter(i => i.id !== id));
  };

  const handleReview = (item: Item) => {
    const changes: Change[] = [];

    if (item.originalData) {
      const original = item.originalData;
      const fieldMap: Array<[string, keyof Item]> = [
        ['Item Code', 'itemCode'],
        ['Item Name', 'itemName'],
        ['Description', 'description'],
        ['Category', 'category'],
        ['Sub Category', 'subCategory'],
        ['HSN/SAC Code', 'hsnSacCode'],
        ['UOM', 'uom'],
        ['Base Price', 'basePrice'],
        ['Currency', 'currency'],
        ['Tax Rate %', 'taxRate'],
        ['Tax Type', 'taxType'],
        ['Brand', 'brand'],
        ['Material', 'material'],
        ['Weight', 'weight'],
        ['Dimensions', 'dimensions'],
        ['Status', 'status'],
      ];

      for (const [label, key] of fieldMap) {
        if (original[key] !== item[key]) {
          changes.push({ field: label, oldValue: String(original[key] || ''), newValue: String(item[key] || '') });
        }
      }
    }

    setCurrentReviewRecord(item);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction('item_master', items, currentReviewRecord.id, 'approve');
      setItems(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction('item_master', items, currentReviewRecord.id, 'reject');
      setItems(nextRecords);
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
      const nextRecords = await applyMasterApprovalAction('item_master', items, currentReviewRecord.id, 'request_info', comments);
      setItems(nextRecords);
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
    const fields = [itemCode, itemName, category, hsnSacCode, uom, status];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [itemCode, itemName, category, hsnSacCode, uom, status]);

  const handleSaveDraft = useCallback(() => {
    setSaveStatus('saving');
    handleSubmit('Draft');
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  }, [handleSubmit]);

  useFormKeyboardSave(handleSaveDraft);

  if (showForm) {
    return (
      <FormShell masterName="Item Master"
        title={editingId ? 'Edit Item' : 'Create Item'}
        subtitle="Product and service catalog with approval workflow"
        modeLabel={editingId ? 'Edit Master Record' : 'Create Master Record'}
        draftStatus={editingId ? 'Draft' : 'New'}
        completeness={completeness}
        onBack={() => { setShowForm(false); resetForm(); }}
        onCancel={() => { setShowForm(false); resetForm(); }}
        onSaveDraft={handleSaveDraft}
        onSubmit={() => handleSubmit('Pending Approval')}
        submitLabel="Submit"
        draftLabel="Save Draft"
        saveStatus={saveStatus}
      >
        <FormSection title="Item Identification" columns={2}>
          <PxFormField label="Item Code" required filled={!!itemCode.trim()}>
            <input type="text" value={itemCode} onChange={(e) => setItemCode(e.target.value)} placeholder="e.g., ITM-001" className="px-input" />
          </PxFormField>
          <PxFormField label="Item Name" required filled={!!itemName.trim()}>
            <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g., Arabica Green Beans" className="px-input" />
          </PxFormField>
          <div style={{ gridColumn: 'span 2' }}>
            <PxFormField label="Description" filled={!!description.trim()}>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed item description" rows={3} className="px-input" />
            </PxFormField>
          </div>
        </FormSection>

        <FormSection title="Classification" columns={2}>
          <PxFormField label="Category" filled={!!category}>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-select">
              <option value="">Select Category</option>
              <option value="Raw Materials">Raw Materials</option>
              <option value="Consumables">Consumables</option>
              <option value="Capital Goods">Capital Goods</option>
              <option value="Services">Services</option>
              <option value="Office Supplies">Office Supplies</option>
              <option value="IT Equipment">IT Equipment</option>
            </select>
          </PxFormField>
          <PxFormField label="Sub Category" filled={!!subCategory.trim()}>
            <input type="text" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} placeholder="e.g., Coffee Beans" className="px-input" />
          </PxFormField>
          <PxFormField label="HSN/SAC Code" filled={!!hsnSacCode.trim()}>
            <input type="text" value={hsnSacCode} onChange={(e) => setHsnSacCode(e.target.value)} placeholder="e.g., 0901" className="px-input" />
          </PxFormField>
          <PxFormField label="UOM" filled={!!uom}>
            <select value={uom} onChange={(e) => setUom(e.target.value)} className="px-select">
              <option value="">Select UOM</option>
              <option value="EA">EA (Each)</option>
              <option value="PCS">PCS (Pieces)</option>
              <option value="BOX">BOX</option>
              <option value="KG">KG (Kilograms)</option>
              <option value="MTR">MTR (Meters)</option>
              <option value="LTR">LTR (Liters)</option>
            </select>
          </PxFormField>
        </FormSection>

        <FormSection title="Pricing & Tax" columns={2}>
          <PxFormField label="Base Price" filled={!!basePrice.trim()}>
            <input type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="0.00" min="0" step="0.01" className="px-input" />
          </PxFormField>
          <PxFormField label="Currency" filled={!!currency.trim()}>
            <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="INR" className="px-input" />
          </PxFormField>
          <PxFormField label="Tax Rate %" filled={!!taxRate.trim()}>
            <input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="e.g., 18" min="0" max="100" className="px-input" />
          </PxFormField>
          <PxFormField label="Tax Type" filled={!!taxType}>
            <select value={taxType} onChange={(e) => setTaxType(e.target.value)} className="px-select">
              <option value="">Select Tax Type</option>
              <option value="GST">GST</option>
              <option value="VAT">VAT</option>
              <option value="None">None</option>
            </select>
          </PxFormField>
        </FormSection>

        <FormSection title="Attributes" columns={2}>
          <PxFormField label="Brand" filled={!!brand.trim()}>
            <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g., Subko" className="px-input" />
          </PxFormField>
          <PxFormField label="Material" filled={!!material.trim()}>
            <input type="text" value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="e.g., Paper, Steel" className="px-input" />
          </PxFormField>
          <PxFormField label="Weight" filled={!!weight.trim()}>
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0.00" min="0" step="0.01" className="px-input" />
          </PxFormField>
          <PxFormField label="Dimensions" filled={!!dimensions.trim()}>
            <input type="text" value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="e.g., 10x20x5 cm" className="px-input" />
          </PxFormField>
        </FormSection>

        <FormSection title="Status" columns={2}>
          <PxFormField label="Status" required filled={!!status}>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-select">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </PxFormField>
        </FormSection>

        <FormSection title="Entity Mapping & GL Codes" columns={1}>
          <EntityGLMappingTable
            itemId={editingId}
            initialEntityIds={(items.find(i => i.id === editingId) as any)?.entityMappings?.map((m: any) => m.entityId) || []}
            initialGLMappings={[]}
            onChange={setEntityGLData}
          />
        </FormSection>
      </FormShell>
    );
  }

  return (
    <MasterPageShell masterName="Item Master" description="Manage items and materials">
      <div className="flex items-center justify-end mb-4">
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
          Add Item
        </button>
      </div>

      <MasterListToolbar
        masterName="Item Master"
        masterKey="item_master"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={[
          { key: 'status', label: 'Status', options: ['Active', 'Inactive'], selected: statusFilter },
          { key: 'approval', label: 'Approval', options: ['Draft', 'Pending Approval', 'Approved', 'Rejected'], selected: approvalFilter },
        ]}
        onFilterChange={(key, values) => {
          if (key === 'status') setStatusFilter(values);
          if (key === 'approval') setApprovalFilter(values);
        }}
        records={filteredItems}
        columns={[
          { key: 'itemCode', label: 'Item Code' },
          { key: 'itemName', label: 'Item Name' },
          { key: 'description', label: 'Description' },
          { key: 'category', label: 'Category' },
          { key: 'subCategory', label: 'Sub Category' },
          { key: 'hsnSacCode', label: 'HSN/SAC Code' },
          { key: 'uom', label: 'UOM' },
          { key: 'basePrice', label: 'Base Price' },
          { key: 'currency', label: 'Currency' },
          { key: 'taxRate', label: 'Tax Rate' },
          { key: 'taxType', label: 'Tax Type' },
          { key: 'brand', label: 'Brand' },
          { key: 'material', label: 'Material' },
          { key: 'weight', label: 'Weight' },
          { key: 'dimensions', label: 'Dimensions' },
          { key: 'status', label: 'Status' },
          { key: 'entityMappings', label: 'Entity Mappings' },
          { key: 'approvalStatus', label: 'Approval Status' },
        ]}
        totalCount={items.length}
        filteredCount={filteredItems.length}
      />

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        recordType="Item Master"
        recordId={currentReviewRecord?.itemCode || ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />

      <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Item Code</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Item Name</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Category</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>HSN/SAC</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>UOM</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Status</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Approval</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--color-silver)' }}>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{item.itemCode}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{item.itemName}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>{item.category}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>{item.hsnSacCode}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>{item.uom}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={{
                      backgroundColor: item.status === 'Active' ? 'var(--color-teal-tint)' : '#FFE8EA',
                      color: item.status === 'Active' ? 'var(--color-teal)' : 'var(--color-error)',
                    }}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={getStatusBadgeStyle(item.approvalStatus)}>
                      {item.approvalStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {item.approvalStatus === 'Pending Approval' && (
                        <button onClick={() => handleReview(item)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-teal)' }} title="Review Changes">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleEdit(item)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-mercury-grey)' }} title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded-lg transition-colors"
                        style={{
                          color: item.approvalStatus === 'Approved' ? '#C4C4C4' : 'var(--color-error)',
                          cursor: item.approvalStatus === 'Approved' ? 'not-allowed' : 'pointer',
                        }}
                        title={item.approvalStatus === 'Approved' ? 'Cannot delete approved records' : 'Delete'}
                        disabled={item.approvalStatus === 'Approved'}
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
