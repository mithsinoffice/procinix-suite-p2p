import { TrendingUp, Calendar, DollarSign, BarChart3 } from 'lucide-react';

export function RevenueRecognition() {
  const formatCurrency = (amount: number) => `₹${(amount / 10000000).toFixed(2)} Cr`;

  const revenueSchedules = [
    { id: 'REV-001', invoice: 'INV-2024-001', customer: 'Reliance Industries Ltd', totalRevenue: 8500000, recognized: 8500000, deferred: 0, rule: 'On Invoice', status: 'Recognized' },
    { id: 'REV-002', invoice: 'INV-2024-006', customer: 'Wipro Limited', totalRevenue: 24000000, recognized: 8000000, deferred: 16000000, rule: 'Over Time (12M)', status: 'In Progress' },
    { id: 'REV-003', invoice: 'INV-2024-008', customer: 'Tata Motors Limited', totalRevenue: 15000000, recognized: 0, deferred: 15000000, rule: 'Milestone-Based', status: 'Pending' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Recognized': return { bg: 'var(--color-success-light)', color: 'var(--color-success-dark)' };
      case 'In Progress': return { bg: 'var(--color-teal-tint)', color: 'var(--color-teal)' };
      case 'Pending': return { bg: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' };
      default: return { bg: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' };
    }
  };

  const stats = {
    totalRevenue: revenueSchedules.reduce((s, r) => s + r.totalRevenue, 0),
    recognized: revenueSchedules.reduce((s, r) => s + r.recognized, 0),
    deferred: revenueSchedules.reduce((s, r) => s + r.deferred, 0)
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl mb-2" style={{ color: 'var(--color-ink)', margin: 0 }}>Revenue Recognition</h1>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>Manage revenue recognition schedules and rules</p>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--color-teal-tint)' }}>
              <DollarSign className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
            </div>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Total Revenue</p>
            <p className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{formatCurrency(stats.totalRevenue)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--color-success-light)' }}>
              <TrendingUp className="w-5 h-5" style={{ color: 'var(--color-success-dark)' }} />
            </div>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Recognized</p>
            <p className="text-2xl" style={{ color: 'var(--color-success-dark)', fontWeight: '600' }}>{formatCurrency(stats.recognized)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--color-warning-light)' }}>
              <Calendar className="w-5 h-5" style={{ color: 'var(--color-warning-dark)' }} />
            </div>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Deferred</p>
            <p className="text-2xl" style={{ color: 'var(--color-warning-dark)', fontWeight: '600' }}>{formatCurrency(stats.deferred)}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
          <div className="p-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
            <h3 className="text-base" style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}>Revenue Schedules</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Schedule ID</th>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Invoice</th>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Customer</th>
                  <th className="px-6 py-3 text-right text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Total Revenue</th>
                  <th className="px-6 py-3 text-right text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Recognized</th>
                  <th className="px-6 py-3 text-right text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Deferred</th>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Rule</th>
                  <th className="px-6 py-3 text-center text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-silver)' }}>
                {revenueSchedules.map((rev) => {
                  const statusStyle = getStatusColor(rev.status);
                  return (
                    <tr key={rev.id}>
                      <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{rev.id}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-teal)' }}>{rev.invoice}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-ink)' }}>{rev.customer}</td>
                      <td className="px-6 py-4 text-sm text-right" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{formatCurrency(rev.totalRevenue)}</td>
                      <td className="px-6 py-4 text-sm text-right" style={{ color: 'var(--color-success-dark)', fontWeight: '600' }}>{formatCurrency(rev.recognized)}</td>
                      <td className="px-6 py-4 text-sm text-right" style={{ color: 'var(--color-warning-dark)', fontWeight: '600' }}>{formatCurrency(rev.deferred)}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>{rev.rule}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 rounded text-xs inline-block" style={statusStyle}>{rev.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
