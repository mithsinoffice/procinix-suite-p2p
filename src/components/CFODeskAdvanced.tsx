import { useState } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, 
  Shield, Clock, Target, Activity, BarChart3, 
  Download, RefreshCw, Calendar
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart } from 'recharts';
import { useMasterData } from '../contexts/MasterDataContext';
import { useAPData } from '../contexts/APDataContext';

/**
 * CFO DESK ADVANCED DASHBOARD
 * Enterprise-grade strategic dashboard for CFO and finance executives
 */

export function CFODeskAdvanced() {
  const { vendors, costCentres, banks } = useMasterData();
  const { invoices } = useAPData();
  const [timeHorizon, setTimeHorizon] = useState<'quarter' | 'ytd' | 'year'>('ytd');

  // Safety checks for undefined data
  const safeInvoices = invoices || [];
  const safeVendors = vendors || [];

  // Calculate Strategic Metrics
  const totalSpendYTD = safeInvoices
    .filter(inv => inv.status === 'Paid' || inv.status === 'Approved')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const budgetAllocated = 265000000; // 26.5 Cr
  const budgetUtilization = (totalSpendYTD / budgetAllocated) * 100;
  const budgetVariance = ((totalSpendYTD - budgetAllocated) / budgetAllocated) * 100;

  const openCommitments = safeInvoices
    .filter(inv => inv.status === 'Pending Approval' || inv.status === 'Under Review')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const avgPaymentCycle = 28.5; // days
  const workingCapitalDays = 42; // days
  const complianceScore = 94.2; // percentage

  // Cash Flow Forecast (Next 6 months)
  const cashFlowForecast = [
    { month: 'Feb 25', inflow: 45.2, outflow: 38.5, net: 6.7, committed: 35.2 },
    { month: 'Mar 25', inflow: 52.8, outflow: 42.8, net: 10.0, committed: 38.6 },
    { month: 'Apr 25', inflow: 48.5, outflow: 45.2, net: 3.3, committed: 41.8 },
    { month: 'May 25', inflow: 55.2, outflow: 41.6, net: 13.6, committed: 37.4 },
    { month: 'Jun 25', inflow: 49.8, outflow: 39.8, net: 10.0, committed: 35.9 },
    { month: 'Jul 25', inflow: 58.5, outflow: 43.5, net: 15.0, committed: 39.2 }
  ];

  // Budget vs Actual by Department
  const departmentBudget = [
    { dept: 'Operations', budget: 85.5, actual: 78.2, committed: 12.5, variance: -8.5 },
    { dept: 'IT', budget: 45.2, actual: 48.6, committed: 6.8, variance: 7.5 },
    { dept: 'Marketing', budget: 38.8, actual: 35.4, committed: 4.2, variance: -8.8 },
    { dept: 'Admin', budget: 28.5, actual: 26.8, committed: 3.5, variance: -6.0 },
    { dept: 'Sales', budget: 42.0, actual: 44.2, committed: 5.8, variance: 5.2 },
    { dept: 'R&D', budget: 25.0, actual: 22.5, committed: 2.8, variance: -10.0 }
  ];

  // Spend by Category
  const categorySpend = [
    { category: 'Direct Materials', value: 125.5, percent: 47.3, color: '#00A9B7' },
    { category: 'Services', value: 65.2, percent: 24.6, color: '#F59E0B' },
    { category: 'IT & Software', value: 38.8, percent: 14.6, color: '#3B82F6' },
    { category: 'Professional Fees', value: 22.5, percent: 8.5, color: '#8B5CF6' },
    { category: 'Others', value: 13.5, percent: 5.0, color: '#6B7280' }
  ];

  // Monthly Spend Trend (Last 12 months)
  const monthlySpend = [
    { month: 'Feb 24', spend: 18.5, budget: 20.0, variance: -7.5 },
    { month: 'Mar 24', spend: 22.8, budget: 21.5, variance: 6.0 },
    { month: 'Apr 24', spend: 19.2, budget: 22.0, variance: -12.7 },
    { month: 'May 24', spend: 24.5, budget: 23.5, variance: 4.3 },
    { month: 'Jun 24', spend: 21.8, budget: 22.0, variance: -0.9 },
    { month: 'Jul 24', spend: 26.2, budget: 24.0, variance: 9.2 },
    { month: 'Aug 24', spend: 23.5, budget: 24.5, variance: -4.1 },
    { month: 'Sep 24', spend: 25.8, budget: 25.0, variance: 3.2 },
    { month: 'Oct 24', spend: 28.2, budget: 26.5, variance: 6.4 },
    { month: 'Nov 24', spend: 27.5, budget: 27.0, variance: 1.9 },
    { month: 'Dec 24', spend: 29.8, budget: 28.0, variance: 6.4 },
    { month: 'Jan 25', spend: 26.5, budget: 26.0, variance: 1.9 }
  ];

  // Top Vendors by Spend
  const topVendorSpend = safeVendors
    .map(vendor => ({
      name: vendor.name.length > 30 ? vendor.name.substring(0, 30) + '...' : vendor.name,
      ytdSpend: (Math.random() * 50 + 10).toFixed(1),
      invoiceCount: Math.floor(Math.random() * 50 + 10),
      avgPaymentDays: Math.floor(Math.random() * 20 + 15)
    }))
    .sort((a, b) => parseFloat(b.ytdSpend) - parseFloat(a.ytdSpend))
    .slice(0, 8);

  // Working Capital Metrics
  const workingCapitalTrend = [
    { month: 'Aug', dpo: 38, dso: 45, daysInvested: 82 },
    { month: 'Sep', dpo: 40, dso: 43, daysInvested: 84 },
    { month: 'Oct', dpo: 42, dso: 42, daysInvested: 86 },
    { month: 'Nov', dpo: 41, dso: 44, daysInvested: 85 },
    { month: 'Dec', dpo: 43, dso: 42, daysInvested: 87 },
    { month: 'Jan', dpo: 42, dso: 43, daysInvested: 85 }
  ];

  // Risk & Compliance Metrics
  const riskMetrics = [
    { metric: 'Policy Violations', count: 7, severity: 'medium', trend: -12 },
    { metric: 'Budget Overruns', count: 2, severity: 'high', trend: -33 },
    { metric: 'Late Payments', count: 18, severity: 'medium', trend: -22 },
    { metric: 'Contract Expirations', count: 5, severity: 'low', trend: 0 }
  ];

  // Savings Opportunities
  const savingsOpportunities = [
    { opportunity: 'Early Payment Discounts', potential: 2.8, ease: 'high' },
    { opportunity: 'Vendor Consolidation', potential: 4.5, ease: 'medium' },
    { opportunity: 'Contract Renegotiation', potential: 6.2, ease: 'medium' },
    { opportunity: 'Payment Terms Optimization', potential: 3.5, ease: 'high' },
    { opportunity: 'Process Automation', potential: 5.8, ease: 'low' }
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatCrores = (value: number) => {
    return `₹${value.toFixed(1)}Cr`;
  };

  return (
    <div className="p-8 space-y-6">
      {/* Executive KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spend YTD */}
        <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#EFF6FF' }}>
              <DollarSign className="w-5 h-5" style={{ color: '#3B82F6' }} />
            </div>
            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#EFF6FF', color: '#1E40AF' }}>
              YTD
            </span>
          </div>
          <div className="text-2xl mb-1" style={{ color: '#0A0F14', fontWeight: '700' }}>
            {formatCrores(totalSpendYTD / 10000000)}
          </div>
          <div className="text-xs mb-2" style={{ color: '#6E7A82' }}>
            Total Spend YTD
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs" style={{ color: '#6E7A82' }}>
              Budget: {formatCrores(budgetAllocated / 10000000)}
            </div>
            <div className="text-xs flex items-center gap-1" style={{ color: budgetVariance < 0 ? '#10B981' : '#EF4444' }}>
              {budgetVariance < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
              <span>{Math.abs(budgetVariance).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Budget Utilization */}
        <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#F3E8FF' }}>
              <Target className="w-5 h-5" style={{ color: '#9333EA' }} />
            </div>
          </div>
          <div className="text-2xl mb-1" style={{ color: '#0A0F14', fontWeight: '700' }}>
            {budgetUtilization.toFixed(1)}%
          </div>
          <div className="text-xs mb-2" style={{ color: '#6E7A82' }}>
            Budget Utilization
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
            <div 
              className="h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min(budgetUtilization, 100)}%`,
                backgroundColor: budgetUtilization > 95 ? '#EF4444' : budgetUtilization > 80 ? '#F59E0B' : '#10B981'
              }}
            />
          </div>
        </div>

        {/* Open Commitments */}
        <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
              <Activity className="w-5 h-5" style={{ color: '#F59E0B' }} />
            </div>
            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
              Uncommitted
            </span>
          </div>
          <div className="text-2xl mb-1" style={{ color: '#0A0F14', fontWeight: '700' }}>
            {formatCrores(openCommitments / 10000000)}
          </div>
          <div className="text-xs mb-2" style={{ color: '#6E7A82' }}>
            Open Commitments
          </div>
          <div className="text-xs" style={{ color: '#6E7A82' }}>
            {((openCommitments / budgetAllocated) * 100).toFixed(1)}% of budget
          </div>
        </div>

        {/* Compliance Score */}
        <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#D1FAE5' }}>
              <Shield className="w-5 h-5" style={{ color: '#10B981' }} />
            </div>
            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
              Healthy
            </span>
          </div>
          <div className="text-2xl mb-1" style={{ color: '#0A0F14', fontWeight: '700' }}>
            {complianceScore.toFixed(1)}%
          </div>
          <div className="text-xs mb-2" style={{ color: '#6E7A82' }}>
            Compliance Score
          </div>
          <div className="text-xs flex items-center gap-1" style={{ color: '#10B981' }}>
            <TrendingUp className="w-3 h-3" />
            <span>+2.1% improvement</span>
          </div>
        </div>
      </div>

      {/* Working Capital & Operational Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#DBEAFE' }}>
              <Clock className="w-5 h-5" style={{ color: '#3B82F6' }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: '#6E7A82' }}>Avg Payment Cycle</div>
              <div className="text-xl" style={{ color: '#0A0F14', fontWeight: '700' }}>{avgPaymentCycle} days</div>
            </div>
          </div>
          <div className="text-xs" style={{ color: '#10B981' }}>↓ 3.2 days vs last quarter</div>
        </div>

        <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
              <BarChart3 className="w-5 h-5" style={{ color: '#F59E0B' }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: '#6E7A82' }}>Working Capital Days</div>
              <div className="text-xl" style={{ color: '#0A0F14', fontWeight: '700' }}>{workingCapitalDays} days</div>
            </div>
          </div>
          <div className="text-xs" style={{ color: '#10B981' }}>↓ 5 days improvement</div>
        </div>

        <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#D1FAE5' }}>
              <TrendingUp className="w-5 h-5" style={{ color: '#10B981' }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: '#6E7A82' }}>Savings Potential</div>
              <div className="text-xl" style={{ color: '#0A0F14', fontWeight: '700' }}>₹22.8Cr</div>
            </div>
          </div>
          <div className="text-xs" style={{ color: '#6E7A82' }}>8.6% of total spend</div>
        </div>
      </div>

      {/* Charts Row 1 - Strategic Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Forecast */}
        <div className="bg-white rounded-lg p-6 lg:col-span-2" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
                Cash Flow Forecast (6 Months)
              </h3>
              <p className="text-xs" style={{ color: '#6E7A82' }}>
                Projected inflows, outflows, and net position
              </p>
            </div>
            <button 
              className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-2"
              style={{ backgroundColor: '#00A9B7', color: '#FFFFFF' }}
            >
              <Download className="w-3 h-3" />
              Export
            </button>
          </div>
          <div style={{ height: '320px', minHeight: '320px', width: '100%' }}>
            <ResponsiveContainer width="100%" height={320} debounce={1}>
              <ComposedChart data={cashFlowForecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E6EA" />
                <XAxis dataKey="month" style={{ fontSize: '11px', fill: '#6E7A82' }} />
                <YAxis style={{ fontSize: '11px', fill: '#6E7A82' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="inflow" fill="#10B981" name="Inflow (Cr)" />
                <Bar dataKey="outflow" fill="#EF4444" name="Outflow (Cr)" />
                <Line type="monotone" dataKey="net" stroke="#3B82F6" strokeWidth={2} name="Net Position (Cr)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Spend by Category */}
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
                Spend by Category
              </h3>
              <p className="text-xs" style={{ color: '#6E7A82' }}>
                YTD distribution
              </p>
            </div>
          </div>
          <div style={{ height: '240px', minHeight: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height={240} debounce={1}>
              <PieChart>
                <Pie
                  data={categorySpend}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categorySpend.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {categorySpend.map((cat) => (
              <div key={cat.category} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: cat.color }} />
                  <span style={{ color: '#6E7A82' }}>{cat.category}</span>
                </div>
                <span style={{ color: '#0A0F14', fontWeight: '600' }}>{formatCrores(cat.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 - Budget & Spend Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget vs Actual by Department */}
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
                Budget vs Actual by Department
              </h3>
              <p className="text-xs" style={{ color: '#6E7A82' }}>
                Including committed amounts
              </p>
            </div>
          </div>
          <div style={{ height: '320px', minHeight: '320px', width: '100%' }}>
            <ResponsiveContainer width="100%" height={320} minHeight={320}>
              <BarChart data={departmentBudget} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E6EA" />
                <XAxis type="category" dataKey="dept" style={{ fontSize: '11px', fill: '#6E7A82' }} />
                <YAxis type="number" style={{ fontSize: '11px', fill: '#6E7A82' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="budget" fill="#E1E6EA" name="Budget (Cr)" />
                <Bar dataKey="actual" fill="#00A9B7" name="Actual (Cr)" />
                <Bar dataKey="committed" fill="#F59E0B" name="Committed (Cr)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Spend Trend */}
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
                Monthly Spend Trend (Last 12 Months)
              </h3>
              <p className="text-xs" style={{ color: '#6E7A82' }}>
                Actual vs budgeted spend
              </p>
            </div>
          </div>
          <div style={{ height: '320px', minHeight: '320px', width: '100%' }}>
            <ResponsiveContainer width="100%" height={320} minHeight={320}>
              <AreaChart data={monthlySpend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E6EA" />
                <XAxis dataKey="month" style={{ fontSize: '10px', fill: '#6E7A82' }} />
                <YAxis style={{ fontSize: '11px', fill: '#6E7A82' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="budget" stroke="#9CA3AF" fill="#E5E7EB" fillOpacity={0.6} name="Budget (Cr)" />
                <Area type="monotone" dataKey="spend" stroke="#00A9B7" fill="#00A9B7" fillOpacity={0.4} name="Actual Spend (Cr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row - Tables & Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Vendors by Spend */}
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
                Top Vendors by Spend
              </h3>
              <p className="text-xs" style={{ color: '#6E7A82' }}>
                YTD performance metrics
              </p>
            </div>
          </div>
          <div className="overflow-auto" style={{ maxHeight: '320px' }}>
            <table className="w-full">
              <thead style={{ backgroundColor: '#F6F9FC', position: 'sticky', top: 0 }}>
                <tr style={{ borderBottom: '1px solid #E1E6EA' }}>
                  <th className="px-3 py-2 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Vendor</th>
                  <th className="px-3 py-2 text-right text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>YTD Spend</th>
                  <th className="px-3 py-2 text-right text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Invoices</th>
                  <th className="px-3 py-2 text-right text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Avg Days</th>
                </tr>
              </thead>
              <tbody>
                {topVendorSpend.map((vendor, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F6F9FC' }}>
                    <td className="px-3 py-3 text-xs" style={{ color: '#0A0F14' }}>{vendor.name}</td>
                    <td className="px-3 py-3 text-xs text-right" style={{ color: '#0A0F14', fontWeight: '600' }}>
                      ₹{vendor.ytdSpend}Cr
                    </td>
                    <td className="px-3 py-3 text-xs text-right" style={{ color: '#6E7A82' }}>{vendor.invoiceCount}</td>
                    <td className="px-3 py-3 text-xs text-right" style={{ color: '#6E7A82' }}>{vendor.avgPaymentDays}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Savings Opportunities */}
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
                Identified Savings Opportunities
              </h3>
              <p className="text-xs" style={{ color: '#6E7A82' }}>
                Potential cost reduction initiatives
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {savingsOpportunities.map((opp, idx) => {
              const easeColors = {
                high: { bg: '#D1FAE5', text: '#065F46', border: '#10B981' },
                medium: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
                low: { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' }
              };
              const colors = easeColors[opp.ease as keyof typeof easeColors];

              return (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ border: `1px solid #E1E6EA`, backgroundColor: '#FAFBFC' }}
                >
                  <div className="flex-1">
                    <div className="text-sm mb-1" style={{ color: '#0A0F14', fontWeight: '500' }}>
                      {opp.opportunity}
                    </div>
                    <div className="flex items-center gap-2">
                      <span 
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {opp.ease} ease
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base" style={{ color: '#10B981', fontWeight: '700' }}>
                      ₹{opp.potential}Cr
                    </div>
                    <div className="text-xs" style={{ color: '#6E7A82' }}>
                      potential
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Risk & Compliance Section */}
      <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
              Risk & Compliance Monitoring
            </h3>
            <p className="text-xs" style={{ color: '#6E7A82' }}>
              Key risk indicators and trends
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {riskMetrics.map((risk, idx) => {
            const severityColors = {
              critical: { bg: '#FEE2E2', icon: '#EF4444', border: '#EF4444' },
              high: { bg: '#FED7AA', icon: '#F97316', border: '#F97316' },
              medium: { bg: '#FEF3C7', icon: '#F59E0B', border: '#F59E0B' },
              low: { bg: '#D1FAE5', icon: '#10B981', border: '#10B981' }
            };
            const colors = severityColors[risk.severity as keyof typeof severityColors];

            return (
              <div 
                key={idx}
                className="p-4 rounded-lg"
                style={{ border: `1px solid ${colors.border}`, backgroundColor: colors.bg }}
              >
                <div className="flex items-center justify-between mb-3">
                  <AlertTriangle className="w-5 h-5" style={{ color: colors.icon }} />
                  <div 
                    className="text-xl"
                    style={{ color: colors.icon, fontWeight: '700' }}
                  >
                    {risk.count}
                  </div>
                </div>
                <div className="text-sm mb-2" style={{ color: '#0A0F14', fontWeight: '500' }}>
                  {risk.metric}
                </div>
                <div className="flex items-center gap-1 text-xs" style={{ color: risk.trend <= 0 ? '#10B981' : '#EF4444' }}>
                  {risk.trend <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                  <span>{Math.abs(risk.trend)}% vs last month</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}