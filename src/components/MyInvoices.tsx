import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Filter, Search, Download, Eye, Edit2, Copy, 
  XCircle, AlertTriangle, CheckCircle, Clock, DollarSign,
  TrendingUp, Calendar, Building2
} from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: 'PO' | 'Non-PO'; // Added invoice type
  vendorName: string;
  vendorCode: string;
  poNumber?: string; // Now optional for Non-PO invoices
  invoiceDate: string;
  invoiceAmount: number;
  status: 'Draft' | 'Submitted' | 'In Review' | 'Approved' | 'Rejected' | 'On Hold' | 'Ready for Payment' | 'Paid';
  aiRisk: 'Low' | 'Medium' | 'High';
  paymentStatus: 'Pending' | 'Scheduled' | 'Paid';
  createdBy: string;
  createdDate: string;
  currentApprover?: string;
  daysInStatus: number;
}

export function MyInvoices() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [riskFilter, setRiskFilter] = useState<string>('All');
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<string>('All'); // Added invoice type filter
  const [showFilters, setShowFilters] = useState(false);

  // Mock data - would come from backend
  const [invoices] = useState<Invoice[]>([
    {
      id: 'INV-001',
      invoiceNumber: 'INV-2024-00123',
      invoiceType: 'PO',
      vendorName: 'Tech Solutions Pvt Ltd',
      vendorCode: 'VEN-1001',
      poNumber: 'PO-2024-001',
      invoiceDate: '2024-12-10',
      invoiceAmount: 125000,
      status: 'In Review',
      aiRisk: 'Low',
      paymentStatus: 'Pending',
      createdBy: 'John Doe',
      createdDate: '2024-12-11',
      currentApprover: 'Sarah Manager',
      daysInStatus: 2
    },
    {
      id: 'INV-002',
      invoiceNumber: 'INV-2024-00124',
      invoiceType: 'PO',
      vendorName: 'ABC Manufacturing Ltd',
      vendorCode: 'VEN-1002',
      poNumber: 'PO-2024-002',
      invoiceDate: '2024-12-08',
      invoiceAmount: 350000,
      status: 'Approved',
      aiRisk: 'Medium',
      paymentStatus: 'Pending',
      createdBy: 'John Doe',
      createdDate: '2024-12-09',
      daysInStatus: 3
    },
    {
      id: 'INV-003',
      invoiceNumber: 'INV-2024-00125',
      invoiceType: 'PO',
      vendorName: 'XYZ Services Inc',
      vendorCode: 'VEN-1003',
      poNumber: 'PO-2024-003',
      invoiceDate: '2024-12-12',
      invoiceAmount: 85000,
      status: 'Draft',
      aiRisk: 'Low',
      paymentStatus: 'Pending',
      createdBy: 'John Doe',
      createdDate: '2024-12-13',
      daysInStatus: 1
    },
    {
      id: 'INV-004',
      invoiceNumber: 'INV-2024-00126',
      invoiceType: 'PO',
      vendorName: 'Global Suppliers Co',
      vendorCode: 'VEN-1004',
      poNumber: 'PO-2024-004',
      invoiceDate: '2024-12-05',
      invoiceAmount: 450000,
      status: 'On Hold',
      aiRisk: 'High',
      paymentStatus: 'Pending',
      createdBy: 'John Doe',
      createdDate: '2024-12-06',
      currentApprover: 'Finance Head',
      daysInStatus: 7
    },
    {
      id: 'INV-005',
      invoiceNumber: 'INV-2024-00127',
      invoiceType: 'PO',
      vendorName: 'Tech Solutions Pvt Ltd',
      vendorCode: 'VEN-1001',
      poNumber: 'PO-2024-005',
      invoiceDate: '2024-11-28',
      invoiceAmount: 200000,
      status: 'Paid',
      aiRisk: 'Low',
      paymentStatus: 'Paid',
      createdBy: 'John Doe',
      createdDate: '2024-11-29',
      daysInStatus: 14
    }
  ]);

  const getStatusStyle = (status: Invoice['status']) => {
    const styles = {
      'Draft': { bg: '#F3F4F6', color: '#6B7280', icon: Edit2 },
      'Submitted': { bg: '#DBEAFE', color: '#1E40AF', icon: Clock },
      'In Review': { bg: '#FEF3C7', color: '#D97706', icon: Clock },
      'Approved': { bg: '#D1FAE5', color: '#047857', icon: CheckCircle },
      'Rejected': { bg: 'var(--color-error-light)', color: 'var(--color-error-dark)', icon: XCircle },
      'On Hold': { bg: '#FED7AA', color: '#EA580C', icon: AlertTriangle },
      'Ready for Payment': { bg: '#E0E7FF', color: '#4F46E5', icon: DollarSign },
      'Paid': { bg: '#D1FAE5', color: '#059669', icon: CheckCircle }
    };
    return styles[status];
  };

  const getRiskStyle = (risk: Invoice['aiRisk']) => {
    const styles = {
      'Low': { bg: '#D1FAE5', color: '#047857' },
      'Medium': { bg: '#FEF3C7', color: '#D97706' },
      'High': { bg: 'var(--color-error-light)', color: 'var(--color-error-dark)' }
    };
    return styles[risk];
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.poNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    const matchesRisk = riskFilter === 'All' || inv.aiRisk === riskFilter;
    const matchesInvoiceType = invoiceTypeFilter === 'All' || inv.invoiceType === invoiceTypeFilter;
    
    return matchesSearch && matchesStatus && matchesRisk && matchesInvoiceType;
  });

  const handleViewInvoice = (id: string) => {
    navigate(`/ap/invoice-workflow/${id}`);
  };

  const handleEditDraft = (id: string) => {
    navigate(`/invoices/edit/${id}`);
  };

  const handleCloneInvoice = (id: string) => {
    alert(`Clone invoice ${id} - Feature coming soon`);
  };

  const handleWithdraw = (id: string) => {
    if (confirm('Are you sure you want to withdraw this invoice submission?')) {
      alert(`Invoice ${id} withdrawn`);
    }
  };

  // Stats
  const stats = [
    { 
      label: 'Total Invoices', 
      value: invoices.length, 
      icon: FileText, 
      color: 'var(--color-teal)',
      bg: 'var(--color-teal)10'
    },
    { 
      label: 'Pending Approval', 
      value: invoices.filter(i => i.status === 'In Review' || i.status === 'Submitted').length, 
      icon: Clock, 
      color: '#D97706',
      bg: '#FEF3C7'
    },
    { 
      label: 'Approved', 
      value: invoices.filter(i => i.status === 'Approved' || i.status === 'Ready for Payment').length, 
      icon: CheckCircle, 
      color: '#047857',
      bg: '#D1FAE5'
    },
    { 
      label: 'On Hold', 
      value: invoices.filter(i => i.status === 'On Hold').length, 
      icon: AlertTriangle, 
      color: '#EA580C',
      bg: '#FED7AA'
    }
  ];

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }} className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl mb-2" style={{ color: 'var(--color-ink)' }}>My Invoices</h1>
        <p style={{ color: 'var(--color-mercury-grey)' }}>Track and manage invoices you've created</p>
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
            <button
              onClick={() => navigate('/invoices/create')}
              className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors"
              style={{ backgroundColor: 'var(--color-teal)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
            >
              <FileText className="w-5 h-5" />
              Create Invoice
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t-2" style={{ borderColor: 'var(--color-silver)' }}>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2"
                  style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
                >
                  <option>All</option>
                  <option>Draft</option>
                  <option>Submitted</option>
                  <option>In Review</option>
                  <option>Approved</option>
                  <option>Rejected</option>
                  <option>On Hold</option>
                  <option>Ready for Payment</option>
                  <option>Paid</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>AI Risk Level</label>
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2"
                  style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
                >
                  <option>All</option>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Invoice Type</label>
                <select
                  value={invoiceTypeFilter}
                  onChange={(e) => setInvoiceTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2"
                  style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
                >
                  <option>All</option>
                  <option>PO</option>
                  <option>Non-PO</option>
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
                <th className="text-left px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Invoice Date</th>
                <th className="text-right px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Amount</th>
                <th className="text-left px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Status</th>
                <th className="text-left px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>AI Risk</th>
                <th className="text-left px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Payment</th>
                <th className="text-right px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => {
                const statusStyle = getStatusStyle(invoice.status);
                const riskStyle = getRiskStyle(invoice.aiRisk);
                const StatusIcon = statusStyle.icon;

                return (
                  <tr 
                    key={invoice.id} 
                    className="border-t-2 hover:bg-[var(--color-cloud)] cursor-pointer transition-colors"
                    style={{ borderColor: 'var(--color-silver)' }}
                    onClick={() => handleViewInvoice(invoice.id)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[var(--color-teal)]" />
                        <span style={{ color: 'var(--color-ink)' }}>{invoice.invoiceNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p style={{ color: 'var(--color-ink)' }}>{invoice.vendorName}</p>
                        <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>{invoice.vendorCode}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{invoice.poNumber}</td>
                    <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{invoice.invoiceDate}</td>
                    <td className="px-6 py-4 text-right" style={{ color: 'var(--color-ink)' }}>
                      ₹{invoice.invoiceAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span 
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                          style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {invoice.status}
                        </span>
                        {invoice.daysInStatus > 5 && invoice.status !== 'Paid' && (
                          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--color-error-light)', color: 'var(--color-error-dark)' }}>
                            {invoice.daysInStatus}d
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span 
                        className="inline-block px-3 py-1 rounded-full text-sm"
                        style={{ backgroundColor: riskStyle.bg, color: riskStyle.color }}
                      >
                        {invoice.aiRisk}
                      </span>
                    </td>
                    <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>{invoice.paymentStatus}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleViewInvoice(invoice.id)}
                          className="p-2 rounded-lg hover:bg-[var(--color-silver)] transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                        </button>
                        {invoice.status === 'Draft' && (
                          <button
                            onClick={() => handleEditDraft(invoice.id)}
                            className="p-2 rounded-lg hover:bg-[var(--color-silver)] transition-colors"
                            title="Edit Draft"
                          >
                            <Edit2 className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                          </button>
                        )}
                        <button
                          onClick={() => handleCloneInvoice(invoice.id)}
                          className="p-2 rounded-lg hover:bg-[var(--color-silver)] transition-colors"
                          title="Clone Invoice"
                        >
                          <Copy className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                        </button>
                        {(invoice.status === 'Submitted' || invoice.status === 'In Review') && (
                          <button
                            onClick={() => handleWithdraw(invoice.id)}
                            className="p-2 rounded-lg hover:bg-[var(--color-error-light)] transition-colors"
                            title="Withdraw"
                          >
                            <XCircle className="w-4 h-4" style={{ color: 'var(--color-error-dark)' }} />
                          </button>
                        )}
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
            <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-silver)' }} />
            <p style={{ color: 'var(--color-mercury-grey)' }}>No invoices found</p>
          </div>
        )}
      </div>
    </div>
  );
}