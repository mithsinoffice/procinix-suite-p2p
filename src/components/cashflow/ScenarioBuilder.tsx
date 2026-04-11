import { Target, Plus, Sparkles, Download } from 'lucide-react';

/**
 * SCENARIO BUILDER
 * 
 * Purpose: Test "what-if" scenarios on both Direct and Indirect cash flows
 */

export function ScenarioBuilder() {
  const formatCurrency = (amount: number) => {
    const crore = amount / 10000000;
    return `₹${crore.toFixed(2)} Cr`;
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl" style={{ color: 'var(--color-ink)', margin: 0 }}>Scenario Builder</h1>
              <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning-dark)', border: '1px solid #FFB74D' }}>
                HYBRID SCENARIOS
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
              Test what-if scenarios on DSO, DPO, revenue growth, capex timing
            </p>
          </div>
          <button className="px-4 py-2 rounded-lg text-white" style={{ backgroundColor: 'var(--color-teal)' }}>
            <Plus className="w-4 h-4 inline mr-2" />
            Create New Scenario
          </button>
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-3 gap-6 mb-8">
          {['Base Case', 'Scenario A: Accelerate Collections', 'Scenario B: Defer Capex'].map((scenario, idx) => (
            <div key={scenario} className="bg-white rounded-lg p-6" style={{ border: idx === 0 ? '2px solid var(--color-teal)' : '1px solid var(--color-silver)' }}>
              <h3 className="text-sm mb-4" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{scenario}</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>13-Week Ending Cash</p>
                  <p className="text-xl" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                    {formatCurrency(61920000 + (idx * 5000000))}
                  </p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Cash Runway</p>
                  <p className="text-base" style={{ color: 'var(--color-ink)' }}>
                    {18 + idx} months
                  </p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Buffer Breaches</p>
                  <p className="text-base" style={{ color: idx === 0 ? 'var(--color-error-dark)' : 'var(--color-success-dark)' }}>
                    {idx === 0 ? '1 week' : '0 weeks'}
                  </p>
                </div>
              </div>
              {idx > 0 && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-silver)' }}>
                  <p className="text-xs" style={{ color: 'var(--color-teal)', fontWeight: '600' }}>
                    Impact vs Base: +{formatCurrency(idx * 5000000)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg p-8" style={{ border: '1px solid var(--color-silver)' }}>
          <h3 className="text-base mb-6" style={{ color: 'var(--color-ink)', margin: 0 }}>Scenario Controls</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm mb-2 block" style={{ color: 'var(--color-mercury-grey)' }}>Days Sales Outstanding (DSO)</label>
              <input type="range" min="30" max="90" defaultValue="52" className="w-full" />
              <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
                <span>30 days</span>
                <span>52 days (current)</span>
                <span>90 days</span>
              </div>
            </div>
            <div>
              <label className="text-sm mb-2 block" style={{ color: 'var(--color-mercury-grey)' }}>Days Payable Outstanding (DPO)</label>
              <input type="range" min="15" max="60" defaultValue="35" className="w-full" />
              <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
                <span>15 days</span>
                <span>35 days (current)</span>
                <span>60 days</span>
              </div>
            </div>
          </div>

          <div className="mt-8 p-6 rounded-lg" style={{ backgroundColor: 'var(--color-teal-tint)', border: '1px solid var(--color-teal)' }}>
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 mt-0.5" style={{ color: 'var(--color-teal)' }} />
              <div>
                <h4 className="text-sm mb-2" style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}>
                  AI Recommendation
                </h4>
                <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
                  Reducing DSO from 52 to 45 days would free up ₹4.2 Cr in cash and eliminate buffer breach in Week 7.
                  Focus on top 5 customers with overdue invoices.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
