import { History, CheckCircle, XCircle, Send, CheckCheck, MessageSquare, AlertCircle, Edit3, Clock } from 'lucide-react';

export interface WorkflowHistoryItem {
  id: string;
  action: 'Submitted' | 'Approved' | 'Rejected' | 'Requested Info' | 'Posted to ERP' | 'Modified' | 'Reviewed';
  by: string;
  role: string;
  date: string;
  time: string;
  timestamp: string; // ISO format for sorting
  comments?: string;
  changes?: string[]; // For modification tracking
}

interface WorkflowHistoryProps {
  history: WorkflowHistoryItem[];
  title?: string;
  compact?: boolean;
}

/**
 * WORKFLOW HISTORY COMPONENT
 * Displays chronological workflow history with timestamps for any entity (Invoices, POs, etc.)
 */

export function WorkflowHistory({ history, title = 'Workflow History', compact = false }: WorkflowHistoryProps) {
  // Sort history by timestamp (newest first)
  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'Approved':
        return <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />;
      case 'Rejected':
        return <XCircle className="w-5 h-5" style={{ color: '#EF4444' }} />;
      case 'Submitted':
        return <Send className="w-5 h-5" style={{ color: '#3B82F6' }} />;
      case 'Posted to ERP':
        return <CheckCheck className="w-5 h-5" style={{ color: '#10B981' }} />;
      case 'Requested Info':
        return <MessageSquare className="w-5 h-5" style={{ color: '#F59E0B' }} />;
      case 'Modified':
        return <Edit3 className="w-5 h-5" style={{ color: '#007D87' }} />;
      case 'Reviewed':
        return <AlertCircle className="w-5 h-5" style={{ color: '#3B82F6' }} />;
      default:
        return <Clock className="w-5 h-5" style={{ color: 'var(--color-mercury-grey)' }} />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'Approved':
      case 'Posted to ERP':
        return '#D1FAE5';
      case 'Rejected':
        return 'var(--color-error-light)';
      case 'Requested Info':
        return '#FEF3C7';
      case 'Modified':
        return '#F3E8FF';
      case 'Submitted':
      case 'Reviewed':
        return '#DBEAFE';
      default:
        return 'var(--color-cloud)';
    }
  };

  const formatDateTime = (date: string, time: string) => {
    const dateObj = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = dateObj.toDateString() === today.toDateString();
    const isYesterday = dateObj.toDateString() === yesterday.toDateString();

    if (isToday) {
      return `Today at ${time}`;
    } else if (isYesterday) {
      return `Yesterday at ${time}`;
    } else {
      return `${dateObj.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      })} at ${time}`;
    }
  };

  if (sortedHistory.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6" style={{ border: '2px solid var(--color-silver)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-cloud)' }}>
            <History className="w-5 h-5" style={{ color: 'var(--color-mercury-grey)' }} />
          </div>
          <h2 className={compact ? 'text-base' : 'text-xl'} style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
            {title}
          </h2>
        </div>
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>No workflow history available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6" style={{ border: '2px solid var(--color-silver)' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-teal)10' }}>
          <History className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
        </div>
        <div className="flex-1">
          <h2 className={compact ? 'text-base' : 'text-xl'} style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
            {title}
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
            {sortedHistory.length} {sortedHistory.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {sortedHistory.map((item, index) => (
          <div key={item.id} className="flex gap-4">
            {/* Timeline Icon */}
            <div className="flex flex-col items-center">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: getActionColor(item.action) }}
              >
                {getActionIcon(item.action)}
              </div>
              {index < sortedHistory.length - 1 && (
                <div className="w-0.5 h-full mt-2" style={{ backgroundColor: 'var(--color-silver)', minHeight: compact ? '40px' : '60px' }} />
              )}
            </div>

            {/* Timeline Content */}
            <div className="flex-1 pb-6">
              <div className="flex items-start justify-between mb-1 gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={compact ? 'text-sm' : 'text-base'} style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                      {item.action}
                    </p>
                    {item.action === 'Modified' && (
                      <span 
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ backgroundColor: '#F3E8FF', color: '#6B21A8' }}
                      >
                        Awaiting Re-approval
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                    {item.by} • {item.role}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '500' }}>
                    {formatDateTime(item.date, item.time)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                    {item.time}
                  </p>
                </div>
              </div>

              {/* Comments */}
              {item.comments && (
                <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)', border: '1px solid var(--color-silver)' }}>
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-mercury-grey)' }} />
                    <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{item.comments}</p>
                  </div>
                </div>
              )}

              {/* Changes (for modifications) */}
              {item.changes && item.changes.length > 0 && (
                <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: '#FEF3C7', border: '1px solid #F59E0B' }}>
                  <div className="flex items-start gap-2 mb-2">
                    <Edit3 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#D97706' }} />
                    <p className="text-xs" style={{ color: '#92400E', fontWeight: '600' }}>Changes Made:</p>
                  </div>
                  <ul className="space-y-1 ml-6">
                    {item.changes.map((change, idx) => (
                      <li key={idx} className="text-xs" style={{ color: '#92400E' }}>
                        • {change}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * COMPACT WORKFLOW HISTORY - For use in modals or smaller spaces
 */
export function CompactWorkflowHistory({ history }: { history: WorkflowHistoryItem[] }) {
  const recentHistory = [...history]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 3);

  if (recentHistory.length === 0) {
    return (
      <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)', border: '1px solid var(--color-silver)' }}>
        <p className="text-xs text-center" style={{ color: 'var(--color-mercury-grey)' }}>No history available</p>
      </div>
    );
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'Approved':
        return <CheckCircle className="w-3.5 h-3.5" style={{ color: '#10B981' }} />;
      case 'Rejected':
        return <XCircle className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />;
      case 'Submitted':
        return <Send className="w-3.5 h-3.5" style={{ color: '#3B82F6' }} />;
      case 'Posted to ERP':
        return <CheckCheck className="w-3.5 h-3.5" style={{ color: '#10B981' }} />;
      case 'Requested Info':
        return <MessageSquare className="w-3.5 h-3.5" style={{ color: '#F59E0B' }} />;
      case 'Modified':
        return <Edit3 className="w-3.5 h-3.5" style={{ color: '#007D87' }} />;
      default:
        return <Clock className="w-3.5 h-3.5" style={{ color: 'var(--color-mercury-grey)' }} />;
    }
  };

  return (
    <div className="space-y-2">
      {recentHistory.map((item) => (
        <div 
          key={item.id} 
          className="flex items-center gap-3 p-2 rounded-lg"
          style={{ backgroundColor: 'var(--color-cloud)', border: '1px solid var(--color-silver)' }}
        >
          {getActionIcon(item.action)}
          <div className="flex-1 min-w-0">
            <p className="text-xs truncate" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
              {item.action} by {item.by}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
              {item.date} at {item.time}
            </p>
          </div>
        </div>
      ))}
      {history.length > 3 && (
        <p className="text-xs text-center" style={{ color: 'var(--color-mercury-grey)' }}>
          +{history.length - 3} more {history.length - 3 === 1 ? 'entry' : 'entries'}
        </p>
      )}
    </div>
  );
}
