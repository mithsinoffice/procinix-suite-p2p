import { CheckCircle, X, MessageCircle, FileText, Clock, AlertCircle } from 'lucide-react';
import { useProcurementData } from '../../contexts/ProcurementDataContext';

export function PRApprovals() {
  const { purchaseRequests, updatePurchaseRequestStatus } = useProcurementData();
  const formatCurrency = (amount: number) => `₹${(amount / 100000).toFixed(2)} L`;

  const persistedPendingPRs = purchaseRequests
    .filter((request) => ['Submitted', 'Pending Approval', 'In Review'].includes(request.status))
    .map((request) => ({
      id: request.prNumber,
      requestor: request.requestor,
      type: request.type,
      department: request.department,
      amount: request.totalAmount,
      needByDate: request.needByDate,
      submittedDate: request.submittedDate ?? request.createdDate,
      priority: request.aiRiskLevel === 'High' ? 'Urgent' : 'Normal',
      items: request.itemCount,
      justification: request.justification
    }));

  const allPendingPRs = persistedPendingPRs;

  const handleAction = (
    prId: string,
    action: 'approve' | 'reject' | 'request_info',
  ) => {
    const matchingRequest = purchaseRequests.find((request) => request.prNumber === prId);
    if (!matchingRequest) {
      return;
    }

    if (action === 'approve') {
      updatePurchaseRequestStatus(matchingRequest.id, 'Approved', { nextApprover: '—' });
      return;
    }

    if (action === 'reject') {
      updatePurchaseRequestStatus(matchingRequest.id, 'Rejected', { nextApprover: '—' });
      return;
    }

    updatePurchaseRequestStatus(matchingRequest.id, 'In Review', {
      nextApprover: matchingRequest.requestor,
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Catalogue': return { bg: '#E8F7F8', color: '#00A9B7' };
      case 'Regular': return { bg: '#E8F5E9', color: '#2E7D32' };
      case 'Service': return { bg: '#E3F2FD', color: '#1976D2' };
      default: return { bg: '#F6F9FC', color: '#6E7A82' };
    }
  };

  const getPriorityColor = (priority: string) => {
    return priority === 'Urgent' ? '#DC2626' : '#6E7A82';
  };

  return (
    <div style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl mb-2" style={{ color: '#0A0F14', margin: 0 }}>PR Approvals</h1>
            <p className="text-sm" style={{ color: '#6E7A82', margin: 0 }}>Review and approve purchase requisitions</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#FFF3E0', border: '1px solid #FFB74D' }}>
            <Clock className="w-4 h-4" style={{ color: '#F57C00' }} />
            <span className="text-sm" style={{ color: '#F57C00', fontWeight: '600' }}>{allPendingPRs.length} Pending</span>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
            <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>Pending Approvals</p>
            <p className="text-2xl" style={{ color: '#F57C00', fontWeight: '600' }}>{allPendingPRs.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
            <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>Urgent PRs</p>
            <p className="text-2xl" style={{ color: '#DC2626', fontWeight: '600' }}>
              {allPendingPRs.filter(p => p.priority === 'Urgent').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
            <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>Total Value</p>
            <p className="text-2xl" style={{ color: '#0A0F14', fontWeight: '600' }}>
              {formatCurrency(allPendingPRs.reduce((s, p) => s + p.amount, 0))}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {allPendingPRs.map((pr) => {
            const typeStyle = getTypeColor(pr.type);
            return (
              <div key={pr.id} className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base" style={{ color: '#0A0F14', fontWeight: '600', margin: 0 }}>{pr.id}</h3>
                      <span className="px-2 py-1 rounded text-xs" style={typeStyle}>{pr.type} PR</span>
                      {pr.priority === 'Urgent' && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded" style={{ backgroundColor: '#FEE2E2' }}>
                          <AlertCircle className="w-3 h-3" style={{ color: '#DC2626' }} />
                          <span className="text-xs" style={{ color: '#DC2626', fontWeight: '600' }}>URGENT</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm mb-3" style={{ color: '#6E7A82' }}>
                      Requested by <strong>{pr.requestor}</strong> • {pr.department} • Submitted {pr.submittedDate}
                    </p>
                    <p className="text-sm mb-4" style={{ color: '#0A0F14' }}>{pr.justification}</p>
                    
                    <div className="grid grid-cols-4 gap-4 p-4 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Amount</p>
                        <p className="text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>{formatCurrency(pr.amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Items</p>
                        <p className="text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>{pr.items} line items</p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Need-by Date</p>
                        <p className="text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>{pr.needByDate}</p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Budget Check</p>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" style={{ color: '#2E7D32' }} />
                          <p className="text-sm" style={{ color: '#2E7D32', fontWeight: '600' }}>Passed</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4" style={{ borderTop: '1px solid #E1E6EA' }}>
                  <button className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA', color: '#6E7A82' }}>
                    <FileText className="w-4 h-4 inline mr-2" />
                    View Details
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: '#FFF3E0', border: '1px solid #FFB74D', color: '#F57C00' }}
                    onClick={() => handleAction(pr.id, 'request_info')}
                  >
                    <MessageCircle className="w-4 h-4 inline mr-2" />
                    Ask for Info
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#DC2626' }}
                    onClick={() => handleAction(pr.id, 'reject')}
                  >
                    <X className="w-4 h-4 inline mr-2" />
                    Reject
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg text-white text-sm"
                    style={{ backgroundColor: '#2E7D32' }}
                    onClick={() => handleAction(pr.id, 'approve')}
                  >
                    <CheckCircle className="w-4 h-4 inline mr-2" />
                    Approve
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
