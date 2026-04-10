import { useState } from 'react';
import { 
  FileText, Clock, CheckCircle, XCircle, AlertTriangle, 
  TrendingUp, TrendingDown, IndianRupee, Users, Calendar,
  Download, Filter, RefreshCw, MoreVertical
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useMasterData } from '../contexts/MasterDataContext';
import { useAPData } from '../contexts/APDataContext';

/**
 * AP DESK ADVANCED DASHBOARD
 * Enterprise-grade operational dashboard for AP team
 */

export function APDeskAdvanced() {
  const { vendors } = useMasterData();
  const { invoices } = useAPData();
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  // Safety checks for undefined data
  const safeInvoices = invoices || [];
  const safeVendors = vendors || [];

  // Calculate Key Metrics
  const totalInvoices = safeInvoices.length;
  const pendingInvoices = safeInvoices.filter(inv => inv.status === 'Pending Approval' || inv.status === 'Under Review').length;
  const approvedInvoices = safeInvoices.filter(inv => inv.status === 'Approved' || inv.status === 'Paid').length;
  const rejectedInvoices = safeInvoices.filter(inv => inv.status === 'Rejected').length;
  const overdueInvoices = safeInvoices.filter(inv => {
    if (!inv.dueDate) return false;
    const dueDate = new Date(inv.dueDate);
    return dueDate < new Date() && inv.status !== 'Paid';
  }).length;

  const totalInvoiceValue = safeInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const pendingValue = safeInvoices
    .filter(inv => inv.status === 'Pending Approval' || inv.status === 'Under Review')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);
  const approvedValue = safeInvoices
    .filter(inv => inv.status === 'Approved' || inv.status === 'Paid')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const avgProcessingTime = 3.2; // days
  const avgApprovalTime = 1.8; // days

  // Invoice Status Distribution
  const statusData = [
    { name: 'Pending', value: pendingInvoices, color: '#F59E0B' },
    { name: 'Approved', value: approvedInvoices, color: '#10B981' },
    { name: 'Rejected', value: rejectedInvoices, color: '#EF4444' },
    { name: 'Overdue', value: overdueInvoices, color: '#DC2626' }
  ];

  // Monthly Invoice Trend (Last 6 months)
  const monthlyTrend = [
    { month: 'Aug', invoices: 145, value: 12.5, approved: 135, pending: 10 },
    { month: 'Sep', invoices: 168, value: 15.2, approved: 155, pending: 13 },
    { month: 'Oct', invoices: 182, value: 16.8, approved: 170, pending: 12 },
    { month: 'Nov', invoices: 195, value: 18.3, approved: 182, pending: 13 },
    { month: 'Dec', invoices: 210, value: 19.8, approved: 195, pending: 15 },
    { month: 'Jan', invoices: 189, value: 17.2, approved: 175, pending: 14 }
  ];

  // Processing Time Trends
  const processingTimeTrend = [
    { week: 'W1', time: 3.8, target: 3.0 },
    { week: 'W2', time: 3.5, target: 3.0 },
    { week: 'W3', time: 3.2, target: 3.0 },
    { week: 'W4', time: 2.9, target: 3.0 }
  ];

  // Top Vendors by Invoice Count
  const vendorInvoiceCount = safeVendors
    .map(vendor => ({
      name: vendor.name.length > 25 ? vendor.name.substring(0, 25) + '...' : vendor.name,
      count: safeInvoices.filter(inv => inv.vendorId === vendor.id).length,
      value: safeInvoices.filter(inv => inv.vendorId === vendor.id).reduce((sum, inv) => sum + inv.totalAmount, 0) / 100000 // in lakhs
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Aging Analysis
  const agingData = [
    { range: '0-30 days', count: 78, value: 6.5 },
    { range: '31-60 days', count: 45, value: 4.2 },
    { range: '61-90 days', count: 23, value: 2.8 },
    { range: '90+ days', count: 12, value: 1.5 }
  ];

  // Exception Analysis
  const exceptionData = [
    { type: 'PO Mismatch', count: 18, severity: 'high' },
    { type: 'Price Variance', count: 25, severity: 'medium' },
    { type: 'Tax Discrepancy', count: 12, severity: 'high' },
    { type: 'Missing GRN', count: 8, severity: 'high' },
    { type: 'Duplicate Invoice', count: 5, severity: 'critical' }
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatLakhs = (value: number) => {
    return `₹${value.toFixed(1)}L`;
  };

  const formatCrores = (value: number) => {
    return `₹${value.toFixed(1)}Cr`;
  };

  return (
    <div className="p-8 space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Invoices */}
        <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#EFF6FF' }}>
              <FileText className="w-5 h-5" style={{ color: '#3B82F6' }} />
            </div>
            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
              MTD
            </span>
          </div>
          <div className="text-2xl mb-1" style={{ color: '#0A0F14', fontWeight: '700' }}>
            {totalInvoices}
          </div>
          <div className="text-xs mb-2" style={{ color: '#6E7A82' }}>
            Total Invoices
          </div>
          <div className="text-xs flex items-center gap-1" style={{ color: '#10B981' }}>
            <TrendingUp className="w-3 h-3" />
            <span>+12% vs last month</span>
          </div>
        </div>

        {/* Pending Invoices */}
        <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
              <Clock className="w-5 h-5" style={{ color: '#F59E0B' }} />
            </div>
            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
              Action Needed
            </span>
          </div>
          <div className="text-2xl mb-1" style={{ color: '#0A0F14', fontWeight: '700' }}>
            {pendingInvoices}
          </div>
          <div className="text-xs mb-2" style={{ color: '#6E7A82' }}>
            Pending Approval
          </div>
          <div className="text-xs" style={{ color: '#6E7A82' }}>
            Value: {formatCrores(pendingValue / 10000000)}
          </div>
        </div>

        {/* Approved Invoices */}
        <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#D1FAE5' }}>
              <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
            </div>
          </div>
          <div className="text-2xl mb-1" style={{ color: '#0A0F14', fontWeight: '700' }}>
            {approvedInvoices}
          </div>
          <div className="text-xs mb-2" style={{ color: '#6E7A82' }}>
            Approved Invoices
          </div>
          <div className="text-xs" style={{ color: '#6E7A82' }}>
            Value: {formatCrores(approvedValue / 10000000)}
          </div>
        </div>

        {/* Overdue Invoices */}
        <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
              <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} />
            </div>
            {overdueInvoices > 0 && (
              <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                Critical
              </span>
            )}
          </div>
          <div className="text-2xl mb-1" style={{ color: '#0A0F14', fontWeight: '700' }}>
            {overdueInvoices}
          </div>
          <div className="text-xs mb-2" style={{ color: '#6E7A82' }}>
            Overdue Invoices
          </div>
          <div className="text-xs" style={{ color: '#EF4444' }}>
            Requires immediate attention
          </div>
        </div>

        {/* Avg Processing Time */}
        <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#F3E8FF' }}>
              <TrendingDown className="w-5 h-5" style={{ color: '#9333EA' }} />
            </div>
          </div>
          <div className="text-2xl mb-1" style={{ color: '#0A0F14', fontWeight: '700' }}>
            {avgProcessingTime}d
          </div>
          <div className="text-xs mb-2" style={{ color: '#6E7A82' }}>
            Avg Processing Time
          </div>
          <div className="text-xs flex items-center gap-1" style={{ color: '#10B981' }}>
            <TrendingDown className="w-3 h-3" />
            <span>-15% improvement</span>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Status Distribution */}
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
                Invoice Status Distribution
              </h3>
              <p className="text-xs" style={{ color: '#6E7A82' }}>
                Current month breakdown
              </p>
            </div>
          </div>
          <div style={{ height: '280px', minHeight: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height={280} debounce={1}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {statusData.map((status) => (
              <div key={status.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: status.color }} />
                <span className="text-xs" style={{ color: '#6E7A82' }}>
                  {status.name}: {status.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Invoice Trend */}
        <div className="bg-white rounded-lg p-6 lg:col-span-2" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
                Monthly Invoice Trend
              </h3>
              <p className="text-xs" style={{ color: '#6E7A82' }}>
                Invoice count and value over last 6 months
              </p>
            </div>
          </div>
          <div style={{ height: '280px', minHeight: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height={280} debounce={1}>
              <AreaChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E6EA" />
                <XAxis dataKey="month" style={{ fontSize: '12px', fill: '#6E7A82' }} />
                <YAxis yAxisId="left" style={{ fontSize: '12px', fill: '#6E7A82' }} />
                <YAxis yAxisId="right" orientation="right" style={{ fontSize: '12px', fill: '#6E7A82' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area yAxisId="left" type="monotone" dataKey="invoices" stroke="#00A9B7" fill="#00A9B7" fillOpacity={0.3} name="Invoice Count" />
                <Area yAxisId="right" type="monotone" dataKey="value" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.3} name="Value (Cr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Vendors by Invoice Count */}
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
                Top Vendors by Invoice Count
              </h3>
              <p className="text-xs" style={{ color: '#6E7A82' }}>
                Top 10 vendors this month
              </p>
            </div>
          </div>
          <div style={{ height: '300px', minHeight: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height={300} minHeight={300}>
              <BarChart data={vendorInvoiceCount} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E6EA" />
                <XAxis type="number" style={{ fontSize: '11px', fill: '#6E7A82' }} />
                <YAxis dataKey="name" type="category" width={120} style={{ fontSize: '11px', fill: '#6E7A82' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#00A9B7" name="Invoice Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Processing Time Trend */}
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
                Processing Time Trend
              </h3>
              <p className="text-xs" style={{ color: '#6E7A82' }}>
                Average days vs target (last 4 weeks)
              </p>
            </div>
          </div>
          <div style={{ height: '300px', minHeight: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height={300} minHeight={300}>
              <LineChart data={processingTimeTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E6EA" />
                <XAxis dataKey="week" style={{ fontSize: '12px', fill: '#6E7A82' }} />
                <YAxis style={{ fontSize: '12px', fill: '#6E7A82' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="time" stroke="#00A9B7" strokeWidth={2} name="Actual Time" />
                <Line type="monotone" dataKey="target" stroke="#EF4444" strokeWidth={2} strokeDasharray="5 5" name="Target" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Exception Analysis & Aging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exception Analysis */}
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
                Exception Analysis
              </h3>
              <p className="text-xs" style={{ color: '#6E7A82' }}>
                Invoice exceptions requiring attention
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {exceptionData.map((exception, idx) => {
              const severityColors = {
                critical: { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
                high: { bg: '#FED7AA', text: '#9A3412', border: '#F97316' },
                medium: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' }
              };
              const colors = severityColors[exception.severity as keyof typeof severityColors];

              return (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ border: `1px solid ${colors.border}`, backgroundColor: colors.bg }}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5" style={{ color: colors.border }} />
                    <div>
                      <div className="text-sm" style={{ color: '#0A0F14', fontWeight: '500' }}>
                        {exception.type}
                      </div>
                      <div className="text-xs" style={{ color: '#6E7A82' }}>
                        {exception.count} invoices affected
                      </div>
                    </div>
                  </div>
                  <span 
                    className="text-xs px-2 py-1 rounded uppercase"
                    style={{ backgroundColor: '#FFFFFF', color: colors.text, fontWeight: '600' }}
                  >
                    {exception.severity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Aging Analysis */}
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
                Invoice Aging Analysis
              </h3>
              <p className="text-xs" style={{ color: '#6E7A82' }}>
                Pending invoices by age bucket
              </p>
            </div>
          </div>
          <div style={{ height: '260px', minHeight: '260px', width: '100%' }}>
            <ResponsiveContainer width="100%" height={260} minHeight={260}>
              <BarChart data={agingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E6EA" />
                <XAxis dataKey="range" style={{ fontSize: '11px', fill: '#6E7A82' }} />
                <YAxis style={{ fontSize: '11px', fill: '#6E7A82' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="count" fill="#00A9B7" name="Invoice Count" />
                <Bar dataKey="value" fill="#F59E0B" name="Value (Cr)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}