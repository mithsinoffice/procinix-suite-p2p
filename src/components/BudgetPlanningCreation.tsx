import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Save, X, Plus, Trash2, Upload, Download, AlertCircle,
  Building2, DollarSign, Calendar, User, FileText, ChevronDown
} from 'lucide-react';
import { useBudgetData, Budget, BudgetAllocation, AllocationPeriod } from '../contexts/BudgetDataContext';

export function BudgetPlanningCreation() {
  const navigate = useNavigate();
  const { budgets, addBudget } = useBudgetData();

  const [budgetName, setBudgetName] = useState('');
  const [budgetOwner, setBudgetOwner] = useState('');
  const [financialYear, setFinancialYear] = useState('FY2025');
  const [budgetType, setBudgetType] = useState<'Original' | 'Interim' | 'Revised' | 'Forecast'>('Original');
  const [currency, setCurrency] = useState('INR');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [allocationPeriod, setAllocationPeriod] = useState<AllocationPeriod>('Monthly');

  // Dimensions
  const [department, setDepartment] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [glAccountCode, setGlAccountCode] = useState('');
  const [location, setLocation] = useState('');
  const [costCentre, setCostCentre] = useState('');
  const [profitCentre, setProfitCentre] = useState('');
  const [project, setProject] = useState('');

  // Budget line items
  const [lineItems, setLineItems] = useState<BudgetAllocation[]>([
    { period: 'Apr 2025', plannedAmount: 0, comments: '' },
    { period: 'May 2025', plannedAmount: 0, comments: '' },
    { period: 'Jun 2025', plannedAmount: 0, comments: '' },
    { period: 'Jul 2025', plannedAmount: 0, comments: '' },
    { period: 'Aug 2025', plannedAmount: 0, comments: '' },
    { period: 'Sep 2025', plannedAmount: 0, comments: '' },
    { period: 'Oct 2025', plannedAmount: 0, comments: '' },
    { period: 'Nov 2025', plannedAmount: 0, comments: '' },
    { period: 'Dec 2025', plannedAmount: 0, comments: '' },
    { period: 'Jan 2026', plannedAmount: 0, comments: '' },
    { period: 'Feb 2026', plannedAmount: 0, comments: '' },
    { period: 'Mar 2026', plannedAmount: 0, comments: '' }
  ]);

  const [showValidation, setShowValidation] = useState(false);
  const [validationMessages, setValidationMessages] = useState<string[]>([]);

  // Auto-distribute budget evenly
  const autoDistribute = () => {
    if (totalAmount <= 0) {
      alert('Please enter total budget amount first');
      return;
    }

    const periodsCount = lineItems.length;
    const evenAmount = Math.floor(totalAmount / periodsCount);
    const remainder = totalAmount - (evenAmount * periodsCount);

    const distributed = lineItems.map((item, index) => ({
      ...item,
      plannedAmount: index === periodsCount - 1 ? evenAmount + remainder : evenAmount
    }));

    setLineItems(distributed);
  };

  // Update line item
  const updateLineItem = (index: number, field: keyof BudgetAllocation, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  // Calculate total from line items
  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.plannedAmount || 0), 0);
  };

  // Validation
  const validateBudget = () => {
    const messages: string[] = [];
    
    if (!budgetName.trim()) messages.push('Budget name is required');
    if (!budgetOwner.trim()) messages.push('Budget owner is required');
    if (!department.trim()) messages.push('Department is required');
    if (totalAmount <= 0) messages.push('Total budget amount must be greater than 0');
    
    const calculatedTotal = calculateTotal();
    if (Math.abs(calculatedTotal - totalAmount) > 1) {
      messages.push(`Line items total (${currency} ${calculatedTotal.toLocaleString()}) does not match budget amount (${currency} ${totalAmount.toLocaleString()})`);
    }

    // Check for duplicate budgets
    const duplicate = budgets.find(b => 
      b.dimensions.department === department &&
      b.dimensions.expenseCategory === expenseCategory &&
      b.dimensions.costCentre === costCentre &&
      b.financialYear === financialYear &&
      b.status !== 'Rejected'
    );

    if (duplicate) {
      messages.push(`A similar budget already exists: ${duplicate.budgetNumber} - ${duplicate.budgetName}`);
    }

    setValidationMessages(messages);
    setShowValidation(messages.length > 0);
    
    return messages.length === 0;
  };

  const handleSaveDraft = () => {
    if (!validateBudget()) return;

    const newBudget: Budget = {
      id: `BDG-${financialYear}-${String(budgets.length + 1).padStart(3, '0')}`,
      budgetNumber: `BDG-${financialYear}-${String(budgets.length + 1).padStart(3, '0')}`,
      budgetName,
      budgetOwner,
      financialYear,
      budgetType,
      currency,
      totalAmount,
      dimensions: {
        department,
        expenseCategory,
        glAccountCode,
        location,
        costCentre,
        profitCentre,
        project
      },
      allocations: lineItems,
      allocationPeriod,
      status: 'Draft',
      createdBy: budgetOwner,
      createdDate: new Date().toISOString().split('T')[0],
      committed: 0,
      actual: 0,
      available: totalAmount,
      utilizationPercent: 0,
      linkedPOs: [],
      linkedInvoices: [],
      revisionHistory: [],
      approvalWorkflow: []
    };

    addBudget(newBudget);
    alert('Budget saved as draft successfully!');
    navigate('/budgeting/budgets');
  };

  const handleSubmitForApproval = () => {
    if (!validateBudget()) return;

    const newBudget: Budget = {
      id: `BDG-${financialYear}-${String(budgets.length + 1).padStart(3, '0')}`,
      budgetNumber: `BDG-${financialYear}-${String(budgets.length + 1).padStart(3, '0')}`,
      budgetName,
      budgetOwner,
      financialYear,
      budgetType,
      currency,
      totalAmount,
      dimensions: {
        department,
        expenseCategory,
        glAccountCode,
        location,
        costCentre,
        profitCentre,
        project
      },
      allocations: lineItems,
      allocationPeriod,
      status: 'Submitted',
      createdBy: budgetOwner,
      createdDate: new Date().toISOString().split('T')[0],
      committed: 0,
      actual: 0,
      available: totalAmount,
      utilizationPercent: 0,
      linkedPOs: [],
      linkedInvoices: [],
      revisionHistory: [],
      approvalWorkflow: [
        {
          level: 1,
          approverRole: 'Department Head',
          approver: budgetOwner,
          status: 'Pending',
          slaHours: 48,
          slaDue: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0],
          overdue: false
        },
        {
          level: 2,
          approverRole: 'Finance Manager',
          approver: 'David Park',
          status: 'Pending',
          slaHours: 72,
          slaDue: new Date(Date.now() + 120 * 60 * 60 * 1000).toISOString().split('T')[0],
          overdue: false
        },
        {
          level: 3,
          approverRole: 'CFO',
          approver: 'Michael Roberts',
          status: 'Pending',
          slaHours: 96,
          slaDue: new Date(Date.now() + 216 * 60 * 60 * 1000).toISOString().split('T')[0],
          overdue: false
        }
      ]
    };

    addBudget(newBudget);
    alert('Budget submitted for approval successfully!');
    navigate('/budgeting/approval-workflow');
  };

  const calculatedTotal = calculateTotal();
  const totalMismatch = Math.abs(calculatedTotal - totalAmount) > 1;

  return (
    <div className="min-h-screen bg-[#F6F9FC]">
      {/* Header */}
      <div className="bg-white border-b border-[#E1E6EA]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[#0A0F14]">Budget Planning & Creation</h1>
              <p className="text-[#6E7A82] text-sm">Create new budget with multi-dimensional planning and allocation</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/budgeting/budgets')}
                className="px-4 py-2 border border-[#E1E6EA] rounded-lg hover:bg-[#F6F9FC] transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSaveDraft}
                className="px-4 py-2 border border-[#E1E6EA] rounded-lg hover:bg-[#F6F9FC] transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>
              <button
                onClick={handleSubmitForApproval}
                className="px-4 py-2 bg-[#00A9B7] text-white rounded-lg hover:bg-[#007D87] transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Submit for Approval
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-[1600px] mx-auto">
        {/* Validation Messages */}
        {showValidation && validationMessages.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-red-900 mb-2">Validation Errors</h4>
                <ul className="space-y-1">
                  {validationMessages.map((msg, idx) => (
                    <li key={idx} className="text-sm text-red-700">• {msg}</li>
                  ))}
                </ul>
              </div>
              <button onClick={() => setShowValidation(false)}>
                <X className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Budget Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg border border-[#E1E6EA] p-6">
              <h2 className="text-[#0A0F14] mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#00A9B7]" />
                Budget Details
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#0A0F14] mb-2">Budget Name <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <input
                    type="text"
                    value={budgetName}
                    onChange={(e) => setBudgetName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                    placeholder="e.g., IT Operating Budget FY2025"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#0A0F14] mb-2">Budget Owner <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <select
                    value={budgetOwner}
                    onChange={(e) => setBudgetOwner(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                  >
                    <option value="">Select Owner</option>
                    <option value="Sarah Chen">Sarah Chen</option>
                    <option value="Jennifer Martinez">Jennifer Martinez</option>
                    <option value="Robert Singh">Robert Singh</option>
                    <option value="David Park">David Park</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-[#0A0F14] mb-2">Financial Year <span style={{ color: '#FF4E5B' }}>*</span></label>
                    <select
                      value={financialYear}
                      onChange={(e) => setFinancialYear(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                    >
                      <option value="FY2024">FY2024</option>
                      <option value="FY2025">FY2025</option>
                      <option value="FY2026">FY2026</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-[#0A0F14] mb-2">Budget Type <span style={{ color: '#FF4E5B' }}>*</span></label>
                    <select
                      value={budgetType}
                      onChange={(e) => setBudgetType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                    >
                      <option value="Original">Original</option>
                      <option value="Interim">Interim</option>
                      <option value="Revised">Revised</option>
                      <option value="Forecast">Forecast</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-[#0A0F14] mb-2">Currency <span style={{ color: '#FF4E5B' }}>*</span></label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-[#0A0F14] mb-2">Allocation Period</label>
                    <select
                      value={allocationPeriod}
                      onChange={(e) => setAllocationPeriod(e.target.value as AllocationPeriod)}
                      className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Annual">Annual</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#0A0F14] mb-2">Total Budget Amount <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-3 text-[#6E7A82]" />
                    <input
                      type="number"
                      value={totalAmount || ''}
                      onChange={(e) => setTotalAmount(Number(e.target.value))}
                      className="w-full pl-10 pr-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                      placeholder="0"
                    />
                  </div>
                  {totalMismatch && (
                    <p className="text-xs text-red-600 mt-1">
                      Line items total: {currency} {calculatedTotal.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Budget Dimensions */}
            <div className="bg-white rounded-lg border border-[#E1E6EA] p-6">
              <h2 className="text-[#0A0F14] mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#00A9B7]" />
                Budget Dimensions
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#0A0F14] mb-2">Department <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                  >
                    <option value="">Select Department</option>
                    <option value="IT">IT</option>
                    <option value="Marketing">Marketing</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-[#0A0F14] mb-2">Expense Category</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                  >
                    <option value="">Select Category</option>
                    <option value="Operating Expenses">Operating Expenses</option>
                    <option value="Marketing & Advertising">Marketing & Advertising</option>
                    <option value="Training & Development">Training & Development</option>
                    <option value="Capital Expenditure">Capital Expenditure</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-[#0A0F14] mb-2">GL Account Code</label>
                  <input
                    type="text"
                    value={glAccountCode}
                    onChange={(e) => setGlAccountCode(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                    placeholder="e.g., 5100-001"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#0A0F14] mb-2">Location</label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                  >
                    <option value="">Select Location</option>
                    <option value="Bangalore HQ">Bangalore HQ</option>
                    <option value="Mumbai Office">Mumbai Office</option>
                    <option value="Delhi Office">Delhi Office</option>
                    <option value="All Locations">All Locations</option>
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
                  <label className="block text-sm text-[#0A0F14] mb-2">Profit Centre</label>
                  <input
                    type="text"
                    value={profitCentre}
                    onChange={(e) => setProfitCentre(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                    placeholder="e.g., PC-001"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#0A0F14] mb-2">Project (Optional)</label>
                  <input
                    type="text"
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                    placeholder="e.g., PRJ-2025-001"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Budget Allocation Grid */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-[#E1E6EA]">
              <div className="px-6 py-4 border-b border-[#E1E6EA]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[#0A0F14]">Budget Allocation - {allocationPeriod}</h2>
                    <p className="text-sm text-[#6E7A82] mt-1">
                      Enter planned budget amounts for each period
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={autoDistribute}
                      className="px-3 py-2 text-sm border border-[#E1E6EA] rounded-lg hover:bg-[#F6F9FC] transition-colors flex items-center gap-2"
                    >
                      <ChevronDown className="w-4 h-4" />
                      Auto Distribute
                    </button>
                    <button className="px-3 py-2 text-sm border border-[#E1E6EA] rounded-lg hover:bg-[#F6F9FC] transition-colors flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Import
                    </button>
                    <button className="px-3 py-2 text-sm border border-[#E1E6EA] rounded-lg hover:bg-[#F6F9FC] transition-colors flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                  </div>
                </div>
              </div>

              {/* Spreadsheet Grid */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F6F9FC] sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase w-32">Period</th>
                      <th className="px-4 py-3 text-right text-xs text-[#6E7A82] uppercase w-48">Planned Amount ({currency})</th>
                      <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">Comments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1E6EA]">
                    {lineItems.map((item, index) => (
                      <tr key={index} className="hover:bg-[#F6F9FC]">
                        <td className="px-4 py-2">
                          <span className="text-sm text-[#0A0F14]">{item.period}</span>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={item.plannedAmount || ''}
                            onChange={(e) => updateLineItem(index, 'plannedAmount', Number(e.target.value))}
                            className="w-full px-3 py-2 text-right border border-[#E1E6EA] rounded focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.comments || ''}
                            onChange={(e) => updateLineItem(index, 'comments', e.target.value)}
                            className="w-full px-3 py-2 border border-[#E1E6EA] rounded focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                            placeholder="Optional notes"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#F6F9FC] border-t-2 border-[#00A9B7]">
                    <tr>
                      <td className="px-4 py-3 text-[#0A0F14]">Total</td>
                      <td className="px-4 py-3 text-right text-[#0A0F14]">
                        {currency} {calculatedTotal.toLocaleString()}
                        {totalMismatch && (
                          <span className="ml-2 text-xs text-red-600">
                            (Expected: {currency} {totalAmount.toLocaleString()})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Summary Footer */}
              <div className="px-6 py-4 border-t border-[#E1E6EA] bg-[#F6F9FC]">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-[#6E7A82] mb-1">Budget Amount</p>
                    <p className="text-[#0A0F14]">{currency} {totalAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6E7A82] mb-1">Allocated</p>
                    <p className={calculatedTotal === totalAmount ? 'text-green-600' : 'text-[#0A0F14]'}>
                      {currency} {calculatedTotal.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6E7A82] mb-1">Difference</p>
                    <p className={Math.abs(calculatedTotal - totalAmount) < 1 ? 'text-green-600' : 'text-red-600'}>
                      {currency} {Math.abs(calculatedTotal - totalAmount).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Helper Info */}
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-blue-900 mb-1">Budget Creation Tips</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Use "Auto Distribute" to evenly split the budget across all periods</li>
                    <li>• Ensure line items total matches the total budget amount before submission</li>
                    <li>• Budget will go through Department Head → Finance → CFO approval flow</li>
                    <li>• Once approved, budget will be available for PO consumption and tracking</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}