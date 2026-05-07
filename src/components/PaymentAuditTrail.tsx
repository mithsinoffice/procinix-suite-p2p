import { useState } from 'react';
import {
  FileSearch,
  TrendingUp,
  Users,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  ChevronRight,
  User,
  Calendar,
  DollarSign,
  Percent,
  Activity,
} from 'lucide-react';
import { paymentTraces, paymentReports, vendorPaymentHistory } from '../data/paymentAuditData';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export function PaymentAuditTrail() {
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');

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
    return `₹${amount.toLocaleString()}`;
  };

  const getStatusBadge = (status: string) => {
    const config = {
      completed: { label: 'Completed', bg: '#D1FAE5', color: '#10B981', icon: CheckCircle },
      failed: { label: 'Failed', bg: 'var(--color-error-light)', color: '#EF4444', icon: XCircle },
      pending: { label: 'Pending', bg: '#FEF3C7', color: '#F59E0B', icon: Clock },
      cancelled: { label: 'Cancelled', bg: '#F3F4F6', color: '#6B7280', icon: AlertCircle },
    };
    const {
      label,
      bg,
      color,
      icon: Icon,
    } = config[status as keyof typeof config] || config.pending;

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

  const filteredTraces =
    filterStatus === 'all' ? paymentTraces : paymentTraces.filter((t) => t.status === filterStatus);

  const selectedTraceData = paymentTraces.find((t) => t.invoiceNo === selectedTrace);

  // Chart data
  const successRateData = paymentReports.map((report) => ({
    period: report.period.split(' ')[0],
    'Success Rate': ((report.successfulPayments / report.totalPayments) * 100).toFixed(1),
    'Total Payments': report.totalPayments,
  }));

  const discountData = paymentReports.map((report) => ({
    period: report.period.split(' ')[0],
    Captured: report.discountsCaptured / 100000,
    Missed: report.discountsMissed / 100000,
  }));

  const currentReport = paymentReports[0];
  const pieData = [
    { name: 'Successful', value: currentReport.successfulPayments, color: '#10B981' },
    { name: 'Failed', value: currentReport.failedPayments, color: '#EF4444' },
  ];

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl mb-1" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
              Payment Reports & Audit Trail
            </h1>
            <p style={{ color: 'var(--color-mercury-grey)', fontSize: '14px' }}>
              Full traceability from invoice to payment
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="px-4 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--color-silver)',
                color: 'var(--color-ink)',
              }}
            >
              <option value="current">Current Month</option>
              <option value="last-month">Last Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
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
                Export Report
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-[1600px] mx-auto">
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div
            className="bg-white rounded-lg p-6"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#E0F2F1' }}>
                <Activity className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
              </div>
              <div>
                <div className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
                  {currentReport.totalPayments}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                  Total Payments
                </div>
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-lg p-6"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#D1FAE5' }}>
                <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
              </div>
              <div>
                <div className="text-2xl" style={{ color: '#10B981', fontWeight: '700' }}>
                  {((currentReport.successfulPayments / currentReport.totalPayments) * 100).toFixed(
                    1
                  )}
                  %
                </div>
                <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                  Success Rate
                </div>
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-lg p-6"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#D1FAE5' }}>
                <Percent className="w-5 h-5" style={{ color: '#10B981' }} />
              </div>
              <div>
                <div className="text-xl" style={{ color: '#10B981', fontWeight: '700' }}>
                  {formatCurrency(currentReport.discountsCaptured)}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                  Discounts Captured
                </div>
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-lg p-6"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: 'var(--color-error-light)' }}
              >
                <Percent className="w-5 h-5" style={{ color: '#EF4444' }} />
              </div>
              <div>
                <div className="text-xl" style={{ color: '#EF4444', fontWeight: '700' }}>
                  {formatCurrency(currentReport.discountsMissed)}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                  Discounts Missed
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* Success Rate Trend */}
          <div
            className="bg-white rounded-lg p-6"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <h3
              className="mb-4"
              style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '16px' }}
            >
              Payment Success Rate
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={successRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver)" />
                <XAxis
                  dataKey="period"
                  tick={{ fill: 'var(--color-mercury-grey)', fontSize: 11 }}
                />
                <YAxis tick={{ fill: 'var(--color-mercury-grey)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--color-silver)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="Success Rate"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: '#10B981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Success vs Failed */}
          <div
            className="bg-white rounded-lg p-6"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <h3
              className="mb-4"
              style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '16px' }}
            >
              Current Month Breakdown
            </h3>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--color-silver)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10B981' }} />
                <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  Success ({currentReport.successfulPayments})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }} />
                <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  Failed ({currentReport.failedPayments})
                </span>
              </div>
            </div>
          </div>

          {/* Discounts Captured vs Missed */}
          <div
            className="bg-white rounded-lg p-6"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <h3
              className="mb-4"
              style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '16px' }}
            >
              Discount Analysis (in Lakhs)
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={discountData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver)" />
                <XAxis
                  dataKey="period"
                  tick={{ fill: 'var(--color-mercury-grey)', fontSize: 11 }}
                />
                <YAxis tick={{ fill: 'var(--color-mercury-grey)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--color-silver)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => `₹${value.toFixed(2)}L`}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Captured" fill="#10B981" />
                <Bar dataKey="Missed" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Invoice to Payment Trace */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Payment Trace List */}
          <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-silver)' }}>
              <div className="flex items-center justify-between">
                <h3 style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '16px' }}>
                  Invoice to Payment Trace
                </h3>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-xs"
                  style={{
                    backgroundColor: 'var(--color-cloud)',
                    border: '1px solid var(--color-silver)',
                    color: 'var(--color-ink)',
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
            <div
              className="divide-y"
              style={{ borderColor: 'var(--color-silver)', maxHeight: '600px', overflowY: 'auto' }}
            >
              {filteredTraces.map((trace) => (
                <div
                  key={trace.invoiceNo}
                  className="p-4 cursor-pointer transition-colors"
                  style={{
                    backgroundColor:
                      selectedTrace === trace.invoiceNo ? 'var(--color-cloud)' : '#FFFFFF',
                  }}
                  onClick={() => setSelectedTrace(trace.invoiceNo)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div
                        style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '14px' }}
                      >
                        {trace.invoiceNo}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                        {trace.vendor}
                      </div>
                    </div>
                    {getStatusBadge(trace.status)}
                  </div>
                  <div className="flex items-center justify-between">
                    <div
                      className="text-sm"
                      style={{ color: 'var(--color-teal)', fontWeight: '700' }}
                    >
                      {formatCurrency(trace.amount, trace.currency)}
                    </div>
                    <div
                      className="flex items-center gap-1 text-xs"
                      style={{ color: 'var(--color-mercury-grey)' }}
                    >
                      {trace.paymentMode}
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline View */}
          <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-silver)' }}>
              <h3 style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '16px' }}>
                Payment Timeline
              </h3>
            </div>
            {selectedTraceData ? (
              <div className="p-6">
                {/* Summary */}
                <div
                  className="mb-6 p-4 rounded-lg"
                  style={{ backgroundColor: 'var(--color-cloud)' }}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                        Invoice No
                      </div>
                      <div style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
                        {selectedTraceData.invoiceNo}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                        Amount
                      </div>
                      <div style={{ color: 'var(--color-teal)', fontWeight: '700' }}>
                        {formatCurrency(selectedTraceData.amount, selectedTraceData.currency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                        Payment Mode
                      </div>
                      <div style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                        {selectedTraceData.paymentMode}
                      </div>
                    </div>
                    {selectedTraceData.bankReference && (
                      <div>
                        <div
                          className="text-xs mb-1"
                          style={{ color: 'var(--color-mercury-grey)' }}
                        >
                          Bank Reference
                        </div>
                        <div
                          style={{
                            color: '#10B981',
                            fontWeight: '600',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                          }}
                        >
                          {selectedTraceData.bankReference}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-4" style={{ maxHeight: '450px', overflowY: 'auto' }}>
                  {selectedTraceData.timeline.map((event, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              event.timestamp === 'Pending' ? '#F59E0B' : 'var(--color-teal)',
                          }}
                        />
                        {index < selectedTraceData.timeline.length - 1 && (
                          <div
                            className="flex-1 w-0.5 mt-2"
                            style={{ backgroundColor: 'var(--color-silver)', minHeight: '40px' }}
                          />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between mb-1">
                          <div
                            style={{
                              color: 'var(--color-ink)',
                              fontWeight: '700',
                              fontSize: '13px',
                            }}
                          >
                            {event.stage}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                            {event.timestamp !== 'Pending' &&
                              new Date(event.timestamp).toLocaleString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            {event.timestamp === 'Pending' && 'Pending'}
                          </div>
                        </div>
                        <div
                          className="text-sm mb-1"
                          style={{ color: 'var(--color-mercury-grey)' }}
                        >
                          {event.action}
                        </div>
                        <div
                          className="flex items-center gap-1 text-xs"
                          style={{ color: 'var(--color-slate)' }}
                        >
                          <User className="w-3 h-3" />
                          <span>{event.user}</span>
                          <span>•</span>
                          <span>{event.role}</span>
                        </div>
                        {event.details && (
                          <div
                            className="mt-2 p-2 rounded text-xs"
                            style={{
                              backgroundColor: 'var(--color-cloud)',
                              color: 'var(--color-mercury-grey)',
                            }}
                          >
                            {event.details}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center" style={{ color: 'var(--color-slate)' }}>
                <Eye className="w-12 h-12 mx-auto mb-3" style={{ opacity: 0.3 }} />
                <div className="text-sm">Select an invoice to view payment timeline</div>
              </div>
            )}
          </div>
        </div>

        {/* Vendor Payment History */}
        <div
          className="bg-white rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--color-silver)' }}
        >
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-silver)' }}>
            <h3 style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '16px' }}>
              Vendor Payment History
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--color-cloud)',
                    borderBottom: '1px solid var(--color-silver)',
                  }}
                >
                  <th
                    className="text-left px-6 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    VENDOR
                  </th>
                  <th
                    className="text-right px-4 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    TOTAL PAID (YTD)
                  </th>
                  <th
                    className="text-center px-4 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    PAYMENTS
                  </th>
                  <th
                    className="text-center px-4 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    AVG DAYS
                  </th>
                  <th
                    className="text-center px-4 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    ON-TIME %
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    LAST PAYMENT
                  </th>
                  <th
                    className="text-right px-6 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    LAST AMOUNT
                  </th>
                </tr>
              </thead>
              <tbody>
                {vendorPaymentHistory.map((vendor, index) => (
                  <tr
                    key={vendor.vendorCode}
                    style={{
                      backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFBFC',
                      borderBottom: '1px solid var(--color-silver)',
                    }}
                  >
                    <td className="px-6 py-4">
                      <div
                        style={{ color: 'var(--color-ink)', fontWeight: '600', fontSize: '13px' }}
                      >
                        {vendor.vendor}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                        {vendor.vendorCode}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span
                        style={{ color: 'var(--color-teal)', fontWeight: '700', fontSize: '14px' }}
                      >
                        {formatCurrency(vendor.totalPaid)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className="text-sm"
                        style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                      >
                        {vendor.paymentsCount}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className="px-2 py-1 rounded text-xs"
                        style={{
                          backgroundColor: vendor.averagePaymentTime <= 30 ? '#D1FAE5' : '#FEF3C7',
                          color: vendor.averagePaymentTime <= 30 ? '#10B981' : '#F59E0B',
                          fontWeight: '600',
                        }}
                      >
                        {vendor.averagePaymentTime}d
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className="px-2 py-1 rounded text-xs"
                        style={{
                          backgroundColor:
                            vendor.onTimePercentage >= 90
                              ? '#D1FAE5'
                              : vendor.onTimePercentage >= 75
                                ? '#FEF3C7'
                                : 'var(--color-error-light)',
                          color:
                            vendor.onTimePercentage >= 90
                              ? '#10B981'
                              : vendor.onTimePercentage >= 75
                                ? '#F59E0B'
                                : '#EF4444',
                          fontWeight: '700',
                        }}
                      >
                        {vendor.onTimePercentage}%
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm" style={{ color: 'var(--color-ink)' }}>
                        {new Date(vendor.lastPaymentDate).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        style={{ color: 'var(--color-ink)', fontWeight: '600', fontSize: '13px' }}
                      >
                        {formatCurrency(vendor.lastPaymentAmount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
