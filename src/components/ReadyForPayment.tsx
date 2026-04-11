import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, Calendar, Building2, FileText, Search, Filter,
  CheckCircle, Clock, TrendingUp, ArrowRight, Eye, Zap
} from 'lucide-react';

interface ApprovedInvoice {
  id: string;
  invoiceNumber: string;
  vendorName: string;
  vendorCode: string;
  poNumber: string;
  approvedDate: string;
  netPayable: number;
  dueDate: string;
  daysUntilDue: number;
  aiPriority: 'High' | 'Medium' | 'Low';
  msmeVendor: boolean;
  advanceAdjustment?: number;
  paymentMethod: string;
}

export function ReadyForPayment() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);

  // Mock data
  const [invoices] = useState<ApprovedInvoice[]>([
    {
      id: 'INV-002',
      invoiceNumber: 'INV-2024-00124',
      vendorName: 'ABC Manufacturing Ltd',
      vendorCode: 'VEN-1002',
      poNumber: 'PO-2024-002',
      approvedDate: '2024-12-12',
      netPayable: 385000,
      dueDate: '2025-01-07',
      daysUntilDue: 26,
      aiPriority: 'Medium',
      msmeVendor: false,
      paymentMethod: 'NEFT'
    },
    {
      id: 'INV-005',
      invoiceNumber: 'INV-2024-00127',
      vendorName: 'Tech Solutions Pvt Ltd',
      vendorCode: 'VEN-1001',
      poNumber: 'PO-2024-005',
      approvedDate: '2024-12-13',
      netPayable: 200000,
      dueDate: '2025-01-12',
      daysUntilDue: 31,
      aiPriority: 'Low',
      msmeVendor: true,
      advanceAdjustment: 50000,
      paymentMethod: 'RTGS'
    },
    {
      id: 'INV-006',
      invoiceNumber: 'INV-2024-00128',
      vendorName: 'Global Suppliers Co',
      vendorCode: 'VEN-1004',
      poNumber: 'PO-2024-006',
      approvedDate: '2024-12-11',
      netPayable: 495000,
      dueDate: '2024-12-18',
      daysUntilDue: 5,
      aiPriority: 'High',
      msmeVendor: true,
      paymentMethod: 'RTGS'
    },
    {
      id: 'INV-007',
      invoiceNumber: 'INV-2024-00129',
      vendorName: 'XYZ Services Inc',
      vendorCode: 'VEN-1003',
      poNumber: 'PO-2024-007',
      approvedDate: '2024-12-14',
      netPayable: 91800,
      dueDate: '2025-01-13',
      daysUntilDue: 32,
      aiPriority: 'Low',
      msmeVendor: false,
      paymentMethod: 'NEFT'
    }
  ]);

  const getPriorityStyle = (priority: ApprovedInvoice['aiPriority']) => {
    const styles = {
      'High': { bg: 'var(--color-error-light)', color: 'var(--color-error-dark)' },
      'Medium': { bg: '#FEF3C7', color: '#D97706' },
      'Low': { bg: '#D1FAE5', color: '#047857' }
    };
    return styles[priority];
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.poNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = priorityFilter === 'All' || inv.aiPriority === priorityFilter;
    
    return matchesSearch && matchesPriority;
  }).sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  // Stats
  const totalPayable = invoices.reduce((sum, inv) => sum + inv.netPayable, 0);
  const dueSoon = invoices.filter(i => i.daysUntilDue <= 7).length;
  const msmeCount = invoices.filter(i => i.msmeVendor).length;

  const stats = [
    { 
      label: 'Ready for Payment', 
      value: invoices.length, 
      icon: FileText, 
      color: 'var(--color-teal)',
      bg: 'var(--color-teal)10'
    },
    { 
      label: 'Total Payable', 
      value: `₹${(totalPayable / 100000).toFixed(1)}L`, 
      icon: DollarSign, 
      color: 'var(--color-teal)',
      bg: 'var(--color-teal)10'
    },
    { 
      label: 'Due in 7 Days', 
      value: dueSoon, 
      icon: Clock, 
      color: '#D97706',
      bg: '#FEF3C7'
    },
    { 
      label: 'MSME Vendors', 
      value: msmeCount, 
      icon: TrendingUp, 
      color: '#007D87',
      bg: '#EDE9FE'
    }
  ];

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }} className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl mb-2" style={{ color: 'var(--color-ink)' }}>Ready for Payment</h1>
        <p style={{ color: 'var(--color-mercury-grey)' }}>Approved invoices queued for payment processing</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl p-4 border-2" style={{ borderColor: 'var(--color-silver)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>{stat.label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: stat.bg }}>
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
            </div>
            <p className="text-2xl" style={{ color: 'var(--color-ink)' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Info Banner */}
      <div className="bg-white rounded-xl border-2 p-4 mb-6" style={{ borderColor: 'var(--color-teal)', backgroundColor: 'var(--color-teal)10' }}>
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 flex-shrink-0 mt-0.5 text-[var(--color-teal)]" />
          <div className="flex-1">
            <h3 className="mb-1" style={{ color: 'var(--color-teal)' }}>Automatic Payment Queue</h3>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
              These approved invoices have been automatically transferred to the Payments module. 
              Visit the Payments Dashboard to create payment batches and process payments.
            </p>
          </div>
          <button
            onClick={() => navigate('/ap/payments')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
            style={{ backgroundColor: 'var(--color-teal)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
          >
            Go to Payments
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border-2 mb-4" style={{ borderColor: 'var(--color-silver)' }}>
        <div className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-mercury-grey)' }} />
              <input
                type="text"
                placeholder="Search by invoice number, vendor, or PO..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border-2"
                style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors"
              style={{ 
                borderColor: showFilters ? 'var(--color-teal)' : 'var(--color-silver)',
                backgroundColor: showFilters ? 'var(--color-teal)10' : 'white',
                color: showFilters ? 'var(--color-teal)' : 'var(--color-mercury-grey)'
              }}
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t-2" style={{ borderColor: 'var(--color-silver)' }}>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>AI Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2"
                  style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
                >
                  <option>All</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border-2 overflow-hidden" style={{ borderColor: 'var(--color-silver)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
              <tr>
                <th className="text-left px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Invoice Number</th>
                <th className="text-left px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Vendor</th>
                <th className="text-left px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>PO Number</th>
                <th className="text-left px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Due Date</th>
                <th className="text-right px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Net Payable</th>
                <th className="text-center px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>AI Priority</th>
                <th className="text-left px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Payment Method</th>
                <th className="text-right px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => {
                const priorityStyle = getPriorityStyle(invoice.aiPriority);
                const isDueSoon = invoice.daysUntilDue <= 7;

                return (
                  <tr 
                    key={invoice.id} 
                    className="border-t-2 hover:bg-[var(--color-cloud)] transition-colors"
                    style={{ borderColor: 'var(--color-silver)' }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[var(--color-teal)]" />
                        <div>
                          <p style={{ color: 'var(--color-ink)' }}>{invoice.invoiceNumber}</p>
                          <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                            Approved: {invoice.approvedDate}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                        <div>
                          <p style={{ color: 'var(--color-ink)' }}>{invoice.vendorName}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>{invoice.vendorCode}</p>
                            {invoice.msmeVendor && (
                              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#EDE9FE', color: '#007D87' }}>
                                MSME
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{invoice.poNumber}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" style={{ color: isDueSoon ? 'var(--color-error-dark)' : 'var(--color-mercury-grey)' }} />
                        <div>
                          <p style={{ color: isDueSoon ? 'var(--color-error-dark)' : 'var(--color-ink)' }}>{invoice.dueDate}</p>
                          <p className="text-xs" style={{ color: isDueSoon ? 'var(--color-error-dark)' : 'var(--color-mercury-grey)' }}>
                            {invoice.daysUntilDue} days
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div>
                        <p style={{ color: 'var(--color-ink)' }}>₹{invoice.netPayable.toLocaleString('en-IN')}</p>
                        {invoice.advanceAdjustment && (
                          <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                            Advance: ₹{invoice.advanceAdjustment.toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span 
                        className="inline-block px-3 py-1 rounded-full text-sm"
                        style={{ backgroundColor: priorityStyle.bg, color: priorityStyle.color }}
                      >
                        {invoice.aiPriority}
                      </span>
                    </td>
                    <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{invoice.paymentMethod}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/ap/invoice-workflow/${invoice.id}`)}
                          className="p-2 rounded-lg hover:bg-[var(--color-silver)] transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                        </button>
                        <button
                          onClick={() => navigate('/ap/payments')}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm text-white transition-colors"
                          style={{ backgroundColor: 'var(--color-teal)' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
                        >
                          Process
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-silver)' }} />
            <p style={{ color: 'var(--color-mercury-grey)' }}>No invoices ready for payment</p>
          </div>
        )}
      </div>
    </div>
  );
}