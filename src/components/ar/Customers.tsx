import { useState } from 'react';
import { Users, Plus, Search, Filter, AlertTriangle, TrendingUp, TrendingDown, Sparkles, Eye, Edit } from 'lucide-react';

/**
 * AR AUTOMATION - CUSTOMERS
 * 
 * Purpose: Customer master management with credit profiles and AI risk scoring
 */

export function Customers() {
  const [selectedTab, setSelectedTab] = useState('all');
  
  const formatCurrency = (amount: number) => {
    const crore = amount / 10000000;
    return `₹${crore.toFixed(2)} Cr`;
  };

  const customers = [
    { 
      id: 'CUST-001', 
      name: 'Reliance Industries Ltd', 
      code: 'REL001', 
      entity: 'India HQ',
      gstin: '27AAACR5055K1Z5',
      creditLimit: 50000000,
      outstanding: 35200000,
      overdue: 0,
      dso: 42,
      paymentTerms: 'Net 45',
      status: 'Active',
      riskRating: 'Low',
      trend: 'improving'
    },
    { 
      id: 'CUST-002', 
      name: 'Tata Motors Limited', 
      code: 'TATA001', 
      entity: 'India HQ',
      gstin: '27AAACT2727Q1ZV',
      creditLimit: 40000000,
      outstanding: 38500000,
      overdue: 4200000,
      dso: 58,
      paymentTerms: 'Net 30',
      status: 'Active',
      riskRating: 'Medium',
      trend: 'stable'
    },
    { 
      id: 'CUST-003', 
      name: 'Larsen & Toubro Ltd', 
      code: 'LT001', 
      entity: 'India HQ',
      gstin: '27AAACL0163B1ZN',
      creditLimit: 60000000,
      outstanding: 22800000,
      overdue: 0,
      dso: 38,
      paymentTerms: 'Net 60',
      status: 'Active',
      riskRating: 'Low',
      trend: 'improving'
    },
    { 
      id: 'CUST-004', 
      name: 'Infosys Technologies', 
      code: 'INFO001', 
      entity: 'India HQ',
      gstin: '29AAACI1681G1Z5',
      creditLimit: 30000000,
      outstanding: 32100000,
      overdue: 8900000,
      dso: 72,
      paymentTerms: 'Net 30',
      status: 'On-hold',
      riskRating: 'High',
      trend: 'declining'
    },
    { 
      id: 'CUST-005', 
      name: 'Wipro Limited', 
      code: 'WIP001', 
      entity: 'India HQ',
      gstin: '29AAACW3775F1Z7',
      creditLimit: 25000000,
      outstanding: 15600000,
      overdue: 0,
      dso: 45,
      paymentTerms: 'Net 45',
      status: 'Active',
      riskRating: 'Low',
      trend: 'stable'
    }
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return { bg: 'var(--color-success-light)', color: 'var(--color-success-dark)', border: '#81C784' };
      case 'Medium': return { bg: 'var(--color-warning-light)', color: 'var(--color-warning-dark)', border: '#FFB74D' };
      case 'High': return { bg: 'var(--color-error-light)', color: 'var(--color-error-dark)', border: '#FCA5A5' };
      default: return { bg: 'var(--color-cloud)', color: 'var(--color-mercury-grey)', border: 'var(--color-silver)' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return { bg: 'var(--color-success-light)', color: 'var(--color-success-dark)' };
      case 'On-hold': return { bg: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' };
      case 'Blocked': return { bg: 'var(--color-error-light)', color: 'var(--color-error-dark)' };
      default: return { bg: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' };
    }
  };

  const stats = {
    total: customers.length,
    active: customers.filter(c => c.status === 'Active').length,
    totalOutstanding: customers.reduce((sum, c) => sum + c.outstanding, 0),
    totalOverdue: customers.reduce((sum, c) => sum + c.overdue, 0),
    avgDSO: Math.round(customers.reduce((sum, c) => sum + c.dso, 0) / customers.length)
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      {/* PAGE HEADER */}
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl" style={{ color: 'var(--color-ink)', margin: 0 }}>Customers</h1>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-teal-tint)', border: '1px solid var(--color-teal)' }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--color-teal)' }} />
                <span className="text-xs" style={{ color: 'var(--color-teal)', fontWeight: '600' }}>AI RISK SCORING</span>
              </div>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
              Customer master with credit profiles and payment behavior analysis
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-lg transition-colors" style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}>
              <Filter className="w-4 h-4 inline mr-2" />
              Filter
            </button>
            <button className="px-4 py-2 rounded-lg text-white transition-colors" style={{ backgroundColor: 'var(--color-teal)' }}>
              <Plus className="w-4 h-4 inline mr-2" />
              Add Customer
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--color-mercury-grey)' }} />
          <input
            type="text"
            placeholder="Search by customer name, code, or GSTIN..."
            className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
            style={{ border: '1px solid var(--color-silver)', backgroundColor: '#FFFFFF', color: 'var(--color-ink)' }}
          />
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Total Customers</p>
            <p className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{stats.total}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Active</p>
            <p className="text-2xl" style={{ color: 'var(--color-success-dark)', fontWeight: '600' }}>{stats.active}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Total Outstanding</p>
            <p className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{formatCurrency(stats.totalOutstanding)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Total Overdue</p>
            <p className="text-2xl" style={{ color: 'var(--color-error-dark)', fontWeight: '600' }}>{formatCurrency(stats.totalOverdue)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Avg DSO</p>
            <p className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{stats.avgDSO} days</p>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
          <div className="p-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
            <h3 className="text-base" style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}>Customer List</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Customer</th>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Code</th>
                  <th className="px-6 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Entity</th>
                  <th className="px-6 py-3 text-right text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Credit Limit</th>
                  <th className="px-6 py-3 text-right text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Outstanding</th>
                  <th className="px-6 py-3 text-right text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Overdue</th>
                  <th className="px-6 py-3 text-center text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>DSO</th>
                  <th className="px-6 py-3 text-center text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Risk</th>
                  <th className="px-6 py-3 text-center text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Status</th>
                  <th className="px-6 py-3 text-center text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-silver)' }}>
                {customers.map((customer) => {
                  const riskStyle = getRiskColor(customer.riskRating);
                  const statusStyle = getStatusColor(customer.status);
                  const creditUtilization = (customer.outstanding / customer.creditLimit) * 100;
                  const isOverLimit = customer.outstanding > customer.creditLimit;
                  
                  return (
                    <tr key={customer.id} style={{ backgroundColor: isOverLimit ? 'var(--color-error-light)' : '#FFFFFF' }}>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm mb-1" style={{ color: 'var(--color-ink)', fontWeight: '600', margin: 0 }}>
                            {customer.name}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
                            {customer.gstin}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>{customer.code}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>{customer.entity}</td>
                      <td className="px-6 py-4 text-sm text-right" style={{ color: 'var(--color-ink)' }}>{formatCurrency(customer.creditLimit)}</td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm mb-1" style={{ color: isOverLimit ? 'var(--color-error-dark)' : 'var(--color-ink)', fontWeight: '600', margin: 0 }}>
                          {formatCurrency(customer.outstanding)}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
                          {creditUtilization.toFixed(0)}% utilized
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-right" style={{ color: customer.overdue > 0 ? 'var(--color-error-dark)' : 'var(--color-mercury-grey)', fontWeight: customer.overdue > 0 ? '600' : 'normal' }}>
                        {customer.overdue > 0 ? formatCurrency(customer.overdue) : '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{customer.dso}</span>
                          {customer.trend === 'improving' && <TrendingDown className="w-3.5 h-3.5" style={{ color: 'var(--color-success-dark)' }} />}
                          {customer.trend === 'declining' && <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--color-error-dark)' }} />}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 rounded text-xs inline-block" style={riskStyle}>
                          {customer.riskRating}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 rounded text-xs inline-block" style={statusStyle}>
                          {customer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button className="p-1 rounded hover:bg-gray-100">
                            <Eye className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                          </button>
                          <button className="p-1 rounded hover:bg-gray-100">
                            <Edit className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
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
        <div className="mt-8 p-6 rounded-lg" style={{ backgroundColor: 'var(--color-teal-tint)', border: '1px solid var(--color-teal)' }}>
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 mt-0.5" style={{ color: 'var(--color-teal)' }} />
            <div>
              <h4 className="text-sm mb-2" style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}>
                AI Risk Alert: Infosys Credit Limit Breach
              </h4>
              <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
                Customer CUST-004 (Infosys Technologies) has exceeded credit limit by ₹2.1 Cr with ₹8.9 Cr overdue.
                Recommendation: Block new orders until outstanding is reduced below 90% of credit limit.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
