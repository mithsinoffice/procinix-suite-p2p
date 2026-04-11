import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, XCircle, MessageSquare, Eye, Filter, Search,
  AlertTriangle, Clock, TrendingUp, FileText, Calendar, DollarSign,
  AlertCircle, Zap
} from 'lucide-react';

interface PendingInvoice {
  id: string;
  invoiceNumber: string;
  vendorName: string;
  vendorCode: string;
  poNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  netPayable: number;
  agingDays: number;
  aiRiskFlags: string[];
  priority: 'High' | 'Medium' | 'Low';
  submittedBy: string;
  submittedDate: string;
  dueDate: string;
  level: string;
}

export function InvoicesForApproval() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [riskFilter, setRiskFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());

  // Mock data
  const [invoices] = useState<PendingInvoice[]>([
    {
      id: 'INV-001',
      invoiceNumber: 'INV-2024-00123',
      vendorName: 'Tech Solutions Pvt Ltd',
      vendorCode: 'VEN-1001',
      poNumber: 'PO-2024-001',
      invoiceDate: '2024-12-10',
      invoiceAmount: 125000,
      netPayable: 134000,
      agingDays: 2,
      aiRiskFlags: [],
      priority: 'Low',
      submittedBy: 'John Doe',
      submittedDate: '2024-12-11',
      dueDate: '2025-01-09',
      level: 'L1'
    },
    {
      id: 'INV-002',
      invoiceNumber: 'INV-2024-00124',
      vendorName: 'ABC Manufacturing Ltd',
      vendorCode: 'VEN-1002',
      poNumber: 'PO-2024-002',
      invoiceDate: '2024-12-08',
      invoiceAmount: 350000,
      netPayable: 385000,
      agingDays: 5,
      aiRiskFlags: ['Amount variance 5% above PO'],
      priority: 'Medium',
      submittedBy: 'Jane Smith',
      submittedDate: '2024-12-09',
      dueDate: '2025-01-07',
      level: 'L1'
    },
    {
      id: 'INV-003',
      invoiceNumber: 'INV-2024-00125',
      vendorName: 'Global Suppliers Co',
      vendorCode: 'VEN-1004',
      poNumber: 'PO-2024-004',
      invoiceDate: '2024-12-05',
      invoiceAmount: 450000,
      netPayable: 495000,
      agingDays: 8,
      aiRiskFlags: ['Possible duplicate found', 'Overdue payment by 3 days'],
      priority: 'High',
      submittedBy: 'Mike Johnson',
      submittedDate: '2024-12-06',
      dueDate: '2025-01-04',
      level: 'L2'
    },
    {
      id: 'INV-004',
      invoiceNumber: 'INV-2024-00126',
      vendorName: 'XYZ Services Inc',
      vendorCode: 'VEN-1003',
      poNumber: 'PO-2024-003',
      invoiceDate: '2024-12-12',
      invoiceAmount: 85000,
      netPayable: 91800,
      agingDays: 1,
      aiRiskFlags: [],
      priority: 'Low',
      submittedBy: 'Sarah Williams',
      submittedDate: '2024-12-13',
      dueDate: '2025-01-11',
      level: 'L1'
    }
  ]);

  const getPriorityStyle = (priority: PendingInvoice['priority']) => {
    const styles = {
      'High': { bg: 'var(--color-error-light)', color: 'var(--color-error-dark)', icon: AlertCircle },
      'Medium': { bg: '#FEF3C7', color: '#D97706', icon: AlertTriangle },
      'Low': { bg: '#D1FAE5', color: '#047857', icon: CheckCircle }
    };
    return styles[priority];
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.poNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = priorityFilter === 'All' || inv.priority === priorityFilter;
    const matchesRisk = riskFilter === 'All' || 
      (riskFilter === 'Has Flags' && inv.aiRiskFlags.length > 0) ||
      (riskFilter === 'No Flags' && inv.aiRiskFlags.length === 0);
    const matchesStatus = statusFilter === 'All' || 
      (statusFilter === 'Overdue' && inv.agingDays > 3) ||
      (statusFilter === 'Due Soon' && inv.agingDays <= 3);
    
    return matchesSearch && matchesPriority && matchesRisk && matchesStatus;
  });

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedInvoices(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedInvoices.size === filteredInvoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(filteredInvoices.map(inv => inv.id)));
    }
  };

  const handleApprove = (id: string) => {
    navigate(`/ap/invoice-approval/${id}`);
  };

  const handleReject = (id: string) => {
    if (confirm('Are you sure you want to reject this invoice?')) {
      alert(`Invoice ${id} rejected`);
    }
  };

  const handleSendBack = (id: string) => {
    const comments = prompt('Enter comments for sending back:');
    if (comments) {
      alert(`Invoice ${id} sent back with comments: ${comments}`);
    }
  };

  const handleBulkApprove = () => {
    if (selectedInvoices.size === 0) {
      alert('Please select invoices to approve');
      return;
    }
    if (confirm(`Approve ${selectedInvoices.size} selected invoice(s)?`)) {
      alert(`${selectedInvoices.size} invoices approved`);
      setSelectedInvoices(new Set());
    }
  };

  // Stats
  const stats = [
    { 
      label: 'Pending Approval', 
      value: invoices.length, 
      icon: Clock, 
      color: '#D97706',
      bg: '#FEF3C7'
    },
    { 
      label: 'Overdue (>3 days)', 
      value: invoices.filter(i => i.agingDays > 3).length, 
      icon: AlertTriangle, 
      color: 'var(--color-error-dark)',
      bg: 'var(--color-error-light)'
    },
    { 
      label: 'Total Value', 
      value: `₹${(invoices.reduce((sum, inv) => sum + inv.netPayable, 0) / 100000).toFixed(1)}L`, 
      icon: DollarSign, 
      color: 'var(--color-teal)',
      bg: 'var(--color-teal)10'
    },
    { 
      label: 'With AI Flags', 
      value: invoices.filter(i => i.aiRiskFlags.length > 0).length, 
      icon: Zap, 
      color: '#007D87',
      bg: '#EDE9FE'
    }
  ];

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }} className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl mb-2" style={{ color: 'var(--color-ink)' }}>Invoices for Approval</h1>
        <p style={{ color: 'var(--color-mercury-grey)' }}>Review and approve pending invoices</p>
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
            {selectedInvoices.size > 0 && (
              <button
                onClick={handleBulkApprove}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors"
                style={{ backgroundColor: 'var(--color-teal)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
              >
                <CheckCircle className="w-5 h-5" />
                Approve Selected ({selectedInvoices.size})
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t-2" style={{ borderColor: 'var(--color-silver)' }}>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Priority</label>
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
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Risk Flags</label>
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2"
                  style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
                >
                  <option>All</option>
                  <option>Has Flags</option>
                  <option>No Flags</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2"
                  style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
                >
                  <option>All</option>
                  <option>Overdue</option>
                  <option>Due Soon</option>
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
                <th className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedInvoices.size === filteredInvoices.length && filteredInvoices.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded accent-[var(--color-teal)]"
                  />
                </th>
                <th className="text-left px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Invoice Number</th>
                <th className="text-left px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Vendor</th>
                <th className="text-left px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>PO Reference</th>
                <th className="text-right px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Amount</th>
                <th className="text-center px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Aging</th>
                <th className="text-left px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>AI Risk Flags</th>
                <th className="text-center px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Priority</th>
                <th className="text-right px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => {
                const priorityStyle = getPriorityStyle(invoice.priority);
                const PriorityIcon = priorityStyle.icon;
                const isOverdue = invoice.agingDays > 3;

                return (
                  <tr 
                    key={invoice.id} 
                    className="border-t-2 hover:bg-[var(--color-cloud)] transition-colors"
                    style={{ borderColor: 'var(--color-silver)' }}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.has(invoice.id)}
                        onChange={() => handleToggleSelect(invoice.id)}
                        className="w-4 h-4 rounded accent-[var(--color-teal)]"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[var(--color-teal)]" />
                        <span style={{ color: 'var(--color-ink)' }}>{invoice.invoiceNumber}</span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-mercury-grey)' }}>
                        by {invoice.submittedBy}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p style={{ color: 'var(--color-ink)' }}>{invoice.vendorName}</p>
                        <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>{invoice.vendorCode}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{invoice.poNumber}</td>
                    <td className="px-6 py-4 text-right" style={{ color: 'var(--color-ink)' }}>
                      ₹{invoice.netPayable.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="w-4 h-4" style={{ color: isOverdue ? 'var(--color-error-dark)' : 'var(--color-mercury-grey)' }} />
                        <span 
                          className="text-sm"
                          style={{ color: isOverdue ? 'var(--color-error-dark)' : 'var(--color-ink)' }}
                        >
                          {invoice.agingDays}d
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {invoice.aiRiskFlags.length > 0 ? (
                        <div className="space-y-1">
                          {invoice.aiRiskFlags.map((flag, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-[#D97706]" />
                              <span className="text-xs" style={{ color: '#D97706' }}>{flag}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-center">
                          <CheckCircle className="w-3 h-3 text-[#047857]" />
                          <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>No flags</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span 
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                        style={{ backgroundColor: priorityStyle.bg, color: priorityStyle.color }}
                      >
                        <PriorityIcon className="w-3 h-3" />
                        {invoice.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(invoice.id)}
                          className="p-2 rounded-lg hover:bg-[#D1FAE5] transition-colors"
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4 text-[#047857]" />
                        </button>
                        <button
                          onClick={() => handleReject(invoice.id)}
                          className="p-2 rounded-lg hover:bg-[var(--color-error-light)] transition-colors"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4 text-[var(--color-error-dark)]" />
                        </button>
                        <button
                          onClick={() => handleSendBack(invoice.id)}
                          className="p-2 rounded-lg hover:bg-[var(--color-silver)] transition-colors"
                          title="Send Back"
                        >
                          <MessageSquare className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                        </button>
                        <button
                          onClick={() => navigate(`/ap/invoice-workflow/${invoice.id}`)}
                          className="p-2 rounded-lg hover:bg-[var(--color-silver)] transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
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
            <Clock className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-silver)' }} />
            <p style={{ color: 'var(--color-mercury-grey)' }}>No invoices pending approval</p>
          </div>
        )}
      </div>
    </div>
  );
}