import { useState } from 'react';
import { 
  AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp,
  XCircle, CheckCircle, FileText, Ban, TrendingUp, Shield,
  DollarSign, Calendar, Target, Sparkles
} from 'lucide-react';

export interface AIInsight {
  id: string;
  severity: 'blocker' | 'warning' | 'info';
  category: string;
  title: string;
  description?: string;
  explanation?: string;
  reason?: string;
  confidence: number;
  evidence: string[];
  recommendedActions: Array<string | AIAction>;
  canBypass?: boolean;
  relatedData?: unknown;
}

export interface AIAction {
  id?: string;
  label: string;
  description?: string;
  action?: string;
  type?: 'primary' | 'secondary' | 'danger';
  variant?: 'primary' | 'secondary' | 'danger';
  status?: 'idle' | 'running' | 'pending' | 'completed' | 'dismissed';
}

interface AIInsightsPanelProps {
  insights: AIInsight[];
  aiActions?: AIAction[];
  overallConfidence?: 'high' | 'medium' | 'low';
  onActionClick?: (...args: any[]) => void;
  onRunAIAction?: (...args: any[]) => void;
  onIgnoreInsight?: (...args: any[]) => void;
  onExplainInsight?: (...args: any[]) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onBypass?: (insightId: string, justification: string) => void;
  mode?: 'view' | 'approval';
}

export function AIInsightsPanel({ insights, onBypass, mode = 'view' }: AIInsightsPanelProps) {
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
  const [bypassJustification, setBypassJustification] = useState<{ [key: string]: string }>({});

  const toggleInsight = (id: string) => {
    const newExpanded = new Set(expandedInsights);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedInsights(newExpanded);
  };

  const blockers = insights.filter(i => i.severity === 'blocker');
  const warnings = insights.filter(i => i.severity === 'warning');
  const infoInsights = insights.filter(i => i.severity === 'info');

  const getSeverityConfig = (severity: AIInsight['severity']) => {
    const configs = {
      blocker: {
        icon: XCircle,
        color: 'var(--color-error-dark)',
        bg: 'var(--color-error-light)',
        borderColor: '#FCA5A5',
        label: 'Blocker'
      },
      warning: {
        icon: AlertTriangle,
        color: '#D97706',
        bg: '#FEF3C7',
        borderColor: '#FCD34D',
        label: 'Warning'
      },
      info: {
        icon: Info,
        color: '#2563EB',
        bg: '#DBEAFE',
        borderColor: '#93C5FD',
        label: 'Info'
      }
    };
    return configs[severity];
  };

  const renderInsightCard = (insight: AIInsight) => {
    const config = getSeverityConfig(insight.severity);
    const Icon = config.icon;
    const isExpanded = expandedInsights.has(insight.id);

    return (
      <div
        key={insight.id}
        className="mb-3 rounded-lg border-2"
        style={{ 
          borderColor: config.borderColor,
          backgroundColor: 'white'
        }}
      >
        {/* Card Header - Always Visible */}
        <div
          className="p-3 cursor-pointer"
          onClick={() => toggleInsight(insight.id)}
        >
          <div className="flex items-start gap-3">
            <div
              className="rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: config.bg
              }}
            >
              <Icon className="w-4 h-4" style={{ color: config.color }} />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded" style={{ 
                      backgroundColor: config.bg, 
                      color: config.color,
                      fontWeight: '600'
                    }}>
                      {config.label}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                      {insight.category}
                    </span>
                  </div>
                  <h4 className="text-sm mb-1" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                    {insight.title}
                  </h4>
                  <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                    {insight.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" style={{ color: 'var(--color-teal)' }} />
                    <span className="text-xs" style={{ color: 'var(--color-teal)', fontWeight: '600' }}>
                      {insight.confidence}%
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                  ) : (
                    <ChevronDown className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="px-3 pb-3 pt-0 border-t" style={{ borderColor: 'var(--color-silver)' }}>
            {/* Why Detected */}
            <div className="mb-3 mt-3">
              <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>
                Why Detected:
              </p>
              <p className="text-xs" style={{ color: 'var(--color-ink)' }}>
                {insight.reason}
              </p>
            </div>

            {/* Evidence */}
            {insight.evidence.length > 0 && (
              <div className="mb-3">
                <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>
                  Evidence:
                </p>
                <ul className="space-y-1">
                  {insight.evidence.map((ev, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-xs mt-0.5" style={{ color: 'var(--color-teal)' }}>•</span>
                      <span className="text-xs" style={{ color: 'var(--color-ink)' }}>{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended Actions */}
            {insight.recommendedActions.length > 0 && (
              <div className="mb-3">
                <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>
                  Recommended Actions:
                </p>
                <ul className="space-y-1">
                  {insight.recommendedActions.map((action, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 mt-0.5" style={{ color: 'var(--color-teal)' }} />
                      <span className="text-xs" style={{ color: 'var(--color-ink)' }}>
                        {typeof action === 'string' ? action : action.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Bypass Option for Blockers in Approval Mode */}
            {mode === 'approval' && insight.severity === 'blocker' && insight.canBypass && onBypass && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-silver)' }}>
                <p className="text-xs mb-2" style={{ color: 'var(--color-error-dark)', fontWeight: '600' }}>
                  Override Blocker (requires justification):
                </p>
                <textarea
                  placeholder="Enter justification for bypassing this blocker..."
                  value={bypassJustification[insight.id] || ''}
                  onChange={(e) => setBypassJustification({
                    ...bypassJustification,
                    [insight.id]: e.target.value
                  })}
                  className="w-full px-3 py-2 rounded-lg border-2 text-xs mb-2"
                  style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
                  rows={2}
                />
                <button
                  onClick={() => {
                    if (bypassJustification[insight.id]) {
                      onBypass(insight.id, bypassJustification[insight.id]);
                    } else {
                      alert('Please provide justification for bypass');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs text-white transition-colors"
                  style={{ backgroundColor: 'var(--color-error-dark)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B91C1C'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-error-dark)'}
                >
                  Override with Justification
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border-2" style={{ borderColor: 'var(--color-silver)', height: 'fit-content', position: 'sticky', top: '24px' }}>
      {/* Panel Header */}
      <div className="p-4 border-b-2" style={{ borderColor: 'var(--color-silver)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
          <h3 className="text-base" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
            AI Insights
          </h3>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
          Automated analysis and recommendations
        </p>
      </div>

      {/* Summary Counts */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--color-silver)' }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <XCircle className="w-4 h-4" style={{ color: 'var(--color-error-dark)' }} />
            <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Blockers:</span>
            <span className="text-xs" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{blockers.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" style={{ color: '#D97706' }} />
            <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Warnings:</span>
            <span className="text-xs" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{warnings.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4" style={{ color: '#2563EB' }} />
            <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Info:</span>
            <span className="text-xs" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{infoInsights.length}</span>
          </div>
        </div>
      </div>

      {/* Insights List */}
      <div className="p-4" style={{ maxHeight: '600px', overflowY: 'auto' }}>
        {/* Blockers */}
        {blockers.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs mb-2" style={{ color: 'var(--color-error-dark)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Blockers ({blockers.length})
            </h4>
            {blockers.map(renderInsightCard)}
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs mb-2" style={{ color: '#D97706', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Warnings ({warnings.length})
            </h4>
            {warnings.map(renderInsightCard)}
          </div>
        )}

        {/* Info */}
        {infoInsights.length > 0 && (
          <div>
            <h4 className="text-xs mb-2" style={{ color: '#2563EB', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Informational ({infoInsights.length})
            </h4>
            {infoInsights.map(renderInsightCard)}
          </div>
        )}

        {/* No Insights */}
        {insights.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: '#047857' }} />
            <p className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
              All Clear!
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
              No issues detected by AI analysis
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
