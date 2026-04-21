import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Clock, ExternalLink, Filter, Search, Download } from 'lucide-react';

/**
 * AGENT LOGS DASHBOARD
 * Real-time log of every agent run with detailed rule execution results
 */

interface AgentLog {
  id: string;
  timestamp: string;
  agentName: string;
  trigger: string;
  inputSummary: string;
  rulesExecuted: Array<{
    rule: string;
    field: string;
    passed: boolean;
    reason?: string;
  }>;
  finalDecision: 'approved' | 'flagged' | 'rejected';
  durationMs: number;
  recordId: string;
  recordLink: string;
}

export function AgentLogs() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [decisionFilter, setDecisionFilter] = useState('All decisions');
  const [selectedLog, setSelectedLog] = useState<AgentLog | null>(null);

  const logs: AgentLog[] = [
    {
      id: '1',
      timestamp: '2026-04-12 14:32:15',
      agentName: 'Invoice Auto-validator',
      trigger: 'On Submit',
      inputSummary: 'Invoice INV-2024-5432 | ₹2,45,000 | Vendor: Acme Corp',
      rulesExecuted: [
        { rule: 'Required validation', field: 'invoice_number', passed: true },
        { rule: 'Duplicate check', field: 'invoice_number', passed: true },
        { rule: 'Format validation', field: 'vendor_gstin', passed: true },
        { rule: 'Math validation', field: 'total_amount', passed: true },
        { rule: 'Cross-field check', field: 'total_amount', passed: true }
      ],
      finalDecision: 'approved',
      durationMs: 342,
      recordId: 'INV-2024-5432',
      recordLink: '/ap/invoices/view/INV-2024-5432'
    },
    {
      id: '2',
      timestamp: '2026-04-12 14:28:03',
      agentName: 'Invoice Auto-validator',
      trigger: 'On Submit',
      inputSummary: 'Invoice INV-2024-5431 | ₹15,00,000 | Vendor: TechCo Ltd',
      rulesExecuted: [
        { rule: 'Required validation', field: 'invoice_number', passed: true },
        { rule: 'Duplicate check', field: 'invoice_number', passed: true },
        { rule: 'Format validation', field: 'vendor_gstin', passed: false, reason: 'GSTIN format invalid' },
        { rule: 'Threshold check', field: 'total_amount', passed: false, reason: 'Amount exceeds ₹10,00,000 threshold' }
      ],
      finalDecision: 'flagged',
      durationMs: 456,
      recordId: 'INV-2024-5431',
      recordLink: '/ap/invoices/view/INV-2024-5431'
    },
    {
      id: '3',
      timestamp: '2026-04-12 14:15:22',
      agentName: 'PO Compliance Checker',
      trigger: 'On Submit',
      inputSummary: 'PO PO-2024-8923 | ₹3,75,000 | Vendor: Supplies Inc',
      rulesExecuted: [
        { rule: 'Required validation', field: 'po_number', passed: true },
        { rule: 'Vendor exists', field: 'vendor_id', passed: true },
        { rule: 'Budget check', field: 'total_value', passed: true }
      ],
      finalDecision: 'approved',
      durationMs: 278,
      recordId: 'PO-2024-8923',
      recordLink: '/procurement/po/view/PO-2024-8923'
    },
    {
      id: '4',
      timestamp: '2026-04-12 14:05:11',
      agentName: 'Vendor Master Validator',
      trigger: 'On Save',
      inputSummary: 'Vendor VEN-2024-1234 | Blacklisted Vendor Ltd',
      rulesExecuted: [
        { rule: 'Required validation', field: 'legal_name', passed: true },
        { rule: 'GSTIN format', field: 'gstin', passed: true },
        { rule: 'Blacklist check', field: 'vendor_name', passed: false, reason: 'Vendor found in fraud blacklist' }
      ],
      finalDecision: 'rejected',
      durationMs: 521,
      recordId: 'VEN-2024-1234',
      recordLink: '/masters/vendors/view/VEN-2024-1234'
    },
    {
      id: '5',
      timestamp: '2026-04-12 13:52:45',
      agentName: 'Invoice Auto-validator',
      trigger: 'On Submit',
      inputSummary: 'Invoice INV-2024-5430 | ₹89,500 | Vendor: Office Supplies Co',
      rulesExecuted: [
        { rule: 'Required validation', field: 'invoice_number', passed: true },
        { rule: 'Duplicate check', field: 'invoice_number', passed: true },
        { rule: 'Format validation', field: 'vendor_gstin', passed: true },
        { rule: '3-way match', field: 'po_number', passed: true },
        { rule: 'GRN quantity match', field: 'line_items', passed: true }
      ],
      finalDecision: 'approved',
      durationMs: 412,
      recordId: 'INV-2024-5430',
      recordLink: '/ap/invoices/view/INV-2024-5430'
    }
  ];

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'approved': return { bg: '#D1FAE5', text: '#065F46' };
      case 'flagged': return { bg: '#FEF3C7', text: '#92400E' };
      case 'rejected': return { bg: '#FEE2E2', text: '#991B1B' };
      default: return { bg: '#F6F9FC', text: '#6E7A82' };
    }
  };

  return (
    <div className="p-8" style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-2" style={{ color: '#0A0F14', fontWeight: '600' }}>
            Agent Logs
          </h1>
          <p style={{ color: '#6E7A82', fontSize: '13px' }}>
            Real-time log of all agent executions
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg"
          style={{ border: '1px solid #E1E6EA', color: '#0A0F14', fontSize: '13px', fontWeight: '600' }}
        >
          <Download className="w-4 h-4" />
          Export logs
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 mb-6 flex items-center gap-4" style={{ border: '1px solid #E1E6EA' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9AA6AF' }} />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg"
            style={{ border: '0.5px solid #E1E6EA', fontSize: '13px' }}
          />
        </div>
        <select
          value={decisionFilter}
          onChange={(e) => setDecisionFilter(e.target.value)}
          className="px-4 py-2 rounded-lg"
          style={{ border: '0.5px solid #E1E6EA', fontSize: '13px', minWidth: '150px' }}
        >
          <option>All decisions</option>
          <option>Approved</option>
          <option>Flagged</option>
          <option>Rejected</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #E1E6EA' }}>
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: '#F6F9FC', borderBottom: '0.5px solid #E1E6EA' }}>
              <th className="text-left px-6 py-3" style={{ color: '#6E7A82', fontSize: '11px', textTransform: 'uppercase', fontWeight: '600' }}>
                Timestamp
              </th>
              <th className="text-left px-6 py-3" style={{ color: '#6E7A82', fontSize: '11px', textTransform: 'uppercase', fontWeight: '600' }}>
                Agent
              </th>
              <th className="text-left px-6 py-3" style={{ color: '#6E7A82', fontSize: '11px', textTransform: 'uppercase', fontWeight: '600' }}>
                Input Summary
              </th>
              <th className="text-center px-6 py-3" style={{ color: '#6E7A82', fontSize: '11px', textTransform: 'uppercase', fontWeight: '600' }}>
                Rules
              </th>
              <th className="text-center px-6 py-3" style={{ color: '#6E7A82', fontSize: '11px', textTransform: 'uppercase', fontWeight: '600' }}>
                Decision
              </th>
              <th className="text-center px-6 py-3" style={{ color: '#6E7A82', fontSize: '11px', textTransform: 'uppercase', fontWeight: '600' }}>
                Duration
              </th>
              <th className="text-center px-6 py-3" style={{ color: '#6E7A82', fontSize: '11px', textTransform: 'uppercase', fontWeight: '600' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const passedRules = log.rulesExecuted.filter(r => r.passed).length;
              const totalRules = log.rulesExecuted.length;
              const decisionColors = getDecisionColor(log.finalDecision);

              return (
                <tr
                  key={log.id}
                  className="cursor-pointer hover:bg-gray-50"
                  style={{ borderBottom: '0.5px solid #E1E6EA' }}
                  onClick={() => setSelectedLog(log)}
                >
                  <td className="px-6 py-4" style={{ color: '#0A0F14', fontSize: '13px' }}>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" style={{ color: '#9AA6AF' }} />
                      {log.timestamp}
                    </div>
                  </td>
                  <td className="px-6 py-4" style={{ color: '#0A0F14', fontSize: '13px', fontWeight: '600' }}>
                    {log.agentName}
                  </td>
                  <td className="px-6 py-4" style={{ color: '#6E7A82', fontSize: '13px' }}>
                    {log.inputSummary}
                  </td>
                  <td className="px-6 py-4 text-center" style={{ fontSize: '13px' }}>
                    <span style={{ color: '#10B981', fontWeight: '600' }}>{passedRules}</span>
                    <span style={{ color: '#6E7A82' }}> / {totalRules}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className="px-3 py-1 rounded-full text-xs capitalize"
                      style={{
                        backgroundColor: decisionColors.bg,
                        color: decisionColors.text,
                        fontWeight: '600'
                      }}
                    >
                      {log.finalDecision}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center" style={{ color: '#6E7A82', fontSize: '13px' }}>
                    {log.durationMs}ms
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(log.recordLink);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs"
                      style={{ color: '#00A9B7', backgroundColor: '#D6F7F9', fontWeight: '600' }}
                    >
                      View record
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white rounded-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4" style={{ borderBottom: '1px solid #E1E6EA' }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg" style={{ color: '#0A0F14', fontWeight: '600' }}>
                  Execution Details
                </h3>
                <button onClick={() => setSelectedLog(null)}>
                  <X className="w-5 h-5" style={{ color: '#6E7A82' }} />
                </button>
              </div>
              <div style={{ color: '#6E7A82', fontSize: '13px' }}>
                {selectedLog.timestamp} · {selectedLog.agentName}
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <div style={{ color: '#6E7A82', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Input Summary
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
                  <div style={{ color: '#0A0F14', fontSize: '13px' }}>
                    {selectedLog.inputSummary}
                  </div>
                  <div className="mt-2 flex items-center gap-4" style={{ fontSize: '12px', color: '#6E7A82' }}>
                    <span>Trigger: {selectedLog.trigger}</span>
                    <span>Duration: {selectedLog.durationMs}ms</span>
                    <span>Record: {selectedLog.recordId}</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div style={{ color: '#6E7A82', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Rules Executed ({selectedLog.rulesExecuted.length})
                </div>
                <div className="space-y-2">
                  {selectedLog.rulesExecuted.map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg flex items-start gap-3"
                      style={{ backgroundColor: rule.passed ? '#ECFDF5' : '#FEE2E2' }}
                    >
                      {rule.passed ? (
                        <Check className="w-5 h-5 flex-shrink-0" style={{ color: '#10B981' }} />
                      ) : (
                        <X className="w-5 h-5 flex-shrink-0" style={{ color: '#EF4444' }} />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span style={{ color: '#0A0F14', fontWeight: '600', fontSize: '13px' }}>
                            {rule.rule}
                          </span>
                          <span
                            className="px-2 py-1 rounded text-xs"
                            style={{ backgroundColor: '#F6F9FC', color: '#6E7A82', fontWeight: '600' }}
                          >
                            {rule.field}
                          </span>
                        </div>
                        {rule.reason && (
                          <div style={{ color: rule.passed ? '#047857' : '#991B1B', fontSize: '12px' }}>
                            {rule.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ color: '#6E7A82', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Final Decision
                </div>
                <div
                  className="p-5 rounded-lg"
                  style={{
                    backgroundColor: getDecisionColor(selectedLog.finalDecision).bg,
                    border: `2px solid ${getDecisionColor(selectedLog.finalDecision).text}40`
                  }}
                >
                  <div
                    className="text-lg capitalize mb-2"
                    style={{
                      color: getDecisionColor(selectedLog.finalDecision).text,
                      fontWeight: '700'
                    }}
                  >
                    {selectedLog.finalDecision}
                  </div>
                  <div style={{ color: getDecisionColor(selectedLog.finalDecision).text, fontSize: '13px' }}>
                    {selectedLog.finalDecision === 'approved' && 'All validations passed. Record approved automatically.'}
                    {selectedLog.finalDecision === 'flagged' && 'Some validations failed. Record flagged for manual review.'}
                    {selectedLog.finalDecision === 'rejected' && 'Critical validations failed. Record rejected.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid #E1E6EA' }}>
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: '#6E7A82' }}
              >
                Close
              </button>
              <button
                onClick={() => navigate(selectedLog.recordLink)}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-white text-sm"
                style={{ backgroundColor: '#00A9B7', fontWeight: '600' }}
              >
                View record
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentLogs;
