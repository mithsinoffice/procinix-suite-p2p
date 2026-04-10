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
      case 'Direct': return { bg: '#E8F5E9', color: '#2E7D32', border: '#81C784' };
      case 'Indirect': return { bg: '#E8F7F8', color: '#00A9B7', border: '#00A9B7' };
      case 'Hybrid': return { bg: '#FFF3E0', color: '#F57C00', border: '#FFB74D' };
      case 'Strategic': return { bg: '#E3F2FD', color: '#1976D2', border: '#64B5F6' };
      case 'Analysis': return { bg: '#F3E5F5', color: '#7B1FA2', border: '#BA68C8' };
      case 'Operational': return { bg: '#FFF8E1', color: '#F57F17', border: '#FDD835' };
      case 'Governance': return { bg: '#FCE4EC', color: '#C2185B', border: '#F48FB1' };
      default: return { bg: '#F6F9FC', color: '#6E7A82', border: '#E1E6EA' };
    }
  };

  return (
    <div style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl mb-2" style={{ color: '#0A0F14', margin: 0 }}>Cash Flow Reports</h1>
            <p className="text-sm" style={{ color: '#6E7A82', margin: 0 }}>
              Comprehensive reporting suite for all cash flow analysis
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-lg transition-colors" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E1E6EA', color: '#0A0F14' }}>
              <Filter className="w-4 h-4 inline mr-2" />
              Filter Reports
            </button>
            <button className="px-4 py-2 rounded-lg transition-colors" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E1E6EA', color: '#0A0F14' }}>
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
              <div key={idx} className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F6F9FC' }}>
                      <FileBarChart className="w-5 h-5" style={{ color: '#00A9B7' }} />
                    </div>
                    <div>
                      <h3 className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: '600', margin: 0 }}>
                        {report.name}
                      </h3>
                      <div className="flex items-center gap-3 text-sm" style={{ color: '#6E7A82' }}>
                        <span className="px-2 py-0.5 rounded text-xs" style={typeStyle}>
                          {report.type}
                        </span>
                        <span>Formats: {report.format}</span>
                        <span>•</span>
                        <span>Frequency: {report.frequency}</span>
                      </div>
                    </div>
                  </div>
                  <button className="px-4 py-2 rounded-lg text-white transition-colors" style={{ backgroundColor: '#00A9B7' }}>
                    <Download className="w-4 h-4 inline mr-2" />
                    Generate
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
          <h3 className="text-base mb-4" style={{ color: '#0A0F14', margin: 0, fontWeight: '600' }}>
            Scheduled Reports
          </h3>
          <p className="text-sm" style={{ color: '#6E7A82' }}>
            Configure automatic report generation and email distribution to stakeholders.
          </p>
          <button className="mt-4 px-4 py-2 rounded-lg transition-colors" style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA', color: '#0A0F14' }}>
            Configure Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
