import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Download,
  Eye,
  Edit,
  DollarSign,
  CheckCircle,
  Clock,
  FileText,
  ArrowUpRight,
  WalletCards,
} from 'lucide-react';
import { useAPData } from '../contexts/APDataContext';
import { PremiumActionButton, PremiumFilterMenu, toggleMultiSelect } from './ui/premium-register';

export function AdvanceRequests() {
  const navigate = useNavigate();
  const { advanceRequests } = useAPData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [filterDateRange, setFilterDateRange] = useState({ from: '', to: '' });

  // Filter advance requests
  const filteredRequests = useMemo(
    () =>
      advanceRequests.filter((request) => {
        const matchesSearch =
          request.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          request.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (request.poNumber && request.poNumber.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = statusFilter.length === 0 || statusFilter.includes(request.status);
        const matchesType = typeFilter.length === 0 || typeFilter.includes(request.advanceType);
        const matchesPayment =
          paymentFilter.length === 0 || paymentFilter.includes(request.paymentStatus);
        const matchesPriority =
          priorityFilter.length === 0 || priorityFilter.includes(request.priority);

        let matchesDateRange = true;
        if (filterDateRange.from && filterDateRange.to) {
          const requestDate = new Date(request.createdDate);
          const fromDate = new Date(filterDateRange.from);
          const toDate = new Date(filterDateRange.to);
          matchesDateRange = requestDate >= fromDate && requestDate <= toDate;
        }

        return (
          matchesSearch &&
          matchesStatus &&
          matchesType &&
          matchesPayment &&
          matchesPriority &&
          matchesDateRange
        );
      }),
    [
      advanceRequests,
      filterDateRange.from,
      filterDateRange.to,
      paymentFilter,
      priorityFilter,
      searchTerm,
      statusFilter,
      typeFilter,
    ]
  );

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const styles = {
      Draft: 'bg-gray-100 text-gray-700',
      Submitted: 'bg-blue-100 text-blue-700',
      Approved: 'bg-green-100 text-green-700',
      Rejected: 'bg-red-100 text-red-700',
      Cancelled: 'bg-gray-100 text-gray-700',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700';
  };

  // Get payment status badge styling
  const getPaymentStatusBadge = (status: string) => {
    const styles = {
      Pending: 'bg-gray-100 text-gray-700',
      'In Queue': 'bg-yellow-100 text-yellow-700',
      Processed: 'bg-green-100 text-green-700',
      Failed: 'bg-red-100 text-red-700',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700';
  };

  // Get priority badge styling
  const getPriorityBadge = (priority: string) => {
    const styles = {
      Low: 'bg-blue-100 text-blue-700',
      Medium: 'bg-yellow-100 text-yellow-700',
      High: 'bg-orange-100 text-orange-700',
      Critical: 'bg-red-100 text-red-700',
    };
    return styles[priority as keyof typeof styles] || 'bg-gray-100 text-gray-700';
  };

  // Summary statistics
  const stats = {
    total: advanceRequests.length,
    submitted: advanceRequests.filter((r) => r.status === 'Submitted').length,
    approved: advanceRequests.filter((r) => r.status === 'Approved').length,
    totalValue: advanceRequests.reduce((sum, r) => sum + r.requestedAmount, 0),
  };
  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    statusFilter.length > 0 ||
    typeFilter.length > 0 ||
    paymentFilter.length > 0 ||
    priorityFilter.length > 0 ||
    Boolean(filterDateRange.from || filterDateRange.to);

  return (
    <div className="min-h-screen bg-[var(--color-cloud)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--color-silver)]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[var(--color-ink)]">Advance Requests</h1>
              <p className="text-[var(--color-mercury-grey)] text-sm">
                Manage vendor advance requests and approvals
              </p>
            </div>
            <button
              onClick={() => navigate('/ap/advance-request-form')}
              className="px-4 py-2 bg-[var(--color-teal)] text-white rounded-lg hover:bg-[var(--color-teal-dark)] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Advance Request
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-mercury-grey)]">Total Requests</span>
              <FileText className="w-4 h-4 text-[var(--color-mercury-grey)]" />
            </div>
            <div className="text-2xl text-[var(--color-ink)]">{stats.total}</div>
          </div>

          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-mercury-grey)]">Pending Approval</span>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl text-[var(--color-ink)]">{stats.submitted}</div>
          </div>

          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-mercury-grey)]">Approved</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl text-[var(--color-ink)]">{stats.approved}</div>
          </div>

          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-mercury-grey)]">Total Value</span>
              <DollarSign className="w-4 h-4 text-[var(--color-teal)]" />
            </div>
            <div className="text-2xl text-[var(--color-ink)]">
              ₹{stats.totalValue.toLocaleString()}
            </div>
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
          <div
            className="flex items-center justify-between gap-4 px-6 py-4"
            style={{ borderBottom: '1px solid #E8F0F4' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #E5FBFF 0%, #D5F5FF 100%)',
                  boxShadow: '0 14px 30px rgba(0, 169, 183, 0.12)',
                }}
              >
                <WalletCards className="w-6 h-6" style={{ color: '#008A96' }} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="px-3 py-1 rounded-full text-xs"
                  style={{ backgroundColor: '#E7FBFD', color: '#00808C', fontWeight: 700 }}
                >
                  Advance Register
                </span>
                <span
                  className="px-3 py-1 rounded-full text-xs"
                  style={{ backgroundColor: '#E8FFF2', color: '#0F9D69', fontWeight: 700 }}
                >
                  {filteredRequests.length} Visible
                </span>
              </div>
            </div>
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
              style={{
                border: '1px solid var(--color-fog)',
                color: 'var(--color-ink)',
                backgroundColor: '#FFFFFF',
              }}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          <div className="overflow-x-auto">
            <div style={{ minWidth: '1500px' }}>
              <div
                className="grid gap-4 px-6 py-4"
                style={{
                  gridTemplateColumns: '1.7fr 1.7fr 1fr 1.4fr 1fr 1fr 1fr 1fr 1fr 0.9fr',
                  borderBottom: '1px solid #E8F0F4',
                }}
              >
                <div className="space-y-2">
                  <div className="relative w-full">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-mercury-grey)]" />
                    <input
                      type="text"
                      placeholder="Search advance..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
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
                        setStatusFilter([]);
                        setTypeFilter([]);
                        setPaymentFilter([]);
                        setPriorityFilter([]);
                        setFilterDateRange({ from: '', to: '' });
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                      style={{
                        backgroundColor: '#FFF5F5',
                        border: '1px solid #FED7D7',
                        color: '#C53030',
                        fontWeight: 600,
                      }}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
                <div />
                <div className="flex items-start">
                  <PremiumFilterMenu
                    label="Type"
                    options={['PO-based', 'On-Account']}
                    selected={typeFilter}
                    onToggle={(value) =>
                      setTypeFilter((current) => toggleMultiSelect(current, value))
                    }
                  />
                </div>
                <div />
                <div />
                <div />
                <div className="flex items-start">
                  <PremiumFilterMenu
                    label="Status"
                    options={['Draft', 'Submitted', 'Approved', 'Rejected', 'Cancelled']}
                    selected={statusFilter}
                    onToggle={(value) =>
                      setStatusFilter((current) => toggleMultiSelect(current, value))
                    }
                  />
                </div>
                <div className="flex items-start">
                  <PremiumFilterMenu
                    label="Payment"
                    options={['Pending', 'In Queue', 'Processed', 'Failed']}
                    selected={paymentFilter}
                    onToggle={(value) =>
                      setPaymentFilter((current) => toggleMultiSelect(current, value))
                    }
                  />
                </div>
                <div className="flex items-start">
                  <PremiumFilterMenu
                    label="Priority"
                    options={['Low', 'Medium', 'High', 'Critical']}
                    selected={priorityFilter}
                    onToggle={(value) =>
                      setPriorityFilter((current) => toggleMultiSelect(current, value))
                    }
                  />
                </div>
                <div />
              </div>

              <div
                className="grid gap-4 px-6 py-4"
                style={{
                  gridTemplateColumns: '1.7fr 1.7fr 1fr 1.4fr 1fr 1fr 1fr 1fr 1fr 0.9fr',
                  background: 'linear-gradient(180deg, #F8FBFD 0%, #F3F8FB 100%)',
                  borderBottom: '1px solid #E4EDF2',
                }}
              >
                {[
                  'Request',
                  'Vendor',
                  'Type',
                  'PO / Milestone',
                  'Requested',
                  'Approved',
                  'Status',
                  'Payment',
                  'Priority',
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

              {filteredRequests.length > 0 ? (
                filteredRequests.map((request) => (
                  <div
                    key={request.id}
                    className="grid gap-4 px-6 py-4 hover:bg-[#F8FCFE]"
                    style={{
                      gridTemplateColumns: '1.7fr 1.7fr 1fr 1.4fr 1fr 1fr 1fr 1fr 1fr 0.9fr',
                      borderBottom: '1px solid #EDF3F7',
                    }}
                  >
                    <div>
                      <span className="text-[var(--color-teal)]">{request.requestNumber}</span>
                      <div className="text-xs text-[var(--color-mercury-grey)] mt-0.5">
                        {request.createdDate}
                      </div>
                    </div>
                    <div>
                      <div className="text-[var(--color-ink)]">{request.vendor}</div>
                      <div className="text-xs text-[var(--color-mercury-grey)] mt-0.5">
                        {request.vendorCode}
                      </div>
                    </div>
                    <div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          request.advanceType === 'PO-based'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-px-teal-light text-px-teal-dark'
                        }`}
                      >
                        {request.advanceType}
                      </span>
                    </div>
                    <div>
                      {request.poNumber ? (
                        <div>
                          <div className="text-[var(--color-ink)]">{request.poNumber}</div>
                          {request.milestoneName && (
                            <div className="text-xs text-[var(--color-mercury-grey)] mt-0.5">
                              {request.milestoneName}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--color-mercury-grey)]">-</span>
                      )}
                    </div>
                    <div className="text-[var(--color-ink)] text-right">
                      {request.currency} {request.requestedAmount.toLocaleString()}
                    </div>
                    <div className="text-right">
                      {request.approvedAmount ? (
                        <span className="text-[var(--color-teal)]">
                          {request.currency} {request.approvedAmount.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-[var(--color-mercury-grey)]">-</span>
                      )}
                    </div>
                    <div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${getStatusBadge(request.status)}`}
                      >
                        {request.status}
                      </span>
                    </div>
                    <div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${getPaymentStatusBadge(request.paymentStatus)}`}
                      >
                        {request.paymentStatus}
                      </span>
                    </div>
                    <div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${getPriorityBadge(request.priority)}`}
                      >
                        {request.priority}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <PremiumActionButton
                        label="View request"
                        icon={<Eye className="w-4 h-4" />}
                        tone="teal"
                        onClick={() => alert(`View details for ${request.requestNumber}`)}
                      />
                      {request.status === 'Draft' && (
                        <PremiumActionButton
                          label="Edit request"
                          icon={<Edit className="w-4 h-4" />}
                          tone="violet"
                          onClick={() => navigate(`/ap/advance-request-form?edit=${request.id}`)}
                        />
                      )}
                      <PremiumActionButton
                        label="Open request"
                        icon={<ArrowUpRight className="w-4 h-4" />}
                        tone="blue"
                        onClick={() => alert(`Open ${request.requestNumber}`)}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-[var(--color-mercury-grey)] opacity-50" />
                  <p className="text-[var(--color-mercury-grey)]">No advance requests found</p>
                  <p className="text-sm text-[var(--color-mercury-grey)] mt-1">
                    {hasActiveFilters
                      ? 'Try adjusting your filters'
                      : 'Create your first advance request to get started'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
