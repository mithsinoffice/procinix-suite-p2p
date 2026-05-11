import { useMemo, useState } from 'react';
import {
  FileText,
  Search,
  Eye,
  Edit,
  Clock,
  Download,
  RefreshCw,
  ClipboardList,
  History,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getStatusStyle, type PRStatus } from '../../utils/statusUtils';
import { useProcurementData } from '../../contexts/ProcurementDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { PremiumActionButton, PremiumFilterMenu, toggleMultiSelect } from '../ui/premium-register';
import { AuditTrailDrawer } from './AuditTrailDrawer';
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
  tableHeaderBg,
  tableHeaderFg,
} from '../ui/listingStyles';

type PRType = 'Catalogue' | 'Regular' | 'Service' | 'Kit/Bundle' | 'Asset/CAPEX' | 'Blanket';
type AIRiskLevel = 'Low' | 'Medium' | 'High';

interface PurchaseRequisition {
  /** Relational UUID — used for navigation and API calls. */
  id: string;
  /** Human ref (PR-PTPL-2026-0007) — used for display. */
  prRef: string;
  /** Alias of prRef kept so any consumer that asks for `displayId` works. */
  displayId: string;
  prType: PRType;
  entity: string;
  requestor: string;
  requesterId: string;
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

  const persistedPRs: PurchaseRequisition[] = purchaseRequests.map((request) => {
    // Resolve the relational UUID for navigation. Listing legacy `request.id`
    // is the fake form-side `regular-${ts}` token; the relational rows have a
    // proper UUID we can look up via prRef. Fall back to `request.id` only
    // for blob-only rows (none expected after FIX 4).
    const rel = relationalPRs.find((r) => r.prRef === request.prNumber || r.id === request.id);
    return {
      id: rel?.id ?? request.id,
      prRef: request.prNumber,
      displayId: request.prNumber,
      prType: request.type,
      entity: request.entity,
      requestor: request.requestor,
      requesterId: rel?.requesterId ?? '',
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
    };
  });

  const myPRs = persistedPRs.filter(
    (r) => r.requestor === user?.name || (user?.id != null && r.requesterId === user.id)
  );
  const teamPRs = persistedPRs.filter(
    (r) => r.requestor !== user?.name && (user?.id == null || r.requesterId !== user.id)
  );
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
          pr.prRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  // Convert-to-PO removed from the listing per FIX 7. PO creation lives in
  // POCreationHub now — the listing is read-only for PR data.

  return (
    <div style={listingPage}>
      <div style={listingHeader}>
        <div>
          <h1 style={listingTitle}>Purchase Requisitions</h1>
          <p style={listingSubtitle}>
            {selectedTab === 'my-prs'
              ? 'View and manage your PR requests'
              : 'View team PR requests'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={listingPrimaryBtn} onClick={() => navigate('/procurement/pr/create')}>
            <FileText size={13} />
            Create New PR
          </button>
        </div>
      </div>

      <div
        style={{
          padding: '8px 20px',
          background: 'var(--color-background-secondary)',
          borderBottom: '1px solid var(--color-fog)',
          display: 'flex',
          alignItems: 'center',
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
            placeholder="Search by PR ID, requestor, department, or entity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
          <div style={metricLabel}>Pending</div>
          <div style={metricValueWarning}>{stats.pending}</div>
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
        <div style={{ background: '#FFFFFF', marginTop: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '8px 0',
              borderBottom: '1px solid var(--color-fog)',
            }}
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

        <div style={{ background: '#FFFFFF', marginTop: 12 }}>
          <div
            style={{
              padding: '8px 0',
              borderBottom: '1px solid var(--color-fog)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClipboardList size={14} style={{ color: '#2563EB' }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)' }}>
                {selectedTab === 'my-prs'
                  ? 'My Purchase Requisitions'
                  : 'Team Purchase Requisitions'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-mercury-grey)' }}>
                · {filteredPRs.length} visible
              </span>
            </div>
            <button
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                height: 28,
                padding: '0 10px',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--color-silver)',
                background: '#FFFFFF',
                color: 'var(--color-mercury-grey)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              <Download size={13} /> Export
            </button>
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
                  background: tableHeaderBg,
                  borderBottom: '1px solid var(--color-nav-panel-border)',
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
                    style={{ color: tableHeaderFg, fontWeight: 500 }}
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
                          {pr.prRef}
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
                            (r) => r.id === pr.id || r.prRef === pr.prRef
                          );
                          setAuditTarget({ id: rel?.id ?? pr.id, ref: pr.prRef });
                        }}
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
