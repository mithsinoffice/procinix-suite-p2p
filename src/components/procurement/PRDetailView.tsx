import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, X, MessageCircle, FileText, Clock, AlertTriangle, TrendingUp, Shield, DollarSign, Package, Calendar, User, Building2, Download, Eye } from 'lucide-react';

type AIInsightSeverity = 'Blocker' | 'Warning' | 'Info';

interface AIInsight {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: AIInsightSeverity;
  confidence: number;
  evidence: string;
  recommendedAction: string;
}

interface PRLineItem {
  id: string;
  itemCode: string;
  itemName: string;
  description: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  totalPrice: number;
  needByDate: string;
  vendor?: string;
  catalogLocked?: boolean;
}

export function PRDetailView() {
  const { prId } = useParams();
  const navigate = useNavigate();
  const [selectedApprovalAction, setSelectedApprovalAction] = useState<string | null>(null);
  const [approvalComments, setApprovalComments] = useState('');

  // Mock PR Data
  const prData = {
    id: prId || 'PR-2024-002',
    prType: 'Regular',
    entity: 'India HQ',
    requestor: 'Priya Sharma',
    requestorEmail: 'priya.sharma@company.com',
    department: 'Operations',
    costCentre: 'CC-OPS-002',
    project: 'Q1 Production Scale-up',
    needByDate: '2024-12-25',
    totalAmount: 1250000,
    status: 'In Review',
    nextApprover: 'Finance Head',
    aiRiskLevel: 'Medium',
    createdDate: '2024-12-12',
    submittedDate: '2024-12-12',
    justification: 'Raw material procurement required for Q1 2025 production schedule. Critical items for scaling up production capacity by 30%.',
    attachments: ['Quote_RawMaterials_Q1.pdf', 'Vendor_Comparison.xlsx'],
    approvalHistory: [
      { approver: 'Dept Manager', action: 'Approved', date: '2024-12-12', comments: 'Approved as per production plan' },
      { approver: 'Procurement Head', action: 'Approved', date: '2024-12-13', comments: 'Vendor selection justified' }
    ]
  };

  const lineItems: PRLineItem[] = [
    { id: '1', itemCode: 'RM-001', itemName: 'Steel Sheet Grade A', description: '2mm thickness, 1200x2400mm', quantity: 500, uom: 'Sheets', unitPrice: 1800, totalPrice: 900000, needByDate: '2024-12-25', vendor: 'Acme Supplies' },
    { id: '2', itemCode: 'RM-002', itemName: 'Aluminum Rod 10mm', description: 'Industrial grade, 6m length', quantity: 200, uom: 'Rods', unitPrice: 450, totalPrice: 90000, needByDate: '2024-12-25', vendor: 'Acme Supplies' },
    { id: '3', itemCode: 'RM-003', itemName: 'Copper Wire 4mm', description: 'Pure copper, 100m coil', quantity: 80, uom: 'Coils', unitPrice: 1250, totalPrice: 100000, needByDate: '2024-12-25', vendor: 'Acme Supplies' },
    { id: '4', itemCode: 'RM-004', itemName: 'Rubber Gasket Set', description: 'Industrial sealing gaskets', quantity: 1000, uom: 'Sets', unitPrice: 85, totalPrice: 85000, needByDate: '2024-12-25', vendor: 'Acme Supplies' },
    { id: '5', itemCode: 'RM-005', itemName: 'Lubricant Oil Industrial', description: '20L container, high grade', quantity: 50, uom: 'Containers', unitPrice: 1500, totalPrice: 75000, needByDate: '2024-12-25', vendor: 'Acme Supplies' },
  ];

  // AI Insights
  const aiInsights: AIInsight[] = [
    {
      id: '1',
      category: 'Policy & Compliance',
      title: 'Vendor is Active & Compliant',
      description: 'Vendor "Acme Supplies" is active in the system with no compliance issues. Last transaction completed successfully 15 days ago.',
      severity: 'Info',
      confidence: 98,
      evidence: 'Vendor Master Record: Active, PAN verified, GST registered',
      recommendedAction: 'No action required'
    },
    {
      id: '2',
      category: 'Budget & Spend Control',
      title: 'Budget Check: Sufficient Balance',
      description: 'Cost Centre CC-OPS-002 has sufficient budget. Available: ₹35.5L, Requested: ₹12.5L, Post-PR Balance: ₹23L',
      severity: 'Info',
      confidence: 100,
      evidence: 'Budget System: CC-OPS-002 Q1 allocation',
      recommendedAction: 'Budget approved for this PR'
    },
    {
      id: '3',
      category: 'Vendor & Risk',
      title: 'Price Variance Detected',
      description: 'Item RM-001 (Steel Sheet Grade A) shows 12% price increase compared to last purchase price of ₹1,607 per sheet. Current price: ₹1,800 per sheet.',
      severity: 'Warning',
      confidence: 95,
      evidence: 'Last PO: PO-2024-015 dated 2024-11-20, Price: ₹1,607/sheet',
      recommendedAction: 'Request justification for price variance or negotiate with vendor'
    },
    {
      id: '4',
      category: 'Price & Catalog Controls',
      title: 'No Preferred Vendor for 2 Items',
      description: 'Items RM-004 and RM-005 do not have a preferred vendor defined in the system.',
      severity: 'Warning',
      confidence: 100,
      evidence: 'Item Master: No preferred vendor configured',
      recommendedAction: 'Consider defining preferred vendors for frequently purchased items'
    },
    {
      id: '5',
      category: 'Operational Feasibility',
      title: 'Delivery Timeline is Feasible',
      description: 'Need-by date is 13 days from now. Vendor standard lead time is 7-10 days. Timeline is achievable.',
      severity: 'Info',
      confidence: 92,
      evidence: 'Vendor Lead Time: 7-10 days, PR Need-by: 13 days',
      recommendedAction: 'No action required'
    },
    {
      id: '6',
      category: 'Operational Feasibility',
      title: 'No Duplicate PR Detected',
      description: 'No similar purchase requisitions found in the last 30 days for this cost centre.',
      severity: 'Info',
      confidence: 88,
      evidence: 'System scan: Last 30 days, CC-OPS-002',
      recommendedAction: 'No action required'
    }
  ];

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

  const getSeverityColor = (severity: AIInsightSeverity) => {
    switch (severity) {
      case 'Blocker': return { bg: 'var(--color-error-light)', color: 'var(--color-error-dark)', icon: X };
      case 'Warning': return { bg: 'var(--color-warning-light)', color: 'var(--color-warning-dark)', icon: AlertTriangle };
      case 'Info': return { bg: 'var(--color-success-light)', color: 'var(--color-success-dark)', icon: CheckCircle };
    }
  };

  const hasBlockers = aiInsights.some(insight => insight.severity === 'Blocker');
  const hasWarnings = aiInsights.some(insight => insight.severity === 'Warning');

  const handleApprove = () => {
    if (hasBlockers) {
      alert('Cannot approve: Blocker issues must be resolved first');
      return;
    }
    console.log('Approving PR with comments:', approvalComments);
    // Handle approval logic
  };

  const handleReject = () => {
    if (!approvalComments) {
      alert('Please provide rejection reason');
      return;
    }
    console.log('Rejecting PR with comments:', approvalComments);
    // Handle rejection logic
  };

  const handleSendBack = () => {
    if (!approvalComments) {
      alert('Please provide reason for sending back');
      return;
    }
    console.log('Sending back PR with comments:', approvalComments);
    // Handle send back logic
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100"
            style={{ color: 'var(--color-mercury-grey)' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl" style={{ color: 'var(--color-ink)', margin: 0 }}>PR Details: {prData.id}</h1>
              <span className="px-3 py-1 rounded text-sm" style={{ backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' }}>
                {prData.status}
              </span>
              <span className="px-3 py-1 rounded text-sm" style={{ backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal)' }}>
                {prData.prType} PR
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
              Created by {prData.requestor} on {prData.createdDate}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--color-cloud)', border: '1px solid var(--color-silver)', color: 'var(--color-mercury-grey)' }}>
              <Download className="w-4 h-4 inline mr-2" />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-3 gap-6">
          {/* Main Content - Left 2 columns */}
          <div className="col-span-2 space-y-6">
            {/* PR Header Info */}
            <div className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)' }}>
              <h3 className="text-base mb-4" style={{ color: 'var(--color-ink)', fontWeight: '600', margin: 0 }}>Purchase Requisition Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    <label className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Entity</label>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--color-ink)', margin: 0 }}>{prData.entity}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    <label className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Requestor</label>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--color-ink)', margin: 0 }}>{prData.requestor}</p>
                  <p className="text-xs" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>{prData.requestorEmail}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    <label className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Department</label>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--color-ink)', margin: 0 }}>{prData.department}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    <label className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Cost Centre</label>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--color-ink)', margin: 0 }}>{prData.costCentre}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    <label className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Need-by Date</label>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--color-error-dark)', margin: 0, fontWeight: '600' }}>{prData.needByDate}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    <label className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Project</label>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--color-ink)', margin: 0 }}>{prData.project}</p>
                </div>
              </div>

              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-silver)' }}>
                <label className="text-xs mb-2 block" style={{ color: 'var(--color-mercury-grey)' }}>Business Justification</label>
                <p className="text-sm" style={{ color: 'var(--color-ink)', margin: 0 }}>{prData.justification}</p>
              </div>

              {prData.attachments.length > 0 && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-silver)' }}>
                  <label className="text-xs mb-2 block" style={{ color: 'var(--color-mercury-grey)' }}>Attachments</label>
                  <div className="flex flex-wrap gap-2">
                    {prData.attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)', border: '1px solid var(--color-silver)' }}>
                        <FileText className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                        <span className="text-xs" style={{ color: 'var(--color-ink)' }}>{file}</span>
                        <Eye className="w-3 h-3 cursor-pointer" style={{ color: 'var(--color-mercury-grey)' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
              <div className="p-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
                <h3 className="text-base" style={{ color: 'var(--color-ink)', fontWeight: '600', margin: 0 }}>Line Items ({lineItems.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Item Code</th>
                      <th className="px-6 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Item Name</th>
                      <th className="px-6 py-3 text-left text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Description</th>
                      <th className="px-6 py-3 text-right text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Quantity</th>
                      <th className="px-6 py-3 text-right text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Unit Price</th>
                      <th className="px-6 py-3 text-right text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--color-silver)' }}>
                    {lineItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{item.itemCode}</td>
                        <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-ink)' }}>{item.itemName}</td>
                        <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>{item.description}</td>
                        <td className="px-6 py-4 text-sm text-right" style={{ color: 'var(--color-ink)' }}>{item.quantity} {item.uom}</td>
                        <td className="px-6 py-4 text-sm text-right" style={{ color: 'var(--color-ink)' }}>{formatCurrency(item.unitPrice)}</td>
                        <td className="px-6 py-4 text-sm text-right" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot style={{ backgroundColor: 'var(--color-cloud)' }}>
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-sm text-right" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>Total Amount:</td>
                      <td className="px-6 py-4 text-sm text-right" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{formatCurrency(prData.totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Approval History */}
            {prData.approvalHistory.length > 0 && (
              <div className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)' }}>
                <h3 className="text-base mb-4" style={{ color: 'var(--color-ink)', fontWeight: '600', margin: 0 }}>Approval History</h3>
                <div className="space-y-3">
                  {prData.approvalHistory.map((approval, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)' }}>
                      <CheckCircle className="w-5 h-5 mt-0.5" style={{ color: 'var(--color-success-dark)' }} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600', margin: 0 }}>{approval.approver}</p>
                          <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>{approval.date}</span>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--color-success-dark)', margin: 0 }}>Action: {approval.action}</p>
                        {approval.comments && (
                          <p className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>"{approval.comments}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approval Actions (if user is approver) */}
            {prData.status === 'In Review' && (
              <div className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)' }}>
                <h3 className="text-base mb-4" style={{ color: 'var(--color-ink)', fontWeight: '600', margin: 0 }}>Approval Actions</h3>
                
                <div className="mb-4">
                  <label className="text-xs mb-2 block" style={{ color: 'var(--color-mercury-grey)' }}>Comments / Justification</label>
                  <textarea
                    value={approvalComments}
                    onChange={(e) => setApprovalComments(e.target.value)}
                    placeholder={hasWarnings ? 'Warning: Please provide justification for approval override...' : 'Add your comments...'}
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg text-sm"
                    style={{ border: '1px solid var(--color-silver)', backgroundColor: 'var(--color-cloud)', color: 'var(--color-ink)' }}
                  />
                </div>

                {hasBlockers && (
                  <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: 'var(--color-error-light)' }}>
                    <X className="w-4 h-4 mt-0.5" style={{ color: 'var(--color-error-dark)' }} />
                    <p className="text-xs" style={{ color: 'var(--color-error-dark)', margin: 0 }}>
                      <strong>Blocker Issues Detected:</strong> This PR cannot be approved until blocker issues are resolved.
                    </p>
                  </div>
                )}

                {hasWarnings && !hasBlockers && (
                  <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: 'var(--color-warning-light)' }}>
                    <AlertTriangle className="w-4 h-4 mt-0.5" style={{ color: 'var(--color-warning-dark)' }} />
                    <p className="text-xs" style={{ color: 'var(--color-warning-dark)', margin: 0 }}>
                      <strong>Warning Issues Detected:</strong> Justification required to approve this PR.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSendBack}
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: 'var(--color-cloud)', border: '1px solid var(--color-silver)', color: 'var(--color-mercury-grey)' }}
                  >
                    <MessageCircle className="w-4 h-4 inline mr-2" />
                    Send Back
                  </button>
                  <button
                    onClick={handleReject}
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: 'var(--color-error-light)', border: '1px solid #FCA5A5', color: 'var(--color-error-dark)' }}
                  >
                    <X className="w-4 h-4 inline mr-2" />
                    Reject
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={hasBlockers}
                    className="px-4 py-2 rounded-lg text-white text-sm"
                    style={{ 
                      backgroundColor: hasBlockers ? 'var(--color-slate)' : 'var(--color-success-dark)',
                      cursor: hasBlockers ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <CheckCircle className="w-4 h-4 inline mr-2" />
                    Approve
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* AI Insights Panel - Right Column (Sticky) */}
          <div className="col-span-1">
            <div className="sticky top-8">
              <div className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
                  <h3 className="text-base" style={{ color: 'var(--color-ink)', fontWeight: '600', margin: 0 }}>Agentic AI Insights</h3>
                </div>

                <div className="space-y-4">
                  {/* Risk Summary */}
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Overall Risk</span>
                      <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' }}>
                        {prData.aiRiskLevel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                      <span>{aiInsights.filter(i => i.severity === 'Blocker').length} Blockers</span>
                      <span>•</span>
                      <span>{aiInsights.filter(i => i.severity === 'Warning').length} Warnings</span>
                      <span>•</span>
                      <span>{aiInsights.filter(i => i.severity === 'Info').length} Info</span>
                    </div>
                  </div>

                  {/* Insights by Category */}
                  <div className="space-y-3">
                    {['Policy & Compliance', 'Budget & Spend Control', 'Vendor & Risk', 'Price & Catalog Controls', 'Operational Feasibility'].map(category => {
                      const categoryInsights = aiInsights.filter(i => i.category === category);
                      if (categoryInsights.length === 0) return null;

                      return (
                        <div key={category}>
                          <h4 className="text-xs mb-2" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>{category}</h4>
                          <div className="space-y-2">
                            {categoryInsights.map(insight => {
                              const severityStyle = getSeverityColor(insight.severity);
                              const SeverityIcon = severityStyle.icon;

                              return (
                                <div key={insight.id} className="p-3 rounded-lg" style={{ backgroundColor: severityStyle.bg, border: `1px solid ${severityStyle.color}20` }}>
                                  <div className="flex items-start gap-2 mb-2">
                                    <SeverityIcon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: severityStyle.color }} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs mb-1" style={{ color: severityStyle.color, fontWeight: '600', margin: 0 }}>{insight.title}</p>
                                      <p className="text-xs mb-2" style={{ color: 'var(--color-ink)', margin: 0 }}>{insight.description}</p>
                                      
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Confidence:</span>
                                        <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-silver)' }}>
                                          <div className="h-full rounded-full" style={{ backgroundColor: severityStyle.color, width: `${insight.confidence}%` }} />
                                        </div>
                                        <span className="text-xs" style={{ color: severityStyle.color, fontWeight: '600' }}>{insight.confidence}%</span>
                                      </div>
                                      
                                      <div className="mb-2">
                                        <p className="text-xs" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
                                          <strong>Evidence:</strong> {insight.evidence}
                                        </p>
                                      </div>
                                      
                                      <div className="p-2 rounded" style={{ backgroundColor: 'white' }}>
                                        <p className="text-xs" style={{ color: 'var(--color-ink)', margin: 0 }}>
                                          <strong>Action:</strong> {insight.recommendedAction}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}