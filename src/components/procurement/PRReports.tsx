import { BarChart3, Download, TrendingUp, Clock, DollarSign } from 'lucide-react';

export function PRReports() {
  const formatCurrency = (amount: number) => `₹${(amount / 10000000).toFixed(2)} Cr`;

  const reports = [
    {
      name: 'PR by Department',
      description: 'PR volume and value by department',
      count: 45,
      value: 12500000,
      trend: '+12%',
    },
    {
      name: 'PR Approval Time',
      description: 'Average time from submission to approval',
      avgDays: 2.8,
      sla: 3,
      compliance: '94%',
    },
    {
      name: 'PR by Type',
      description: 'Distribution across Catalogue, Regular, Service',
      catalogue: 45,
      regular: 32,
      service: 23,
    },
    {
      name: 'Budget Compliance',
      description: 'PRs within budget vs budget breach',
      compliant: 92,
      breach: 8,
    },
    {
      name: 'Conversion Rate',
      description: 'PR to PO conversion rate',
      converted: 87,
      pending: 13,
    },
  ];

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl mb-2" style={{ color: 'var(--color-ink)', margin: 0 }}>
              PR Reports & Analytics
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
              Insights into procurement requisition patterns
            </p>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div
            className="bg-white p-6 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
              style={{ backgroundColor: 'var(--color-teal-tint)' }}
            >
              <BarChart3 className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
            </div>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Total PRs (This Month)
            </p>
            <p className="text-2xl mb-1" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
              124
            </p>
            <p className="text-xs" style={{ color: 'var(--color-success-dark)' }}>
              ↑ 12% vs last month
            </p>
          </div>
          <div
            className="bg-white p-6 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
              style={{ backgroundColor: 'var(--color-success-light)' }}
            >
              <DollarSign className="w-5 h-5" style={{ color: 'var(--color-success-dark)' }} />
            </div>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Total PR Value
            </p>
            <p className="text-2xl mb-1" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
              {formatCurrency(34500000)}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-success-dark)' }}>
              ↑ 8% vs last month
            </p>
          </div>
          <div
            className="bg-white p-6 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
              style={{ backgroundColor: 'var(--color-warning-light)' }}
            >
              <Clock className="w-5 h-5" style={{ color: 'var(--color-warning-dark)' }} />
            </div>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Avg Approval Time
            </p>
            <p className="text-2xl mb-1" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
              2.8 days
            </p>
            <p className="text-xs" style={{ color: 'var(--color-success-dark)' }}>
              ↓ 0.5 days vs last month
            </p>
          </div>
          <div
            className="bg-white p-6 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
              style={{ backgroundColor: '#E3F2FD' }}
            >
              <TrendingUp className="w-5 h-5" style={{ color: '#1976D2' }} />
            </div>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              PR → PO Conversion
            </p>
            <p className="text-2xl mb-1" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
              87%
            </p>
            <p className="text-xs" style={{ color: 'var(--color-success-dark)' }}>
              ↑ 3% vs last month
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {reports.map((report, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg p-6"
              style={{ border: '1px solid var(--color-silver)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3
                    className="text-base mb-1"
                    style={{ color: 'var(--color-ink)', fontWeight: '600', margin: 0 }}
                  >
                    {report.name}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
                    {report.description}
                  </p>
                </div>
                <button
                  className="px-4 py-2 rounded-lg text-white"
                  style={{ backgroundColor: 'var(--color-teal)' }}
                >
                  <Download className="w-4 h-4 inline mr-2" />
                  Export
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
