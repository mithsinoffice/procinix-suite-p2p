import { useState } from 'react';
import { 
  ShoppingCart, TrendingUp, TrendingDown, Users, Clock, 
  CheckCircle, AlertTriangle, Target, DollarSign, FileText,
  Award, Package, Calendar, Download, RefreshCw
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart, ScatterChart, Scatter } from 'recharts';
import { useMasterData } from '../contexts/MasterDataContext';

/**
 * PROCUREMENT DESK ADVANCED DASHBOARD
 * Enterprise-grade strategic dashboard for Procurement Head and team
 */

export function ProcurementDeskAdvanced() {
  const { vendors, purchaseOrders } = useMasterData();
  const [timeFilter, setTimeFilter] = useState<'month' | 'quarter' | 'ytd' | 'year'>('ytd');

  // Safety checks for undefined data
  const safeVendors = vendors || [];
  const safePOs = purchaseOrders || [];

  // Calculate Key Procurement Metrics
  const totalPOs = safePOs.length;
  const activePOs = safePOs.filter(po => po.status === 'Open' || po.status === 'Partially Received').length;
  const completedPOs = safePOs.filter(po => po.status === 'Closed').length;
  const pendingApprovalPOs = safePOs.filter(po => po.status === 'Pending Approval' || po.status === 'Draft').length;

  const totalPOValue = safePOs.reduce((sum, po) => sum + po.totalAmount, 0);
  const activePOValue = safePOs
    .filter(po => po.status === 'Open' || po.status === 'Partially Received')
    .reduce((sum, po) => sum + po.totalAmount, 0);

  const activeSuppliers = safeVendors.filter(v => v.status === 'Active').length;
  const totalSuppliers = safeVendors.length;

  const avgPOCycleTime = 4.2; // days
  const costSavingsYTD = 18.5; // Cr
  const onTimeDeliveryRate = 87.3; // percentage
  const supplierComplianceScore = 91.5; // percentage

  // PO Status Distribution
  const poStatusData = [
    { name: 'Open', value: activePOs, color: '#3B82F6' },
    { name: 'Completed', value: completedPOs, color: '#10B981' },
    { name: 'Pending Approval', value: pendingApprovalPOs, color: '#F59E0B' },
    { name: 'Cancelled', value: Math.floor(totalPOs * 0.03), color: '#EF4444' }
  ];

  // Monthly PO Trend (Last 6 months)
  const monthlyPOTrend = [
    { month: 'Aug', pos: 145, value: 38.5, avgCycleTime: 4.8 },
    { month: 'Sep', pos: 168, value: 42.8, avgCycleTime: 4.5 },
    { month: 'Oct', pos: 182, value: 45.2, avgCycleTime: 4.3 },
    { month: 'Nov', pos: 195, value: 48.6, avgCycleTime: 4.1 },
    { month: 'Dec', pos: 210, value: 52.3, avgCycleTime: 3.9 },
    { month: 'Jan', pos: 189, value: 46.8, avgCycleTime: 4.2 }
  ];

  // Spend by Category
  const categorySpendData = [
    { category: 'Raw Materials', value: 145.8, percent: 42.5, color: '#00A9B7' },
    { category: 'Services', value: 78.5, percent: 22.9, color: '#F59E0B' },
    { category: 'IT & Technology', value: 52.3, percent: 15.2, color: '#3B82F6' },
    { category: 'Facilities', value: 38.6, percent: 11.2, color: '#8B5CF6' },
    { category: 'Professional Services', value: 28.2, percent: 8.2, color: '#EC4899' }
  ];

  // Top Suppliers by Spend
  const topSupplierSpend = safeVendors
    .map(vendor => ({
      name: vendor.name.length > 25 ? vendor.name.substring(0, 25) + '...' : vendor.name,
      spend: (Math.random() * 40 + 15).toFixed(1),
      pos: Math.floor(Math.random() * 80 + 20),
      onTimeRate: (Math.random() * 20 + 80).toFixed(1),
      qualityScore: (Math.random() * 15 + 85).toFixed(1)
    }))
    .sort((a, b) => parseFloat(b.spend) - parseFloat(a.spend))
    .slice(0, 8);

  // Supplier Performance Metrics
  const supplierPerformance = [
    { metric: 'On-Time Delivery', current: 87.3, target: 90, trend: 2.5 },
    { metric: 'Quality Score', current: 92.1, target: 95, trend: 1.8 },
    { metric: 'Lead Time Adherence', current: 84.5, target: 88, trend: -1.2 },
    { metric: 'Compliance Rate', current: 91.5, target: 92, trend: 0.8 }
  ];

  // Cost Savings Analysis
  const savingsData = [
    { source: 'Negotiation', amount: 8.5, percent: 46 },
    { source: 'Consolidation', amount: 4.2, percent: 23 },
    { source: 'Alternative Sourcing', amount: 3.1, percent: 17 },
    { source: 'Process Improvement', amount: 2.7, percent: 14 }
  ];

  // PO Cycle Time Breakdown
  const cycleTimeBreakdown = [
    { stage: 'Requisition', avgDays: 0.8, color: '#3B82F6' },
    { stage: 'Approval', avgDays: 1.2, color: '#F59E0B' },
    { stage: 'Vendor Selection', avgDays: 1.5, color: '#8B5CF6' },
    { stage: 'PO Creation', avgDays: 0.7, color: '#10B981' }
  ];

  // Supplier Risk Analysis
  const supplierRiskData = [
    { risk: 'Concentration Risk', suppliers: 3, spend: 125.5, severity: 'high' },
    { risk: 'Single Source', suppliers: 12, spend: 45.2, severity: 'medium' },
    { risk: 'Contract Expiring (90d)', suppliers: 8, spend: 32.8, severity: 'medium' },
    { risk: 'Quality Issues', suppliers: 5, spend: 18.5, severity: 'low' }
  ];

  // Monthly Savings Trend
  const savingsTrend = [
    { month: 'Aug', planned: 2.5, actual: 2.8, cumulative: 12.5 },
    { month: 'Sep', planned: 2.8, actual: 3.2, cumulative: 15.7 },
    { month: 'Oct', planned: 3.0, actual: 2.9, cumulative: 18.6 },
    { month: 'Nov', planned: 2.7, actual: 3.1, cumulative: 21.7 },
    { month: 'Dec', planned: 3.2, actual: 3.5, cumulative: 25.2 },
    { month: 'Jan', planned: 2.9, actual: 2.8, cumulative: 28.0 }
  ];

  // Requisition to PO Metrics
  const reqToPOData = [
    { week: 'W1', reqs: 85, pos: 78, conversionRate: 91.8 },
    { week: 'W2', reqs: 92, pos: 85, conversionRate: 92.4 },
    { week: 'W3', reqs: 88, pos: 82, conversionRate: 93.2 },
    { week: 'W4', reqs: 95, pos: 88, conversionRate: 92.6 }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl mb-1" style={{ color: '#0A0F14', fontWeight: '700' }}>
            Procurement Dashboard
          </h2>
          <p className="text-sm" style={{ color: '#6E7A82' }}>
            Strategic procurement metrics and supplier performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ border: '1px solid #E1E6EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}
          >
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="ytd">Year to Date</option>
            <option value="year">Full Year</option>
          </select>
          <button 
            className="px-4 py-2 rounded-lg text-sm flex items-center gap-2"
            style={{ backgroundColor: '#00A9B7', color: '#FFFFFF' }}
          >
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total PO Value */}
        <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#EFF6FF' }}>
              <DollarSign className="w-5 h-5" style={{ color: '#3B82F6' }} />
            </div>
            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
              YTD
            </span>
          </div>
          <div className="text-2xl mb-1" style={{ color: '#0A0F14', fontWeight: '700' }}>
            {formatCrores(totalPOValue / 10000000)}
          </div>
          <div className="text-xs mb-2" style={{ color: '#6E7A82' }}>
            Total PO Value
          </div>
          <div className="text-xs flex items-center gap-1" style={{ color: '#10B981' }}>
            <TrendingUp className="w-3 h-3" />
            <span>+8.5% vs last year</span>
          </div>
        </div>

        {/* Active POs */}
        <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#DBEAFE' }}>
              <ShoppingCart className="w-5 h-5" style={{ color: '#3B82F6' }} />
            </div>
            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
              Active
            </span>
          </div>
          <div className="text-2xl mb-1" style={{ color: '#0A0F14', fontWeight: '700' }}>
            {activePOs}
          </div>
          <div className="text-xs mb-2" style={{ color: '#6E7A82' }}>
            Active Purchase Orders
          </div>
          <div className="text-xs" style={{ color: '#6E7A82' }}>
            Value: {formatCrores(activePOValue / 10000000)}
          </div>
        </div>

        {/* Active Suppliers */}
        <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#D1FAE5' }}>
              <Users className="w-5 h-5" style={{ color: '#10B981' }} />
            </div>
          </div>
          <div className="text-2xl mb-1" style={{ color: '#0A0F14', fontWeight: '700' }}>
            {activeSuppliers}
          </div>
          <div className="text-xs mb-2" style={{ color: '#6E7A82' }}>
            Active Suppliers
          </div>
          <div className="text-xs" style={{ color: '#6E7A82' }}>
            {((activeSuppliers / totalSuppliers) * 100).toFixed(0)}% of total base
          </div>
        </div>

        {/* Cost Savings */}
        <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#D1FAE5' }}>
              <TrendingDown className="w-5 h-5" style={{ color: '#10B981' }} />
            </div>
            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
              Savings
            </span>
          </div>
          <div className="text-2xl mb-1" style={{ color: '#0A0F14', fontWeight: '700' }}>
            {formatCrores(costSavingsYTD)}
          </div>
          <div className="text-xs mb-2" style={{ color: '#6E7A82' }}>
            Cost Savings YTD
          </div>
          <div className="text-xs flex items-center gap-1" style={{ color: '#10B981' }}>
            <Target className="w-3 h-3" />
            <span>105% of target achieved</span>
          </div>
        </div>

        {/* Avg PO Cycle Time */}
        <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#F3E8FF' }}>
              <Clock className="w-5 h-5" style={{ color: '#9333EA' }} />
            </div>
          </div>
          <div className="text-2xl mb-1" style={{ color: '#0A0F14', fontWeight: '700' }}>
            {avgPOCycleTime}d
          </div>
          <div className="text-xs mb-2" style={{ color: '#6E7A82' }}>
            Avg PO Cycle Time
          </div>
          <div className="text-xs flex items-center gap-1" style={{ color: '#10B981' }}>
            <TrendingDown className="w-3 h-3" />
            <span>-12% improvement</span>
          </div>
        </div>
      </div>

      {/* Supplier Performance KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {supplierPerformance.map((metric, idx) => {
          const isOnTrack = metric.current >= metric.target * 0.95;
          const bgColor = isOnTrack ? '#D1FAE5' : '#FEF3C7';
          const borderColor = isOnTrack ? '#10B981' : '#F59E0B';
          const textColor = isOnTrack ? '#065F46' : '#92400E';

          return (
            <div 
              key={idx}
              className="bg-white rounded-lg p-4"
              style={{ border: `1px solid ${borderColor}` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs" style={{ color: '#6E7A82' }}>{metric.metric}</div>
                <div 
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ backgroundColor: bgColor, color: textColor }}
                >
                  {isOnTrack ? 'On Track' : 'Monitor'}
                </div>
              </div>
              <div className="flex items-end justify-between mb-2">
                <div className="text-2xl" style={{ color: '#0A0F14', fontWeight: '700' }}>
                  {metric.current}%
                </div>
                <div className="text-xs" style={{ color: '#6E7A82' }}>
                  Target: {metric.target}%
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min((metric.current / metric.target) * 100, 100)}%`,
                    backgroundColor: borderColor
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PO Status Distribution */}
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
                PO Status Distribution
              </h3>
              <p className="text-xs" style={{ color: '#6E7A82' }}>
                Current portfolio breakdown
              </p>
            </div>
          </div>
          <div style={{ height: '240px', minHeight: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height={240} debounce={1}>
              <PieChart>
                <Pie
                  data={poStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {poStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {poStatusData.map((status) => (
              <div key={status.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: status.color }} />
                <span className="text-xs" style={{ color: '#6E7A82' }}>
                  {status.name}: {status.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly PO Trend */}
        <div className="bg-white rounded-lg p-6 lg:col-span-2" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
                Monthly PO Trend
              </h3>
              <p className="text-xs" style={{ color: '#6E7A82' }}>
                PO count and value over last 6 months
              </p>
            </div>
          </div>
          <div style={{ height: '240px', minHeight: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height={240} debounce={1}>
              <ComposedChart data={monthlyPOTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E6EA" />
                <XAxis dataKey="month" style={{ fontSize: '12px', fill: '#6E7A82' }} />
                <YAxis yAxisId="left" style={{ fontSize: '12px', fill: '#6E7A82' }} />
                <YAxis yAxisId="right" orientation="right" style={{ fontSize: '12px', fill: '#6E7A82' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar yAxisId="left" dataKey="pos" fill="#00A9B7" name="PO Count" />
                <Line yAxisId="right" type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={2} name="Value (Cr)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spend by Category */}
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
                Spend by Category
              </h3>
              <p className="text-xs" style={{ color: '#6E7A82' }}>
                YTD category distribution
              </p>
            </div>
          </div>
          <div style={{ height: '280px', minHeight: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height={280} debounce={1}>
              <BarChart data={categorySpendData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E6EA" />
                <XAxis type="category" dataKey="category" style={{ fontSize: '11px', fill: '#6E7A82' }} />
                <YAxis type="number" style={{ fontSize: '11px', fill: '#6E7A82' }} />
                <Tooltip />
                <Bar dataKey="value" name="Spend (Cr)">
                  {categorySpendData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost Savings Analysis */}
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
                Cost Savings by Source
              </h3>
              <p className="text-xs" style={{ color: '#6E7A82' }}>
                YTD savings breakdown
              </p>
            </div>
          </div>
          <div style={{ height: '280px', minHeight: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height={280} debounce={1}>
              <BarChart data={savingsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E6EA" />
                <XAxis type="number" style={{ fontSize: '11px', fill: '#6E7A82' }} />
                <YAxis dataKey="source" type="category" width={140} style={{ fontSize: '11px', fill: '#6E7A82' }} />
                <Tooltip />
                <Bar dataKey="amount" fill="#10B981" name="Savings (Cr)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Savings Trend */}
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
                Savings Achievement Trend
              </h3>
              <p className="text-xs" style={{ color: '#6E7A82' }}>
                Planned vs actual savings (last 6 months)
              </p>
            </div>
          </div>
          <div style={{ height: '280px', minHeight: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height={280} debounce={1}>
              <LineChart data={savingsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E6EA" />
                <XAxis dataKey="month" style={{ fontSize: '12px', fill: '#6E7A82' }} />
                <YAxis style={{ fontSize: '12px', fill: '#6E7A82' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="planned" stroke="#9CA3AF" strokeWidth={2} strokeDasharray="5 5" name="Planned (Cr)" />
                <Line type="monotone" dataKey="actual" stroke="#10B981" strokeWidth={2} name="Actual (Cr)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PO Cycle Time Breakdown */}
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
                PO Cycle Time Breakdown
              </h3>
              <p className="text-xs" style={{ color: '#6E7A82' }}>
                Average days per stage
              </p>
            </div>
          </div>
          <div style={{ height: '280px', minHeight: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height={280} debounce={1}>
              <BarChart data={cycleTimeBreakdown} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E6EA" />
                <XAxis type="category" dataKey="stage" style={{ fontSize: '12px', fill: '#6E7A82' }} />
                <YAxis type="number" style={{ fontSize: '12px', fill: '#6E7A82' }} />
                <Tooltip />
                <Bar dataKey="avgDays" name="Avg Days">
                  {cycleTimeBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section - Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Suppliers */}
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
                Top Suppliers by Spend
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
                  <th className="px-3 py-2 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Supplier</th>
                  <th className="px-3 py-2 text-right text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Spend (Cr)</th>
                  <th className="px-3 py-2 text-right text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>POs</th>
                  <th className="px-3 py-2 text-right text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>On-Time %</th>
                </tr>
              </thead>
              <tbody>
                {topSupplierSpend.map((supplier, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F6F9FC' }}>
                    <td className="px-3 py-3 text-xs" style={{ color: '#0A0F14' }}>{supplier.name}</td>
                    <td className="px-3 py-3 text-xs text-right" style={{ color: '#0A0F14', fontWeight: '600' }}>
                      ₹{supplier.spend}
                    </td>
                    <td className="px-3 py-3 text-xs text-right" style={{ color: '#6E7A82' }}>{supplier.pos}</td>
                    <td className="px-3 py-3 text-xs text-right" style={{ color: parseFloat(supplier.onTimeRate) >= 85 ? '#10B981' : '#EF4444', fontWeight: '600' }}>
                      {supplier.onTimeRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Supplier Risk Analysis */}
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
                Supplier Risk Analysis
              </h3>
              <p className="text-xs" style={{ color: '#6E7A82' }}>
                Key risk areas requiring attention
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {supplierRiskData.map((risk, idx) => {
              const severityColors = {
                high: { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
                medium: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
                low: { bg: '#D1FAE5', text: '#065F46', border: '#10B981' }
              };
              const colors = severityColors[risk.severity as keyof typeof severityColors];

              return (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ border: `1px solid ${colors.border}`, backgroundColor: colors.bg }}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5" style={{ color: colors.border }} />
                    <div>
                      <div className="text-sm mb-1" style={{ color: '#0A0F14', fontWeight: '500' }}>
                        {risk.risk}
                      </div>
                      <div className="text-xs" style={{ color: '#6E7A82' }}>
                        {risk.suppliers} suppliers • {formatCrores(risk.spend)} spend
                      </div>
                    </div>
                  </div>
                  <span 
                    className="text-xs px-2 py-1 rounded uppercase"
                    style={{ backgroundColor: '#FFFFFF', color: colors.text, fontWeight: '600' }}
                  >
                    {risk.severity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
