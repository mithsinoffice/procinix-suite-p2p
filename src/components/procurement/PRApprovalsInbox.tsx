import { useState } from 'react';
import { CheckCircle, X, MessageCircle, FileText, Clock, AlertCircle, Shield, TrendingDown, Eye, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProcurementData } from '../../contexts/ProcurementDataContext';

type PRStatus = 'Submitted' | 'In Review';
type PRType = 'Catalogue' | 'Regular' | 'Service' | 'Kit/Bundle' | 'Asset/CAPEX' | 'Blanket';
type AIRiskLevel = 'Low' | 'Medium' | 'High';
type PolicyFlag = 'Budget Breach' | 'Vendor Risk' | 'Price Variance' | 'Missing Docs' | 'None';

interface PendingPR {
  id: string;
  prType: PRType;
  entity: string;
  requestor: string;
  department: string;
  costCentre: string;
  totalAmount: number;
  agingDays: number;
  policyFlags: PolicyFlag[];
  aiRiskLevel: AIRiskLevel;
  needByDate: string;
  submittedDate: string;
  itemCount: number;
  justification: string;
}

export function PRApprovalsInbox() {
  const navigate = useNavigate();
  const { purchaseRequests, updatePurchaseRequestStatus } = useProcurementData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<AIRiskLevel | 'All'>('All');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<PRType | 'All'>('All');
  const [showFilters, setShowFilters] = useState(false);

  const formatCurrency = (amount: number) => `₹${(amount / 100000).toFixed(2)} L`;

  const getTypeColor = (type: PRType) => {
    switch (type) {
      case 'Catalogue': return { bg: 'var(--color-teal-tint)', color: 'var(--color-teal)' };
      case 'Regular': return { bg: 'var(--color-success-light)', color: 'var(--color-success-dark)' };
      case 'Service': return { bg: '#E3F2FD', color: '#1976D2' };
      case 'Kit/Bundle': return { bg: '#F3E5F5', color: '#7B1FA2' };
      case 'Asset/CAPEX': return { bg: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' };
      case 'Blanket': return { bg: '#E1F5FE', color: '#0277BD' };
      default: return { bg: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' };
    }
  };

  const getRiskColor = (risk: AIRiskLevel) => {
    switch (risk) {
      case 'Low': return { bg: 'var(--color-success-light)', color: 'var(--color-success-dark)' };
      case 'Medium': return { bg: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' };
      case 'High': return { bg: 'var(--color-error-light)', color: 'var(--color-error-dark)' };
    }
  };

  const getPolicyFlagColor = (flag: PolicyFlag) => {
    switch (flag) {
      case 'Budget Breach': return { bg: 'var(--color-error-light)', color: 'var(--color-error-dark)' };
      case 'Vendor Risk': return { bg: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' };
      case 'Price Variance': return { bg: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' };
      case 'Missing Docs': return { bg: '#FFE5E5', color: 'var(--color-error-dark)' };
      default: return { bg: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' };
    }
  };

  const getAgingColor = (days: number) => {
    if (days <= 2) return 'var(--color-success-dark)';
    if (days <= 5) return 'var(--color-warning-dark)';
    return 'var(--color-error-dark)';
  };

  const persistedPendingPRs: PendingPR[] = purchaseRequests
    .filter((request) => ['Submitted', 'Pending Approval', 'In Review'].includes(request.status))
    .map((request) => ({
      id: request.prNumber,
      prType: request.type,
      entity: request.entity,
      requestor: request.requestor,
      department: request.department,
      costCentre: request.costCentre,
      totalAmount: request.totalAmount,
      agingDays: request.agingDays ?? 0,
      policyFlags: (request.policyFlags.length ? request.policyFlags : ['None']) as PolicyFlag[],
      aiRiskLevel: request.aiRiskLevel,
      needByDate: request.needByDate,
      submittedDate: request.submittedDate ?? request.createdDate,
      itemCount: request.itemCount,
      justification: request.justification
    }));

  // Apply filters
  const filteredPRs = persistedPendingPRs.filter(pr => {
    const matchesSearch = pr.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pr.requestor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pr.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = selectedRiskFilter === 'All' || pr.aiRiskLevel === selectedRiskFilter;
    const matchesType = selectedTypeFilter === 'All' || pr.prType === selectedTypeFilter;
    
    return matchesSearch && matchesRisk && matchesType;
  });

  const stats = {
    pending: filteredPRs.length,
    urgent: filteredPRs.filter(pr => pr.agingDays >= 5 || pr.aiRiskLevel === 'High').length,
    totalValue: filteredPRs.reduce((sum, pr) => sum + pr.totalAmount, 0),
    highRisk: filteredPRs.filter(pr => pr.aiRiskLevel === 'High').length
  };

  const handleAction = (
    prId: string,
    action: 'approve' | 'reject' | 'request_info',
  ) => {
    const matchingRequest = purchaseRequests.find((request) => request.prNumber === prId);
    if (!matchingRequest) {
      return;
    }

    if (action === 'approve') {
      updatePurchaseRequestStatus(matchingRequest.id, 'Approved', {
        nextApprover: '—',
      });
      return;
    }

    if (action === 'reject') {
      updatePurchaseRequestStatus(matchingRequest.id, 'Rejected', {
        nextApprover: '—',
      });
      return;
    }

    updatePurchaseRequestStatus(matchingRequest.id, 'In Review', {
      nextApprover: matchingRequest.requestor,
    });
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl mb-2" style={{ color: 'var(--color-ink)', margin: 0 }}>PR Approvals Inbox</h1>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>Review and approve purchase requisitions</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--color-warning-light)', border: '1px solid #FFB74D' }}>
            <Clock className="w-4 h-4" style={{ color: 'var(--color-warning-dark)' }} />
            <span className="text-sm" style={{ color: 'var(--color-warning-dark)', fontWeight: '600' }}>{stats.pending} Pending Approval</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--color-mercury-grey)' }} />
          <input
            type="text"
            placeholder="Search by PR ID, requestor, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
            style={{ border: '1px solid var(--color-silver)', backgroundColor: '#FFFFFF', color: 'var(--color-ink)' }}
          />
        </div>
      </div>

      <div className="p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Pending Approvals</p>
            <p className="text-2xl" style={{ color: 'var(--color-warning-dark)', fontWeight: '600' }}>{stats.pending}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Urgent PRs</p>
            <p className="text-2xl" style={{ color: 'var(--color-error-dark)', fontWeight: '600' }}>{stats.urgent}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>High Risk</p>
            <p className="text-2xl" style={{ color: 'var(--color-error-dark)', fontWeight: '600' }}>{stats.highRisk}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Total Value</p>
            <p className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{formatCurrency(stats.totalValue)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg mb-6 p-4" style={{ border: '1px solid var(--color-silver)' }}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
              <span className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>Filters:</span>
            </div>
            
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value as PRType | 'All')}
              className="px-3 py-1.5 rounded-lg text-sm"
              style={{ border: '1px solid var(--color-silver)', backgroundColor: 'var(--color-cloud)', color: 'var(--color-ink)' }}
            >
              <option value="All">All Types</option>
              <option>Catalogue</option>
              <option>Regular</option>
              <option>Service</option>
              <option>Kit/Bundle</option>
              <option>Asset/CAPEX</option>
              <option>Blanket</option>
            </select>

            <select
              value={selectedRiskFilter}
              onChange={(e) => setSelectedRiskFilter(e.target.value as AIRiskLevel | 'All')}
              className="px-3 py-1.5 rounded-lg text-sm"
              style={{ border: '1px solid var(--color-silver)', backgroundColor: 'var(--color-cloud)', color: 'var(--color-ink)' }}
            >
              <option value="All">All Risk Levels</option>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
        </div>

        {/* PR Cards */}
        <div className="space-y-6">
          {filteredPRs.map((pr) => {
            const typeStyle = getTypeColor(pr.prType);
            const riskStyle = getRiskColor(pr.aiRiskLevel);
            const agingColor = getAgingColor(pr.agingDays);
            
            return (
              <div key={pr.id} className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)' }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base" style={{ color: 'var(--color-ink)', fontWeight: '600', margin: 0 }}>{pr.id}</h3>
                      <span className="px-2 py-1 rounded text-xs" style={typeStyle}>{pr.prType} PR</span>
                      <span className="px-2 py-1 rounded text-xs" style={riskStyle}>
                        <Shield className="w-3 h-3 inline mr-1" />
                        {pr.aiRiskLevel} Risk
                      </span>
                      {pr.agingDays >= 5 && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-error-light)' }}>
                          <Clock className="w-3 h-3" style={{ color: 'var(--color-error-dark)' }} />
                          <span className="text-xs" style={{ color: 'var(--color-error-dark)', fontWeight: '600' }}>URGENT</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm mb-3" style={{ color: 'var(--color-mercury-grey)' }}>
                      Requested by <strong style={{ color: 'var(--color-ink)' }}>{pr.requestor}</strong> • {pr.department} • {pr.costCentre}
                    </p>
                    <p className="text-sm mb-4" style={{ color: 'var(--color-ink)' }}>{pr.justification}</p>
                    
                    {/* Key Details Grid */}
                    <div className="grid grid-cols-5 gap-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)' }}>
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Amount</p>
                        <p className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{formatCurrency(pr.totalAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Items</p>
                        <p className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{pr.itemCount} line items</p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Need-by Date</p>
                        <p className="text-sm" style={{ color: 'var(--color-error-dark)', fontWeight: '600' }}>{pr.needByDate}</p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Pending Days</p>
                        <p className="text-sm" style={{ color: agingColor, fontWeight: '600' }}>{pr.agingDays} days</p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Entity</p>
                        <p className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{pr.entity}</p>
                      </div>
                    </div>

                    {/* Policy Flags */}
                    {pr.policyFlags.length > 0 && pr.policyFlags[0] !== 'None' && (
                      <div className="mt-4">
                        <p className="text-xs mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Policy Flags:</p>
                        <div className="flex flex-wrap gap-2">
                          {pr.policyFlags.map((flag, idx) => {
                            const flagStyle = getPolicyFlagColor(flag);
                            return (
                              <span key={idx} className="px-2 py-1 rounded text-xs flex items-center gap-1" style={flagStyle}>
                                <AlertCircle className="w-3 h-3" />
                                {flag}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--color-silver)' }}>
                  <button 
                    className="px-4 py-2 rounded-lg text-sm flex items-center gap-2" 
                    style={{ backgroundColor: 'var(--color-cloud)', border: '1px solid var(--color-silver)', color: 'var(--color-teal)' }}
                    onClick={() => navigate(`/procurement/pr/detail/${pr.id}`)}
                  >
                    <Eye className="w-4 h-4" />
                    View Details & AI Insights
                  </button>
                  
                  <div className="flex items-center gap-3">
                    <button
                      className="px-4 py-2 rounded-lg text-sm"
                      style={{ backgroundColor: 'var(--color-warning-light)', border: '1px solid #FFB74D', color: 'var(--color-warning-dark)' }}
                      onClick={() => handleAction(pr.id, 'request_info')}
                    >
                      <MessageCircle className="w-4 h-4 inline mr-2" />
                      Ask for Info
                    </button>
                    <button
                      className="px-4 py-2 rounded-lg text-sm"
                      style={{ backgroundColor: 'var(--color-error-light)', border: '1px solid #FCA5A5', color: 'var(--color-error-dark)' }}
                      onClick={() => handleAction(pr.id, 'reject')}
                    >
                      <X className="w-4 h-4 inline mr-2" />
                      Reject
                    </button>
                    <button
                      className="px-4 py-2 rounded-lg text-white text-sm"
                      style={{ backgroundColor: 'var(--color-success-dark)' }}
                      onClick={() => handleAction(pr.id, 'approve')}
                    >
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredPRs.length === 0 && (
          <div className="bg-white rounded-lg p-12 text-center" style={{ border: '1px solid var(--color-silver)' }}>
            <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-success-dark)' }} />
            <h3 className="text-base mb-2" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>No Pending Approvals</h3>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>You're all caught up! No PRs require your approval at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
}
