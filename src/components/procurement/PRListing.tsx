import { useMemo, useState } from 'react';
import {
  FileText,
  Search,
  Eye,
  Edit,
  Copy,
  Clock,
  Download,
  RefreshCw,
  Package,
  ArrowUpRight,
  ClipboardList,
  History,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getStatusStyle, type PRStatus } from '../../utils/statusUtils';
import { useProcurementData } from '../../contexts/ProcurementDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { PremiumActionButton, PremiumFilterMenu, toggleMultiSelect } from '../ui/premium-register';
import { AuditTrailDrawer } from './AuditTrailDrawer';

type PRType = 'Catalogue' | 'Regular' | 'Service' | 'Kit/Bundle' | 'Asset/CAPEX' | 'Blanket';
type AIRiskLevel = 'Low' | 'Medium' | 'High';

interface PurchaseRequisition {
  id: string;
  prType: PRType;
  entity: string;
  requestor: string;
  department: string;
  costCentre: string;
  needByDate: string;
  totalAmount: number;
  status: PRStatus;
  nextApprover: string;
  aiRiskLevel: AIRiskLevel;
  createdDate: string;
  vendor?: string;
  linkedPO?: string;
  itemCount: number;
}

export function PRListing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { purchaseRequests, prs: relationalPRs } = useProcurementData();
  const [selectedTab, setSelectedTab] = useState<'my-prs' | 'team-prs'>('my-prs');
  const [searchTerm, setSearchTerm] = useState('');
  const [auditTarget, setAuditTarget] = useState<{ id: string; ref: string } | null>(null);

  // Filter states
  const [selectedPRTypes, setSelectedPRTypes] = useState<PRType[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<PRStatus[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [selectedRiskLevels, setSelectedRiskLevels] = useState<AIRiskLevel[]>([]);
  const [amountRange, setAmountRange] = useState<{ min: string; max: string }>({
    min: '',
    max: '',
  });
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });

  const persistedPRs: PurchaseRequisition[] = purchaseRequests.map((request) => ({
    id: request.prNumber,
    prType: request.type,
    entity: request.entity,
    requestor: request.requestor,
    department: request.department,
    costCentre: request.costCentre,
    needByDate: request.needByDate,
    totalAmount: request.totalAmount,
    status: (request.status === 'Submitted' ? 'Pending Approval' : request.status) as PRStatus,
    nextApprover: request.nextApprover,
    aiRiskLevel: request.aiRiskLevel,
    createdDate: request.createdDate,
    vendor: request.vendor,
    linkedPO: request.linkedPO,
    itemCount: request.itemCount,
  }));

  const myPRs = persistedPRs.filter((request) => !user?.name || request.requestor === user.name);
  const teamPRs = persistedPRs.filter((request) => !user?.name || request.requestor !== user.name);
  const currentPRs = selectedTab === 'my-prs' ? myPRs : teamPRs;

  const formatCurrency = (amount: number) => `₹${(amount / 100000).toFixed(2)} L`;

  const getTypeColor = (type: PRType) => {
    switch (type) {
      case 'Catalogue':
        return { bg: 'var(--color-teal-tint)', color: 'var(--color-teal)' };
      case 'Regular':
        return { bg: 'var(--color-success-light)', color: 'var(--color-success-dark)' };
      case 'Service':
        return { bg: '#E3F2FD', color: '#1976D2' };
      case 'Kit/Bundle':
        return { bg: '#F3E5F5', color: '#7B1FA2' };
      case 'Asset/CAPEX':
        return { bg: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' };
      case 'Blanket':
        return { bg: '#E1F5FE', color: '#0277BD' };
      default:
        return { bg: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' };
    }
  };

  const getRiskColor = (risk: AIRiskLevel) => {
    switch (risk) {
      case 'Low':
        return { bg: 'var(--color-success-light)', color: 'var(--color-success-dark)' };
      case 'Medium':
        return { bg: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' };
      case 'High':
        return { bg: 'var(--color-error-light)', color: 'var(--color-error-dark)' };
    }
  };

  // Apply filters
  const filteredPRs = useMemo(
    () =>
      currentPRs.filter((pr) => {
        const matchesSearch =
          pr.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pr.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pr.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pr.requestor.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesPRType = selectedPRTypes.length === 0 || selectedPRTypes.includes(pr.prType);
        const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(pr.status);
        const matchesEntity = selectedEntities.length === 0 || selectedEntities.includes(pr.entity);
        const matchesRisk =
          selectedRiskLevels.length === 0 || selectedRiskLevels.includes(pr.aiRiskLevel);

        const matchesAmount =
          (!amountRange.min || pr.totalAmount >= parseFloat(amountRange.min) * 100000) &&
          (!amountRange.max || pr.totalAmount <= parseFloat(amountRange.max) * 100000);

        return (
          matchesSearch &&
          matchesPRType &&
          matchesStatus &&
          matchesEntity &&
          matchesRisk &&
          matchesAmount
        );
      }),
    [
      amountRange.max,
      amountRange.min,
      currentPRs,
      searchTerm,
      selectedEntities,
      selectedPRTypes,
      selectedRiskLevels,
      selectedStatuses,
    ]
  );

  const stats = {
    total: filteredPRs.length,
    draft: filteredPRs.filter((p) => p.status === 'Draft').length,
    pending: filteredPRs.filter((p) => p.status === 'Pending Approval').length,
    approved: filteredPRs.filter((p) => p.status === 'Approved').length,
    totalValue: filteredPRs.reduce((sum, p) => sum + p.totalAmount, 0),
  };
  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    selectedPRTypes.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedEntities.length > 0 ||
    selectedRiskLevels.length > 0 ||
    Boolean(amountRange.min || amountRange.max || dateRange.from || dateRange.to);

  const handleConvertToPO = (prId: string) => {
    navigate(`/purchase-orders/create-from-prs?prIds=${prId}`);
  };

  const handleBulkConvertToPO = () => {
    const approvedPRs = filteredPRs.filter((pr) => pr.status === 'Approved' && !pr.linkedPO);
    const prIds = approvedPRs.map((pr) => pr.id).join(',');
    navigate(`/purchase-orders/create-from-prs?prIds=${prIds}`);
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl mb-2" style={{ color: 'var(--color-ink)', margin: 0 }}>
              Purchase Requisitions
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
              {selectedTab === 'my-prs'
                ? 'View and manage your PR requests'
                : 'View team PR requests'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {filteredPRs.filter((pr) => pr.status === 'Approved' && !pr.linkedPO).length > 0 && (
              <button
                className="px-4 py-2 rounded-lg text-sm border"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: 'var(--color-teal)',
                  color: 'var(--color-teal)',
                }}
                onClick={handleBulkConvertToPO}
              >
                <Package className="w-4 h-4 inline mr-2" />
                Convert{' '}
                {filteredPRs.filter((pr) => pr.status === 'Approved' && !pr.linkedPO).length} PRs to
                PO
              </button>
            )}
            <button
              className="px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: 'var(--color-teal)' }}
              onClick={() => navigate('/procurement/pr/create')}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Create New PR
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search
            className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2"
            style={{ color: 'var(--color-mercury-grey)' }}
          />
          <input
            type="text"
            placeholder="Search by PR ID, requestor, department, or entity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
            style={{
              border: '1px solid var(--color-silver)',
              backgroundColor: '#FFFFFF',
              color: 'var(--color-ink)',
            }}
          />
        </div>
      </div>

      <div className="p-8">
        {/* Tabs */}
        <div
          className="bg-white rounded-lg mb-6"
          style={{ border: '1px solid var(--color-silver)' }}
        >
          <div
            className="flex items-center gap-4 p-4"
            style={{ borderBottom: '1px solid var(--color-silver)' }}
          >
            <button
              onClick={() => setSelectedTab('my-prs')}
              className="px-4 py-2 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor:
                  selectedTab === 'my-prs' ? 'var(--color-teal-tint)' : 'transparent',
                color: selectedTab === 'my-prs' ? 'var(--color-teal)' : 'var(--color-mercury-grey)',
                border:
                  selectedTab === 'my-prs'
                    ? '1px solid var(--color-teal)'
                    : '1px solid transparent',
                fontWeight: selectedTab === 'my-prs' ? '600' : 'normal',
              }}
            >
              My PRs ({myPRs.length})
            </button>
            <button
              onClick={() => setSelectedTab('team-prs')}
              className="px-4 py-2 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor:
                  selectedTab === 'team-prs' ? 'var(--color-teal-tint)' : 'transparent',
                color:
                  selectedTab === 'team-prs' ? 'var(--color-teal)' : 'var(--color-mercury-grey)',
                border:
                  selectedTab === 'team-prs'
                    ? '1px solid var(--color-teal)'
                    : '1px solid transparent',
                fontWeight: selectedTab === 'team-prs' ? '600' : 'normal',
              }}
            >
              Team PRs ({teamPRs.length})
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-6 mb-8">
          <div
            className="bg-white p-6 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Total PRs
            </p>
            <p className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
              {stats.total}
            </p>
          </div>
          <div
            className="bg-white p-6 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Draft
            </p>
            <p
              className="text-2xl"
              style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
            >
              {stats.draft}
            </p>
          </div>
          <div
            className="bg-white p-6 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Pending
            </p>
            <p
              className="text-2xl"
              style={{ color: 'var(--color-warning-dark)', fontWeight: '600' }}
            >
              {stats.pending}
            </p>
          </div>
          <div
            className="bg-white p-6 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Approved
            </p>
            <p
              className="text-2xl"
              style={{ color: 'var(--color-success-dark)', fontWeight: '600' }}
            >
              {stats.approved}
            </p>
          </div>
          <div
            className="bg-white p-6 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Total Value
            </p>
            <p className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
              {formatCurrency(stats.totalValue)}
            </p>
          </div>
        </div>

        <div
          className="rounded-[28px] overflow-hidden"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-fog)',
            boxShadow: '0 24px 52px rgba(15, 23, 42, 0.07)',
          }}
        >
          <div className="p-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #E7F4FF 0%, #D7EBFF 100%)',
                    boxShadow: '0 14px 30px rgba(37, 99, 235, 0.12)',
                  }}
                >
                  <ClipboardList className="w-6 h-6" style={{ color: '#2563EB' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className="px-3 py-1 rounded-full text-xs"
                      style={{ backgroundColor: '#EEF7FF', color: '#2563EB', fontWeight: 700 }}
                    >
                      PR Register
                    </span>
                    <span
                      className="px-3 py-1 rounded-full text-xs"
                      style={{ backgroundColor: '#E8FFF2', color: '#0F9D69', fontWeight: 700 }}
                    >
                      {filteredPRs.length} Visible
                    </span>
                  </div>
                  <h3
                    className="text-base"
                    style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}
                  >
                    {selectedTab === 'my-prs'
                      ? 'My Purchase Requisitions'
                      : 'Team Purchase Requisitions'}
                  </h3>
                </div>
              </div>
              <button
                className="px-3 py-1.5 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--color-cloud)',
                  border: '1px solid var(--color-silver)',
                  color: 'var(--color-mercury-grey)',
                }}
              >
                <Download className="w-4 h-4 inline mr-2" />
                Export
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div style={{ minWidth: '1680px' }}>
              <div
                className="grid gap-4 px-6 py-4"
                style={{
                  gridTemplateColumns: '1.6fr 1fr 1.2fr 1.1fr 1fr 1fr 1fr 1.2fr 1fr 1fr 1fr',
                  borderBottom: '1px solid #E8F0F4',
                }}
              >
                <div className="space-y-2">
                  <div className="relative w-full">
                    <Search
                      className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--color-mercury-grey)' }}
                    />
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search PR..."
                      className="w-full pl-11 pr-4 py-2.5 rounded-2xl text-sm"
                      style={{
                        backgroundColor: '#F8FBFD',
                        border: '1px solid var(--color-fog)',
                        color: 'var(--color-ink)',
                      }}
                    />
                  </div>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedPRTypes([]);
                        setSelectedStatuses([]);
                        setSelectedEntities([]);
                        setSelectedRiskLevels([]);
                        setAmountRange({ min: '', max: '' });
                        setDateRange({ from: '', to: '' });
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                      style={{
                        backgroundColor: '#FFF5F5',
                        border: '1px solid #FED7D7',
                        color: '#C53030',
                        fontWeight: 600,
                      }}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Clear Filters
                    </button>
                  )}
                </div>
                <div className="flex items-start">
                  <PremiumFilterMenu
                    label="Type"
                    options={[
                      'Catalogue',
                      'Regular',
                      'Service',
                      'Kit/Bundle',
                      'Asset/CAPEX',
                      'Blanket',
                    ]}
                    selected={selectedPRTypes}
                    onToggle={(value) =>
                      setSelectedPRTypes((current) => toggleMultiSelect(current, value) as PRType[])
                    }
                  />
                </div>
                <div className="flex items-start">
                  <PremiumFilterMenu
                    label="Entity"
                    options={[...new Set(currentPRs.map((pr) => pr.entity))]}
                    selected={selectedEntities}
                    onToggle={(value) =>
                      setSelectedEntities((current) => toggleMultiSelect(current, value))
                    }
                  />
                </div>
                <div />
                <div />
                <div />
                <div />
                <div className="flex items-start">
                  <PremiumFilterMenu
                    label="Status"
                    options={[
                      'Draft',
                      'Pending Approval',
                      'In Review',
                      'Approved',
                      'Rejected',
                      'Converted to PO',
                    ]}
                    selected={selectedStatuses}
                    onToggle={(value) =>
                      setSelectedStatuses(
                        (current) => toggleMultiSelect(current, value) as PRStatus[]
                      )
                    }
                  />
                </div>
                <div />
                <div className="flex items-start">
                  <PremiumFilterMenu
                    label="AI Risk"
                    options={['Low', 'Medium', 'High']}
                    selected={selectedRiskLevels}
                    onToggle={(value) =>
                      setSelectedRiskLevels(
                        (current) => toggleMultiSelect(current, value) as AIRiskLevel[]
                      )
                    }
                  />
                </div>
                <div />
              </div>

              <div
                className="grid gap-4 px-6 py-4"
                style={{
                  gridTemplateColumns: '1.6fr 1fr 1.2fr 1.1fr 1fr 1fr 1fr 1.2fr 1fr 1fr 1fr',
                  background: 'linear-gradient(180deg, #F8FBFD 0%, #F3F8FB 100%)',
                  borderBottom: '1px solid #E4EDF2',
                }}
              >
                {[
                  'PR',
                  'Type',
                  'Entity',
                  'Requestor',
                  'Department',
                  'Need By',
                  'Amount',
                  'Status',
                  'Approver',
                  'AI Risk',
                  'Action',
                ].map((column) => (
                  <div
                    key={column}
                    className="text-xs uppercase tracking-[0.18em]"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: 700 }}
                  >
                    {column}
                  </div>
                ))}
              </div>

              {filteredPRs.map((pr) => {
                const statusStyle = getStatusStyle(pr.status);
                const typeStyle = getTypeColor(pr.prType);
                const riskStyle = getRiskColor(pr.aiRiskLevel);

                return (
                  <div
                    key={pr.id}
                    className="grid gap-4 px-6 py-4 hover:bg-[#F8FCFE]"
                    style={{
                      gridTemplateColumns: '1.6fr 1fr 1.2fr 1.1fr 1fr 1fr 1fr 1.2fr 1fr 1fr 1fr',
                      borderBottom: '1px solid #EDF3F7',
                    }}
                  >
                    <div>
                      <div>
                        <p
                          className="text-sm mb-1"
                          style={{ color: 'var(--color-ink)', fontWeight: '600', margin: 0 }}
                        >
                          {pr.id}
                        </p>
                        {pr.linkedPO && (
                          <p
                            className="text-xs"
                            style={{ color: 'var(--color-teal)', margin: 0, cursor: 'pointer' }}
                          >
                            → {pr.linkedPO}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="px-2 py-1 rounded text-xs inline-block" style={typeStyle}>
                        {pr.prType}
                      </span>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--color-ink)' }}>
                      {pr.entity}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--color-ink)' }}>
                      {pr.requestor}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                      {pr.department}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                      {pr.needByDate}
                    </div>
                    <div
                      className="text-sm text-right"
                      style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                    >
                      {formatCurrency(pr.totalAmount)}
                    </div>
                    <div className="text-center">
                      <span
                        className="px-3 py-1 rounded-full text-xs inline-block"
                        style={{
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.color,
                          fontWeight: '500',
                        }}
                      >
                        {pr.status}
                      </span>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                      {pr.nextApprover}
                    </div>
                    <div className="text-center">
                      <span className="px-2 py-1 rounded text-xs inline-block" style={riskStyle}>
                        {pr.aiRiskLevel}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <PremiumActionButton
                        label="View PR"
                        icon={<Eye className="w-4 h-4" />}
                        tone="teal"
                        onClick={() => navigate(`/procurement/pr/detail/${pr.id}`)}
                      />
                      <PremiumActionButton
                        label={pr.status === 'Draft' ? 'Edit PR' : 'Edit disabled — non-draft'}
                        icon={<Edit className="w-4 h-4" />}
                        tone="violet"
                        onClick={
                          pr.status === 'Draft'
                            ? () => navigate(`/procurement/pr/edit/${pr.id}`)
                            : undefined
                        }
                      />
                      <PremiumActionButton
                        label="Audit trail"
                        icon={<History className="w-4 h-4" />}
                        tone="slate"
                        onClick={() => {
                          const rel = relationalPRs.find(
                            (r) => r.prRef === pr.id || r.id === pr.id
                          );
                          setAuditTarget({ id: rel?.id ?? pr.id, ref: pr.id });
                        }}
                      />
                      {pr.status === 'Pending Approval' && selectedTab === 'my-prs' && (
                        <button
                          className="px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor: 'var(--color-error-light)',
                            color: 'var(--color-error-dark)',
                          }}
                        >
                          Withdraw
                        </button>
                      )}
                      {pr.status === 'Approved' && !pr.linkedPO && (
                        <button
                          className="px-2 py-1 rounded text-xs text-white"
                          style={{ backgroundColor: 'var(--color-teal)' }}
                          onClick={() => handleConvertToPO(pr.id)}
                        >
                          Convert to PO
                        </button>
                      )}
                      <PremiumActionButton
                        label="Duplicate PR"
                        icon={<Copy className="w-4 h-4" />}
                        tone="slate"
                      />
                      <PremiumActionButton
                        label="Open PR"
                        icon={<ArrowUpRight className="w-4 h-4" />}
                        tone="blue"
                        onClick={() => navigate(`/procurement/pr/detail/${pr.id}`)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {auditTarget && (
        <AuditTrailDrawer
          open
          onClose={() => setAuditTarget(null)}
          docType="PR"
          docId={auditTarget.id}
          docRef={auditTarget.ref}
        />
      )}
    </div>
  );
}
