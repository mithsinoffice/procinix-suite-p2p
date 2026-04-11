import { AlertTriangle, TrendingUp, TrendingDown, Info, Sparkles } from 'lucide-react';

/**
 * VARIANCE & EXPLAINABILITY
 * 
 * Purpose: Explain forecast vs actual differences with AI narratives
 */

export function VarianceExplainability() {
  const formatCurrency = (amount: number) => {
    const crore = amount / 10000000;
    return `₹${crore.toFixed(2)} Cr`;
  };

  const variances = [
    {
      type: 'Collection Delays',
      forecast: 35000000,
      actual: 28000000,
      variance: -7000000,
      impact: 'Negative',
      explanation: '3 major customers delayed payments by 7-15 days due to year-end internal approvals. Expected to clear in next 2 weeks.',
      invoices: ['INV-2024-456 (Reliance)', 'INV-2024-478 (Tata Motors)', 'INV-2024-492 (L&T)']
    },
    {
      type: 'Early AP Execution',
      forecast: -42000000,
      actual: -48000000,
      variance: -6000000,
      impact: 'Negative',
      explanation: 'Vendor offered 2% early payment discount. Decision made to accelerate payment to capture savings of ₹96L.',
      invoices: ['Payment to Tech Mahindra - saved ₹96L']
    },
    {
      type: 'Unexpected Expense',
      forecast: 0,
      actual: -3500000,
      variance: -3500000,
      impact: 'Negative',
      explanation: 'Emergency equipment repair not budgeted. Required immediate payment to avoid production stoppage.',
      invoices: ['Emergency repair - Plant 2']
    },
    {
      type: 'Tax Timing Shift',
      forecast: -18000000,
      actual: 0,
      variance: 18000000,
      impact: 'Positive',
      explanation: 'GST payment deadline extended by 5 days due to system maintenance at GSTN portal.',
      invoices: ['GST Nov 2024 - deadline moved to Dec 25']
    }
  ];

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl" style={{ color: 'var(--color-ink)', margin: 0 }}>Variance & Explainability</h1>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-teal-tint)', border: '1px solid var(--color-teal)' }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--color-teal)' }} />
                <span className="text-xs" style={{ color: 'var(--color-teal)', fontWeight: '600' }}>AI NARRATIVES</span>
              </div>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
              Understand forecast vs actual differences • AI-generated explanations
            </p>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Forecast (Week 1)</p>
            <p className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
              {formatCurrency(71420000)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Actual (Week 1)</p>
            <p className="text-2xl" style={{ color: 'var(--color-error-dark)', fontWeight: '600' }}>
              {formatCurrency(69920000)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Total Variance</p>
            <p className="text-2xl" style={{ color: 'var(--color-error-dark)', fontWeight: '600' }}>
              -{formatCurrency(1500000)}
            </p>
          </div>
        </div>

        {/* Variance Breakdown */}
        <div className="space-y-4">
          {variances.map((variance, idx) => {
            const isNegative = variance.impact === 'Negative';
            
            return (
              <div key={idx} className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`} 
                         style={{ backgroundColor: isNegative ? 'var(--color-error-light)' : 'var(--color-success-light)' }}>
                      {isNegative ? (
                        <TrendingDown className="w-5 h-5" style={{ color: 'var(--color-error-dark)' }} />
                      ) : (
                        <TrendingUp className="w-5 h-5" style={{ color: 'var(--color-success-dark)' }} />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base" style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}>
                          {variance.type}
                        </h3>
                        <div className="text-right">
                          <p className="text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Variance</p>
                          <p className="text-xl" style={{ 
                            color: isNegative ? 'var(--color-error-dark)' : 'var(--color-success-dark)',
                            fontWeight: '600'
                          }}>
                            {variance.variance >= 0 ? '+' : ''}{formatCurrency(variance.variance)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)' }}>
                        <div>
                          <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Forecast</p>
                          <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
                            {formatCurrency(variance.forecast)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Actual</p>
                          <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
                            {formatCurrency(variance.actual)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Difference</p>
                          <p className="text-sm" style={{ 
                            color: isNegative ? 'var(--color-error-dark)' : 'var(--color-success-dark)',
                            fontWeight: '600'
                          }}>
                            {variance.variance >= 0 ? '+' : ''}{formatCurrency(variance.variance)}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-start gap-2 mb-2">
                          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-teal)' }} />
                          <div>
                            <p className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600', margin: 0 }}>
                              AI Explanation:
                            </p>
                            <p className="text-sm mt-1" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
                              {variance.explanation}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Related Items:</p>
                        <div className="flex flex-wrap gap-2">
                          {variance.invoices.map((invoice) => (
                            <span key={invoice} className="px-2 py-1 rounded text-xs" 
                                  style={{ backgroundColor: 'var(--color-cloud)', color: 'var(--color-ink)' }}>
                              {invoice}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Learning Feedback */}
        <div className="mt-8 bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)' }}>
          <h3 className="text-base mb-4" style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}>
            AI Learning Feedback Loop
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--color-mercury-grey)' }}>
            The AI model learns from these variances to improve future forecasts. Key insights captured:
          </p>
          <ul className="text-sm space-y-2" style={{ color: 'var(--color-mercury-grey)', paddingLeft: '24px' }}>
            <li>Year-end collections typically delayed by 5-7 days across enterprise customers</li>
            <li>Early payment discounts &gt;1.5% trigger accelerated payments (positive ROI)</li>
            <li>Equipment maintenance variance averages ₹2-4 Cr annually</li>
            <li>GST payment timing can shift ±5 days during system maintenance periods</li>
          </ul>
        </div>

        {/* AI Insight */}
        <div className="mt-8 p-6 rounded-lg" style={{ backgroundColor: 'var(--color-teal-tint)', border: '1px solid var(--color-teal)' }}>
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 mt-0.5" style={{ color: 'var(--color-teal)' }} />
            <div>
              <h4 className="text-sm mb-2" style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}>
                Forecast Accuracy Improving
              </h4>
              <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
                This week's variance of -₹1.5 Cr (2.1%) is within acceptable range. The AI model has incorporated
                year-end payment patterns and will reflect this in future Q4 forecasts. Expected accuracy improvement: +8%.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}