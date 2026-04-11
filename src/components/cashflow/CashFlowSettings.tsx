import { Settings, Database, Shield, Bell, Save } from 'lucide-react';

/**
 * CASH FLOW SETTINGS & GOVERNANCE
 * 
 * Purpose: Configuration and governance controls for Cash Flow AI
 */

export function CashFlowSettings() {
  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl mb-2" style={{ color: 'var(--color-ink)', margin: 0 }}>Settings & Governance</h1>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
              Configure data sources, rules, and approval workflows for Cash Flow AI
            </p>
          </div>
          <button className="px-4 py-2 rounded-lg text-white transition-colors" style={{ backgroundColor: 'var(--color-teal)' }}>
            <Save className="w-4 h-4 inline mr-2" />
            Save All Changes
          </button>
        </div>
      </div>

      <div className="p-8">
        <div className="space-y-6">
          {/* Data Source Mapping */}
          <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="p-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
                <h3 className="text-base" style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}>
                  Data Source Mapping
                </h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm mb-2 block" style={{ color: 'var(--color-mercury-grey)' }}>Bank Feed Integration</label>
                  <select className="w-full px-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)', backgroundColor: '#FFFFFF' }}>
                    <option>HDFC Bank API (Connected)</option>
                    <option>ICICI Bank API (Connected)</option>
                    <option>DBS Bank API (Connected)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm mb-2 block" style={{ color: 'var(--color-mercury-grey)' }}>ERP System</label>
                  <select className="w-full px-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)', backgroundColor: '#FFFFFF' }}>
                    <option>SAP S/4HANA (Connected)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm mb-2 block" style={{ color: 'var(--color-mercury-grey)' }}>Payroll System</label>
                  <select className="w-full px-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)', backgroundColor: '#FFFFFF' }}>
                    <option>Workday (Connected)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm mb-2 block" style={{ color: 'var(--color-mercury-grey)' }}>Tax System</label>
                  <select className="w-full px-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)', backgroundColor: '#FFFFFF' }}>
                    <option>GSTN Portal (Connected)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Cash Categorization Rules */}
          <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="p-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
              <h3 className="text-base" style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}>
                Cash Categorization Rules
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm mb-2 block" style={{ color: 'var(--color-mercury-grey)' }}>Minimum Cash Buffer (INR)</label>
                <input 
                  type="text" 
                  defaultValue="5,00,00,000"
                  className="w-full px-3 py-2 rounded-lg" 
                  style={{ border: '1px solid var(--color-silver)', backgroundColor: '#FFFFFF' }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>₹5 Cr minimum across all entities</p>
              </div>
              <div>
                <label className="text-sm mb-2 block" style={{ color: 'var(--color-mercury-grey)' }}>AI Confidence Threshold (%)</label>
                <input 
                  type="range" 
                  min="50" 
                  max="95" 
                  defaultValue="75"
                  className="w-full"
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
                  <span>50%</span>
                  <span>75% (current)</span>
                  <span>95%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Approval Matrix */}
          <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="p-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
                <h3 className="text-base" style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}>
                  Approval Matrix for AI Actions
                </h3>
              </div>
            </div>
            <div className="p-6">
              <table className="w-full">
                <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Action Type</th>
                    <th className="px-4 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Threshold</th>
                    <th className="px-4 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Required Approver</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-silver)' }}>
                  <tr>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-ink)' }}>Collection Acceleration</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>&gt; ₹2 Cr</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>CFO</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-ink)' }}>Payment Deferral</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>&gt; ₹5 Cr</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>CFO + AP Head</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-ink)' }}>Overdraft Trigger</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Any Amount</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>CFO + Treasury Head</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-ink)' }}>Intercompany Transfer</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>&gt; ₹1 Cr</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>CFO + Tax Head</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="p-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
                <h3 className="text-base" style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}>
                  Alert Notifications
                </h3>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm" style={{ color: 'var(--color-ink)' }}>Cash below buffer threshold</label>
                <input type="checkbox" defaultChecked className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm" style={{ color: 'var(--color-ink)' }}>Large variance (forecast vs actual)</label>
                <input type="checkbox" defaultChecked className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm" style={{ color: 'var(--color-ink)' }}>Collection delays {'>'} 7 days</label>
                <input type="checkbox" defaultChecked className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm" style={{ color: 'var(--color-ink)' }}>AI action recommendations</label>
                <input type="checkbox" defaultChecked className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Role-Based Access */}
          <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="p-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
              <h3 className="text-base" style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}>
                Role-Based Access Control
              </h3>
            </div>
            <div className="p-6">
              <table className="w-full">
                <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Role</th>
                    <th className="px-4 py-3 text-center text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>View</th>
                    <th className="px-4 py-3 text-center text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Forecast</th>
                    <th className="px-4 py-3 text-center text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Approve Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-silver)' }}>
                  <tr>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-ink)' }}>CFO</td>
                    <td className="px-4 py-3 text-center"><span style={{ color: 'var(--color-success-dark)' }}>✓</span></td>
                    <td className="px-4 py-3 text-center"><span style={{ color: 'var(--color-success-dark)' }}>✓</span></td>
                    <td className="px-4 py-3 text-center"><span style={{ color: 'var(--color-success-dark)' }}>✓</span></td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-ink)' }}>Treasury Manager</td>
                    <td className="px-4 py-3 text-center"><span style={{ color: 'var(--color-success-dark)' }}>✓</span></td>
                    <td className="px-4 py-3 text-center"><span style={{ color: 'var(--color-success-dark)' }}>✓</span></td>
                    <td className="px-4 py-3 text-center"><span style={{ color: 'var(--color-error-dark)' }}>✗</span></td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-ink)' }}>AP Analyst</td>
                    <td className="px-4 py-3 text-center"><span style={{ color: 'var(--color-success-dark)' }}>✓</span></td>
                    <td className="px-4 py-3 text-center"><span style={{ color: 'var(--color-error-dark)' }}>✗</span></td>
                    <td className="px-4 py-3 text-center"><span style={{ color: 'var(--color-error-dark)' }}>✗</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}