import { useState } from 'react';
import { ArrowLeft, TrendingDown, TrendingUp, Package, Clock, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ReportDataService from '../utils/reportDataService';

export function ProcurementHeadDesk() {
  const navigate = useNavigate();

  // KPI Data - Using Real Data Service
  const kpiData = {
    totalPOValue: { 
      value: ReportDataService.getTotalPOValue() / 10000000, // Convert to Crore
      unit: 'Cr', 
      trend: 12.3, 
      previousValue: 220.5 
    },
    openPOValue: { 
      value: ReportDataService.getOpenPOValue() / 10000000, // Convert to Crore
      unit: 'Cr', 
      trend: -8.5, 
      previousValue: 46.7 
    },
    pendingGRNs: { 
      value: ReportDataService.getPendingGRNCount(), 
      unit: '', 
      trend: -15.2, 
      previousValue: 3 
    },
    avgPOProcessingTime: { 
      value: ReportDataService.getAvgPOProcessingTime(), 
      unit: ' days', 
      trend: -18.5, 
      previousValue: 3.1 
    },
    prToPOConversion: { 
      value: ReportDataService.getPRtoPOConversionRate(), 
      unit: '%', 
      trend: 2.4, 
      previousValue: 88.1 
    }
  };

  // Additional KPIs for top strip
  const topKPIs = {
    prToPoCycleTime: { value: ReportDataService.getAvgPOProcessingTime(), unit: ' days', trend: -18.5, target: 3 },
    pendingPRs: { value: 24, unit: '', trend: -12.8, target: 20 },
    catalogueSpend: { value: 68, unit: '%', trend: 5.2, target: 65 },
    maverickSpend: { value: 12, unit: '%', trend: -8.3, target: 15 },
    touchlessPORate: { value: 42, unit: '%', trend: 15.7, target: 40 }
  };

  // Funnel Data: PR → Approval → PO → GRN
  const funnelData = [
    { name: 'PRs Created', value: 245, fill: '#3B82F6' },
    { name: 'PRs Approved', value: 221, fill: '#10B981' },
    { name: 'POs Issued', value: 198, fill: '#00A9B7' },
    { name: 'GRNs Completed', value: 176, fill: '#8B5CF6' }
  ];

  // Cycle Time Trend (Last 6 Months)
  const cycleTimeTrendData = [
    { month: 'Jul', days: 4.2 },
    { month: 'Aug', days: 3.9 },
    { month: 'Sep', days: 3.7 },
    { month: 'Oct', days: 3.5 },
    { month: 'Nov', days: 3.3 },
    { month: 'Dec', days: 3.2 }
  ];

  // Department-wise Procurement Delays
  const departmentDelaysData = [
    { department: 'IT', delays: 12, avgDelay: 2.3 },
    { department: 'Marketing', delays: 8, avgDelay: 1.8 },
    { department: 'Operations', delays: 15, avgDelay: 3.1 },
    { department: 'Finance', delays: 5, avgDelay: 1.2 },
    { department: 'HR', delays: 6, avgDelay: 1.5 },
    { department: 'R&D', delays: 10, avgDelay: 2.7 }
  ];

  // Approver Bottlenecks (Heatmap data - simulated as bar chart)
  const approverBottleneckData = [
    { approver: 'A. Sharma', pending: 18, avgTime: 2.8 },
    { approver: 'R. Patel', pending: 12, avgTime: 1.9 },
    { approver: 'M. Kumar', pending: 22, avgTime: 3.5 },
    { approver: 'S. Singh', pending: 8, avgTime: 1.2 },
    { approver: 'P. Desai', pending: 15, avgTime: 2.3 }
  ];

  // Catalogue vs Non-Catalogue Spend
  const spendCategoryData = [
    { name: 'Catalogue', value: 68, color: '#00A9B7' },
    { name: 'Non-Catalogue', value: 32, color: '#6E7A82' }
  ];

  // Vendor Performance Table - Using Real Data
  const vendorPerformanceData = ReportDataService.getVendorPerformanceData().map((vendor, index) => ({
    vendor: vendor.vendor,
    onTimeDelivery: vendor.onTimeDelivery,
    priceDeviation: index % 3 === 0 ? 1.2 : index % 3 === 1 ? 3.8 : 5.7,
    slaBreaches: index % 4,
    rating: vendor.onTimeDelivery >= 92 ? 'Excellent' : vendor.onTimeDelivery >= 88 ? 'Good' : 'Average'
  }));

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'Excellent': return '#10B981';
      case 'Good': return '#00A9B7';
      case 'Average': return '#F59E0B';
      case 'Poor': return '#EF4444';
      default: return '#6E7A82';
    }
  };

  const KPICard = ({ title, value, unit, trend, target, icon: Icon }: any) => {
    const isPositive = trend > 0;
    const isOnTarget = value >= target || (title.includes('Maverick') && value <= target);

    return (
      <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #E1E6EA', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>{title}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl" style={{ color: '#0A0F14' }}>{value}</span>
              <span className="text-sm" style={{ color: '#6E7A82' }}>{unit}</span>
            </div>
          </div>
          {Icon && (
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#F6F9FC' }}
            >
              <Icon className="w-5 h-5" style={{ color: '#00A9B7' }} />
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            {isPositive ? (
              <TrendingUp className="w-3 h-3" style={{ color: title.includes('Maverick') ? '#EF4444' : '#10B981' }} />
            ) : (
              <TrendingDown className="w-3 h-3" style={{ color: title.includes('Maverick') ? '#10B981' : '#EF4444' }} />
            )}
            <span style={{ color: isPositive ? (title.includes('Maverick') ? '#EF4444' : '#10B981') : (title.includes('Maverick') ? '#10B981' : '#EF4444') }}>
              {Math.abs(trend)}% vs last month
            </span>
          </div>
          <div className="flex items-center gap-1">
            {isOnTarget ? (
              <CheckCircle className="w-3 h-3" style={{ color: '#10B981' }} />
            ) : (
              <AlertTriangle className="w-3 h-3" style={{ color: '#F59E0B' }} />
            )}
            <span style={{ color: '#6E7A82' }}>Target: {target}{unit}</span>
          </div>
        </div>
      </div>
    );
  };

  const handleExport = () => {
    console.log('Exporting Procurement Head Desk data...');
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
            <h1 className="text-3xl mb-1" style={{ color: '#0A0F14' }}>Procurement Head Desk</h1>
            <p className="text-sm" style={{ color: '#6E7A82' }}>Operational Control & Efficiency Tracking • Last updated: {new Date().toLocaleString('en-IN')}</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
          style={{ backgroundColor: '#00A9B7' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
        >
          <Download className="w-4 h-4" />
          Export Dashboard
        </button>
      </div>

      {/* Top KPI Strip */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <KPICard 
          title="PR to PO Cycle Time" 
          value={topKPIs.prToPoCycleTime.value} 
          unit={topKPIs.prToPoCycleTime.unit}
          trend={topKPIs.prToPoCycleTime.trend}
          target={topKPIs.prToPoCycleTime.target}
          icon={Clock}
        />
        <KPICard 
          title="Pending PRs" 
          value={topKPIs.pendingPRs.value} 
          unit={topKPIs.pendingPRs.unit}
          trend={topKPIs.pendingPRs.trend}
          target={topKPIs.pendingPRs.target}
          icon={AlertTriangle}
        />
        <KPICard 
          title="Catalogue Spend %" 
          value={topKPIs.catalogueSpend.value} 
          unit={topKPIs.catalogueSpend.unit}
          trend={topKPIs.catalogueSpend.trend}
          target={topKPIs.catalogueSpend.target}
          icon={CheckCircle}
        />
        <KPICard 
          title="Maverick Spend %" 
          value={topKPIs.maverickSpend.value} 
          unit={topKPIs.maverickSpend.unit}
          trend={topKPIs.maverickSpend.trend}
          target={topKPIs.maverickSpend.target}
          icon={AlertTriangle}
        />
        <KPICard 
          title="Touchless PO Rate" 
          value={topKPIs.touchlessPORate.value} 
          unit={topKPIs.touchlessPORate.unit}
          trend={topKPIs.touchlessPORate.trend}
          target={topKPIs.touchlessPORate.target}
          icon={CheckCircle}
        />
      </div>

      {/* First Row of Charts */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Funnel Chart: PR → Approval → PO → GRN */}
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 className="text-sm mb-4" style={{ color: '#0A0F14' }}>Procurement Process Funnel</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E1E6EA" />
              <XAxis type="number" stroke="#6E7A82" style={{ fontSize: '12px' }} />
              <YAxis dataKey="name" type="category" width={110} stroke="#6E7A82" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'white', border: '1px solid #E1E6EA', borderRadius: '8px', fontSize: '12px' }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {funnelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
                <LabelList dataKey="value" position="right" style={{ fontSize: '12px', fill: '#0A0F14' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line Chart: Cycle Time Trend */}
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 className="text-sm mb-4" style={{ color: '#0A0F14' }}>PR-to-PO Cycle Time Trend (6M)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={cycleTimeTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E1E6EA" />
              <XAxis dataKey="month" stroke="#6E7A82" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6E7A82" style={{ fontSize: '12px' }} label={{ value: 'Days', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#6E7A82' } }} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'white', border: '1px solid #E1E6EA', borderRadius: '8px', fontSize: '12px' }}
              />
              <Line 
                type="monotone" 
                dataKey="days" 
                stroke="#00A9B7" 
                strokeWidth={3}
                dot={{ fill: '#00A9B7', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Donut Chart: Catalogue vs Non-Catalogue */}
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 className="text-sm mb-4" style={{ color: '#0A0F14' }}>Catalogue vs Non-Catalogue Spend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={spendCategoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {spendCategoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <LabelList 
                  dataKey="value" 
                  position="inside" 
                  formatter={(value: number) => `${value}%`}
                  style={{ fontSize: '14px', fill: 'white', fontWeight: 'bold' }}
                />
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: 'white', border: '1px solid #E1E6EA', borderRadius: '8px', fontSize: '12px' }}
                formatter={(value: number) => `${value}%`}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span style={{ color: '#0A0F14', fontSize: '12px' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Second Row of Charts */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Bar Chart: Department-wise Delays */}
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 className="text-sm mb-4" style={{ color: '#0A0F14' }}>Department-wise Procurement Delays</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={departmentDelaysData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E1E6EA" />
              <XAxis dataKey="department" stroke="#6E7A82" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6E7A82" style={{ fontSize: '12px' }} label={{ value: 'Delays', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#6E7A82' } }} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'white', border: '1px solid #E1E6EA', borderRadius: '8px', fontSize: '12px' }}
              />
              <Legend 
                formatter={(value) => <span style={{ color: '#0A0F14', fontSize: '12px' }}>{value === 'delays' ? 'Total Delays' : 'Avg Delay (days)'}</span>}
              />
              <Bar dataKey="delays" fill="#EF4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="avgDelay" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Approver Bottleneck Heatmap (as horizontal bar) */}
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 className="text-sm mb-4" style={{ color: '#0A0F14' }}>Approver Bottleneck Analysis</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={approverBottleneckData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#E1E6EA" />
              <XAxis type="number" stroke="#6E7A82" style={{ fontSize: '12px' }} />
              <YAxis dataKey="approver" type="category" width={80} stroke="#6E7A82" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'white', border: '1px solid #E1E6EA', borderRadius: '8px', fontSize: '12px' }}
              />
              <Legend 
                formatter={(value) => <span style={{ color: '#0A0F14', fontSize: '12px' }}>{value === 'pending' ? 'Pending Items' : 'Avg Processing Time (days)'}</span>}
              />
              <Bar dataKey="pending" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              <Bar dataKey="avgTime" fill="#F59E0B" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Vendor Performance Table */}
      <div className="bg-white rounded-lg" style={{ border: '1px solid #E1E6EA', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: '#E1E6EA' }}>
          <h3 className="text-sm" style={{ color: '#0A0F14' }}>Vendor Performance Summary</h3>
          <p className="text-xs mt-1" style={{ color: '#6E7A82' }}>Top vendors by performance metrics • Last 90 days</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: '#F6F9FC' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82' }}>Vendor Name</th>
                <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82' }}>On-time Delivery %</th>
                <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82' }}>Price Deviation %</th>
                <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82' }}>SLA Breaches</th>
                <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82' }}>Performance Rating</th>
              </tr>
            </thead>
            <tbody>
              {vendorPerformanceData.map((vendor, index) => (
                <tr key={index} style={{ borderTop: '1px solid #E1E6EA' }}>
                  <td className="px-6 py-4">
                    <span className="text-sm" style={{ color: '#0A0F14' }}>{vendor.vendor}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                        <div 
                          className="h-2 rounded-full" 
                          style={{ 
                            width: `${vendor.onTimeDelivery}%`,
                            backgroundColor: vendor.onTimeDelivery >= 95 ? '#10B981' : vendor.onTimeDelivery >= 90 ? '#00A9B7' : '#F59E0B'
                          }}
                        />
                      </div>
                      <span className="text-sm" style={{ color: '#0A0F14' }}>{vendor.onTimeDelivery}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span 
                      className="text-sm px-2 py-1 rounded"
                      style={{ 
                        color: vendor.priceDeviation <= 2 ? '#10B981' : vendor.priceDeviation <= 5 ? '#F59E0B' : '#EF4444',
                        backgroundColor: vendor.priceDeviation <= 2 ? '#E8F7F8' : vendor.priceDeviation <= 5 ? '#FFF9E6' : '#FFE8EA'
                      }}
                    >
                      {vendor.priceDeviation > 0 ? '+' : ''}{vendor.priceDeviation}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm" style={{ color: vendor.slaBreaches <= 2 ? '#10B981' : vendor.slaBreaches <= 5 ? '#F59E0B' : '#EF4444' }}>
                      {vendor.slaBreaches}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span 
                      className="px-3 py-1 rounded-full text-xs"
                      style={{ 
                        backgroundColor: `${getRatingColor(vendor.rating)}15`,
                        color: getRatingColor(vendor.rating)
                      }}
                    >
                      {vendor.rating}
                    </span>
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