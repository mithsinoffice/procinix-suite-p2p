import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Package,
  AlertCircle,
  Shield,
  BarChart3,
  DollarSign,
  Users,
  Activity,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ReportCategory {
  title: string;
  description: string;
  icon: typeof BarChart3;
  route: string;
  color: string;
}

const reportCategories: ReportCategory[] = [
  {
    title: 'Operational Dashboard',
    description:
      'Real-time procurement operations overview with PO tracking, GRN status, vendor spend analysis, and departmental budget monitoring',
    icon: Activity,
    route: '/reports/operational-dashboard',
    color: 'var(--color-teal)',
  },
  {
    title: 'Procurement Head Desk',
    description:
      'Operational control dashboard with PR-to-PO tracking, cycle time analysis, vendor performance metrics, and approval bottleneck identification',
    icon: Package,
    route: '/reports/procurement-head-desk',
    color: 'var(--color-teal)',
  },
  {
    title: 'CFO Desk',
    description:
      'Financial analytics dashboard with budget tracking, spend analysis, cost savings metrics, and cash flow projections',
    icon: DollarSign,
    route: '/reports/cfo-desk',
    color: 'var(--color-teal)',
  },
  {
    title: 'Management Desk',
    description:
      'Executive summary dashboard with strategic KPIs, organizational performance, risk indicators, and compliance overview',
    icon: Users,
    route: '/reports/management-desk',
    color: 'var(--color-teal)',
  },
];

const standardReports = [
  {
    title: 'Workflow Report',
    description:
      'Track all transactions submitted for approval across all masters with complete workflow history, status tracking, and approval timeline',
    icon: FileText,
    route: '/reports/workflow-report',
    actionLabel: 'View Report',
  },
  {
    title: 'Audit Trail Report',
    description:
      'Complete audit log of all system activities including user actions, workflow approvals, master data changes, and security events with field-level tracking',
    icon: Shield,
    route: '/reports/audit-trail',
    actionLabel: 'View Report',
  },
];

export function Reports() {
  const navigate = useNavigate();

  return (
    <div className="p-8" style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl mb-2" style={{ color: 'var(--color-ink)' }}>
          Reports
        </h1>
        <p style={{ color: 'var(--color-mercury-grey)' }}>
          Comprehensive analytics and compliance reports
        </p>
      </div>

      {/* Executive Dashboards Section */}
      <div className="mb-8">
        <h2 className="text-xl mb-4" style={{ color: 'var(--color-ink)' }}>
          Executive Dashboards
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {reportCategories.map((category, index) => {
            const Icon = category.icon;
            return (
              <div
                key={index}
                onClick={() => navigate(category.route)}
                className="bg-white rounded-lg p-6 cursor-pointer hover:shadow-lg transition-all flex flex-col"
                style={{ border: '1px solid var(--color-silver)' }}
              >
                <div
                  className="w-14 h-14 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${category.color}15` }}
                >
                  <Icon className="w-7 h-7" style={{ color: category.color }} />
                </div>

                <h3 className="text-lg mb-2" style={{ color: 'var(--color-ink)' }}>
                  {category.title}
                </h3>
                <p
                  className="text-sm mb-6 flex-grow"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  {category.description}
                </p>

                <button
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
                  style={{ backgroundColor: category.color }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = category.color)}
                >
                  <BarChart3 className="w-4 h-4" />
                  View Dashboard
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Standard Reports Section */}
      <div>
        <h2 className="text-xl mb-4" style={{ color: 'var(--color-ink)' }}>
          Standard Reports
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {standardReports.map((report, index) => {
            const Icon = report.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-lg p-6 hover:shadow-lg transition-shadow flex flex-col"
                style={{ border: '1px solid var(--color-silver)' }}
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'var(--color-cloud)' }}
                >
                  <Icon className="w-6 h-6" style={{ color: 'var(--color-teal)' }} />
                </div>

                <h3 className="text-lg mb-2" style={{ color: 'var(--color-ink)' }}>
                  {report.title}
                </h3>
                <p
                  className="text-sm mb-6 flex-grow"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  {report.description}
                </p>

                <button
                  onClick={() => navigate(report.route)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
                  style={{ backgroundColor: 'var(--color-teal)' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = 'var(--color-teal)')
                  }
                >
                  <Icon className="w-4 h-4" />
                  {report.actionLabel}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
