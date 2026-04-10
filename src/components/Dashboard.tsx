import { KPICard } from './KPICard';
import { CompletionBreakdown } from './CompletionBreakdown';
import { OnboardingSLATrend } from './OnboardingSLATrend';
import { TopVendorSpend } from './TopVendorSpend';
import { SpendByDepartment } from './SpendByDepartment';
import { ApprovalDashboard } from './ApprovalDashboard';
import { CreatorDashboard } from './CreatorDashboard';
import { CombinedDashboard } from './CombinedDashboard';
import { IndianRupee, FileText, AlertTriangle, Clock, TrendingUp, Receipt, Wallet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardData } from '../contexts/DashboardDataContext';

export function Dashboard() {
  const { user } = useAuth();
  const { metrics } = useDashboardData();

  // Show combined dashboard for users with multiple roles
  if (user?.roles && user.roles.length > 1) {
    return <CombinedDashboard />;
  }

  // Show approval dashboard for approver roles
  if (user?.role === 'PO Approver' || user?.role === 'Location Manager') {
    return <ApprovalDashboard />;
  }

  // Show creator dashboard for creator roles
  if (user?.role === 'PO Creator') {
    return <CreatorDashboard />;
  }

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: metrics.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate change percentage for KPIs
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return '0%';
    const change = ((current - previous) / previous) * 100;
    return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl" style={{ color: '#0A0F14' }}>
          Dashboard {metrics.isConsolidated && <span style={{ color: '#6E7A82', fontSize: '1.5rem' }}>(Consolidated View)</span>}
        </h1>
        {metrics.isConsolidated && (
          <div style={{
            padding: '8px 16px',
            background: '#F6F9FC',
            border: '1px solid #E1E6EA',
            borderRadius: '6px',
            color: '#6E7A82',
            fontSize: '14px'
          }}>
            All amounts converted to {metrics.currency}
          </div>
        )}
      </div>

      {/* KPI Cards */}
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
          subtitle={`${metrics.openPOCount} open POs`}
          icon={FileText}
          iconBg="bg-gray-100"
          iconColor="text-gray-600"
        />
        <KPICard
          title="Pending GRNs"
          value={`${metrics.pendingGRNs}`}
          change={metrics.pendingGRNs > 0 ? "Requires attention" : "All processed"}
          changeType={metrics.pendingGRNs > 0 ? "negative" : "positive"}
          icon={AlertTriangle}
          iconBg="bg-gray-100"
          iconColor="text-gray-600"
        />
        <KPICard
          title="Avg PO Processing Time"
          value={`${metrics.avgPOProcessingTime.toFixed(1)} Days`}
          change={metrics.avgPOProcessingTime < 3 ? "Within target" : "Needs improvement"}
          changeType={metrics.avgPOProcessingTime < 3 ? "positive" : "negative"}
          icon={Clock}
          iconBg="bg-gray-100"
          iconColor="text-gray-600"
        />
      </div>

      {/* Additional KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Total Invoice Value"
          value={formatCurrency(metrics.totalInvoiceValue)}
          change={`${metrics.invoiceCount} invoices`}
          changeType="neutral"
          icon={Receipt}
          iconBg="bg-gray-100"
          iconColor="text-gray-600"
        />
        <KPICard
          title="Payments Due"
          value={formatCurrency(metrics.totalPaymentsDue)}
          subtitle={`${metrics.upcomingPayments} invoices`}
          icon={TrendingUp}
          iconBg="bg-gray-100"
          iconColor="text-gray-600"
        />
        <KPICard
          title="Vendor Advances"
          value={formatCurrency(metrics.totalAdvances)}
          change={`${metrics.pendingAdvances} pending approval`}
          changeType={metrics.pendingAdvances > 0 ? "neutral" : "positive"}
          icon={Wallet}
          iconBg="bg-gray-100"
          iconColor="text-gray-600"
        />
        <KPICard
          title="Total GRN Value"
          value={formatCurrency(metrics.totalGRNValue)}
          change={`${metrics.grnCount} GRNs processed`}
          changeType="neutral"
          icon={FileText}
          iconBg="bg-gray-100"
          iconColor="text-gray-600"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <CompletionBreakdown />
        <OnboardingSLATrend />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopVendorSpend />
        <SpendByDepartment />
      </div>
    </div>
  );
}