import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Edit, Eye, Trash2, Upload, Camera } from 'lucide-react';
import { isMysqlApiEnabled, mysqlApiRequest } from '../lib/mysql/client';
import { FormShell, FormSection, PxFormField, CheckCard, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';

interface Item {
  id: string;
  itemCode: string;
  itemName: string;
  itemAlias: string;
  itemStatus: string;
  itemDescription: string;
  uom: string;
  itemGroupMaster: string;
  procurementCategory: string;
  entityName: string;
  expenditureType: string;
  glAccountCode: string;
  glAccountDescription: string;
  nature: string;
  rcmApplicable: string;
  hsnCode: string;
  sacCode: string;
  gstRate: string;
  defaultITCEligibility: string;
  poRequired: string;
  reorderLevel: string;
  maxOrderQty: string;
  approvalStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  originalData?: Item;
  createdAt?: string;
  updatedAt?: string;
}

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

export function ItemMaster() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch items on component mount
  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      if (!isMysqlApiEnabled()) {
        throw new Error('Azure MySQL API is not configured');
      }

      const result = await mysqlApiRequest<{ success: boolean; data: Item[] }>('/items');
      if (result.success) {
        setItems(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch items');
      }
    } catch (err: any) {
      console.error('Error fetching items:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [changes, setChanges] = useState<Change[]>([]);

  // Form state - Section 1: Identification & Lifecycle
  const [itemImage, setItemImage] = useState<string>('');
  const [itemName, setItemName] = useState('');
  const [itemAlias, setItemAlias] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [itemStatus, setItemStatus] = useState('Active');
  const [itemDescription, setItemDescription] = useState('');
  const [uom, setUom] = useState('');

  // Form state - Section 2: Financial & Group Mapping
  const [itemGroupMaster, setItemGroupMaster] = useState('');
  const [procurementCategory, setProcurementCategory] = useState('');
  const [entityName, setEntityName] = useState('');
  const [expenditureType, setExpenditureType] = useState('');
  const [glAccountCode, setGlAccountCode] = useState('');
  const [glAccountDescription, setGlAccountDescription] = useState('');

  // Form state - Section 3: Compliance & Tax
  const [nature, setNature] = useState('Product');
  const [rcmApplicable, setRcmApplicable] = useState('No');
  const [hsnCode, setHsnCode] = useState('');
  const [sacCode, setSacCode] = useState('');
  const [gstRate, setGstRate] = useState('');
  const [defaultITCEligibility, setDefaultITCEligibility] = useState('');

  // Form state - Section 4: Procurement Policy & Controls
  const [poRequired, setPoRequired] = useState('No');
  const [reorderLevel, setReorderLevel] = useState('');
  const [maxOrderQty, setMaxOrderQty] = useState('');

  const handleSubmit = async (approvalStatus: Item['approvalStatus'] = 'Pending Approval') => {
    const newItem: Omit<Item, 'id' | 'createdAt' | 'updatedAt'> = {
      itemCode,
      itemName,
      itemAlias,
      itemStatus,
      itemDescription,
      uom,
      itemGroupMaster,
      procurementCategory,
      entityName,
      expenditureType,
      glAccountCode,
      glAccountDescription,
      nature,
      rcmApplicable,
      hsnCode,
      sacCode,
      gstRate,
      defaultITCEligibility,
      poRequired,
      reorderLevel,
      maxOrderQty,
      approvalStatus
    };
    
    try {
      if (!isMysqlApiEnabled()) {
        throw new Error('Azure MySQL API is not configured');
      }

      const result = await mysqlApiRequest<{ success: boolean; data: Item }>('/items', {
        method: 'POST',
        body: JSON.stringify(newItem)
      });
      if (result.success) {
        setItems([...items, result.data]);
        setShowForm(false);
        resetForm();
      } else {
        throw new Error(result.error || 'Failed to create item');
      }
    } catch (err: any) {
      console.error('Error creating item:', err);
      setError(err.message);
    }
  };

  const resetForm = () => {
    setItemImage('');
    setItemName('');
    setItemAlias('');
    setItemCode('');
    setItemStatus('Active');
    setItemDescription('');
    setUom('');
    setItemGroupMaster('');
    setProcurementCategory('');
    setEntityName('');
    setExpenditureType('');
    setGlAccountCode('');
    setGlAccountDescription('');
    setNature('Product');
    setRcmApplicable('No');
    setHsnCode('');
    setSacCode('');
    setGstRate('');
    setDefaultITCEligibility('');
    setPoRequired('No');
    setReorderLevel('');
    setMaxOrderQty('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }
    
    try {
      if (!isMysqlApiEnabled()) {
        throw new Error('Azure MySQL API is not configured');
      }

      await mysqlApiRequest<{ success: boolean }>(`/items/${id}`, {
        method: 'DELETE'
      });
      setItems(items.filter(item => item.id !== id));
    } catch (err: any) {
      console.error('Error deleting item:', err);
      alert(err.message);
    }
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setItemName(item.itemName);
    setItemAlias(item.itemAlias);
    setItemCode(item.itemCode);
    setItemStatus(item.itemStatus);
    setItemDescription(item.itemDescription);
    setUom(item.uom);
    setItemGroupMaster(item.itemGroupMaster);
    setProcurementCategory(item.procurementCategory);
    setEntityName(item.entityName);
    setExpenditureType(item.expenditureType);
    setGlAccountCode(item.glAccountCode);
    setGlAccountDescription(item.glAccountDescription);
    setNature(item.nature);
    setRcmApplicable(item.rcmApplicable);
    setHsnCode(item.hsnCode);
    setSacCode(item.sacCode);
    setGstRate(item.gstRate);
    setDefaultITCEligibility(item.defaultITCEligibility);
    setPoRequired(item.poRequired);
    setReorderLevel(item.reorderLevel);
    setMaxOrderQty(item.maxOrderQty);
    setShowForm(true);
  };

  const handleSaveEdit = async (approvalStatus: Item['approvalStatus'] = 'Pending Approval') => {
    if (editingItem) {
      const updatedItem = {
        itemName,
        itemAlias,
        itemCode,
        itemStatus,
        itemDescription,
        uom,
        itemGroupMaster,
        procurementCategory,
        entityName,
        expenditureType,
        glAccountCode,
        glAccountDescription,
        nature,
        rcmApplicable,
        hsnCode,
        sacCode,
        gstRate,
        defaultITCEligibility,
        poRequired,
        reorderLevel,
        maxOrderQty,
        approvalStatus,
        originalData: editingItem
      };
      
      try {
        if (!isMysqlApiEnabled()) {
          throw new Error('Azure MySQL API is not configured');
        }

        const result = await mysqlApiRequest<{ success: boolean; data: Item }>(`/items/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(updatedItem)
        });
        if (result.success) {
          setItems(items.map(item => (item.id === editingItem.id ? result.data : item)));
          setShowForm(false);
          setEditingItem(null);
          resetForm();
        } else {
          throw new Error(result.error || 'Failed to update item');
        }
      } catch (err: any) {
        console.error('Error updating item:', err);
        setError(err.message);
      }
    }
  };

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const completeness = useMemo(() => {
    const fields = [itemName, itemCode, uom, itemGroupMaster, procurementCategory, entityName, nature, gstRate, poRequired];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [itemName, itemCode, uom, itemGroupMaster, procurementCategory, entityName, nature, gstRate, poRequired]);

  const handleSaveDraft = useCallback(() => {
    setSaveStatus('saving');
    if (editingItem) {
      void handleSaveEdit('Draft');
    } else {
      void handleSubmit('Draft');
    }
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  }, [editingItem, handleSaveEdit, handleSubmit]);

  useFormKeyboardSave(handleSaveDraft);

  if (showForm) {
    return (
      <FormShell
        title={editingItem ? 'Edit Item' : 'Create Item'}
        subtitle="Product and service catalog"
        modeLabel={editingItem ? 'Edit Master Record' : 'Create Master Record'}
        draftStatus={editingItem ? 'Draft' : 'New'}
        completeness={completeness}
        onBack={() => {
          setShowForm(false);
          setEditingItem(null);
          resetForm();
        }}
        onCancel={() => {
          setShowForm(false);
          setEditingItem(null);
          resetForm();
        }}
        onSaveDraft={handleSaveDraft}
        onSubmit={() => {
          if (editingItem) {
            void handleSaveEdit('Pending Approval');
          } else {
            void handleSubmit('Pending Approval');
          }
        }}
        submitLabel="Submit"
        draftLabel="Save Draft"
        saveStatus={saveStatus}
      >
        <FormSection title="Identification & Lifecycle" columns={3}>
          <div className="flex flex-col items-center justify-center p-6 rounded-xl" style={{ border: '2px dashed var(--color-fog)', backgroundColor: '#FFFFFF' }}>
            <Upload className="w-8 h-8 mb-2" style={{ color: 'var(--color-mercury-grey)' }} />
            <p className="text-sm text-center mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Choose file No file chosen</p>
            <p className="text-xs text-center" style={{ color: 'var(--color-mercury-grey)' }}>Optional – Item image</p>
          </div>
          <PxFormField label="Item Name" required filled={!!itemName.trim()}>
            <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g., Facial Tissue Box (Standard)" className="px-input" />
          </PxFormField>
          <PxFormField label="Item Alias" filled={!!itemAlias.trim()}>
            <input type="text" value={itemAlias} onChange={(e) => setItemAlias(e.target.value)} placeholder="Tissue Box" className="px-input" />
          </PxFormField>
          <PxFormField label="Item Code" filled={!!itemCode.trim()}>
            <input type="text" value={itemCode} onChange={(e) => setItemCode(e.target.value)} placeholder="ITM-NEW" className="px-input" />
          </PxFormField>
          <PxFormField label="Item Status" filled={!!itemStatus}>
            <select value={itemStatus} onChange={(e) => setItemStatus(e.target.value)} className="px-select">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </PxFormField>
          <PxFormField label="Item Description" filled={!!itemDescription.trim()}>
            <textarea value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} placeholder="Standard white facial tissues, 2-ply, 100 count box." rows={3} className="px-input" />
          </PxFormField>
          <PxFormField label="Unit of Measurement (UOM)" filled={!!uom}>
            <select value={uom} onChange={(e) => setUom(e.target.value)} className="px-select">
              <option value="">Select UOM</option>
              <option value="EA (Each)">EA (Each)</option>
              <option value="PCS (Pieces)">PCS (Pieces)</option>
              <option value="BOX">BOX</option>
              <option value="KG (Kilograms)">KG (Kilograms)</option>
              <option value="MTR (Meters)">MTR (Meters)</option>
              <option value="LTR (Liters)">LTR (Liters)</option>
            </select>
          </PxFormField>
        </FormSection>

        <FormSection title="Financial & Group Mapping" columns={3}>
          <PxFormField label="Item Group Master" filled={!!itemGroupMaster}>
            <select value={itemGroupMaster} onChange={(e) => setItemGroupMaster(e.target.value)} className="px-select">
              <option value="">Select Group</option>
              <option value="House Keeping Items">House Keeping Items</option>
              <option value="Office Supplies">Office Supplies</option>
              <option value="IT Equipment">IT Equipment</option>
              <option value="Furniture">Furniture</option>
            </select>
          </PxFormField>
          <PxFormField label="Procurement Category" filled={!!procurementCategory}>
            <select value={procurementCategory} onChange={(e) => setProcurementCategory(e.target.value)} className="px-select">
              <option value="">Select Category</option>
              <option value="Consumables">Consumables</option>
              <option value="Capital Goods">Capital Goods</option>
              <option value="Services">Services</option>
              <option value="Raw Materials">Raw Materials</option>
            </select>
          </PxFormField>
          <PxFormField label="Entity Name (Legal)" filled={!!entityName}>
            <select value={entityName} onChange={(e) => setEntityName(e.target.value)} className="px-select">
              <option value="">Select Entity</option>
              <option value="India Pvt. Ltd.">India Pvt. Ltd.</option>
              <option value="Singapore Pte. Ltd.">Singapore Pte. Ltd.</option>
              <option value="USA Inc.">USA Inc.</option>
            </select>
          </PxFormField>
          <PxFormField label="Expenditure Type" filled={!!expenditureType}>
            <select value={expenditureType} onChange={(e) => setExpenditureType(e.target.value)} className="px-select">
              <option value="">Select Type</option>
              <option value="OpEx">OpEx</option>
              <option value="CapEx">CapEx</option>
            </select>
          </PxFormField>
          <PxFormField label="GL Account Code" filled={!!glAccountCode.trim()}>
            <input type="text" value={glAccountCode} onChange={(e) => setGlAccountCode(e.target.value)} placeholder="512001" className="px-input" />
          </PxFormField>
          <PxFormField label="GL Account Description" filled={!!glAccountDescription.trim()}>
            <input type="text" value={glAccountDescription} onChange={(e) => setGlAccountDescription(e.target.value)} placeholder="House Keeping Exp (IND)" className="px-input" />
          </PxFormField>
        </FormSection>

        <FormSection title="Compliance & Tax" columns={3}>
          <PxFormField label="Nature (Product/Service)" filled={!!nature}>
            <div className="flex gap-6 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="nature" value="Product" checked={nature === 'Product'} onChange={(e) => setNature(e.target.value)} style={{ accentColor: 'var(--color-teal)' }} />
                <span>Product</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="nature" value="Service" checked={nature === 'Service'} onChange={(e) => setNature(e.target.value)} style={{ accentColor: 'var(--color-teal)' }} />
                <span>Service</span>
              </label>
            </div>
          </PxFormField>
          <PxFormField label="RCM Applicable" filled={!!rcmApplicable}>
            <div className="flex gap-6 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="rcmApplicable" value="Yes" checked={rcmApplicable === 'Yes'} onChange={(e) => setRcmApplicable(e.target.value)} style={{ accentColor: 'var(--color-teal)' }} />
                <span>Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="rcmApplicable" value="No" checked={rcmApplicable === 'No'} onChange={(e) => setRcmApplicable(e.target.value)} style={{ accentColor: 'var(--color-teal)' }} />
                <span>No</span>
              </label>
            </div>
          </PxFormField>
          {nature === 'Product' ? (
            <PxFormField label="HSN Code (Goods)" filled={!!hsnCode}>
              <select value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} className="px-select">
                <option value="">Select HSN</option>
                <option value="9401 (18% - Chairs)">9401 (18% - Chairs)</option>
                <option value="6109 (12% - T-Shirts)">6109 (12% - T-Shirts)</option>
                <option value="6203 (12% - Trousers)">6203 (12% - Trousers)</option>
                <option value="8471 (18% - Computers)">8471 (18% - Computers)</option>
              </select>
            </PxFormField>
          ) : (
            <PxFormField label="SAC Code (Services)" filled={!!sacCode}>
              <select value={sacCode} onChange={(e) => setSacCode(e.target.value)} className="px-select">
                <option value="">Select SAC</option>
                <option value="9954 (18% - Cleaning Services)">9954 (18% - Cleaning Services)</option>
                <option value="9983 (18% - IT Services)">9983 (18% - IT Services)</option>
                <option value="9973 (18% - Consulting)">9973 (18% - Consulting)</option>
                <option value="9972 (18% - Legal Services)">9972 (18% - Legal Services)</option>
              </select>
            </PxFormField>
          )}
          <PxFormField label="GST Rate" filled={!!gstRate}>
            <select value={gstRate} onChange={(e) => setGstRate(e.target.value)} className="px-select">
              <option value="">Select Rate</option>
              <option value="0%">0%</option>
              <option value="5%">5%</option>
              <option value="12%">12%</option>
              <option value="18%">18%</option>
              <option value="28%">28%</option>
            </select>
          </PxFormField>
          <PxFormField label="Default ITC Eligibility (%)" filled={!!defaultITCEligibility}>
            <input type="number" value={defaultITCEligibility} onChange={(e) => setDefaultITCEligibility(e.target.value)} placeholder="100" min="0" max="100" className="px-input" />
          </PxFormField>
        </FormSection>

        <FormSection title="Procurement Policy & Controls" columns={3}>
          <PxFormField label="PO Required for this Item?" filled={!!poRequired}>
            <select value={poRequired} onChange={(e) => setPoRequired(e.target.value)} className="px-select">
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </PxFormField>
          <PxFormField label="Reorder Level" filled={!!reorderLevel.trim()}>
            <input type="text" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} placeholder="Optional" className="px-input" />
          </PxFormField>
          <PxFormField label="Max Order Qty" filled={!!maxOrderQty.trim()}>
            <input type="text" value={maxOrderQty} onChange={(e) => setMaxOrderQty(e.target.value)} placeholder="Optional" className="px-input" />
          </PxFormField>
        </FormSection>
      </FormShell>
    );
  }

  return (
    <div className="p-8" style={{ backgroundColor: 'var(--color-cloud)' }}>
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
            <h1 className="text-3xl" style={{ color: 'var(--color-ink)' }}>Item Master</h1>
            <p style={{ color: 'var(--color-mercury-grey)' }}>Product and service catalog</p>
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
          Add New Item Master
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: 'var(--color-silver)' }}>
              <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>Add New Item Master</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--color-mercury-grey)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-6 space-y-8">
              {/* Section 1: Identification & Lifecycle */}
              <div>
                <h3 className="text-lg mb-4" style={{ color: 'var(--color-ink)' }}>
                  1. Identification & Lifecycle
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  {/* Image Upload */}
                  <div className="flex flex-col items-center justify-center p-6 rounded-lg" style={{ border: '2px dashed var(--color-silver)' }}>
                    <Upload className="w-8 h-8 mb-2" style={{ color: 'var(--color-mercury-grey)' }} />
                    <p className="text-sm text-center mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Choose file No file chosen</p>
                    <p className="text-xs text-center" style={{ color: 'var(--color-mercury-grey)' }}>Optional – Item image</p>
                  </div>

                  {/* Item Name */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                      Item Name *
                    </label>
                    <input
                      type="text"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="e.g., Facial Tissue Box (Standard)"
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    />
                  </div>

                  {/* Item Alias */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                      Item Alias
                    </label>
                    <input
                      type="text"
                      value={itemAlias}
                      onChange={(e) => setItemAlias(e.target.value)}
                      placeholder="Tissue Box"
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    />
                  </div>

                  {/* Item Code */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                      Item Code
                    </label>
                    <input
                      type="text"
                      value={itemCode}
                      onChange={(e) => setItemCode(e.target.value)}
                      placeholder="ITM-NEW"
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    />
                  </div>

                  {/* Item Status */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                      Item Status
                    </label>
                    <select
                      value={itemStatus}
                      onChange={(e) => setItemStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  {/* Item Description */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                      Item Description
                    </label>
                    <textarea
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      placeholder="Standard white facial tissues, 2-ply, 100 count box."
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    />
                  </div>

                  {/* Unit of Measurement (UOM) */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                      Unit of Measurement (UOM)
                    </label>
                    <select
                      value={uom}
                      onChange={(e) => setUom(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    >
                      <option value="">Select UOM</option>
                      <option value="EA (Each)">EA (Each)</option>
                      <option value="PCS (Pieces)">PCS (Pieces)</option>
                      <option value="BOX">BOX</option>
                      <option value="KG (Kilograms)">KG (Kilograms)</option>
                      <option value="MTR (Meters)">MTR (Meters)</option>
                      <option value="LTR (Liters)">LTR (Liters)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Financial & Group Mapping */}
              <div>
                <h3 className="text-lg mb-4" style={{ color: 'var(--color-ink)' }}>
                  2. Financial & Group Mapping
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  {/* Item Group Master */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                      Item Group Master
                    </label>
                    <select
                      value={itemGroupMaster}
                      onChange={(e) => setItemGroupMaster(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    >
                      <option value="">Select Group</option>
                      <option value="House Keeping Items">House Keeping Items</option>
                      <option value="Office Supplies">Office Supplies</option>
                      <option value="IT Equipment">IT Equipment</option>
                      <option value="Furniture">Furniture</option>
                    </select>
                  </div>

                  {/* Procurement Category */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                      Procurement Category
                    </label>
                    <select
                      value={procurementCategory}
                      onChange={(e) => setProcurementCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    >
                      <option value="">Select Category</option>
                      <option value="Consumables">Consumables</option>
                      <option value="Capital Goods">Capital Goods</option>
                      <option value="Services">Services</option>
                      <option value="Raw Materials">Raw Materials</option>
                    </select>
                  </div>

                  {/* Entity Name (Legal) */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                      Entity Name (Legal)
                    </label>
                    <select
                      value={entityName}
                      onChange={(e) => setEntityName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    >
                      <option value="">Select Entity</option>
                      <option value="India Pvt. Ltd.">India Pvt. Ltd.</option>
                      <option value="Singapore Pte. Ltd.">Singapore Pte. Ltd.</option>
                      <option value="USA Inc.">USA Inc.</option>
                    </select>
                  </div>

                  {/* Expenditure Type */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                      Expenditure Type
                    </label>
                    <select
                      value={expenditureType}
                      onChange={(e) => setExpenditureType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    >
                      <option value="">Select Type</option>
                      <option value="OpEx">OpEx</option>
                      <option value="CapEx">CapEx</option>
                    </select>
                  </div>

                  {/* GL Account Code */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                      GL Account Code
                    </label>
                    <input
                      type="text"
                      value={glAccountCode}
                      onChange={(e) => setGlAccountCode(e.target.value)}
                      placeholder="512001"
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    />
                  </div>

                  {/* GL Account Description */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                      GL Account Description
                    </label>
                    <input
                      type="text"
                      value={glAccountDescription}
                      onChange={(e) => setGlAccountDescription(e.target.value)}
                      placeholder="House Keeping Exp (IND)"
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Compliance & Tax */}
              <div>
                <h3 className="text-lg mb-4" style={{ color: 'var(--color-ink)' }}>
                  3. Compliance & Tax
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  {/* Nature (Product/Service) */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                      Nature (Product/Service)
                    </label>
                    <div className="flex gap-6 mt-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="nature"
                          value="Product"
                          checked={nature === 'Product'}
                          onChange={(e) => setNature(e.target.value)}
                          style={{ accentColor: 'var(--color-teal)' }}
                        />
                        <span style={{ color: 'var(--color-ink)' }}>Product</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="nature"
                          value="Service"
                          checked={nature === 'Service'}
                          onChange={(e) => setNature(e.target.value)}
                          style={{ accentColor: 'var(--color-teal)' }}
                        />
                        <span style={{ color: 'var(--color-ink)' }}>Service</span>
                      </label>
                    </div>
                  </div>

                  {/* RCM Applicable */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                      RCM Applicable
                    </label>
                    <div className="flex gap-6 mt-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="rcmApplicable"
                          value="Yes"
                          checked={rcmApplicable === 'Yes'}
                          onChange={(e) => setRcmApplicable(e.target.value)}
                          style={{ accentColor: 'var(--color-teal)' }}
                        />
                        <span style={{ color: 'var(--color-ink)' }}>Yes</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="rcmApplicable"
                          value="No"
                          checked={rcmApplicable === 'No'}
                          onChange={(e) => setRcmApplicable(e.target.value)}
                          style={{ accentColor: 'var(--color-teal)' }}
                        />
                        <span style={{ color: 'var(--color-ink)' }}>No</span>
                      </label>
                    </div>
                  </div>

                  {/* Conditional: HSN Code for Product, SAC Code for Service */}
                  {nature === 'Product' ? (
                    <div>
                      <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                        HSN Code (Goods)
                      </label>
                      <select
                        value={hsnCode}
                        onChange={(e) => setHsnCode(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg"
                        style={{
                          border: '1px solid var(--color-silver)',
                          color: 'var(--color-ink)'
                        }}
                      >
                        <option value="">Select HSN</option>
                        <option value="9401 (18% - Chairs)">9401 (18% - Chairs)</option>
                        <option value="6109 (12% - T-Shirts)">6109 (12% - T-Shirts)</option>
                        <option value="6203 (12% - Trousers)">6203 (12% - Trousers)</option>
                        <option value="8471 (18% - Computers)">8471 (18% - Computers)</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                        SAC Code (Services)
                      </label>
                      <select
                        value={sacCode}
                        onChange={(e) => setSacCode(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg"
                        style={{
                          border: '1px solid var(--color-silver)',
                          color: 'var(--color-ink)'
                        }}
                      >
                        <option value="">Select SAC</option>
                        <option value="9954 (18% - Cleaning Services)">9954 (18% - Cleaning Services)</option>
                        <option value="9983 (18% - IT Services)">9983 (18% - IT Services)</option>
                        <option value="9973 (18% - Consulting)">9973 (18% - Consulting)</option>
                        <option value="9972 (18% - Legal Services)">9972 (18% - Legal Services)</option>
                      </select>
                    </div>
                  )}

                  {/* GST Rate */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                      GST Rate
                    </label>
                    <select
                      value={gstRate}
                      onChange={(e) => setGstRate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    >
                      <option value="">Select Rate</option>
                      <option value="0%">0%</option>
                      <option value="5%">5%</option>
                      <option value="12%">12%</option>
                      <option value="18%">18%</option>
                      <option value="28%">28%</option>
                    </select>
                  </div>

                  {/* Default ITC Eligibility (%) */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                      Default ITC Eligibility (%)
                    </label>
                    <input
                      type="number"
                      value={defaultITCEligibility}
                      onChange={(e) => setDefaultITCEligibility(e.target.value)}
                      placeholder="100"
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Procurement Policy & Controls */}
              <div>
                <h3 className="text-lg mb-4" style={{ color: 'var(--color-ink)' }}>
                  4. Procurement Policy & Controls
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  {/* PO Required for this Item? */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                      PO Required for this Item?
                    </label>
                    <select
                      value={poRequired}
                      onChange={(e) => setPoRequired(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>

                  {/* Reorder Level */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                      Reorder Level
                    </label>
                    <input
                      type="text"
                      value={reorderLevel}
                      onChange={(e) => setReorderLevel(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    />
                  </div>

                  {/* Max Order Qty */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                      Max Order Qty
                    </label>
                    <input
                      type="text"
                      value={maxOrderQty}
                      onChange={(e) => setMaxOrderQty(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3" style={{ borderColor: 'var(--color-silver)' }}>
              <button
                onClick={() => setShowForm(false)}
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
                onClick={editingItem ? handleSaveEdit : handleSubmit}
                className="px-6 py-2 rounded-lg text-white transition-colors"
                style={{ backgroundColor: 'var(--color-teal)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  Item Code
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  Item Name
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  Category
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  UOM
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  HSN Code
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={item.id}
                  style={{
                    borderTop: index === 0 ? 'none' : '1px solid var(--color-silver)'
                  }}
                >
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                    {item.itemCode}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                    {item.itemName}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    {item.procurementCategory}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    {item.uom}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    {item.hsnCode}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-sm"
                      style={{
                        backgroundColor: item.itemStatus === 'Active' ? 'var(--color-teal-tint)' : 'var(--color-cloud)',
                        color: item.itemStatus === 'Active' ? 'var(--color-teal)' : 'var(--color-mercury-grey)'
                      }}
                    >
                      {item.itemStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--color-error)' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--color-teal)' }}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/item/${item.id}`)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--color-teal)' }}
                    >
                      <Eye className="w-4 h-4" />
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
