import { useState } from 'react';
import {
  Building2,
  CreditCard,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Eye,
  EyeOff,
  RefreshCw,
  Zap,
  DollarSign,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { bankAccounts, paymentModes, bankStatusHistory } from '../data/bankAccountsData';

export function BankIntegrationManagement() {
  const [showAccountNumbers, setShowAccountNumbers] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    if (currency === 'USD' || currency === 'EUR') {
      const symbol = currency === 'USD' ? '$' : '€';
      if (amount >= 1000000) {
        return `${symbol}${(amount / 1000000).toFixed(2)}M`;
      }
      return `${symbol}${(amount / 1000).toFixed(0)}K`;
    }
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)}Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return `₹${amount.toLocaleString()}`;
  };

  const maskAccountNumber = (accountNo: string) => {
    if (showAccountNumbers) return accountNo;
    const last4 = accountNo.slice(-4);
    return `${'*'.repeat(accountNo.length - 4)}${last4}`;
  };

  const getStatusBadge = (status: string) => {
    const config = {
      online: { label: 'Online', bg: '#D1FAE5', color: '#10B981', icon: CheckCircle },
      offline: { label: 'Offline', bg: 'var(--color-error-light)', color: '#EF4444', icon: XCircle },
      maintenance: { label: 'Maintenance', bg: '#FEF3C7', color: '#F59E0B', icon: AlertTriangle },
    };
    const { label, bg, color, icon: Icon } = config[status as keyof typeof config] || config.offline;
    
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded" style={{ backgroundColor: bg }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span style={{ color, fontWeight: '600', fontSize: '12px' }}>{label}</span>
      </div>
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#3B82F6';
      default: return 'var(--color-mercury-grey)';
    }
  };

  const activeAccounts = bankAccounts.filter(acc => acc.isActive);
  const inactiveAccounts = bankAccounts.filter(acc => !acc.isActive);

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      {/* Header */}
      <div
        className="px-8 py-6"
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '2px solid var(--color-silver)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl mb-1" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
              Payment Modes & Bank Integration
            </h1>
            <p style={{ color: 'var(--color-mercury-grey)', fontSize: '14px' }}>
              Multi-bank, multi-entity payment execution management
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAccountNumbers(!showAccountNumbers)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--color-silver)',
                color: 'var(--color-mercury-grey)',
              }}
            >
              {showAccountNumbers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="text-sm" style={{ fontWeight: '500' }}>
                {showAccountNumbers ? 'Hide' : 'Show'} Account Numbers
              </span>
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--color-silver)',
                color: 'var(--color-mercury-grey)',
              }}
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm" style={{ fontWeight: '500' }}>Sync All Accounts</span>
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: 'var(--color-teal)',
                color: '#FFFFFF',
                border: 'none',
              }}
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm" style={{ fontWeight: '600' }}>Add Bank Account</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-[1600px] mx-auto">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#E0F2F1' }}>
                <Building2 className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
              </div>
              <div>
                <div className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
                  {activeAccounts.length}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Active Accounts</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#D1FAE5' }}>
                <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
              </div>
              <div>
                <div className="text-2xl" style={{ color: '#10B981', fontWeight: '700' }}>
                  {activeAccounts.filter(a => a.bankStatus === 'online').length}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Banks Online</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--color-error-light)' }}>
                <XCircle className="w-5 h-5" style={{ color: '#EF4444' }} />
              </div>
              <div>
                <div className="text-2xl" style={{ color: '#EF4444', fontWeight: '700' }}>
                  {activeAccounts.reduce((sum, acc) => sum + acc.failedTransactions24h, 0)}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Failed (24h)</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#E0F2F1' }}>
                <Zap className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
              </div>
              <div>
                <div className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
                  {paymentModes.filter(m => m.enabled).length}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Payment Modes</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Accounts Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
            <h2 style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '18px' }}>
              Bank Accounts
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {activeAccounts.map((account) => (
              <div
                key={account.id}
                className="bg-white rounded-lg p-6"
                style={{ border: '1px solid var(--color-silver)' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)' }}>
                      <Building2 className="w-6 h-6" style={{ color: 'var(--color-teal)' }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '16px' }}>
                          {account.bankName}
                        </h3>
                        {account.isPrimary && (
                          <span
                            className="px-2 py-0.5 rounded text-xs"
                            style={{ backgroundColor: '#E0F2F1', color: 'var(--color-teal)', fontWeight: '700' }}
                          >
                            PRIMARY
                          </span>
                        )}
                        {getStatusBadge(account.bankStatus)}
                      </div>
                      <div className="text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                        {account.accountName} • {account.currency}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-slate)' }}>
                        {account.entity}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {account.failedTransactions24h > 0 && (
                      <div
                        className="flex items-center gap-1 px-2 py-1 rounded"
                        style={{ backgroundColor: 'var(--color-error-light)' }}
                      >
                        <AlertCircle className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />
                        <span className="text-xs" style={{ color: '#EF4444', fontWeight: '600' }}>
                          {account.failedTransactions24h} failed
                        </span>
                      </div>
                    )}
                    <button
                      className="p-2 rounded-lg transition-colors"
                      style={{
                        backgroundColor: 'var(--color-cloud)',
                        border: '1px solid var(--color-silver)',
                      }}
                    >
                      <Edit className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-6">
                  {/* Account Details */}
                  <div>
                    <div className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>
                      Account Number
                    </div>
                    <div className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600', fontFamily: 'monospace' }}>
                      {maskAccountNumber(account.accountNumber)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>
                      IFSC / SWIFT
                    </div>
                    <div className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                      {account.ifscCode}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>
                      Current Balance
                    </div>
                    <div className="text-sm" style={{ color: 'var(--color-teal)', fontWeight: '700' }}>
                      {formatCurrency(account.currentBalance, account.currency)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>
                      Available Balance
                    </div>
                    <div className="text-sm" style={{ color: '#10B981', fontWeight: '700' }}>
                      {formatCurrency(account.availableBalance, account.currency)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>
                      Daily Limit
                    </div>
                    <div className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                      {formatCurrency(account.dailyLimit, account.currency)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>
                      Cutoff Time
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" style={{ color: 'var(--color-teal)' }} />
                      <span className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                        {account.cutoffTime}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Modes */}
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-silver)' }}>
                  <div className="text-xs mb-2" style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}>
                    DEFAULT PAYMENT MODES
                  </div>
                  <div className="flex items-center gap-2">
                    {account.defaultPaymentMode.map((mode) => (
                      <span
                        key={mode}
                        className="px-2 py-1 rounded text-xs"
                        style={{
                          backgroundColor: 'var(--color-cloud)',
                          color: 'var(--color-ink)',
                          fontWeight: '600',
                          border: '1px solid var(--color-silver)',
                        }}
                      >
                        {mode}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Last Sync */}
                <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: 'var(--color-slate)' }}>
                  <Activity className="w-3.5 h-3.5" />
                  <span>
                    Last synced: {new Date(account.lastSyncTime).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Inactive Accounts */}
          {inactiveAccounts.length > 0 && (
            <div className="mt-6">
              <div className="text-sm mb-3" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>
                Inactive Accounts ({inactiveAccounts.length})
              </div>
              <div className="grid grid-cols-1 gap-3">
                {inactiveAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="bg-white rounded-lg p-4 opacity-60"
                    style={{ border: '1px solid var(--color-silver)' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5" style={{ color: 'var(--color-mercury-grey)' }} />
                        <div>
                          <div style={{ color: 'var(--color-ink)', fontWeight: '600', fontSize: '14px' }}>
                            {account.bankName} - {account.accountName}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                            {maskAccountNumber(account.accountNumber)} • {account.ifscCode}
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(account.bankStatus)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Payment Modes Configuration */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
            <h2 style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '18px' }}>
              Payment Modes Configuration
            </h2>
          </div>

          <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-silver)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-cloud)', borderBottom: '1px solid var(--color-silver)' }}>
                  <th className="text-left px-6 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}>
                    PAYMENT MODE
                  </th>
                  <th className="text-center px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}>
                    STATUS
                  </th>
                  <th className="text-right px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}>
                    MIN AMOUNT
                  </th>
                  <th className="text-right px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}>
                    MAX AMOUNT
                  </th>
                  <th className="text-center px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}>
                    CUTOFF TIME
                  </th>
                  <th className="text-center px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}>
                    PROCESSING
                  </th>
                  <th className="text-right px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}>
                    CHARGES
                  </th>
                  <th className="text-center px-6 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}>
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody>
                {paymentModes.map((mode, index) => (
                  <tr
                    key={mode.mode}
                    style={{
                      backgroundColor: !mode.enabled ? '#FAFBFC' : (index % 2 === 0 ? '#FFFFFF' : '#FAFBFC'),
                      borderBottom: '1px solid var(--color-silver)',
                      opacity: mode.enabled ? 1 : 0.6,
                    }}
                  >
                    <td className="px-6 py-4">
                      <div style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '14px' }}>
                        {mode.mode}
                      </div>
                      <div className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
                        {mode.description}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {mode.enabled ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
                          style={{ backgroundColor: '#D1FAE5', color: '#10B981', fontWeight: '600' }}
                        >
                          <CheckCircle className="w-3 h-3" />
                          Enabled
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
                          style={{ backgroundColor: '#F3F4F6', color: '#6B7280', fontWeight: '600' }}
                        >
                          <XCircle className="w-3 h-3" />
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                        ₹{mode.minAmount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                        {formatCurrency(mode.maxAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                        {mode.cutoffTime}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                        {mode.processingTime}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                        ₹{mode.charges}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        className="p-2 rounded-lg transition-colors"
                        style={{
                          backgroundColor: 'var(--color-cloud)',
                          border: '1px solid var(--color-silver)',
                        }}
                      >
                        <Edit className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
            <h2 style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '18px' }}>
              Recent Bank Activity
            </h2>
          </div>

          <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <div className="divide-y" style={{ borderColor: 'var(--color-silver)' }}>
              {bankStatusHistory.map((event, index) => (
                <div key={index} className="p-4 flex items-start gap-4">
                  <div
                    className="w-2 h-2 rounded-full mt-2"
                    style={{ backgroundColor: getSeverityColor(event.severity) }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div style={{ color: 'var(--color-ink)', fontWeight: '600', fontSize: '14px' }}>
                        {event.event}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                        {new Date(event.timestamp).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                      {event.details}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--color-slate)' }}>
                      {bankAccounts.find(b => b.id === event.bankId)?.bankName}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
