import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  FileText,
  CheckCircle,
  XCircle,
  Calendar,
  Building2,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Target,
  Users,
} from 'lucide-react';

export function APDashboard() {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');

  // Mock KPI data
  const kpis = [
    {
      label: 'Total AP Outstanding',
      value: '₹45.2L',
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'var(--color-teal)',
      bg: 'var(--color-teal)10',
    },
    {
      label: 'Overdue Amount',
      value: '₹8.3L',
      change: '+5.2%',
      trend: 'up',
      icon: AlertTriangle,
      color: 'var(--color-error-dark)',
      bg: 'var(--color-error-light)',
    },
    {
      label: 'Due This Week',
      value: '₹12.5L',
      change: '-3.1%',
      trend: 'down',
      icon: Clock,
      color: '#D97706',
      bg: '#FEF3C7',
    },
    {
      label: 'Invoices on Hold',
      value: '7',
      change: '+2',
      trend: 'up',
      icon: XCircle,
      color: '#EA580C',
      bg: '#FED7AA',
    },
    {
      label: 'Avg Approval Time',
      value: '2.3 days',
      change: '-0.5 days',
      trend: 'down',
      icon: Activity,
      color: '#047857',
      bg: '#D1FAE5',
    },
    {
      label: 'Days Payable Outstanding',
      value: '42 days',
      change: '+3 days',
      trend: 'up',
      icon: Calendar,
      color: '#007D87',
      bg: '#EDE9FE',
    },
  ];

  // Aging buckets data
  const agingData = [
    { range: '0-30 Days', amount: 25000000, count: 45, percentage: 55 },
    { range: '31-60 Days', amount: 12000000, count: 22, percentage: 27 },
    { range: '61-90 Days', amount: 5000000, count: 8, percentage: 11 },
    { range: '90+ Days', amount: 3200000, count: 5, percentage: 7 },
  ];

  // Top vendors by outstanding
  const topVendors = [
    { name: 'Tech Solutions Pvt Ltd', outstanding: 8500000, invoices: 12 },
    { name: 'ABC Manufacturing Ltd', outstanding: 6200000, invoices: 8 },
    { name: 'Global Suppliers Co', outstanding: 4800000, invoices: 6 },
    { name: 'XYZ Services Inc', outstanding: 3900000, invoices: 10 },
    { name: 'Industrial Parts Ltd', outstanding: 3200000, invoices: 5 },
  ];

  // Alerts
  const alerts = [
    {
      severity: 'high',
      icon: AlertTriangle,
      title: '3 Invoices Overdue by 15+ Days',
      description: 'Total value: ₹4.5L. Review and process immediately.',
      action: 'View Overdue',
      link: '/ap/invoices-for-approval',
    },
    {
      severity: 'medium',
      icon: Clock,
      title: 'Approval Bottleneck Detected',
      description: '12 invoices pending with Finance Head for 5+ days.',
      action: 'View Details',
      link: '/ap/invoices-for-approval',
    },
    {
      severity: 'high',
      icon: XCircle,
      title: '2 Budget Limit Breaches',
      description: 'Cost centre CC-MFG-001 exceeded monthly budget by 15%.',
      action: 'Review Budgets',
      link: '/budget-consumption-control',
    },
    {
      severity: 'info',
      icon: Zap,
      title: 'AI Detected 4 Duplicate Risks',
      description: 'Possible duplicate invoices identified. Requires review.',
      action: 'Investigate',
      link: '/ap/reports',
    },
  ];

  // Approval cycle time trend (mock data)
  const cycleTimeTrend = [
    { month: 'Jul', days: 3.2 },
    { month: 'Aug', days: 2.8 },
    { month: 'Sep', days: 2.5 },
    { month: 'Oct', days: 2.7 },
    { month: 'Nov', days: 2.4 },
    { month: 'Dec', days: 2.3 },
  ];

  const getAlertStyle = (severity: string) => {
    switch (severity) {
      case 'high':
        return {
          bg: 'var(--color-error-light)',
          border: 'var(--color-error-dark)',
          color: 'var(--color-error-dark)',
        };
      case 'medium':
        return { bg: '#FEF3C7', border: '#D97706', color: '#D97706' };
      default:
        return { bg: '#DBEAFE', border: '#2563EB', color: '#2563EB' };
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }} className="p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl mb-2" style={{ color: 'var(--color-ink)' }}>
              AP Command Center
            </h1>
            <p style={{ color: 'var(--color-mercury-grey)' }}>
              Comprehensive accounts payable dashboard and analytics
            </p>
          </div>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 rounded-lg border-2"
            style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
          >
            <option>This Week</option>
            <option>This Month</option>
            <option>This Quarter</option>
            <option>This Year</option>
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl p-6 border-2"
            style={{ borderColor: 'var(--color-silver)' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                  {kpi.label}
                </p>
                <p className="text-3xl mb-2" style={{ color: 'var(--color-ink)' }}>
                  {kpi.value}
                </p>
                <div className="flex items-center gap-1">
                  {kpi.trend === 'up' ? (
                    <TrendingUp className="w-4 h-4" style={{ color: kpi.color }} />
                  ) : (
                    <TrendingDown className="w-4 h-4" style={{ color: kpi.color }} />
                  )}
                  <span className="text-sm" style={{ color: kpi.color }}>
                    {kpi.change}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    vs last period
                  </span>
                </div>
              </div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: kpi.bg }}
              >
                <kpi.icon className="w-6 h-6" style={{ color: kpi.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Aging Analysis */}
        <div
          className="col-span-2 bg-white rounded-xl border-2 p-6"
          style={{ borderColor: 'var(--color-silver)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[var(--color-teal)]" />
              <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>
                AP Aging Analysis
              </h2>
            </div>
            <button
              onClick={() => navigate('/ap/reports')}
              className="text-sm text-[var(--color-teal)] hover:underline"
            >
              View Detailed Report →
            </button>
          </div>

          <div className="space-y-4">
            {agingData.map((bucket, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span style={{ color: 'var(--color-ink)' }}>{bucket.range}</span>
                    <span
                      className="text-sm px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: 'var(--color-cloud)',
                        color: 'var(--color-mercury-grey)',
                      }}
                    >
                      {bucket.count} invoices
                    </span>
                  </div>
                  <span style={{ color: 'var(--color-ink)' }}>
                    ₹{(bucket.amount / 100000).toFixed(1)}L
                  </span>
                </div>
                <div className="relative w-full bg-[var(--color-silver)] rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{
                      width: `${bucket.percentage}%`,
                      backgroundColor:
                        idx === 0
                          ? '#047857'
                          : idx === 1
                            ? '#D97706'
                            : idx === 2
                              ? '#EA580C'
                              : 'var(--color-error-dark)',
                    }}
                  />
                  <span
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {bucket.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t-2" style={{ borderColor: 'var(--color-silver)' }}>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                  Total Outstanding
                </p>
                <p className="text-xl" style={{ color: 'var(--color-ink)' }}>
                  ₹45.2L
                </p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                  Overdue (&gt;60d)
                </p>
                <p className="text-xl" style={{ color: 'var(--color-error-dark)' }}>
                  ₹8.2L
                </p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                  Current (&lt;30d)
                </p>
                <p className="text-xl" style={{ color: '#047857' }}>
                  ₹25.0L
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Vendors */}
        <div
          className="bg-white rounded-xl border-2 p-6"
          style={{ borderColor: 'var(--color-silver)' }}
        >
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-[var(--color-teal)]" />
            <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>
              Top Vendors
            </h2>
          </div>

          <div className="space-y-4">
            {topVendors.map((vendor, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg hover:bg-[var(--color-cloud)] cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm mb-1" style={{ color: 'var(--color-ink)' }}>
                      {vendor.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                      {vendor.invoices} invoices
                    </p>
                  </div>
                  <span className="text-sm" style={{ color: 'var(--color-ink)' }}>
                    ₹{(vendor.outstanding / 100000).toFixed(1)}L
                  </span>
                </div>
                <div className="w-full bg-[var(--color-silver)] rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${(vendor.outstanding / 8500000) * 100}%`,
                      backgroundColor: 'var(--color-teal)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Approval Cycle Time Trend */}
      <div
        className="bg-white rounded-xl border-2 p-6 mb-6"
        style={{ borderColor: 'var(--color-silver)' }}
      >
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-[var(--color-teal)]" />
          <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>
            Approval Cycle Time Trend
          </h2>
        </div>

        <div className="flex items-end gap-4 h-48">
          {cycleTimeTrend.map((data, idx) => {
            const maxDays = Math.max(...cycleTimeTrend.map((d) => d.days));
            const heightPercent = (data.days / maxDays) * 100;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  {data.days}d
                </div>
                <div
                  className="w-full rounded-t-lg transition-all hover:opacity-80 cursor-pointer"
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: 'var(--color-teal)',
                    minHeight: '20px',
                  }}
                />
                <div className="text-sm" style={{ color: 'var(--color-ink)' }}>
                  {data.month}
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="mt-6 pt-6 border-t-2 grid grid-cols-4 gap-4"
          style={{ borderColor: 'var(--color-silver)' }}
        >
          <div className="text-center">
            <p className="text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
              Current Avg
            </p>
            <p className="text-xl" style={{ color: 'var(--color-teal)' }}>
              2.3 days
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
              Target SLA
            </p>
            <p className="text-xl" style={{ color: '#047857' }}>
              2.0 days
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
              6-Month Avg
            </p>
            <p className="text-xl" style={{ color: 'var(--color-mercury-grey)' }}>
              2.7 days
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
              Improvement
            </p>
            <p
              className="text-xl flex items-center justify-center gap-1"
              style={{ color: '#047857' }}
            >
              <TrendingDown className="w-4 h-4" />
              15%
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div
        className="bg-white rounded-xl border-2 p-6"
        style={{ borderColor: 'var(--color-silver)' }}
      >
        <div className="flex items-center gap-2 mb-6">
          <AlertTriangle className="w-5 h-5 text-[var(--color-error-dark)]" />
          <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>
            Critical Alerts & Actions
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {alerts.map((alert, idx) => {
            const style = getAlertStyle(alert.severity);
            const AlertIcon = alert.icon;

            return (
              <div
                key={idx}
                className="rounded-lg border-2 p-4"
                style={{ borderColor: style.border, backgroundColor: style.bg }}
              >
                <div className="flex items-start gap-3">
                  <AlertIcon
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                    style={{ color: style.color }}
                  />
                  <div className="flex-1">
                    <h4 className="mb-1" style={{ color: style.color }}>
                      {alert.title}
                    </h4>
                    <p className="text-sm mb-3" style={{ color: 'var(--color-mercury-grey)' }}>
                      {alert.description}
                    </p>
                    <button
                      onClick={() => navigate(alert.link)}
                      className="text-sm px-3 py-1 rounded border hover:bg-white transition-colors"
                      style={{ borderColor: style.color, color: style.color }}
                    >
                      {alert.action} →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
