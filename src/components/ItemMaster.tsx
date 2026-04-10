import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Edit, Eye, Trash2, Upload, Camera } from 'lucide-react';
import { isMysqlApiEnabled, mysqlApiRequest } from '../lib/mysql/client';
import { MasterFormPage } from './ui/MasterFormPage';

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

  if (showForm) {
    return (
      <MasterFormPage
        title={editingItem ? 'Edit Item' : 'Create Item'}
        subtitle="Product and service catalog"
        modeLabel={editingItem ? 'Edit Master Record' : 'Create Master Record'}
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
        onSaveDraft={() => {
          if (editingItem) {
            void handleSaveEdit('Draft');
          } else {
            void handleSubmit('Draft');
          }
        }}
        onSubmit={() => {
          if (editingItem) {
            void handleSaveEdit('Pending Approval');
          } else {
            void handleSubmit('Pending Approval');
          }
        }}
        submitLabel="Submit"
        draftLabel="Save Draft"
      >
        <div className="space-y-8">
          <div>
            <h3 className="text-lg mb-4" style={{ color: '#0A0F14' }}>1. Identification & Lifecycle</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center justify-center p-6 rounded-xl" style={{ border: '2px dashed #D7E3EA', backgroundColor: '#FFFFFF' }}>
                <Upload className="w-8 h-8 mb-2" style={{ color: '#6E7A82' }} />
                <p className="text-sm text-center mb-1" style={{ color: '#6E7A82' }}>Choose file No file chosen</p>
                <p className="text-xs text-center" style={{ color: '#6E7A82' }}>Optional – Item image</p>
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Item Name <span style={{ color: '#FF4E5B' }}>*</span></label>
                <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g., Facial Tissue Box (Standard)" className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Item Alias</label>
                <input type="text" value={itemAlias} onChange={(e) => setItemAlias(e.target.value)} placeholder="Tissue Box" className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Item Code</label>
                <input type="text" value={itemCode} onChange={(e) => setItemCode(e.target.value)} placeholder="ITM-NEW" className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Item Status</label>
                <select value={itemStatus} onChange={(e) => setItemStatus(e.target.value)} className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Item Description</label>
                <textarea value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} placeholder="Standard white facial tissues, 2-ply, 100 count box." rows={3} className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF', resize: 'vertical' }} />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Unit of Measurement (UOM)</label>
                <select value={uom} onChange={(e) => setUom(e.target.value)} className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
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

          <div>
            <h3 className="text-lg mb-4" style={{ color: '#0A0F14' }}>2. Financial & Group Mapping</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Item Group Master</label>
                <select value={itemGroupMaster} onChange={(e) => setItemGroupMaster(e.target.value)} className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
                  <option value="">Select Group</option>
                  <option value="House Keeping Items">House Keeping Items</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="IT Equipment">IT Equipment</option>
                  <option value="Furniture">Furniture</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Procurement Category</label>
                <select value={procurementCategory} onChange={(e) => setProcurementCategory(e.target.value)} className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
                  <option value="">Select Category</option>
                  <option value="Consumables">Consumables</option>
                  <option value="Capital Goods">Capital Goods</option>
                  <option value="Services">Services</option>
                  <option value="Raw Materials">Raw Materials</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Entity Name (Legal)</label>
                <select value={entityName} onChange={(e) => setEntityName(e.target.value)} className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
                  <option value="">Select Entity</option>
                  <option value="India Pvt. Ltd.">India Pvt. Ltd.</option>
                  <option value="Singapore Pte. Ltd.">Singapore Pte. Ltd.</option>
                  <option value="USA Inc.">USA Inc.</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Expenditure Type</label>
                <select value={expenditureType} onChange={(e) => setExpenditureType(e.target.value)} className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
                  <option value="">Select Type</option>
                  <option value="OpEx">OpEx</option>
                  <option value="CapEx">CapEx</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>GL Account Code</label>
                <input type="text" value={glAccountCode} onChange={(e) => setGlAccountCode(e.target.value)} placeholder="512001" className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>GL Account Description</label>
                <input type="text" value={glAccountDescription} onChange={(e) => setGlAccountDescription(e.target.value)} placeholder="House Keeping Exp (IND)" className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg mb-4" style={{ color: '#0A0F14' }}>3. Compliance & Tax</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Nature (Product/Service)</label>
                <div className="flex gap-6 mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="nature" value="Product" checked={nature === 'Product'} onChange={(e) => setNature(e.target.value)} style={{ accentColor: '#00A9B7' }} />
                    <span style={{ color: '#0A0F14' }}>Product</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="nature" value="Service" checked={nature === 'Service'} onChange={(e) => setNature(e.target.value)} style={{ accentColor: '#00A9B7' }} />
                    <span style={{ color: '#0A0F14' }}>Service</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>RCM Applicable</label>
                <div className="flex gap-6 mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="rcmApplicable" value="Yes" checked={rcmApplicable === 'Yes'} onChange={(e) => setRcmApplicable(e.target.value)} style={{ accentColor: '#00A9B7' }} />
                    <span style={{ color: '#0A0F14' }}>Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="rcmApplicable" value="No" checked={rcmApplicable === 'No'} onChange={(e) => setRcmApplicable(e.target.value)} style={{ accentColor: '#00A9B7' }} />
                    <span style={{ color: '#0A0F14' }}>No</span>
                  </label>
                </div>
              </div>
              {nature === 'Product' ? (
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>HSN Code (Goods)</label>
                  <select value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
                    <option value="">Select HSN</option>
                    <option value="9401 (18% - Chairs)">9401 (18% - Chairs)</option>
                    <option value="6109 (12% - T-Shirts)">6109 (12% - T-Shirts)</option>
                    <option value="6203 (12% - Trousers)">6203 (12% - Trousers)</option>
                    <option value="8471 (18% - Computers)">8471 (18% - Computers)</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>SAC Code (Services)</label>
                  <select value={sacCode} onChange={(e) => setSacCode(e.target.value)} className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
                    <option value="">Select SAC</option>
                    <option value="9954 (18% - Cleaning Services)">9954 (18% - Cleaning Services)</option>
                    <option value="9983 (18% - IT Services)">9983 (18% - IT Services)</option>
                    <option value="9973 (18% - Consulting)">9973 (18% - Consulting)</option>
                    <option value="9972 (18% - Legal Services)">9972 (18% - Legal Services)</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>GST Rate</label>
                <select value={gstRate} onChange={(e) => setGstRate(e.target.value)} className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
                  <option value="">Select Rate</option>
                  <option value="0%">0%</option>
                  <option value="5%">5%</option>
                  <option value="12%">12%</option>
                  <option value="18%">18%</option>
                  <option value="28%">28%</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Default ITC Eligibility (%)</label>
                <input type="number" value={defaultITCEligibility} onChange={(e) => setDefaultITCEligibility(e.target.value)} placeholder="100" min="0" max="100" className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg mb-4" style={{ color: '#0A0F14' }}>4. Procurement Policy & Controls</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>PO Required for this Item?</label>
                <select value={poRequired} onChange={(e) => setPoRequired(e.target.value)} className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Reorder Level</label>
                <input type="text" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} placeholder="Optional" className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Max Order Qty</label>
                <input type="text" value={maxOrderQty} onChange={(e) => setMaxOrderQty(e.target.value)} placeholder="Optional" className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
              </div>
            </div>
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
            <h1 className="text-3xl" style={{ color: '#0A0F14' }}>Item Master</h1>
            <p style={{ color: '#6E7A82' }}>Product and service catalog</p>
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
          Add New Item Master
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: '#E1E6EA' }}>
              <h2 className="text-xl" style={{ color: '#0A0F14' }}>Add New Item Master</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: '#6E7A82' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-6 space-y-8">
              {/* Section 1: Identification & Lifecycle */}
              <div>
                <h3 className="text-lg mb-4" style={{ color: '#0A0F14' }}>
                  1. Identification & Lifecycle
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  {/* Image Upload */}
                  <div className="flex flex-col items-center justify-center p-6 rounded-lg" style={{ border: '2px dashed #E1E6EA' }}>
                    <Upload className="w-8 h-8 mb-2" style={{ color: '#6E7A82' }} />
                    <p className="text-sm text-center mb-1" style={{ color: '#6E7A82' }}>Choose file No file chosen</p>
                    <p className="text-xs text-center" style={{ color: '#6E7A82' }}>Optional – Item image</p>
                  </div>

                  {/* Item Name */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                      Item Name *
                    </label>
                    <input
                      type="text"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="e.g., Facial Tissue Box (Standard)"
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
                      }}
                    />
                  </div>

                  {/* Item Alias */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                      Item Alias
                    </label>
                    <input
                      type="text"
                      value={itemAlias}
                      onChange={(e) => setItemAlias(e.target.value)}
                      placeholder="Tissue Box"
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
                      }}
                    />
                  </div>

                  {/* Item Code */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                      Item Code
                    </label>
                    <input
                      type="text"
                      value={itemCode}
                      onChange={(e) => setItemCode(e.target.value)}
                      placeholder="ITM-NEW"
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
                      }}
                    />
                  </div>

                  {/* Item Status */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                      Item Status
                    </label>
                    <select
                      value={itemStatus}
                      onChange={(e) => setItemStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
                      }}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  {/* Item Description */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                      Item Description
                    </label>
                    <textarea
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      placeholder="Standard white facial tissues, 2-ply, 100 count box."
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
                      }}
                    />
                  </div>

                  {/* Unit of Measurement (UOM) */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                      Unit of Measurement (UOM)
                    </label>
                    <select
                      value={uom}
                      onChange={(e) => setUom(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
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
                <h3 className="text-lg mb-4" style={{ color: '#0A0F14' }}>
                  2. Financial & Group Mapping
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  {/* Item Group Master */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                      Item Group Master
                    </label>
                    <select
                      value={itemGroupMaster}
                      onChange={(e) => setItemGroupMaster(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
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
                    <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                      Procurement Category
                    </label>
                    <select
                      value={procurementCategory}
                      onChange={(e) => setProcurementCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
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
                    <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                      Entity Name (Legal)
                    </label>
                    <select
                      value={entityName}
                      onChange={(e) => setEntityName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
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
                    <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                      Expenditure Type
                    </label>
                    <select
                      value={expenditureType}
                      onChange={(e) => setExpenditureType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
                      }}
                    >
                      <option value="">Select Type</option>
                      <option value="OpEx">OpEx</option>
                      <option value="CapEx">CapEx</option>
                    </select>
                  </div>

                  {/* GL Account Code */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                      GL Account Code
                    </label>
                    <input
                      type="text"
                      value={glAccountCode}
                      onChange={(e) => setGlAccountCode(e.target.value)}
                      placeholder="512001"
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
                      }}
                    />
                  </div>

                  {/* GL Account Description */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                      GL Account Description
                    </label>
                    <input
                      type="text"
                      value={glAccountDescription}
                      onChange={(e) => setGlAccountDescription(e.target.value)}
                      placeholder="House Keeping Exp (IND)"
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Compliance & Tax */}
              <div>
                <h3 className="text-lg mb-4" style={{ color: '#0A0F14' }}>
                  3. Compliance & Tax
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  {/* Nature (Product/Service) */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
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
                          style={{ accentColor: '#00A9B7' }}
                        />
                        <span style={{ color: '#0A0F14' }}>Product</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="nature"
                          value="Service"
                          checked={nature === 'Service'}
                          onChange={(e) => setNature(e.target.value)}
                          style={{ accentColor: '#00A9B7' }}
                        />
                        <span style={{ color: '#0A0F14' }}>Service</span>
                      </label>
                    </div>
                  </div>

                  {/* RCM Applicable */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
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
                          style={{ accentColor: '#00A9B7' }}
                        />
                        <span style={{ color: '#0A0F14' }}>Yes</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="rcmApplicable"
                          value="No"
                          checked={rcmApplicable === 'No'}
                          onChange={(e) => setRcmApplicable(e.target.value)}
                          style={{ accentColor: '#00A9B7' }}
                        />
                        <span style={{ color: '#0A0F14' }}>No</span>
                      </label>
                    </div>
                  </div>

                  {/* Conditional: HSN Code for Product, SAC Code for Service */}
                  {nature === 'Product' ? (
                    <div>
                      <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                        HSN Code (Goods)
                      </label>
                      <select
                        value={hsnCode}
                        onChange={(e) => setHsnCode(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg"
                        style={{
                          border: '1px solid #E1E6EA',
                          color: '#0A0F14'
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
                      <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                        SAC Code (Services)
                      </label>
                      <select
                        value={sacCode}
                        onChange={(e) => setSacCode(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg"
                        style={{
                          border: '1px solid #E1E6EA',
                          color: '#0A0F14'
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
                    <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                      GST Rate
                    </label>
                    <select
                      value={gstRate}
                      onChange={(e) => setGstRate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
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
                    <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
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
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Procurement Policy & Controls */}
              <div>
                <h3 className="text-lg mb-4" style={{ color: '#0A0F14' }}>
                  4. Procurement Policy & Controls
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  {/* PO Required for this Item? */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                      PO Required for this Item?
                    </label>
                    <select
                      value={poRequired}
                      onChange={(e) => setPoRequired(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
                      }}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>

                  {/* Reorder Level */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                      Reorder Level
                    </label>
                    <input
                      type="text"
                      value={reorderLevel}
                      onChange={(e) => setReorderLevel(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
                      }}
                    />
                  </div>

                  {/* Max Order Qty */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                      Max Order Qty
                    </label>
                    <input
                      type="text"
                      value={maxOrderQty}
                      onChange={(e) => setMaxOrderQty(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 rounded-lg"
                      style={{
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3" style={{ borderColor: '#E1E6EA' }}>
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
                onClick={editingItem ? handleSaveEdit : handleSubmit}
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

      {/* Items List */}
      <div className="bg-white rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: '#F6F9FC' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>
                  Item Code
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>
                  Item Name
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>
                  Category
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>
                  UOM
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>
                  HSN Code
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={item.id}
                  style={{
                    borderTop: index === 0 ? 'none' : '1px solid #E1E6EA'
                  }}
                >
                  <td className="px-6 py-4" style={{ color: '#0A0F14' }}>
                    {item.itemCode}
                  </td>
                  <td className="px-6 py-4" style={{ color: '#0A0F14' }}>
                    {item.itemName}
                  </td>
                  <td className="px-6 py-4" style={{ color: '#6E7A82' }}>
                    {item.procurementCategory}
                  </td>
                  <td className="px-6 py-4" style={{ color: '#6E7A82' }}>
                    {item.uom}
                  </td>
                  <td className="px-6 py-4" style={{ color: '#6E7A82' }}>
                    {item.hsnCode}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-sm"
                      style={{
                        backgroundColor: item.itemStatus === 'Active' ? '#E8F7F8' : '#F6F9FC',
                        color: item.itemStatus === 'Active' ? '#00A9B7' : '#6E7A82'
                      }}
                    >
                      {item.itemStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: '#FF4E5B' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: '#00A9B7' }}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/item/${item.id}`)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: '#00A9B7' }}
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
