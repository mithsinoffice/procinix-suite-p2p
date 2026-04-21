import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  Shield,
  AlertCircle,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Building2,
  Scale,
  Award,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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

export function MSMEPaymentDashboard() {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  // Mock MSME payment data
  const msmePaymentData = {
    totalMSMEVendors: 47,
    activeInvoices: 23,
    totalOutstanding: 8547000,
    dueTodayCount: 4,
    dueTodayAmount: 1250000,
    overdueCount: 7,
    overdueAmount: 2340000,
    paid45Days: 85, // % paid within 45 days
    avgPaymentDays: 38,
    complianceScore: 92,
    potentialPenalties: 45000,
  };

  // MSME payment trend data
  const paymentTrendData = [
    { month: 'Jul', onTime: 12, delayed: 2, avgDays: 35 },
    { month: 'Aug', onTime: 15, delayed: 3, avgDays: 38 },
    { month: 'Sep', onTime: 14, delayed: 1, avgDays: 32 },
    { month: 'Oct', onTime: 16, delayed: 4, avgDays: 42 },
    { month: 'Nov', onTime: 18, delayed: 2, avgDays: 36 },
    { month: 'Dec', onTime: 10, delayed: 3, avgDays: 40 },
  ];

  // MSME classification breakdown
  const classificationData = [
    { name: 'Micro', value: 28, color: 'var(--color-teal)' },
    { name: 'Small', value: 15, color: 'var(--color-teal-dark)' },
    { name: 'Medium', value: 4, color: '#005F67' },
  ];

  // Compliance aging
  const complianceAgingData = [
    { range: '0-15 days', count: 8, amount: 2100000, status: 'safe' },
    { range: '16-30 days', count: 6, amount: 1850000, status: 'watch' },
    { range: '31-45 days', count: 5, amount: 1450000, status: 'critical' },
    { range: '46-60 days', count: 3, amount: 890000, status: 'breach' },
    { range: '60+ days', count: 1, amount: 257000, status: 'penalty' },
  ];

  // Recent MSME invoices
  const recentMSMEInvoices = [
    {
      id: 'INV-2024-0891',
      vendor: 'Sunrise Textiles Pvt Ltd',
      type: 'Micro',
      amount: 450000,
      dueDate: '2024-12-13',
      agingDays: 0,
      status: 'due-today',
      udyamNo: 'UDYAM-MH-12-0045678',
    },
    {
      id: 'INV-2024-0876',
      vendor: 'Green Valley Packaging',
      type: 'Small',
      amount: 285000,
      dueDate: '2024-12-14',
      agingDays: 1,
      status: 'upcoming',
      udyamNo: 'UDYAM-GJ-06-0023456',
    },
    {
      id: 'INV-2024-0834',
      vendor: 'Metro Components Ltd',
      type: 'Medium',
      amount: 680000,
      dueDate: '2024-12-10',
      agingDays: 3,
      status: 'overdue',
      udyamNo: 'UDYAM-KA-01-0067890',
    },
    {
      id: 'INV-2024-0812',
      vendor: 'Quality Fasteners',
      type: 'Micro',
      amount: 125000,
      dueDate: '2024-12-08',
      agingDays: 5,
      status: 'overdue',
      udyamNo: 'UDYAM-TN-03-0034567',
    },
    {
      id: 'INV-2024-0798',
      vendor: 'Precision Tools Mfg',
      type: 'Small',
      amount: 540000,
      dueDate: '2024-11-25',
      agingDays: 18,
      status: 'critical',
      udyamNo: 'UDYAM-DL-07-0056789',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'due-today': return '#D97706';
      case 'upcoming': return 'var(--color-teal)';
      case 'overdue': return 'var(--color-error-dark)';
      case 'critical': return '#991B1B';
      default: return 'var(--color-mercury-grey)';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'due-today': return 'Due Today';
      case 'upcoming': return 'Upcoming';
      case 'overdue': return 'Overdue';
      case 'critical': return 'Critical';
      default: return 'Unknown';
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${(amount / 100000).toFixed(2)}L`;
  };

  return (
    <div style={{ padding: '24px', backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600', color: 'var(--color-ink)', margin: 0 }}>
            MSME Payment Dashboard
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-mercury-grey)', marginTop: '4px' }}>
            Monitor MSME vendor payments and ensure regulatory compliance
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: 'var(--color-cloud)',
              border: '1px solid var(--color-silver)',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500',
              color: 'var(--color-ink)',
              cursor: 'pointer',
            }}
          >
            <Filter style={{ width: '16px', height: '16px' }} />
            Filter
          </button>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: 'var(--color-cloud)',
              border: '1px solid var(--color-silver)',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500',
              color: 'var(--color-ink)',
              cursor: 'pointer',
            }}
          >
            <Download style={{ width: '16px', height: '16px' }} />
            Export Report
          </button>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: 'var(--color-teal)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <RefreshCw style={{ width: '16px', height: '16px' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Compliance Alert Banner */}
      <div
        style={{
          backgroundColor: '#FEF3C7',
          border: '1px solid #FCD34D',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <AlertTriangle style={{ width: '20px', height: '20px', color: '#D97706', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-ink)', margin: 0 }}>
            MSME Compliance Alert
          </p>
          <p style={{ fontSize: '13px', color: '#78716C', margin: '4px 0 0 0' }}>
            {msmePaymentData.overdueCount} invoices are overdue. As per MSMED Act, payments to MSME vendors must be made within 45 days to avoid compound interest penalties.
          </p>
        </div>
        <button
          style={{
            padding: '8px 16px',
            backgroundColor: '#D97706',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '500',
            color: '#FFFFFF',
            cursor: 'pointer',
          }}
        >
          View Details
        </button>
      </div>

      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Total MSME Vendors */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-silver)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--color-teal-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 style={{ width: '20px', height: '20px', color: 'var(--color-teal)' }} />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>Total Vendors</span>
          </div>
          <p style={{ fontSize: '28px', fontWeight: '600', color: 'var(--color-ink)', margin: '0 0 4px 0' }}>
            {msmePaymentData.totalMSMEVendors}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--color-mercury-grey)', margin: 0 }}>
            {msmePaymentData.activeInvoices} active invoices
          </p>
        </div>

        {/* Outstanding Amount */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-silver)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign style={{ width: '20px', height: '20px', color: '#D97706' }} />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>Outstanding</span>
          </div>
          <p style={{ fontSize: '28px', fontWeight: '600', color: 'var(--color-ink)', margin: '0 0 4px 0' }}>
            {formatCurrency(msmePaymentData.totalOutstanding)}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--color-mercury-grey)', margin: 0 }}>
            Across all MSME vendors
          </p>
        </div>

        {/* Due Today */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-silver)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#FFF9E6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock style={{ width: '20px', height: '20px', color: '#D97706' }} />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>Due Today</span>
          </div>
          <p style={{ fontSize: '28px', fontWeight: '600', color: 'var(--color-ink)', margin: '0 0 4px 0' }}>
            {formatCurrency(msmePaymentData.dueTodayAmount)}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--color-mercury-grey)', margin: 0 }}>
            {msmePaymentData.dueTodayCount} invoices
          </p>
        </div>

        {/* Overdue */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-silver)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--color-error-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle style={{ width: '20px', height: '20px', color: 'var(--color-error-dark)' }} />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>Overdue</span>
          </div>
          <p style={{ fontSize: '28px', fontWeight: '600', color: 'var(--color-error-dark)', margin: '0 0 4px 0' }}>
            {formatCurrency(msmePaymentData.overdueAmount)}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--color-mercury-grey)', margin: 0 }}>
            {msmePaymentData.overdueCount} invoices
          </p>
        </div>

        {/* Compliance Score */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-silver)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#E6F7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield style={{ width: '20px', height: '20px', color: '#059669' }} />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>Compliance</span>
          </div>
          <p style={{ fontSize: '28px', fontWeight: '600', color: 'var(--color-ink)', margin: '0 0 4px 0' }}>
            {msmePaymentData.complianceScore}%
          </p>
          <p style={{ fontSize: '12px', color: '#059669', margin: 0 }}>
            {msmePaymentData.paid45Days}% paid within 45 days
          </p>
        </div>

        {/* Avg Payment Days */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-silver)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar style={{ width: '20px', height: '20px', color: '#007D87' }} />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>Avg Days</span>
          </div>
          <p style={{ fontSize: '28px', fontWeight: '600', color: 'var(--color-ink)', margin: '0 0 4px 0' }}>
            {msmePaymentData.avgPaymentDays}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--color-mercury-grey)', margin: 0 }}>
            Average payment days
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Payment Trend */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-silver)' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-ink)', margin: '0 0 4px 0' }}>
              MSME Payment Trend
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-mercury-grey)', margin: 0 }}>
              On-time vs delayed payments over the last 6 months
            </p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={paymentTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver)" />
              <XAxis dataKey="month" stroke="var(--color-mercury-grey)" style={{ fontSize: '12px' }} />
              <YAxis stroke="var(--color-mercury-grey)" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--color-silver)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="onTime" name="On-Time" fill="var(--color-teal)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="delayed" name="Delayed" fill="var(--color-error-dark)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* MSME Classification */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-silver)' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-ink)', margin: '0 0 4px 0' }}>
              MSME Classification
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-mercury-grey)', margin: 0 }}>
              Vendor distribution by size
            </p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={classificationData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {classificationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {classificationData.map((item) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: item.color }} />
                  <span style={{ fontSize: '13px', color: 'var(--color-mercury-grey)' }}>{item.name}</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-ink)' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Compliance Aging Analysis */}
      <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-silver)', marginBottom: '24px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-ink)', margin: '0 0 4px 0' }}>
            Compliance Aging Analysis
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--color-mercury-grey)', margin: 0 }}>
            Payment aging against 45-day MSMED Act requirement
          </p>
        </div>
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-cloud)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', borderBottom: '1px solid var(--color-silver)' }}>
                  Aging Range
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', borderBottom: '1px solid var(--color-silver)' }}>
                  Count
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', borderBottom: '1px solid var(--color-silver)' }}>
                  Amount
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', borderBottom: '1px solid var(--color-silver)' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {complianceAgingData.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid var(--color-silver)' }}>
                  <td style={{ padding: '16px', fontSize: '13px', color: 'var(--color-ink)' }}>
                    {item.range}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: 'var(--color-ink)' }}>
                    {item.count}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', fontSize: '13px', fontWeight: '500', color: 'var(--color-ink)' }}>
                    {formatCurrency(item.amount)}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor:
                          item.status === 'safe' ? '#E6F7ED' :
                          item.status === 'watch' ? '#FFF9E6' :
                          item.status === 'critical' ? '#FEF3C7' :
                          item.status === 'breach' ? '#FFEDD5' :
                          'var(--color-error-light)',
                        color:
                          item.status === 'safe' ? '#059669' :
                          item.status === 'watch' ? '#D97706' :
                          item.status === 'critical' ? '#D97706' :
                          item.status === 'breach' ? '#EA580C' :
                          'var(--color-error-dark)',
                      }}
                    >
                      {item.status === 'safe' && '✓ Safe'}
                      {item.status === 'watch' && '⚠ Watch'}
                      {item.status === 'critical' && '⚠ Critical'}
                      {item.status === 'breach' && '⚠ Breach'}
                      {item.status === 'penalty' && '⚠ Penalty'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent MSME Invoices */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--color-silver)' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--color-silver)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-ink)', margin: '0 0 4px 0' }}>
              MSME Invoices Requiring Attention
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-mercury-grey)', margin: 0 }}>
              Invoices sorted by priority and due date
            </p>
          </div>
          <button
            onClick={() => navigate('/invoices')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: 'var(--color-teal)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            View All
            <ChevronRight style={{ width: '14px', height: '14px' }} />
          </button>
        </div>

        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-cloud)' }}>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', borderBottom: '1px solid var(--color-silver)' }}>
                  Invoice ID
                </th>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', borderBottom: '1px solid var(--color-silver)' }}>
                  Vendor
                </th>
                <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', borderBottom: '1px solid var(--color-silver)' }}>
                  Type
                </th>
                <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', borderBottom: '1px solid var(--color-silver)' }}>
                  Amount
                </th>
                <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', borderBottom: '1px solid var(--color-silver)' }}>
                  Due Date
                </th>
                <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', borderBottom: '1px solid var(--color-silver)' }}>
                  Aging
                </th>
                <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', borderBottom: '1px solid var(--color-silver)' }}>
                  Status
                </th>
                <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', borderBottom: '1px solid var(--color-silver)' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {recentMSMEInvoices.map((invoice) => (
                <tr key={invoice.id} style={{ borderBottom: '1px solid var(--color-silver)' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-teal)' }}>
                      {invoice.id}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-ink)', margin: 0 }}>
                        {invoice.vendor}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--color-mercury-grey)', margin: '2px 0 0 0' }}>
                        {invoice.udyamNo}
                      </p>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '500',
                        backgroundColor: 'var(--color-teal-tint)',
                        color: 'var(--color-teal)',
                      }}
                    >
                      {invoice.type}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', fontSize: '13px', fontWeight: '500', color: 'var(--color-ink)' }}>
                    {formatCurrency(invoice.amount)}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center', fontSize: '13px', color: 'var(--color-mercury-grey)' }}>
                    {invoice.dueDate}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: '500',
                        color: invoice.agingDays > 5 ? 'var(--color-error-dark)' : invoice.agingDays > 0 ? '#D97706' : 'var(--color-mercury-grey)',
                      }}
                    >
                      {invoice.agingDays === 0 ? 'Today' : `${invoice.agingDays}d`}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor:
                          invoice.status === 'due-today' ? '#FFF9E6' :
                          invoice.status === 'upcoming' ? 'var(--color-teal-tint)' :
                          invoice.status === 'overdue' ? 'var(--color-error-light)' :
                          '#FFEDD5',
                        color: getStatusColor(invoice.status),
                      }}
                    >
                      {getStatusLabel(invoice.status)}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <button
                      onClick={() => navigate('/invoices')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'var(--color-teal)',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#FFFFFF',
                        cursor: 'pointer',
                      }}
                    >
                      Pay Now
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}