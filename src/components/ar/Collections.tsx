import { useState } from 'react';
import { DollarSign, Phone, Mail, AlertTriangle, Sparkles, TrendingUp, CheckCircle, Clock } from 'lucide-react';

/**
 * AR AUTOMATION - COLLECTIONS COMMAND CENTER
 * 
 * Purpose: AI-driven collections prioritization and workflow management
 */

export function Collections() {
  const formatCurrency = (amount: number) => `₹${(amount / 10000000).toFixed(2)} Cr`;

  const collections = [
    { customer: 'Infosys Technologies', outstanding: 32100000, overdue: 8900000, dso: 72, priority: 'Critical', probability: 65, lastContact: '2 days ago', nextAction: 'Call escalation' },
    { customer: 'Tata Motors Limited', outstanding: 38500000, overdue: 4200000, dso: 58, priority: 'High', probability: 78, lastContact: '1 week ago', nextAction: 'Follow-up call' },
    { customer: 'Wipro Limited', outstanding: 15600000, overdue: 0, dso: 45, priority: 'Medium', probability: 88, lastContact: '3 days ago', nextAction: 'Email reminder' },
    { customer: 'Reliance Industries Ltd', outstanding: 35200000, overdue: 0, dso: 42, priority: 'Low', probability: 92, lastContact: 'Today', nextAction: 'Monitor' }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return { bg: 'var(--color-error-light)', color: 'var(--color-error-dark)', border: '#FCA5A5' };
      case 'High': return { bg: 'var(--color-warning-light)', color: 'var(--color-warning-dark)', border: '#FFB74D' };
      case 'Medium': return { bg: 'var(--color-teal-tint)', color: 'var(--color-teal)', border: 'var(--color-teal)' };
      case 'Low': return { bg: 'var(--color-success-light)', color: 'var(--color-success-dark)', border: '#81C784' };
      default: return { bg: 'var(--color-cloud)', color: 'var(--color-mercury-grey)', border: 'var(--color-silver)' };
    }
  };

  const stats = {
    totalOutstanding: collections.reduce((s, c) => s + c.outstanding, 0),
    totalOverdue: collections.reduce((s, c) => s + c.overdue, 0),
    criticalAccounts: collections.filter(c => c.priority === 'Critical').length,
    avgDSO: Math.round(collections.reduce((s, c) => s + c.dso, 0) / collections.length)
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl" style={{ color: 'var(--color-ink)', margin: 0 }}>Collections Command Center</h1>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-teal-tint)', border: '1px solid var(--color-teal)' }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--color-teal)' }} />
                <span className="text-xs" style={{ color: 'var(--color-teal)', fontWeight: '600' }}>AI PRIORITIZATION</span>
              </div>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
              AI-driven collections prioritization and workflow management
            </p>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Total Outstanding</p>
            <p className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{formatCurrency(stats.totalOutstanding)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Total Overdue</p>
            <p className="text-2xl" style={{ color: 'var(--color-error-dark)', fontWeight: '600' }}>{formatCurrency(stats.totalOverdue)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Critical Accounts</p>
            <p className="text-2xl" style={{ color: 'var(--color-error-dark)', fontWeight: '600' }}>{stats.criticalAccounts}</p>
          </div>
          <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Avg DSO</p>
            <p className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{stats.avgDSO} days</p>
          </div>
        </div>

        {/* Collections List */}
        <div className="space-y-4">
          {collections.map((item, idx) => {
            const priorityStyle = getPriorityColor(item.priority);
            return (
              <div key={idx} className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)' }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: priorityStyle.bg }}>
                      <DollarSign className="w-5 h-5" style={{ color: priorityStyle.color }} />
                    </div>
                    <div>
                      <h3 className="text-base mb-1" style={{ color: 'var(--color-ink)', fontWeight: '600', margin: 0 }}>{item.customer}</h3>
                      <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                        <span>Outstanding: {formatCurrency(item.outstanding)}</span>
                        {item.overdue > 0 && (
                          <span style={{ color: 'var(--color-error-dark)', fontWeight: '600' }}>Overdue: {formatCurrency(item.overdue)}</span>
                        )}
                        <span>DSO: {item.dso} days</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded text-sm" style={priorityStyle}>
                      {item.priority} Priority
                    </span>
                    <div className="text-right">
                      <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Collection Probability</p>
                      <p className="text-sm" style={{ color: 'var(--color-teal)', fontWeight: '600' }}>{item.probability}%</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 p-4 rounded-lg mb-4" style={{ backgroundColor: 'var(--color-cloud)' }}>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Last Contact</p>
                    <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{item.lastContact}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Next Action</p>
                    <p className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{item.nextAction}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>AI Recommendation</p>
                    <p className="text-sm" style={{ color: 'var(--color-teal)', fontWeight: '600' }}>
                      {item.priority === 'Critical' ? 'Escalate Now' : 'Follow Standard Process'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--color-cloud)', border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}>
                    <Phone className="w-4 h-4 inline mr-2" />
                    Call
                  </button>
                  <button className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--color-cloud)', border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}>
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email
                  </button>
                  <button className="px-4 py-2 rounded-lg text-white text-sm" style={{ backgroundColor: 'var(--color-teal)' }}>
                    <CheckCircle className="w-4 h-4 inline mr-2" />
                    Log Activity
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Insight */}
        <div className="mt-8 p-6 rounded-lg" style={{ backgroundColor: 'var(--color-teal-tint)', border: '1px solid var(--color-teal)' }}>
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 mt-0.5" style={{ color: 'var(--color-teal)' }} />
            <div>
              <h4 className="text-sm mb-2" style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}>
                AI Collection Strategy
              </h4>
              <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
                Focus on Infosys (₹8.9 Cr overdue) - 65% recovery probability. Historical data shows they respond best to senior management contact.
                Expected cash inflow: ₹5.8 Cr within 2 weeks if escalated today.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
