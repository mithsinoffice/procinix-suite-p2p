import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  Clock,
  CreditCard,
  Download,
  Save,
  Send,
  ChevronDown,
  Info,
  Percent,
  Building2,
  AlertCircle,
  FileText,
  X,
  Check,
} from 'lucide-react';
import { mockProposalInvoices, cashBalances, type ProposalInvoice } from '../data/paymentProposalData';

export function PaymentProposal() {
  // Selection state
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());

  // Filter state
  const [vendorFilter, setVendorFilter] = useState('');
  const [dueDateFrom, setDueDateFrom] = useState('');
  const [dueDateTo, setDueDateTo] = useState('');
  const [agingBucket, setAgingBucket] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState('all');
  const [discountFilter, setDiscountFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('approved');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return mockProposalInvoices.filter(invoice => {
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!invoice.vendor.toLowerCase().includes(query) &&
            !invoice.invoiceNo.toLowerCase().includes(query) &&
            !invoice.vendorCode.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Vendor filter
      if (vendorFilter && !invoice.vendor.toLowerCase().includes(vendorFilter.toLowerCase())) {
        return false;
      }

      // Due date range
      if (dueDateFrom && invoice.dueDate < dueDateFrom) return false;
      if (dueDateTo && invoice.dueDate > dueDateTo) return false;

      // Aging bucket
      if (agingBucket !== 'all') {
        if (agingBucket === 'overdue' && invoice.aging <= 0) return false;
        if (agingBucket === '0-7' && (invoice.aging > 0 || invoice.aging < -7)) return false;
        if (agingBucket === '8-15' && (invoice.aging > -8 || invoice.aging < -15)) return false;
        if (agingBucket === '15+' && invoice.aging > -15) return false;
      }

      // Priority
      if (priorityFilter !== 'all' && invoice.priority !== priorityFilter) return false;

      // Payment mode
      if (paymentModeFilter !== 'all' && invoice.paymentMode !== paymentModeFilter) return false;

      // Discount
      if (discountFilter === 'yes' && !invoice.earlyPaymentDiscount) return false;
      if (discountFilter === 'no' && invoice.earlyPaymentDiscount) return false;

      // Status
      if (statusFilter !== 'all' && invoice.status !== statusFilter) return false;

      return true;
    });
  }, [searchQuery, vendorFilter, dueDateFrom, dueDateTo, agingBucket, priorityFilter, paymentModeFilter, discountFilter, statusFilter]);

  // Calculate summary
  const summary = useMemo(() => {
    let totalAmount = 0;
    let totalDiscount = 0;
    const currencies: { [key: string]: number } = {};

    selectedInvoices.forEach(id => {
      const invoice = mockProposalInvoices.find(inv => inv.id === id);
      if (invoice) {
        totalAmount += invoice.amount;
        currencies[invoice.currency] = (currencies[invoice.currency] || 0) + invoice.amount;
        
        if (invoice.earlyPaymentDiscount) {
          const discountDate = new Date(invoice.earlyPaymentDiscount.validUntil);
          const today = new Date('2024-12-13');
          if (discountDate >= today) {
            totalDiscount += invoice.earlyPaymentDiscount.amount;
          }
        }
      }
    });

    // Calculate cash impact
    const inrAmount = currencies['INR'] || 0;
    const usdAmount = currencies['USD'] || 0;

    const inrBalanceBefore = cashBalances.INR.balance;
    const inrBalanceAfter = inrBalanceBefore - inrAmount;
    
    const usdBalanceBefore = cashBalances.USD.balance;
    const usdBalanceAfter = usdBalanceBefore - usdAmount;

    // Risk assessment
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let riskMessage = 'Adequate liquidity available';

    const inrUtilization = (inrAmount / inrBalanceBefore) * 100;
    const usdUtilization = (usdAmount / usdBalanceBefore) * 100;

    if (inrUtilization > 60 || usdUtilization > 60) {
      riskLevel = 'high';
      riskMessage = 'High cash utilization - review working capital';
    } else if (inrUtilization > 40 || usdUtilization > 40) {
      riskLevel = 'medium';
      riskMessage = 'Moderate cash utilization - monitor closely';
    }

    return {
      count: selectedInvoices.size,
      totalAmount,
      totalDiscount,
      currencies,
      inrBalanceBefore,
      inrBalanceAfter,
      usdBalanceBefore,
      usdBalanceAfter,
      riskLevel,
      riskMessage,
      inrUtilization,
      usdUtilization
    };
  }, [selectedInvoices]);

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(amount);
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCompactCurrency = (amount: number, currency: string = 'INR') => {
    if (currency === 'USD') {
      if (amount >= 1000000) {
        return `$${(amount / 1000000).toFixed(2)}M`;
      }
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)}Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return formatCurrency(amount, currency);
  };

  const toggleInvoiceSelection = (id: string) => {
    const newSelection = new Set(selectedInvoices);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedInvoices(newSelection);
  };

  const selectAll = () => {
    const newSelection = new Set(filteredInvoices.map(inv => inv.id));
    setSelectedInvoices(newSelection);
  };

  const clearSelection = () => {
    setSelectedInvoices(new Set());
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'normal': return '#3B82F6';
      case 'low': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getAgingColor = (aging: number) => {
    if (aging > 0) return '#EF4444'; // Overdue
    if (aging > -7) return '#F59E0B'; // Due soon
    return '#10B981'; // Good
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  // Quick filters
  const applyQuickFilter = (type: 'critical' | 'discount' | 'due-soon' | 'statutory') => {
    clearSelection();
    let toSelect: ProposalInvoice[] = [];

    switch (type) {
      case 'critical':
        toSelect = filteredInvoices.filter(inv => inv.priority === 'critical');
        break;
      case 'discount':
        toSelect = filteredInvoices.filter(inv => inv.earlyPaymentDiscount);
        break;
      case 'due-soon':
        toSelect = filteredInvoices.filter(inv => inv.aging > -7 && inv.aging <= 0);
        break;
      case 'statutory':
        toSelect = filteredInvoices.filter(inv => inv.isStatutory);
        break;
    }

    setSelectedInvoices(new Set(toSelect.map(inv => inv.id)));
  };

  return (
    <div style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      {/* Header */}
      <div
        className="px-8 py-6"
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '2px solid #E1E6EA',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl mb-1" style={{ color: '#0A0F14', fontWeight: '700' }}>
              Payment Proposal & Run
            </h1>
            <p style={{ color: '#6E7A82', fontSize: '14px' }}>
              Select invoices for payment and optimize cash usage
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={clearSelection}
              disabled={selectedInvoices.size === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E1E6EA',
                color: '#6E7A82',
                opacity: selectedInvoices.size === 0 ? 0.5 : 1,
                cursor: selectedInvoices.size === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <X className="w-4 h-4" />
              <span className="text-sm" style={{ fontWeight: '500' }}>Clear Selection</span>
            </button>
            <button
              disabled={selectedInvoices.size === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E1E6EA',
                color: '#6E7A82',
                opacity: selectedInvoices.size === 0 ? 0.5 : 1,
                cursor: selectedInvoices.size === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <Save className="w-4 h-4" />
              <span className="text-sm" style={{ fontWeight: '500' }}>Save Draft</span>
            </button>
            <button
              disabled={selectedInvoices.size === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: selectedInvoices.size === 0 ? '#E1E6EA' : '#00A9B7',
                color: '#FFFFFF',
                border: 'none',
                cursor: selectedInvoices.size === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <Send className="w-4 h-4" />
              <span className="text-sm" style={{ fontWeight: '600' }}>Submit for Approval</span>
            </button>
          </div>
        </div>
      </div>

      {/* Split Screen Layout */}
      <div className="flex h-[calc(100vh-120px)]">
        {/* Left Panel - Invoice Selection */}
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#F6F9FC' }}>
          <div className="p-6">
            {/* Quick Actions */}
            <div className="mb-4 flex items-center gap-3">
              <span className="text-sm" style={{ color: '#6E7A82', fontWeight: '600' }}>
                Quick Select:
              </span>
              <button
                onClick={() => applyQuickFilter('critical')}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  backgroundColor: '#FEE2E2',
                  color: '#EF4444',
                  border: '1px solid #FECACA',
                  fontWeight: '600'
                }}
              >
                Critical Only
              </button>
              <button
                onClick={() => applyQuickFilter('statutory')}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  backgroundColor: '#FEE2E2',
                  color: '#DC2626',
                  border: '1px solid #FECACA',
                  fontWeight: '600'
                }}
              >
                Statutory
              </button>
              <button
                onClick={() => applyQuickFilter('discount')}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  backgroundColor: '#D1FAE5',
                  color: '#10B981',
                  border: '1px solid #A7F3D0',
                  fontWeight: '600'
                }}
              >
                With Discount
              </button>
              <button
                onClick={() => applyQuickFilter('due-soon')}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  backgroundColor: '#FEF3C7',
                  color: '#F59E0B',
                  border: '1px solid #FDE68A',
                  fontWeight: '600'
                }}
              >
                Due This Week
              </button>
              <button
                onClick={selectAll}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  backgroundColor: '#E0F2F1',
                  color: '#00A9B7',
                  border: '1px solid #B2DFDB',
                  fontWeight: '600'
                }}
              >
                Select All ({filteredInvoices.length})
              </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg p-4 mb-4" style={{ border: '1px solid #E1E6EA' }}>
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4" style={{ color: '#00A9B7' }} />
                <h3 style={{ color: '#0A0F14', fontWeight: '700', fontSize: '14px' }}>
                  Filters
                </h3>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: '#6E7A82', fontWeight: '600' }}>
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#9AA6AF' }} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Vendor, Invoice No..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs"
                      style={{
                        backgroundColor: '#F6F9FC',
                        border: '1px solid #E1E6EA',
                        color: '#0A0F14'
                      }}
                    />
                  </div>
                </div>

                {/* Due Date From */}
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: '#6E7A82', fontWeight: '600' }}>
                    Due From
                  </label>
                  <input
                    type="date"
                    value={dueDateFrom}
                    onChange={(e) => setDueDateFrom(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg text-xs"
                    style={{
                      backgroundColor: '#F6F9FC',
                      border: '1px solid #E1E6EA',
                      color: '#0A0F14'
                    }}
                  />
                </div>

                {/* Due Date To */}
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: '#6E7A82', fontWeight: '600' }}>
                    Due To
                  </label>
                  <input
                    type="date"
                    value={dueDateTo}
                    onChange={(e) => setDueDateTo(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg text-xs"
                    style={{
                      backgroundColor: '#F6F9FC',
                      border: '1px solid #E1E6EA',
                      color: '#0A0F14'
                    }}
                  />
                </div>

                {/* Aging Bucket */}
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: '#6E7A82', fontWeight: '600' }}>
                    Aging Bucket
                  </label>
                  <select
                    value={agingBucket}
                    onChange={(e) => setAgingBucket(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg text-xs"
                    style={{
                      backgroundColor: '#F6F9FC',
                      border: '1px solid #E1E6EA',
                      color: '#0A0F14'
                    }}
                  >
                    <option value="all">All</option>
                    <option value="overdue">Overdue</option>
                    <option value="0-7">Due in 0-7 days</option>
                    <option value="8-15">Due in 8-15 days</option>
                    <option value="15+">Due after 15 days</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: '#6E7A82', fontWeight: '600' }}>
                    Priority
                  </label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg text-xs"
                    style={{
                      backgroundColor: '#F6F9FC',
                      border: '1px solid #E1E6EA',
                      color: '#0A0F14'
                    }}
                  >
                    <option value="all">All Priorities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: '#6E7A82', fontWeight: '600' }}>
                    Payment Mode
                  </label>
                  <select
                    value={paymentModeFilter}
                    onChange={(e) => setPaymentModeFilter(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg text-xs"
                    style={{
                      backgroundColor: '#F6F9FC',
                      border: '1px solid #E1E6EA',
                      color: '#0A0F14'
                    }}
                  >
                    <option value="all">All Modes</option>
                    <option value="RTGS">RTGS</option>
                    <option value="NEFT">NEFT</option>
                    <option value="Wire">Wire Transfer</option>
                    <option value="Check">Check</option>
                    <option value="ACH">ACH</option>
                  </select>
                </div>

                {/* Discount Filter */}
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: '#6E7A82', fontWeight: '600' }}>
                    Early Discount
                  </label>
                  <select
                    value={discountFilter}
                    onChange={(e) => setDiscountFilter(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg text-xs"
                    style={{
                      backgroundColor: '#F6F9FC',
                      border: '1px solid #E1E6EA',
                      color: '#0A0F14'
                    }}
                  >
                    <option value="all">All Invoices</option>
                    <option value="yes">With Discount</option>
                    <option value="no">No Discount</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: '#6E7A82', fontWeight: '600' }}>
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg text-xs"
                    style={{
                      backgroundColor: '#F6F9FC',
                      border: '1px solid #E1E6EA',
                      color: '#0A0F14'
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="approved">Approved</option>
                    <option value="on-hold">On Hold</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Invoice Table */}
            <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #E1E6EA' }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: '#F6F9FC', borderBottom: '2px solid #E1E6EA' }}>
                      <th className="px-4 py-3" style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selectedInvoices.size === filteredInvoices.length && filteredInvoices.length > 0}
                          onChange={(e) => e.target.checked ? selectAll() : clearSelection()}
                          className="w-4 h-4"
                          style={{ accentColor: '#00A9B7' }}
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '700' }}>
                        VENDOR
                      </th>
                      <th className="text-left px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '700' }}>
                        INVOICE NO
                      </th>
                      <th className="text-left px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '700' }}>
                        INVOICE DATE
                      </th>
                      <th className="text-left px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '700' }}>
                        DUE DATE
                      </th>
                      <th className="text-right px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '700' }}>
                        AMOUNT
                      </th>
                      <th className="text-center px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '700' }}>
                        AGING
                      </th>
                      <th className="text-center px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '700' }}>
                        PRIORITY
                      </th>
                      <th className="text-center px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '700' }}>
                        DISCOUNT
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((invoice, index) => (
                      <tr
                        key={invoice.id}
                        style={{
                          backgroundColor: selectedInvoices.has(invoice.id) ? '#E0F2F1' : (index % 2 === 0 ? '#FFFFFF' : '#FAFBFC'),
                          borderBottom: '1px solid #E1E6EA',
                          cursor: 'pointer'
                        }}
                        onClick={() => toggleInvoiceSelection(invoice.id)}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedInvoices.has(invoice.id)}
                            onChange={() => {}}
                            className="w-4 h-4"
                            style={{ accentColor: '#00A9B7' }}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div style={{ color: '#0A0F14', fontWeight: '600', fontSize: '13px' }}>
                            {invoice.vendor}
                          </div>
                          <div className="text-xs" style={{ color: '#6E7A82' }}>
                            {invoice.vendorCode}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm" style={{ color: '#0A0F14', fontWeight: '500' }}>
                            {invoice.invoiceNo}
                          </div>
                          {invoice.isStatutory && (
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FEE2E2', color: '#DC2626', fontWeight: '600' }}>
                              STATUTORY
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm" style={{ color: '#0A0F14' }}>
                            {new Date(invoice.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm" style={{ color: '#0A0F14' }}>
                            {new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div style={{ color: '#0A0F14', fontWeight: '600', fontSize: '14px' }}>
                            {formatCompactCurrency(invoice.amount, invoice.currency)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className="px-2 py-1 rounded text-xs"
                            style={{
                              backgroundColor: `${getAgingColor(invoice.aging)}15`,
                              color: getAgingColor(invoice.aging),
                              fontWeight: '600'
                            }}
                          >
                            {invoice.aging > 0 ? `+${invoice.aging}d` : `${Math.abs(invoice.aging)}d`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className="px-2 py-1 rounded text-xs"
                            style={{
                              backgroundColor: `${getPriorityColor(invoice.priority)}15`,
                              color: getPriorityColor(invoice.priority),
                              fontWeight: '600',
                              textTransform: 'uppercase'
                            }}
                          >
                            {invoice.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {invoice.earlyPaymentDiscount ? (
                            <div className="flex flex-col items-center">
                              <span className="text-xs" style={{ color: '#10B981', fontWeight: '700' }}>
                                {formatCompactCurrency(invoice.earlyPaymentDiscount.amount, invoice.currency)}
                              </span>
                              <span className="text-xs" style={{ color: '#6E7A82' }}>
                                ({invoice.earlyPaymentDiscount.percentage}%)
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs" style={{ color: '#CBD5E1' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Results count */}
            <div className="mt-4 text-sm" style={{ color: '#6E7A82' }}>
              Showing {filteredInvoices.length} invoices • {selectedInvoices.size} selected
            </div>
          </div>
        </div>

        {/* Right Panel - Payment Summary (Sticky) */}
        <div
          className="w-[420px] overflow-y-auto"
          style={{ 
            backgroundColor: '#FFFFFF',
            borderLeft: '2px solid #E1E6EA'
          }}
        >
          <div className="p-6 sticky top-0">
            <div className="flex items-center gap-2 mb-6">
              <DollarSign className="w-5 h-5" style={{ color: '#00A9B7' }} />
              <h2 style={{ color: '#0A0F14', fontWeight: '700', fontSize: '16px' }}>
                Payment Summary
              </h2>
            </div>

            {/* Selection Summary */}
            <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm" style={{ color: '#6E7A82' }}>Invoices Selected</span>
                <span className="text-xl" style={{ color: '#0A0F14', fontWeight: '700' }}>
                  {summary.count}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: '#6E7A82' }}>Total Amount</span>
                <span className="text-xl" style={{ color: '#00A9B7', fontWeight: '700' }}>
                  {summary.currencies.INR ? formatCompactCurrency(summary.currencies.INR, 'INR') : '₹0'}
                </span>
              </div>
              {summary.currencies.USD && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm" style={{ color: '#6E7A82' }}>USD Amount</span>
                  <span className="text-lg" style={{ color: '#00A9B7', fontWeight: '700' }}>
                    {formatCompactCurrency(summary.currencies.USD, 'USD')}
                  </span>
                </div>
              )}
            </div>

            {/* Discount Captured */}
            {summary.totalDiscount > 0 && (
              <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#D1FAE5', border: '1px solid #A7F3D0' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="w-4 h-4" style={{ color: '#10B981' }} />
                  <span className="text-sm" style={{ color: '#059669', fontWeight: '700' }}>
                    Early Payment Discount
                  </span>
                </div>
                <div className="text-2xl" style={{ color: '#10B981', fontWeight: '700' }}>
                  {formatCompactCurrency(summary.totalDiscount, 'INR')}
                </div>
                <div className="text-xs mt-1" style={{ color: '#059669' }}>
                  Savings captured by paying early
                </div>
              </div>
            )}

            {/* Cash Impact - INR */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4" style={{ color: '#00A9B7' }} />
                <span className="text-sm" style={{ color: '#6E7A82', fontWeight: '700' }}>
                  Cash Impact - INR
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#6E7A82' }}>Balance Before</span>
                  <span className="text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>
                    {formatCompactCurrency(summary.inrBalanceBefore, 'INR')}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#6E7A82' }}>Payment Amount</span>
                  <span className="text-sm" style={{ color: '#EF4444', fontWeight: '600' }}>
                    -{formatCompactCurrency(summary.currencies.INR || 0, 'INR')}
                  </span>
                </div>

                <div className="pt-3" style={{ borderTop: '1px solid #E1E6EA' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm" style={{ color: '#6E7A82', fontWeight: '700' }}>Balance After</span>
                    <span className="text-lg" style={{ color: '#0A0F14', fontWeight: '700' }}>
                      {formatCompactCurrency(summary.inrBalanceAfter, 'INR')}
                    </span>
                  </div>
                  
                  {/* Utilization bar */}
                  <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#E1E6EA' }}>
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${summary.inrUtilization}%`,
                        backgroundColor: getRiskColor(summary.riskLevel)
                      }}
                    />
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#6E7A82' }}>
                    {summary.inrUtilization.toFixed(1)}% cash utilization
                  </div>
                </div>
              </div>
            </div>

            {/* Cash Impact - USD */}
            {summary.currencies.USD && (
              <div className="mb-4 pt-4" style={{ borderTop: '1px solid #E1E6EA' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4" style={{ color: '#00A9B7' }} />
                  <span className="text-sm" style={{ color: '#6E7A82', fontWeight: '700' }}>
                    Cash Impact - USD
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: '#6E7A82' }}>Balance Before</span>
                    <span className="text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>
                      {formatCompactCurrency(summary.usdBalanceBefore, 'USD')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: '#6E7A82' }}>Payment Amount</span>
                    <span className="text-sm" style={{ color: '#EF4444', fontWeight: '600' }}>
                      -{formatCompactCurrency(summary.currencies.USD, 'USD')}
                    </span>
                  </div>

                  <div className="pt-3" style={{ borderTop: '1px solid #E1E6EA' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm" style={{ color: '#6E7A82', fontWeight: '700' }}>Balance After</span>
                      <span className="text-lg" style={{ color: '#0A0F14', fontWeight: '700' }}>
                        {formatCompactCurrency(summary.usdBalanceAfter, 'USD')}
                      </span>
                    </div>
                    
                    {/* Utilization bar */}
                    <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#E1E6EA' }}>
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${summary.usdUtilization}%`,
                          backgroundColor: getRiskColor(summary.riskLevel)
                        }}
                      />
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#6E7A82' }}>
                      {summary.usdUtilization.toFixed(1)}% cash utilization
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Risk Indicator */}
            <div
              className="p-4 rounded-lg"
              style={{
                backgroundColor: `${getRiskColor(summary.riskLevel)}15`,
                border: `1px solid ${getRiskColor(summary.riskLevel)}30`
              }}
            >
              <div className="flex items-start gap-3">
                {summary.riskLevel === 'high' ? (
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: getRiskColor(summary.riskLevel) }} />
                ) : summary.riskLevel === 'medium' ? (
                  <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: getRiskColor(summary.riskLevel) }} />
                ) : (
                  <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: getRiskColor(summary.riskLevel) }} />
                )}
                <div className="flex-1">
                  <div className="text-sm mb-1" style={{ color: getRiskColor(summary.riskLevel), fontWeight: '700' }}>
                    {summary.riskLevel === 'high' ? 'High Risk' : summary.riskLevel === 'medium' ? 'Medium Risk' : 'Low Risk'}
                  </div>
                  <div className="text-xs" style={{ color: '#6E7A82' }}>
                    {summary.riskMessage}
                  </div>
                </div>
              </div>
            </div>

            {/* Account Details */}
            <div className="mt-6 pt-6" style={{ borderTop: '2px solid #E1E6EA' }}>
              <div className="text-xs mb-3" style={{ color: '#6E7A82', fontWeight: '700', textTransform: 'uppercase' }}>
                Payment Accounts
              </div>
              
              {/* INR Account */}
              <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>
                    {cashBalances.INR.accountName}
                  </span>
                </div>
                <div className="text-xs" style={{ color: '#9AA6AF' }}>
                  A/C: {cashBalances.INR.accountNo}
                </div>
              </div>

              {/* USD Account */}
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>
                    {cashBalances.USD.accountName}
                  </span>
                </div>
                <div className="text-xs" style={{ color: '#9AA6AF' }}>
                  A/C: {cashBalances.USD.accountNo}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
