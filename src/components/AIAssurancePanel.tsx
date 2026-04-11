import { useState } from 'react';
import {
  Shield,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  TrendingUp,
  Eye,
  FileText,
  DollarSign,
  Building2,
  User,
  Calendar,
  AlertCircle,
  Clock,
  Database,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Play,
  Loader2
} from 'lucide-react';

interface AIAssuranceInsight {
  id: string;
  category: 'compliance' | 'vendor_risk' | 'payment_impact' | 'evidence';
  severity: 'blocker' | 'warning' | 'info';
  title: string;
  explanation: string;
  confidence: number;
  evidence: {
    type: string;
    details: any;
  };
  recommendedActions: {
    label: string;
    type: 'primary' | 'secondary' | 'danger';
    handler: () => void;
  }[];
  canOverride: boolean;
  overrideReason?: string;
}

interface AIAssurancePanelProps {
  invoiceId: string;
  invoiceData: any;
  onActionTaken?: (action: string, insight: AIAssuranceInsight) => void;
}

export function AIAssurancePanel({ invoiceId, invoiceData, onActionTaken }: AIAssurancePanelProps) {
  const [activeTab, setActiveTab] = useState<'compliance' | 'vendor_risk' | 'payment_impact' | 'evidence'>('compliance');
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
  const [showEvidenceModal, setShowEvidenceModal] = useState<string | null>(null);
  const [overrideReasons, setOverrideReasons] = useState<Record<string, string>>({});
  const [checksStatus, setChecksStatus] = useState<'idle' | 'running' | 'completed'>('completed');

  // Generate AI insights based on invoice data
  const insights = generateAIInsights(invoiceData);
  
  const blockerCount = insights.filter(i => i.severity === 'blocker').length;
  const warningCount = insights.filter(i => i.severity === 'warning').length;
  const infoCount = insights.filter(i => i.severity === 'info').length;

  const overallRisk = blockerCount > 0 ? 'High' : warningCount > 2 ? 'Medium' : 'Low';

  const toggleInsightExpansion = (insightId: string) => {
    const newExpanded = new Set(expandedInsights);
    if (newExpanded.has(insightId)) {
      newExpanded.delete(insightId);
    } else {
      newExpanded.add(insightId);
    }
    setExpandedInsights(newExpanded);
  };

  const handleOverride = (insightId: string, reason: string) => {
    setOverrideReasons({ ...overrideReasons, [insightId]: reason });
    if (onActionTaken) {
      const insight = insights.find(i => i.id === insightId);
      if (insight) {
        onActionTaken('override', insight);
      }
    }
  };

  const runChecks = () => {
    setChecksStatus('running');
    setTimeout(() => {
      setChecksStatus('completed');
    }, 2000);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'blocker': return 'var(--color-error-dark)';
      case 'warning': return '#F59E0B';
      case 'info': return 'var(--color-teal)';
      default: return 'var(--color-mercury-grey)';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'blocker': return XCircle;
      case 'warning': return AlertTriangle;
      case 'info': return Info;
      default: return Info;
    }
  };

  const getRiskBadgeStyle = (risk: string) => {
    switch (risk) {
      case 'High':
        return { backgroundColor: 'var(--color-error-light)', color: 'var(--color-error-dark)', borderColor: '#FCA5A5' };
      case 'Medium':
        return { backgroundColor: '#FEF3C7', color: '#D97706', borderColor: '#FCD34D' };
      case 'Low':
        return { backgroundColor: '#D1FAE5', color: '#059669', borderColor: '#6EE7B7' };
      default:
        return { backgroundColor: 'var(--color-cloud)', color: 'var(--color-mercury-grey)', borderColor: 'var(--color-silver)' };
    }
  };

  const filteredInsights = insights.filter(i => i.category === activeTab);

  const tabs = [
    { key: 'compliance' as const, label: 'Compliance & Tax', icon: Shield },
    { key: 'vendor_risk' as const, label: 'Vendor & Risk', icon: Building2 },
    { key: 'payment_impact' as const, label: 'Cash & Payment', icon: DollarSign },
    { key: 'evidence' as const, label: 'Evidence & Audit', icon: Database }
  ];

  return (
    <div 
      className="flex flex-col h-full"
      style={{ 
        width: '420px',
        backgroundColor: '#FFFFFF',
        borderLeft: '1px solid var(--color-silver)'
      }}
    >
      {/* Header */}
      <div className="p-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="flex items-center justify-center rounded-lg" 
              style={{ 
                width: '40px', 
                height: '40px', 
                backgroundColor: '#E6F7F8' 
              }}
            >
              <Shield className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
            </div>
            <div>
              <h3 className="text-lg" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                AI Assurance
              </h3>
              <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                Compliance & Risk Validation
              </p>
            </div>
          </div>
          <button
            onClick={runChecks}
            disabled={checksStatus === 'running'}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: checksStatus === 'running' ? 'var(--color-silver)' : 'var(--color-teal)',
              color: '#FFFFFF',
              border: 'none',
              cursor: checksStatus === 'running' ? 'not-allowed' : 'pointer'
            }}
          >
            {checksStatus === 'running' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Running...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span className="text-xs">Re-run</span>
              </>
            )}
          </button>
        </div>

        {/* Risk Score & Counts */}
        <div className="grid grid-cols-2 gap-3">
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: 'var(--color-cloud)', border: '1px solid var(--color-silver)' }}
          >
            <div className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Overall Risk</div>
            <div 
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs"
              style={{
                ...getRiskBadgeStyle(overallRisk),
                fontWeight: '600',
                border: `1px solid ${getRiskBadgeStyle(overallRisk).borderColor}`
              }}
            >
              {overallRisk}
            </div>
          </div>
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: 'var(--color-cloud)', border: '1px solid var(--color-silver)' }}
          >
            <div className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Findings</div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--color-error-dark)', fontWeight: '600' }}>
                {blockerCount} Blockers
              </span>
              <span className="text-xs" style={{ color: '#F59E0B', fontWeight: '600' }}>
                {warningCount} Warnings
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div 
        className="flex gap-1 px-4 py-3"
        style={{ borderBottom: '1px solid var(--color-silver)', backgroundColor: '#FAFBFC' }}
      >
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-xs"
            style={{
              backgroundColor: activeTab === tab.key ? '#FFFFFF' : 'transparent',
              color: activeTab === tab.key ? 'var(--color-teal)' : 'var(--color-mercury-grey)',
              border: activeTab === tab.key ? '1px solid var(--color-silver)' : '1px solid transparent',
              fontWeight: activeTab === tab.key ? '600' : '400'
            }}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{tab.label.split('&')[0]}</span>
          </button>
        ))}
      </div>

      {/* Insights List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredInsights.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: '#10B981' }} />
            <p style={{ color: 'var(--color-ink)', fontWeight: '600' }}>All checks passed</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
              No issues found in this category
            </p>
          </div>
        ) : (
          filteredInsights.map(insight => (
            <InsightCard
              key={insight.id}
              insight={insight}
              isExpanded={expandedInsights.has(insight.id)}
              onToggleExpand={() => toggleInsightExpansion(insight.id)}
              onShowEvidence={() => setShowEvidenceModal(insight.id)}
              onOverride={(reason) => handleOverride(insight.id, reason)}
              overrideReason={overrideReasons[insight.id]}
              getSeverityColor={getSeverityColor}
              getSeverityIcon={getSeverityIcon}
              onActionTaken={onActionTaken}
            />
          ))
        )}
      </div>

      {/* Evidence Modal */}
      {showEvidenceModal && (
        <EvidenceModal
          insight={insights.find(i => i.id === showEvidenceModal)!}
          onClose={() => setShowEvidenceModal(null)}
        />
      )}
    </div>
  );
}

interface InsightCardProps {
  insight: AIAssuranceInsight;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onShowEvidence: () => void;
  onOverride: (reason: string) => void;
  overrideReason?: string;
  getSeverityColor: (severity: string) => string;
  getSeverityIcon: (severity: string) => any;
  onActionTaken?: (action: string, insight: AIAssuranceInsight) => void;
}

function InsightCard({
  insight,
  isExpanded,
  onToggleExpand,
  onShowEvidence,
  onOverride,
  overrideReason,
  getSeverityColor,
  getSeverityIcon,
  onActionTaken
}: InsightCardProps) {
  const [showOverrideInput, setShowOverrideInput] = useState(false);
  const [overrideText, setOverrideText] = useState('');

  const SeverityIcon = getSeverityIcon(insight.severity);

  const handleActionClick = (action: any) => {
    action.handler();
    if (onActionTaken) {
      onActionTaken(action.label, insight);
    }
  };

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: `1px solid ${getSeverityColor(insight.severity)}40`,
        backgroundColor: '#FFFFFF'
      }}
    >
      {/* Card Header */}
      <div 
        className="p-4 cursor-pointer"
        onClick={onToggleExpand}
        style={{ borderBottom: isExpanded ? '1px solid var(--color-silver)' : 'none' }}
      >
        <div className="flex items-start gap-3">
          <div 
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{ 
              width: '32px', 
              height: '32px',
              backgroundColor: `${getSeverityColor(insight.severity)}15`
            }}
          >
            <SeverityIcon 
              className="w-4 h-4" 
              style={{ color: getSeverityColor(insight.severity) }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="px-2 py-0.5 rounded text-xs uppercase tracking-wide"
                style={{
                  backgroundColor: `${getSeverityColor(insight.severity)}15`,
                  color: getSeverityColor(insight.severity),
                  fontWeight: '600'
                }}
              >
                {insight.severity}
              </span>
              <span 
                className="text-xs px-2 py-0.5 rounded"
                style={{ backgroundColor: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' }}
              >
                {insight.confidence}% confidence
              </span>
            </div>
            <h4 className="text-sm mb-1" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
              {insight.title}
            </h4>
            <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
              {insight.explanation}
            </p>
          </div>
          <button className="flex-shrink-0 p-1">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
            ) : (
              <ChevronDown className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-3" style={{ backgroundColor: '#FAFBFC' }}>
          {/* Evidence Link */}
          <button
            onClick={onShowEvidence}
            className="flex items-center gap-2 text-xs transition-colors"
            style={{ color: 'var(--color-teal)' }}
          >
            <Eye className="w-3.5 h-3.5" />
            Show Evidence
          </button>

          {/* Recommended Actions */}
          {insight.recommendedActions.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>
                Recommended Actions
              </div>
              <div className="space-y-2">
                {insight.recommendedActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleActionClick(action)}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs transition-colors"
                    style={{
                      backgroundColor: action.type === 'primary' ? 'var(--color-teal)' : 
                                     action.type === 'danger' ? 'var(--color-error-dark)' : '#FFFFFF',
                      color: action.type === 'primary' || action.type === 'danger' ? '#FFFFFF' : 'var(--color-ink)',
                      border: action.type === 'secondary' ? '1px solid var(--color-silver)' : 'none'
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Override Section */}
          {insight.canOverride && !overrideReason && (
            <div className="pt-3" style={{ borderTop: '1px solid var(--color-silver)' }}>
              {!showOverrideInput ? (
                <button
                  onClick={() => setShowOverrideInput(true)}
                  className="text-xs"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Override with reason
                </button>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={overrideText}
                    onChange={(e) => setOverrideText(e.target.value)}
                    placeholder="Enter override reason..."
                    className="w-full px-3 py-2 rounded-lg text-xs"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--color-silver)',
                      color: 'var(--color-ink)',
                      resize: 'none'
                    }}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onOverride(overrideText);
                        setShowOverrideInput(false);
                      }}
                      disabled={!overrideText.trim()}
                      className="px-3 py-1.5 rounded text-xs"
                      style={{
                        backgroundColor: overrideText.trim() ? 'var(--color-teal)' : 'var(--color-silver)',
                        color: '#FFFFFF'
                      }}
                    >
                      Submit Override
                    </button>
                    <button
                      onClick={() => setShowOverrideInput(false)}
                      className="px-3 py-1.5 rounded text-xs"
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-mercury-grey)'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Override Applied */}
          {overrideReason && (
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#D97706' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs mb-1" style={{ color: '#D97706', fontWeight: '600' }}>
                    Override Applied
                  </div>
                  <div className="text-xs" style={{ color: '#92400E' }}>
                    {overrideReason}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface EvidenceModalProps {
  insight: AIAssuranceInsight;
  onClose: () => void;
}

function EvidenceModal({ insight, onClose }: EvidenceModalProps) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(10, 15, 20, 0.6)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        style={{ backgroundColor: '#FFFFFF' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg mb-1" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                Evidence: {insight.title}
              </h3>
              <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                Detailed validation data and sources
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <XCircle className="w-5 h-5" style={{ color: 'var(--color-mercury-grey)' }} />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 180px)' }}>
          <div className="space-y-4">
            {/* Evidence Type */}
            <div>
              <div className="text-xs mb-2" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>
                Evidence Type
              </div>
              <div 
                className="px-3 py-2 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--color-cloud)', color: 'var(--color-ink)' }}
              >
                {insight.evidence.type}
              </div>
            </div>

            {/* Evidence Details */}
            <div>
              <div className="text-xs mb-2" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>
                Details
              </div>
              <div 
                className="p-4 rounded-lg"
                style={{ backgroundColor: 'var(--color-cloud)', border: '1px solid var(--color-silver)' }}
              >
                <pre className="text-xs whitespace-pre-wrap" style={{ color: 'var(--color-ink)' }}>
                  {JSON.stringify(insight.evidence.details, null, 2)}
                </pre>
              </div>
            </div>

            {/* Timestamp */}
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
              <Clock className="w-4 h-4" />
              <span>Check performed: {new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div 
          className="p-6 flex justify-end"
          style={{ borderTop: '1px solid var(--color-silver)' }}
        >
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--color-teal)',
              color: '#FFFFFF'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Generate AI insights based on invoice data
function generateAIInsights(invoiceData: any): AIAssuranceInsight[] {
  const insights: AIAssuranceInsight[] = [];

  // A) Vendor Compliance Checks
  if (invoiceData.vendorStatus === 'Inactive' || invoiceData.vendorStatus === 'Blocked') {
    insights.push({
      id: 'vendor-status-inactive',
      category: 'vendor_risk',
      severity: 'blocker',
      title: 'Vendor Status: Inactive/Blocked',
      explanation: `Vendor ${invoiceData.vendorName} is currently ${invoiceData.vendorStatus}. Payment cannot be processed until vendor is activated.`,
      confidence: 100,
      evidence: {
        type: 'Vendor Master Record',
        details: {
          vendorId: invoiceData.vendorId,
          vendorName: invoiceData.vendorName,
          status: invoiceData.vendorStatus,
          lastUpdated: '2025-01-10'
        }
      },
      recommendedActions: [
        {
          label: 'Request Vendor Reactivation',
          type: 'primary',
          handler: () => console.log('Requesting vendor reactivation')
        },
        {
          label: 'Contact Vendor Management',
          type: 'secondary',
          handler: () => console.log('Contacting vendor management')
        }
      ],
      canOverride: false
    });
  }

  if (!invoiceData.vendorPAN || invoiceData.vendorPAN.length !== 10) {
    insights.push({
      id: 'vendor-pan-missing',
      category: 'vendor_risk',
      severity: 'warning',
      title: 'Vendor PAN Missing or Invalid',
      explanation: 'Valid PAN is required for TDS compliance. Payment may be delayed without proper PAN details.',
      confidence: 95,
      evidence: {
        type: 'Vendor Tax Details',
        details: {
          vendorId: invoiceData.vendorId,
          panStatus: invoiceData.vendorPAN ? 'Invalid Format' : 'Missing',
          panValue: invoiceData.vendorPAN || 'Not provided'
        }
      },
      recommendedActions: [
        {
          label: 'Request PAN from Vendor',
          type: 'primary',
          handler: () => console.log('Requesting PAN')
        },
        {
          label: 'Send Back to AP for PAN Update',
          type: 'secondary',
          handler: () => console.log('Sending back')
        }
      ],
      canOverride: true
    });
  }

  if (invoiceData.bankDetailsChanged) {
    insights.push({
      id: 'bank-details-changed',
      category: 'vendor_risk',
      severity: 'warning',
      title: 'Bank Details Changed Recently',
      explanation: `Vendor bank details were updated on ${invoiceData.bankChangeDate}. Please verify to prevent fraud.`,
      confidence: 88,
      evidence: {
        type: 'Bank Account Change Log',
        details: {
          previousAccount: invoiceData.previousBankAccount,
          currentAccount: invoiceData.currentBankAccount,
          changeDate: invoiceData.bankChangeDate,
          changedBy: 'AP Team'
        }
      },
      recommendedActions: [
        {
          label: 'Verify Bank Details with Vendor',
          type: 'primary',
          handler: () => console.log('Verifying bank details')
        },
        {
          label: 'Put Payment on Hold',
          type: 'danger',
          handler: () => console.log('Putting payment on hold')
        }
      ],
      canOverride: true
    });
  }

  // B) TDS & Statutory Checks
  if (invoiceData.section206ABApplicable && !invoiceData.higherTDSApplied) {
    insights.push({
      id: 'section-206ab-blocker',
      category: 'compliance',
      severity: 'blocker',
      title: 'Section 206AB: Higher TDS Rate Required',
      explanation: 'Vendor is a non-filer under Section 206AB. Higher TDS rate must be applied as per statutory requirement.',
      confidence: 100,
      evidence: {
        type: 'Section 206AB Compliance Check',
        details: {
          vendorPAN: invoiceData.vendorPAN,
          filingStatus: 'Non-Filer',
          requiredTDSRate: '20%',
          appliedTDSRate: invoiceData.tdsRate,
          baseAmount: invoiceData.tdsBaseAmount
        }
      },
      recommendedActions: [
        {
          label: 'Apply Higher TDS Rate (20%)',
          type: 'primary',
          handler: () => console.log('Applying higher TDS rate')
        },
        {
          label: 'Send Back for TDS Correction',
          type: 'secondary',
          handler: () => console.log('Sending back for correction')
        }
      ],
      canOverride: false
    });
  }

  if (invoiceData.tdsSection !== invoiceData.expectedTDSSection) {
    insights.push({
      id: 'tds-section-mismatch',
      category: 'compliance',
      severity: 'warning',
      title: 'TDS Section Mismatch Detected',
      explanation: `Invoice nature suggests ${invoiceData.expectedTDSSection} but ${invoiceData.tdsSection} is applied. Verify correct section.`,
      confidence: 85,
      evidence: {
        type: 'TDS Section Validation',
        details: {
          invoiceNature: invoiceData.invoiceNature,
          glCode: invoiceData.glCode,
          expectedSection: invoiceData.expectedTDSSection,
          expectedRate: invoiceData.expectedTDSRate,
          appliedSection: invoiceData.tdsSection,
          appliedRate: invoiceData.tdsRate
        }
      },
      recommendedActions: [
        {
          label: `Apply Recommended TDS: ${invoiceData.expectedTDSSection} @ ${invoiceData.expectedTDSRate}%`,
          type: 'primary',
          handler: () => console.log('Applying recommended TDS')
        },
        {
          label: 'Create Exception Approval',
          type: 'secondary',
          handler: () => console.log('Creating exception')
        }
      ],
      canOverride: true
    });
  }

  if (invoiceData.lowerTDSCertificate && invoiceData.lowerTDSCertificate.status === 'Expired') {
    insights.push({
      id: 'lower-tds-certificate-expired',
      category: 'compliance',
      severity: 'blocker',
      title: 'Lower TDS Certificate Expired',
      explanation: 'Vendor has a lower TDS certificate but it has expired. Normal TDS rates must be applied.',
      confidence: 100,
      evidence: {
        type: 'TDS Certificate Validation',
        details: {
          certificateNumber: invoiceData.lowerTDSCertificate.number,
          validFrom: invoiceData.lowerTDSCertificate.validFrom,
          validTo: invoiceData.lowerTDSCertificate.validTo,
          status: 'Expired',
          currentDate: new Date().toISOString().split('T')[0]
        }
      },
      recommendedActions: [
        {
          label: 'Request Updated Certificate',
          type: 'primary',
          handler: () => console.log('Requesting updated certificate')
        },
        {
          label: 'Apply Normal TDS Rates',
          type: 'secondary',
          handler: () => console.log('Applying normal rates')
        }
      ],
      canOverride: false
    });
  }

  // C) MSME Payment Criticality
  if (invoiceData.isMSME) {
    const daysOverdue = invoiceData.msmePaymentDaysOverdue || 0;
    const severity = daysOverdue > 45 ? 'blocker' : daysOverdue > 30 ? 'warning' : 'info';
    
    insights.push({
      id: 'msme-payment-criticality',
      category: 'payment_impact',
      severity: severity as 'blocker' | 'warning' | 'info',
      title: `MSME Payment ${daysOverdue > 45 ? 'Critically Overdue' : daysOverdue > 30 ? 'Due Soon' : 'Priority'}`,
      explanation: `Vendor is MSME (${invoiceData.msmeCategory}). ${daysOverdue > 0 ? `Payment is ${daysOverdue} days overdue.` : 'Ensure timely payment for MSME compliance.'}`,
      confidence: 100,
      evidence: {
        type: 'MSME Compliance Check',
        details: {
          msmeCategory: invoiceData.msmeCategory,
          msmeRegistrationNumber: invoiceData.msmeRegistrationNumber,
          invoiceDate: invoiceData.invoiceDate,
          dueDate: invoiceData.dueDate,
          daysOverdue: daysOverdue,
          statutoryLimit: '45 days'
        }
      },
      recommendedActions: [
        {
          label: 'Mark as Critical Payment',
          type: 'primary',
          handler: () => console.log('Marking as critical')
        },
        {
          label: 'Set High Payment Priority',
          type: 'primary',
          handler: () => console.log('Setting high priority')
        }
      ],
      canOverride: daysOverdue <= 30
    });
  }

  // D) Advances Not Adjusted
  if (invoiceData.openAdvanceBalance > 0 && invoiceData.advanceAdjusted === 0) {
    insights.push({
      id: 'advance-not-adjusted',
      category: 'payment_impact',
      severity: 'warning',
      title: 'Open Vendor Advances Not Adjusted',
      explanation: `Vendor has ₹${invoiceData.openAdvanceBalance.toLocaleString()} in open advances. No adjustment applied to this invoice.`,
      confidence: 95,
      evidence: {
        type: 'Advance Balance Check',
        details: {
          totalAdvances: invoiceData.totalAdvances,
          advanceAdjusted: invoiceData.advanceAdjusted,
          openBalance: invoiceData.openAdvanceBalance,
          advanceIds: invoiceData.advanceIds || []
        }
      },
      recommendedActions: [
        {
          label: 'Review Advance Adjustment',
          type: 'primary',
          handler: () => console.log('Reviewing advances')
        },
        {
          label: 'Send Back to AP for Adjustment',
          type: 'secondary',
          handler: () => console.log('Sending back for adjustment')
        }
      ],
      canOverride: true
    });
  }

  // E) GST Return Filing Assurance
  if (invoiceData.gstReturnStatus === 'Not Found') {
    insights.push({
      id: 'gst-return-not-found',
      category: 'compliance',
      severity: 'warning',
      title: 'Invoice Not Found in Vendor GST Return',
      explanation: 'Invoice does not appear in vendor\'s GST return. Consider GST retention until vendor files return.',
      confidence: 82,
      evidence: {
        type: 'GST Return Reconciliation',
        details: {
          invoiceGSTIN: invoiceData.invoiceGSTIN,
          invoiceNumber: invoiceData.invoiceNumber,
          gstAmount: invoiceData.gstAmount,
          returnPeriod: invoiceData.gstReturnPeriod,
          matchStatus: 'Not Found',
          lastChecked: new Date().toISOString()
        }
      },
      recommendedActions: [
        {
          label: 'Enable GST Retention',
          type: 'primary',
          handler: () => console.log('Enabling GST retention')
        },
        {
          label: 'Send Query to Vendor',
          type: 'secondary',
          handler: () => console.log('Sending query')
        },
        {
          label: 'Mark as Exception with Reason',
          type: 'secondary',
          handler: () => console.log('Creating exception')
        }
      ],
      canOverride: true
    });
  }

  // F) Duplicate & Fraud Detection
  if (invoiceData.duplicateDetected) {
    insights.push({
      id: 'duplicate-invoice-detected',
      category: 'vendor_risk',
      severity: 'blocker',
      title: 'Exact Duplicate Invoice Detected',
      explanation: `Invoice ${invoiceData.duplicateInvoiceNumber} with same vendor and invoice number already exists in the system.`,
      confidence: 100,
      evidence: {
        type: 'Duplicate Detection',
        details: {
          currentInvoice: invoiceData.invoiceNumber,
          duplicateInvoice: invoiceData.duplicateInvoiceNumber,
          duplicateId: invoiceData.duplicateInvoiceId,
          duplicateDate: invoiceData.duplicateInvoiceDate,
          duplicateAmount: invoiceData.duplicateInvoiceAmount
        }
      },
      recommendedActions: [
        {
          label: 'View Duplicate Invoice',
          type: 'primary',
          handler: () => console.log('Opening duplicate invoice')
        },
        {
          label: 'Put Invoice on Hold',
          type: 'danger',
          handler: () => console.log('Putting on hold')
        }
      ],
      canOverride: false
    });
  }

  // Evidence & Audit insights
  insights.push({
    id: 'audit-trail-complete',
    category: 'evidence',
    severity: 'info',
    title: 'Complete Audit Trail Available',
    explanation: 'All invoice lifecycle events have been logged and are available for compliance review.',
    confidence: 100,
    evidence: {
      type: 'Audit Trail Summary',
      details: {
        createdBy: invoiceData.createdBy,
        createdDate: invoiceData.createdDate,
        submittedBy: invoiceData.submittedBy,
        submittedDate: invoiceData.submittedDate,
        totalEvents: 15,
        complianceChecksPassed: 12
      }
    },
    recommendedActions: [
      {
        label: 'View Full Audit Trail',
        type: 'secondary',
        handler: () => console.log('Viewing audit trail')
      }
    ],
    canOverride: false
  });

  return insights;
}