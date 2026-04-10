import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Package, AlertCircle, ChevronRight, Building2, Users, MapPin, Calendar, TrendingUp } from 'lucide-react';

type PRType = 'Catalogue' | 'Regular' | 'Service' | 'Kit/Bundle' | 'Asset/CAPEX' | 'Blanket';

interface ApprovedPR {
  id: string;
  prType: PRType;
  entity: string;
  requestor: string;
  department: string;
  costCentre: string;
  project?: string;
  needByDate: string;
  totalAmount: number;
  itemCount: number;
  vendor?: string;
  shipTo?: string;
  createdDate: string;
}

interface POPreview {
  id: string;
  vendor: string;
  prIds: string[];
  totalAmount: number;
  itemCount: number;
  needByDate: string;
  shipTo: string;
  reason: string;
}

type GroupingMode = 'vendor' | 'shipTo' | 'costCentre' | 'needByDate';

const mockApprovedPRs: ApprovedPR[] = [
  { id: 'PR-2024-001', prType: 'Catalogue', entity: 'India HQ', requestor: 'Rajesh Kumar', department: 'IT', costCentre: 'CC-IT-001', needByDate: '2024-12-20', totalAmount: 325000, itemCount: 3, vendor: 'Dell India', shipTo: 'Bangalore Office', createdDate: '2024-12-10' },
  { id: 'PR-2024-006', prType: 'Asset/CAPEX', entity: 'India HQ', requestor: 'Ramesh Gupta', department: 'Operations', costCentre: 'CC-OPS-001', needByDate: '2025-01-15', totalAmount: 5500000, itemCount: 1, vendor: 'Siemens India', shipTo: 'Mumbai Plant', createdDate: '2024-12-08' },
  { id: 'PR-2024-008', prType: 'Kit/Bundle', entity: 'India HQ', requestor: 'Arun Joshi', department: 'Production', costCentre: 'CC-PROD-001', project: 'Product Launch 2025', needByDate: '2025-01-10', totalAmount: 780000, itemCount: 12, vendor: 'Component Supplies Co', shipTo: 'Mumbai Plant', createdDate: '2024-12-09' },
  { id: 'PR-2024-011', prType: 'Service', entity: 'India HQ', requestor: 'Meera Nair', department: 'IT', costCentre: 'CC-IT-001', needByDate: '2025-01-08', totalAmount: 650000, itemCount: 1, vendor: 'Cloud Services Inc', shipTo: 'All Locations', createdDate: '2024-12-15' },
  { id: 'PR-2024-013', prType: 'Regular', entity: 'India HQ', requestor: 'Vijay Krishnan', department: 'Operations', costCentre: 'CC-OPS-002', needByDate: '2024-12-28', totalAmount: 450000, itemCount: 6, vendor: 'Office Supplies Ltd', shipTo: 'Bangalore Office', createdDate: '2024-12-14' },
  { id: 'PR-2024-014', prType: 'Catalogue', entity: 'India HQ', requestor: 'Lakshmi Iyer', department: 'IT', costCentre: 'CC-IT-002', needByDate: '2024-12-25', totalAmount: 280000, itemCount: 4, vendor: 'Dell India', shipTo: 'Bangalore Office', createdDate: '2024-12-13' },
  { id: 'PR-2024-015', prType: 'Regular', entity: 'India Manufacturing', requestor: 'Sunil Patil', department: 'Production', costCentre: 'CC-PROD-MFG', needByDate: '2025-01-05', totalAmount: 890000, itemCount: 8, vendor: 'Raw Materials Corp', shipTo: 'Pune Factory', createdDate: '2024-12-12' },
];

export function PRtoPOConversion() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedPRIds = searchParams.get('prIds')?.split(',') || [];

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedPRs, setSelectedPRs] = useState<string[]>(preSelectedPRIds);
  const [selectedEntity, setSelectedEntity] = useState<string>('India HQ');
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('vendor');
  const [poPreview, setPOPreview] = useState<POPreview[]>([]);

  const formatCurrency = (amount: number) => `₹${(amount / 100000).toFixed(2)} L`;

  const getTypeColor = (type: PRType) => {
    switch (type) {
      case 'Catalogue': return { bg: '#E8F7F8', color: '#00A9B7' };
      case 'Regular': return { bg: '#E8F5E9', color: '#2E7D32' };
      case 'Service': return { bg: '#E3F2FD', color: '#1976D2' };
      case 'Kit/Bundle': return { bg: '#F3E5F5', color: '#7B1FA2' };
      case 'Asset/CAPEX': return { bg: '#FFF3E0', color: '#F57C00' };
      case 'Blanket': return { bg: '#E1F5FE', color: '#0277BD' };
      default: return { bg: '#F6F9FC', color: '#6E7A82' };
    }
  };

  const filteredPRs = mockApprovedPRs.filter(pr => pr.entity === selectedEntity);

  const togglePRSelection = (prId: string) => {
    setSelectedPRs(prev =>
      prev.includes(prId) ? prev.filter(id => id !== prId) : [...prev, prId]
    );
  };

  const validateAndProceed = () => {
    if (selectedPRs.length === 0) {
      alert('Please select at least one PR');
      return;
    }

    const selectedPRData = mockApprovedPRs.filter(pr => selectedPRs.includes(pr.id));
    const entities = [...new Set(selectedPRData.map(pr => pr.entity))];
    
    if (entities.length > 1) {
      alert('Cannot club PRs from different entities');
      return;
    }

    setStep(2);
  };

  const generatePOPreview = () => {
    const selectedPRData = mockApprovedPRs.filter(pr => selectedPRs.includes(pr.id));
    let grouped: Record<string, ApprovedPR[]> = {};

    switch (groupingMode) {
      case 'vendor':
        selectedPRData.forEach(pr => {
          const key = pr.vendor || 'No Vendor';
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(pr);
        });
        break;
      case 'shipTo':
        selectedPRData.forEach(pr => {
          const key = pr.shipTo || 'No Ship-To';
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(pr);
        });
        break;
      case 'costCentre':
        selectedPRData.forEach(pr => {
          const key = pr.costCentre;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(pr);
        });
        break;
      case 'needByDate':
        selectedPRData.forEach(pr => {
          const key = pr.needByDate;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(pr);
        });
        break;
    }

    const previews: POPreview[] = Object.entries(grouped).map(([key, prs], idx) => ({
      id: `PO-DRAFT-${idx + 1}`,
      vendor: groupingMode === 'vendor' ? key : prs[0].vendor || 'TBD',
      prIds: prs.map(pr => pr.id),
      totalAmount: prs.reduce((sum, pr) => sum + pr.totalAmount, 0),
      itemCount: prs.reduce((sum, pr) => sum + pr.itemCount, 0),
      needByDate: prs.sort((a, b) => new Date(a.needByDate).getTime() - new Date(b.needByDate).getTime())[0].needByDate,
      shipTo: groupingMode === 'shipTo' ? key : prs[0].shipTo || 'TBD',
      reason: `Grouped by ${groupingMode}`
    }));

    setPOPreview(previews);
    setStep(3);
  };

  const createPOs = () => {
    console.log('Creating POs:', poPreview);
    alert(`${poPreview.length} PO(s) created successfully!`);
    navigate('/purchase-orders');
  };

  return (
    <div style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      {/* Header */}
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => step === 1 ? navigate(-1) : setStep((step - 1) as 1 | 2 | 3 | 4)}
            className="p-2 rounded-lg hover:bg-gray-100"
            style={{ color: '#6E7A82' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl mb-2" style={{ color: '#0A0F14', margin: 0 }}>Create PO from PRs</h1>
            <p className="text-sm" style={{ color: '#6E7A82', margin: 0 }}>
              Convert approved purchase requisitions into purchase orders
            </p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-4">
          {[
            { num: 1, label: 'Select PRs' },
            { num: 2, label: 'Grouping Logic' },
            { num: 3, label: 'Review & Create' }
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                  style={{
                    backgroundColor: step >= s.num ? '#00A9B7' : '#E1E6EA',
                    color: step >= s.num ? '#FFFFFF' : '#6E7A82',
                    fontWeight: '600'
                  }}
                >
                  {step > s.num ? <CheckCircle className="w-4 h-4" /> : s.num}
                </div>
                <span
                  className="text-sm"
                  style={{
                    color: step >= s.num ? '#0A0F14' : '#6E7A82',
                    fontWeight: step === s.num ? '600' : 'normal'
                  }}
                >
                  {s.label}
                </span>
              </div>
              {idx < 2 && (
                <ChevronRight className="w-4 h-4" style={{ color: '#E1E6EA' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="p-8">
        {/* Step 1: PR Selection */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
              <h3 className="text-base mb-4" style={{ color: '#0A0F14', fontWeight: '600', margin: 0 }}>Filter PRs</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs mb-2 block" style={{ color: '#6E7A82' }}>Entity (mandatory)</label>
                  <select
                    value={selectedEntity}
                    onChange={(e) => {
                      setSelectedEntity(e.target.value);
                      setSelectedPRs([]);
                    }}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ border: '1px solid #E1E6EA', backgroundColor: '#F6F9FC', color: '#0A0F14' }}
                  >
                    <option>India HQ</option>
                    <option>India Manufacturing</option>
                    <option>India Sales Office</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-2 block" style={{ color: '#6E7A82' }}>PR Type</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ border: '1px solid #E1E6EA', backgroundColor: '#F6F9FC', color: '#0A0F14' }}
                  >
                    <option>All Types</option>
                    <option>Catalogue</option>
                    <option>Regular</option>
                    <option>Service</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-2 block" style={{ color: '#6E7A82' }}>Vendor</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ border: '1px solid #E1E6EA', backgroundColor: '#F6F9FC', color: '#0A0F14' }}
                  >
                    <option>All Vendors</option>
                    <option>Dell India</option>
                    <option>Siemens India</option>
                    <option>Cloud Services Inc</option>
                  </select>
                </div>
              </div>
            </div>

            {/* PR Selection Summary */}
            {selectedPRs.length > 0 && (
              <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA', borderColor: '#00A9B7' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm mb-1" style={{ color: '#00A9B7', fontWeight: '600', margin: 0 }}>
                      {selectedPRs.length} PR(s) Selected
                    </p>
                    <p className="text-xs" style={{ color: '#6E7A82', margin: 0 }}>
                      Total Value: {formatCurrency(
                        mockApprovedPRs
                          .filter(pr => selectedPRs.includes(pr.id))
                          .reduce((sum, pr) => sum + pr.totalAmount, 0)
                      )}
                    </p>
                  </div>
                  <button
                    onClick={validateAndProceed}
                    className="px-4 py-2 rounded-lg text-white text-sm"
                    style={{ backgroundColor: '#00A9B7' }}
                  >
                    Continue to Grouping
                    <ChevronRight className="w-4 h-4 inline ml-2" />
                  </button>
                </div>
              </div>
            )}

            {/* Available PRs */}
            <div className="bg-white rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
              <div className="p-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
                <h3 className="text-base" style={{ color: '#0A0F14', fontWeight: '600', margin: 0 }}>
                  Approved PRs Ready for Conversion ({filteredPRs.length})
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ backgroundColor: '#F6F9FC' }}>
                    <tr>
                      <th className="px-6 py-3 text-center text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>
                        <input
                          type="checkbox"
                          checked={selectedPRs.length === filteredPRs.length && filteredPRs.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPRs(filteredPRs.map(pr => pr.id));
                            } else {
                              setSelectedPRs([]);
                            }
                          }}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>PR ID</th>
                      <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Type</th>
                      <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Requestor</th>
                      <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Cost Centre</th>
                      <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Vendor</th>
                      <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Ship-To</th>
                      <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Need-by</th>
                      <th className="px-6 py-3 text-right text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: '#E1E6EA' }}>
                    {filteredPRs.map((pr) => {
                      const typeStyle = getTypeColor(pr.prType);
                      const isSelected = selectedPRs.includes(pr.id);

                      return (
                        <tr
                          key={pr.id}
                          className="hover:bg-gray-50"
                          style={{ backgroundColor: isSelected ? '#E8F7F8' : 'transparent' }}
                        >
                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => togglePRSelection(pr.id)}
                            />
                          </td>
                          <td className="px-6 py-4 text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>{pr.id}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 rounded text-xs" style={typeStyle}>
                              {pr.prType}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm" style={{ color: '#0A0F14' }}>{pr.requestor}</td>
                          <td className="px-6 py-4 text-sm" style={{ color: '#6E7A82' }}>{pr.costCentre}</td>
                          <td className="px-6 py-4 text-sm" style={{ color: '#0A0F14' }}>{pr.vendor || '—'}</td>
                          <td className="px-6 py-4 text-sm" style={{ color: '#6E7A82' }}>{pr.shipTo || '—'}</td>
                          <td className="px-6 py-4 text-sm" style={{ color: '#DC2626' }}>{pr.needByDate}</td>
                          <td className="px-6 py-4 text-sm text-right" style={{ color: '#0A0F14', fontWeight: '600' }}>
                            {formatCurrency(pr.totalAmount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Grouping Logic */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
              <h3 className="text-base mb-4" style={{ color: '#0A0F14', fontWeight: '600', margin: 0 }}>
                Select Grouping Mode
              </h3>
              <p className="text-sm mb-6" style={{ color: '#6E7A82' }}>
                Choose how you want to group the selected PRs into POs. This will determine how many POs are created.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'vendor', label: 'Group by Vendor', icon: Users, description: 'Create one PO per vendor (Recommended)' },
                  { id: 'shipTo', label: 'Group by Ship-To Location', icon: MapPin, description: 'Create one PO per delivery location' },
                  { id: 'costCentre', label: 'Group by Cost Centre', icon: TrendingUp, description: 'Create one PO per cost centre' },
                  { id: 'needByDate', label: 'Group by Need-by Date', icon: Calendar, description: 'Create one PO per delivery date' },
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = groupingMode === mode.id;

                  return (
                    <button
                      key={mode.id}
                      onClick={() => setGroupingMode(mode.id as GroupingMode)}
                      className="p-4 rounded-lg text-left transition-all"
                      style={{
                        border: `2px solid ${isSelected ? '#00A9B7' : '#E1E6EA'}`,
                        backgroundColor: isSelected ? '#E8F7F8' : '#FFFFFF'
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="w-5 h-5 mt-0.5" style={{ color: isSelected ? '#00A9B7' : '#6E7A82' }} />
                        <div>
                          <p className="text-sm mb-1" style={{ color: '#0A0F14', fontWeight: '600', margin: 0 }}>
                            {mode.label}
                          </p>
                          <p className="text-xs" style={{ color: '#6E7A82', margin: 0 }}>
                            {mode.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-6" style={{ borderTop: '1px solid #E1E6EA' }}>
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA', color: '#6E7A82' }}
                >
                  Back
                </button>
                <button
                  onClick={generatePOPreview}
                  className="px-4 py-2 rounded-lg text-white text-sm"
                  style={{ backgroundColor: '#00A9B7' }}
                >
                  Generate PO Preview
                  <ChevronRight className="w-4 h-4 inline ml-2" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: PO Preview & Create */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Summary Banner */}
            <div className="bg-white rounded-lg p-6" style={{ border: '2px solid #00A9B7' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base mb-2" style={{ color: '#0A0F14', fontWeight: '600', margin: 0 }}>
                    {poPreview.length} PO(s) will be created
                  </p>
                  <p className="text-sm" style={{ color: '#6E7A82', margin: 0 }}>
                    From {selectedPRs.length} selected PRs • Total Value: {formatCurrency(
                      mockApprovedPRs
                        .filter(pr => selectedPRs.includes(pr.id))
                        .reduce((sum, pr) => sum + pr.totalAmount, 0)
                    )}
                  </p>
                </div>
                <button
                  onClick={createPOs}
                  className="px-6 py-3 rounded-lg text-white text-sm"
                  style={{ backgroundColor: '#2E7D32' }}
                >
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  Create {poPreview.length} PO(s)
                </button>
              </div>
            </div>

            {/* PO Previews */}
            {poPreview.map((po, idx) => (
              <div key={po.id} className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#E8F7F8' }}>
                    <Package className="w-6 h-6" style={{ color: '#00A9B7' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: '600', margin: 0 }}>
                      {po.id}
                    </h3>
                    <p className="text-sm mb-3" style={{ color: '#6E7A82', margin: 0 }}>
                      Vendor: <strong>{po.vendor}</strong> • Ship-To: {po.shipTo}
                    </p>

                    <div className="grid grid-cols-4 gap-4 p-4 rounded-lg mb-4" style={{ backgroundColor: '#F6F9FC' }}>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Total Amount</p>
                        <p className="text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>{formatCurrency(po.totalAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Line Items</p>
                        <p className="text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>{po.itemCount} items</p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Earliest Need-by</p>
                        <p className="text-sm" style={{ color: '#DC2626', fontWeight: '600' }}>{po.needByDate}</p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Source PRs</p>
                        <p className="text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>{po.prIds.length} PRs</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#FFF3E0', border: '1px solid #FFB74D' }}>
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5" style={{ color: '#F57C00' }} />
                        <div>
                          <p className="text-xs mb-1" style={{ color: '#F57C00', fontWeight: '600', margin: 0 }}>Grouping Logic</p>
                          <p className="text-xs" style={{ color: '#0A0F14', margin: 0 }}>{po.reason}</p>
                          <p className="text-xs mt-1" style={{ color: '#6E7A82', margin: 0 }}>
                            Source PRs: {po.prIds.join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA', color: '#6E7A82' }}
              >
                Back to Grouping
              </button>
              <button
                onClick={createPOs}
                className="px-6 py-3 rounded-lg text-white text-sm"
                style={{ backgroundColor: '#2E7D32' }}
              >
                <CheckCircle className="w-4 h-4 inline mr-2" />
                Confirm & Create {poPreview.length} PO(s)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}