import { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  Eye,
  Edit,
  Copy,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  FileInput,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProcurementData, transitionPRApi } from '../../contexts/ProcurementDataContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  listingHeader,
  listingTitle,
  listingSubtitle,
  listingPrimaryBtn,
  metricStrip,
  metricCard,
  metricLabel,
  metricValue,
  metricValueWarning,
  metricValueSuccess,
  listingPage,
  listingTable,
  listingThead,
  listingTh,
  listingTd,
  listingTdPrimary,
  rowHover,
} from '../ui/listingStyles';

export function MyPRs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { purchaseRequests, prs: relationalPRs, refresh } = useProcurementData();
  const [selectedTab, setSelectedTab] = useState('all');

  const formatCurrency = (amount: number) => `₹${(amount / 100000).toFixed(2)} L`;

  const persistedPRs = purchaseRequests.map((request) => {
    // Resolve the relational UUID for navigation; prRef stays as the human ref.
    const rel = relationalPRs.find((r) => r.prRef === request.prNumber || r.id === request.id);
    return {
      id: rel?.id ?? request.id, // UUID for navigation
      prRef: request.prNumber, // human display
      requestor: request.requestor,
      requesterId: rel?.requesterId ?? '',
      type: request.type,
      entity: request.entity,
      department: request.department,
      amount: request.totalAmount,
      status: request.status === 'Pending Approval' ? 'Submitted' : request.status,
      needByDate: request.needByDate,
      approver: request.nextApprover,
      createdDate: request.createdDate,
      poLinked: request.linkedPO ?? null,
    };
  });

  const myPRs = persistedPRs.filter(
    (r) => r.requestor === user?.name || (user?.id != null && r.requesterId === user.id)
  );
  const visiblePRs = myPRs.filter((pr) => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'pending') return pr.status === 'Submitted' || pr.status === 'In Review';
    return pr.status.toLowerCase() === selectedTab;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return { bg: 'var(--color-cloud)', color: 'var(--color-mercury-grey)', icon: Edit };
      case 'Submitted':
        return { bg: 'var(--color-teal-tint)', color: 'var(--color-teal)', icon: FileInput };
      case 'In Review':
        return {
          bg: 'var(--color-warning-light)',
          color: 'var(--color-warning-dark)',
          icon: Clock,
        };
      case 'Approved':
        return {
          bg: 'var(--color-success-light)',
          color: 'var(--color-success-dark)',
          icon: CheckCircle,
        };
      case 'Cancelled':
        return { bg: 'var(--color-error-light)', color: 'var(--color-error-dark)', icon: X };
      case 'Converted to PO':
        return {
          bg: 'var(--color-success-light)',
          color: 'var(--color-success-dark)',
          icon: CheckCircle,
        };
      default:
        return { bg: 'var(--color-cloud)', color: 'var(--color-mercury-grey)', icon: FileText };
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Catalogue':
        return { bg: 'var(--color-teal-tint)', color: 'var(--color-teal)' };
      case 'Regular':
        return { bg: 'var(--color-success-light)', color: 'var(--color-success-dark)' };
      case 'Service':
        return { bg: '#E3F2FD', color: '#1976D2' };
      default:
        return { bg: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' };
    }
  };

  const stats = {
    total: myPRs.length,
    draft: myPRs.filter((p) => p.status === 'Draft').length,
    inReview: myPRs.filter((p) => p.status === 'In Review' || p.status === 'Submitted').length,
    approved: myPRs.filter((p) => p.status === 'Approved').length,
    totalValue: myPRs.filter((p) => p.status !== 'Cancelled').reduce((sum, p) => sum + p.amount, 0),
  };

  return (
    <div style={listingPage}>
      <div style={listingHeader}>
        <div>
          <h1 style={listingTitle}>My Purchase Requisitions</h1>
          <p style={listingSubtitle}>View and manage your PR requests</p>
        </div>
        <button style={listingPrimaryBtn} onClick={() => navigate('/procurement/pr/create')}>
          <FileText size={13} />
          Create New PR
        </button>
      </div>

      <div
        style={{
          padding: '8px 20px',
          background: 'var(--color-background-secondary)',
          borderBottom: '1px solid var(--color-fog)',
          display: 'flex',
          gap: 8,
        }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={13}
            style={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-mercury-grey)',
            }}
          />
          <input
            type="text"
            placeholder="Search by PR ID, department, or entity..."
            style={{
              width: '100%',
              height: 28,
              padding: '0 10px 0 26px',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--color-silver)',
              background: '#FFFFFF',
              fontSize: 12,
              color: 'var(--color-ink)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      <div style={metricStrip}>
        <div style={metricCard}>
          <div style={metricLabel}>Total PRs</div>
          <div style={metricValue}>{stats.total}</div>
        </div>
        <div style={metricCard}>
          <div style={metricLabel}>Draft</div>
          <div style={{ ...metricValue, color: 'var(--color-mercury-grey)' }}>{stats.draft}</div>
        </div>
        <div style={metricCard}>
          <div style={metricLabel}>In Review</div>
          <div style={metricValueWarning}>{stats.inReview}</div>
        </div>
        <div style={metricCard}>
          <div style={metricLabel}>Approved</div>
          <div style={metricValueSuccess}>{stats.approved}</div>
        </div>
        <div style={metricCard}>
          <div style={metricLabel}>Total Value</div>
          <div style={metricValue}>{formatCurrency(stats.totalValue)}</div>
        </div>
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        <div
          style={{
            background: '#FFFFFF',
            marginTop: 12,
            borderBottom: '1px solid var(--color-fog)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 0' }}>
            {['all', 'draft', 'pending', 'approved', 'cancelled'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={{
                  backgroundColor: selectedTab === tab ? 'var(--color-teal-tint)' : 'transparent',
                  color: selectedTab === tab ? 'var(--color-teal)' : 'var(--color-mercury-grey)',
                  border:
                    selectedTab === tab ? '1px solid var(--color-teal)' : '1px solid transparent',
                  fontWeight: selectedTab === tab ? '600' : 'normal',
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
              <h3
                className="text-base"
                style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}
              >
                Purchase Requisitions
              </h3>
              <button
                className="px-3 py-1.5 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--color-cloud)',
                  border: '1px solid var(--color-silver)',
                  color: 'var(--color-mercury-grey)',
                }}
              >
                <Filter className="w-4 h-4 inline mr-2" />
                Filter
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table style={listingTable}>
              <thead style={listingThead}>
                <tr>
                  <th style={listingTh}>PR ID</th>
                  <th style={listingTh}>Type</th>
                  <th style={listingTh}>Entity</th>
                  <th style={listingTh}>Department</th>
                  <th style={{ ...listingTh, textAlign: 'right' }}>Amount</th>
                  <th style={{ ...listingTh, textAlign: 'center' }}>Status</th>
                  <th style={listingTh}>Need-by Date</th>
                  <th style={listingTh}>Next Approver</th>
                  <th style={{ ...listingTh, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-silver)' }}>
                {visiblePRs.map((pr) => {
                  const statusStyle = getStatusColor(pr.status);
                  const typeStyle = getTypeColor(pr.type);
                  const StatusIcon = statusStyle.icon;

                  return (
                    <tr key={pr.id}>
                      <td style={listingTdPrimary}>
                        <div>
                          {pr.prRef}
                          {pr.poLinked && (
                            <div style={{ fontSize: 10, color: 'var(--color-teal)', marginTop: 2 }}>
                              → {pr.poLinked}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={listingTd}>
                        <span
                          style={{
                            ...typeStyle,
                            padding: '2px 8px',
                            borderRadius: 999,
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        >
                          {pr.type}
                        </span>
                      </td>
                      <td style={listingTd}>{pr.entity}</td>
                      <td style={{ ...listingTd, color: 'var(--color-mercury-grey)' }}>
                        {pr.department}
                      </td>
                      <td style={{ ...listingTd, textAlign: 'right', fontWeight: 500 }}>
                        {formatCurrency(pr.amount)}
                      </td>
                      <td style={{ ...listingTd, textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            color: statusStyle.color,
                            fontWeight: 600,
                            fontSize: 11,
                          }}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {pr.status}
                        </span>
                      </td>
                      <td style={{ ...listingTd, color: 'var(--color-mercury-grey)' }}>
                        {pr.needByDate}
                      </td>
                      <td style={{ ...listingTd, color: 'var(--color-mercury-grey)' }}>
                        {pr.approver}
                      </td>
                      <td style={{ ...listingTd, textAlign: 'center' }}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            className="p-1 rounded hover:bg-gray-100"
                            title="View PR"
                            onClick={() => navigate(`/procurement/pr/detail/${pr.id}`)}
                          >
                            <Eye className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                          </button>
                          {pr.status === 'Draft' && (
                            <button
                              className="p-1 rounded hover:bg-gray-100"
                              title="Edit PR"
                              onClick={() => navigate(`/procurement/pr/edit/${pr.id}`)}
                            >
                              <Edit
                                className="w-4 h-4"
                                style={{ color: 'var(--color-mercury-grey)' }}
                              />
                            </button>
                          )}
                          <button
                            className="p-1 rounded hover:bg-gray-100"
                            title="Duplicate as new draft"
                            onClick={() => navigate('/procurement/pr/create/regular')}
                          >
                            <Copy
                              className="w-4 h-4"
                              style={{ color: 'var(--color-mercury-grey)' }}
                            />
                          </button>
                          {(pr.status === 'Submitted' || pr.status === 'In Review') && (
                            <button
                              style={{
                                padding: '2px 8px',
                                borderRadius: 999,
                                fontSize: 10,
                                fontWeight: 600,
                                background: '#FFEBEE',
                                color: '#C62828',
                                border: '1px solid #FECACA',
                                cursor: 'pointer',
                              }}
                              title="Withdraw PR"
                              onClick={async () => {
                                if (!window.confirm(`Withdraw ${pr.prRef}? This cancels the PR.`))
                                  return;
                                const res = await transitionPRApi(pr.id, 'cancel');
                                if (res) await refresh();
                                else window.alert('Failed to withdraw PR. Please try again.');
                              }}
                            >
                              Withdraw
                            </button>
                          )}
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
