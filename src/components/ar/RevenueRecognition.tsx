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
      case 'Recognized': return { bg: '#E8F5E9', color: '#2E7D32' };
      case 'In Progress': return { bg: '#E8F7F8', color: '#00A9B7' };
      case 'Pending': return { bg: '#FFF3E0', color: '#F57C00' };
      default: return { bg: '#F6F9FC', color: '#6E7A82' };
    }
  };

  const stats = {
    totalRevenue: revenueSchedules.reduce((s, r) => s + r.totalRevenue, 0),
    recognized: revenueSchedules.reduce((s, r) => s + r.recognized, 0),
    deferred: revenueSchedules.reduce((s, r) => s + r.deferred, 0)
  };

  return (
    <div style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl mb-2" style={{ color: '#0A0F14', margin: 0 }}>Revenue Recognition</h1>
            <p className="text-sm" style={{ color: '#6E7A82', margin: 0 }}>Manage revenue recognition schedules and rules</p>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: '#E8F7F8' }}>
              <DollarSign className="w-5 h-5" style={{ color: '#00A9B7' }} />
            </div>
            <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>Total Revenue</p>
            <p className="text-2xl" style={{ color: '#0A0F14', fontWeight: '600' }}>{formatCurrency(stats.totalRevenue)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: '#E8F5E9' }}>
              <TrendingUp className="w-5 h-5" style={{ color: '#2E7D32' }} />
            </div>
            <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>Recognized</p>
            <p className="text-2xl" style={{ color: '#2E7D32', fontWeight: '600' }}>{formatCurrency(stats.recognized)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: '#FFF3E0' }}>
              <Calendar className="w-5 h-5" style={{ color: '#F57C00' }} />
            </div>
            <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>Deferred</p>
            <p className="text-2xl" style={{ color: '#F57C00', fontWeight: '600' }}>{formatCurrency(stats.deferred)}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
          <div className="p-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
            <h3 className="text-base" style={{ color: '#0A0F14', margin: 0, fontWeight: '600' }}>Revenue Schedules</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: '#F6F9FC' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Schedule ID</th>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Invoice</th>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Customer</th>
                  <th className="px-6 py-3 text-right text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Total Revenue</th>
                  <th className="px-6 py-3 text-right text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Recognized</th>
                  <th className="px-6 py-3 text-right text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Deferred</th>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Rule</th>
                  <th className="px-6 py-3 text-center text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#E1E6EA' }}>
                {revenueSchedules.map((rev) => {
                  const statusStyle = getStatusColor(rev.status);
                  return (
                    <tr key={rev.id}>
                      <td className="px-6 py-4 text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>{rev.id}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: '#00A9B7' }}>{rev.invoice}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: '#0A0F14' }}>{rev.customer}</td>
                      <td className="px-6 py-4 text-sm text-right" style={{ color: '#0A0F14', fontWeight: '600' }}>{formatCurrency(rev.totalRevenue)}</td>
                      <td className="px-6 py-4 text-sm text-right" style={{ color: '#2E7D32', fontWeight: '600' }}>{formatCurrency(rev.recognized)}</td>
                      <td className="px-6 py-4 text-sm text-right" style={{ color: '#F57C00', fontWeight: '600' }}>{formatCurrency(rev.deferred)}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: '#6E7A82' }}>{rev.rule}</td>
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
