import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  DollarSign,
  Percent,
  AlertCircle,
  Shield,
  Copy,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  ChevronRight,
  Flag,
  CreditCard,
  Building2,
  ArrowUpRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  mockPayments,
  getAgingData,
  getPaymentTrend,
  getCategoryBreakdown,
  getProjectedOutflow,
  type PaymentInvoice,
} from '../data/paymentsData';

export function PaymentsDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('week');
  const navigate = useNavigate();

  const today = new Date('2024-12-13');
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Calculate KPIs
  const totalOutstanding = mockPayments
    .filter(p => p.status !== 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const dueToday = mockPayments
    .filter(p => p.dueDate === '2024-12-13' && p.status !== 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const dueThisWeek = mockPayments
    .filter(p => {
      const dueDate = new Date(p.dueDate);
      return dueDate >= today && dueDate <= weekFromNow && p.status !== 'paid';
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const overdue = mockPayments
    .filter(p => {
      const dueDate = new Date(p.dueDate);
      return dueDate < today && p.status !== 'paid';
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const earlyPaymentDiscount = mockPayments
    .filter(p => p.earlyPaymentDiscount && p.discountDate && new Date(p.discountDate) >= today)
    .reduce((sum, p) => sum + (p.earlyPaymentDiscount || 0), 0);

  const criticalPaymentsCount = mockPayments
    .filter(p => p.priority === 'critical' && p.status !== 'paid')
    .length;

  // Critical alerts
  const highPriorityPayments = mockPayments
    .filter(p => (p.priority === 'critical' || p.category === 'Statutory' || p.category === 'Payroll') && p.status !== 'paid')
    .slice(0, 3);

  const slaBreaches = mockPayments
    .filter(p => p.riskFlag === 'sla-breach' || p.riskFlag === 'credit-term-breach')
    .slice(0, 2);

  const suspiciousPayments = mockPayments
    .filter(p => p.riskFlag === 'duplicate' || p.riskFlag === 'suspicious')
    .slice(0, 2);

  // Critical payments table
  const criticalPayments = mockPayments
    .filter(p => p.priority === 'critical' || p.riskFlag || p.status === 'overdue')
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 8);

  // Upcoming payments table
  const upcomingPayments = mockPayments
    .filter(p => {
      const dueDate = new Date(p.dueDate);
      return dueDate >= today && dueDate <= weekFromNow && p.status !== 'paid';
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 8);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)}Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    return formatCurrency(amount);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'medium': return '#3B82F6';
      case 'low': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#10B981';
      case 'approved': return 'var(--color-teal)';
      case 'scheduled': return '#3B82F6';
      case 'pending': return '#F59E0B';
      case 'overdue': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getRiskBadge = (riskFlag?: string) => {
    if (!riskFlag) return null;

    const riskConfig = {
      duplicate: { label: 'Duplicate', color: '#EF4444', bg: 'var(--color-error-light)' },
      suspicious: { label: 'Suspicious', color: '#F59E0B', bg: '#FEF3C7' },
      'sla-breach': { label: 'SLA Breach', color: '#EF4444', bg: 'var(--color-error-light)' },
      'credit-term-breach': { label: 'Credit Breach', color: '#F59E0B', bg: '#FEF3C7' },
      statutory: { label: 'Statutory', color: 'var(--color-error-dark)', bg: 'var(--color-error-light)' },
    };

    const config = riskConfig[riskFlag as keyof typeof riskConfig];
    if (!config) return null;

    return (
      <span
        className="px-2 py-1 rounded text-xs"
        style={{
          backgroundColor: config.bg,
          color: config.color,
          fontWeight: '600',
        }}
      >
        {config.label}
      </span>
    );
  };

  const agingData = getAgingData();
  const trendData = getPaymentTrend();
  const categoryData = getCategoryBreakdown();
  const projectionData = getProjectedOutflow();

  const COLORS = ['var(--color-teal)', '#3B82F6', '#F59E0B', '#10B981', '#007D87', '#EF4444'];

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
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl mb-1" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
              Payments Dashboard
            </h1>
            <p style={{ color: 'var(--color-mercury-grey)', fontSize: '14px' }}>
              Real-time visibility into payment obligations, risks, and cash impact
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--color-silver)',
                color: 'var(--color-mercury-grey)',
              }}
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm" style={{ fontWeight: '500' }}>Refresh</span>
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
              <span className="text-sm" style={{ fontWeight: '500' }}>Export</span>
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: 'var(--color-teal)',
                color: '#FFFFFF',
                border: '1px solid var(--color-teal-dark)',
              }}
            >
              <CreditCard className="w-4 h-4" />
              <span className="text-sm" style={{ fontWeight: '600' }}>Process Payments</span>
            </button>
          </div>
        </div>

        {/* Last updated */}
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
          <Clock className="w-3.5 h-3.5" />
          <span>Last updated: Dec 13, 2024 at 10:45 AM IST</span>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="px-8 py-6">
        {/* AI Suggested Batch Banner */}
        <div 
          className="mb-6 p-5 rounded-lg cursor-pointer transition-all"
          style={{ 
            background: 'linear-gradient(135deg, #E0F2FE 0%, #F0FDFF 100%)',
            border: '2px solid var(--color-teal)'
          }}
          onClick={() => navigate('/ap/ai-suggested-payment-batch')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 169, 183, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-teal)' }}
              >
                <Zap style={{ width: '28px', height: '28px', color: '#FFFFFF' }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-ink)', margin: 0 }}>
                    AI Suggested Payment Batch Ready
                  </h3>
                  <span 
                    className="px-2 py-1 rounded-full flex items-center gap-1"
                    style={{ backgroundColor: 'var(--color-teal)', fontSize: '11px', fontWeight: '600', color: '#FFFFFF' }}
                  >
                    <Sparkles style={{ width: '12px', height: '12px' }} />
                    NEW
                  </span>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--color-mercury-grey)', margin: 0 }}>
                  AI has prioritized 5 invoices worth ₹7.24L based on urgency, discounts, and cash availability. Save ₹3,790 in discounts and avoid ₹6,700 in penalties.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-teal)' }}>5</div>
                <div style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>Invoices</div>
              </div>
              <div className="text-center">
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-teal)' }}>₹7.24L</div>
                <div style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>Total Amount</div>
              </div>
              <button
                className="flex items-center gap-2 px-6 py-3 rounded-lg transition-all"
                style={{
                  backgroundColor: 'var(--color-teal)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
              >
                <Zap style={{ width: '16px', height: '16px' }} />
                View AI Batch
                <ChevronRight style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Total Outstanding */}
          <div
            className="bg-white rounded-lg p-4"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#3B82F615' }}
              >
                <DollarSign className="w-5 h-5" style={{ color: '#3B82F6' }} />
              </div>
              <ArrowUpRight className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
            </div>
            <div className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
              Total Outstanding
            </div>
            <div className="text-xl mb-1" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
              {formatCompactCurrency(totalOutstanding)}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
              {mockPayments.filter(p => p.status !== 'paid').length} invoices
            </div>
          </div>

          {/* Due Today */}
          <div
            className="bg-white rounded-lg p-4"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#F59E0B15' }}
              >
                <Calendar className="w-5 h-5" style={{ color: '#F59E0B' }} />
              </div>
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#FEF3C7', color: '#F59E0B', fontWeight: '600' }}>
                TODAY
              </span>
            </div>
            <div className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
              Due Today
            </div>
            <div className="text-xl mb-1" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
              {formatCompactCurrency(dueToday)}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
              {mockPayments.filter(p => p.dueDate === '2024-12-13' && p.status !== 'paid').length} payments
            </div>
          </div>

          {/* Due This Week */}
          <div
            className="bg-white rounded-lg p-4"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-teal)15' }}
              >
                <Clock className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
              </div>
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#E0F2F1', color: 'var(--color-teal)', fontWeight: '600' }}>
                7 DAYS
              </span>
            </div>
            <div className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
              Due This Week
            </div>
            <div className="text-xl mb-1" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
              {formatCompactCurrency(dueThisWeek)}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
              {upcomingPayments.length} payments
            </div>
          </div>

          {/* Overdue */}
          <div
            className="bg-white rounded-lg p-4"
            style={{ border: '2px solid #EF4444' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-error-light)' }}
              >
                <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} />
              </div>
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--color-error-light)', color: '#EF4444', fontWeight: '600' }}>
                ALERT
              </span>
            </div>
            <div className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
              Overdue Amount
            </div>
            <div className="text-xl mb-1" style={{ color: '#EF4444', fontWeight: '700' }}>
              {formatCompactCurrency(overdue)}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
              {mockPayments.filter(p => new Date(p.dueDate) < today && p.status !== 'paid').length} invoices
            </div>
          </div>

          {/* Early Payment Discount */}
          <div
            className="bg-white rounded-lg p-4"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#10B98115' }}
              >
                <Percent className="w-5 h-5" style={{ color: '#10B981' }} />
              </div>
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#D1FAE5', color: '#10B981', fontWeight: '600' }}>
                SAVE
              </span>
            </div>
            <div className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
              Discount Available
            </div>
            <div className="text-xl mb-1" style={{ color: '#10B981', fontWeight: '700' }}>
              {formatCompactCurrency(earlyPaymentDiscount)}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
              Early payment savings
            </div>
          </div>

          {/* Critical Payments */}
          <div
            className="bg-white rounded-lg p-4"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-error-dark)15' }}
              >
                <Flag className="w-5 h-5" style={{ color: 'var(--color-error-dark)' }} />
              </div>
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--color-error-light)', color: 'var(--color-error-dark)', fontWeight: '600' }}>
                {criticalPaymentsCount}
              </span>
            </div>
            <div className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
              Critical Payments
            </div>
            <div className="text-xl mb-1" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
              High Priority
            </div>
            <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
              Requires attention
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alerts Section */}
      <div className="px-8 pb-6">
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)' }}>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5" style={{ color: '#EF4444' }} />
            <h2 style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '16px' }}>
              Critical Alerts
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* High Priority Payments */}
            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-error-light)', border: '1px solid #FECACA' }}>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4" style={{ color: 'var(--color-error-dark)' }} />
                <span className="text-sm" style={{ color: 'var(--color-error-dark)', fontWeight: '700' }}>
                  High-Priority Payments
                </span>
              </div>
              <div className="space-y-2">
                {highPriorityPayments.map(payment => (
                  <div key={payment.id} className="flex items-center justify-between">
                    <div>
                      <div className="text-xs" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                        {payment.vendor}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                        {payment.category}
                      </div>
                    </div>
                    <div className="text-xs" style={{ color: 'var(--color-error-dark)', fontWeight: '700' }}>
                      {formatCompactCurrency(payment.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SLA Breaches */}
            <div className="rounded-lg p-4" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A' }}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4" style={{ color: '#F59E0B' }} />
                <span className="text-sm" style={{ color: '#F59E0B', fontWeight: '700' }}>
                  SLA / Credit Term Breach
                </span>
              </div>
              <div className="space-y-2">
                {slaBreaches.map(payment => (
                  <div key={payment.id} className="flex items-center justify-between">
                    <div>
                      <div className="text-xs" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                        {payment.vendor}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                        Due: {new Date(payment.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                    <div className="text-xs" style={{ color: '#F59E0B', fontWeight: '700' }}>
                      {formatCompactCurrency(payment.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Suspicious/Duplicate */}
            <div className="rounded-lg p-4" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A' }}>
              <div className="flex items-center gap-2 mb-3">
                <Copy className="w-4 h-4" style={{ color: '#F59E0B' }} />
                <span className="text-sm" style={{ color: '#F59E0B', fontWeight: '700' }}>
                  Duplicate / Suspicious
                </span>
              </div>
              <div className="space-y-2">
                {suspiciousPayments.map(payment => (
                  <div key={payment.id} className="flex items-center justify-between">
                    <div>
                      <div className="text-xs" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                        {payment.vendor}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                        {payment.riskFlag === 'duplicate' ? 'Possible duplicate' : 'New vendor flagged'}
                      </div>
                    </div>
                    <div className="text-xs" style={{ color: '#F59E0B', fontWeight: '700' }}>
                      {formatCompactCurrency(payment.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="px-8 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Aging Analysis */}
          <div className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)' }}>
            <h3 className="mb-4" style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '15px' }}>
              Aging Analysis
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={agingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver)" />
                <XAxis
                  dataKey="period"
                  tick={{ fill: 'var(--color-mercury-grey)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--color-silver)' }}
                />
                <YAxis
                  tick={{ fill: 'var(--color-mercury-grey)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--color-silver)' }}
                  label={{ value: 'Amount (Lakhs)', angle: -90, position: 'insideLeft', style: { fill: 'var(--color-mercury-grey)', fontSize: 12 } }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-silver)', borderRadius: '8px' }}
                  formatter={(value: any) => [`₹${value}L`, 'Amount']}
                />
                <Bar dataKey="amount" fill="var(--color-teal)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Payment Trend */}
          <div className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)' }}>
            <h3 className="mb-4" style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '15px' }}>
              Daily Payment Trend
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--color-mercury-grey)', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--color-silver)' }}
                />
                <YAxis
                  tick={{ fill: 'var(--color-mercury-grey)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--color-silver)' }}
                  label={{ value: 'Amount (Lakhs)', angle: -90, position: 'insideLeft', style: { fill: 'var(--color-mercury-grey)', fontSize: 12 } }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-silver)', borderRadius: '8px' }}
                  formatter={(value: any) => [`₹${value}L`, '']}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="paid" stroke="#10B981" strokeWidth={2} name="Paid" />
                <Line type="monotone" dataKey="scheduled" stroke="#3B82F6" strokeWidth={2} name="Scheduled" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)' }}>
            <h3 className="mb-4" style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '15px' }}>
              Payables by Vendor Category
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-silver)', borderRadius: '8px' }}
                  formatter={(value: any) => [`₹${value}L`, 'Amount']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Projected Outflow */}
          <div className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)' }}>
            <h3 className="mb-4" style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '15px' }}>
              Projected Cash Outflow (Next 30 Days)
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--color-mercury-grey)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--color-silver)' }}
                />
                <YAxis
                  tick={{ fill: 'var(--color-mercury-grey)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--color-silver)' }}
                  label={{ value: 'Amount (Lakhs)', angle: -90, position: 'insideLeft', style: { fill: 'var(--color-mercury-grey)', fontSize: 12 } }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-silver)', borderRadius: '8px' }}
                  formatter={(value: any) => [`₹${value}L`, '']}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="projected" stackId="1" stroke="#F59E0B" fill="#FEF3C7" name="Projected" />
                <Area type="monotone" dataKey="actual" stackId="2" stroke="var(--color-teal)" fill="#E0F2F1" name="Actual" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables Section */}
      <div className="px-8 pb-8">
        <div className="grid grid-cols-1 gap-6">
          {/* Critical Payments Table */}
          <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-silver)' }}>
              <h3 style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '15px' }}>
                Critical Payments
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-cloud)', borderBottom: '1px solid var(--color-silver)' }}>
                    <th className="text-left px-6 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}>
                      VENDOR
                    </th>
                    <th className="text-left px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}>
                      INVOICE NO
                    </th>
                    <th className="text-left px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}>
                      DUE DATE
                    </th>
                    <th className="text-right px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}>
                      AMOUNT
                    </th>
                    <th className="text-center px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}>
                      PRIORITY
                    </th>
                    <th className="text-center px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}>
                      RISK FLAG
                    </th>
                    <th className="text-center px-6 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}>
                      ACTION
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {criticalPayments.map((payment, index) => (
                    <tr
                      key={payment.id}
                      style={{
                        backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFBFC',
                        borderBottom: '1px solid var(--color-silver)',
                      }}
                    >
                      <td className="px-6 py-4">
                        <div style={{ color: 'var(--color-ink)', fontWeight: '600', fontSize: '14px' }}>
                          {payment.vendor}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                          {payment.vendorCategory}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '500' }}>
                          {payment.invoiceNo}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm" style={{ color: 'var(--color-ink)' }}>
                          {new Date(payment.dueDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div style={{ color: 'var(--color-ink)', fontWeight: '600', fontSize: '14px' }}>
                          {formatCompactCurrency(payment.amount)}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className="px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor: `${getPriorityColor(payment.priority)}15`,
                            color: getPriorityColor(payment.priority),
                            fontWeight: '600',
                          }}
                        >
                          {payment.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {getRiskBadge(payment.riskFlag)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                          style={{
                            backgroundColor: 'var(--color-teal)',
                            color: '#FFFFFF',
                            fontWeight: '600',
                          }}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upcoming Payments Table */}
          <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-silver)' }}>
              <h3 style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '15px' }}>
                Upcoming Payments (Next 7 Days)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-cloud)', borderBottom: '1px solid var(--color-silver)' }}>
                    <th className="text-left px-6 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}>
                      VENDOR
                    </th>
                    <th className="text-left px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}>
                      DUE DATE
                    </th>
                    <th className="text-right px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}>
                      AMOUNT
                    </th>
                    <th className="text-center px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}>
                      PAYMENT MODE
                    </th>
                    <th className="text-center px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}>
                      STATUS
                    </th>
                    <th className="text-center px-6 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}>
                      ACTION
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingPayments.map((payment, index) => (
                    <tr
                      key={payment.id}
                      style={{
                        backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFBFC',
                        borderBottom: '1px solid var(--color-silver)',
                      }}
                    >
                      <td className="px-6 py-4">
                        <div style={{ color: 'var(--color-ink)', fontWeight: '600', fontSize: '14px' }}>
                          {payment.vendor}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                          {payment.invoiceNo}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm" style={{ color: 'var(--color-ink)' }}>
                          {new Date(payment.dueDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                          {Math.ceil((new Date(payment.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} days
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div style={{ color: 'var(--color-ink)', fontWeight: '600', fontSize: '14px' }}>
                          {formatCompactCurrency(payment.amount)}
                        </div>
                        {payment.earlyPaymentDiscount && (
                          <div className="text-xs" style={{ color: '#10B981' }}>
                            Save {formatCompactCurrency(payment.earlyPaymentDiscount)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '500' }}>
                          {payment.paymentMode}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className="px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor: `${getStatusColor(payment.status)}15`,
                            color: getStatusColor(payment.status),
                            fontWeight: '600',
                          }}
                        >
                          {payment.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                          style={{
                            backgroundColor: 'var(--color-cloud)',
                            color: 'var(--color-teal)',
                            border: '1px solid var(--color-teal)',
                            fontWeight: '600',
                          }}
                        >
                          Schedule
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}