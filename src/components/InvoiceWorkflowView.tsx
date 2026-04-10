import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, FileText, Building2, Calendar, DollarSign,
  CheckCircle, Clock, AlertTriangle, User, MessageSquare,
  Download, Eye, Zap, TrendingUp, Shield
} from 'lucide-react';
import { AIInsightsPanel } from './AIInsightsPanel';

interface WorkflowStep {
  stage: string;
  status: 'completed' | 'current' | 'pending';
  approver?: string;
  action?: string;
  timestamp?: string;
  slaHours: number;
  elapsedHours?: number;
  comments?: string;
}

interface AuditEntry {
  timestamp: string;
  user: string;
  action: string;
  comments?: string;
  aiRecommendation?: string;
}

export function InvoiceWorkflowView() {
  const navigate = useNavigate();
  const { id } = useParams();

  // Mock invoice data
  const invoice = {
    id: 'INV-001',
    invoiceNumber: 'INV-2024-00123',
    vendorName: 'Tech Solutions Pvt Ltd',
    vendorCode: 'VEN-1001',
    vendorGSTIN: '29AABCT1234F1Z5',
    poNumber: 'PO-2024-001',
    grnNumber: 'GRN-2024-056',
    invoiceDate: '2024-12-10',
    invoiceAmount: 125000,
    gstAmount: 11250,
    tdsAmount: 2250,
    netPayable: 134000,
    status: 'In Review',
    aiRisk: 'Low',
    createdBy: 'John Doe',
    createdDate: '2024-12-11 10:30 AM',
    submittedDate: '2024-12-11 11:00 AM',
    currency: 'INR',
    paymentTerms: 'Net 30 Days',
    dueDate: '2025-01-09'
  };

  const workflowSteps: WorkflowStep[] = [
    {
      stage: 'Draft',
      status: 'completed',
      approver: 'John Doe',
      action: 'Created',
      timestamp: '2024-12-11 10:30 AM',
      slaHours: 0,
      elapsedHours: 0
    },
    {
      stage: 'Submitted',
      status: 'completed',
      approver: 'John Doe',
      action: 'Submitted for Approval',
      timestamp: '2024-12-11 11:00 AM',
      slaHours: 0,
      elapsedHours: 0
    },
    {
      stage: 'L1 Review',
      status: 'current',
      approver: 'Sarah Manager',
      slaHours: 24,
      elapsedHours: 14,
      comments: 'Awaiting review'
    },
    {
      stage: 'L2 Approval',
      status: 'pending',
      approver: 'Finance Head',
      slaHours: 48
    },
    {
      stage: 'CFO Approval',
      status: 'pending',
      approver: 'CFO',
      slaHours: 24
    },
    {
      stage: 'Ready for Payment',
      status: 'pending',
      slaHours: 0
    }
  ];

  const auditTrail: AuditEntry[] = [
    {
      timestamp: '2024-12-11 10:30 AM',
      user: 'John Doe',
      action: 'Invoice created',
      comments: 'PO-based invoice for Tech Solutions'
    },
    {
      timestamp: '2024-12-11 10:45 AM',
      user: 'AI System',
      action: 'AI Validation completed',
      aiRecommendation: 'No blockers found. Low risk invoice. 3-way match successful.'
    },
    {
      timestamp: '2024-12-11 11:00 AM',
      user: 'John Doe',
      action: 'Submitted for approval',
      comments: 'All validations passed'
    },
    {
      timestamp: '2024-12-12 09:15 AM',
      user: 'System',
      action: 'Assigned to L1 Reviewer',
      comments: 'Auto-assigned to Sarah Manager based on approval matrix'
    }
  ];

  const aiInsights = [
    {
      id: 'insight-1',
      severity: 'info' as const,
      category: '3-Way Matching',
      title: '3-Way Match Successful',
      description: 'PO, GRN, and Invoice quantities and amounts match within tolerance',
      reason: 'All line items verified across PO-2024-001, GRN-2024-056, and invoice. Quantity variance is within ±2% threshold.',
      confidence: 98,
      evidence: [
        'PO Qty: 100 units, GRN Qty: 100 units, Invoice Qty: 100 units',
        'PO Amount: ₹125,000, Invoice Amount: ₹125,000 (0% variance)',
        'All HSN codes match across documents'
      ],
      recommendedActions: [
        'Proceed with approval - no action needed'
      ]
    },
    {
      id: 'insight-2',
      severity: 'info' as const,
      category: 'Vendor History',
      title: 'Reliable Vendor Performance',
      description: 'Vendor has 100% on-time delivery record with no payment disputes',
      reason: 'Historical analysis of 12 prior transactions with Tech Solutions Pvt Ltd shows excellent track record.',
      confidence: 100,
      evidence: [
        '12 previous POs completed without issues',
        '100% on-time delivery rate',
        'Zero payment disputes or chargebacks',
        'Average payment received: 28 days (within terms)'
      ],
      recommendedActions: [
        'Consider for preferred vendor status',
        'Eligible for extended credit terms'
      ]
    },
    {
      id: 'insight-3',
      severity: 'info' as const,
      category: 'Compliance',
      title: 'Tax Compliance Verified',
      description: 'All tax calculations verified. TDS section correctly applied.',
      reason: 'GST @ 9% (CGST + SGST) correctly calculated. TDS Section 194Q applied at 0.1% for goods >₹50L.',
      confidence: 95,
      evidence: [
        'Vendor GSTIN validated: 29AABCT1234F1Z5 (Active)',
        'GST calculation: Base ₹125,000 × 9% = ₹11,250 ✓',
        'TDS Section 194Q @ 0.1% correctly applied',
        'Place of supply matches billing state'
      ],
      recommendedActions: [
        'Proceed with standard compliance approval'
      ]
    }
  ];

  const getStepIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'current': return Clock;
      default: return Clock;
    }
  };

  const getStepColor = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed': return '#047857';
      case 'current': return '#D97706';
      default: return '#9CA3AF';
    }
  };

  const getSLAStatus = (step: WorkflowStep) => {
    if (step.status !== 'current' || !step.elapsedHours) return null;
    
    const percentElapsed = (step.elapsedHours / step.slaHours) * 100;
    
    if (percentElapsed >= 90) {
      return { label: 'SLA Critical', color: '#DC2626', bg: '#FEE2E2' };
    } else if (percentElapsed >= 70) {
      return { label: 'SLA Warning', color: '#D97706', bg: '#FEF3C7' };
    }
    return { label: 'On Track', color: '#047857', bg: '#D1FAE5' };
  };

  return (
    <div style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }} className="p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/ap/my-invoices')}
          className="flex items-center gap-2 text-[#6E7A82] hover:text-[#0A0F14] mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Invoices
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl mb-2" style={{ color: '#0A0F14' }}>Invoice Workflow</h1>
            <p style={{ color: '#6E7A82' }}>Track approval progress and audit trail</p>
          </div>
          <div className="flex gap-3">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2"
              style={{ borderColor: '#E1E6EA', color: '#6E7A82' }}
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: '#00A9B7' }}
            >
              <Eye className="w-4 h-4" />
              View Invoice
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Invoice Summary */}
        <div className="space-y-6">
          {/* Invoice Header */}
          <div className="bg-white rounded-xl border-2 p-6" style={{ borderColor: '#E1E6EA' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ color: '#0A0F14' }}>Invoice Details</h3>
              <span 
                className="px-3 py-1 rounded-full text-sm"
                style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}
              >
                In Review
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm mb-1 block" style={{ color: '#6E7A82' }}>Invoice Number</label>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00A9B7]" />
                  <span style={{ color: '#0A0F14' }}>{invoice.invoiceNumber}</span>
                </div>
              </div>

              <div>
                <label className="text-sm mb-1 block" style={{ color: '#6E7A82' }}>Vendor</label>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" style={{ color: '#6E7A82' }} />
                  <div>
                    <p style={{ color: '#0A0F14' }}>{invoice.vendorName}</p>
                    <p className="text-sm" style={{ color: '#6E7A82' }}>{invoice.vendorCode}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm mb-1 block" style={{ color: '#6E7A82' }}>PO Number</label>
                  <p style={{ color: '#0A0F14' }}>{invoice.poNumber}</p>
                </div>
                <div>
                  <label className="text-sm mb-1 block" style={{ color: '#6E7A82' }}>GRN Number</label>
                  <p style={{ color: '#0A0F14' }}>{invoice.grnNumber}</p>
                </div>
              </div>

              <div>
                <label className="text-sm mb-1 block" style={{ color: '#6E7A82' }}>Invoice Date</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" style={{ color: '#6E7A82' }} />
                  <span style={{ color: '#0A0F14' }}>{invoice.invoiceDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Amount Summary */}
          <div className="bg-white rounded-xl border-2 p-6" style={{ borderColor: '#E1E6EA' }}>
            <h3 className="mb-4" style={{ color: '#0A0F14' }}>Amount Summary</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span style={{ color: '#6E7A82' }}>Invoice Amount</span>
                <span style={{ color: '#0A0F14' }}>₹{invoice.invoiceAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#6E7A82' }}>GST</span>
                <span style={{ color: '#0A0F14' }}>₹{invoice.gstAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#6E7A82' }}>TDS</span>
                <span style={{ color: '#DC2626' }}>-₹{invoice.tdsAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="border-t-2 pt-3" style={{ borderColor: '#E1E6EA' }}>
                <div className="flex justify-between items-center">
                  <span style={{ color: '#0A0F14' }}>Net Payable</span>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[#00A9B7]" />
                    <span className="text-xl" style={{ color: '#00A9B7' }}>
                      ₹{invoice.netPayable.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <AIInsightsPanel insights={aiInsights} />
        </div>

        {/* Middle Column - Workflow Timeline */}
        <div className="col-span-2 space-y-6">
          {/* Workflow Progress */}
          <div className="bg-white rounded-xl border-2 p-6" style={{ borderColor: '#E1E6EA' }}>
            <h3 className="mb-6" style={{ color: '#0A0F14' }}>Approval Workflow</h3>

            <div className="space-y-6">
              {workflowSteps.map((step, idx) => {
                const StepIcon = getStepIcon(step.status);
                const stepColor = getStepColor(step.status);
                const slaStatus = getSLAStatus(step);

                return (
                  <div key={idx} className="relative">
                    {idx < workflowSteps.length - 1 && (
                      <div 
                        className="absolute left-4 top-8 bottom-0 w-0.5"
                        style={{ backgroundColor: step.status === 'completed' ? '#047857' : '#E1E6EA' }}
                      />
                    )}
                    
                    <div className="flex gap-4">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 relative z-10"
                        style={{ 
                          backgroundColor: step.status === 'pending' ? '#F6F9FC' : `${stepColor}20`,
                          border: `2px solid ${stepColor}`
                        }}
                      >
                        <StepIcon className="w-4 h-4" style={{ color: stepColor }} />
                      </div>

                      <div className="flex-1 pb-6">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 style={{ color: '#0A0F14' }}>{step.stage}</h4>
                            {step.approver && (
                              <div className="flex items-center gap-2 mt-1">
                                <User className="w-3 h-3" style={{ color: '#6E7A82' }} />
                                <span className="text-sm" style={{ color: '#6E7A82' }}>{step.approver}</span>
                              </div>
                            )}
                          </div>
                          {slaStatus && (
                            <span 
                              className="text-xs px-2 py-1 rounded"
                              style={{ backgroundColor: slaStatus.bg, color: slaStatus.color }}
                            >
                              {slaStatus.label}
                            </span>
                          )}
                        </div>

                        {step.action && (
                          <p className="text-sm mb-1" style={{ color: '#6E7A82' }}>{step.action}</p>
                        )}

                        {step.timestamp && (
                          <p className="text-xs" style={{ color: '#6E7A82' }}>{step.timestamp}</p>
                        )}

                        {step.status === 'current' && step.slaHours > 0 && (
                          <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
                            <div className="flex items-center justify-between text-xs mb-2">
                              <span style={{ color: '#6E7A82' }}>SLA Progress</span>
                              <span style={{ color: '#0A0F14' }}>
                                {step.elapsedHours}h / {step.slaHours}h
                              </span>
                            </div>
                            <div className="w-full bg-[#E1E6EA] rounded-full h-2">
                              <div 
                                className="h-2 rounded-full transition-all"
                                style={{ 
                                  width: `${Math.min((step.elapsedHours! / step.slaHours) * 100, 100)}%`,
                                  backgroundColor: slaStatus?.color || '#047857'
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {step.comments && (
                          <div className="mt-2 flex items-start gap-2">
                            <MessageSquare className="w-3 h-3 mt-0.5" style={{ color: '#6E7A82' }} />
                            <p className="text-sm" style={{ color: '#6E7A82' }}>{step.comments}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit Trail */}
          <div className="bg-white rounded-xl border-2 p-6" style={{ borderColor: '#E1E6EA' }}>
            <h3 className="mb-4" style={{ color: '#0A0F14' }}>Audit Trail</h3>

            <div className="space-y-4">
              {auditTrail.map((entry, idx) => (
                <div 
                  key={idx} 
                  className="flex gap-4 p-4 rounded-lg border-2"
                  style={{ borderColor: '#E1E6EA' }}
                >
                  <div className="flex-shrink-0">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#00A9B710' }}
                    >
                      {entry.aiRecommendation ? (
                        <Zap className="w-4 h-4 text-[#00A9B7]" />
                      ) : (
                        <User className="w-4 h-4 text-[#00A9B7]" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <p style={{ color: '#0A0F14' }}>{entry.action}</p>
                      <span className="text-xs" style={{ color: '#6E7A82' }}>{entry.timestamp}</span>
                    </div>
                    
                    <p className="text-sm mb-1" style={{ color: '#6E7A82' }}>
                      by {entry.user}
                    </p>
                    
                    {entry.comments && (
                      <p className="text-sm mt-2 p-2 rounded" style={{ backgroundColor: '#F6F9FC', color: '#6E7A82' }}>
                        {entry.comments}
                      </p>
                    )}
                    
                    {entry.aiRecommendation && (
                      <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: '#00A9B710', borderLeft: '3px solid #00A9B7' }}>
                        <div className="flex items-start gap-2">
                          <Zap className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#00A9B7]" />
                          <p className="text-sm" style={{ color: '#0A0F14' }}>{entry.aiRecommendation}</p>
                        </div>
                      </div>
                    )}
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