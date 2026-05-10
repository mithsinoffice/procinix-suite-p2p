import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import type { PaymentBatchListRow } from '../data/paymentBatchData';
import { useAuth } from '../contexts/AuthContext';
import { fetchPaymentBatches } from '../lib/paymentsApi';

export function PaymentBatches() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [batches, setBatches] = useState<PaymentBatchListRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadBatches = useCallback(async () => {
    if (!user?.tenantId) {
      setBatches([]);
      return;
    }
    setListLoading(true);
    try {
      const rows = await fetchPaymentBatches(user.tenantId);
      setBatches(rows);
    } catch {
      setBatches([]);
    } finally {
      setListLoading(false);
    }
  }, [user?.tenantId]);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    if (currency === 'USD') {
      if (amount >= 1000000) {
        return `$${(amount / 1000000).toFixed(2)}M`;
      }
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)}Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const config = {
      draft: { label: 'Draft', bg: '#F3F4F6', color: '#6B7280', icon: FileText },
      'pending-approval': { label: 'Pending', bg: '#FEF3C7', color: '#F59E0B', icon: Clock },
      approved: { label: 'Approved', bg: '#D1FAE5', color: '#10B981', icon: CheckCircle },
      executed: { label: 'Executed', bg: '#E0F2F1', color: 'var(--color-teal)', icon: CheckCircle },
      failed: { label: 'Failed', bg: 'var(--color-error-light)', color: '#EF4444', icon: XCircle },
      'partially-executed': {
        label: 'Partial',
        bg: '#FEF3C7',
        color: '#F59E0B',
        icon: AlertTriangle,
      },
      rejected: {
        label: 'Rejected',
        bg: 'var(--color-error-light)',
        color: '#EF4444',
        icon: XCircle,
      },
    };

    const { label, bg, color, icon: Icon } = config[status as keyof typeof config] || config.draft;

    return (
      <div
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded"
        style={{ backgroundColor: bg }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span style={{ color, fontWeight: '600', fontSize: '12px' }}>{label}</span>
      </div>
    );
  };

  const filteredBatches = batches.filter((batch) => {
    if (statusFilter !== 'all' && batch.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        batch.batchNo.toLowerCase().includes(query) || batch.createdBy.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      {/* Header */}
      <div
        className="px-8 py-6"
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '2px solid var(--color-silver)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl mb-1" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
              Payment Batches
            </h1>
            <p style={{ color: 'var(--color-mercury-grey)', fontSize: '14px' }}>
              Maker-checker approval and execution workflow
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void loadBatches()}
              disabled={listLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--color-silver)',
                color: 'var(--color-mercury-grey)',
                opacity: listLoading ? 0.6 : 1,
              }}
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm" style={{ fontWeight: '500' }}>
                {listLoading ? 'Refreshing…' : 'Refresh'}
              </span>
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--color-silver)',
                color: 'var(--color-mercury-grey)',
              }}
            >
              <Download className="w-4 h-4" />
              <span className="text-sm" style={{ fontWeight: '500' }}>
                Export
              </span>
            </button>
            <button
              onClick={() => navigate('/ap/payment-proposal')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: 'var(--color-teal)',
                color: '#FFFFFF',
                border: 'none',
              }}
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm" style={{ fontWeight: '600' }}>
                Create Batch
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-4">
        <div
          className="bg-white rounded-lg p-4"
          style={{ border: '1px solid var(--color-silver)' }}
        >
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--color-slate)' }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by batch number or creator..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--color-cloud)',
                    border: '1px solid var(--color-silver)',
                    color: 'var(--color-ink)',
                  }}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-64">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--color-cloud)',
                  border: '1px solid var(--color-silver)',
                  color: 'var(--color-ink)',
                }}
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending-approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="executed">Executed</option>
                <option value="partially-executed">Partially Executed</option>
                <option value="failed">Failed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Batches Table */}
      <div className="px-8 pb-8">
        <div
          className="bg-white rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--color-silver)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--color-cloud)',
                    borderBottom: '2px solid var(--color-silver)',
                  }}
                >
                  <th
                    className="text-left px-6 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    BATCH NO
                  </th>
                  <th
                    className="text-right px-4 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    AMOUNT
                  </th>
                  <th
                    className="text-center px-4 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    INVOICES
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    PAYMENT DATE
                  </th>
                  <th
                    className="text-center px-4 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    MODE
                  </th>
                  <th
                    className="text-center px-4 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    STATUS
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    CREATED BY
                  </th>
                  <th
                    className="text-center px-6 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map((batch, index) => (
                  <tr
                    key={batch.id}
                    style={{
                      backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFBFC',
                      borderBottom: '1px solid var(--color-silver)',
                    }}
                  >
                    <td className="px-6 py-4">
                      <div
                        style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '14px' }}
                      >
                        {batch.batchNo}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                        {new Date(batch.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div
                        style={{ color: 'var(--color-teal)', fontWeight: '700', fontSize: '15px' }}
                      >
                        {formatCurrency(batch.totalAmount, batch.currency)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div
                        className="inline-block px-2 py-1 rounded text-sm"
                        style={{
                          backgroundColor: '#E0F2F1',
                          color: 'var(--color-teal)',
                          fontWeight: '600',
                        }}
                      >
                        {batch.invoiceCount}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm" style={{ color: 'var(--color-ink)' }}>
                        {new Date(batch.paymentDate).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className="text-sm"
                        style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                      >
                        {batch.paymentMode}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">{getStatusBadge(batch.status)}</td>
                    <td className="px-4 py-4">
                      <div
                        className="text-sm"
                        style={{ color: 'var(--color-ink)', fontWeight: '500' }}
                      >
                        {batch.createdBy.split(' (')[0]}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                        {batch.createdBy.split('(')[1]?.replace(')', '')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => navigate(`/ap/payment-batches/${batch.id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                        style={{
                          backgroundColor: 'var(--color-teal)',
                          color: '#FFFFFF',
                          fontWeight: '600',
                        }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
          Showing {filteredBatches.length} of {batches.length} batches
        </div>
      </div>
    </div>
  );
}
