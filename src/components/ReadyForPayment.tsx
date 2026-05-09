import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Calendar,
  Building2,
  FileText,
  Search,
  Filter,
  CheckCircle,
  Clock,
  TrendingUp,
  ArrowRight,
  Eye,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchPayableInvoices } from '../lib/paymentsApi';
import type { ProposalInvoice } from '../data/paymentProposalData';

type DisplayPriority = 'High' | 'Medium' | 'Low';

interface DisplayInvoice {
  id: string;
  invoiceNumber: string;
  vendorName: string;
  vendorCode: string;
  invoiceDate: string;
  dueDate: string;
  daysUntilDue: number;
  netPayable: number;
  currency: string;
  aging: number;
  priority: DisplayPriority;
  paymentMode: string;
  lifecycleState: string;
}

function mapPriority(apiPriority: ProposalInvoice['priority']): DisplayPriority {
  if (apiPriority === 'critical' || apiPriority === 'high') return 'High';
  if (apiPriority === 'low') return 'Low';
  return 'Medium';
}

function computeDaysUntilDue(dueDate: string | null | undefined): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function adapt(row: ProposalInvoice): DisplayInvoice {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNo || row.id,
    vendorName: row.vendor || '—',
    vendorCode: row.vendorCode || '—',
    invoiceDate: row.invoiceDate || '',
    dueDate: row.dueDate || '',
    daysUntilDue: computeDaysUntilDue(row.dueDate),
    netPayable: Number(row.amount) || 0,
    currency: row.currency || 'INR',
    aging: Number(row.aging) || 0,
    priority: mapPriority(row.priority),
    paymentMode: row.paymentMode || 'NEFT',
    lifecycleState: row.lifecycleState || row.status || '',
  };
}

function formatCurrency(value: number, currency: string): string {
  const sym = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : `${currency} `;
  return `${sym}${Math.round(value).toLocaleString('en-IN')}`;
}

export function ReadyForPayment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? null;
  const entityId = user?.currentPlatformEntityId ?? null;

  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [invoices, setInvoices] = useState<DisplayInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tenantId) {
        if (!cancelled) {
          setInvoices([]);
          setError(null);
        }
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchPayableInvoices(tenantId, entityId ?? undefined);
        if (!cancelled) setInvoices(rows.map(adapt));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load payable invoices');
          setInvoices([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, entityId, reloadKey]);

  const getPriorityStyle = (priority: DisplayPriority) => {
    const styles = {
      High: { bg: 'var(--color-error-light)', color: 'var(--color-error-dark)' },
      Medium: { bg: '#FEF3C7', color: '#D97706' },
      Low: { bg: '#D1FAE5', color: '#047857' },
    };
    return styles[priority];
  };

  const filteredInvoices = useMemo(
    () =>
      invoices
        .filter((inv) => {
          const q = searchTerm.trim().toLowerCase();
          const matchesSearch =
            !q ||
            inv.invoiceNumber.toLowerCase().includes(q) ||
            inv.vendorName.toLowerCase().includes(q) ||
            inv.vendorCode.toLowerCase().includes(q);
          const matchesPriority = priorityFilter === 'All' || inv.priority === priorityFilter;
          return matchesSearch && matchesPriority;
        })
        .sort((a, b) => a.daysUntilDue - b.daysUntilDue),
    [invoices, searchTerm, priorityFilter]
  );

  const totalPayable = invoices.reduce((sum, inv) => sum + inv.netPayable, 0);
  const dueSoon = invoices.filter((i) => i.daysUntilDue <= 7).length;
  const overdueCount = invoices.filter((i) => i.daysUntilDue < 0).length;

  const stats = [
    {
      label: 'Ready for Payment',
      value: invoices.length,
      icon: FileText,
      color: 'var(--color-teal)',
      bg: 'var(--color-teal)10',
    },
    {
      label: 'Total Payable',
      value:
        totalPayable >= 100000
          ? `₹${(totalPayable / 100000).toFixed(1)}L`
          : `₹${Math.round(totalPayable).toLocaleString('en-IN')}`,
      icon: DollarSign,
      color: 'var(--color-teal)',
      bg: 'var(--color-teal)10',
    },
    {
      label: 'Due in 7 Days',
      value: dueSoon,
      icon: Clock,
      color: '#D97706',
      bg: '#FEF3C7',
    },
    {
      label: 'Overdue',
      value: overdueCount,
      icon: TrendingUp,
      color: 'var(--color-error-dark)',
      bg: 'var(--color-error-light)',
    },
  ];

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }} className="p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl mb-2" style={{ color: 'var(--color-ink)' }}>
            Ready for Payment
          </h1>
          <p style={{ color: 'var(--color-mercury-grey)' }}>
            Approved invoices queued for payment processing
          </p>
        </div>
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors"
          style={{
            borderColor: 'var(--color-silver)',
            backgroundColor: 'white',
            color: 'var(--color-mercury-grey)',
          }}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl p-4 border-2"
            style={{ borderColor: 'var(--color-silver)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                {stat.label}
              </span>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: stat.bg }}
              >
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
            </div>
            <p className="text-2xl" style={{ color: 'var(--color-ink)' }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Info Banner */}
      <div
        className="bg-white rounded-xl border-2 p-4 mb-6"
        style={{ borderColor: 'var(--color-teal)', backgroundColor: 'var(--color-teal)10' }}
      >
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 flex-shrink-0 mt-0.5 text-[var(--color-teal)]" />
          <div className="flex-1">
            <h3 className="mb-1" style={{ color: 'var(--color-teal)' }}>
              Approved invoices, awaiting payment
            </h3>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
              These invoices have cleared approval and are ready to be batched. Open the Payment
              Proposal to group them into a payment batch and submit for execution.
            </p>
          </div>
          <button
            onClick={() => navigate('/ap/payment-proposal')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
            style={{ backgroundColor: 'var(--color-teal)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal)')}
          >
            Build Payment Batch
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div
        className="bg-white rounded-xl border-2 mb-4"
        style={{ borderColor: 'var(--color-silver)' }}
      >
        <div className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                style={{ color: 'var(--color-mercury-grey)' }}
              />
              <input
                type="text"
                placeholder="Search by invoice number, vendor, or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border-2"
                style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors"
              style={{
                borderColor: showFilters ? 'var(--color-teal)' : 'var(--color-silver)',
                backgroundColor: showFilters ? 'var(--color-teal)10' : 'white',
                color: showFilters ? 'var(--color-teal)' : 'var(--color-mercury-grey)',
              }}
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div
              className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t-2"
              style={{ borderColor: 'var(--color-silver)' }}
            >
              <div>
                <label
                  className="block text-sm mb-1"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Priority
                </label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2"
                  style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
                >
                  <option>All</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div
          className="bg-white rounded-xl border-2 p-4 mb-4"
          style={{
            borderColor: 'var(--color-error-dark)',
            backgroundColor: 'var(--color-error-light)',
          }}
        >
          <p style={{ color: 'var(--color-error-dark)' }}>Failed to load: {error}</p>
        </div>
      )}

      {/* Table */}
      <div
        className="bg-white rounded-xl border-2 overflow-hidden"
        style={{ borderColor: 'var(--color-silver)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
              <tr>
                <th
                  className="text-left px-6 py-4 text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Invoice Number
                </th>
                <th
                  className="text-left px-6 py-4 text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Vendor
                </th>
                <th
                  className="text-left px-6 py-4 text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Invoice Date
                </th>
                <th
                  className="text-left px-6 py-4 text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Due Date
                </th>
                <th
                  className="text-right px-6 py-4 text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Outstanding
                </th>
                <th
                  className="text-center px-6 py-4 text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Priority
                </th>
                <th
                  className="text-left px-6 py-4 text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Payment Method
                </th>
                <th
                  className="text-right px-6 py-4 text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => {
                const priorityStyle = getPriorityStyle(invoice.priority);
                const isOverdue = invoice.daysUntilDue < 0;
                const isDueSoon = invoice.daysUntilDue >= 0 && invoice.daysUntilDue <= 7;
                const dueColor = isOverdue
                  ? 'var(--color-error-dark)'
                  : isDueSoon
                    ? '#D97706'
                    : 'var(--color-ink)';
                const dueLabel = isOverdue
                  ? `${Math.abs(invoice.daysUntilDue)}d overdue`
                  : `${invoice.daysUntilDue}d`;

                return (
                  <tr
                    key={invoice.id}
                    className="border-t-2 hover:bg-[var(--color-cloud)] transition-colors"
                    style={{ borderColor: 'var(--color-silver)' }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[var(--color-teal)]" />
                        <div>
                          <p style={{ color: 'var(--color-ink)' }}>{invoice.invoiceNumber}</p>
                          <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                            {invoice.lifecycleState || 'Approved'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2
                          className="w-4 h-4"
                          style={{ color: 'var(--color-mercury-grey)' }}
                        />
                        <div>
                          <p style={{ color: 'var(--color-ink)' }}>{invoice.vendorName}</p>
                          <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                            {invoice.vendorCode}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                      {invoice.invoiceDate || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" style={{ color: dueColor }} />
                        <div>
                          <p style={{ color: dueColor }}>{invoice.dueDate || '—'}</p>
                          <p className="text-xs" style={{ color: dueColor }}>
                            {dueLabel}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p style={{ color: 'var(--color-ink)' }}>
                        {formatCurrency(invoice.netPayable, invoice.currency)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className="inline-block px-3 py-1 rounded-full text-sm"
                        style={{ backgroundColor: priorityStyle.bg, color: priorityStyle.color }}
                      >
                        {invoice.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                      {invoice.paymentMode}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/invoices/${invoice.id}`)}
                          className="p-2 rounded-lg hover:bg-[var(--color-silver)] transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                        </button>
                        <button
                          onClick={() => navigate('/ap/payment-proposal')}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm text-white transition-colors"
                          style={{ backgroundColor: 'var(--color-teal)' }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)')
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor = 'var(--color-teal)')
                          }
                        >
                          Process
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle
              className="w-12 h-12 mx-auto mb-3"
              style={{ color: 'var(--color-silver)' }}
            />
            <p style={{ color: 'var(--color-mercury-grey)' }}>
              {invoices.length === 0
                ? 'No invoices ready for payment'
                : 'No invoices match the current filters'}
            </p>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <RefreshCw
              className="w-8 h-8 mx-auto mb-3 animate-spin"
              style={{ color: 'var(--color-teal)' }}
            />
            <p style={{ color: 'var(--color-mercury-grey)' }}>Loading approved invoices…</p>
          </div>
        )}
      </div>
    </div>
  );
}
