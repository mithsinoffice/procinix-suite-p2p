import { useState } from 'react';
import { ArrowLeft, Save, Shield, AlertCircle, Info, Plus, Trash2, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ToleranceRule {
  id: string;
  name: string;
  applicableFor: string;
  maxPercentIncrease: number;
  maxAmountIncrease: number;
  vendorCategories: string[];
  itemCategories: string[];
  poTypes: string[];
  departments: string[];
  approvers: string[];
}

export function POInvoicePolicyConfig() {
  const navigate = useNavigate();
  
  const [hardLockRate, setHardLockRate] = useState(true);
  const [allowToleranceOverride, setAllowToleranceOverride] = useState(false);
  const [enforce3WayMatch, setEnforce3WayMatch] = useState(true);
  const [blockExcessiveQuantity, setBlockExcessiveQuantity] = useState(true);
  const [requireGRNForInvoice, setRequireGRNForInvoice] = useState(true);
  const [logAllAttempts, setLogAllAttempts] = useState(true);

  const [toleranceRules, setToleranceRules] = useState<ToleranceRule[]>([
    {
      id: 'TR-001',
      name: 'Standard Tolerance',
      applicableFor: 'All vendors and items (default)',
      maxPercentIncrease: 2,
      maxAmountIncrease: 1000,
      vendorCategories: ['All'],
      itemCategories: ['All'],
      poTypes: ['Standard', 'Blanket'],
      departments: ['All'],
      approvers: ['Finance Manager', 'CFO']
    }
  ]);

  const [showAddRuleModal, setShowAddRuleModal] = useState(false);

  const vendorCategories = ['Strategic', 'Preferred', 'Standard', 'MSME', 'Import'];
  const itemCategories = ['Raw Materials', 'Consumables', 'Capital Goods', 'Services', 'IT Equipment'];
  const poTypes = ['Standard', 'Blanket', 'Contract', 'Service', 'Import'];
  const departments = ['Manufacturing', 'IT', 'Admin', 'Sales', 'Marketing'];
  const approverRoles = ['Finance Manager', 'CFO', 'Procurement Head', 'Business Head'];

  const handleSavePolicy = () => {
    // Save policy configuration
    alert('Policy configuration saved successfully');
  };

  const handleAddRule = () => {
    setShowAddRuleModal(true);
  };

  const handleDeleteRule = (id: string) => {
    if (confirm('Are you sure you want to delete this tolerance rule?')) {
      setToleranceRules(toleranceRules.filter(rule => rule.id !== id));
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F6F9FC' }}>
      {/* Header */}
      <div className="bg-white px-8 py-6" style={{ borderBottom: '2px solid #E1E6EA' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/settings')}
              className="p-2 rounded-lg transition-colors"
              style={{ border: '1px solid #E1E6EA' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F6F9FC'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <ArrowLeft className="w-5 h-5" style={{ color: '#6E7A82' }} />
            </button>
            <div>
              <h1 className="text-2xl" style={{ color: '#0A0F14', fontWeight: '700' }}>PO Invoice Policy & Controls</h1>
              <p className="text-sm mt-1" style={{ color: '#6E7A82' }}>
                Configure validation rules and approval workflows for PO-based invoice creation
              </p>
            </div>
          </div>
          <button
            onClick={handleSavePolicy}
            className="flex items-center gap-2 px-6 py-3 rounded-lg transition-all"
            style={{ backgroundColor: '#00A9B7', color: '#FFFFFF', fontWeight: '600' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
          >
            <Save className="w-4 h-4" />
            Save Policy
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        {/* Core Control Settings */}
        <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid #E1E6EA' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E8F7F8' }}>
              <Shield className="w-5 h-5" style={{ color: '#00A9B7' }} />
            </div>
            <div>
              <h2 className="text-lg" style={{ color: '#0A0F14', fontWeight: '700' }}>Core Control Settings</h2>
              <p className="text-sm" style={{ color: '#6E7A82' }}>Primary validation rules for PO-based invoices</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Hard Lock Rate */}
            <div className="flex items-start justify-between p-4 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>Hard Lock Rate to PO</h3>
                  <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: '#E8F7F8', color: '#00A9B7', fontWeight: '600' }}>
                    RECOMMENDED
                  </span>
                </div>
                <p className="text-sm" style={{ color: '#6E7A82' }}>
                  Invoice rate cannot exceed PO rate under any circumstances. Rate field is read-only and locked to PO value. 
                  Any rate increase requires PO amendment or exception approval workflow.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={hardLockRate}
                  onChange={(e) => {
                    setHardLockRate(e.target.checked);
                    if (e.target.checked) setAllowToleranceOverride(false);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" 
                     style={{ backgroundColor: hardLockRate ? '#00A9B7' : '#E1E6EA' }}>
                </div>
              </label>
            </div>

            {/* Tolerance-Based Override */}
            <div className="flex items-start justify-between p-4 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>Allow Tolerance-Based Override</h3>
                  {!hardLockRate && (
                    <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: '#FFF9E6', color: '#D97706', fontWeight: '600' }}>
                      REQUIRES APPROVAL
                    </span>
                  )}
                </div>
                <p className="text-sm" style={{ color: '#6E7A82' }}>
                  Allow invoice rate to exceed PO rate within configured tolerance limits. Requires approval workflow if exceeded.
                  This option is disabled when "Hard Lock Rate" is enabled.
                </p>
                {!hardLockRate && (
                  <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: '#FFF9E6', border: '1px solid #D97706' }}>
                    <p className="text-xs" style={{ color: '#D97706' }}>
                      ⚠️ When enabled, configure tolerance rules below to define acceptable variance limits by vendor category, item type, etc.
                    </p>
                  </div>
                )}
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={allowToleranceOverride}
                  disabled={hardLockRate}
                  onChange={(e) => setAllowToleranceOverride(e.target.checked)}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${hardLockRate ? 'opacity-50 cursor-not-allowed' : ''}`}
                     style={{ backgroundColor: allowToleranceOverride ? '#00A9B7' : '#E1E6EA' }}>
                </div>
              </label>
            </div>

            {/* Enforce 3-Way Match */}
            <div className="flex items-start justify-between p-4 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>Enforce 3-Way Match (PO → GRN → Invoice)</h3>
                  <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: '#E8F7F8', color: '#00A9B7', fontWeight: '600' }}>
                    RECOMMENDED
                  </span>
                </div>
                <p className="text-sm" style={{ color: '#6E7A82' }}>
                  Invoice quantity and amount must match GRN and PO within tolerance. Block submission if mismatch detected.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={enforce3WayMatch}
                  onChange={(e) => setEnforce3WayMatch(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                     style={{ backgroundColor: enforce3WayMatch ? '#00A9B7' : '#E1E6EA' }}>
                </div>
              </label>
            </div>

            {/* Block Excessive Quantity */}
            <div className="flex items-start justify-between p-4 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
              <div className="flex-1">
                <h3 className="text-sm mb-2" style={{ color: '#0A0F14', fontWeight: '600' }}>Block Excessive Quantity Invoicing</h3>
                <p className="text-sm" style={{ color: '#6E7A82' }}>
                  Invoice quantity cannot exceed GRN quantity or PO remaining balance. Prevents over-invoicing.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={blockExcessiveQuantity}
                  onChange={(e) => setBlockExcessiveQuantity(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                     style={{ backgroundColor: blockExcessiveQuantity ? '#00A9B7' : '#E1E6EA' }}>
                </div>
              </label>
            </div>

            {/* Require GRN */}
            <div className="flex items-start justify-between p-4 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
              <div className="flex-1">
                <h3 className="text-sm mb-2" style={{ color: '#0A0F14', fontWeight: '600' }}>Require GRN for Invoice Creation</h3>
                <p className="text-sm" style={{ color: '#6E7A82' }}>
                  Invoice can only be created after GRN is recorded. Ensures goods receipt verification before payment.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={requireGRNForInvoice}
                  onChange={(e) => setRequireGRNForInvoice(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                     style={{ backgroundColor: requireGRNForInvoice ? '#00A9B7' : '#E1E6EA' }}>
                </div>
              </label>
            </div>

            {/* Log All Attempts */}
            <div className="flex items-start justify-between p-4 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
              <div className="flex-1">
                <h3 className="text-sm mb-2" style={{ color: '#0A0F14', fontWeight: '600' }}>Log All Validation Attempts</h3>
                <p className="text-sm" style={{ color: '#6E7A82' }}>
                  Record all attempts to override rate, quantity, or amount in audit trail. Required for compliance and forensic analysis.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={logAllAttempts}
                  onChange={(e) => setLogAllAttempts(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                     style={{ backgroundColor: logAllAttempts ? '#00A9B7' : '#E1E6EA' }}>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Tolerance Rules Configuration */}
        {allowToleranceOverride && !hardLockRate && (
          <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid #E1E6EA' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFF9E6' }}>
                  <AlertCircle className="w-5 h-5" style={{ color: '#D97706' }} />
                </div>
                <div>
                  <h2 className="text-lg" style={{ color: '#0A0F14', fontWeight: '700' }}>Tolerance Rules</h2>
                  <p className="text-sm" style={{ color: '#6E7A82' }}>
                    Define acceptable variance limits by vendor category, item type, PO type, and department
                  </p>
                </div>
              </div>
              <button
                onClick={handleAddRule}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                style={{ backgroundColor: '#00A9B7', color: '#FFFFFF', fontWeight: '600' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
              >
                <Plus className="w-4 h-4" />
                Add Rule
              </button>
            </div>

            {/* Tolerance Rules List */}
            <div className="space-y-4">
              {toleranceRules.map((rule) => (
                <div key={rule.id} className="p-4 rounded-lg" style={{ border: '2px solid #E1E6EA' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>{rule.name}</h3>
                      <p className="text-xs" style={{ color: '#6E7A82' }}>{rule.applicableFor}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" style={{ color: '#FF4E5B' }} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
                      <p className="text-xs mb-1" style={{ color: '#6E7A82', fontWeight: '600' }}>MAX % INCREASE</p>
                      <p className="text-lg" style={{ color: '#0A0F14', fontWeight: '700' }}>{rule.maxPercentIncrease}%</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
                      <p className="text-xs mb-1" style={{ color: '#6E7A82', fontWeight: '600' }}>MAX AMOUNT INCREASE</p>
                      <p className="text-lg" style={{ color: '#0A0F14', fontWeight: '700' }}>₹{rule.maxAmountIncrease.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs mb-1" style={{ color: '#6E7A82', fontWeight: '600' }}>Vendor Categories</p>
                      <p className="text-sm" style={{ color: '#0A0F14' }}>{rule.vendorCategories.join(', ')}</p>
                    </div>
                    <div>
                      <p className="text-xs mb-1" style={{ color: '#6E7A82', fontWeight: '600' }}>Item Categories</p>
                      <p className="text-sm" style={{ color: '#0A0F14' }}>{rule.itemCategories.join(', ')}</p>
                    </div>
                  </div>

                  <div className="pt-3" style={{ borderTop: '1px solid #E1E6EA' }}>
                    <p className="text-xs mb-1" style={{ color: '#6E7A82', fontWeight: '600' }}>Approvers (if tolerance breached)</p>
                    <div className="flex items-center gap-2 mt-2">
                      {rule.approvers.map((approver) => (
                        <span key={approver} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: '#E8F7F8', color: '#00A9B7', fontWeight: '500' }}>
                          {approver}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-blue-50 rounded-lg p-4 flex items-start gap-3" style={{ border: '1px solid #00A9B7' }}>
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#00A9B7' }} />
          <div>
            <p className="text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>Policy Impact</p>
            <p className="text-sm mt-1" style={{ color: '#6E7A82' }}>
              These policies apply to all PO-based invoice creation across the organization. Changes will take effect immediately 
              and will be logged in the system audit trail. Users will see validation messages inline during invoice creation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}