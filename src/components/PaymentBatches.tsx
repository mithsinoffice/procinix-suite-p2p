import { useState } from 'react';
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
import { mockPaymentBatches } from '../data/paymentBatchData';

export function PaymentBatches() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
      'draft': { label: 'Draft', bg: '#F3F4F6', color: '#6B7280', icon: FileText },
      'pending-approval': { label: 'Pending', bg: '#FEF3C7', color: '#F59E0B', icon: Clock },
      'approved': { label: 'Approved', bg: '#D1FAE5', color: '#10B981', icon: CheckCircle },
      'executed': { label: 'Executed', bg: '#E0F2F1', color: '#00A9B7', icon: CheckCircle },
      'failed': { label: 'Failed', bg: '#FEE2E2', color: '#EF4444', icon: XCircle },
      'partially-executed': { label: 'Partial', bg: '#FEF3C7', color: '#F59E0B', icon: AlertTriangle },
      'rejected': { label: 'Rejected', bg: '#FEE2E2', color: '#EF4444', icon: XCircle },
    };

    const { label, bg, color, icon: Icon } = config[status as keyof typeof config] || config.draft;

    return (
      <div
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded"
        style={{ backgroundColor: bg }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span style={{ color, fontWeight: '600', fontSize: '12px' }}>
          {label}
        </span>
      </div>
    );
  };

  const filteredBatches = mockPaymentBatches.filter(batch => {
    if (statusFilter !== 'all' && batch.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return batch.batchNo.toLowerCase().includes(query) ||
             batch.createdBy.toLowerCase().includes(query);
    }
    return true;
  });

  return (
    <div style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      {/* Header */}
      <div
        className="px-8 py-6"
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '2px solid #E1E6EA',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl mb-1" style={{ color: '#0A0F14', fontWeight: '700' }}>
              Payment Batches
            </h1>
            <p style={{ color: '#6E7A82', fontSize: '14px' }}>
              Maker-checker approval and execution workflow
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E1E6EA',
                color: '#6E7A82',
              }}
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm" style={{ fontWeight: '500' }}>Refresh</span>
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E1E6EA',
                color: '#6E7A82',
              }}
            >
              <Download className="w-4 h-4" />
              <span className="text-sm" style={{ fontWeight: '500' }}>Export</span>
            </button>
            <button
              onClick={() => navigate('/ap/payment-proposal')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: '#00A9B7',
                color: '#FFFFFF',
                border: 'none',
              }}
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm" style={{ fontWeight: '600' }}>Create Batch</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-4">
        <div className="bg-white rounded-lg p-4" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9AA6AF' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by batch number or creator..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: '#F6F9FC',
                    border: '1px solid #E1E6EA',
                    color: '#0A0F14',
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
                  backgroundColor: '#F6F9FC',
                  border: '1px solid #E1E6EA',
                  color: '#0A0F14',
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
        <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #E1E6EA' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#F6F9FC', borderBottom: '2px solid #E1E6EA' }}>
                  <th className="text-left px-6 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '700' }}>
                    BATCH NO
                  </th>
                  <th className="text-right px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '700' }}>
                    AMOUNT
                  </th>
                  <th className="text-center px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '700' }}>
                    INVOICES
                  </th>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '700' }}>
                    PAYMENT DATE
                  </th>
                  <th className="text-center px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '700' }}>
                    MODE
                  </th>
                  <th className="text-center px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '700' }}>
                    STATUS
                  </th>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '700' }}>
                    CREATED BY
                  </th>
                  <th className="text-center px-6 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '700' }}>
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
                      borderBottom: '1px solid #E1E6EA',
                    }}
                  >
                    <td className="px-6 py-4">
                      <div style={{ color: '#0A0F14', fontWeight: '700', fontSize: '14px' }}>
                        {batch.batchNo}
                      </div>
                      <div className="text-xs" style={{ color: '#6E7A82' }}>
                        {new Date(batch.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div style={{ color: '#00A9B7', fontWeight: '700', fontSize: '15px' }}>
                        {formatCurrency(batch.totalAmount, batch.currency)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div
                        className="inline-block px-2 py-1 rounded text-sm"
                        style={{ backgroundColor: '#E0F2F1', color: '#00A9B7', fontWeight: '600' }}
                      >
                        {batch.invoiceCount}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm" style={{ color: '#0A0F14' }}>
                        {new Date(batch.paymentDate).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>
                        {batch.paymentMode}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {getStatusBadge(batch.status)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm" style={{ color: '#0A0F14', fontWeight: '500' }}>
                        {batch.createdBy.split(' (')[0]}
                      </div>
                      <div className="text-xs" style={{ color: '#6E7A82' }}>
                        {batch.createdBy.split('(')[1]?.replace(')', '')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => navigate(`/ap/payment-batches/${batch.id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                        style={{
                          backgroundColor: '#00A9B7',
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

        <div className="mt-4 text-sm" style={{ color: '#6E7A82' }}>
          Showing {filteredBatches.length} of {mockPaymentBatches.length} batches
        </div>
      </div>
    </div>
  );
}