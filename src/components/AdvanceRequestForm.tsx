import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Send, AlertCircle, CheckCircle, DollarSign, 
  Calendar, User, Building2, FileText, Clock, Target, TrendingUp,
  Receipt, CreditCard, Info
} from 'lucide-react';
import { useAPData, Milestone } from '../contexts/APDataContext';

export function AdvanceRequestForm() {
  const navigate = useNavigate();
  const { vendors, getPOsByVendor, getVendorByCode } = useAPData();
  
  // Section 1: Advance Type & Vendor Selection
  const [advanceType, setAdvanceType] = useState<'PO-based' | 'On-Account'>('PO-based');
  const [selectedVendorCode, setSelectedVendorCode] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorGSTIN, setVendorGSTIN] = useState('');
  
  // Section 2: PO & Milestone Selection (PO-based only)
  const [selectedPO, setSelectedPO] = useState('');
  const [selectedMilestones, setSelectedMilestones] = useState<string[]>([]);
  const [availablePOs, setAvailablePOs] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  
  // Section 3: Advance Amount & Tax Details
  const [requestedAmount, setRequestedAmount] = useState(0);
  const [advancePercentage, setAdvancePercentage] = useState(0);
  const [currency, setCurrency] = useState<'INR' | 'USD' | 'EUR' | 'GBP'>('INR');
  const [advanceDate, setAdvanceDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [tdsApplicable, setTdsApplicable] = useState(false);
  const [tdsSection, setTdsSection] = useState('');
  const [tdsRate, setTdsRate] = useState(0);
  const [tdsAmount, setTdsAmount] = useState(0);
  const [netPayable, setNetPayable] = useState(0);
  
  // Section 4: Approval Workflow
  const [approvalWorkflow, setApprovalWorkflow] = useState<'Auto' | 'Manual'>('Manual');
  const [approvers, setApprovers] = useState<string[]>([]);
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [escalationTimeline, setEscalationTimeline] = useState(24);
  
  // Section 5: Accounting Preview
  const [showAccountingPreview, setShowAccountingPreview] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Vendor selection handler
  useEffect(() => {
    if (selectedVendorCode) {
      const vendor = getVendorByCode(selectedVendorCode);
      if (vendor) {
        setVendorName(vendor.name);
        setVendorGSTIN(vendor.gstin);
        setCurrency(vendor.currency);
        
        // Load POs for selected vendor if PO-based
        if (advanceType === 'PO-based') {
          const pos = getPOsByVendor(selectedVendorCode);
          setAvailablePOs(pos);
        }
      }
    }
  }, [selectedVendorCode, advanceType, getVendorByCode, getPOsByVendor]);

  // PO selection handler - load milestones
  useEffect(() => {
    if (selectedPO && availablePOs.length > 0) {
      const po = availablePOs.find(p => p.poNumber === selectedPO);
      if (po && po.milestones) {
        setMilestones(po.milestones);
      } else {
        setMilestones([]);
      }
    }
  }, [selectedPO, availablePOs]);

  // Calculate TDS and Net Payable
  useEffect(() => {
    if (tdsApplicable && tdsRate > 0) {
      const calculatedTds = (requestedAmount * tdsRate) / 100;
      setTdsAmount(calculatedTds);
      setNetPayable(requestedAmount - calculatedTds);
    } else {
      setTdsAmount(0);
      setNetPayable(requestedAmount);
    }
  }, [requestedAmount, tdsApplicable, tdsRate]);

  // Milestone selection handler
  const toggleMilestoneSelection = (milestoneId: string) => {
    setSelectedMilestones(prev => {
      if (prev.includes(milestoneId)) {
        return prev.filter(id => id !== milestoneId);
      } else {
        return [...prev, milestoneId];
      }
    });
  };

  // Calculate total eligible amount from selected milestones
  const getTotalEligibleAmount = () => {
    return milestones
      .filter(m => selectedMilestones.includes(m.id))
      .reduce((sum, m) => sum + m.remainingEligibleAmount, 0);
  };

  // Validate form
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!selectedVendorCode) newErrors.vendor = 'Vendor is mandatory';
    if (advanceType === 'PO-based' && !selectedPO) newErrors.po = 'PO selection is mandatory for PO-based advances';
    if (advanceType === 'PO-based' && selectedMilestones.length === 0) newErrors.milestone = 'At least one milestone must be selected';
    if (!requestedAmount || requestedAmount <= 0) newErrors.amount = 'Advance amount must be greater than zero';
    if (advanceType === 'PO-based' && requestedAmount > getTotalEligibleAmount()) {
      newErrors.amount = `Amount cannot exceed eligible amount (₹${getTotalEligibleAmount().toLocaleString()})`;
    }
    if (!advanceDate) newErrors.date = 'Advance date is required';
    if (!purpose.trim()) newErrors.purpose = 'Purpose is required';
    if (tdsApplicable && !tdsSection) newErrors.tdsSection = 'TDS section is required when TDS is applicable';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save as draft
  const handleSaveDraft = () => {
    alert('Advance request saved as draft');
    navigate('/ap/advance-requests');
  };

  // Handle submit for approval
  const handleSubmit = () => {
    if (validateForm()) {
      alert('Advance request submitted for approval');
      navigate('/ap/advance-requests');
    }
  };

  // TDS Section Master Data with Rates
  const tdsSections = [
    { code: '194C', description: 'Contractor Payments', rate: 1.0 },
    { code: '194H', description: 'Commission & Brokerage', rate: 5.0 },
    { code: '194I', description: 'Rent', rate: 10.0 },
    { code: '194J', description: 'Professional Services', rate: 10.0 },
    { code: '194A', description: 'Interest other than Interest on Securities', rate: 10.0 }
  ];

  const approversList = ['Finance Manager', 'CFO', 'Department Head', 'CEO'];

  // Handle TDS Section change - auto-populate rate
  const handleTDSSectionChange = (sectionCode: string) => {
    setTdsSection(sectionCode);
    const section = tdsSections.find(s => s.code === sectionCode);
    if (section) {
      setTdsRate(section.rate);
    } else {
      setTdsRate(0);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9FC]">
      {/* Header */}
      <div className="bg-white border-b border-[#E1E6EA]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/ap/advance-requests')}
                className="p-2 hover:bg-[#F6F9FC] rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#0A0F14]" />
              </button>
              <div>
                <h1 className="text-[#0A0F14]">Create Advance Request</h1>
                <p className="text-[#6E7A82] text-sm">Raise vendor advances against PO milestones or on-account</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveDraft}
                className="px-4 py-2 border border-[#E1E6EA] rounded-lg hover:bg-[#F6F9FC] transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-[#00A9B7] text-white rounded-lg hover:bg-[#007D87] transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Submit for Approval
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="space-y-6">
          
          {/* Section 1: Advance Type & Vendor Selection */}
          <div className="bg-white rounded-lg border border-[#E1E6EA] p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E1E6EA]">
              <div className="w-10 h-10 bg-[#00A9B7]/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#00A9B7]" />
              </div>
              <div>
                <h2 className="text-[#0A0F14]">Section 1: Advance Type & Vendor</h2>
                <p className="text-sm text-[#6E7A82]">Select advance type and vendor details</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Advance Type */}
              <div>
                <label className="block text-sm text-[#0A0F14] mb-2">
                  Advance Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="advanceType"
                      value="PO-based"
                      checked={advanceType === 'PO-based'}
                      onChange={(e) => {
                        setAdvanceType('PO-based');
                        setSelectedPO('');
                        setSelectedMilestones([]);
                      }}
                      className="w-4 h-4 text-[#00A9B7] accent-[#00A9B7]"
                    />
                    <span className="text-[#0A0F14]">PO-based</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="advanceType"
                      value="On-Account"
                      checked={advanceType === 'On-Account'}
                      onChange={(e) => {
                        setAdvanceType('On-Account');
                        setSelectedPO('');
                        setSelectedMilestones([]);
                        setAvailablePOs([]);
                      }}
                      className="w-4 h-4 text-[#00A9B7] accent-[#00A9B7]"
                    />
                    <span className="text-[#0A0F14]">On-Account</span>
                  </label>
                </div>
              </div>

              {/* Vendor Name */}
              <div>
                <label className="block text-sm text-[#0A0F14] mb-2">
                  Vendor Name <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedVendorCode}
                  onChange={(e) => setSelectedVendorCode(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map(vendor => (
                    <option key={vendor.code} value={vendor.code}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
                {errors.vendor && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.vendor}
                  </p>
                )}
              </div>

              {/* Vendor Code */}
              <div>
                <label className="block text-sm text-[#0A0F14] mb-2">Vendor Code</label>
                <input
                  type="text"
                  value={selectedVendorCode}
                  disabled
                  className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg bg-[#F6F9FC] text-[#6E7A82]"
                />
              </div>

              {/* Vendor GSTIN */}
              <div>
                <label className="block text-sm text-[#0A0F14] mb-2">Vendor GSTIN</label>
                <input
                  type="text"
                  value={vendorGSTIN}
                  disabled
                  className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg bg-[#F6F9FC] text-[#6E7A82]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: PO & Milestone Selection (Only for PO-based) */}
          {advanceType === 'PO-based' && selectedVendorCode && (
            <div className="bg-white rounded-lg border border-[#E1E6EA] p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E1E6EA]">
                <div className="w-10 h-10 bg-[#00A9B7]/10 rounded-lg flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-[#00A9B7]" />
                </div>
                <div>
                  <h2 className="text-[#0A0F14]">Section 2: PO & Milestone Selection</h2>
                  <p className="text-sm text-[#6E7A82]">Select purchase order and eligible milestones</p>
                </div>
              </div>

              {/* PO Selection Table */}
              {availablePOs.length > 0 ? (
                <div className="mb-6">
                  <h3 className="text-[#0A0F14] mb-3">Available Purchase Orders</h3>
                  <div className="border border-[#E1E6EA] rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-[#F6F9FC]">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">Select</th>
                          <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">PO Number</th>
                          <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">PO Date</th>
                          <th className="px-4 py-3 text-right text-xs text-[#6E7A82] uppercase">PO Value</th>
                          <th className="px-4 py-3 text-right text-xs text-[#6E7A82] uppercase">Open Amount</th>
                          <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E1E6EA]">
                        {availablePOs.map(po => (
                          <tr 
                            key={po.poNumber}
                            className={`hover:bg-[#F6F9FC] cursor-pointer ${selectedPO === po.poNumber ? 'bg-[#00A9B7]/5' : ''}`}
                            onClick={() => setSelectedPO(po.poNumber)}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="radio"
                                name="selectedPO"
                                checked={selectedPO === po.poNumber}
                                onChange={() => setSelectedPO(po.poNumber)}
                                className="w-4 h-4 text-[#00A9B7] accent-[#00A9B7]"
                              />
                            </td>
                            <td className="px-4 py-3 text-[#0A0F14]">{po.poNumber}</td>
                            <td className="px-4 py-3 text-[#6E7A82]">{po.date}</td>
                            <td className="px-4 py-3 text-right text-[#0A0F14]">
                              {currency} {po.amount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-[#0A0F14]">
                              {currency} {po.openAmount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                {po.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {errors.po && (
                    <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.po}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-[#6E7A82]">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No open purchase orders found for this vendor</p>
                </div>
              )}

              {/* Milestone Selection Table */}
              {selectedPO && milestones.length > 0 && (
                <div>
                  <h3 className="text-[#0A0F14] mb-3">Milestones for {selectedPO}</h3>
                  <div className="border border-[#E1E6EA] rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-[#F6F9FC]">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">Select</th>
                          <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">Milestone Name</th>
                          <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">Description</th>
                          <th className="px-4 py-3 text-right text-xs text-[#6E7A82] uppercase">Milestone Amount</th>
                          <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">Due Date</th>
                          <th className="px-4 py-3 text-right text-xs text-[#6E7A82] uppercase">Eligible Advance</th>
                          <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E1E6EA]">
                        {milestones.map(milestone => (
                          <tr 
                            key={milestone.id}
                            className={`hover:bg-[#F6F9FC] cursor-pointer ${selectedMilestones.includes(milestone.id) ? 'bg-[#00A9B7]/5' : ''}`}
                            onClick={() => toggleMilestoneSelection(milestone.id)}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedMilestones.includes(milestone.id)}
                                onChange={() => toggleMilestoneSelection(milestone.id)}
                                className="w-4 h-4 text-[#00A9B7] accent-[#00A9B7] rounded"
                              />
                            </td>
                            <td className="px-4 py-3 text-[#0A0F14]">{milestone.name}</td>
                            <td className="px-4 py-3 text-[#6E7A82] text-sm">{milestone.description}</td>
                            <td className="px-4 py-3 text-right text-[#0A0F14]">
                              {currency} {milestone.amount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-[#6E7A82]">{milestone.dueDate}</td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-[#00A9B7]">
                                {currency} {milestone.remainingEligibleAmount.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs ${
                                milestone.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                milestone.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {milestone.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {errors.milestone && (
                    <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.milestone}
                    </p>
                  )}
                  {selectedMilestones.length > 0 && (
                    <div className="mt-4 p-4 bg-[#F6F9FC] rounded-lg border border-[#E1E6EA]">
                      <div className="flex items-center justify-between">
                        <span className="text-[#6E7A82]">Total Eligible Advance Amount:</span>
                        <span className="text-[#00A9B7]">
                          {currency} {getTotalEligibleAmount().toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedPO && milestones.length === 0 && (
                <div className="text-center py-8 text-[#6E7A82]">
                  <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No milestones defined for this PO</p>
                  <p className="text-sm mt-1">Configure milestones in PO settings to enable milestone-based advances</p>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Advance Amount & Tax Details */}
          <div className="bg-white rounded-lg border border-[#E1E6EA] p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E1E6EA]">
              <div className="w-10 h-10 bg-[#00A9B7]/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#00A9B7]" />
              </div>
              <div>
                <h2 className="text-[#0A0F14]">Section 3: Advance Amount & Tax Details</h2>
                <p className="text-sm text-[#6E7A82]">Specify advance amount and tax information</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Requested Advance Amount */}
              <div>
                <label className="block text-sm text-[#0A0F14] mb-2">
                  Requested Advance Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-[#6E7A82]">{currency}</span>
                  <input
                    type="number"
                    value={requestedAmount || ''}
                    onChange={(e) => setRequestedAmount(parseFloat(e.target.value) || 0)}
                    className="w-full pl-12 pr-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                    placeholder="0.00"
                  />
                </div>
                {errors.amount && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.amount}
                  </p>
                )}
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm text-[#0A0F14] mb-2">Currency</label>
                <input
                  type="text"
                  value={currency}
                  disabled
                  className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg bg-[#F6F9FC] text-[#6E7A82]"
                />
              </div>

              {/* Advance Date */}
              <div>
                <label className="block text-sm text-[#0A0F14] mb-2">
                  Advance Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={advanceDate}
                  onChange={(e) => setAdvanceDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                />
                {errors.date && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.date}
                  </p>
                )}
              </div>

              {/* Purpose/Remarks */}
              <div className="col-span-2">
                <label className="block text-sm text-[#0A0F14] mb-2">
                  Purpose / Remarks <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                  placeholder="Enter purpose and remarks for this advance request"
                />
                {errors.purpose && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.purpose}
                  </p>
                )}
              </div>

              {/* TDS Applicable */}
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tdsApplicable}
                    onChange={(e) => setTdsApplicable(e.target.checked)}
                    className="w-4 h-4 text-[#00A9B7] accent-[#00A9B7] rounded"
                  />
                  <span className="text-[#0A0F14]">TDS Applicable</span>
                </label>
              </div>

              {/* TDS Section */}
              {tdsApplicable && (
                <>
                  <div>
                    <label className="block text-sm text-[#0A0F14] mb-2">
                      TDS Section <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={tdsSection}
                      onChange={(e) => handleTDSSectionChange(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                    >
                      <option value="">Select TDS Section</option>
                      {tdsSections.map(section => (
                        <option key={section.code} value={section.code}>
                          {section.code} - {section.description}
                        </option>
                      ))}
                    </select>
                    {errors.tdsSection && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.tdsSection}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-[#0A0F14] mb-2">TDS Rate (%)</label>
                    <input
                      type="number"
                      value={tdsRate || ''}
                      onChange={(e) => setTdsRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[#0A0F14] mb-2">TDS Amount</label>
                    <input
                      type="text"
                      value={`${currency} ${tdsAmount.toLocaleString()}`}
                      disabled
                      className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg bg-[#F6F9FC] text-[#6E7A82]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[#0A0F14] mb-2">Net Advance Payable</label>
                    <input
                      type="text"
                      value={`${currency} ${netPayable.toLocaleString()}`}
                      disabled
                      className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg bg-[#F6F9FC] text-[#00A9B7]"
                    />
                  </div>
                </>
              )}

              {!tdsApplicable && requestedAmount > 0 && (
                <div className="col-span-2">
                  <div className="p-4 bg-[#F6F9FC] rounded-lg border border-[#E1E6EA]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#0A0F14]">Net Advance Payable:</span>
                      <span className="text-[#00A9B7]">
                        {currency} {netPayable.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Approval Workflow */}
          <div className="bg-white rounded-lg border border-[#E1E6EA] p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E1E6EA]">
              <div className="w-10 h-10 bg-[#00A9B7]/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#00A9B7]" />
              </div>
              <div>
                <h2 className="text-[#0A0F14]">Section 4: Approval Workflow</h2>
                <p className="text-sm text-[#6E7A82]">Configure approval workflow and approvers</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Approval Workflow Type */}
              <div>
                <label className="block text-sm text-[#0A0F14] mb-2">Approval Workflow</label>
                <select
                  value={approvalWorkflow}
                  onChange={(e) => setApprovalWorkflow(e.target.value as 'Auto' | 'Manual')}
                  className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                >
                  <option value="Auto">Auto Approval</option>
                  <option value="Manual">Manual Approval</option>
                </select>
              </div>

              {/* Priority Level */}
              <div>
                <label className="block text-sm text-[#0A0F14] mb-2">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              {/* Escalation Timeline */}
              <div>
                <label className="block text-sm text-[#0A0F14] mb-2">Escalation Timeline (hours)</label>
                <input
                  type="number"
                  value={escalationTimeline}
                  onChange={(e) => setEscalationTimeline(parseInt(e.target.value) || 24)}
                  className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                />
              </div>

              {/* Approvers (if manual) */}
              {approvalWorkflow === 'Manual' && (
                <div className="col-span-2">
                  <label className="block text-sm text-[#0A0F14] mb-2">Approvers</label>
                  <div className="grid grid-cols-2 gap-3">
                    {approversList.map(approver => (
                      <label key={approver} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={approvers.includes(approver)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setApprovers([...approvers, approver]);
                            } else {
                              setApprovers(approvers.filter(a => a !== approver));
                            }
                          }}
                          className="w-4 h-4 text-[#00A9B7] accent-[#00A9B7] rounded"
                        />
                        <span className="text-[#0A0F14]">{approver}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Workflow Preview */}
              <div className="col-span-2">
                <div className="p-4 bg-[#F6F9FC] rounded-lg border border-[#E1E6EA]">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-[#00A9B7] mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-[#0A0F14] mb-2">Workflow Preview</h4>
                      {approvalWorkflow === 'Auto' ? (
                        <p className="text-sm text-[#6E7A82]">
                          This request will be automatically approved based on configured rules
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-[#6E7A82]">
                            Approval Sequence: {approvers.length > 0 ? approvers.join(' → ') : 'No approvers selected'}
                          </p>
                          <p className="text-sm text-[#6E7A82]">
                            SLA: {escalationTimeline} hours | Priority: {priority}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Accounting Preview */}
          <div className="bg-white rounded-lg border border-[#E1E6EA] p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E1E6EA]">
              <div className="w-10 h-10 bg-[#00A9B7]/10 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-[#00A9B7]" />
              </div>
              <div className="flex-1">
                <h2 className="text-[#0A0F14]">Section 5: Accounting Preview</h2>
                <p className="text-sm text-[#6E7A82]">Preview accounting entries (posted on approval)</p>
              </div>
              <button
                onClick={() => setShowAccountingPreview(!showAccountingPreview)}
                className="text-[#00A9B7] text-sm hover:underline"
              >
                {showAccountingPreview ? 'Hide' : 'Show'} Preview
              </button>
            </div>

            {showAccountingPreview && requestedAmount > 0 && (
              <div className="border border-[#E1E6EA] rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#F6F9FC]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">GL Account</th>
                      <th className="px-4 py-3 text-right text-xs text-[#6E7A82] uppercase">Debit Amount</th>
                      <th className="px-4 py-3 text-right text-xs text-[#6E7A82] uppercase">Credit Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1E6EA]">
                    <tr>
                      <td className="px-4 py-3 text-[#0A0F14]">Vendor Advance Account</td>
                      <td className="px-4 py-3 text-right text-[#0A0F14]">
                        {currency} {requestedAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-[#6E7A82]">-</td>
                    </tr>
                    {tdsApplicable && tdsAmount > 0 && (
                      <tr>
                        <td className="px-4 py-3 text-[#0A0F14]">TDS Payable</td>
                        <td className="px-4 py-3 text-right text-[#6E7A82]">-</td>
                        <td className="px-4 py-3 text-right text-[#0A0F14]">
                          {currency} {tdsAmount.toLocaleString()}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="px-4 py-3 text-[#0A0F14]">Bank / Cash / AP Clearing</td>
                      <td className="px-4 py-3 text-right text-[#6E7A82]">-</td>
                      <td className="px-4 py-3 text-right text-[#0A0F14]">
                        {currency} {netPayable.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-[#F6F9FC]">
                    <tr>
                      <td className="px-4 py-3 text-[#0A0F14]">Total</td>
                      <td className="px-4 py-3 text-right text-[#0A0F14]">
                        {currency} {requestedAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-[#0A0F14]">
                        {currency} {requestedAmount.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {showAccountingPreview && requestedAmount === 0 && (
              <div className="text-center py-8 text-[#6E7A82]">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Enter advance amount to preview accounting entries</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}