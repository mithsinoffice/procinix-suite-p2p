import { FileMinus, Plus, CheckCircle, Clock, X } from 'lucide-react';

export function CreditNotes() {
  const formatCurrency = (amount: number) => `₹${(amount / 10000000).toFixed(2)} Cr`;

  const creditNotes = [
    { id: 'CN-2024-001', invoice: 'INV-2024-001', customer: 'Reliance Industries Ltd', amount: 500000, reason: 'Pricing Error', status: 'Approved', date: '2024-12-10' },
    { id: 'CN-2024-002', invoice: 'INV-2024-003', customer: 'Larsen & Toubro Ltd', amount: 280000, reason: 'Product Return', status: 'Pending Approval', date: '2024-12-12' },
    { id: 'CN-2024-003', invoice: 'INV-2024-005', customer: 'Wipro Limited', amount: 150000, reason: 'Discount Adjustment', status: 'Approved', date: '2024-12-08' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return { bg: '#E8F5E9', color: '#2E7D32' };
      case 'Pending Approval': return { bg: '#FFF3E0', color: '#F57C00' };
      case 'Rejected': return { bg: '#FEE2E2', color: '#DC2626' };
      default: return { bg: '#F6F9FC', color: '#6E7A82' };
    }
  };

  return (
    <div style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl mb-2" style={{ color: '#0A0F14', margin: 0 }}>Credit Notes</h1>
            <p className="text-sm" style={{ color: '#6E7A82', margin: 0 }}>Manage credit notes with approval workflows</p>
          </div>
          <button className="px-4 py-2 rounded-lg text-white" style={{ backgroundColor: '#00A9B7' }}>
            <Plus className="w-4 h-4 inline mr-2" />
            Create Credit Note
          </button>
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
            <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>Total Credit Notes</p>
            <p className="text-2xl" style={{ color: '#0A0F14', fontWeight: '600' }}>{creditNotes.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
            <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>Total Value</p>
            <p className="text-2xl" style={{ color: '#DC2626', fontWeight: '600' }}>{formatCurrency(creditNotes.reduce((s, c) => s + c.amount, 0))}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
            <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>Pending Approval</p>
            <p className="text-2xl" style={{ color: '#F57C00', fontWeight: '600' }}>
              {creditNotes.filter(c => c.status === 'Pending Approval').length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
          <div className="p-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
            <h3 className="text-base" style={{ color: '#0A0F14', margin: 0, fontWeight: '600' }}>Credit Notes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: '#F6F9FC' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Credit Note #</th>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Invoice</th>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Customer</th>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Reason</th>
                  <th className="px-6 py-3 text-right text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Amount</th>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Date</th>
                  <th className="px-6 py-3 text-center text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#E1E6EA' }}>
                {creditNotes.map((cn) => {
                  const statusStyle = getStatusColor(cn.status);
                  return (
                    <tr key={cn.id}>
                      <td className="px-6 py-4 text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>{cn.id}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: '#00A9B7' }}>{cn.invoice}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: '#0A0F14' }}>{cn.customer}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: '#6E7A82' }}>{cn.reason}</td>
                      <td className="px-6 py-4 text-sm text-right" style={{ color: '#DC2626', fontWeight: '600' }}>{formatCurrency(cn.amount)}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: '#6E7A82' }}>{cn.date}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 rounded text-xs inline-block" style={statusStyle}>{cn.status}</span>
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
