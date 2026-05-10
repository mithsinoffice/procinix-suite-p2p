import { KPICard } from './KPICard';
import { CompletionBreakdown } from './CompletionBreakdown';
import { OnboardingSLATrend } from './OnboardingSLATrend';
import { TopVendorSpend } from './TopVendorSpend';
import { SpendByDepartment } from './SpendByDepartment';
import { IndianRupee, FileText, AlertTriangle, Clock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function OperationalDashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-8" style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/reports')}
          className="p-2 rounded-lg transition-colors hover:bg-white"
          style={{ color: 'var(--color-mercury-grey)' }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl mb-1" style={{ color: 'var(--color-ink)' }}>
            Operational Dashboard
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
            Real-time procurement operations overview
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Total PO Value (YTD)"
          value="₹24,68,159"
          change="+12% vs last year"
          changeType="positive"
          icon={IndianRupee}
          iconBg="bg-gray-100"
          iconColor="text-gray-600"
        />
        <KPICard
          title="Open PO Value"
          value="₹11,07,624"
          subtitle="Not Fully Received"
          icon={FileText}
          iconBg="bg-gray-100"
          iconColor="text-gray-600"
        />
        <KPICard
          title="Pending GRNs"
          value="₹3,01,609"
          change="Requires attention"
          changeType="negative"
          icon={AlertTriangle}
          iconBg="bg-gray-100"
          iconColor="text-gray-600"
        />
        <KPICard
          title="Avg PO Processing Time"
          value="2.4 Days"
          change="+0.5 days faster"
          changeType="positive"
          icon={Clock}
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
