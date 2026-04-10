import { Calendar, TrendingDown, TrendingUp, AlertTriangle, Sparkles, Download } from 'lucide-react';

/**
 * 13-WEEK FORECAST (DIRECT + AI)
 * 
 * Purpose: Short-term operational cash control
 * Data Source: Direct cash + AI predictions
 */

export function WeekForecast13() {
  const formatCurrency = (amount: number) => {
    const crore = amount / 10000000;
    return `₹${crore.toFixed(2)} Cr`;
  };

  const weeks = [
    { week: 1, startDate: 'Dec 16', endDate: 'Dec 22', opening: 74620000, inflow: 9200000, outflow: 12400000, closing: 71420000, risk: 'low' },
    { week: 2, startDate: 'Dec 23', endDate: 'Dec 29', opening: 71420000, inflow: 8500000, outflow: 9800000, closing: 70120000, risk: 'low' },
    { week: 3, startDate: 'Dec 30', endDate: 'Jan 5', opening: 70120000, inflow: 12000000, outflow: 15200000, closing: 66920000, risk: 'medium' },
    { week: 4, startDate: 'Jan 6', endDate: 'Jan 12', opening: 66920000, inflow: 7300000, outflow: 11500000, closing: 62720000, risk: 'medium' },
    { week: 5, startDate: 'Jan 13', endDate: 'Jan 19', opening: 62720000, inflow: 15800000, outflow: 13200000, closing: 65320000, risk: 'low' },
    { week: 6, startDate: 'Jan 20', endDate: 'Jan 26', opening: 65320000, inflow: 8900000, outflow: 16700000, closing: 57520000, risk: 'high' },
    { week: 7, startDate: 'Jan 27', endDate: 'Feb 2', opening: 57520000, inflow: 6200000, outflow: 18900000, closing: 44820000, risk: 'critical' },
    { week: 8, startDate: 'Feb 3', endDate: 'Feb 9', opening: 44820000, inflow: 21500000, outflow: 9800000, closing: 56520000, risk: 'high' },
    { week: 9, startDate: 'Feb 10', endDate: 'Feb 16', opening: 56520000, inflow: 13400000, outflow: 10200000, closing: 59720000, risk: 'medium' },
    { week: 10, startDate: 'Feb 17', endDate: 'Feb 23', opening: 59720000, inflow: 9800000, outflow: 12100000, closing: 57420000, risk: 'medium' },
    { week: 11, startDate: 'Feb 24', endDate: 'Mar 2', opening: 57420000, inflow: 16200000, outflow: 11800000, closing: 61820000, risk: 'low' },
    { week: 12, startDate: 'Mar 3', endDate: 'Mar 9', opening: 61820000, inflow: 11900000, outflow: 13500000, closing: 60220000, risk: 'low' },
    { week: 13, startDate: 'Mar 10', endDate: 'Mar 16', opening: 60220000, inflow: 14300000, outflow: 12600000, closing: 61920000, risk: 'low' },
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return { bg: '#E8F5E9', color: '#2E7D32', border: '#81C784' };
      case 'medium': return { bg: '#FFF3E0', color: '#F57C00', border: '#FFB74D' };
      case 'high': return { bg: '#FFF3E0', color: '#E65100', border: '#FF9800' };
      case 'critical': return { bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5' };
      default: return { bg: '#F6F9FC', color: '#6E7A82', border: '#E1E6EA' };
    }
  };

  const minimumBuffer = 50000000;

  return (
    <div style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      {/* PAGE HEADER */}
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl" style={{ color: '#0A0F14', margin: 0 }}>
                13-Week Cash Forecast
              </h1>
              <span 
                className="px-3 py-1 rounded-full text-sm"
                style={{ backgroundColor: '#E8F7F8', color: '#00A9B7', border: '1px solid #00A9B7' }}
              >
                DIRECT + AI
              </span>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ backgroundColor: '#F6F9FC' }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: '#00A9B7' }} />
                <span className="text-xs" style={{ color: '#6E7A82' }}>AI-Powered</span>
              </div>
            </div>
            <p className="text-sm" style={{ color: '#6E7A82', margin: 0 }}>
              Short-term operational cash control • Week-by-week projections
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-lg transition-colors" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E1E6EA', color: '#0A0F14' }}>
              <Calendar className="w-4 h-4 inline mr-2" />
              Adjust Assumptions
            </button>
            <button className="px-4 py-2 rounded-lg text-white transition-colors" style={{ backgroundColor: '#00A9B7' }}>
              <Download className="w-4 h-4 inline mr-2" />
              Export Forecast
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-8">
        {/* KPI Summary */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
            <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>Starting Cash</p>
            <p className="text-2xl" style={{ color: '#0A0F14' }}>{formatCurrency(weeks[0].opening)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
            <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>Total Inflows</p>
            <p className="text-2xl" style={{ color: '#2E7D32' }}>
              {formatCurrency(weeks.reduce((sum, w) => sum + w.inflow, 0))}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
            <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>Total Outflows</p>
            <p className="text-2xl" style={{ color: '#DC2626' }}>
              {formatCurrency(weeks.reduce((sum, w) => sum + w.outflow, 0))}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
            <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>Ending Cash (Week 13)</p>
            <p className="text-2xl" style={{ color: '#0A0F14' }}>{formatCurrency(weeks[12].closing)}</p>
          </div>
        </div>

        {/* Week-by-Week Table */}
        <div className="bg-white rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
          <div className="p-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
            <h3 className="text-base" style={{ color: '#0A0F14', margin: 0 }}>Week-by-Week Cash Flow</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: '#F6F9FC' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Week</th>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Period</th>
                  <th className="px-6 py-3 text-right text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Opening Balance</th>
                  <th className="px-6 py-3 text-right text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Inflows</th>
                  <th className="px-6 py-3 text-right text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Outflows</th>
                  <th className="px-6 py-3 text-right text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Closing Balance</th>
                  <th className="px-6 py-3 text-center text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#E1E6EA' }}>
                {weeks.map((week) => {
                  const riskStyle = getRiskColor(week.risk);
                  const belowBuffer = week.closing < minimumBuffer;
                  return (
                    <tr key={week.week} style={{ backgroundColor: belowBuffer ? '#FEE2E2' : '#FFFFFF' }}>
                      <td className="px-6 py-4 text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>W{week.week}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: '#6E7A82' }}>{week.startDate} - {week.endDate}</td>
                      <td className="px-6 py-4 text-sm text-right" style={{ color: '#0A0F14' }}>{formatCurrency(week.opening)}</td>
                      <td className="px-6 py-4 text-sm text-right" style={{ color: '#2E7D32' }}>+{formatCurrency(week.inflow)}</td>
                      <td className="px-6 py-4 text-sm text-right" style={{ color: '#DC2626' }}>-{formatCurrency(week.outflow)}</td>
                      <td className="px-6 py-4 text-sm text-right" style={{ color: belowBuffer ? '#DC2626' : '#0A0F14', fontWeight: '600' }}>
                        {formatCurrency(week.closing)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 rounded text-xs inline-block" style={riskStyle}>
                          {week.risk.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Critical Week Alert */}
        <div className="mt-8 p-6 rounded-lg" style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5" style={{ color: '#DC2626' }} />
            <div>
              <h4 className="text-sm mb-2" style={{ color: '#0A0F14', margin: 0, fontWeight: '600' }}>
                Critical Cash Alert: Week 7
              </h4>
              <p className="text-sm" style={{ color: '#6E7A82', margin: 0 }}>
                Cash drops to {formatCurrency(44820000)} (below minimum buffer of {formatCurrency(minimumBuffer)}) due to GST payment + delayed collections.
                <br />
                <strong>AI Recommendation:</strong> Defer non-critical vendor payments or utilize ₹10 Cr overdraft facility.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
