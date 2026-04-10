import { useMemo } from 'react';
import { KPICard } from './KPICard';
import { IndianRupee, FileText, AlertTriangle, Clock, Package, Receipt, CreditCard, FileEdit, Layers } from 'lucide-react';
import { useDashboardData } from '../contexts/DashboardDataContext';
import { useMasterData } from '../contexts/MasterDataContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export function DashboardV2() {
  const { metrics, isLoading } = useDashboardData();
  const { currentCompany, getEntityById } = useMasterData();

  // Format currency based on entity or consolidated
  const formatCurrency = (amount: number): string => {
    if (!amount || isNaN(amount)) return '₹0';
    
    const currencySymbols: { [key: string]: string } = {
      'INR': '₹',
      'AED': 'د.إ',
      'USD': '$',
      'EUR': '€',
      'GBP': '£'
    };

    const symbol = currencySymbols[metrics.currency] || '₹';
    const formattedAmount = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);

    return `${symbol}${formattedAmount}`;
  };

  // PO Status Breakdown Chart Data
  const poStatusData = useMemo(() => [
    { name: 'Draft', value: metrics.poStatusBreakdown.draft, color: '#94A3B8' },
    { name: 'Approved', value: metrics.poStatusBreakdown.approved, color: '#00A9B7' },
    { name: 'Partially Received', value: metrics.poStatusBreakdown.partiallyReceived, color: '#D97706' },
    { name: 'Fully Received', value: metrics.poStatusBreakdown.fullyReceived, color: '#10B981' },
    { name: 'Closed', value: metrics.poStatusBreakdown.closed, color: '#6E7A82' }
  ].filter(item => item.value > 0), [metrics.poStatusBreakdown]);

  // PO Volume Trend Chart Data
  const poVolumeTrendData = useMemo(() => {
    return metrics.poVolumeTrend.map(trend => ({
      month: trend.month,
      count: trend.count,
      value: trend.value / 1000 // Convert to thousands
    }));
  }, [metrics.poVolumeTrend]);

  // Invoice Status Breakdown Chart Data
  const invoiceStatusData = useMemo(() => [
    { name: 'Pending Approval', value: metrics.invoiceStatusBreakdown.pendingApproval, color: '#D97706' },
    { name: 'Approved', value: metrics.invoiceStatusBreakdown.approved, color: '#00A9B7' },
    { name: 'Paid', value: metrics.invoiceStatusBreakdown.paid, color: '#10B981' },
    { name: 'Overdue', value: metrics.invoiceStatusBreakdown.overdue, color: '#FF4E5B' }
  ].filter(item => item.value > 0), [metrics.invoiceStatusBreakdown]);

  // Get entity display info
  const entityInfo = useMemo(() => {
    if (!currentCompany) {
      return { name: 'No Entity Selected', isConsolidated: false };
    }

    if (currentCompany.id === 'CONSOLIDATED') {
      return {
        name: 'Consolidated View',
        isConsolidated: true,
        baseCurrency: 'INR'
      };
    }

    const entityDetails = getEntityById(currentCompany.id);
    return {
      name: entityDetails?.legalName || currentCompany.name,
      isConsolidated: false,
      country: entityDetails?.country,
      currency: entityDetails?.currency
    };
  }, [currentCompany, getEntityById]);

  return (
    <div className="p-8">
      {/* Dashboard Header with Entity Info */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl" style={{ color: '#0A0F14' }}>Dashboard</h1>
            <p className="text-sm mt-1" style={{ color: '#6E7A82' }}>
              Procurement & AP Performance Metrics
            </p>
          </div>
          
          {/* Entity Badge */}
          {entityInfo.isConsolidated && (
            <div 
              className="flex items-center gap-2 px-4 py-2 rounded-lg"
              style={{ backgroundColor: '#E8F7F8', border: '1px solid #00A9B7' }}
            >
              <Layers style={{ width: '16px', height: '16px', color: '#00A9B7' }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#00A9B7', margin: 0, lineHeight: '1.2' }}>
                  {entityInfo.name}
                </p>
                <p style={{ fontSize: '11px', color: '#007D87', margin: '2px 0 0 0', lineHeight: '1.2' }}>
                  Base Currency: INR
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#00A9B7' }}></div>
        </div>
      )}

      {/* KPI Cards */}
      {!isLoading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard
              title="Total PO Value (YTD)"
              value={formatCurrency(metrics.totalPOValueYTD)}
              change={`${metrics.poCount} POs created`}
              changeType="neutral"
              icon={IndianRupee}
              iconBg="bg-gray-100"
              iconColor="text-gray-600"
            />
            <KPICard
              title="Open PO Value"
              value={formatCurrency(metrics.openPOValue)}
              subtitle={`${metrics.openPOCount} Open POs`}
              icon={FileText}
              iconBg="bg-gray-100"
              iconColor="text-gray-600"
            />
            <KPICard
              title="Pending GRNs"
              value={`${metrics.pendingGRNs}`}
              change={metrics.pendingGRNs > 5 ? "Requires attention" : "On track"}
              changeType={metrics.pendingGRNs > 5 ? "negative" : "positive"}
              icon={AlertTriangle}
              iconBg="bg-gray-100"
              iconColor="text-gray-600"
            />
            <KPICard
              title="Avg PO Processing Time"
              value={`${metrics.avgPOProcessingTime.toFixed(1)} Days`}
              change={metrics.avgPOProcessingTime < 3 ? "Excellent" : "Good"}
              changeType={metrics.avgPOProcessingTime < 3 ? "positive" : "neutral"}
              icon={Clock}
              iconBg="bg-gray-100"
              iconColor="text-gray-600"
            />
          </div>

          {/* Second Row KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard
              title="Total Invoice Value"
              value={formatCurrency(metrics.totalInvoiceValue)}
              subtitle={`${metrics.invoiceCount} invoices`}
              icon={Receipt}
              iconBg="bg-gray-100"
              iconColor="text-gray-600"
            />
            <KPICard
              title="Pending Approvals"
              value={`${metrics.pendingInvoices}`}
              change="Invoices awaiting approval"
              changeType={metrics.pendingInvoices > 10 ? "negative" : "neutral"}
              icon={FileEdit}
              iconBg="bg-gray-100"
              iconColor="text-gray-600"
            />
            <KPICard
              title="Payments Due"
              value={formatCurrency(metrics.totalPaymentsDue)}
              subtitle={`${metrics.upcomingPayments} invoices`}
              icon={CreditCard}
              iconBg="bg-gray-100"
              iconColor="text-gray-600"
            />
            <KPICard
              title="Vendor Advances"
              value={formatCurrency(metrics.totalAdvances)}
              change={`${metrics.pendingAdvances} pending approval`}
              changeType="neutral"
              icon={Package}
              iconBg="bg-gray-100"
              iconColor="text-gray-600"
            />
          </div>

          {/* Charts Row 1: PO Status & Volume Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* PO Status Breakdown */}
            <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
              <h3 className="text-lg mb-4" style={{ color: '#0A0F14' }}>PO Status Breakdown</h3>
              {poStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={poStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, value}) => `${name}: ${value}`}
                      outerRadius={100}
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
              ) : (
                <div className="flex items-center justify-center h-[300px]" style={{ color: '#6E7A82' }}>
                  No PO data available
                </div>
              )}
            </div>

            {/* PO Volume Trend */}
            <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
              <h3 className="text-lg mb-4" style={{ color: '#0A0F14' }}>PO Volume Trend</h3>
              {poVolumeTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={poVolumeTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E1E6EA" />
                    <XAxis dataKey="month" stroke="#6E7A82" />
                    <YAxis yAxisId="left" orientation="left" stroke="#6E7A82" />
                    <YAxis yAxisId="right" orientation="right" stroke="#6E7A82" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E1E6EA' }}
                      formatter={(value: number, name: string) => {
                        if (name === 'value') return [`${formatCurrency(value * 1000)}`, 'PO Value'];
                        return [value, 'PO Count'];
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="count" fill="#00A9B7" name="PO Count" />
                    <Bar yAxisId="right" dataKey="value" fill="#D97706" name="Value (K)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px]" style={{ color: '#6E7A82' }}>
                  No trend data available
                </div>
              )}
            </div>
          </div>

          {/* Charts Row 2: Invoice Status & Summary Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Invoice Status Breakdown */}
            <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
              <h3 className="text-lg mb-4" style={{ color: '#0A0F14' }}>Invoice Status Breakdown</h3>
              {invoiceStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={invoiceStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, value}) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {invoiceStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px]" style={{ color: '#6E7A82' }}>
                  No invoice data available
                </div>
              )}
            </div>

            {/* Summary Statistics */}
            <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
              <h3 className="text-lg mb-4" style={{ color: '#0A0F14' }}>Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
                  <div>
                    <p className="text-sm" style={{ color: '#6E7A82', margin: 0 }}>Total GRNs</p>
                    <p className="text-xl" style={{ color: '#0A0F14', margin: '4px 0 0 0' }}>{metrics.grnCount}</p>
                  </div>
                  <Package style={{ width: '32px', height: '32px', color: '#00A9B7' }} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#FFF9E6' }}>
                  <div>
                    <p className="text-sm" style={{ color: '#6E7A82', margin: 0 }}>Overdue Invoices</p>
                    <p className="text-xl" style={{ color: '#D97706', margin: '4px 0 0 0' }}>{metrics.overdueInvoices}</p>
                  </div>
                  <AlertTriangle style={{ width: '32px', height: '32px', color: '#D97706' }} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
                  <div>
                    <p className="text-sm" style={{ color: '#6E7A82', margin: 0 }}>Debit Notes</p>
                    <p className="text-xl" style={{ color: '#FF4E5B', margin: '4px 0 0 0' }}>{formatCurrency(metrics.totalDebitNotes)}</p>
                  </div>
                  <FileEdit style={{ width: '32px', height: '32px', color: '#FF4E5B' }} />
                </div>

                {entityInfo.isConsolidated && (
                  <div className="p-4 rounded-lg" style={{ backgroundColor: '#E8F7F8', border: '1px solid #00A9B7' }}>
                    <p className="text-xs" style={{ color: '#007D87', margin: 0 }}>
                      ℹ️ All values are converted to INR (base currency) for consolidated reporting.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}