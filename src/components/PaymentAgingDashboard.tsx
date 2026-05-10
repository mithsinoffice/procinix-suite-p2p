import { useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Download,
  Filter,
  Calendar,
  ArrowUp,
  ArrowDown,
  Pause,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  kpiData,
  agingMovementData,
  vendorAgingData,
  vendorAgingChartData,
  invoiceAgingDetails,
  departmentOverdueData,
} from '../data/paymentAgingData';

export function PaymentAgingDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('current');

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)}Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return `₹${amount.toLocaleString()}`;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical':
        return 'var(--color-error-dark)';
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getRiskBadge = (risk: string) => {
    const colors = {
      critical: { bg: 'var(--color-error-light)', color: 'var(--color-error-dark)' },
      high: { bg: '#FEF2F2', color: '#EF4444' },
      medium: { bg: '#FEF3C7', color: '#F59E0B' },
      low: { bg: '#D1FAE5', color: '#10B981' },
    };
    const config = colors[risk as keyof typeof colors] || colors.low;

    return (
      <span
        className="px-2 py-0.5 rounded text-xs"
        style={{ backgroundColor: config.bg, color: config.color, fontWeight: '600' }}
      >
        {risk.toUpperCase()}
      </span>
    );
  };

  const getHeatmapColor = (percentage: number) => {
    if (percentage >= 20) return 'var(--color-error-dark)';
    if (percentage >= 15) return '#F59E0B';
    if (percentage >= 10) return '#FCD34D';
    return '#10B981';
  };

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
              Payment Aging & Liability Analysis
            </h1>
            <p style={{ color: 'var(--color-mercury-grey)', fontSize: '14px' }}>
              Payable exposure and vendor risk management
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
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
          {/* Average DPO */}
          <div
            className="bg-white rounded-lg p-6"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#E0F2F1' }}>
                <Clock className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
              </div>
              {kpiData.averageDPO > kpiData.previousDPO ? (
                <div className="flex items-center gap-1 text-xs" style={{ color: '#EF4444' }}>
                  <ArrowUp className="w-3 h-3" />
                  <span>
                    {(
                      ((kpiData.averageDPO - kpiData.previousDPO) / kpiData.previousDPO) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs" style={{ color: '#10B981' }}>
                  <ArrowDown className="w-3 h-3" />
                  <span>
                    {(
                      ((kpiData.previousDPO - kpiData.averageDPO) / kpiData.previousDPO) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              )}
            </div>
            <div className="text-3xl mb-2" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
              {kpiData.averageDPO}
            </div>
            <div className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
              Avg Days Payable Outstanding
            </div>
            <div className="text-xs mt-2" style={{ color: 'var(--color-slate)' }}>
              Previous: {kpiData.previousDPO} days
            </div>
          </div>

          {/* Overdue Invoices */}
          <div
            className="bg-white rounded-lg p-6"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: 'var(--color-error-light)' }}
              >
                <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} />
              </div>
              <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                {((kpiData.overdueInvoices / kpiData.totalInvoices) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-3xl mb-2" style={{ color: '#EF4444', fontWeight: '700' }}>
              {kpiData.overdueInvoices}
            </div>
            <div className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
              Overdue Invoices
            </div>
            <div className="text-xs mt-2" style={{ color: 'var(--color-slate)' }}>
              Total: {kpiData.totalInvoices} invoices
            </div>
          </div>

          {/* Vendors on Hold */}
          <div
            className="bg-white rounded-lg p-6"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
                <Pause className="w-5 h-5" style={{ color: '#F59E0B' }} />
              </div>
              <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                {((kpiData.vendorsOnHold / kpiData.totalVendors) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-3xl mb-2" style={{ color: '#F59E0B', fontWeight: '700' }}>
              {kpiData.vendorsOnHold}
            </div>
            <div className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
              Vendors on Payment Hold
            </div>
            <div className="text-xs mt-2" style={{ color: 'var(--color-slate)' }}>
              Total: {kpiData.totalVendors} vendors
            </div>
          </div>

          {/* SLA Breaches */}
          <div
            className="bg-white rounded-lg p-6"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: 'var(--color-error-light)' }}
              >
                <ShieldAlert className="w-5 h-5" style={{ color: 'var(--color-error-dark)' }} />
              </div>
              <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                {((kpiData.slaBreaches / kpiData.totalDue) * 100).toFixed(1)}%
              </div>
            </div>
            <div
              className="text-3xl mb-2"
              style={{ color: 'var(--color-error-dark)', fontWeight: '700' }}
            >
              {kpiData.slaBreaches}
            </div>
            <div className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
              Payment SLA Breaches
            </div>
            <div className="text-xs mt-2" style={{ color: 'var(--color-slate)' }}>
              Total due: {kpiData.totalDue} payments
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Aging Waterfall */}
          <div
            className="bg-white rounded-lg p-6"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '16px' }}>
                  Aging Movement Trend
                </h3>
                <p className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
                  Monthly movement across aging buckets
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agingMovementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--color-mercury-grey)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--color-mercury-grey)', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--color-silver)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="current" name="Current" fill="#10B981" stackId="a" />
                <Bar dataKey="days0_30" name="0-30 Days" fill="var(--color-teal)" stackId="a" />
                <Bar dataKey="days31_60" name="31-60 Days" fill="#F59E0B" stackId="a" />
                <Bar dataKey="days61_90" name="61-90 Days" fill="#EF4444" stackId="a" />
                <Bar
                  dataKey="days90Plus"
                  name="90+ Days"
                  fill="var(--color-error-dark)"
                  stackId="a"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Vendor-wise Aging */}
          <div
            className="bg-white rounded-lg p-6"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '16px' }}>
                  Vendor-wise Aging Exposure
                </h3>
                <p className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
                  Top 10 vendors by outstanding (in lakhs)
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vendorAgingChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver)" />
                <XAxis type="number" tick={{ fill: 'var(--color-mercury-grey)', fontSize: 11 }} />
                <YAxis
                  dataKey="vendor"
                  type="category"
                  tick={{ fill: 'var(--color-mercury-grey)', fontSize: 11 }}
                  width={80}
                />
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
                <Bar dataKey="0-30" name="0-30" fill="#10B981" stackId="a" />
                <Bar dataKey="31-60" name="31-60" fill="#F59E0B" stackId="a" />
                <Bar dataKey="61-90" name="61-90" fill="#EF4444" stackId="a" />
                <Bar dataKey="90+" name="90+" fill="var(--color-error-dark)" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Heatmap */}
        <div
          className="bg-white rounded-lg p-6 mb-6"
          style={{ border: '1px solid var(--color-silver)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '16px' }}>
                Department-wise Overdue Heatmap
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
                Overdue percentage by department
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }} />
                <span style={{ color: 'var(--color-mercury-grey)' }}>&lt;10%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FCD34D' }} />
                <span style={{ color: 'var(--color-mercury-grey)' }}>10-15%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F59E0B' }} />
                <span style={{ color: 'var(--color-mercury-grey)' }}>15-20%</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: 'var(--color-error-dark)' }}
                />
                <span style={{ color: 'var(--color-mercury-grey)' }}>&gt;20%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-4">
            {departmentOverdueData.map((dept) => (
              <div
                key={dept.department}
                className="p-4 rounded-lg transition-all cursor-pointer"
                style={{
                  backgroundColor: getHeatmapColor(dept.percentage),
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
              >
                <div className="text-white text-sm mb-2" style={{ fontWeight: '700' }}>
                  {dept.department}
                </div>
                <div className="text-white text-2xl mb-1" style={{ fontWeight: '700' }}>
                  {dept.percentage}%
                </div>
                <div className="text-white text-xs opacity-90">{formatCurrency(dept.overdue)}</div>
                <div className="text-white text-xs opacity-75 mt-1">
                  of {formatCurrency(dept.total)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vendor Aging Table */}
        <div
          className="bg-white rounded-lg overflow-hidden mb-6"
          style={{ border: '1px solid var(--color-silver)' }}
        >
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-silver)' }}>
            <h3 style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '16px' }}>
              Vendor Aging Summary
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
                    0-30 DAYS
                  </th>
                  <th
                    className="text-right px-4 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    31-60 DAYS
                  </th>
                  <th
                    className="text-right px-4 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    61-90 DAYS
                  </th>
                  <th
                    className="text-right px-4 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    90+ DAYS
                  </th>
                  <th
                    className="text-right px-4 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    TOTAL OUTSTANDING
                  </th>
                  <th
                    className="text-center px-4 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    SLA BREACHES
                  </th>
                  <th
                    className="text-center px-6 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody>
                {vendorAgingData.map((vendor, index) => (
                  <tr
                    key={vendor.vendorCode}
                    style={{
                      backgroundColor: vendor.onHold
                        ? '#FEF3C7'
                        : index % 2 === 0
                          ? '#FFFFFF'
                          : '#FAFBFC',
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
                      <span className="text-sm" style={{ color: '#10B981', fontWeight: '600' }}>
                        {vendor.days0_30 > 0 ? formatCurrency(vendor.days0_30) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm" style={{ color: '#F59E0B', fontWeight: '600' }}>
                        {vendor.days31_60 > 0 ? formatCurrency(vendor.days31_60) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm" style={{ color: '#EF4444', fontWeight: '600' }}>
                        {vendor.days61_90 > 0 ? formatCurrency(vendor.days61_90) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span
                        className="text-sm"
                        style={{ color: 'var(--color-error-dark)', fontWeight: '700' }}
                      >
                        {vendor.days90Plus > 0 ? formatCurrency(vendor.days90Plus) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span
                        style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '14px' }}
                      >
                        {formatCurrency(vendor.totalOutstanding)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {vendor.slaBreaches > 0 ? (
                        <span
                          className="px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor: 'var(--color-error-light)',
                            color: '#EF4444',
                            fontWeight: '700',
                          }}
                        >
                          {vendor.slaBreaches}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: '#10B981', fontWeight: '600' }}>
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {vendor.onHold ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor: 'var(--color-error-light)',
                            color: '#EF4444',
                            fontWeight: '600',
                          }}
                        >
                          <Pause className="w-3 h-3" />
                          On Hold
                        </span>
                      ) : (
                        <span
                          className="px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor: '#D1FAE5',
                            color: '#10B981',
                            fontWeight: '600',
                          }}
                        >
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice Aging Detail */}
        <div
          className="bg-white rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--color-silver)' }}
        >
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-silver)' }}>
            <h3 style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '16px' }}>
              Invoice Aging Detail
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
                    INVOICE NO
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    VENDOR
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    DUE DATE
                  </th>
                  <th
                    className="text-center px-4 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    AGING
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
                    RISK FLAG
                  </th>
                  <th
                    className="text-center px-6 py-3 text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoiceAgingDetails.map((invoice, index) => (
                  <tr
                    key={invoice.id}
                    style={{
                      backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFBFC',
                      borderBottom: '1px solid var(--color-silver)',
                    }}
                  >
                    <td className="px-6 py-4">
                      <div
                        style={{ color: 'var(--color-ink)', fontWeight: '600', fontSize: '13px' }}
                      >
                        {invoice.invoiceNo}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                        {invoice.category}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm" style={{ color: 'var(--color-ink)' }}>
                        {invoice.vendor}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm" style={{ color: 'var(--color-ink)' }}>
                        {new Date(invoice.dueDate).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className="px-2 py-1 rounded text-xs"
                        style={{
                          backgroundColor:
                            invoice.aging > 0 ? 'var(--color-error-light)' : '#D1FAE5',
                          color: invoice.aging > 0 ? '#EF4444' : '#10B981',
                          fontWeight: '700',
                        }}
                      >
                        {invoice.aging > 0 ? `+${invoice.aging}d` : `${Math.abs(invoice.aging)}d`}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span
                        style={{ color: 'var(--color-ink)', fontWeight: '600', fontSize: '14px' }}
                      >
                        {formatCurrency(invoice.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">{getRiskBadge(invoice.riskFlag)}</td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className="px-2 py-1 rounded text-xs"
                        style={{
                          backgroundColor:
                            invoice.status === 'overdue'
                              ? 'var(--color-error-light)'
                              : invoice.status === 'on-hold'
                                ? '#FEF3C7'
                                : '#D1FAE5',
                          color:
                            invoice.status === 'overdue'
                              ? '#EF4444'
                              : invoice.status === 'on-hold'
                                ? '#F59E0B'
                                : '#10B981',
                          fontWeight: '600',
                        }}
                      >
                        {invoice.status.replace('-', ' ').toUpperCase()}
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
