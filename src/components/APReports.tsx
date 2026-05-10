import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  Filter,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Target,
  Shield,
  Users,
  Zap,
} from 'lucide-react';

interface Report {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ComponentType<{ className?: string; style?: any }>;
  color: string;
  bg: string;
  lastGenerated?: string;
}

export function APReports() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [dateFrom, setDateFrom] = useState('2024-12-01');
  const [dateTo, setDateTo] = useState('2024-12-14');

  const reports: Report[] = [
    {
      id: 'invoice-aging',
      name: 'Invoice Aging Report',
      description: 'Detailed aging analysis of outstanding invoices by vendor and bucket',
      category: 'Operational',
      icon: Clock,
      color: '#D97706',
      bg: '#FEF3C7',
      lastGenerated: '2024-12-14 10:30 AM',
    },
    {
      id: 'invoice-payment-trace',
      name: 'Invoice to Payment Trace',
      description: 'Complete audit trail from invoice creation to payment completion',
      category: 'Audit',
      icon: Target,
      color: 'var(--color-teal)',
      bg: 'var(--color-teal)10',
      lastGenerated: '2024-12-13 03:15 PM',
    },
    {
      id: 'po-invoice-variance',
      name: 'PO vs Invoice Variance',
      description: 'Comparison of PO amounts vs invoice amounts with variance analysis',
      category: 'Compliance',
      icon: BarChart3,
      color: '#007D87',
      bg: '#EDE9FE',
      lastGenerated: '2024-12-14 09:00 AM',
    },
    {
      id: 'duplicate-analysis',
      name: 'Duplicate Invoice Analysis',
      description: 'AI-detected potential duplicate invoices requiring review',
      category: 'Risk',
      icon: Zap,
      color: 'var(--color-error-dark)',
      bg: 'var(--color-error-light)',
      lastGenerated: '2024-12-14 11:45 AM',
    },
    {
      id: 'msme-compliance',
      name: 'MSME Compliance Report',
      description: 'Payment status and compliance tracking for MSME vendors',
      category: 'Compliance',
      icon: Shield,
      color: '#047857',
      bg: '#D1FAE5',
      lastGenerated: '2024-12-13 02:30 PM',
    },
    {
      id: 'tds-liability',
      name: 'TDS Liability Report',
      description: 'Summary of TDS deducted by section and pending payments',
      category: 'Tax',
      icon: DollarSign,
      color: '#EA580C',
      bg: '#FED7AA',
      lastGenerated: '2024-12-14 08:15 AM',
    },
    {
      id: 'approval-sla',
      name: 'Approval SLA Report',
      description: 'Analysis of approval cycle times vs SLA with bottleneck identification',
      category: 'Operational',
      icon: Clock,
      color: '#2563EB',
      bg: '#DBEAFE',
      lastGenerated: '2024-12-14 07:00 AM',
    },
    {
      id: 'vendor-ap-exposure',
      name: 'Vendor-wise AP Exposure',
      description: 'Outstanding amounts by vendor with risk concentration analysis',
      category: 'Risk',
      icon: Building2,
      color: '#6366F1',
      bg: '#E0E7FF',
      lastGenerated: '2024-12-13 04:20 PM',
    },
    {
      id: 'payment-forecast',
      name: 'Payment Forecast Report',
      description: 'Projected cash outflows based on due dates and payment terms',
      category: 'Financial',
      icon: TrendingUp,
      color: '#10B981',
      bg: '#D1FAE5',
      lastGenerated: '2024-12-14 06:30 AM',
    },
    {
      id: 'exception-summary',
      name: 'Exception Summary Report',
      description: 'All policy exceptions and overrides with approver details',
      category: 'Audit',
      icon: AlertTriangle,
      color: '#F59E0B',
      bg: '#FEF3C7',
      lastGenerated: '2024-12-13 01:00 PM',
    },
    {
      id: 'vendor-performance',
      name: 'Vendor Performance Report',
      description: 'Vendor delivery, quality, and payment history analysis',
      category: 'Operational',
      icon: Users,
      color: '#007D87',
      bg: '#EDE9FE',
      lastGenerated: '2024-12-12 05:45 PM',
    },
    {
      id: 'budget-consumption',
      name: 'Budget Consumption by AP',
      description: 'Budget utilization tracking for invoices by cost/profit center',
      category: 'Financial',
      icon: PieChart,
      color: '#EC4899',
      bg: '#FCE7F3',
      lastGenerated: '2024-12-14 09:30 AM',
    },
  ];

  const categories = ['All', 'Operational', 'Compliance', 'Risk', 'Tax', 'Financial', 'Audit'];

  const filteredReports =
    selectedCategory === 'All' ? reports : reports.filter((r) => r.category === selectedCategory);

  const handleGenerateReport = (reportId: string) => {
    alert(`Generating report: ${reportId}\nDate Range: ${dateFrom} to ${dateTo}`);
  };

  const handleViewReport = (reportId: string) => {
    alert(`Opening report: ${reportId}`);
  };

  const handleDownloadReport = (reportId: string) => {
    alert(`Downloading report: ${reportId} as Excel`);
  };

  // Quick Stats
  const stats = [
    { label: 'Total Reports', value: '12', icon: FileText, color: 'var(--color-teal)' },
    { label: 'Generated Today', value: '8', icon: CheckCircle, color: '#047857' },
    { label: 'Scheduled Reports', value: '5', icon: Clock, color: '#D97706' },
    { label: 'Custom Reports', value: '3', icon: Target, color: '#007D87' },
  ];

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }} className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl mb-2" style={{ color: 'var(--color-ink)' }}>
          AP Reports
        </h1>
        <p style={{ color: 'var(--color-mercury-grey)' }}>
          Comprehensive reporting suite for accounts payable analytics
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl p-4 border-2"
            style={{ borderColor: 'var(--color-silver)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                  {stat.label}
                </p>
                <p className="text-2xl" style={{ color: 'var(--color-ink)' }}>
                  {stat.value}
                </p>
              </div>
              <stat.icon className="w-8 h-8" style={{ color: stat.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        className="bg-white rounded-xl border-2 p-6 mb-6"
        style={{ borderColor: 'var(--color-silver)' }}
      >
        <h3 className="mb-4" style={{ color: 'var(--color-ink)' }}>
          Report Filters
        </h3>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border-2"
              style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
            >
              {categories.map((cat) => (
                <option key={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border-2"
              style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
            />
          </div>

          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border-2"
              style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
            />
          </div>

          <div className="flex items-end">
            <button
              className="w-full px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: 'var(--color-teal)' }}
            >
              <Filter className="w-4 h-4 inline mr-2" />
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-3 gap-6">
        {filteredReports.map((report) => {
          const ReportIcon = report.icon;

          return (
            <div
              key={report.id}
              className="bg-white rounded-xl border-2 p-6 hover:shadow-lg transition-all cursor-pointer"
              style={{ borderColor: 'var(--color-silver)' }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: report.bg }}
                >
                  <ReportIcon className="w-6 h-6" style={{ color: report.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg pr-2" style={{ color: 'var(--color-ink)' }}>
                      {report.name}
                    </h3>
                  </div>
                  <span
                    className="inline-block text-xs px-2 py-1 rounded"
                    style={{ backgroundColor: report.bg, color: report.color }}
                  >
                    {report.category}
                  </span>
                </div>
              </div>

              <p className="text-sm mb-4" style={{ color: 'var(--color-mercury-grey)' }}>
                {report.description}
              </p>

              {report.lastGenerated && (
                <div
                  className="flex items-center gap-2 mb-4 text-xs"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  <Calendar className="w-3 h-3" />
                  <span>Last generated: {report.lastGenerated}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleGenerateReport(report.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
                  style={{ backgroundColor: report.color }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  <BarChart3 className="w-4 h-4" />
                  Generate
                </button>
                <button
                  onClick={() => handleViewReport(report.id)}
                  className="px-3 py-2 rounded-lg border-2 hover:bg-[var(--color-cloud)] transition-colors"
                  style={{ borderColor: 'var(--color-silver)' }}
                  title="View Report"
                >
                  <Eye className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                </button>
                <button
                  onClick={() => handleDownloadReport(report.id)}
                  className="px-3 py-2 rounded-lg border-2 hover:bg-[var(--color-cloud)] transition-colors"
                  style={{ borderColor: 'var(--color-silver)' }}
                  title="Download Excel"
                >
                  <Download className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredReports.length === 0 && (
        <div
          className="bg-white rounded-xl border-2 p-12 text-center"
          style={{ borderColor: 'var(--color-silver)' }}
        >
          <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-silver)' }} />
          <p style={{ color: 'var(--color-mercury-grey)' }}>No reports found in this category</p>
        </div>
      )}

      {/* Scheduled Reports Section */}
      <div
        className="bg-white rounded-xl border-2 p-6 mt-6"
        style={{ borderColor: 'var(--color-silver)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--color-teal)]" />
            <h3 className="text-xl" style={{ color: 'var(--color-ink)' }}>
              Scheduled Reports
            </h3>
          </div>
          <button className="text-sm text-[var(--color-teal)] hover:underline">
            Manage Schedules →
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)' }}>
            <p className="mb-1" style={{ color: 'var(--color-ink)' }}>
              Invoice Aging Report
            </p>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Every Monday at 9:00 AM
            </p>
            <span
              className="text-xs px-2 py-1 rounded"
              style={{ backgroundColor: '#D1FAE5', color: '#047857' }}
            >
              Active
            </span>
          </div>

          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)' }}>
            <p className="mb-1" style={{ color: 'var(--color-ink)' }}>
              TDS Liability Report
            </p>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              End of month
            </p>
            <span
              className="text-xs px-2 py-1 rounded"
              style={{ backgroundColor: '#D1FAE5', color: '#047857' }}
            >
              Active
            </span>
          </div>

          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)' }}>
            <p className="mb-1" style={{ color: 'var(--color-ink)' }}>
              MSME Compliance Report
            </p>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Every Friday at 5:00 PM
            </p>
            <span
              className="text-xs px-2 py-1 rounded"
              style={{ backgroundColor: '#D1FAE5', color: '#047857' }}
            >
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
