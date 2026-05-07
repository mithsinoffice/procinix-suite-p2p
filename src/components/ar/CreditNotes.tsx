import { FileMinus, Plus, CheckCircle, Clock, X } from 'lucide-react';

export function CreditNotes() {
  const formatCurrency = (amount: number) => `₹${(amount / 10000000).toFixed(2)} Cr`;

  const creditNotes = [
    {
      id: 'CN-2024-001',
      invoice: 'INV-2024-001',
      customer: 'Reliance Industries Ltd',
      amount: 500000,
      reason: 'Pricing Error',
      status: 'Approved',
      date: '2024-12-10',
    },
    {
      id: 'CN-2024-002',
      invoice: 'INV-2024-003',
      customer: 'Larsen & Toubro Ltd',
      amount: 280000,
      reason: 'Product Return',
      status: 'Pending Approval',
      date: '2024-12-12',
    },
    {
      id: 'CN-2024-003',
      invoice: 'INV-2024-005',
      customer: 'Wipro Limited',
      amount: 150000,
      reason: 'Discount Adjustment',
      status: 'Approved',
      date: '2024-12-08',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return { bg: 'var(--color-success-light)', color: 'var(--color-success-dark)' };
      case 'Pending Approval':
        return { bg: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' };
      case 'Rejected':
        return { bg: 'var(--color-error-light)', color: 'var(--color-error-dark)' };
      default:
        return { bg: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' };
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl mb-2" style={{ color: 'var(--color-ink)', margin: 0 }}>
              Credit Notes
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
              Manage credit notes with approval workflows
            </p>
          </div>
          <button
            className="px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: 'var(--color-teal)' }}
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Create Credit Note
          </button>
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div
            className="bg-white p-6 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Total Credit Notes
            </p>
            <p className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
              {creditNotes.length}
            </p>
          </div>
          <div
            className="bg-white p-6 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Total Value
            </p>
            <p className="text-2xl" style={{ color: 'var(--color-error-dark)', fontWeight: '600' }}>
              {formatCurrency(creditNotes.reduce((s, c) => s + c.amount, 0))}
            </p>
          </div>
          <div
            className="bg-white p-6 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Pending Approval
            </p>
            <p
              className="text-2xl"
              style={{ color: 'var(--color-warning-dark)', fontWeight: '600' }}
            >
              {creditNotes.filter((c) => c.status === 'Pending Approval').length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
          <div className="p-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
            <h3
              className="text-base"
              style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}
            >
              Credit Notes
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                  >
                    Credit Note #
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                  >
                    Invoice
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                  >
                    Customer
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                  >
                    Reason
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                  >
                    Amount
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                  >
                    Date
                  </th>
                  <th
                    className="px-6 py-3 text-center text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-silver)' }}>
                {creditNotes.map((cn) => {
                  const statusStyle = getStatusColor(cn.status);
                  return (
                    <tr key={cn.id}>
                      <td
                        className="px-6 py-4 text-sm"
                        style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                      >
                        {cn.id}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-teal)' }}>
                        {cn.invoice}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-ink)' }}>
                        {cn.customer}
                      </td>
                      <td
                        className="px-6 py-4 text-sm"
                        style={{ color: 'var(--color-mercury-grey)' }}
                      >
                        {cn.reason}
                      </td>
                      <td
                        className="px-6 py-4 text-sm text-right"
                        style={{ color: 'var(--color-error-dark)', fontWeight: '600' }}
                      >
                        {formatCurrency(cn.amount)}
                      </td>
                      <td
                        className="px-6 py-4 text-sm"
                        style={{ color: 'var(--color-mercury-grey)' }}
                      >
                        {cn.date}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className="px-2 py-1 rounded text-xs inline-block"
                          style={statusStyle}
                        >
                          {cn.status}
                        </span>
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
