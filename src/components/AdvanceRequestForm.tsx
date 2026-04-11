import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Send, AlertCircle, CheckCircle, DollarSign,
  Calendar, User, Building2, FileText, Clock, Target, TrendingUp,
  Receipt, CreditCard, Info
} from 'lucide-react';
import { useAPData, Milestone } from '../contexts/APDataContext';
import { FormShell, FormSection, PxFormField, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';

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

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const completeness = useMemo(() => {
    const fields = [selectedVendorCode, advanceType, String(requestedAmount), advanceDate, purpose];
    if (advanceType === 'PO-based') fields.push(selectedPO);
    const filled = fields.filter(v => String(v).trim().length > 0 && v !== '0').length;
    return Math.round((filled / fields.length) * 100);
  }, [selectedVendorCode, advanceType, requestedAmount, advanceDate, purpose, selectedPO]);

  const handleSaveDraftCb = useCallback(() => {
    setSaveStatus('saving');
    handleSaveDraft();
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  }, [handleSaveDraft]);

  useFormKeyboardSave(handleSaveDraftCb);

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
    <FormShell
      variant="transaction"
      title="Create Advance Request"
      subtitle="Raise vendor advances against PO milestones or on-account"
      onBack={() => navigate('/ap/advance-requests')}
      onSaveDraft={handleSaveDraftCb}
      onSubmit={handleSubmit}
      submitLabel="Submit for Approval"
      draftLabel="Save Draft"
      saveStatus={saveStatus}
      completeness={completeness}
    >
      <div className="max-w-[1400px] mx-auto">
        <div className="space-y-6">
          
          {/* Section 1: Advance Type & Vendor Selection */}
          <FormSection title="Section 1: Advance Type & Vendor" subtitle="Select advance type and vendor details" columns={2} icon={<div className="w-10 h-10 bg-[var(--color-teal)]/10 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5 text-[var(--color-teal)]" /></div>}>
            <PxFormField label="Advance Type" required>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="advanceType"
                    value="PO-based"
                    checked={advanceType === 'PO-based'}
                    onChange={() => {
                      setAdvanceType('PO-based');
                      setSelectedPO('');
                      setSelectedMilestones([]);
                    }}
                    className="w-4 h-4 text-[var(--color-teal)] accent-[var(--color-teal)]"
                  />
                  <span className="text-[var(--color-ink)]">PO-based</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="advanceType"
                    value="On-Account"
                    checked={advanceType === 'On-Account'}
                    onChange={() => {
                      setAdvanceType('On-Account');
                      setSelectedPO('');
                      setSelectedMilestones([]);
                      setAvailablePOs([]);
                    }}
                    className="w-4 h-4 text-[var(--color-teal)] accent-[var(--color-teal)]"
                  />
                  <span className="text-[var(--color-ink)]">On-Account</span>
                </label>
              </div>
            </PxFormField>

            <PxFormField label="Vendor Name" required error={errors.vendor}>
              <select
                value={selectedVendorCode}
                onChange={(e) => setSelectedVendorCode(e.target.value)}
                className="px-select"
              >
                <option value="">Select Vendor</option>
                {vendors.map(vendor => (
                  <option key={vendor.code} value={vendor.code}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </PxFormField>

            <PxFormField label="Vendor Code">
              <input
                type="text"
                value={selectedVendorCode}
                disabled
                className="px-input"
                style={{ backgroundColor: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' }}
              />
            </PxFormField>

            <PxFormField label="Vendor GSTIN">
              <input
                type="text"
                value={vendorGSTIN}
                disabled
                className="px-input"
                style={{ backgroundColor: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' }}
              />
            </PxFormField>
          </FormSection>

          {/* Section 2: PO & Milestone Selection (Only for PO-based) */}
          {advanceType === 'PO-based' && selectedVendorCode && (
            <div className="bg-white rounded-lg border border-[var(--color-silver)] p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--color-silver)]">
                <div className="w-10 h-10 bg-[var(--color-teal)]/10 rounded-lg flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-[var(--color-teal)]" />
                </div>
                <div>
                  <h2 className="text-[var(--color-ink)]">Section 2: PO & Milestone Selection</h2>
                  <p className="text-sm text-[var(--color-mercury-grey)]">Select purchase order and eligible milestones</p>
                </div>
              </div>

              {/* PO Selection Table */}
              {availablePOs.length > 0 ? (
                <div className="mb-6">
                  <h3 className="text-[var(--color-ink)] mb-3">Available Purchase Orders</h3>
                  <div className="border border-[var(--color-silver)] rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-[var(--color-cloud)]">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs text-[var(--color-mercury-grey)] uppercase">Select</th>
                          <th className="px-4 py-3 text-left text-xs text-[var(--color-mercury-grey)] uppercase">PO Number</th>
                          <th className="px-4 py-3 text-left text-xs text-[var(--color-mercury-grey)] uppercase">PO Date</th>
                          <th className="px-4 py-3 text-right text-xs text-[var(--color-mercury-grey)] uppercase">PO Value</th>
                          <th className="px-4 py-3 text-right text-xs text-[var(--color-mercury-grey)] uppercase">Open Amount</th>
                          <th className="px-4 py-3 text-left text-xs text-[var(--color-mercury-grey)] uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-silver)]">
                        {availablePOs.map(po => (
                          <tr 
                            key={po.poNumber}
                            className={`hover:bg-[var(--color-cloud)] cursor-pointer ${selectedPO === po.poNumber ? 'bg-[var(--color-teal)]/5' : ''}`}
                            onClick={() => setSelectedPO(po.poNumber)}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="radio"
                                name="selectedPO"
                                checked={selectedPO === po.poNumber}
                                onChange={() => setSelectedPO(po.poNumber)}
                                className="w-4 h-4 text-[var(--color-teal)] accent-[var(--color-teal)]"
                              />
                            </td>
                            <td className="px-4 py-3 text-[var(--color-ink)]">{po.poNumber}</td>
                            <td className="px-4 py-3 text-[var(--color-mercury-grey)]">{po.date}</td>
                            <td className="px-4 py-3 text-right text-[var(--color-ink)]">
                              {currency} {po.amount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-[var(--color-ink)]">
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
                <div className="text-center py-8 text-[var(--color-mercury-grey)]">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No open purchase orders found for this vendor</p>
                </div>
              )}

              {/* Milestone Selection Table */}
              {selectedPO && milestones.length > 0 && (
                <div>
                  <h3 className="text-[var(--color-ink)] mb-3">Milestones for {selectedPO}</h3>
                  <div className="border border-[var(--color-silver)] rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-[var(--color-cloud)]">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs text-[var(--color-mercury-grey)] uppercase">Select</th>
                          <th className="px-4 py-3 text-left text-xs text-[var(--color-mercury-grey)] uppercase">Milestone Name</th>
                          <th className="px-4 py-3 text-left text-xs text-[var(--color-mercury-grey)] uppercase">Description</th>
                          <th className="px-4 py-3 text-right text-xs text-[var(--color-mercury-grey)] uppercase">Milestone Amount</th>
                          <th className="px-4 py-3 text-left text-xs text-[var(--color-mercury-grey)] uppercase">Due Date</th>
                          <th className="px-4 py-3 text-right text-xs text-[var(--color-mercury-grey)] uppercase">Eligible Advance</th>
                          <th className="px-4 py-3 text-left text-xs text-[var(--color-mercury-grey)] uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-silver)]">
                        {milestones.map(milestone => (
                          <tr 
                            key={milestone.id}
                            className={`hover:bg-[var(--color-cloud)] cursor-pointer ${selectedMilestones.includes(milestone.id) ? 'bg-[var(--color-teal)]/5' : ''}`}
                            onClick={() => toggleMilestoneSelection(milestone.id)}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedMilestones.includes(milestone.id)}
                                onChange={() => toggleMilestoneSelection(milestone.id)}
                                className="w-4 h-4 text-[var(--color-teal)] accent-[var(--color-teal)] rounded"
                              />
                            </td>
                            <td className="px-4 py-3 text-[var(--color-ink)]">{milestone.name}</td>
                            <td className="px-4 py-3 text-[var(--color-mercury-grey)] text-sm">{milestone.description}</td>
                            <td className="px-4 py-3 text-right text-[var(--color-ink)]">
                              {currency} {milestone.amount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-[var(--color-mercury-grey)]">{milestone.dueDate}</td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-[var(--color-teal)]">
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
                    <div className="mt-4 p-4 bg-[var(--color-cloud)] rounded-lg border border-[var(--color-silver)]">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--color-mercury-grey)]">Total Eligible Advance Amount:</span>
                        <span className="text-[var(--color-teal)]">
                          {currency} {getTotalEligibleAmount().toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedPO && milestones.length === 0 && (
                <div className="text-center py-8 text-[var(--color-mercury-grey)]">
                  <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No milestones defined for this PO</p>
                  <p className="text-sm mt-1">Configure milestones in PO settings to enable milestone-based advances</p>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Advance Amount & Tax Details */}
          <FormSection title="Section 3: Advance Amount & Tax Details" subtitle="Specify advance amount and tax information" columns={2} icon={<div className="w-10 h-10 bg-[var(--color-teal)]/10 rounded-lg flex items-center justify-center"><DollarSign className="w-5 h-5 text-[var(--color-teal)]" /></div>}>
            <PxFormField label="Requested Advance Amount" required error={errors.amount}>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-[var(--color-mercury-grey)]">{currency}</span>
                <input
                  type="number"
                  value={requestedAmount || ''}
                  onChange={(e) => setRequestedAmount(parseFloat(e.target.value) || 0)}
                  className="px-input"
                  style={{ paddingLeft: '48px' }}
                  placeholder="0.00"
                />
              </div>
            </PxFormField>

            <PxFormField label="Currency">
              <input
                type="text"
                value={currency}
                disabled
                className="px-input"
                style={{ backgroundColor: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' }}
              />
            </PxFormField>

            <PxFormField label="Advance Date" required error={errors.date}>
              <input
                type="date"
                value={advanceDate}
                onChange={(e) => setAdvanceDate(e.target.value)}
                className="px-input"
              />
            </PxFormField>

            <PxFormField label="Purpose / Remarks" required error={errors.purpose} colSpan={2}>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={3}
                className="px-input"
                style={{ height: 'auto' }}
                placeholder="Enter purpose and remarks for this advance request"
              />
            </PxFormField>

            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tdsApplicable}
                  onChange={(e) => setTdsApplicable(e.target.checked)}
                  className="w-4 h-4 text-[var(--color-teal)] accent-[var(--color-teal)] rounded"
                />
                <span className="text-[var(--color-ink)]">TDS Applicable</span>
              </label>
            </div>

            {tdsApplicable && (
              <>
                <PxFormField label="TDS Section" required error={errors.tdsSection}>
                  <select
                    value={tdsSection}
                    onChange={(e) => handleTDSSectionChange(e.target.value)}
                    className="px-select"
                  >
                    <option value="">Select TDS Section</option>
                    {tdsSections.map(section => (
                      <option key={section.code} value={section.code}>
                        {section.code} - {section.description}
                      </option>
                    ))}
                  </select>
                </PxFormField>

                <PxFormField label="TDS Rate (%)">
                  <input
                    type="number"
                    value={tdsRate || ''}
                    onChange={(e) => setTdsRate(parseFloat(e.target.value) || 0)}
                    className="px-input"
                    placeholder="0.00"
                    step="0.01"
                  />
                </PxFormField>

                <PxFormField label="TDS Amount">
                  <input
                    type="text"
                    value={`${currency} ${tdsAmount.toLocaleString()}`}
                    disabled
                    className="px-input"
                    style={{ backgroundColor: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' }}
                  />
                </PxFormField>

                <PxFormField label="Net Advance Payable">
                  <input
                    type="text"
                    value={`${currency} ${netPayable.toLocaleString()}`}
                    disabled
                    className="px-input"
                    style={{ backgroundColor: 'var(--color-cloud)', color: 'var(--color-teal)' }}
                  />
                </PxFormField>
              </>
            )}

            {!tdsApplicable && requestedAmount > 0 && (
              <div className="col-span-2">
                <div className="p-4 bg-[var(--color-cloud)] rounded-lg border border-[var(--color-silver)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-ink)]">Net Advance Payable:</span>
                    <span className="text-[var(--color-teal)]">
                      {currency} {netPayable.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </FormSection>

          {/* Section 4: Approval Workflow */}
          <FormSection title="Section 4: Approval Workflow" subtitle="Configure approval workflow and approvers" columns={2} icon={<div className="w-10 h-10 bg-[var(--color-teal)]/10 rounded-lg flex items-center justify-center"><CheckCircle className="w-5 h-5 text-[var(--color-teal)]" /></div>}>
            <PxFormField label="Approval Workflow">
              <select
                value={approvalWorkflow}
                onChange={(e) => setApprovalWorkflow(e.target.value as 'Auto' | 'Manual')}
                className="px-select"
              >
                <option value="Auto">Auto Approval</option>
                <option value="Manual">Manual Approval</option>
              </select>
            </PxFormField>

            <PxFormField label="Priority Level">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="px-select"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </PxFormField>

            <PxFormField label="Escalation Timeline (hours)">
              <input
                type="number"
                value={escalationTimeline}
                onChange={(e) => setEscalationTimeline(parseInt(e.target.value) || 24)}
                className="px-input"
              />
            </PxFormField>

            {approvalWorkflow === 'Manual' && (
              <PxFormField label="Approvers" colSpan={2}>
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
                        className="w-4 h-4 text-[var(--color-teal)] accent-[var(--color-teal)] rounded"
                      />
                      <span className="text-[var(--color-ink)]">{approver}</span>
                    </label>
                  ))}
                </div>
              </PxFormField>
            )}

            <div className="col-span-2">
              <div className="p-4 bg-[var(--color-cloud)] rounded-lg border border-[var(--color-silver)]">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-[var(--color-teal)] mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-[var(--color-ink)] mb-2">Workflow Preview</h4>
                    {approvalWorkflow === 'Auto' ? (
                      <p className="text-sm text-[var(--color-mercury-grey)]">
                        This request will be automatically approved based on configured rules
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-[var(--color-mercury-grey)]">
                          Approval Sequence: {approvers.length > 0 ? approvers.join(' \u2192 ') : 'No approvers selected'}
                        </p>
                        <p className="text-sm text-[var(--color-mercury-grey)]">
                          SLA: {escalationTimeline} hours | Priority: {priority}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </FormSection>

          {/* Section 5: Accounting Preview */}
          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--color-silver)]">
              <div className="w-10 h-10 bg-[var(--color-teal)]/10 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-[var(--color-teal)]" />
              </div>
              <div className="flex-1">
                <h2 className="text-[var(--color-ink)]">Section 5: Accounting Preview</h2>
                <p className="text-sm text-[var(--color-mercury-grey)]">Preview accounting entries (posted on approval)</p>
              </div>
              <button
                onClick={() => setShowAccountingPreview(!showAccountingPreview)}
                className="text-[var(--color-teal)] text-sm hover:underline"
              >
                {showAccountingPreview ? 'Hide' : 'Show'} Preview
              </button>
            </div>

            {showAccountingPreview && requestedAmount > 0 && (
              <div className="border border-[var(--color-silver)] rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[var(--color-cloud)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs text-[var(--color-mercury-grey)] uppercase">GL Account</th>
                      <th className="px-4 py-3 text-right text-xs text-[var(--color-mercury-grey)] uppercase">Debit Amount</th>
                      <th className="px-4 py-3 text-right text-xs text-[var(--color-mercury-grey)] uppercase">Credit Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-silver)]">
                    <tr>
                      <td className="px-4 py-3 text-[var(--color-ink)]">Vendor Advance Account</td>
                      <td className="px-4 py-3 text-right text-[var(--color-ink)]">
                        {currency} {requestedAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--color-mercury-grey)]">-</td>
                    </tr>
                    {tdsApplicable && tdsAmount > 0 && (
                      <tr>
                        <td className="px-4 py-3 text-[var(--color-ink)]">TDS Payable</td>
                        <td className="px-4 py-3 text-right text-[var(--color-mercury-grey)]">-</td>
                        <td className="px-4 py-3 text-right text-[var(--color-ink)]">
                          {currency} {tdsAmount.toLocaleString()}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="px-4 py-3 text-[var(--color-ink)]">Bank / Cash / AP Clearing</td>
                      <td className="px-4 py-3 text-right text-[var(--color-mercury-grey)]">-</td>
                      <td className="px-4 py-3 text-right text-[var(--color-ink)]">
                        {currency} {netPayable.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-[var(--color-cloud)]">
                    <tr>
                      <td className="px-4 py-3 text-[var(--color-ink)]">Total</td>
                      <td className="px-4 py-3 text-right text-[var(--color-ink)]">
                        {currency} {requestedAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--color-ink)]">
                        {currency} {requestedAmount.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {showAccountingPreview && requestedAmount === 0 && (
              <div className="text-center py-8 text-[var(--color-mercury-grey)]">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Enter advance amount to preview accounting entries</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </FormShell>
  );
}