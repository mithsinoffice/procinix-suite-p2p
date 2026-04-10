import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Shield, AlertTriangle, Edit, Trash2, CheckCircle,
  XCircle, Settings, User, History
} from 'lucide-react';
import { useBudgetData, BudgetPolicy, ControlType } from '../contexts/BudgetDataContext';

export function BudgetPolicies() {
  const navigate = useNavigate();
  const { policies, addPolicy, updatePolicy } = useBudgetData();

  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [policyName, setPolicyName] = useState('');
  const [controlType, setControlType] = useState<ControlType>('Soft Warning');
  const [thresholdPercent, setThresholdPercent] = useState(85);
  const [department, setDepartment] = useState('');
  const [costCentre, setCostCentre] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [alertRecipients, setAlertRecipients] = useState('');
  const [overridePermissions, setOverridePermissions] = useState<string[]>([]);

  const filteredPolicies = policies.filter(p =>
    p.policyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalPolicies: policies.length,
    active: policies.filter(p => p.isActive).length,
    inactive: policies.filter(p => !p.isActive).length,
    hardStop: policies.filter(p => p.controlType === 'Hard Stop').length,
    softWarning: policies.filter(p => p.controlType === 'Soft Warning').length
  };

  const handleCreatePolicy = () => {
    if (!policyName.trim() || thresholdPercent <= 0 || thresholdPercent > 100) {
      alert('Please fill all required fields correctly');
      return;
    }

    const newPolicy: BudgetPolicy = {
      id: `POL-${String(policies.length + 1).padStart(3, '0')}`,
      policyName,
      controlType,
      thresholdPercent,
      applicableDimensions: {
        department: department || undefined,
        costCentre: costCentre || undefined,
        expenseCategory: expenseCategory || undefined
      },
      overridePermissions,
      alertRecipients: alertRecipients.split(',').map(e => e.trim()).filter(e => e),
      isActive: true,
      createdBy: 'Current User',
      createdDate: new Date().toISOString().split('T')[0]
    };

    addPolicy(newPolicy);
    setShowCreateModal(false);
    alert('Policy created successfully!');

    // Reset form
    setPolicyName('');
    setControlType('Soft Warning');
    setThresholdPercent(85);
    setDepartment('');
    setCostCentre('');
    setExpenseCategory('');
    setAlertRecipients('');
    setOverridePermissions([]);
  };

  const togglePolicyStatus = (id: string, currentStatus: boolean) => {
    updatePolicy(id, { isActive: !currentStatus });
  };

  const getControlTypeColor = (type: ControlType) => {
    switch (type) {
      case 'Hard Stop': return 'bg-red-100 text-red-700';
      case 'Soft Warning': return 'bg-yellow-100 text-yellow-700';
      case 'Advisory': return 'bg-blue-100 text-blue-700';
    }
  };

  const getControlTypeIcon = (type: ControlType) => {
    switch (type) {
      case 'Hard Stop': return <XCircle className="w-4 h-4" />;
      case 'Soft Warning': return <AlertTriangle className="w-4 h-4" />;
      case 'Advisory': return <CheckCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9FC]">
      {/* Header */}
      <div className="bg-white border-b border-[#E1E6EA]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[#0A0F14]">Budget Policies & Controls</h1>
              <p className="text-[#6E7A82] text-sm">Configure budget control policies and enforcement rules</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[#00A9B7] text-white rounded-lg hover:bg-[#007D87] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Policy
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Statistics */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6E7A82]">Total Policies</span>
              <Shield className="w-4 h-4 text-[#00A9B7]" />
            </div>
            <div className="text-2xl text-[#0A0F14]">{stats.totalPolicies}</div>
          </div>

          <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6E7A82]">Active</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl text-green-600">{stats.active}</div>
          </div>

          <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6E7A82]">Inactive</span>
              <XCircle className="w-4 h-4 text-[#6E7A82]" />
            </div>
            <div className="text-2xl text-[#6E7A82]">{stats.inactive}</div>
          </div>

          <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6E7A82]">Hard Stop</span>
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl text-red-600">{stats.hardStop}</div>
          </div>

          <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6E7A82]">Soft Warning</span>
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="text-2xl text-yellow-600">{stats.softWarning}</div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg border border-[#E1E6EA] p-4 mb-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#6E7A82]" />
            <input
              type="text"
              placeholder="Search policies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
            />
          </div>
        </div>

        {/* Policies Table */}
        <div className="bg-white rounded-lg border border-[#E1E6EA] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F6F9FC]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">Policy Name</th>
                  <th className="px-4 py-3 text-center text-xs text-[#6E7A82] uppercase">Control Type</th>
                  <th className="px-4 py-3 text-center text-xs text-[#6E7A82] uppercase">Threshold</th>
                  <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">Applicable To</th>
                  <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">Override Permissions</th>
                  <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">Alert Recipients</th>
                  <th className="px-4 py-3 text-center text-xs text-[#6E7A82] uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs text-[#6E7A82] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E6EA]">
                {filteredPolicies.map(policy => (
                  <tr key={policy.id} className="hover:bg-[#F6F9FC]">
                    <td className="px-4 py-3">
                      <div className="text-[#0A0F14]">{policy.policyName}</div>
                      <div className="text-xs text-[#6E7A82] mt-1">{policy.id}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${getControlTypeColor(policy.controlType)}`}>
                        {getControlTypeIcon(policy.controlType)}
                        {policy.controlType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-20 bg-[#E1E6EA] rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              policy.controlType === 'Hard Stop' ? 'bg-red-500' :
                              policy.controlType === 'Soft Warning' ? 'bg-yellow-500' :
                              'bg-blue-500'
                            }`}
                            style={{ width: `${policy.thresholdPercent}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-[#0A0F14]">{policy.thresholdPercent}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 text-sm">
                        {policy.applicableDimensions.department && (
                          <div className="text-[#0A0F14]">Dept: {policy.applicableDimensions.department}</div>
                        )}
                        {policy.applicableDimensions.costCentre && (
                          <div className="text-[#6E7A82]">CC: {policy.applicableDimensions.costCentre}</div>
                        )}
                        {policy.applicableDimensions.expenseCategory && (
                          <div className="text-[#6E7A82]">Category: {policy.applicableDimensions.expenseCategory}</div>
                        )}
                        {!policy.applicableDimensions.department && 
                         !policy.applicableDimensions.costCentre && 
                         !policy.applicableDimensions.expenseCategory && (
                          <span className="text-[#6E7A82]">Global</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {policy.overridePermissions.map((perm, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            {perm}
                          </span>
                        ))}
                        {policy.overridePermissions.length === 0 && (
                          <span className="text-xs text-[#6E7A82]">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-[#0A0F14]">
                        {policy.alertRecipients.length} recipient(s)
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => togglePolicyStatus(policy.id, policy.isActive)}
                        className="relative inline-flex items-center"
                      >
                        <div className={`w-10 h-5 rounded-full transition-colors ${
                          policy.isActive ? 'bg-green-500' : 'bg-[#E1E6EA]'
                        }`}>
                          <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform transform ${
                            policy.isActive ? 'translate-x-5' : 'translate-x-0.5'
                          } mt-0.5`}></div>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-2 hover:bg-[#F6F9FC] rounded transition-colors">
                          <Edit className="w-4 h-4 text-[#6E7A82]" />
                        </button>
                        <button className="p-2 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Policy Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-[#E1E6EA]">
                <h2 className="text-[#0A0F14]">Create Budget Policy</h2>
                <p className="text-sm text-[#6E7A82] mt-1">Configure budget control and enforcement rules</p>
              </div>

              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm text-[#0A0F14] mb-2">Policy Name <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <input
                    type="text"
                    value={policyName}
                    onChange={(e) => setPolicyName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                    placeholder="e.g., IT Department Hard Stop at 95%"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#0A0F14] mb-2">Control Type <span style={{ color: '#FF4E5B' }}>*</span></label>
                    <select
                      value={controlType}
                      onChange={(e) => setControlType(e.target.value as ControlType)}
                      className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                    >
                      <option value="Hard Stop">Hard Stop - Block PO Creation</option>
                      <option value="Soft Warning">Soft Warning - Allow with Override</option>
                      <option value="Advisory">Advisory - Informational Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-[#0A0F14] mb-2">Threshold Percentage <span style={{ color: '#FF4E5B' }}>*</span></label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="50"
                        max="100"
                        step="5"
                        value={thresholdPercent}
                        onChange={(e) => setThresholdPercent(Number(e.target.value))}
                        className="flex-1"
                      />
                      <input
                        type="number"
                        value={thresholdPercent}
                        onChange={(e) => setThresholdPercent(Number(e.target.value))}
                        min="50"
                        max="100"
                        className="w-20 px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#E1E6EA] pt-4">
                  <h3 className="text-[#0A0F14] mb-3">Applicable Dimensions (Optional)</h3>
                  <p className="text-sm text-[#6E7A82] mb-3">
                    Leave blank to apply globally, or specify dimensions to target specific budgets
                  </p>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-[#0A0F14] mb-2">Department</label>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                      >
                        <option value="">All Departments</option>
                        <option value="IT">IT</option>
                        <option value="Marketing">Marketing</option>
                        <option value="HR">HR</option>
                        <option value="Finance">Finance</option>
                        <option value="Operations">Operations</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-[#0A0F14] mb-2">Cost Centre</label>
                      <input
                        type="text"
                        value={costCentre}
                        onChange={(e) => setCostCentre(e.target.value)}
                        className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                        placeholder="e.g., CC-IT-001"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-[#0A0F14] mb-2">Expense Category</label>
                      <select
                        value={expenseCategory}
                        onChange={(e) => setExpenseCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                      >
                        <option value="">All Categories</option>
                        <option value="Operating Expenses">Operating Expenses</option>
                        <option value="Marketing & Advertising">Marketing & Advertising</option>
                        <option value="Training & Development">Training & Development</option>
                        <option value="Capital Expenditure">Capital Expenditure</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#0A0F14] mb-2">Override Permissions</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {['CFO', 'Finance Manager', 'Department Head', 'Procurement Head'].map(role => (
                      <label key={role} className="flex items-center gap-2 px-3 py-2 border border-[#E1E6EA] rounded-lg cursor-pointer hover:bg-[#F6F9FC]">
                        <input
                          type="checkbox"
                          checked={overridePermissions.includes(role)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setOverridePermissions([...overridePermissions, role]);
                            } else {
                              setOverridePermissions(overridePermissions.filter(p => p !== role));
                            }
                          }}
                          className="rounded text-[#00A9B7] focus:ring-[#00A9B7]"
                        />
                        <span className="text-sm text-[#0A0F14]">{role}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#0A0F14] mb-2">Alert Recipients (comma-separated emails)</label>
                  <textarea
                    value={alertRecipients}
                    onChange={(e) => setAlertRecipients(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                    placeholder="user1@company.com, user2@company.com"
                  />
                </div>

                <div className={`rounded-lg border p-4 ${
                  controlType === 'Hard Stop' ? 'bg-red-50 border-red-200' :
                  controlType === 'Soft Warning' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {controlType === 'Hard Stop' ? (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    ) : controlType === 'Soft Warning' ? (
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <h4 className={
                        controlType === 'Hard Stop' ? 'text-red-900' :
                        controlType === 'Soft Warning' ? 'text-yellow-900' :
                        'text-blue-900'
                      }>{controlType} Policy Behavior</h4>
                      <p className={`text-sm mt-1 ${
                        controlType === 'Hard Stop' ? 'text-red-700' :
                        controlType === 'Soft Warning' ? 'text-yellow-700' :
                        'text-blue-700'
                      }`}>
                        {controlType === 'Hard Stop' && 'PO creation will be completely blocked when budget utilization reaches the threshold. No overrides permitted unless user has override permissions.'}
                        {controlType === 'Soft Warning' && 'Warning message will be shown when threshold is reached, but users with override permissions can proceed after confirmation.'}
                        {controlType === 'Advisory' && 'Informational message only - no restrictions on PO creation. Used for monitoring and awareness purposes.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#E1E6EA] flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-[#E1E6EA] rounded-lg hover:bg-[#F6F9FC] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePolicy}
                  className="px-4 py-2 bg-[#00A9B7] text-white rounded-lg hover:bg-[#007D87] transition-colors"
                >
                  Create Policy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Panel */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-blue-900 mb-2">Budget Policy Guidelines</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Hard Stop:</strong> Completely blocks PO creation when threshold is reached</li>
                <li>• <strong>Soft Warning:</strong> Shows warning but allows override with proper permissions</li>
                <li>• <strong>Advisory:</strong> Informational only, does not restrict PO creation</li>
                <li>• Policies can be applied globally or to specific dimensions (department, cost centre, category)</li>
                <li>• All policy changes are logged with user and timestamp for audit compliance</li>
                <li>• Active policies are immediately enforced in real-time during PO creation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}