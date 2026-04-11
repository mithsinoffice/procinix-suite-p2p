import { useState } from 'react';
import { ArrowLeft, TrendingDown, TrendingUp, DollarSign, AlertTriangle, CheckCircle, Download, Shield, Clock, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ReportDataService from '../utils/reportDataService';

export function CFODesk() {
  const navigate = useNavigate();

  // KPI Data - Using Real Data Service
  const totalSpendYTD = ReportDataService.getTotalSpendYTD();
  const openPOCommitmentsValue = ReportDataService.getOpenPOValue() / 10000000;

  const kpiData = {
    totalSpendYTD: { value: totalSpendYTD, unit: 'Cr', trend: 12.3, budget: 265.0 },
    budgetVariance: { value: -6.2, unit: '%', isPositive: true, budget: 0 },
    openPOCommitments: { value: openPOCommitmentsValue, unit: 'Cr', trend: -8.5, budget: 50.0 },
    forecastedCashOutflow: { value: 38.5, unit: 'Cr', period: '30 days', trend: 5.2 },
    complianceScore: { value: ReportDataService.getComplianceScore(), unit: '%', trend: 2.1, target: 95 }
  };

  // Budget vs Actual vs Committed by Department - Using Real Data
  const departmentSpendData = ReportDataService.getDepartmentSpend();

  // Monthly Spend Trend (Last 12 months) - Using Real Data
  const monthlySpendTrend = ReportDataService.getMonthlySpendTrend();

  // Cash Outflow Forecast (Next 6 months)
  const cashOutflowForecast = [
    { month: 'Jan 25', forecast: 38.5, committed: 35.2 },
    { month: 'Feb 25', forecast: 42.8, committed: 38.6 },
    { month: 'Mar 25', forecast: 45.2, committed: 41.8 },
    { month: 'Apr 25', forecast: 41.6, committed: 37.4 },
    { month: 'May 25', forecast: 39.8, committed: 35.9 },
    { month: 'Jun 25', forecast: 43.5, committed: 39.2 }
  ];

  // Top 10 Vendors by Spend
  const topVendorsBySpend = [
    { vendor: 'Tata Steel Ltd.', spend: 45.2 },
    { vendor: 'Reliance Industries', spend: 38.6 },
    { vendor: 'Larsen & Toubro', spend: 32.8 },
    { vendor: 'Infosys Technologies', spend: 28.4 },
    { vendor: 'Wipro Ltd.', spend: 24.7 },
    { vendor: 'HCL Technologies', spend: 22.5 },
    { vendor: 'Mahindra & Mahindra', spend: 19.8 },
    { vendor: 'Adani Enterprises', spend: 17.3 },
    { vendor: 'Tech Mahindra', spend: 15.6 },
    { vendor: 'BHEL', spend: 13.8 }
  ];

  // Risk & Compliance Alerts
  const riskAlerts = {
    policyViolations: 7,
    approvalBypasses: 3,
    budgetExceeded: 2,
    contractExpirations: 5
  };

  // Commitments Table
  const commitmentsData = [
    { 
      poNumber: 'PO-2024-0245',
      vendor: 'Tata Steel Ltd.',
      amount: 8.5,
      dueDate: '2025-01-15',
      paymentStatus: 'Pending',
      daysUntilDue: 2
    },
    { 
      poNumber: 'PO-2024-0238',
      vendor: 'Reliance Industries',
      amount: 12.3,
      dueDate: '2025-01-18',
      paymentStatus: 'Approved',
      daysUntilDue: 5
    },
    { 
      poNumber: 'PO-2024-0229',
      vendor: 'Larsen & Toubro',
      amount: 6.8,
      dueDate: '2025-01-10',
      paymentStatus: 'Overdue',
      daysUntilDue: -3
    },
    { 
      poNumber: 'PO-2024-0251',
      vendor: 'Infosys Technologies',
      amount: 4.2,
      dueDate: '2025-01-22',
      paymentStatus: 'Pending',
      daysUntilDue: 9
    },
    { 
      poNumber: 'PO-2024-0242',
      vendor: 'Wipro Ltd.',
      amount: 9.6,
      dueDate: '2025-01-25',
      paymentStatus: 'Approved',
      daysUntilDue: 12
    },
    { 
      poNumber: 'PO-2024-0235',
      vendor: 'HCL Technologies',
      amount: 5.4,
      dueDate: '2025-01-12',
      paymentStatus: 'Overdue',
      daysUntilDue: -1
    },
    { 
      poNumber: 'PO-2024-0248',
      vendor: 'Mahindra & Mahindra',
      amount: 7.8,
      dueDate: '2025-01-20',
      paymentStatus: 'Pending',
      daysUntilDue: 7
    },
    { 
      poNumber: 'PO-2024-0256',
      vendor: 'Adani Enterprises',
      amount: 11.2,
      dueDate: '2025-01-28',
      paymentStatus: 'Approved',
      daysUntilDue: 15
    }
  ];

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return { bg: 'var(--color-teal-tint)', text: 'var(--color-teal)' };
      case 'Pending': return { bg: '#FFF9E6', text: '#F59E0B' };
      case 'Overdue': return { bg: '#FFE8EA', text: '#EF4444' };
      default: return { bg: 'var(--color-cloud)', text: 'var(--color-mercury-grey)' };
    }
  };

  const formatCurrency = (value: number) => {
    return `₹${value.toFixed(1)} Cr`;
  };

  const KPICard = ({ title, value, unit, trend, icon: Icon, isWarning, subtitle }: any) => {
    const isPositive = trend > 0;
    const showTrend = trend !== undefined;

    return (
      <div className="bg-white rounded-lg p-5" style={{ border: '1px solid var(--color-silver)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>{title}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl" style={{ color: isWarning ? '#EF4444' : 'var(--color-ink)' }}>
                {typeof value === 'number' && unit !== '%' ? formatCurrency(value) : `${value}${unit}`}
              </span>
            </div>
            {subtitle && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>{subtitle}</p>
            )}
          </div>
          {Icon && (
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: isWarning ? '#FFE8EA' : 'var(--color-cloud)' }}
            >
              <Icon className="w-5 h-5" style={{ color: isWarning ? '#EF4444' : 'var(--color-teal)' }} />
            </div>
          )}
        </div>
        
        {showTrend && (
          <div className="flex items-center gap-1 text-xs">
            {isPositive ? (
              <TrendingUp className="w-3 h-3" style={{ color: title.includes('Variance') && value < 0 ? '#10B981' : (isWarning || title.includes('Outflow')) ? '#EF4444' : '#10B981' }} />
            ) : (
              <TrendingDown className="w-3 h-3" style={{ color: title.includes('Variance') || title.includes('Commitments') ? '#10B981' : '#EF4444' }} />
            )}
            <span style={{ color: 'var(--color-mercury-grey)' }}>
              {Math.abs(trend)}% vs last period
            </span>
          </div>
        )}
      </div>
    );
  };

  const AlertCard = ({ title, count, icon: Icon, color, description }: any) => {
    return (
      <div className="bg-white rounded-lg p-5" style={{ border: `1px solid ${color}30`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="flex items-start gap-4">
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl" style={{ color }}>{count}</span>
              <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>{title}</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>{description}</p>
          </div>
        </div>
      </div>
    );
  };

  const handleExport = () => {
    console.log('Exporting CFO Desk data...');
  };

  return (
    <div className="p-8" style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/reports')} 
            className="p-2 rounded-lg transition-colors hover:bg-white" 
            style={{ color: 'var(--color-mercury-grey)' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl mb-1" style={{ color: 'var(--color-ink)' }}>CFO Desk</h1>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Financial Control & Risk Governance • FY 2024-25 • Last updated: {new Date().toLocaleString('en-IN')}</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
          style={{ backgroundColor: 'var(--color-teal)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
        >
          <Download className="w-4 h-4" />
          Export Financial Report
        </button>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <KPICard 
          title="Total Spend YTD" 
          value={kpiData.totalSpendYTD.value} 
          unit={kpiData.totalSpendYTD.unit}
          trend={kpiData.totalSpendYTD.trend}
          icon={DollarSign}
          subtitle={`Budget: ${formatCurrency(kpiData.totalSpendYTD.budget)}`}
        />
        <KPICard 
          title="Budget vs Actual Variance" 
          value={kpiData.budgetVariance.value} 
          unit={kpiData.budgetVariance.unit}
          trend={Math.abs(kpiData.budgetVariance.value)}
          icon={kpiData.budgetVariance.value < 0 ? CheckCircle : AlertTriangle}
          isWarning={kpiData.budgetVariance.value > 0}
          subtitle="Under budget"
        />
        <KPICard 
          title="Open PO Commitments" 
          value={kpiData.openPOCommitments.value} 
          unit={kpiData.openPOCommitments.unit}
          trend={kpiData.openPOCommitments.trend}
          icon={Clock}
          subtitle="Awaiting fulfillment"
        />
        <KPICard 
          title="Forecasted Cash Outflow" 
          value={kpiData.forecastedCashOutflow.value} 
          unit={kpiData.forecastedCashOutflow.unit}
          trend={kpiData.forecastedCashOutflow.trend}
          icon={TrendingUp}
          subtitle={`Next ${kpiData.forecastedCashOutflow.period}`}
        />
        <KPICard 
          title="Compliance Score" 
          value={kpiData.complianceScore.value} 
          unit={kpiData.complianceScore.unit}
          trend={kpiData.complianceScore.trend}
          icon={kpiData.complianceScore.value >= kpiData.complianceScore.target ? CheckCircle : AlertTriangle}
          isWarning={kpiData.complianceScore.value < kpiData.complianceScore.target}
          subtitle={`Target: ${kpiData.complianceScore.target}%`}
        />
      </div>

      {/* Spend Analytics Section */}
      <div className="mb-6">
        <h2 className="text-lg mb-4" style={{ color: 'var(--color-ink)' }}>Spend Analytics</h2>
        
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Budget vs Actual vs Committed by Department */}
          <div className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 className="text-sm mb-4" style={{ color: 'var(--color-ink)' }}>Budget vs Actual vs Committed Spend by Department</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentSpendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver)" />
                <XAxis dataKey="department" stroke="var(--color-mercury-grey)" style={{ fontSize: '12px' }} />
                <YAxis stroke="var(--color-mercury-grey)" style={{ fontSize: '12px' }} label={{ value: '₹ Crore', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: 'var(--color-mercury-grey)' } }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', border: '1px solid var(--color-silver)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value) => `₹${value} Cr`}
                />
                <Legend 
                  formatter={(value) => {
                    const labels: any = { budget: 'Budget', actual: 'Actual Spend', committed: 'Committed' };
                    return <span style={{ color: 'var(--color-ink)', fontSize: '12px' }}>{labels[value]}</span>;
                  }}
                />
                <Bar dataKey="budget" stackId="a" fill="#94A3B8" radius={[0, 0, 0, 0]} />
                <Bar dataKey="actual" stackId="a" fill="var(--color-teal)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="committed" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Spend Trend */}
          <div className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 className="text-sm mb-4" style={{ color: 'var(--color-ink)' }}>Monthly Spend Trend (FY 2024-25)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlySpendTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver)" />
                <XAxis dataKey="month" stroke="var(--color-mercury-grey)" style={{ fontSize: '12px' }} />
                <YAxis stroke="var(--color-mercury-grey)" style={{ fontSize: '12px' }} label={{ value: '₹ Crore', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: 'var(--color-mercury-grey)' } }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', border: '1px solid var(--color-silver)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value) => `₹${value} Cr`}
                />
                <Legend 
                  formatter={(value) => {
                    const labels: any = { spend: 'Actual Spend', budget: 'Budget' };
                    return <span style={{ color: 'var(--color-ink)', fontSize: '12px' }}>{labels[value]}</span>;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="budget" 
                  stroke="#94A3B8" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="spend" 
                  stroke="var(--color-teal)" 
                  strokeWidth={3}
                  dot={{ fill: 'var(--color-teal)', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Cash Outflow Forecast */}
          <div className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 className="text-sm mb-4" style={{ color: 'var(--color-ink)' }}>Cash Outflow Forecast from Open POs</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={cashOutflowForecast}>
                <defs>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-teal)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-teal)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCommitted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver)" />
                <XAxis dataKey="month" stroke="var(--color-mercury-grey)" style={{ fontSize: '12px' }} />
                <YAxis stroke="var(--color-mercury-grey)" style={{ fontSize: '12px' }} label={{ value: '₹ Crore', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: 'var(--color-mercury-grey)' } }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', border: '1px solid var(--color-silver)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value) => `₹${value} Cr`}
                />
                <Legend 
                  formatter={(value) => {
                    const labels: any = { forecast: 'Forecasted Outflow', committed: 'Committed Outflow' };
                    return <span style={{ color: 'var(--color-ink)', fontSize: '12px' }}>{labels[value]}</span>;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="forecast" 
                  stroke="var(--color-teal)" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorForecast)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="committed" 
                  stroke="#F59E0B" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCommitted)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Top 10 Vendors by Spend */}
          <div className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 className="text-sm mb-4" style={{ color: 'var(--color-ink)' }}>Top 10 Vendors by Spend (YTD)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topVendorsBySpend} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver)" />
                <XAxis type="number" stroke="var(--color-mercury-grey)" style={{ fontSize: '12px' }} />
                <YAxis dataKey="vendor" type="category" width={130} stroke="var(--color-mercury-grey)" style={{ fontSize: '11px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', border: '1px solid var(--color-silver)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value) => `₹${value} Cr`}
                />
                <Bar dataKey="spend" fill="var(--color-teal)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Risk & Compliance Section */}
      <div className="mb-6">
        <h2 className="text-lg mb-4" style={{ color: 'var(--color-ink)' }}>Risk & Compliance</h2>
        
        <div className="grid grid-cols-4 gap-4 mb-6">
          <AlertCard 
            title="Policy Violations"
            count={riskAlerts.policyViolations}
            icon={AlertTriangle}
            color="#EF4444"
            description="Requires immediate review"
          />
          <AlertCard 
            title="Approval Bypasses"
            count={riskAlerts.approvalBypasses}
            icon={XCircle}
            color="#F59E0B"
            description="Escalated to audit"
          />
          <AlertCard 
            title="Budget Exceeded"
            count={riskAlerts.budgetExceeded}
            icon={DollarSign}
            color="#EF4444"
            description="Departments over budget"
          />
          <AlertCard 
            title="Contract Expirations"
            count={riskAlerts.contractExpirations}
            icon={Clock}
            color="#F59E0B"
            description="Expiring in 30 days"
          />
        </div>
      </div>

      {/* Commitments Table */}
      <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-silver)' }}>
          <h3 className="text-sm" style={{ color: 'var(--color-ink)' }}>Open PO Commitments & Payment Schedule</h3>
          <p className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>Upcoming payments requiring cash flow management • Total: {formatCurrency(commitmentsData.reduce((sum, item) => sum + item.amount, 0))}</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)' }}>PO Number</th>
                <th className="px-6 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Vendor</th>
                <th className="px-6 py-3 text-right text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Amount</th>
                <th className="px-6 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Due Date</th>
                <th className="px-6 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Days Until Due</th>
                <th className="px-6 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Payment Status</th>
              </tr>
            </thead>
            <tbody>
              {commitmentsData
                .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
                .map((item, index) => {
                  const statusColors = getPaymentStatusColor(item.paymentStatus);
                  const isUrgent = item.daysUntilDue <= 3 && item.daysUntilDue >= 0;
                  const isOverdue = item.daysUntilDue < 0;
                  
                  return (
                    <tr key={index} style={{ borderTop: '1px solid var(--color-silver)' }}>
                      <td className="px-6 py-4">
                        <span className="text-sm" style={{ color: 'var(--color-teal)' }}>{item.poNumber}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{item.vendor}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{formatCurrency(item.amount)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm" style={{ color: 'var(--color-ink)' }}>
                          {new Date(item.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span 
                          className="text-sm px-2 py-1 rounded"
                          style={{ 
                            backgroundColor: isOverdue ? '#FFE8EA' : isUrgent ? '#FFF9E6' : 'var(--color-cloud)',
                            color: isOverdue ? '#EF4444' : isUrgent ? '#F59E0B' : 'var(--color-mercury-grey)'
                          }}
                        >
                          {isOverdue ? `${Math.abs(item.daysUntilDue)} days overdue` : `${item.daysUntilDue} days`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span 
                          className="px-3 py-1 rounded-full text-xs"
                          style={{ 
                            backgroundColor: statusColors.bg,
                            color: statusColors.text
                          }}
                        >
                          {item.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}