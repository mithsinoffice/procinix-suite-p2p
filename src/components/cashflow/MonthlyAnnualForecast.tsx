import { LineChart, TrendingUp, Sparkles, Download, Calendar } from 'lucide-react';

/**
 * MONTHLY / ANNUAL FORECAST (INDIRECT CASH FLOW)
 *
 * Purpose: Strategic planning & board reporting
 * Data Source: P&L, Balance Sheet, Working Capital movements
 */

export function MonthlyAnnualForecast() {
  const formatCurrency = (amount: number) => {
    const crore = amount / 10000000;
    return `₹${crore.toFixed(2)} Cr`;
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      {/* PAGE HEADER */}
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl" style={{ color: 'var(--color-ink)', margin: 0 }}>
                Monthly / Annual Forecast
              </h1>
              <span
                className="px-3 py-1 rounded-full text-sm"
                style={{
                  backgroundColor: 'var(--color-success-light)',
                  color: 'var(--color-success-dark)',
                  border: '1px solid #81C784',
                }}
              >
                INDIRECT CASH FLOW
              </span>
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded"
                style={{ backgroundColor: 'var(--color-cloud)' }}
              >
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--color-teal)' }} />
                <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                  GL/P&L Driven
                </span>
              </div>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
              Strategic planning from accounting data • Net profit + Working capital movements
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--color-silver)',
                color: 'var(--color-ink)',
              }}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Change Period
            </button>
            <button
              className="px-4 py-2 rounded-lg text-white transition-colors"
              style={{ backgroundColor: 'var(--color-teal)' }}
            >
              <Download className="w-4 h-4 inline mr-2" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div
            className="bg-white p-6 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
              style={{ backgroundColor: 'var(--color-success-light)' }}
            >
              <TrendingUp className="w-5 h-5" style={{ color: 'var(--color-success-dark)' }} />
            </div>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Net Profit (Annual)
            </p>
            <p className="text-2xl" style={{ color: 'var(--color-ink)' }}>
              {formatCurrency(45000000)}
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
              <LineChart className="w-5 h-5" style={{ color: 'var(--color-warning-dark)' }} />
            </div>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              WC Movement
            </p>
            <p className="text-2xl" style={{ color: 'var(--color-error-dark)' }}>
              -{formatCurrency(12000000)}
            </p>
          </div>
          <div
            className="bg-white p-6 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
              style={{ backgroundColor: 'var(--color-teal-tint)' }}
            >
              <LineChart className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
            </div>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Cash Generated (Ops)
            </p>
            <p className="text-2xl" style={{ color: 'var(--color-success-dark)' }}>
              {formatCurrency(33000000)}
            </p>
          </div>
          <div
            className="bg-white p-6 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
              style={{ backgroundColor: 'var(--color-cloud)' }}
            >
              <Calendar className="w-5 h-5" style={{ color: 'var(--color-mercury-grey)' }} />
            </div>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Cash Runway
            </p>
            <p className="text-2xl" style={{ color: 'var(--color-ink)' }}>
              18 months
            </p>
          </div>
        </div>

        {/* Waterfall Placeholder */}
        <div
          className="bg-white p-8 rounded-lg mb-8"
          style={{ border: '1px solid var(--color-silver)' }}
        >
          <h3 className="text-base mb-6" style={{ color: 'var(--color-ink)', margin: 0 }}>
            Indirect Cash Flow Waterfall (FY 2024-25)
          </h3>
          <div
            className="flex items-center justify-center"
            style={{ height: '300px', backgroundColor: 'var(--color-cloud)', borderRadius: '8px' }}
          >
            <div className="text-center">
              <LineChart
                className="w-16 h-16 mx-auto mb-4"
                style={{ color: 'var(--color-teal)' }}
              />
              <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                Waterfall chart: Net Profit → Working Capital → Capex → Financing → Ending Cash
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--color-mercury-grey)' }}>
                [Chart visualization coming soon]
              </p>
            </div>
          </div>
        </div>

        {/* Monthly Breakdown */}
        <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
          <div className="p-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
            <h3 className="text-base" style={{ color: 'var(--color-ink)', margin: 0 }}>
              Monthly Cash Generation (Indirect Method)
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, idx) => (
                <div
                  key={month}
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{ backgroundColor: 'var(--color-cloud)' }}
                >
                  <span
                    className="text-sm"
                    style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                  >
                    {month} 2025
                  </span>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                        Net Profit
                      </p>
                      <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
                        {formatCurrency(3500000 + idx * 200000)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                        WC Change
                      </p>
                      <p className="text-sm" style={{ color: 'var(--color-error-dark)' }}>
                        -{formatCurrency(1000000)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                        Cash Generated
                      </p>
                      <p
                        className="text-sm"
                        style={{ color: 'var(--color-success-dark)', fontWeight: '600' }}
                      >
                        {formatCurrency(2500000 + idx * 200000)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Insight */}
        <div
          className="mt-8 p-6 rounded-lg"
          style={{
            backgroundColor: 'var(--color-teal-tint)',
            border: '1px solid var(--color-teal)',
          }}
        >
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 mt-0.5" style={{ color: 'var(--color-teal)' }} />
            <div>
              <h4
                className="text-sm mb-2"
                style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}
              >
                AI Strategic Insight
              </h4>
              <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
                Working capital is increasing due to higher receivables. DSO has increased from 45
                to 52 days. Focus on collection acceleration to improve cash conversion.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
