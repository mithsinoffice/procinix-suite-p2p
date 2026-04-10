import { useState } from 'react';
import { Briefcase, Plus, Trash2, Upload, CheckCircle, AlertTriangle, ArrowLeft, Calendar, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProcurementData, type PurchaseRequestStatus } from '../../contexts/ProcurementDataContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useAuth } from '../../contexts/AuthContext';

/**
 * SERVICE PR FORM
 * For professional services, consulting, AMC with milestone-based payments
 */

interface Milestone {
  id: string;
  description: string;
  deliverable: string;
  dueDate: string;
  percentage: number;
  amount: number;
  glAccount: string;
}

export function ServicePRForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addPurchaseRequest } = useProcurementData();
  const {
    vendors,
    entities,
    departments,
    costCentres,
    accountCodes,
    currentCompany,
  } = useMasterData();
  const [serviceType, setServiceType] = useState('');
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [sowUploaded, setSowUploaded] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState(vendors[0]?.id || '');
  const [selectedEntity, setSelectedEntity] = useState(currentCompany?.name || entities[0]?.name || '');
  const [selectedDepartment, setSelectedDepartment] = useState(departments[0]?.name || '');
  const [contractStartDate, setContractStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [contractEndDate, setContractEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceDescription, setServiceDescription] = useState('');

  const serviceTypes = [
    'Professional Consulting',
    'IT Services & Development',
    'AMC - Hardware',
    'AMC - Software',
    'Training & Development',
    'Audit & Compliance',
    'Marketing & Branding',
    'Facility Management',
    'Security Services',
    'Legal Services'
  ];

  const activeVendors = vendors.filter((vendor) => vendor.status === 'Active');
  const activeCostCentres = costCentres.filter((costCentre) => costCentre.isActive);
  const glAccounts = accountCodes
    .filter((account) => account.isActive)
    .map((account) => `${account.code} - ${account.name}`);

  const handleAddMilestone = () => {
    const newMilestone: Milestone = {
      id: `MS-${Date.now()}`,
      description: '',
      deliverable: '',
      dueDate: '',
      percentage: 0,
      amount: 0,
      glAccount: glAccounts[0] || ''
    };
    setMilestones([...milestones, newMilestone]);
  };

  const handleRemoveMilestone = (id: string) => {
    setMilestones(milestones.filter(m => m.id !== id));
  };

  const handleUpdateMilestone = (id: string, field: string, value: any) => {
    setMilestones(milestones.map(m => {
      if (m.id === id) {
        const updated = { ...m, [field]: value };
        // Auto-calculate amount if percentage changes
        if (field === 'percentage' && totalValue > 0) {
          updated.amount = (totalValue * value) / 100;
        }
        return updated;
      }
      return m;
    }));
  };

  const handleTotalValueChange = (value: number) => {
    setTotalValue(value);
    // Recalculate all milestone amounts
    setMilestones(milestones.map(m => ({
      ...m,
      amount: (value * m.percentage) / 100
    })));
  };

  const selectedVendor = activeVendors.find((vendor) => vendor.id === selectedVendorId);
  const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);
  const totalAmount = milestones.reduce((sum, m) => sum + m.amount, 0);

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

  const submitPurchaseRequest = (status: PurchaseRequestStatus) => {
    const timestamp = Date.now();
    const createdDate = new Date().toISOString().split('T')[0];

    addPurchaseRequest({
      id: `service-${timestamp}`,
      prNumber: `PR-${timestamp}`,
      type: 'Service',
      entity: selectedEntity,
      requestor: user?.name || 'Current User',
      department: selectedDepartment,
      costCentre: activeCostCentres[0]?.code || '',
      needByDate: contractStartDate,
      totalAmount: totalValue || totalAmount,
      currency: 'INR',
      status,
      nextApprover: status === 'Draft' ? '—' : 'Department Head',
      aiRiskLevel: totalValue > 1000000 ? 'Medium' : 'Low',
      createdDate,
      submittedDate: status === 'Draft' ? undefined : createdDate,
      vendor: selectedVendor?.name || 'Service Vendor',
      itemCount: milestones.length || 1,
      justification: serviceDescription || (serviceType ? `${serviceType} service request` : 'Service request'),
      policyFlags: sowUploaded ? [] : ['Missing Docs'],
      lineItems: milestones.map((milestone) => ({
        ...milestone,
        vendorId: selectedVendor?.id || '',
        vendorCode: selectedVendor?.code || '',
        contractStartDate,
        contractEndDate,
      }))
    });

    navigate('/procurement/pr/my-prs');
  };

  return (
    <div style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={() => navigate('/procurement/pr/create')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: '#6E7A82' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl mb-1" style={{ color: '#0A0F14', margin: 0 }}>Service Purchase Requisition</h1>
            <p className="text-sm" style={{ color: '#6E7A82', margin: 0 }}>Professional services, consulting, AMC with milestone-based payments</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 rounded-lg"
              style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA', color: '#6E7A82' }}
              onClick={() => submitPurchaseRequest('Draft')}
            >
              Save as Draft
            </button>
            <button
              className="px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: '#00A9B7' }}
              onClick={() => submitPurchaseRequest('Pending Approval')}
            >
              Submit for Approval
            </button>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-3 gap-6">
          {/* Main Form - Left 2 Columns */}
          <div className="col-span-2 space-y-6">
            {/* Header Section */}
            <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
              <h3 className="text-base mb-4" style={{ color: '#0A0F14', fontWeight: '600' }}>Service Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Service Type <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <select 
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#0A0F14' }}
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                  >
                    <option value="">Select Service Type</option>
                    {serviceTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Service Provider/Vendor <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <select value={selectedVendorId} onChange={(e) => setSelectedVendorId(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#0A0F14' }}>
                    <option value="">Select Vendor</option>
                    {activeVendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Contract Start Date <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <input type="date" value={contractStartDate} onChange={(e) => setContractStartDate(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#0A0F14' }} />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Contract End Date <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <input type="date" value={contractEndDate} onChange={(e) => setContractEndDate(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#0A0F14' }} />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Entity <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <select value={selectedEntity} onChange={(e) => setSelectedEntity(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#0A0F14' }}>
                    {entities.filter((entity) => entity.isActive).map((entity) => (
                      <option key={entity.id} value={entity.name}>{entity.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Department <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#0A0F14' }}>
                    {departments.filter((department) => department.isActive).map((department) => (
                      <option key={department.id} value={department.name}>{department.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Service Description <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <textarea 
                    className="w-full px-3 py-2 rounded-lg text-sm" 
                    rows={3} 
                    placeholder="Detailed description of the service to be provided..."
                    style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#0A0F14' }}
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Total Contract Value (excl. GST) <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" style={{ color: '#6E7A82' }} />
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={totalValue}
                      onChange={(e) => handleTotalValueChange(parseFloat(e.target.value) || 0)}
                      className="flex-1 px-3 py-2 rounded-lg text-sm"
                      placeholder="Enter total contract value"
                      style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#0A0F14' }}
                    />
                  </div>
                  {totalValue > 0 && (
                    <p className="text-sm mt-2" style={{ color: '#00A9B7' }}>
                      Including 18% GST: <strong>{formatCurrency(totalValue * 1.18)}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* SoW Upload */}
            <div className="bg-white p-6 rounded-lg" style={{ border: sowUploaded ? '2px solid #2E7D32' : '2px dashed #E1E6EA' }}>
              <div className="flex items-center gap-2 mb-4">
                <Upload className="w-5 h-5" style={{ color: sowUploaded ? '#2E7D32' : '#6E7A82' }} />
                <h3 className="text-base" style={{ color: '#0A0F14', fontWeight: '600' }}>
                  Scope of Work (SoW) Document {sowUploaded && '✓'}
                </h3>
              </div>
              {!sowUploaded ? (
                <div className="text-center py-8">
                  <button 
                    onClick={() => setSowUploaded(true)}
                    className="px-4 py-2 rounded-lg text-white"
                    style={{ backgroundColor: '#00A9B7' }}
                  >
                    <Upload className="w-4 h-4 inline mr-2" />
                    Upload SoW Document
                  </button>
                  <p className="text-sm mt-3" style={{ color: '#6E7A82' }}>
                    PDF, DOC, DOCX up to 10MB | <strong>Mandatory for service PRs</strong>
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-lg flex items-center justify-between" style={{ backgroundColor: '#E8F5E9' }}>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5" style={{ color: '#2E7D32' }} />
                    <div>
                      <p className="text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>Service_Agreement_2024.pdf</p>
                      <p className="text-xs" style={{ color: '#6E7A82' }}>Uploaded on Dec 15, 2024 • 2.3 MB</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSowUploaded(false)}
                    className="px-3 py-1 rounded text-sm"
                    style={{ backgroundColor: '#FFFFFF', border: '1px solid #E1E6EA', color: '#DC2626' }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Milestones */}
            <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>Payment Milestones</h3>
                  <p className="text-sm" style={{ color: '#6E7A82' }}>Define milestone-based payment schedule</p>
                </div>
                <button 
                  onClick={handleAddMilestone}
                  className="px-4 py-2 rounded-lg text-white flex items-center gap-2"
                  style={{ backgroundColor: '#00A9B7' }}
                >
                  <Plus className="w-4 h-4" />
                  Add Milestone
                </button>
              </div>

              {milestones.length === 0 ? (
                <div className="text-center py-12" style={{ backgroundColor: '#F6F9FC', borderRadius: '8px' }}>
                  <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: '#6E7A82' }} />
                  <p className="text-sm mb-1" style={{ color: '#0A0F14' }}>No milestones defined</p>
                  <p className="text-sm" style={{ color: '#6E7A82' }}>Add milestones to structure payment schedule</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {milestones.map((milestone, index) => (
                    <div key={milestone.id} className="p-4 rounded-lg" style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}>
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>Milestone {index + 1}</h4>
                        <button 
                          onClick={() => handleRemoveMilestone(milestone.id)}
                          className="p-1 rounded hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" style={{ color: '#DC2626' }} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs mb-1" style={{ color: '#6E7A82' }}>Milestone Description <span style={{ color: '#FF4E5B' }}>*</span></label>
                          <input 
                            type="text"
                            value={milestone.description}
                            onChange={(e) => handleUpdateMilestone(milestone.id, 'description', e.target.value)}
                            placeholder="e.g., Project Kickoff & Planning"
                            className="w-full px-2 py-1.5 rounded text-sm"
                            style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#0A0F14' }}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs mb-1" style={{ color: '#6E7A82' }}>Deliverable <span style={{ color: '#FF4E5B' }}>*</span></label>
                          <input 
                            type="text"
                            value={milestone.deliverable}
                            onChange={(e) => handleUpdateMilestone(milestone.id, 'deliverable', e.target.value)}
                            placeholder="e.g., Project plan document & timeline"
                            className="w-full px-2 py-1.5 rounded text-sm"
                            style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#0A0F14' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: '#6E7A82' }}>Due Date <span style={{ color: '#FF4E5B' }}>*</span></label>
                          <input 
                            type="date"
                            value={milestone.dueDate}
                            onChange={(e) => handleUpdateMilestone(milestone.id, 'dueDate', e.target.value)}
                            className="w-full px-2 py-1.5 rounded text-sm"
                            style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#0A0F14' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: '#6E7A82' }}>Payment % <span style={{ color: '#FF4E5B' }}>*</span></label>
                          <input 
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={milestone.percentage}
                            onChange={(e) => handleUpdateMilestone(milestone.id, 'percentage', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 rounded text-sm"
                            style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#0A0F14' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: '#6E7A82' }}>Amount</label>
                          <input 
                            type="text"
                            value={formatCurrency(milestone.amount)}
                            disabled
                            className="w-full px-2 py-1.5 rounded text-sm"
                            style={{ border: '1px solid #E1E6EA', backgroundColor: '#F6F9FC', color: '#0A0F14' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: '#6E7A82' }}>GL Account <span style={{ color: '#FF4E5B' }}>*</span></label>
                          <select 
                            value={milestone.glAccount}
                            onChange={(e) => handleUpdateMilestone(milestone.id, 'glAccount', e.target.value)}
                            className="w-full px-2 py-1.5 rounded text-sm"
                            style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#0A0F14' }}
                          >
                            {glAccounts.map(gl => (
                              <option key={gl} value={gl}>{gl}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Milestone Summary */}
                  <div className="pt-4 flex justify-end gap-8" style={{ borderTop: '2px solid #E1E6EA' }}>
                    <div className="text-right">
                      <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Total Percentage</p>
                      <p className={`text-base ${totalPercentage === 100 ? 'text-green-600' : 'text-red-600'}`} style={{ fontWeight: '600' }}>
                        {totalPercentage.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Total Amount</p>
                      <p className="text-base" style={{ color: '#00A9B7', fontWeight: '600' }}>{formatCurrency(totalAmount)}</p>
                    </div>
                  </div>

                  {totalPercentage !== 100 && milestones.length > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
                      <AlertTriangle className="w-4 h-4" style={{ color: '#DC2626' }} />
                      <span className="text-sm" style={{ color: '#DC2626' }}>
                        Milestone percentages must add up to 100% (currently {totalPercentage.toFixed(1)}%)
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Service Guidelines */}
          <div className="space-y-6">
            {/* Service PR Requirements */}
            <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5" style={{ color: '#F57C00' }} />
                <h3 className="text-base" style={{ color: '#0A0F14', fontWeight: '600' }}>Mandatory Requirements</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <div className={`w-4 h-4 rounded-full mt-0.5 flex items-center justify-center ${sowUploaded ? 'bg-green-100' : 'bg-red-100'}`}>
                    {sowUploaded ? (
                      <CheckCircle className="w-3 h-3" style={{ color: '#2E7D32' }} />
                    ) : (
                      <span className="text-xs" style={{ color: '#DC2626' }}>!</span>
                    )}
                  </div>
                  <span className="text-sm" style={{ color: '#6E7A82' }}>
                    <strong>SoW document</strong> upload is mandatory
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className={`w-4 h-4 rounded-full mt-0.5 flex items-center justify-center ${milestones.length > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    {milestones.length > 0 ? (
                      <CheckCircle className="w-3 h-3" style={{ color: '#2E7D32' }} />
                    ) : (
                      <span className="text-xs" style={{ color: '#DC2626' }}>!</span>
                    )}
                  </div>
                  <span className="text-sm" style={{ color: '#6E7A82' }}>
                    At least <strong>one milestone</strong> must be defined
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className={`w-4 h-4 rounded-full mt-0.5 flex items-center justify-center ${totalPercentage === 100 ? 'bg-green-100' : 'bg-red-100'}`}>
                    {totalPercentage === 100 ? (
                      <CheckCircle className="w-3 h-3" style={{ color: '#2E7D32' }} />
                    ) : (
                      <span className="text-xs" style={{ color: '#DC2626' }}>!</span>
                    )}
                  </div>
                  <span className="text-sm" style={{ color: '#6E7A82' }}>
                    Milestones must <strong>total 100%</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#2E7D32' }} />
                  <span className="text-sm" style={{ color: '#6E7A82' }}>
                    Vendor must be <strong>approved</strong> for services
                  </span>
                </li>
              </ul>
            </div>

            {/* Service Types Guide */}
            <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
              <h3 className="text-base mb-4" style={{ color: '#0A0F14', fontWeight: '600' }}>Common Service Types</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#E3F2FD' }}>
                  <p className="text-sm mb-1" style={{ color: '#1976D2', fontWeight: '600' }}>Consulting</p>
                  <p className="text-xs" style={{ color: '#6E7A82' }}>Strategy, process improvement, advisory</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#E8F5E9' }}>
                  <p className="text-sm mb-1" style={{ color: '#2E7D32', fontWeight: '600' }}>AMC</p>
                  <p className="text-xs" style={{ color: '#6E7A82' }}>Hardware/software maintenance contracts</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#FFF3E0' }}>
                  <p className="text-sm mb-1" style={{ color: '#F57C00', fontWeight: '600' }}>Training</p>
                  <p className="text-xs" style={{ color: '#6E7A82' }}>Employee skill development programs</p>
                </div>
              </div>
            </div>

            {/* Budget Check */}
            {totalValue > 0 && (
              <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
                <h3 className="text-base mb-4" style={{ color: '#0A0F14', fontWeight: '600' }}>Budget Check</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: '#6E7A82' }}>Services Budget</span>
                    <span className="text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>₹50,00,000</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: '#6E7A82' }}>Contract Value (incl. GST)</span>
                    <span className="text-sm" style={{ color: '#00A9B7', fontWeight: '600' }}>{formatCurrency(totalValue * 1.18)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #E1E6EA' }}>
                    <span className="text-sm" style={{ color: '#6E7A82' }}>Remaining</span>
                    <span className="text-sm" style={{ color: '#2E7D32', fontWeight: '600' }}>
                      {formatCurrency(5000000 - (totalValue * 1.18))}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: '#E8F5E9' }}>
                    <CheckCircle className="w-4 h-4" style={{ color: '#2E7D32' }} />
                    <span className="text-sm" style={{ color: '#2E7D32' }}>Within Budget</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
