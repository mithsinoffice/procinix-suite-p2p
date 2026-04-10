import { useState } from 'react';
import { ArrowLeft, TrendingDown, TrendingUp, DollarSign, Target, Clock, Shield, Zap, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ReportDataService from '../utils/reportDataService';

export function ManagementDesk() {
  const navigate = useNavigate();

  // Executive KPI Data - Using Real Data Service
  const totalSpend = ReportDataService.getTotalSpendYTD();
  const complianceScore = ReportDataService.getComplianceScore();

  const executiveKPIs = {
    totalSpendYTD: { 
      value: totalSpend, 
      unit: 'Cr', 
      trend: 12.3, 
      trendLabel: 'vs last year',
      status: 'on-track'
    },
    savingsAchieved: { 
      value: 18.7, 
      unit: 'Cr', 
      trend: 24.5, 
      trendLabel: 'vs target',
      status: 'exceeding'
    },
    cycleTimeImprovement: { 
      value: 32, 
      unit: '%', 
      trend: 8.2, 
      trendLabel: 'vs last quarter',
      status: 'on-track'
    },
    complianceScore: { 
      value: complianceScore, 
      unit: '%', 
      trend: 2.1, 
      trendLabel: 'vs last quarter',
      status: 'on-track'
    },
    automationIndex: { 
      value: 68, 
      unit: '%', 
      trend: 15.3, 
      trendLabel: 'vs last year',
      status: 'on-track'
    }
  };

  // Strategic vs Non-Strategic Vendor Spend - Using Real Data
  const vendorSpendCategoryData = ReportDataService.getStrategicVendorSplit();

  // Savings Trend Over Time (12 months)
  const savingsTrendData = [
    { month: 'Jan', savings: 1.2, target: 1.3 },
    { month: 'Feb', savings: 1.4, target: 1.3 },
    { month: 'Mar', savings: 1.6, target: 1.4 },
    { month: 'Apr', savings: 1.5, target: 1.4 },
    { month: 'May', savings: 1.7, target: 1.5 },
    { month: 'Jun', savings: 1.8, target: 1.5 },
    { month: 'Jul', savings: 1.6, target: 1.6 },
    { month: 'Aug', savings: 1.9, target: 1.6 },
    { month: 'Sep', savings: 2.1, target: 1.7 },
    { month: 'Oct', savings: 2.0, target: 1.7 },
    { month: 'Nov', savings: 2.3, target: 1.8 },
    { month: 'Dec', savings: 2.4, target: 1.8 }
  ];

  // Procurement Maturity Radar
  const procurementMaturityData = [
    { subject: 'Efficiency', score: 85, fullMark: 100 },
    { subject: 'Compliance', score: 94, fullMark: 100 },
    { subject: 'Automation', score: 68, fullMark: 100 },
    { subject: 'Risk Mgmt', score: 78, fullMark: 100 },
    { subject: 'Scalability', score: 72, fullMark: 100 }
  ];

  // Risk Indicators
  const riskIndicators = {
    vendorConcentration: {
      level: 'Medium',
      value: 42,
      description: 'Top 3 vendors represent 42% of total spend',
      status: 'warning'
    },
    singleSourceDependency: {
      level: 'Low',
      value: 8,
      description: '8 critical items from single-source vendors',
      status: 'success'
    },
    contractRenewal: {
      level: 'High',
      value: 12,
      description: '12 strategic contracts expiring in 90 days',
      status: 'critical'
    },
    priceVolatility: {
      level: 'Medium',
      value: 18,
      description: '18% price variance in commodity categories',
      status: 'warning'
    }
  };

  const formatCurrency = (value: number) => {
    return `₹${value.toFixed(1)} Cr`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'exceeding': return '#10B981';
      case 'on-track': return '#00A9B7';
      case 'warning': return '#F59E0B';
      case 'critical': return '#EF4444';
      case 'success': return '#10B981';
      default: return '#6E7A82';
    }
  };

  const ExecutiveKPICard = ({ title, value, unit, trend, trendLabel, status, icon: Icon }: any) => {
    const statusColor = getStatusColor(status);
    const isPositive = trend > 0;

    return (
      <div className="bg-white rounded-xl p-8" style={{ border: '2px solid #E1E6EA', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <p className="text-sm mb-3" style={{ color: '#6E7A82', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{title}</p>
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-4xl" style={{ color: '#0A0F14', fontWeight: '700' }}>
                {unit === 'Cr' ? formatCurrency(value) : value}
              </span>
              {unit !== 'Cr' && <span className="text-xl" style={{ color: '#6E7A82' }}>{unit}</span>}
            </div>
          </div>
          <div 
            className="w-16 h-16 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${statusColor}15` }}
          >
            <Icon className="w-8 h-8" style={{ color: statusColor }} />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div 
            className="flex items-center gap-1 px-3 py-1.5 rounded-full"
            style={{ backgroundColor: `${statusColor}15` }}
          >
            {isPositive ? (
              <TrendingUp className="w-4 h-4" style={{ color: statusColor }} />
            ) : (
              <TrendingDown className="w-4 h-4" style={{ color: statusColor }} />
            )}
            <span className="text-sm" style={{ color: statusColor, fontWeight: '600' }}>
              {isPositive ? '+' : ''}{trend}%
            </span>
          </div>
          <span className="text-sm" style={{ color: '#6E7A82' }}>{trendLabel}</span>
        </div>
      </div>
    );
  };

  const RiskIndicatorCard = ({ title, level, value, description, status }: any) => {
    const statusColor = getStatusColor(status);
    const StatusIcon = status === 'critical' ? AlertTriangle : status === 'warning' ? AlertTriangle : CheckCircle;

    return (
      <div 
        className="bg-white rounded-lg p-6" 
        style={{ 
          border: `2px solid ${statusColor}30`, 
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          borderLeft: `4px solid ${statusColor}`
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <StatusIcon className="w-5 h-5" style={{ color: statusColor }} />
              <span className="text-xs" style={{ color: statusColor, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {level} Risk
              </span>
            </div>
            <h4 className="text-sm mb-2" style={{ color: '#0A0F14', fontWeight: '600' }}>{title}</h4>
          </div>
          <span className="text-2xl" style={{ color: statusColor, fontWeight: '700' }}>{value}{typeof value === 'number' && value < 100 ? '%' : ''}</span>
        </div>
        <p className="text-xs" style={{ color: '#6E7A82', lineHeight: '1.5' }}>{description}</p>
      </div>
    );
  };

  const handleExport = () => {
    console.log('Exporting Management Desk data...');
  };

  return (
    <div className="p-8" style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/reports')} 
            className="p-2 rounded-lg transition-colors hover:bg-white" 
            style={{ color: '#6E7A82' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-4xl mb-2" style={{ color: '#0A0F14', fontWeight: '700' }}>Management Desk</h1>
            <p className="text-sm" style={{ color: '#6E7A82' }}>Executive Procurement Summary • FY 2024-25 • Board-Ready Insights</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-colors"
          style={{ backgroundColor: '#00A9B7', fontWeight: '600' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
        >
          <Download className="w-5 h-5" />
          Export Executive Summary
        </button>
      </div>

      {/* Executive KPI Row */}
      <div className="grid grid-cols-5 gap-6 mb-8">
        <ExecutiveKPICard 
          title="Total Spend YTD" 
          value={executiveKPIs.totalSpendYTD.value} 
          unit={executiveKPIs.totalSpendYTD.unit}
          trend={executiveKPIs.totalSpendYTD.trend}
          trendLabel={executiveKPIs.totalSpendYTD.trendLabel}
          status={executiveKPIs.totalSpendYTD.status}
          icon={DollarSign}
        />
        <ExecutiveKPICard 
          title="Savings Achieved" 
          value={executiveKPIs.savingsAchieved.value} 
          unit={executiveKPIs.savingsAchieved.unit}
          trend={executiveKPIs.savingsAchieved.trend}
          trendLabel={executiveKPIs.savingsAchieved.trendLabel}
          status={executiveKPIs.savingsAchieved.status}
          icon={Target}
        />
        <ExecutiveKPICard 
          title="Cycle Time Improvement" 
          value={executiveKPIs.cycleTimeImprovement.value} 
          unit={executiveKPIs.cycleTimeImprovement.unit}
          trend={executiveKPIs.cycleTimeImprovement.trend}
          trendLabel={executiveKPIs.cycleTimeImprovement.trendLabel}
          status={executiveKPIs.cycleTimeImprovement.status}
          icon={Clock}
        />
        <ExecutiveKPICard 
          title="Compliance Score" 
          value={executiveKPIs.complianceScore.value} 
          unit={executiveKPIs.complianceScore.unit}
          trend={executiveKPIs.complianceScore.trend}
          trendLabel={executiveKPIs.complianceScore.trendLabel}
          status={executiveKPIs.complianceScore.status}
          icon={Shield}
        />
        <ExecutiveKPICard 
          title="Automation Index" 
          value={executiveKPIs.automationIndex.value} 
          unit={executiveKPIs.automationIndex.unit}
          trend={executiveKPIs.automationIndex.trend}
          trendLabel={executiveKPIs.automationIndex.trendLabel}
          status={executiveKPIs.automationIndex.status}
          icon={Zap}
        />
      </div>

      {/* Strategic Insights Row */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Strategic vs Non-Strategic Vendor Spend */}
        <div className="bg-white rounded-xl p-8" style={{ border: '2px solid #E1E6EA', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 className="text-sm mb-6" style={{ color: '#6E7A82', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Vendor Spend Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={vendorSpendCategoryData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={3}
                dataKey="value"
              >
                {vendorSpendCategoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: 'white', border: '2px solid #E1E6EA', borderRadius: '12px', fontSize: '13px', padding: '12px' }}
                formatter={(value: number) => formatCurrency(value)}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-3">
            {vendorSpendCategoryData.map((entry, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: entry.color }}></div>
                  <span className="text-sm" style={{ color: '#0A0F14' }}>{entry.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>{formatCurrency(entry.value)}</div>
                  <div className="text-xs" style={{ color: '#6E7A82' }}>{entry.percentage}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Savings Trend */}
        <div className="bg-white rounded-xl p-8" style={{ border: '2px solid #E1E6EA', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 className="text-sm mb-6" style={{ color: '#6E7A82', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Savings Trend (FY 2024-25)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={savingsTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E1E6EA" />
              <XAxis dataKey="month" stroke="#6E7A82" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6E7A82" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'white', border: '2px solid #E1E6EA', borderRadius: '12px', fontSize: '13px', padding: '12px' }}
                formatter={(value) => `₹${value} Cr`}
              />
              <Legend 
                wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }}
                formatter={(value) => {
                  const labels: any = { savings: 'Actual Savings', target: 'Target' };
                  return <span style={{ color: '#0A0F14', fontWeight: '500' }}>{labels[value]}</span>;
                }}
              />
              <Line 
                type="monotone" 
                dataKey="target" 
                stroke="#94A3B8" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="savings" 
                stroke="#10B981" 
                strokeWidth={4}
                dot={{ fill: '#10B981', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Procurement Maturity Radar */}
        <div className="bg-white rounded-xl p-8" style={{ border: '2px solid #E1E6EA', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 className="text-sm mb-6" style={{ color: '#6E7A82', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Procurement Maturity Index</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={procurementMaturityData}>
              <PolarGrid stroke="#E1E6EA" />
              <PolarAngleAxis 
                dataKey="subject" 
                stroke="#6E7A82" 
                style={{ fontSize: '12px', fontWeight: '500' }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]} 
                stroke="#6E7A82"
                style={{ fontSize: '11px' }}
              />
              <Radar 
                name="Maturity Score" 
                dataKey="score" 
                stroke="#00A9B7" 
                fill="#00A9B7" 
                fillOpacity={0.3}
                strokeWidth={3}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'white', border: '2px solid #E1E6EA', borderRadius: '12px', fontSize: '13px', padding: '12px' }}
                formatter={(value) => `${value}%`}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Risk & Governance Section */}
      <div className="mb-6">
        <h2 className="text-lg mb-4" style={{ color: '#0A0F14', fontWeight: '600', letterSpacing: '0.3px', textTransform: 'uppercase' }}>Risk & Governance Overview</h2>
        
        <div className="grid grid-cols-4 gap-6">
          <RiskIndicatorCard 
            title="Vendor Concentration"
            level={riskIndicators.vendorConcentration.level}
            value={riskIndicators.vendorConcentration.value}
            description={riskIndicators.vendorConcentration.description}
            status={riskIndicators.vendorConcentration.status}
          />
          <RiskIndicatorCard 
            title="Single-Source Dependency"
            level={riskIndicators.singleSourceDependency.level}
            value={riskIndicators.singleSourceDependency.value}
            description={riskIndicators.singleSourceDependency.description}
            status={riskIndicators.singleSourceDependency.status}
          />
          <RiskIndicatorCard 
            title="Contract Renewal Risk"
            level={riskIndicators.contractRenewal.level}
            value={riskIndicators.contractRenewal.value}
            description={riskIndicators.contractRenewal.description}
            status={riskIndicators.contractRenewal.status}
          />
          <RiskIndicatorCard 
            title="Price Volatility"
            level={riskIndicators.priceVolatility.level}
            value={riskIndicators.priceVolatility.value}
            description={riskIndicators.priceVolatility.description}
            status={riskIndicators.priceVolatility.status}
          />
        </div>
      </div>

      {/* Strategic Highlights Section */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-8" style={{ border: '2px solid #E1E6EA', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
            <h3 className="text-sm" style={{ color: '#6E7A82', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Key Achievements</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#10B981' }} />
              <span className="text-sm" style={{ color: '#0A0F14', lineHeight: '1.6' }}>
                Exceeded annual savings target by 24.5%
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#10B981' }} />
              <span className="text-sm" style={{ color: '#0A0F14', lineHeight: '1.6' }}>
                Reduced procurement cycle time by 32%
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#10B981' }} />
              <span className="text-sm" style={{ color: '#0A0F14', lineHeight: '1.6' }}>
                Achieved 68% automation across processes
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#10B981' }} />
              <span className="text-sm" style={{ color: '#0A0F14', lineHeight: '1.6' }}>
                Maintained 94% compliance score
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-xl p-8" style={{ border: '2px solid #E1E6EA', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F59E0B' }}></div>
            <h3 className="text-sm" style={{ color: '#6E7A82', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Areas of Focus</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#F59E0B' }} />
              <span className="text-sm" style={{ color: '#0A0F14', lineHeight: '1.6' }}>
                Monitor vendor concentration in top 3 suppliers
              </span>
            </li>
            <li className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#F59E0B' }} />
              <span className="text-sm" style={{ color: '#0A0F14', lineHeight: '1.6' }}>
                Address 18% price volatility in commodities
              </span>
            </li>
            <li className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#F59E0B' }} />
              <span className="text-sm" style={{ color: '#0A0F14', lineHeight: '1.6' }}>
                Improve scalability score from 72% to 85%
              </span>
            </li>
            <li className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#F59E0B' }} />
              <span className="text-sm" style={{ color: '#0A0F14', lineHeight: '1.6' }}>
                Expand strategic vendor partnerships
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-xl p-8" style={{ border: '2px solid #E1E6EA', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#00A9B7' }}></div>
            <h3 className="text-sm" style={{ color: '#6E7A82', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Strategic Initiatives</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <Target className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#00A9B7' }} />
              <span className="text-sm" style={{ color: '#0A0F14', lineHeight: '1.6' }}>
                Implement AI-powered demand forecasting
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Target className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#00A9B7' }} />
              <span className="text-sm" style={{ color: '#0A0F14', lineHeight: '1.6' }}>
                Launch vendor sustainability program
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Target className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#00A9B7' }} />
              <span className="text-sm" style={{ color: '#0A0F14', lineHeight: '1.6' }}>
                Expand touchless PO automation to 75%
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Target className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#00A9B7' }} />
              <span className="text-sm" style={{ color: '#0A0F14', lineHeight: '1.6' }}>
                Establish regional procurement centers
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}