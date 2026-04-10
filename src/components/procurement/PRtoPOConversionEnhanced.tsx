import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle, Package, AlertCircle, ChevronRight, Building2, 
  Users, MapPin, Calendar, TrendingUp, FileText, ShoppingCart, Check, X,
  Eye, Info, Percent, DollarSign, Layers
} from 'lucide-react';

/**
 * ENHANCED PR-TO-PO CONVERSION WITH CONSUMPTION TRACKING
 * 
 * Complete workflow for converting approved PRs into POs with:
 * - Multi-PR clubbing logic
 * - PR consumption tracking (full/partial)
 * - Line item level mapping
 * - Budget reconciliation
 * - Traceability audit trail
 * 
 * PR Consumption States:
 * - Open: 0% consumed
 * - Partially Consumed: 1-99% consumed (split across multiple POs)
 * - Fully Consumed: 100% consumed (converted to PO)
 * - Closed: Manually closed/cancelled
 */

type PRType = 'Catalogue' | 'Regular' | 'Service' | 'Kit/Bundle' | 'Asset/CAPEX' | 'Blanket';
type PRConsumptionStatus = 'Open' | 'Partially Consumed' | 'Fully Consumed' | 'Closed';

interface PRLineItem {
  id: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  quantityConsumed: number; // Already converted to PO
  quantityRemaining: number;
  unitPrice: number;
  totalAmount: number;
  deliveryDate: string;
  costCentre: string;
}

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
  amountConsumed: number; // Already converted to PO
  amountRemaining: number;
  itemCount: number;
  consumptionStatus: PRConsumptionStatus;
  consumptionPercentage: number;
  vendor?: string;
  shipTo?: string;
  createdDate: string;
  approvedDate: string;
  lineItems: PRLineItem[];
  prHistory: PRConsumptionHistory[];
}

interface PRConsumptionHistory {
  id: string;
  poNumber: string;
  poDate: string;
  amountConsumed: number;
  itemsConsumed: number;
  status: 'Created' | 'Cancelled';
}

interface PODraft {
  id: string;
  vendor: string;
  prIds: string[];
  totalAmount: number;
  itemCount: number;
  needByDate: string;
  shipTo: string;
  costCentre: string;
  groupingReason: string;
  lineItems: POLineItem[];
}

interface POLineItem {
  prId: string;
  prLineItemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  deliveryDate: string;
  costCentre: string;
}

type GroupingMode = 'vendor' | 'shipTo' | 'costCentre' | 'needByDate';

// Mock data with consumption tracking
const mockApprovedPRs: ApprovedPR[] = [
  {
    id: 'PR-2024-001',
    prType: 'Catalogue',
    entity: 'India HQ',
    requestor: 'Rajesh Kumar',
    department: 'IT',
    costCentre: 'CC-IT-001',
    needByDate: '2024-12-20',
    totalAmount: 325000,
    amountConsumed: 0,
    amountRemaining: 325000,
    itemCount: 3,
    consumptionStatus: 'Open',
    consumptionPercentage: 0,
    vendor: 'Dell India',
    shipTo: 'Bangalore Office',
    createdDate: '2024-12-10',
    approvedDate: '2024-12-11',
    lineItems: [
      { id: 'LI-001-1', itemCode: 'DELL-LAP-001', itemName: 'Dell Latitude 5430', quantity: 5, quantityConsumed: 0, quantityRemaining: 5, unitPrice: 55000, totalAmount: 275000, deliveryDate: '2024-12-20', costCentre: 'CC-IT-001' },
      { id: 'LI-001-2', itemCode: 'DELL-MON-001', itemName: 'Dell 24" Monitor', quantity: 5, quantityConsumed: 0, quantityRemaining: 5, unitPrice: 10000, totalAmount: 50000, deliveryDate: '2024-12-20', costCentre: 'CC-IT-001' }
    ],
    prHistory: []
  },
  {
    id: 'PR-2024-002',
    prType: 'Regular',
    entity: 'India HQ',
    requestor: 'Priya Sharma',
    department: 'Operations',
    costCentre: 'CC-OPS-002',
    needByDate: '2024-12-25',
    totalAmount: 1250000,
    amountConsumed: 500000,
    amountRemaining: 750000,
    itemCount: 8,
    consumptionStatus: 'Partially Consumed',
    consumptionPercentage: 40,
    vendor: 'Steel Corp India',
    shipTo: 'Mumbai Plant',
    createdDate: '2024-12-12',
    approvedDate: '2024-12-13',
    lineItems: [
      { id: 'LI-002-1', itemCode: 'STEEL-ROD-12', itemName: 'Steel Rod 12mm', quantity: 1000, quantityConsumed: 400, quantityRemaining: 600, unitPrice: 850, totalAmount: 850000, deliveryDate: '2024-12-25', costCentre: 'CC-OPS-002' },
      { id: 'LI-002-2', itemCode: 'STEEL-ROD-16', itemName: 'Steel Rod 16mm', quantity: 500, quantityConsumed: 0, quantityRemaining: 500, unitPrice: 800, totalAmount: 400000, deliveryDate: '2024-12-25', costCentre: 'CC-OPS-002' }
    ],
    prHistory: [
      { id: 'HIST-001', poNumber: 'PO-2024-0145', poDate: '2024-12-14', amountConsumed: 500000, itemsConsumed: 1, status: 'Created' }
    ]
  },
  {
    id: 'PR-2024-006',
    prType: 'Asset/CAPEX',
    entity: 'India HQ',
    requestor: 'Ramesh Gupta',
    department: 'Operations',
    costCentre: 'CC-OPS-001',
    needByDate: '2025-01-15',
    totalAmount: 5500000,
    amountConsumed: 0,
    amountRemaining: 5500000,
    itemCount: 1,
    consumptionStatus: 'Open',
    consumptionPercentage: 0,
    vendor: 'Siemens India',
    shipTo: 'Mumbai Plant',
    createdDate: '2024-12-08',
    approvedDate: '2024-12-10',
    lineItems: [
      { id: 'LI-006-1', itemCode: 'SIE-IND-EQ-001', itemName: 'Industrial CNC Machine', quantity: 1, quantityConsumed: 0, quantityRemaining: 1, unitPrice: 5500000, totalAmount: 5500000, deliveryDate: '2025-01-15', costCentre: 'CC-OPS-001' }
    ],
    prHistory: []
  },
  {
    id: 'PR-2024-014',
    prType: 'Catalogue',
    entity: 'India HQ',
    requestor: 'Lakshmi Iyer',
    department: 'IT',
    costCentre: 'CC-IT-002',
    needByDate: '2024-12-25',
    totalAmount: 280000,
    amountConsumed: 0,
    amountRemaining: 280000,
    itemCount: 4,
    consumptionStatus: 'Open',
    consumptionPercentage: 0,
    vendor: 'Dell India',
    shipTo: 'Bangalore Office',
    createdDate: '2024-12-13',
    approvedDate: '2024-12-14',
    lineItems: [
      { id: 'LI-014-1', itemCode: 'DELL-LAP-001', itemName: 'Dell Latitude 5430', quantity: 3, quantityConsumed: 0, quantityRemaining: 3, unitPrice: 55000, totalAmount: 165000, deliveryDate: '2024-12-25', costCentre: 'CC-IT-002' },
      { id: 'LI-014-2', itemCode: 'DELL-MON-001', itemName: 'Dell 24" Monitor', quantity: 3, quantityConsumed: 0, quantityRemaining: 3, unitPrice: 10000, totalAmount: 30000, deliveryDate: '2024-12-25', costCentre: 'CC-IT-002' },
      { id: 'LI-014-3', itemCode: 'DELL-KB-001', itemName: 'Dell Wireless Keyboard', quantity: 3, quantityConsumed: 0, quantityRemaining: 3, unitPrice: 2500, totalAmount: 7500, deliveryDate: '2024-12-25', costCentre: 'CC-IT-002' }
    ],
    prHistory: []
  }
];

export function PRtoPOConversionEnhanced() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedPRIds = searchParams.get('prIds')?.split(',') || [];

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedPRs, setSelectedPRs] = useState<string[]>(preSelectedPRIds);
  const [selectedEntity, setSelectedEntity] = useState<string>('India HQ');
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('vendor');
  const [poDrafts, setPODrafts] = useState<PODraft[]>([]);
  const [showConsumptionDetails, setShowConsumptionDetails] = useState<string | null>(null);

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

  const getConsumptionColor = (status: PRConsumptionStatus) => {
    switch (status) {
      case 'Open': return { bg: '#E8F5E9', color: '#2E7D32', border: '#81C784' };
      case 'Partially Consumed': return { bg: '#FEF3C7', color: '#D97706', border: '#FCD34D' };
      case 'Fully Consumed': return { bg: '#E0F2FE', color: '#0284C7', border: '#7DD3FC' };
      case 'Closed': return { bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5' };
      default: return { bg: '#F6F9FC', color: '#6E7A82', border: '#E1E6EA' };
    }
  };

  const filteredPRs = mockApprovedPRs.filter(pr => 
    pr.entity === selectedEntity && 
    (pr.consumptionStatus === 'Open' || pr.consumptionStatus === 'Partially Consumed')
  );

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

  const generatePODrafts = () => {
    const selectedPRData = mockApprovedPRs.filter(pr => selectedPRs.includes(pr.id));
    let grouped: Record<string, ApprovedPR[]> = {};

    // Group PRs based on selected mode
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

    // Generate PO drafts with line items
    const drafts: PODraft[] = Object.entries(grouped).map(([key, prs], idx) => {
      const allLineItems: POLineItem[] = [];
      
      // Collect all remaining (unconsumed) line items from all PRs in this group
      prs.forEach(pr => {
        pr.lineItems.forEach(li => {
          if (li.quantityRemaining > 0) {
            allLineItems.push({
              prId: pr.id,
              prLineItemId: li.id,
              itemCode: li.itemCode,
              itemName: li.itemName,
              quantity: li.quantityRemaining, // Only unconsumed quantity
              unitPrice: li.unitPrice,
              totalAmount: li.quantityRemaining * li.unitPrice,
              deliveryDate: li.deliveryDate,
              costCentre: li.costCentre
            });
          }
        });
      });

      return {
        id: `PO-DRAFT-${Date.now()}-${idx + 1}`,
        vendor: groupingMode === 'vendor' ? key : prs[0].vendor || 'TBD',
        prIds: prs.map(pr => pr.id),
        totalAmount: allLineItems.reduce((sum, li) => sum + li.totalAmount, 0),
        itemCount: allLineItems.length,
        needByDate: prs.sort((a, b) => new Date(a.needByDate).getTime() - new Date(b.needByDate).getTime())[0].needByDate,
        shipTo: groupingMode === 'shipTo' ? key : prs[0].shipTo || 'TBD',
        costCentre: groupingMode === 'costCentre' ? key : prs[0].costCentre,
        groupingReason: `Grouped by ${groupingMode}`,
        lineItems: allLineItems
      };
    });

    setPODrafts(drafts);
    setStep(3);
  };

  const createPOs = () => {
    // In a real implementation, this would:
    // 1. Create PO records in the database
    // 2. Update PR consumption status
    // 3. Create PR-PO linkage records
    // 4. Update line item consumption quantities
    // 5. Generate audit trail entries
    
    console.log('Creating POs with consumption tracking:', {
      poDrafts,
      consumptionUpdates: poDrafts.map(po => ({
        poId: po.id,
        prIds: po.prIds,
        lineItems: po.lineItems.map(li => ({
          prId: li.prId,
          prLineItemId: li.prLineItemId,
          quantityConsumed: li.quantity
        }))
      }))
    });

    alert(`${poDrafts.length} PO(s) created successfully with full PR consumption tracking!`);
    navigate('/purchase-orders');
  };

  // Step 1: PR Selection
  const renderPRSelection = () => (
    <div>
      {/* Entity Filter */}
      <div className="mb-6">
        <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
          Select Entity
        </label>
        <select
          value={selectedEntity}
          onChange={(e) => setSelectedEntity(e.target.value)}
          className="w-full md:w-96 px-4 py-2 rounded-lg"
          style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
        >
          <option value="India HQ">India HQ</option>
          <option value="India Manufacturing">India Manufacturing</option>
          <option value="US Operations">US Operations</option>
        </select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
          <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Total PRs Available</p>
          <p className="text-2xl" style={{ color: '#0A0F14' }}>{filteredPRs.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
          <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Selected PRs</p>
          <p className="text-2xl" style={{ color: '#00A9B7' }}>{selectedPRs.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
          <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Total Value (Selected)</p>
          <p className="text-xl" style={{ color: '#0A0F14' }}>
            {formatCurrency(
              mockApprovedPRs
                .filter(pr => selectedPRs.includes(pr.id))
                .reduce((sum, pr) => sum + pr.amountRemaining, 0)
            )}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
          <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Partially Consumed PRs</p>
          <p className="text-2xl" style={{ color: '#D97706' }}>
            {filteredPRs.filter(pr => pr.consumptionStatus === 'Partially Consumed').length}
          </p>
        </div>
      </div>

      {/* PR List */}
      <div className="space-y-4">
        {filteredPRs.map(pr => {
          const isSelected = selectedPRs.includes(pr.id);
          const typeColor = getTypeColor(pr.prType);
          const consumptionColor = getConsumptionColor(pr.consumptionStatus);
          const showDetails = showConsumptionDetails === pr.id;

          return (
            <div
              key={pr.id}
              className="bg-white rounded-lg"
              style={{ 
                border: isSelected ? '2px solid #00A9B7' : '1px solid #E1E6EA',
                backgroundColor: isSelected ? '#F6FFFE' : '#FFFFFF'
              }}
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <div className="flex items-center pt-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => togglePRSelection(pr.id)}
                      className="w-5 h-5 rounded"
                      style={{ accentColor: '#00A9B7' }}
                    />
                  </div>

                  {/* PR Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <h3 className="text-sm" style={{ color: '#0A0F14' }}>{pr.id}</h3>
                      
                      {/* PR Type Badge */}
                      <span
                        className="px-2 py-1 rounded text-xs"
                        style={{ backgroundColor: typeColor.bg, color: typeColor.color }}
                      >
                        {pr.prType}
                      </span>

                      {/* Consumption Status Badge */}
                      <span
                        className="px-2 py-1 rounded text-xs flex items-center gap-1"
                        style={{
                          backgroundColor: consumptionColor.bg,
                          color: consumptionColor.color,
                          border: `1px solid ${consumptionColor.border}`
                        }}
                      >
                        <Percent className="w-3 h-3" />
                        {pr.consumptionPercentage}% Consumed
                      </span>

                      {pr.consumptionStatus === 'Partially Consumed' && (
                        <button
                          onClick={() => setShowConsumptionDetails(showDetails ? null : pr.id)}
                          className="px-2 py-1 rounded text-xs flex items-center gap-1"
                          style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}
                        >
                          <Eye className="w-3 h-3" />
                          View History
                        </button>
                      )}
                    </div>

                    {/* PR Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3 text-xs">
                      <div>
                        <p style={{ color: '#6E7A82' }} className="mb-0.5">Requestor</p>
                        <p style={{ color: '#0A0F14' }}>{pr.requestor}</p>
                      </div>
                      <div>
                        <p style={{ color: '#6E7A82' }} className="mb-0.5">Vendor</p>
                        <p style={{ color: '#0A0F14' }}>{pr.vendor || 'TBD'}</p>
                      </div>
                      <div>
                        <p style={{ color: '#6E7A82' }} className="mb-0.5">Amount Remaining</p>
                        <p style={{ color: '#00A9B7' }}>{formatCurrency(pr.amountRemaining)}</p>
                      </div>
                      <div>
                        <p style={{ color: '#6E7A82' }} className="mb-0.5">Items</p>
                        <p style={{ color: '#0A0F14' }}>{pr.lineItems.filter(li => li.quantityRemaining > 0).length} items</p>
                      </div>
                      <div>
                        <p style={{ color: '#6E7A82' }} className="mb-0.5">Need By</p>
                        <p style={{ color: '#0A0F14' }}>{pr.needByDate}</p>
                      </div>
                    </div>

                    {/* Consumption History (if partially consumed) */}
                    {showDetails && pr.prHistory.length > 0 && (
                      <div 
                        className="mt-3 p-3 rounded-lg"
                        style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}
                      >
                        <p className="text-xs mb-2" style={{ color: '#D97706' }}>
                          <strong>PR Consumption History:</strong>
                        </p>
                        <div className="space-y-2">
                          {pr.prHistory.map(history => (
                            <div 
                              key={history.id}
                              className="flex items-center justify-between text-xs p-2 rounded"
                              style={{ backgroundColor: '#FFFFFF' }}
                            >
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4" style={{ color: '#D97706' }} />
                                <span style={{ color: '#0A0F14' }}>{history.poNumber}</span>
                                <span style={{ color: '#6E7A82' }}>({history.poDate})</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span style={{ color: '#0A0F14' }}>
                                  {formatCurrency(history.amountConsumed)}
                                </span>
                                <span 
                                  className="px-2 py-0.5 rounded"
                                  style={{
                                    backgroundColor: history.status === 'Created' ? '#E8F5E9' : '#FEE2E2',
                                    color: history.status === 'Created' ? '#2E7D32' : '#DC2626'
                                  }}
                                >
                                  {history.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={() => navigate('/procurement')}
          className="flex items-center gap-2 px-6 py-3 rounded-lg"
          style={{ color: '#6E7A82', backgroundColor: '#F6F9FC' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel
        </button>

        <button
          onClick={validateAndProceed}
          disabled={selectedPRs.length === 0}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white"
          style={{
            backgroundColor: selectedPRs.length > 0 ? '#00A9B7' : '#E1E6EA',
            cursor: selectedPRs.length > 0 ? 'pointer' : 'not-allowed'
          }}
        >
          Continue to Grouping
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // Step 2: Grouping Mode Selection
  const renderGroupingSelection = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-xl mb-2" style={{ color: '#0A0F14' }}>
          How should we group these PRs into POs?
        </h2>
        <p className="text-sm" style={{ color: '#6E7A82' }}>
          Select the grouping logic to intelligently club multiple PRs into purchase orders
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Group by Vendor */}
        <button
          onClick={() => setGroupingMode('vendor')}
          className="p-6 rounded-lg text-left transition-all"
          style={{
            border: groupingMode === 'vendor' ? '2px solid #00A9B7' : '1px solid #E1E6EA',
            backgroundColor: groupingMode === 'vendor' ? '#F6FFFE' : '#FFFFFF'
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#E8F7F8' }}
            >
              <Building2 className="w-5 h-5" style={{ color: '#00A9B7' }} />
            </div>
            <h3 className="text-sm" style={{ color: '#0A0F14' }}>Group by Vendor</h3>
          </div>
          <p className="text-xs" style={{ color: '#6E7A82' }}>
            Create one PO per vendor. Best for vendor consolidation and simplified payments.
          </p>
        </button>

        {/* Group by Ship-To */}
        <button
          onClick={() => setGroupingMode('shipTo')}
          className="p-6 rounded-lg text-left transition-all"
          style={{
            border: groupingMode === 'shipTo' ? '2px solid #00A9B7' : '1px solid #E1E6EA',
            backgroundColor: groupingMode === 'shipTo' ? '#F6FFFE' : '#FFFFFF'
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#E8F5E9' }}
            >
              <MapPin className="w-5 h-5" style={{ color: '#2E7D32' }} />
            </div>
            <h3 className="text-sm" style={{ color: '#0A0F14' }}>Group by Ship-To</h3>
          </div>
          <p className="text-xs" style={{ color: '#6E7A82' }}>
            Create one PO per delivery location. Best for logistics planning and receiving.
          </p>
        </button>

        {/* Group by Cost Centre */}
        <button
          onClick={() => setGroupingMode('costCentre')}
          className="p-6 rounded-lg text-left transition-all"
          style={{
            border: groupingMode === 'costCentre' ? '2px solid #00A9B7' : '1px solid #E1E6EA',
            backgroundColor: groupingMode === 'costCentre' ? '#F6FFFE' : '#FFFFFF'
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#FEF3C7' }}
            >
              <DollarSign className="w-5 h-5" style={{ color: '#D97706' }} />
            </div>
            <h3 className="text-sm" style={{ color: '#0A0F14' }}>Group by Cost Centre</h3>
          </div>
          <p className="text-xs" style={{ color: '#6E7A82' }}>
            Create one PO per cost centre. Best for budget tracking and departmental accounting.
          </p>
        </button>

        {/* Group by Need-By Date */}
        <button
          onClick={() => setGroupingMode('needByDate')}
          className="p-6 rounded-lg text-left transition-all"
          style={{
            border: groupingMode === 'needByDate' ? '2px solid #00A9B7' : '1px solid #E1E6EA',
            backgroundColor: groupingMode === 'needByDate' ? '#F6FFFE' : '#FFFFFF'
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#E3F2FD' }}
            >
              <Calendar className="w-5 h-5" style={{ color: '#1976D2' }} />
            </div>
            <h3 className="text-sm" style={{ color: '#0A0F14' }}>Group by Need-By Date</h3>
          </div>
          <p className="text-xs" style={{ color: '#6E7A82' }}>
            Create one PO per delivery date. Best for production planning and JIT inventory.
          </p>
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep(1)}
          className="flex items-center gap-2 px-6 py-3 rounded-lg"
          style={{ color: '#6E7A82', backgroundColor: '#F6F9FC' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to PR Selection
        </button>

        <button
          onClick={generatePODrafts}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white"
          style={{ backgroundColor: '#00A9B7' }}
        >
          Generate PO Drafts
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // Step 3: PO Preview & Confirmation
  const renderPOPreview = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-xl mb-2" style={{ color: '#0A0F14' }}>
          Review & Confirm PO Drafts
        </h2>
        <p className="text-sm" style={{ color: '#6E7A82' }}>
          {poDrafts.length} PO(s) will be created from {selectedPRs.length} PR(s)
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
          <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Total POs to Create</p>
          <p className="text-2xl" style={{ color: '#00A9B7' }}>{poDrafts.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
          <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Total Value</p>
          <p className="text-xl" style={{ color: '#0A0F14' }}>
            {formatCurrency(poDrafts.reduce((sum, po) => sum + po.totalAmount, 0))}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
          <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Total Line Items</p>
          <p className="text-2xl" style={{ color: '#0A0F14' }}>
            {poDrafts.reduce((sum, po) => sum + po.itemCount, 0)}
          </p>
        </div>
      </div>

      {/* PO Drafts */}
      <div className="space-y-4">
        {poDrafts.map((po, idx) => (
          <div
            key={po.id}
            className="bg-white rounded-lg p-6"
            style={{ border: '1px solid #E1E6EA' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg mb-2" style={{ color: '#0A0F14' }}>
                  PO #{idx + 1} - {po.vendor}
                </h3>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#E8F7F8', color: '#00A9B7' }}>
                    {po.prIds.length} PRs
                  </span>
                  <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#E8F5E9', color: '#2E7D32' }}>
                    {po.itemCount} items
                  </span>
                  <span className="text-xs" style={{ color: '#6E7A82' }}>
                    Ship to: {po.shipTo}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Total Amount</p>
                <p className="text-xl" style={{ color: '#00A9B7' }}>{formatCurrency(po.totalAmount)}</p>
              </div>
            </div>

            {/* PR References */}
            <div className="mb-4">
              <p className="text-xs mb-2" style={{ color: '#6E7A82' }}>Source PRs:</p>
              <div className="flex items-center gap-2 flex-wrap">
                {po.prIds.map(prId => (
                  <span 
                    key={prId}
                    className="text-xs px-2 py-1 rounded"
                    style={{ backgroundColor: '#F6F9FC', color: '#0A0F14' }}
                  >
                    {prId}
                  </span>
                ))}
              </div>
            </div>

            {/* Line Items Table */}
            <div 
              className="rounded-lg overflow-hidden"
              style={{ border: '1px solid #E1E6EA' }}
            >
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#F6F9FC' }}>
                    <th className="text-left p-3 text-xs" style={{ color: '#6E7A82' }}>Item</th>
                    <th className="text-left p-3 text-xs" style={{ color: '#6E7A82' }}>From PR</th>
                    <th className="text-right p-3 text-xs" style={{ color: '#6E7A82' }}>Qty</th>
                    <th className="text-right p-3 text-xs" style={{ color: '#6E7A82' }}>Unit Price</th>
                    <th className="text-right p-3 text-xs" style={{ color: '#6E7A82' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {po.lineItems.map((li, liIdx) => (
                    <tr 
                      key={`${po.id}-${liIdx}`}
                      style={{ borderTop: '1px solid #E1E6EA' }}
                    >
                      <td className="p-3">
                        <p className="text-xs" style={{ color: '#0A0F14' }}>{li.itemName}</p>
                        <p className="text-xs" style={{ color: '#6E7A82' }}>{li.itemCode}</p>
                      </td>
                      <td className="p-3">
                        <span 
                          className="text-xs px-2 py-0.5 rounded"
                          style={{ backgroundColor: '#E8F7F8', color: '#00A9B7' }}
                        >
                          {li.prId}
                        </span>
                      </td>
                      <td className="p-3 text-right text-xs" style={{ color: '#0A0F14' }}>{li.quantity}</td>
                      <td className="p-3 text-right text-xs" style={{ color: '#0A0F14' }}>₹{li.unitPrice.toLocaleString()}</td>
                      <td className="p-3 text-right text-xs" style={{ color: '#0A0F14' }}>
                        ₹{li.totalAmount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={() => setStep(2)}
          className="flex items-center gap-2 px-6 py-3 rounded-lg"
          style={{ color: '#6E7A82', backgroundColor: '#F6F9FC' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Change Grouping
        </button>

        <button
          onClick={createPOs}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white"
          style={{ backgroundColor: '#00A9B7' }}
        >
          <CheckCircle className="w-4 h-4" />
          Create {poDrafts.length} PO(s)
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }} className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/procurement')}
            className="p-2 rounded-lg"
            style={{ color: '#6E7A82', backgroundColor: '#FFFFFF', border: '1px solid #E1E6EA' }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-3xl" style={{ color: '#0A0F14' }}>
              PR to PO Conversion
            </h1>
            <p className="text-sm" style={{ color: '#6E7A82' }}>
              Convert approved Purchase Requisitions into Purchase Orders with full consumption tracking
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-4">
          {[
            { num: 1, label: 'Select PRs' },
            { num: 2, label: 'Grouping' },
            { num: 3, label: 'Review & Create' }
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                  style={{
                    backgroundColor: step >= s.num ? '#00A9B7' : '#E1E6EA',
                    color: step >= s.num ? '#FFFFFF' : '#6E7A82'
                  }}
                >
                  {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span 
                  className="text-sm"
                  style={{ color: step >= s.num ? '#0A0F14' : '#6E7A82' }}
                >
                  {s.label}
                </span>
              </div>
              {idx < 2 && (
                <div 
                  className="w-12 h-0.5"
                  style={{ backgroundColor: step > s.num ? '#00A9B7' : '#E1E6EA' }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {step === 1 && renderPRSelection()}
      {step === 2 && renderGroupingSelection()}
      {step === 3 && renderPOPreview()}
    </div>
  );
}