import { GitCompare, Sparkles, ArrowRight, Info, Download } from 'lucide-react';

/**
 * HYBRID RECONCILIATION
 * 
 * Purpose: Reconcile Direct (bank) vs Indirect (accounting) cash flows
 * This is THE DIFFERENTIATOR - explains why bank cash ≠ accounting cash
 */

export function HybridReconciliation() {
  const formatCurrency = (amount: number) => {
    const crore = amount / 10000000;
    return `₹${crore.toFixed(2)} Cr`;
  };

  return (
    <div style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      {/* PAGE HEADER */}
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl" style={{ color: '#0A0F14', margin: 0 }}>
                Hybrid Reconciliation
              </h1>
              <span 
                className="px-3 py-1 rounded-full text-sm"
                style={{ backgroundColor: '#FFF3E0', color: '#F57C00', border: '1px solid #FFB74D' }}
              >
                DIRECT ↔ INDIRECT
              </span>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ backgroundColor: '#F6F9FC' }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: '#00A9B7' }} />
                <span className="text-xs" style={{ color: '#6E7A82' }}>CFO Trust Builder</span>
              </div>
            </div>
            <p className="text-sm" style={{ color: '#6E7A82', margin: 0 }}>
              Explain why bank cash ≠ accounting cash • Timing vs permanent differences
            </p>
          </div>
          <button className="px-4 py-2 rounded-lg text-white transition-colors" style={{ backgroundColor: '#00A9B7' }}>
            <Download className="w-4 h-4 inline mr-2" />
            Export Reconciliation
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-8">
        {/* Reconciliation Flow */}
        <div className="bg-white rounded-lg p-8" style={{ border: '1px solid #E1E6EA' }}>
          <h3 className="text-base mb-6" style={{ color: '#0A0F14', margin: 0 }}>
            Cash Flow Reconciliation (December 2024)
          </h3>

          <div className="space-y-4">
            {/* Starting Cash (Bank) */}
            <div className="flex items-center justify-between p-6 rounded-lg" style={{ backgroundColor: '#E8F5E9', border: '2px solid #81C784' }}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#2E7D32' }} />
                <div>
                  <p className="text-sm" style={{ color: '#0A0F14', fontWeight: '600', margin: 0 }}>
                    Starting Cash (Bank - Direct)
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#6E7A82', margin: 0 }}>
                    Actual bank balance as of Dec 1, 2024
                  </p>
                </div>
              </div>
              <p className="text-2xl" style={{ color: '#2E7D32', fontWeight: '600' }}>
                {formatCurrency(74620000)}
              </p>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6" style={{ color: '#6E7A82' }} />
            </div>

            {/* Net Indirect Cash Flow */}
            <div className="flex items-center justify-between p-6 rounded-lg" style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#00A9B7' }} />
                <div>
                  <p className="text-sm" style={{ color: '#0A0F14', fontWeight: '600', margin: 0 }}>
                    + Net Indirect Cash Flow
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#6E7A82', margin: 0 }}>
                    From P&L: Net Profit - WC Change - Capex
                  </p>
                </div>
              </div>
              <p className="text-2xl" style={{ color: '#2E7D32', fontWeight: '600' }}>
                +{formatCurrency(8500000)}
              </p>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6" style={{ color: '#6E7A82' }} />
            </div>

            {/* Timing Differences */}
            <div className="flex items-center justify-between p-6 rounded-lg" style={{ backgroundColor: '#FFF3E0', border: '1px solid #FFB74D' }}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F57C00' }} />
                <div>
                  <p className="text-sm" style={{ color: '#0A0F14', fontWeight: '600', margin: 0 }}>
                    ± Timing Differences (AP/AR Execution)
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#6E7A82', margin: 0 }}>
                    Invoices booked but not yet paid/collected
                  </p>
                </div>
              </div>
              <p className="text-2xl" style={{ color: '#DC2626', fontWeight: '600' }}>
                -{formatCurrency(3200000)}
              </p>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6" style={{ color: '#6E7A82' }} />
            </div>

            {/* Manual Adjustments */}
            <div className="flex items-center justify-between p-6 rounded-lg" style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#6E7A82' }} />
                <div>
                  <p className="text-sm" style={{ color: '#0A0F14', fontWeight: '600', margin: 0 }}>
                    ± Manual Adjustments
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#6E7A82', margin: 0 }}>
                    Bank charges, forex differences, etc.
                  </p>
                </div>
              </div>
              <p className="text-2xl" style={{ color: '#DC2626', fontWeight: '600' }}>
                -{formatCurrency(200000)}
              </p>
            </div>

            <div className="flex justify-center">
              <div className="w-full border-t-2" style={{ borderColor: '#E1E6EA', margin: '20px 0' }} />
            </div>

            {/* Ending Cash */}
            <div className="flex items-center justify-between p-6 rounded-lg" style={{ backgroundColor: '#E8F7F8', border: '2px solid #00A9B7' }}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#00A9B7' }} />
                <div>
                  <p className="text-sm" style={{ color: '#0A0F14', fontWeight: '600', margin: 0 }}>
                    = Ending Cash (Forecasted Bank)
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#6E7A82', margin: 0 }}>
                    Expected bank balance as of Dec 31, 2024
                  </p>
                </div>
              </div>
              <p className="text-2xl" style={{ color: '#00A9B7', fontWeight: '600' }}>
                {formatCurrency(79720000)}
              </p>
            </div>
          </div>
        </div>

        {/* Drill-Down Section */}
        <div className="grid grid-cols-2 gap-6 mt-8">
          {/* Timing Differences Breakdown */}
          <div className="bg-white rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
            <div className="p-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
              <h4 className="text-sm" style={{ color: '#0A0F14', margin: 0, fontWeight: '600' }}>
                Timing Differences Breakdown
              </h4>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: '#6E7A82' }}>AP Invoices booked not paid</span>
                <span className="text-sm" style={{ color: '#DC2626', fontWeight: '600' }}>-{formatCurrency(2100000)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: '#6E7A82' }}>AR Collections delayed</span>
                <span className="text-sm" style={{ color: '#DC2626', fontWeight: '600' }}>-{formatCurrency(900000)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: '#6E7A82' }}>Payroll accrued not paid</span>
                <span className="text-sm" style={{ color: '#DC2626', fontWeight: '600' }}>-{formatCurrency(200000)}</span>
              </div>
            </div>
          </div>

          {/* Permanent vs Timing */}
          <div className="bg-white rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
            <div className="p-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
              <h4 className="text-sm" style={{ color: '#0A0F14', margin: 0, fontWeight: '600' }}>
                Difference Classification
              </h4>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: '#6E7A82' }}>Timing Differences</span>
                  <Info className="w-3.5 h-3.5" style={{ color: '#6E7A82' }} />
                </div>
                <span className="text-sm" style={{ color: '#F57C00', fontWeight: '600' }}>
                  {formatCurrency(3200000)} (91%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: '#6E7A82' }}>Permanent Differences</span>
                  <Info className="w-3.5 h-3.5" style={{ color: '#6E7A82' }} />
                </div>
                <span className="text-sm" style={{ color: '#DC2626', fontWeight: '600' }}>
                  {formatCurrency(200000)} (9%)
                </span>
              </div>
              <p className="text-xs mt-4 p-3 rounded" style={{ backgroundColor: '#F6F9FC', color: '#6E7A82', margin: 0 }}>
                Timing differences will eventually convert to cash. Permanent differences will not.
              </p>
            </div>
          </div>
        </div>

        {/* AI Insight */}
        <div className="mt-8 p-6 rounded-lg" style={{ backgroundColor: '#E8F7F8', border: '1px solid #00A9B7' }}>
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 mt-0.5" style={{ color: '#00A9B7' }} />
            <div>
              <h4 className="text-sm mb-2" style={{ color: '#0A0F14', margin: 0, fontWeight: '600' }}>
                CFO Insight: Reconciliation Health
              </h4>
              <p className="text-sm" style={{ color: '#6E7A82', margin: 0 }}>
                91% of differences are timing-related and will resolve naturally. The ₹3.2 Cr timing gap is within normal range for your business cycle.
                Monitor AR aging to ensure collections convert to cash within forecast period.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
