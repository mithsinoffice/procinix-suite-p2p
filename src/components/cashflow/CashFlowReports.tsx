import { FileBarChart, Download, Calendar, Filter } from 'lucide-react';

/**
 * CASH FLOW REPORTS
 * 
 * Purpose: Comprehensive reporting suite for cash flow analysis
 */

export function CashFlowReports() {
  const reports = [
    { name: '13-Week Cash Forecast', type: 'Direct', format: 'Excel, PDF', frequency: 'Weekly' },
    { name: 'Monthly Indirect Cash Flow', type: 'Indirect', format: 'Excel, PDF', frequency: 'Monthly' },
    { name: 'Hybrid Reconciliation Report', type: 'Hybrid', format: 'Excel, PDF', frequency: 'Monthly' },
    { name: 'Cash Runway Report', type: 'Strategic', format: 'PDF, PPT', frequency: 'Monthly' },
    { name: 'Scenario Comparison', type: 'Analysis', format: 'Excel, PDF', frequency: 'On-demand' },
    { name: 'Entity-wise Liquidity', type: 'Operational', format: 'Excel, PDF', frequency: 'Daily' },
    { name: 'Variance Explanation Report', type: 'Analysis', format: 'PDF', frequency: 'Weekly' },
    { name: 'Audit & Override Log', type: 'Governance', format: 'Excel, PDF', frequency: 'Monthly' },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Direct': return { bg: 'var(--color-success-light)', color: 'var(--color-success-dark)', border: '#81C784' };
      case 'Indirect': return { bg: 'var(--color-teal-tint)', color: 'var(--color-teal)', border: 'var(--color-teal)' };
      case 'Hybrid': return { bg: 'var(--color-warning-light)', color: 'var(--color-warning-dark)', border: '#FFB74D' };
      case 'Strategic': return { bg: '#E3F2FD', color: '#1976D2', border: '#64B5F6' };
      case 'Analysis': return { bg: '#F3E5F5', color: '#7B1FA2', border: '#BA68C8' };
      case 'Operational': return { bg: '#FFF8E1', color: '#F57F17', border: '#FDD835' };
      case 'Governance': return { bg: '#FCE4EC', color: '#C2185B', border: '#F48FB1' };
      default: return { bg: 'var(--color-cloud)', color: 'var(--color-mercury-grey)', border: 'var(--color-silver)' };
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl mb-2" style={{ color: 'var(--color-ink)', margin: 0 }}>Cash Flow Reports</h1>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
              Comprehensive reporting suite for all cash flow analysis
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-lg transition-colors" style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}>
              <Filter className="w-4 h-4 inline mr-2" />
              Filter Reports
            </button>
            <button className="px-4 py-2 rounded-lg transition-colors" style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}>
              <Calendar className="w-4 h-4 inline mr-2" />
              Schedule
            </button>
          </div>
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
                      <FileBarChart className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
                    </div>
                    <div>
                      <h3 className="text-base mb-1" style={{ color: 'var(--color-ink)', fontWeight: '600', margin: 0 }}>
                        {report.name}
                      </h3>
                      <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                        <span className="px-2 py-0.5 rounded text-xs" style={typeStyle}>
                          {report.type}
                        </span>
                        <span>Formats: {report.format}</span>
                        <span>•</span>
                        <span>Frequency: {report.frequency}</span>
                      </div>
                    </div>
                  </div>
                  <button className="px-4 py-2 rounded-lg text-white transition-colors" style={{ backgroundColor: 'var(--color-teal)' }}>
                    <Download className="w-4 h-4 inline mr-2" />
                    Generate
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)' }}>
          <h3 className="text-base mb-4" style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}>
            Scheduled Reports
          </h3>
          <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
            Configure automatic report generation and email distribution to stakeholders.
          </p>
          <button className="mt-4 px-4 py-2 rounded-lg transition-colors" style={{ backgroundColor: 'var(--color-cloud)', border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}>
            Configure Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
