import { useState } from 'react';
import {
  Banknote,
  Building2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  Shield,
  Calendar,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';

/**
 * CASH POSITION (DIRECT CASH FLOW)
 * 
 * Purpose: Show actual, real-world liquidity from bank accounts
 * Data Source: Bank feeds, Posted payments, Scheduled AP runs, Expected AR collections
 * 
 * This page shows DIRECT cash flow - what's actually in the bank right now
 * vs. INDIRECT cash flow (accounting-driven projections)
 */

interface BankAccount {
  id: string;
  entity: string;
  bank: string;
  accountNumber: string;
  accountType: 'Current' | 'Savings' | 'Fixed Deposit' | 'Overdraft';
  currency: string;
  balance: number;
  availableBalance: number;
  restrictedCash: number;
  minimumBalance: number;
  intradayMovement: number;
  next7DayNet: number;
  lastUpdated: string;
  status: 'Active' | 'Inactive' | 'Blocked';
}

interface CashMovement {
  id: string;
  type: 'Inflow' | 'Outflow';
  category: string;
  description: string;
  amount: number;
  date: string;
  status: 'Posted' | 'Scheduled' | 'Expected';
  confidence: number; // AI confidence score (0-100)
  source: 'Bank' | 'AP' | 'AR' | 'Payroll' | 'Tax';
}

const mockBankAccounts: BankAccount[] = [
  {
    id: 'BA001',
    entity: 'PROCINIX India',
    bank: 'HDFC Bank',
    accountNumber: '****4521',
    accountType: 'Current',
    currency: 'INR',
    balance: 45670000,
    availableBalance: 44270000,
    restrictedCash: 1400000,
    minimumBalance: 1000000,
    intradayMovement: -2340000,
    next7DayNet: -8500000,
    lastUpdated: '2024-12-14 10:45 AM',
    status: 'Active'
  },
  {
    id: 'BA002',
    entity: 'PROCINIX India',
    bank: 'ICICI Bank',
    accountNumber: '****7832',
    accountType: 'Current',
    currency: 'INR',
    balance: 28950000,
    availableBalance: 28950000,
    restrictedCash: 0,
    minimumBalance: 500000,
    intradayMovement: 1200000,
    next7DayNet: 3400000,
    lastUpdated: '2024-12-14 10:42 AM',
    status: 'Active'
  },
  {
    id: 'BA003',
    entity: 'PROCINIX Singapore',
    bank: 'DBS Bank',
    accountNumber: '****2109',
    accountType: 'Current',
    currency: 'SGD',
    balance: 450000,
    availableBalance: 450000,
    restrictedCash: 0,
    minimumBalance: 50000,
    intradayMovement: -20000,
    next7DayNet: 80000,
    lastUpdated: '2024-12-14 10:30 AM',
    status: 'Active'
  },
  {
    id: 'BA004',
    entity: 'PROCINIX India',
    bank: 'HDFC Bank',
    accountNumber: '****9876',
    accountType: 'Overdraft',
    currency: 'INR',
    balance: -5000000,
    availableBalance: 10000000, // 15M limit - 5M used
    restrictedCash: 0,
    minimumBalance: 0,
    intradayMovement: 0,
    next7DayNet: -3000000,
    lastUpdated: '2024-12-14 10:45 AM',
    status: 'Active'
  }
];

const mockCashMovements: CashMovement[] = [
  // Today
  {
    id: 'CM001',
    type: 'Inflow',
    category: 'Customer Collection',
    description: 'Payment from Reliance Industries - INV-2024-456',
    amount: 3500000,
    date: '2024-12-14',
    status: 'Expected',
    confidence: 85,
    source: 'AR'
  },
  {
    id: 'CM002',
    type: 'Outflow',
    category: 'Vendor Payment',
    description: 'Payment Batch PB-2024-012 (12 vendors)',
    amount: 5800000,
    date: '2024-12-14',
    status: 'Scheduled',
    confidence: 100,
    source: 'AP'
  },
  // Tomorrow
  {
    id: 'CM003',
    type: 'Inflow',
    category: 'Customer Collection',
    description: 'Payment from Tata Motors - INV-2024-478',
    amount: 6700000,
    date: '2024-12-15',
    status: 'Expected',
    confidence: 92,
    source: 'AR'
  },
  {
    id: 'CM004',
    type: 'Outflow',
    category: 'Payroll',
    description: 'December 2024 Salary Payment',
    amount: 8500000,
    date: '2024-12-15',
    status: 'Scheduled',
    confidence: 100,
    source: 'Payroll'
  },
  // Next 7 days
  {
    id: 'CM005',
    type: 'Outflow',
    category: 'Tax Payment',
    description: 'GST Payment - November 2024',
    amount: 4200000,
    date: '2024-12-20',
    status: 'Scheduled',
    confidence: 100,
    source: 'Tax'
  },
  {
    id: 'CM006',
    type: 'Inflow',
    category: 'Customer Collection',
    description: '5 expected collections (weighted avg)',
    amount: 9200000,
    date: '2024-12-16 to 2024-12-21',
    status: 'Expected',
    confidence: 78,
    source: 'AR'
  }
];

export function CashPosition() {
  const [selectedEntity, setSelectedEntity] = useState<string>('All');
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [view, setView] = useState<'accounts' | 'movements'>('accounts');

  // Calculate totals
  const totalBankCash = mockBankAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalAvailableCash = mockBankAccounts.reduce((sum, acc) => sum + acc.availableBalance, 0);
  const totalRestrictedCash = mockBankAccounts.reduce((sum, acc) => sum + acc.restrictedCash, 0);
  const totalMinimumBuffer = mockBankAccounts.reduce((sum, acc) => sum + acc.minimumBalance, 0);
  const intradayNet = mockBankAccounts.reduce((sum, acc) => sum + acc.intradayMovement, 0);
  const next7DayNet = mockBankAccounts.reduce((sum, acc) => sum + acc.next7DayNet, 0);

  const bufferStatus = totalAvailableCash > totalMinimumBuffer * 1.5 ? 'Healthy' : 
                       totalAvailableCash > totalMinimumBuffer ? 'Warning' : 'Critical';

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    if (currency === 'INR') {
      const crore = amount / 10000000;
      return `₹${crore.toFixed(2)} Cr`;
    } else if (currency === 'SGD') {
      return `S$${(amount / 1000).toFixed(0)}K`;
    }
    return `${currency} ${amount.toLocaleString()}`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return { bg: 'var(--color-success-light)', color: 'var(--color-success-dark)', border: '#81C784' };
    if (confidence >= 75) return { bg: 'var(--color-warning-light)', color: 'var(--color-warning-dark)', border: '#FFB74D' };
    return { bg: 'var(--color-error-light)', color: 'var(--color-error-dark)', border: '#FCA5A5' };
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      {/* PAGE HEADER */}
      <div 
        className="bg-white px-8 py-6"
        style={{ borderBottom: '1px solid var(--color-silver)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl" style={{ color: 'var(--color-ink)', margin: 0 }}>
                Cash Position (Direct)
              </h1>
              <span 
                className="px-3 py-1 rounded-full text-sm"
                style={{ backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal)', border: '1px solid var(--color-teal)' }}
              >
                DIRECT CASH FLOW
              </span>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-cloud)' }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--color-teal)' }} />
                <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                  AI-Powered
                </span>
              </div>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
              Real-world liquidity from bank accounts • Last updated: {mockBankAccounts[0].lastUpdated}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--color-silver)',
                color: 'var(--color-ink)'
              }}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Refresh Data
            </button>
            <button
              className="px-4 py-2 rounded-lg text-white transition-colors"
              style={{ backgroundColor: 'var(--color-teal)' }}
            >
              View Hybrid Reconciliation
              <ArrowRight className="w-4 h-4 inline ml-2" />
            </button>
          </div>
        </div>

        {/* Entity Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Entity:</span>
          {['All', 'PROCINIX India', 'PROCINIX Singapore'].map((entity) => {
            const isActive = selectedEntity === entity;
            return (
              <button
                key={entity}
                onClick={() => setSelectedEntity(entity)}
                className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                style={{
                  backgroundColor: isActive ? 'var(--color-teal-tint)' : 'transparent',
                  color: isActive ? 'var(--color-teal)' : 'var(--color-mercury-grey)',
                  border: isActive ? '1px solid var(--color-teal)' : '1px solid var(--color-silver)'
                }}
              >
                {entity}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Bank Cash */}
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-teal-tint)' }}>
                <Banknote className="w-6 h-6" style={{ color: 'var(--color-teal)' }} />
              </div>
              <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-success-light)', color: 'var(--color-success-dark)' }}>
                DIRECT
              </span>
            </div>
            <p className="text-3xl mb-1" style={{ color: 'var(--color-ink)' }}>
              {formatCurrency(totalBankCash)}
            </p>
            <p className="text-sm mb-3" style={{ color: 'var(--color-mercury-grey)' }}>Total Bank Cash</p>
            <div className="flex items-center gap-2 text-sm">
              {intradayNet >= 0 ? (
                <TrendingUp className="w-4 h-4" style={{ color: '#059669' }} />
              ) : (
                <TrendingDown className="w-4 h-4" style={{ color: 'var(--color-error-dark)' }} />
              )}
              <span style={{ color: intradayNet >= 0 ? '#059669' : 'var(--color-error-dark)' }}>
                {formatCurrency(Math.abs(intradayNet))} today
              </span>
            </div>
          </div>

          {/* Available Cash */}
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-success-light)' }}>
                <TrendingUp className="w-6 h-6" style={{ color: 'var(--color-success-dark)' }} />
              </div>
              <span className="text-xs px-2 py-1 rounded" style={{ 
                backgroundColor: bufferStatus === 'Healthy' ? 'var(--color-success-light)' : bufferStatus === 'Warning' ? 'var(--color-warning-light)' : 'var(--color-error-light)',
                color: bufferStatus === 'Healthy' ? 'var(--color-success-dark)' : bufferStatus === 'Warning' ? 'var(--color-warning-dark)' : 'var(--color-error-dark)'
              }}>
                {bufferStatus.toUpperCase()}
              </span>
            </div>
            <p className="text-3xl mb-1" style={{ color: 'var(--color-ink)' }}>
              {formatCurrency(totalAvailableCash)}
            </p>
            <p className="text-sm mb-3" style={{ color: 'var(--color-mercury-grey)' }}>Available Cash</p>
            <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
              <Shield className="w-3.5 h-3.5" />
              <span>Buffer: {formatCurrency(totalMinimumBuffer)}</span>
            </div>
          </div>

          {/* Next 7-Day Net Position */}
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ 
                backgroundColor: next7DayNet >= 0 ? 'var(--color-success-light)' : 'var(--color-error-light)'
              }}>
                <Calendar className="w-6 h-6" style={{ 
                  color: next7DayNet >= 0 ? 'var(--color-success-dark)' : 'var(--color-error-dark)'
                }} />
              </div>
              <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' }}>
                AI FORECAST
              </span>
            </div>
            <p className="text-3xl mb-1" style={{ color: next7DayNet >= 0 ? 'var(--color-success-dark)' : 'var(--color-error-dark)' }}>
              {next7DayNet >= 0 ? '+' : ''}{formatCurrency(next7DayNet)}
            </p>
            <p className="text-sm mb-3" style={{ color: 'var(--color-mercury-grey)' }}>Next 7-Day Net</p>
            <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
              <Info className="w-3.5 h-3.5" />
              <span>From scheduled + expected</span>
            </div>
          </div>
        </div>

        {/* Restricted Cash Alert */}
        {totalRestrictedCash > 0 && (
          <div 
            className="flex items-center gap-3 p-4 rounded-lg mb-8"
            style={{ backgroundColor: 'var(--color-warning-light)', border: '1px solid #FFB74D' }}
          >
            <AlertCircle className="w-5 h-5" style={{ color: 'var(--color-warning-dark)' }} />
            <div className="flex-1">
              <p className="text-sm" style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}>
                Restricted Cash: {formatCurrency(totalRestrictedCash)}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: '4px 0 0 0' }}>
                This amount is held for regulatory requirements and cannot be used for operations
              </p>
            </div>
          </div>
        )}

        {/* View Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setView('accounts')}
            className="px-4 py-2 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: view === 'accounts' ? 'var(--color-teal-tint)' : 'transparent',
              color: view === 'accounts' ? 'var(--color-teal)' : 'var(--color-mercury-grey)',
              border: view === 'accounts' ? '1px solid var(--color-teal)' : '1px solid var(--color-silver)'
            }}
          >
            <Building2 className="w-4 h-4 inline mr-2" />
            By Bank Account
          </button>
          <button
            onClick={() => setView('movements')}
            className="px-4 py-2 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: view === 'movements' ? 'var(--color-teal-tint)' : 'transparent',
              color: view === 'movements' ? 'var(--color-teal)' : 'var(--color-mercury-grey)',
              border: view === 'movements' ? '1px solid var(--color-teal)' : '1px solid var(--color-silver)'
            }}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Expected Movements
          </button>
        </div>

        {/* BANK ACCOUNTS VIEW */}
        {view === 'accounts' && (
          <div className="space-y-4">
            {mockBankAccounts.map((account) => {
              const isExpanded = expandedAccount === account.id;
              const balanceColor = account.balance >= account.minimumBalance ? 'var(--color-ink)' : 'var(--color-error-dark)';

              return (
                <div
                  key={account.id}
                  className="bg-white rounded-lg"
                  style={{ border: '1px solid var(--color-silver)' }}
                >
                  {/* Account Header */}
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: 'var(--color-cloud)' }}
                          >
                            <Building2 className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
                          </div>
                          <div>
                            <h3 className="text-base" style={{ color: 'var(--color-ink)', margin: 0 }}>
                              {account.bank} • {account.accountNumber}
                            </h3>
                            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: '2px 0 0 0' }}>
                              {account.entity} • {account.accountType}
                            </p>
                          </div>
                          <span 
                            className="px-2 py-1 rounded text-xs"
                            style={{ 
                              backgroundColor: account.status === 'Active' ? 'var(--color-success-light)' : 'var(--color-error-light)',
                              color: account.status === 'Active' ? 'var(--color-success-dark)' : 'var(--color-error-dark)'
                            }}
                          >
                            {account.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-6">
                          <div>
                            <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Balance</p>
                            <p className="text-lg" style={{ color: balanceColor, fontWeight: '600' }}>
                              {formatCurrency(account.balance, account.currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Available</p>
                            <p className="text-lg" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                              {formatCurrency(account.availableBalance, account.currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Intraday Movement</p>
                            <p 
                              className="text-lg" 
                              style={{ 
                                color: account.intradayMovement >= 0 ? '#059669' : 'var(--color-error-dark)',
                                fontWeight: '600'
                              }}
                            >
                              {account.intradayMovement >= 0 ? '+' : ''}
                              {formatCurrency(account.intradayMovement, account.currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Next 7-Day Net</p>
                            <p 
                              className="text-lg" 
                              style={{ 
                                color: account.next7DayNet >= 0 ? '#059669' : 'var(--color-error-dark)',
                                fontWeight: '600'
                              }}
                            >
                              {account.next7DayNet >= 0 ? '+' : ''}
                              {formatCurrency(account.next7DayNet, account.currency)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setExpandedAccount(isExpanded ? null : account.id)}
                        className="p-2 rounded-lg transition-colors ml-4"
                        style={{ color: 'var(--color-mercury-grey)', backgroundColor: 'var(--color-cloud)' }}
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div 
                      className="px-6 pb-6 pt-4"
                      style={{ borderTop: '1px solid var(--color-silver)' }}
                    >
                      <div className="grid grid-cols-3 gap-6">
                        <div>
                          <p className="text-xs mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Restricted Cash</p>
                          <p className="text-base" style={{ color: 'var(--color-ink)' }}>
                            {formatCurrency(account.restrictedCash, account.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Minimum Balance Req.</p>
                          <p className="text-base" style={{ color: 'var(--color-ink)' }}>
                            {formatCurrency(account.minimumBalance, account.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Last Updated</p>
                          <p className="text-base" style={{ color: 'var(--color-ink)' }}>
                            {account.lastUpdated}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* CASH MOVEMENTS VIEW */}
        {view === 'movements' && (
          <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="p-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
              <h3 className="text-base" style={{ color: 'var(--color-ink)', margin: 0 }}>
                Expected Cash Movements (Next 7 Days)
              </h3>
              <p className="text-sm mt-1" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
                Scheduled payments + AI-predicted collections
              </p>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--color-silver)' }}>
              {mockCashMovements.map((movement) => {
                const confidenceStyle = getConfidenceColor(movement.confidence);
                return (
                  <div key={movement.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ 
                            backgroundColor: movement.type === 'Inflow' ? 'var(--color-success-light)' : 'var(--color-error-light)'
                          }}
                        >
                          {movement.type === 'Inflow' ? (
                            <TrendingUp className="w-5 h-5" style={{ color: 'var(--color-success-dark)' }} />
                          ) : (
                            <TrendingDown className="w-5 h-5" style={{ color: 'var(--color-error-dark)' }} />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm" style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}>
                              {movement.category}
                            </h4>
                            <span 
                              className="px-2 py-0.5 rounded text-xs"
                              style={{ 
                                backgroundColor: movement.status === 'Scheduled' ? 'var(--color-teal-tint)' : 'var(--color-warning-light)',
                                color: movement.status === 'Scheduled' ? 'var(--color-teal)' : 'var(--color-warning-dark)'
                              }}
                            >
                              {movement.status}
                            </span>
                            <span 
                              className="px-2 py-0.5 rounded text-xs"
                              style={confidenceStyle}
                            >
                              {movement.confidence}% confidence
                            </span>
                          </div>
                          <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
                            {movement.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                            <span>📅 {movement.date}</span>
                            <span>📌 Source: {movement.source}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p 
                          className="text-lg"
                          style={{ 
                            color: movement.type === 'Inflow' ? 'var(--color-success-dark)' : 'var(--color-error-dark)',
                            fontWeight: '600',
                            margin: 0
                          }}
                        >
                          {movement.type === 'Inflow' ? '+' : '-'}{formatCurrency(movement.amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI INSIGHTS */}
        <div 
          className="mt-8 p-6 rounded-lg"
          style={{ backgroundColor: 'var(--color-teal-tint)', border: '1px solid var(--color-teal)' }}
        >
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 mt-0.5" style={{ color: 'var(--color-teal)' }} />
            <div>
              <h4 className="text-sm mb-2" style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}>
                AI Insights & Recommendations
              </h4>
              <ul className="text-sm space-y-1 m-0 pl-4" style={{ color: 'var(--color-mercury-grey)' }}>
                <li>⚠️ Cash position will drop below buffer on Dec 20th due to GST payment. Consider deferring non-critical vendor payments.</li>
                <li>✅ Expected inflow of ₹9.2 Cr from 5 customers (78% confidence). Monitor receivables aging dashboard.</li>
                <li>💡 Overdraft facility has ₹10 Cr available. Consider using it to maintain healthy buffer during peak outflow week.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
