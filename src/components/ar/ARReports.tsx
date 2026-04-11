import { BarChart3, Download, Filter, FileText } from 'lucide-react';

export function ARReports() {
  const reports = [
    { name: 'AR Aging Report', description: 'Customer outstanding by aging bucket', type: 'Operational', frequency: 'Daily' },
    { name: 'Customer Outstanding', description: 'Detailed customer-wise outstanding', type: 'Operational', frequency: 'Daily' },
    { name: 'Collection Effectiveness', description: 'Collection performance metrics', type: 'Analysis', frequency: 'Weekly' },
    { name: 'DSO Trend Report', description: 'Days sales outstanding trend analysis', type: 'Analysis', frequency: 'Monthly' },
    { name: 'Credit Note Analysis', description: 'Credit notes by reason and customer', type: 'Analysis', frequency: 'Monthly' },
    { name: 'Revenue Recognition Report', description: 'Recognized vs deferred revenue', type: 'Compliance', frequency: 'Monthly' },
    { name: 'Bad Debt Risk Report', description: 'AI-driven bad debt risk assessment', type: 'Strategic', frequency: 'Weekly' },
    { name: 'Cash Flow Forecast (AR)', description: 'Expected collection timeline', type: 'Strategic', frequency: 'Weekly' }
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Operational': return { bg: 'var(--color-teal-tint)', color: 'var(--color-teal)', border: 'var(--color-teal)' };
      case 'Analysis': return { bg: '#F3E5F5', color: '#7B1FA2', border: '#BA68C8' };
      case 'Compliance': return { bg: 'var(--color-warning-light)', color: 'var(--color-warning-dark)', border: '#FFB74D' };
      case 'Strategic': return { bg: '#E3F2FD', color: '#1976D2', border: '#64B5F6' };
      default: return { bg: 'var(--color-cloud)', color: 'var(--color-mercury-grey)', border: 'var(--color-silver)' };
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl mb-2" style={{ color: 'var(--color-ink)', margin: 0 }}>AR Reports</h1>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
              Comprehensive reporting suite for accounts receivable
            </p>
          </div>
          <button className="px-4 py-2 rounded-lg" style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}>
            <Filter className="w-4 h-4 inline mr-2" />
            Filter Reports
          </button>
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-1 gap-4">
          {reports.map((report, idx) => {
            const typeStyle = getTypeColor(report.type);
            return (
              <div key={idx} className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-cloud)' }}>
                      <FileText className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
                    </div>
                    <div>
                      <h3 className="text-base mb-1" style={{ color: 'var(--color-ink)', fontWeight: '600', margin: 0 }}>{report.name}</h3>
                      <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                        <span>{report.description}</span>
                        <span>•</span>
                        <span className="px-2 py-0.5 rounded text-xs" style={typeStyle}>{report.type}</span>
                        <span>•</span>
                        <span>Frequency: {report.frequency}</span>
                      </div>
                    </div>
                  </div>
                  <button className="px-4 py-2 rounded-lg text-white" style={{ backgroundColor: 'var(--color-teal)' }}>
                    <Download className="w-4 h-4 inline mr-2" />
                    Generate
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 p-6 rounded-lg" style={{ backgroundColor: 'var(--color-teal-tint)', border: '1px solid var(--color-teal)' }}>
          <h4 className="text-sm mb-2" style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}>
            Cash Flow Integration
          </h4>
          <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
            All AR reports integrate with Cash Flow AI module. Expected collection data feeds directly into 13-week and monthly forecasts
            with probability-weighted projections. Drill-down from Cash Flow → Collections → Invoice → Customer is fully supported.
          </p>
        </div>
      </div>
    </div>
  );
}
