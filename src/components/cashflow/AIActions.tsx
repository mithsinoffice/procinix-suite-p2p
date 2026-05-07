import {
  Zap,
  CheckCircle,
  Clock,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
} from 'lucide-react';

/**
 * AI ACTIONS & PLAYBOOKS
 *
 * Purpose: Agentic AI recommendations with measurable cash impact
 * AI can propose but NOT auto-execute without approval
 */

export function AIActions() {
  const formatCurrency = (amount: number) => {
    const crore = amount / 10000000;
    return `₹${crore.toFixed(2)} Cr`;
  };

  const actions = [
    {
      id: 'A001',
      title: 'Accelerate collections from top 5 customers',
      impact: 32000000,
      timing: '3 weeks',
      risk: 'Low',
      dependencies: ['AR aging data', 'Customer contact'],
      approvals: ['CFO'],
      status: 'Pending Approval',
      confidence: 87,
    },
    {
      id: 'A002',
      title: 'Defer non-critical vendor payments',
      impact: 8500000,
      timing: '2 weeks',
      risk: 'Medium',
      dependencies: ['Vendor relationships', 'Contract terms'],
      approvals: ['AP Head', 'CFO'],
      status: 'Draft',
      confidence: 92,
    },
    {
      id: 'A003',
      title: 'Trigger overdraft for 10 days to avoid buffer breach',
      impact: 10000000,
      timing: 'Week 7',
      risk: 'Low',
      dependencies: ['Bank approval', 'Credit limit'],
      approvals: ['CFO', 'Treasury Head'],
      status: 'Recommended',
      confidence: 95,
    },
    {
      id: 'A004',
      title: 'Intercompany transfer from Singapore entity',
      impact: 5000000,
      timing: '1 week',
      risk: 'Medium',
      dependencies: ['FX rates', 'Transfer pricing policy'],
      approvals: ['CFO', 'Tax Head'],
      status: 'Draft',
      confidence: 78,
    },
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low':
        return {
          bg: 'var(--color-success-light)',
          color: 'var(--color-success-dark)',
          border: '#81C784',
        };
      case 'Medium':
        return {
          bg: 'var(--color-warning-light)',
          color: 'var(--color-warning-dark)',
          border: '#FFB74D',
        };
      case 'High':
        return {
          bg: 'var(--color-error-light)',
          color: 'var(--color-error-dark)',
          border: '#FCA5A5',
        };
      default:
        return {
          bg: 'var(--color-cloud)',
          color: 'var(--color-mercury-grey)',
          border: 'var(--color-silver)',
        };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Recommended':
        return {
          bg: 'var(--color-teal-tint)',
          color: 'var(--color-teal)',
          border: 'var(--color-teal)',
        };
      case 'Pending Approval':
        return {
          bg: 'var(--color-warning-light)',
          color: 'var(--color-warning-dark)',
          border: '#FFB74D',
        };
      case 'Draft':
        return {
          bg: 'var(--color-cloud)',
          color: 'var(--color-mercury-grey)',
          border: 'var(--color-silver)',
        };
      default:
        return {
          bg: 'var(--color-cloud)',
          color: 'var(--color-mercury-grey)',
          border: 'var(--color-silver)',
        };
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl" style={{ color: 'var(--color-ink)', margin: 0 }}>
                AI Actions & Playbooks
              </h1>
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded"
                style={{
                  backgroundColor: 'var(--color-teal-tint)',
                  border: '1px solid var(--color-teal)',
                }}
              >
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--color-teal)' }} />
                <span className="text-xs" style={{ color: 'var(--color-teal)', fontWeight: '600' }}>
                  AGENTIC AI
                </span>
              </div>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
              AI-recommended actions with measurable cash impact • Requires approval before
              execution
            </p>
          </div>
          <div
            className="flex items-center gap-2 text-sm"
            style={{ color: 'var(--color-mercury-grey)' }}
          >
            <Zap className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
            <span>{actions.length} actions recommended</span>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div
            className="bg-white p-6 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Total Potential Impact
            </p>
            <p className="text-2xl" style={{ color: 'var(--color-teal)', fontWeight: '600' }}>
              {formatCurrency(actions.reduce((sum, a) => sum + a.impact, 0))}
            </p>
          </div>
          <div
            className="bg-white p-6 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Actions Recommended
            </p>
            <p className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
              {actions.filter((a) => a.status === 'Recommended').length}
            </p>
          </div>
          <div
            className="bg-white p-6 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Pending Approval
            </p>
            <p
              className="text-2xl"
              style={{ color: 'var(--color-warning-dark)', fontWeight: '600' }}
            >
              {actions.filter((a) => a.status === 'Pending Approval').length}
            </p>
          </div>
          <div
            className="bg-white p-6 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Avg Confidence
            </p>
            <p className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
              {Math.round(actions.reduce((sum, a) => sum + a.confidence, 0) / actions.length)}%
            </p>
          </div>
        </div>

        {/* Action Cards */}
        <div className="space-y-4">
          {actions.map((action) => {
            const riskStyle = getRiskColor(action.risk);
            const statusStyle = getStatusColor(action.status);

            return (
              <div
                key={action.id}
                className="bg-white rounded-lg"
                style={{ border: '1px solid var(--color-silver)' }}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'var(--color-teal-tint)' }}
                      >
                        <Zap className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3
                            className="text-base"
                            style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}
                          >
                            {action.title}
                          </h3>
                          <span className="px-2 py-0.5 rounded text-xs" style={statusStyle}>
                            {action.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div>
                            <p
                              className="text-xs mb-1"
                              style={{ color: 'var(--color-mercury-grey)' }}
                            >
                              Cash Impact
                            </p>
                            <p
                              className="text-sm"
                              style={{ color: 'var(--color-teal)', fontWeight: '600' }}
                            >
                              +{formatCurrency(action.impact)}
                            </p>
                          </div>
                          <div>
                            <p
                              className="text-xs mb-1"
                              style={{ color: 'var(--color-mercury-grey)' }}
                            >
                              Timing
                            </p>
                            <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
                              {action.timing}
                            </p>
                          </div>
                          <div>
                            <p
                              className="text-xs mb-1"
                              style={{ color: 'var(--color-mercury-grey)' }}
                            >
                              Risk Level
                            </p>
                            <span
                              className="px-2 py-0.5 rounded text-xs inline-block"
                              style={riskStyle}
                            >
                              {action.risk}
                            </span>
                          </div>
                          <div>
                            <p
                              className="text-xs mb-1"
                              style={{ color: 'var(--color-mercury-grey)' }}
                            >
                              Confidence
                            </p>
                            <p
                              className="text-sm"
                              style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                            >
                              {action.confidence}%
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p
                              className="text-xs mb-2"
                              style={{ color: 'var(--color-mercury-grey)' }}
                            >
                              Dependencies:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {action.dependencies.map((dep) => (
                                <span
                                  key={dep}
                                  className="px-2 py-1 rounded text-xs"
                                  style={{
                                    backgroundColor: 'var(--color-cloud)',
                                    color: 'var(--color-mercury-grey)',
                                  }}
                                >
                                  {dep}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p
                              className="text-xs mb-2"
                              style={{ color: 'var(--color-mercury-grey)' }}
                            >
                              Required Approvals:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {action.approvals.map((approver) => (
                                <span
                                  key={approver}
                                  className="px-2 py-1 rounded text-xs"
                                  style={{
                                    backgroundColor: 'var(--color-warning-light)',
                                    color: 'var(--color-warning-dark)',
                                  }}
                                >
                                  {approver}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div
                    className="flex items-center justify-end gap-3 pt-4"
                    style={{ borderTop: '1px solid var(--color-silver)' }}
                  >
                    {action.status === 'Recommended' && (
                      <>
                        <button
                          className="px-4 py-2 rounded-lg text-sm transition-colors"
                          style={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid var(--color-silver)',
                            color: 'var(--color-ink)',
                          }}
                        >
                          <ThumbsDown className="w-4 h-4 inline mr-2" />
                          Dismiss
                        </button>
                        <button
                          className="px-4 py-2 rounded-lg text-white text-sm transition-colors"
                          style={{ backgroundColor: 'var(--color-teal)' }}
                        >
                          <ThumbsUp className="w-4 h-4 inline mr-2" />
                          Request Approval
                        </button>
                      </>
                    )}
                    {action.status === 'Pending Approval' && (
                      <div
                        className="flex items-center gap-2 text-sm"
                        style={{ color: 'var(--color-warning-dark)' }}
                      >
                        <Clock className="w-4 h-4" />
                        <span>Awaiting CFO approval</span>
                      </div>
                    )}
                    {action.status === 'Draft' && (
                      <button
                        className="px-4 py-2 rounded-lg text-sm transition-colors"
                        style={{
                          backgroundColor: 'var(--color-cloud)',
                          border: '1px solid var(--color-silver)',
                          color: 'var(--color-mercury-grey)',
                        }}
                      >
                        Review Details
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Governance Note */}
        <div
          className="mt-8 p-6 rounded-lg"
          style={{
            backgroundColor: 'var(--color-teal-tint)',
            border: '1px solid var(--color-teal)',
          }}
        >
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 mt-0.5" style={{ color: 'var(--color-teal)' }} />
            <div>
              <h4
                className="text-sm mb-2"
                style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}
              >
                AI Governance: Human-in-the-Loop
              </h4>
              <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
                All AI-recommended actions require explicit human approval before execution. The
                system provides data-driven recommendations but maintains full financial governance
                controls. Approval workflows are configured per your organization's authority
                matrix.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
