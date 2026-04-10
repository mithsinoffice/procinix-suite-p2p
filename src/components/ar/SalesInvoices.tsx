import { useState } from 'react';
import { Receipt, Plus, Search, Filter, Clock, CheckCircle, AlertTriangle, FileText, Sparkles, Eye } from 'lucide-react';

/**
 * AR AUTOMATION - SALES INVOICES
 * 
 * Purpose: Sales invoice lifecycle management with AI insights
 */

export function SalesInvoices() {
  const [selectedTab, setSelectedTab] = useState('all');
  
  const formatCurrency = (amount: number) => {
    const crore = amount / 10000000;
    return `₹${crore.toFixed(2)} Cr`;
  };

  const invoices = [
    {
      id: 'INV-2024-001',
      customer: 'Reliance Industries Ltd',
      customerCode: 'REL001',
      date: '2024-12-01',
      dueDate: '2025-01-15',
      amount: 8500000,
      gst: 1530000,
      tds: 85000,
      netAmount: 9945000,
      status: 'Issued',
      paymentStatus: 'Unpaid',
      daysOutstanding: 13,
      aiRisk: { duplicate: 'Low', paymentDelay: 'Low', dispute: 'Low' },
      confidence: 92
    },
    {
      id: 'INV-2024-002',
      customer: 'Tata Motors Limited',
      customerCode: 'TATA001',
      date: '2024-11-15',
      dueDate: '2024-12-15',
      amount: 12000000,
      gst: 2160000,
      tds: 120000,
      netAmount: 14040000,
      status: 'Delivered',
      paymentStatus: 'Overdue',
      daysOutstanding: 29,
      aiRisk: { duplicate: 'Low', paymentDelay: 'High', dispute: 'Medium' },
      confidence: 78
    },
    {
      id: 'INV-2024-003',
      customer: 'Larsen & Toubro Ltd',
      customerCode: 'LT001',
      date: '2024-12-05',
      dueDate: '2025-02-03',
      amount: 6800000,
      gst: 1224000,
      tds: 68000,
      netAmount: 7956000,
      status: 'Issued',
      paymentStatus: 'Unpaid',
      daysOutstanding: 9,
      aiRisk: { duplicate: 'Low', paymentDelay: 'Low', dispute: 'Low' },
      confidence: 95
    },
    {
      id: 'INV-2024-004',
      customer: 'Infosys Technologies',
      customerCode: 'INFO001',
      date: '2024-10-20',
      dueDate: '2024-11-19',
      amount: 15000000,
      gst: 2700000,
      tds: 150000,
      netAmount: 17550000,
      status: 'Delivered',
      paymentStatus: 'Overdue',
      daysOutstanding: 55,
      aiRisk: { duplicate: 'Low', paymentDelay: 'High', dispute: 'High' },
      confidence: 65
    },
    {
      id: 'INV-2024-005',
      customer: 'Wipro Limited',
      customerCode: 'WIP001',
      date: '2024-11-28',
      dueDate: '2025-01-12',
      amount: 9200000,
      gst: 1656000,
      tds: 92000,
      netAmount: 10764000,
      status: 'Issued',
      paymentStatus: 'Unpaid',
      daysOutstanding: 16,
      aiRisk: { duplicate: 'Low', paymentDelay: 'Low', dispute: 'Low' },
      confidence: 88
    },
    {
      id: 'INV-2024-006',
      customer: 'Reliance Industries Ltd',
      customerCode: 'REL001',
      date: '2024-11-10',
      dueDate: '2024-12-25',
      amount: 18500000,
      gst: 3330000,
      tds: 185000,
      netAmount: 21645000,
      status: 'Partially Paid',
      paymentStatus: 'Partial',
      daysOutstanding: 34,
      paidAmount: 10000000,
      aiRisk: { duplicate: 'Low', paymentDelay: 'Medium', dispute: 'Low' },
      confidence: 82
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return { bg: '#F6F9FC', color: '#6E7A82', border: '#E1E6EA' };
      case 'Issued': return { bg: '#E8F7F8', color: '#00A9B7', border: '#00A9B7' };
      case 'Delivered': return { bg: '#E8F5E9', color: '#2E7D32', border: '#81C784' };
      case 'Partially Paid': return { bg: '#FFF3E0', color: '#F57C00', border: '#FFB74D' };
      case 'Paid': return { bg: '#E8F5E9', color: '#2E7D32', border: '#81C784' };
      case 'Disputed': return { bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5' };
      default: return { bg: '#F6F9FC', color: '#6E7A82', border: '#E1E6EA' };
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return { bg: '#E8F5E9', color: '#2E7D32' };
      case 'Unpaid': return { bg: '#FFF3E0', color: '#F57C00' };
      case 'Overdue': return { bg: '#FEE2E2', color: '#DC2626' };
      case 'Partial': return { bg: '#E8F7F8', color: '#00A9B7' };
      default: return { bg: '#F6F9FC', color: '#6E7A82' };
    }
  };

  const getRiskLevel = (aiRisk: any): string => {
    const risks = [aiRisk.duplicate, aiRisk.paymentDelay, aiRisk.dispute];
    if (risks.includes('High')) return 'High';
    if (risks.includes('Medium')) return 'Medium';
    return 'Low';
  };

  const stats = {
    total: invoices.length,
    issued: invoices.filter(i => i.status === 'Issued').length,
    overdue: invoices.filter(i => i.paymentStatus === 'Overdue').length,
    totalValue: invoices.reduce((sum, i) => sum + i.netAmount, 0),
    outstanding: invoices.filter(i => i.paymentStatus !== 'Paid').reduce((sum, i) => sum + i.netAmount - (i.paidAmount || 0), 0)
  };

  return (
    <div style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      {/* PAGE HEADER */}
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl" style={{ color: '#0A0F14', margin: 0 }}>Sales Invoices</h1>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ backgroundColor: '#E8F7F8', border: '1px solid #00A9B7' }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: '#00A9B7' }} />
                <span className="text-xs" style={{ color: '#00A9B7', fontWeight: '600' }}>AI INSIGHTS</span>
              </div>
            </div>
            <p className="text-sm" style={{ color: '#6E7A82', margin: 0 }}>
              Complete invoice lifecycle from creation to payment
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-lg transition-colors" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E1E6EA', color: '#0A0F14' }}>
              <Filter className="w-4 h-4 inline mr-2" />
              Filter
            </button>
            <button className="px-4 py-2 rounded-lg text-white transition-colors" style={{ backgroundColor: '#00A9B7' }}>
              <Plus className="w-4 h-4 inline mr-2" />
              Create Invoice
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: '#6E7A82' }} />
          <input
            type="text"
            placeholder="Search by invoice number, customer name, or PO number..."
            className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
            style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#0A0F14' }}
          />
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
            <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>Total Invoices</p>
            <p className="text-2xl" style={{ color: '#0A0F14', fontWeight: '600' }}>{stats.total}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
            <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>Issued</p>
            <p className="text-2xl" style={{ color: '#00A9B7', fontWeight: '600' }}>{stats.issued}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
            <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>Overdue</p>
            <p className="text-2xl" style={{ color: '#DC2626', fontWeight: '600' }}>{stats.overdue}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
            <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>Total Value</p>
            <p className="text-2xl" style={{ color: '#0A0F14', fontWeight: '600' }}>{formatCurrency(stats.totalValue)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
            <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>Outstanding</p>
            <p className="text-2xl" style={{ color: '#F57C00', fontWeight: '600' }}>{formatCurrency(stats.outstanding)}</p>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="bg-white rounded-lg mb-6" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center gap-4 p-4">
            {['all', 'issued', 'overdue', 'partial', 'disputed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={{
                  backgroundColor: selectedTab === tab ? '#E8F7F8' : 'transparent',
                  color: selectedTab === tab ? '#00A9B7' : '#6E7A82',
                  border: selectedTab === tab ? '1px solid #00A9B7' : '1px solid transparent',
                  fontWeight: selectedTab === tab ? '600' : 'normal'
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
          <div className="p-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
            <h3 className="text-base" style={{ color: '#0A0F14', margin: 0, fontWeight: '600' }}>Sales Invoices</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: '#F6F9FC' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Customer</th>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Date</th>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Due Date</th>
                  <th className="px-6 py-3 text-right text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Amount</th>
                  <th className="px-6 py-3 text-center text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Days O/S</th>
                  <th className="px-6 py-3 text-center text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Status</th>
                  <th className="px-6 py-3 text-center text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Payment</th>
                  <th className="px-6 py-3 text-center text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>AI Risk</th>
                  <th className="px-6 py-3 text-center text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#E1E6EA' }}>
                {invoices.map((invoice) => {
                  const statusStyle = getStatusColor(invoice.status);
                  const paymentStyle = getPaymentStatusColor(invoice.paymentStatus);
                  const riskLevel = getRiskLevel(invoice.aiRisk);
                  const riskColor = riskLevel === 'High' ? '#DC2626' : riskLevel === 'Medium' ? '#F57C00' : '#2E7D32';
                  
                  return (
                    <tr key={invoice.id} style={{ backgroundColor: invoice.paymentStatus === 'Overdue' ? '#FEE2E2' : '#FFFFFF' }}>
                      <td className="px-6 py-4">
                        <p className="text-sm" style={{ color: '#0A0F14', fontWeight: '600', margin: 0 }}>
                          {invoice.id}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm mb-1" style={{ color: '#0A0F14', margin: 0 }}>
                            {invoice.customer}
                          </p>
                          <p className="text-xs" style={{ color: '#6E7A82', margin: 0 }}>
                            {invoice.customerCode}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: '#6E7A82' }}>{invoice.date}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: '#6E7A82' }}>{invoice.dueDate}</td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm" style={{ color: '#0A0F14', fontWeight: '600', margin: 0 }}>
                          {formatCurrency(invoice.netAmount)}
                        </p>
                        {invoice.paidAmount && (
                          <p className="text-xs mt-1" style={{ color: '#2E7D32', margin: 0 }}>
                            Paid: {formatCurrency(invoice.paidAmount)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm" style={{ 
                          color: invoice.daysOutstanding > 30 ? '#DC2626' : '#0A0F14',
                          fontWeight: invoice.daysOutstanding > 30 ? '600' : 'normal'
                        }}>
                          {invoice.daysOutstanding}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 rounded text-xs inline-block" style={statusStyle}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 rounded text-xs inline-block" style={paymentStyle}>
                          {invoice.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <AlertTriangle className="w-4 h-4" style={{ color: riskColor }} />
                          <span className="text-xs" style={{ color: riskColor, fontWeight: '600' }}>
                            {riskLevel}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button className="p-1 rounded hover:bg-gray-100">
                            <Eye className="w-4 h-4" style={{ color: '#00A9B7' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Insights */}
        <div className="mt-8 p-6 rounded-lg" style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5" style={{ color: '#DC2626' }} />
            <div>
              <h4 className="text-sm mb-2" style={{ color: '#0A0F14', margin: 0, fontWeight: '600' }}>
                High Risk Alert: INV-2024-004
              </h4>
              <p className="text-sm" style={{ color: '#6E7A82', margin: 0 }}>
                Invoice INV-2024-004 for Infosys Technologies is 55 days outstanding with 85% probability of payment delay beyond 90 days.
                Customer has exceeded credit limit. Recommend: Escalate to collections team and consider dispute resolution.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
