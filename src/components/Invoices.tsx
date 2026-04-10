import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAPData } from '../contexts/APDataContext';
import { 
  Plus, FileText, Calendar, DollarSign, User, Building2, 
  CheckCircle, Clock, XCircle, AlertCircle, Eye, Download, Sparkles, ChevronDown, ArrowUpRight, PencilLine, Search, Receipt, BadgeCheck
} from 'lucide-react';
import { PremiumActionButton, PremiumFilterMenu, toggleMultiSelect } from './ui/premium-register';

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  vendorName: string;
  vendorCode: string;
  invoiceType: 'PO' | 'Non-PO' | 'Expense';
  poNumber?: string;
  invoiceAmount: number;
  currency: string;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Paid' | 'Partially Paid';
  dueDate: string;
  approver?: string;
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid';
  matchStatus?: '3-Way Matched' | 'Partially Matched' | 'Unmatched';
}

export function Invoices() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<string[]>([]);
  const [matchFilter, setMatchFilter] = useState<string[]>([]);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const { invoices: apInvoices } = useAPData();
  const invoices: Invoice[] = apInvoices.map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    vendorName: invoice.vendorName,
    vendorCode: invoice.vendorCode,
    invoiceType: invoice.invoiceType,
    poNumber: invoice.poNumber,
    invoiceAmount: invoice.totalAmount,
    currency: invoice.currency,
    status: invoice.status,
    dueDate: invoice.dueDate ?? '',
    approver: invoice.approver,
    paymentStatus: invoice.paymentStatus,
    matchStatus: invoice.matchStatus,
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return '#9AA6AF';
      case 'Pending Approval': return '#F59E0B';
      case 'Approved': return '#00A9B7';
      case 'Rejected': return '#EF4444';
      case 'Paid': return '#10B981';
      case 'Partially Paid': return '#8B5CF6';
      default: return '#6E7A82';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Paid':
        return CheckCircle;
      case 'Rejected': return XCircle;
      case 'Pending Approval': return Clock;
      case 'Partially Paid': return AlertCircle;
      default: return FileText;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return '#10B981';
      case 'Partially Paid': return '#F59E0B';
      case 'Unpaid': return '#EF4444';
      default: return '#6E7A82';
    }
  };

  const getMatchStatusColor = (status?: string) => {
    switch (status) {
      case '3-Way Matched': return '#00A9B7';
      case 'Partially Matched': return '#F59E0B';
      case 'Unmatched': return '#EF4444';
      default: return '#9AA6AF';
    }
  };

  // Filter invoices
  const filteredInvoices = useMemo(() => invoices.filter((invoice) => {
    const searchValue = search.trim().toLowerCase();
    const matchesSearch =
      !searchValue ||
      [
        invoice.invoiceNumber,
        invoice.vendorName,
        invoice.vendorCode,
        invoice.invoiceType,
        invoice.poNumber,
        invoice.status,
        invoice.paymentStatus,
        invoice.matchStatus,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(searchValue);
    const statusMatch = statusFilter.length === 0 || statusFilter.includes(invoice.status);
    const typeMatch = typeFilter.length === 0 || typeFilter.includes(invoice.invoiceType);
    const paymentMatch = paymentFilter.length === 0 || paymentFilter.includes(invoice.paymentStatus);
    const matchStatusMatch = matchFilter.length === 0 || (invoice.matchStatus && matchFilter.includes(invoice.matchStatus));
    return matchesSearch && statusMatch && typeMatch && paymentMatch && matchStatusMatch;
  }), [invoices, matchFilter, paymentFilter, search, statusFilter, typeFilter]);

  // Calculate summary stats
  const totalInvoices = invoices.length;
  const pendingApproval = invoices.filter(i => i.status === 'Pending Approval').length;
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.invoiceAmount, 0);
  const unpaidAmount = invoices.filter(i => i.paymentStatus === 'Unpaid').reduce((sum, inv) => sum + inv.invoiceAmount, 0);

  const statuses = ['Draft', 'Pending Approval', 'Approved', 'Rejected', 'Paid', 'Partially Paid'];
  const types = ['PO', 'Non-PO', 'Expense'];
  const paymentStatuses = ['Unpaid', 'Partially Paid', 'Paid'];
  const matchStatuses = ['3-Way Matched', 'Partially Matched', 'Unmatched'];
  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter.length > 0 ||
    typeFilter.length > 0 ||
    paymentFilter.length > 0 ||
    matchFilter.length > 0;

  const clearFilters = () => {
    setSearch('');
    setStatusFilter([]);
    setTypeFilter([]);
    setPaymentFilter([]);
    setMatchFilter([]);
  };

  return (
    <div className="p-8" style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-2" style={{ color: '#0A0F14' }}>Invoices</h1>
          <p style={{ color: '#6E7A82' }}>Manage and track supplier invoices</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/invoices/ai-capture')}
            className="flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-colors"
            style={{ backgroundColor: '#8B5CF6' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7C3AED'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8B5CF6'}
          >
            <Sparkles className="w-5 h-5" />
            AI Invoice Capture
          </button>
          
          {/* Split-button CTA for Create Invoice */}
          <div className="relative">
            <button
              onClick={() => setShowCreateDropdown(!showCreateDropdown)}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-colors"
              style={{ backgroundColor: '#00A9B7' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
            >
              <Plus className="w-5 h-5" />
              Create Invoice
              <ChevronDown className="w-4 h-4 ml-1" />
            </button>
            
            {/* Dropdown Menu */}
            {showCreateDropdown && (
              <>
                {/* Backdrop to close dropdown */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowCreateDropdown(false)}
                />
                
                {/* Dropdown content */}
                <div 
                  className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-20"
                  style={{ border: '2px solid #E1E6EA' }}
                >
                  <button
                    onClick={() => {
                      setShowCreateDropdown(false);
                      navigate('/invoices/create-po');
                    }}
                    className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors border-b"
                    style={{ borderColor: '#E1E6EA' }}
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 mt-0.5" style={{ color: '#00A9B7' }} />
                      <div>
                        <p className="font-semibold mb-1" style={{ color: '#0A0F14' }}>
                          Create Invoice from PO
                        </p>
                        <p className="text-sm" style={{ color: '#6E7A82' }}>
                          Match invoice against purchase order
                        </p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowCreateDropdown(false);
                      navigate('/invoices/create-direct');
                    }}
                    className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors rounded-b-lg"
                  >
                    <div className="flex items-start gap-3">
                      <Plus className="w-5 h-5 mt-0.5" style={{ color: '#00A9B7' }} />
                      <div>
                        <p className="font-semibold mb-1" style={{ color: '#0A0F14' }}>
                          Create Direct Invoice
                        </p>
                        <p className="text-sm" style={{ color: '#6E7A82' }}>
                          Create invoice without PO reference
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6" style={{ border: '2px solid #E1E6EA' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm mb-1" style={{ color: '#6E7A82' }}>Total Invoices</p>
              <p className="text-3xl" style={{ color: '#0A0F14' }}>{totalInvoices}</p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F6F9FC' }}>
              <FileText className="w-6 h-6" style={{ color: '#6E7A82' }} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6" style={{ border: '2px solid #E1E6EA' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm mb-1" style={{ color: '#6E7A82' }}>Pending Approval</p>
              <p className="text-3xl" style={{ color: '#F59E0B' }}>{pendingApproval}</p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
              <Clock className="w-6 h-6" style={{ color: '#F59E0B' }} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6" style={{ border: '2px solid #E1E6EA' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm mb-1" style={{ color: '#6E7A82' }}>Total Amount</p>
              <p className="text-2xl" style={{ color: '#0A0F14' }}>₹{totalAmount.toLocaleString('en-IN')}</p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#00A9B710' }}>
              <DollarSign className="w-6 h-6" style={{ color: '#00A9B7' }} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6" style={{ border: '2px solid #E1E6EA' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm mb-1" style={{ color: '#6E7A82' }}>Unpaid Amount</p>
              <p className="text-2xl" style={{ color: '#EF4444' }}>₹{unpaidAmount.toLocaleString('en-IN')}</p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
              <AlertCircle className="w-6 h-6" style={{ color: '#EF4444' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Register */}
      <div className="rounded-[28px] overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: '1px solid #D7E3EA', boxShadow: '0 24px 52px rgba(15, 23, 42, 0.07)' }}>
        <div className="flex items-center justify-between gap-4 px-6 py-4" style={{ borderBottom: '1px solid #E8F0F4' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #E1F7FF 0%, #CFEFFF 100%)', boxShadow: '0 14px 30px rgba(0, 169, 183, 0.14)' }}>
              <Receipt className="w-6 h-6" style={{ color: '#008A96' }} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: '#E7FBFD', color: '#00808C', fontWeight: 700 }}>
                Invoice Register
              </span>
              <span className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: '#E8FFF2', color: '#0F9D69', fontWeight: 700 }}>
                {filteredInvoices.length} Visible
              </span>
              <span className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', fontWeight: 700 }}>
                ₹{totalAmount.toLocaleString('en-IN')} Total
              </span>
            </div>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        <div className="overflow-x-auto">
          <div style={{ minWidth: '1680px' }}>
            <div className="grid gap-4 px-6 py-4" style={{ gridTemplateColumns: '2.3fr 1.8fr 1fr 1fr 1fr 1fr 1fr 1.2fr 1.2fr 1.2fr 0.9fr', borderBottom: '1px solid #E8F0F4' }}>
              <div className="space-y-2">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#6E7A82' }} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search invoice..."
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl text-sm"
                    style={{ backgroundColor: '#F8FBFD', border: '1px solid #D7E3EA', color: '#0A0F14' }}
                  />
                </div>
                {hasActiveFilters && (
                  <button type="button" onClick={clearFilters} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm" style={{ backgroundColor: '#FFF5F5', border: '1px solid #FED7D7', color: '#C53030', fontWeight: 600 }}>
                    Clear Filters
                  </button>
                )}
              </div>
              <div />
              <div className="flex items-start">
                <PremiumFilterMenu label="Type" options={types} selected={typeFilter} onToggle={(value) => setTypeFilter((current) => toggleMultiSelect(current, value))} />
              </div>
              <div />
              <div />
              <div />
              <div />
              <div className="flex items-start">
                <PremiumFilterMenu label="Status" options={statuses} selected={statusFilter} onToggle={(value) => setStatusFilter((current) => toggleMultiSelect(current, value))} />
              </div>
              <div className="flex items-start">
                <PremiumFilterMenu label="Payment" options={paymentStatuses} selected={paymentFilter} onToggle={(value) => setPaymentFilter((current) => toggleMultiSelect(current, value))} />
              </div>
              <div className="flex items-start">
                <PremiumFilterMenu label="Match" options={matchStatuses} selected={matchFilter} onToggle={(value) => setMatchFilter((current) => toggleMultiSelect(current, value))} />
              </div>
              <div />
            </div>

            <div className="grid gap-4 px-6 py-4" style={{ gridTemplateColumns: '2.3fr 1.8fr 1fr 1fr 1fr 1fr 1fr 1.2fr 1.2fr 1.2fr 0.9fr', background: 'linear-gradient(180deg, #F8FBFD 0%, #F3F8FB 100%)', borderBottom: '1px solid #E4EDF2' }}>
              {['Invoice', 'Vendor', 'Type', 'PO Number', 'Amount', 'Invoice Date', 'Due Date', 'Status', 'Payment', 'Match', 'Action'].map((column) => (
                <div key={column} className="text-xs uppercase tracking-[0.18em]" style={{ color: '#6E7A82', fontWeight: 700 }}>
                  {column}
                </div>
              ))}
            </div>

            {filteredInvoices.map((invoice, index) => {
                const StatusIcon = getStatusIcon(invoice.status);
                return (
                  <button
                    key={invoice.id} 
                    type="button"
                    className="w-full grid gap-4 px-6 py-4 text-left transition-colors"
                    style={{ gridTemplateColumns: '2.3fr 1.8fr 1fr 1fr 1fr 1fr 1fr 1.2fr 1.2fr 1.2fr 0.9fr', borderBottom: index === filteredInvoices.length - 1 ? 'none' : '1px solid #EDF3F7', backgroundColor: '#FFFFFF' }}
                    onClick={() => navigate(`/invoices/detail/${invoice.id}`)}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.backgroundColor = '#F8FCFE';
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.backgroundColor = '#FFFFFF';
                    }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #E1F7FF 0%, #CFEFFF 100%)' }}>
                          <FileText className="w-4 h-4" style={{ color: '#008A96' }} />
                        </div>
                        <div>
                          <div style={{ color: '#00A9B7', fontWeight: '700' }}>{invoice.invoiceNumber}</div>
                          <div className="text-xs" style={{ color: '#6E7A82' }}>{invoice.currency === 'INR' ? 'Domestic' : invoice.currency} invoice</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div>
                        <p style={{ color: '#0A0F14' }}>{invoice.vendorName}</p>
                        <p className="text-xs" style={{ color: '#6E7A82' }}>{invoice.vendorCode}</p>
                      </div>
                    </div>
                    <div>
                      <span 
                        className="px-3 py-1 rounded-full text-xs inline-flex"
                        style={{ 
                          background: 'linear-gradient(180deg, #EEF7FF 0%, #E3F0FF 100%)',
                          color: '#2563EB',
                          border: '1px solid #CFE1F8',
                          fontWeight: '600'
                        }}
                      >
                        {invoice.invoiceType}
                      </span>
                    </div>
                    <div style={{ color: '#0A0F14' }}>
                      {invoice.poNumber || '-'}
                    </div>
                    <div style={{ color: '#0A0F14', fontWeight: '600' }}>
                      {invoice.currency === 'INR' ? '₹' : invoice.currency}
                      {invoice.invoiceAmount.toLocaleString('en-IN')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2" style={{ color: '#0A0F14' }}>
                        <Calendar className="w-4 h-4" style={{ color: '#6E7A82' }} />
                        {invoice.invoiceDate}
                      </div>
                    </div>
                    <div style={{ color: '#0A0F14' }}>
                      {invoice.dueDate}
                    </div>
                    <div>
                      <span 
                        className="flex items-center gap-2 px-3 py-1 rounded-full text-xs w-fit"
                        style={{ 
                          backgroundColor: `${getStatusColor(invoice.status)}20`,
                          color: getStatusColor(invoice.status),
                          fontWeight: '600'
                        }}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {invoice.status}
                      </span>
                    </div>
                    <div>
                      <span 
                        className="px-3 py-1 rounded-full text-xs"
                        style={{ 
                          backgroundColor: `${getPaymentStatusColor(invoice.paymentStatus)}20`,
                          color: getPaymentStatusColor(invoice.paymentStatus),
                          fontWeight: '600'
                        }}
                      >
                        {invoice.paymentStatus}
                      </span>
                    </div>
                    <div>
                      {invoice.matchStatus ? (
                        <span 
                          className="px-3 py-1 rounded-full text-xs"
                          style={{ 
                            backgroundColor: `${getMatchStatusColor(invoice.matchStatus)}20`,
                            color: getMatchStatusColor(invoice.matchStatus),
                            fontWeight: '600'
                          }}
                        >
                          {invoice.matchStatus}
                        </span>
                      ) : (
                        <span style={{ color: '#9AA6AF' }}>-</span>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <PremiumActionButton
                        label="View invoice"
                        icon={<Eye className="w-4 h-4" />}
                        tone="teal"
                        onClick={() => navigate(`/invoices/detail/${invoice.id}`)}
                      />
                      {invoice.status === 'Draft' && (
                        <PremiumActionButton
                          label="Edit invoice"
                          icon={<PencilLine className="w-4 h-4" />}
                          tone="violet"
                          onClick={() => navigate(`/invoices/detail/${invoice.id}`)}
                        />
                      )}
                      <PremiumActionButton
                        label="Open invoice"
                        icon={<ArrowUpRight className="w-4 h-4" />}
                        tone="blue"
                        onClick={() => navigate(`/invoices/detail/${invoice.id}`)}
                      />
                    </div>
                  </button>
                );
              })}
              {filteredInvoices.length === 0 && (
                <div className="px-6 py-16 text-center" style={{ color: '#6E7A82' }}>
                  <div className="flex flex-col items-center gap-3">
                    <BadgeCheck className="w-12 h-12" style={{ color: '#D7E3EA' }} />
                    <p>No invoices match the selected filters.</p>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
