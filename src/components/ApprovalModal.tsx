import { X, CheckCircle, XCircle, MessageSquare } from 'lucide-react';

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordType: string;
  recordId: string;
  changes: Change[];
  onApprove: () => void;
  onReject: () => void;
  onRequestInfo: () => void;
}

export function ApprovalModal({
  isOpen,
  onClose,
  recordType,
  recordId,
  changes,
  onApprove,
  onReject,
  onRequestInfo
}: ApprovalModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--color-silver)' }}>
          <div>
            <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>Review Changes - {recordType}</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-mercury-grey)' }}>Record ID: {recordId}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-mercury-grey)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Changes List - Scrollable */}
        <div className="p-6 flex-1 overflow-y-auto">
          <h3 className="text-lg mb-4" style={{ color: 'var(--color-ink)' }}>Proposed Changes</h3>
          
          {changes.length === 0 ? (
            <p style={{ color: 'var(--color-mercury-grey)' }}>No changes detected</p>
          ) : (
            <div className="space-y-4">
              {changes.map((change, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: 'var(--color-cloud)', border: '1px solid var(--color-silver)' }}
                >
                  <div className="mb-2">
                    <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Field:</span>
                    <span className="ml-2" style={{ color: 'var(--color-ink)' }}>{change.field}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    {/* Old Value */}
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: '#FFE8EA', border: '1px solid #FFD1D6' }}
                    >
                      <p className="text-xs mb-1" style={{ color: 'var(--color-error)' }}>Previous Value</p>
                      <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
                        {change.oldValue || <em style={{ color: 'var(--color-mercury-grey)' }}>(empty)</em>}
                      </p>
                    </div>

                    {/* New Value */}
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: 'var(--color-teal-tint)', border: '1px solid #B3E5EA' }}
                    >
                      <p className="text-xs mb-1" style={{ color: 'var(--color-teal)' }}>New Value</p>
                      <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
                        {change.newValue || <em style={{ color: 'var(--color-mercury-grey)' }}>(empty)</em>}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Approval Actions Info */}
          <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: '#FFF9E6', border: '1px solid #FFE7A3' }}>
            <p className="text-sm" style={{ color: '#D97706' }}>
              <strong>Note:</strong> Once approved, this record will become live and cannot be deleted. 
              You can only modify it through a new approval workflow.
            </p>
          </div>
        </div>

        {/* Footer Actions - Fixed */}
        <div
          className="border-t px-6 py-4 flex justify-end gap-3 flex-shrink-0"
          style={{ borderColor: 'var(--color-silver)' }}
        >
          <button
            onClick={onRequestInfo}
            className="flex items-center gap-2 px-6 py-2 rounded-lg transition-colors"
            style={{
              border: '1px solid var(--color-silver)',
              color: 'var(--color-mercury-grey)',
              backgroundColor: 'white'
            }}
          >
            <MessageSquare className="w-4 h-4" />
            Request More Info
          </button>
          
          <button
            onClick={onReject}
            className="flex items-center gap-2 px-6 py-2 rounded-lg transition-colors text-white"
            style={{ backgroundColor: 'var(--color-error)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E63946'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-error)'}
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>

          <button
            onClick={onApprove}
            className="flex items-center gap-2 px-6 py-2 rounded-lg transition-colors text-white"
            style={{ backgroundColor: 'var(--color-teal)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
          >
            <CheckCircle className="w-4 h-4" />
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
