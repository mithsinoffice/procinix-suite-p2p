import { useState } from 'react';
import { FileText, Search, Filter, Eye, Edit, Copy, X, Clock, CheckCircle, AlertCircle, FileInput } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProcurementData } from '../../contexts/ProcurementDataContext';
import { useAuth } from '../../contexts/AuthContext';

export function MyPRs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { purchaseRequests } = useProcurementData();
  const [selectedTab, setSelectedTab] = useState('all');

  const formatCurrency = (amount: number) => `₹${(amount / 100000).toFixed(2)} L`;

  const persistedPRs = purchaseRequests.map((request) => ({
    id: request.prNumber,
    type: request.type,
    entity: request.entity,
    department: request.department,
    amount: request.totalAmount,
    status: request.status === 'Pending Approval' ? 'Submitted' : request.status,
    needByDate: request.needByDate,
    approver: request.nextApprover,
    createdDate: request.createdDate,
    poLinked: request.linkedPO ?? null
  }));

  const myPRs = persistedPRs.filter((request) => !user?.name || request.approver === user.name || purchaseRequests.find((entry) => entry.prNumber === request.id)?.requestor === user.name);
  const visiblePRs = myPRs.filter((pr) => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'pending') return pr.status === 'Submitted' || pr.status === 'In Review';
    return pr.status.toLowerCase() === selectedTab;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return { bg: 'var(--color-cloud)', color: 'var(--color-mercury-grey)', icon: Edit };
      case 'Submitted': return { bg: 'var(--color-teal-tint)', color: 'var(--color-teal)', icon: FileInput };
      case 'In Review': return { bg: 'var(--color-warning-light)', color: 'var(--color-warning-dark)', icon: Clock };
      case 'Approved': return { bg: 'var(--color-success-light)', color: 'var(--color-success-dark)', icon: CheckCircle };
      case 'Cancelled': return { bg: 'var(--color-error-light)', color: 'var(--color-error-dark)', icon: X };
      case 'Converted to PO': return { bg: 'var(--color-success-light)', color: 'var(--color-success-dark)', icon: CheckCircle };
      default: return { bg: 'var(--color-cloud)', color: 'var(--color-mercury-grey)', icon: FileText };
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Catalogue': return { bg: 'var(--color-teal-tint)', color: 'var(--color-teal)' };
      case 'Regular': return { bg: 'var(--color-success-light)', color: 'var(--color-success-dark)' };
      case 'Service': return { bg: '#E3F2FD', color: '#1976D2' };
      default: return { bg: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' };
    }
  };

  const stats = {
    total: myPRs.length,
    draft: myPRs.filter(p => p.status === 'Draft').length,
    inReview: myPRs.filter(p => p.status === 'In Review' || p.status === 'Submitted').length,
    approved: myPRs.filter(p => p.status === 'Approved').length,
    totalValue: myPRs.filter(p => p.status !== 'Cancelled').reduce((sum, p) => sum + p.amount, 0)
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl mb-2" style={{ color: 'var(--color-ink)', margin: 0 }}>My Purchase Requisitions</h1>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>View and manage your PR requests</p>
          </div>
          <button className="px-4 py-2 rounded-lg text-white" style={{ backgroundColor: 'var(--color-teal)' }} onClick={() => navigate('/procurement/pr/create')}>
            <FileText className="w-4 h-4 inline mr-2" />
            Create New PR
          </button>
        </div>

        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--color-mercury-grey)' }} />
          <input
            type="text"
            placeholder="Search by PR ID, department, or entity..."
            className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
            style={{ border: '1px solid var(--color-silver)', backgroundColor: '#FFFFFF', color: 'var(--color-ink)' }}
          />
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Total PRs</p>
            <p className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{stats.total}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Draft</p>
            <p className="text-2xl" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>{stats.draft}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>In Review</p>
            <p className="text-2xl" style={{ color: 'var(--color-warning-dark)', fontWeight: '600' }}>{stats.inReview}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Approved</p>
            <p className="text-2xl" style={{ color: 'var(--color-success-dark)', fontWeight: '600' }}>{stats.approved}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Total Value</p>
            <p className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{formatCurrency(stats.totalValue)}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg mb-6" style={{ border: '1px solid var(--color-silver)' }}>
          <div className="flex items-center gap-4 p-4">
            {['all', 'draft', 'pending', 'approved', 'cancelled'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={{
                  backgroundColor: selectedTab === tab ? 'var(--color-teal-tint)' : 'transparent',
                  color: selectedTab === tab ? 'var(--color-teal)' : 'var(--color-mercury-grey)',
                  border: selectedTab === tab ? '1px solid var(--color-teal)' : '1px solid transparent',
                  fontWeight: selectedTab === tab ? '600' : 'normal'
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
          <div className="p-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-base" style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}>Purchase Requisitions</h3>
              <button className="px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: 'var(--color-cloud)', border: '1px solid var(--color-silver)', color: 'var(--color-mercury-grey)' }}>
                <Filter className="w-4 h-4 inline mr-2" />
                Filter
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>PR ID</th>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Type</th>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Entity</th>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Department</th>
                  <th className="px-6 py-3 text-right text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Amount</th>
                  <th className="px-6 py-3 text-center text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Status</th>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Need-by Date</th>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Next Approver</th>
                  <th className="px-6 py-3 text-center text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-silver)' }}>
                {visiblePRs.map((pr) => {
                  const statusStyle = getStatusColor(pr.status);
                  const typeStyle = getTypeColor(pr.type);
                  const StatusIcon = statusStyle.icon;
                  
                  return (
                    <tr key={pr.id}>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm mb-1" style={{ color: 'var(--color-ink)', fontWeight: '600', margin: 0 }}>{pr.id}</p>
                          {pr.poLinked && (
                            <p className="text-xs" style={{ color: 'var(--color-teal)', margin: 0 }}>→ {pr.poLinked}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded text-xs inline-block" style={typeStyle}>
                          {pr.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-ink)' }}>{pr.entity}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>{pr.department}</td>
                      <td className="px-6 py-4 text-sm text-right" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{formatCurrency(pr.amount)}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <StatusIcon className="w-4 h-4" style={{ color: statusStyle.color }} />
                          <span className="text-xs" style={{ color: statusStyle.color, fontWeight: '600' }}>
                            {pr.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>{pr.needByDate}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>{pr.approver}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button className="p-1 rounded hover:bg-gray-100">
                            <Eye className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                          </button>
                          {pr.status === 'Draft' && (
                            <button className="p-1 rounded hover:bg-gray-100">
                              <Edit className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                            </button>
                          )}
                          {pr.status === 'Approved' && !pr.poLinked && (
                            <button className="px-2 py-1 rounded text-xs text-white" style={{ backgroundColor: 'var(--color-teal)' }}>
                              Convert to PO
                            </button>
                          )}
                          <button className="p-1 rounded hover:bg-gray-100">
                            <Copy className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
