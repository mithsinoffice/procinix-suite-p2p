import { useState } from 'react';
import { X, Upload, AlertTriangle, TrendingUp, FileText, DollarSign } from 'lucide-react';

interface POInvoiceExceptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ExceptionRequestData) => void;
  lineItem: {
    itemName: string;
    itemCode: string;
    poRate: number;
    requestedRate: number;
    quantity: number;
  };
}

export interface ExceptionRequestData {
  requestedRate: number;
  poRate: number;
  varianceAmount: number;
  variancePercent: number;
  exceptionReason: string;
  comments: string;
  attachments: File[];
}

const exceptionReasons = [
  'Market Price Increase',
  'Vendor Rate Revision',
  'Quality Upgrade',
  'Urgent Requirement Premium',
  'Currency Fluctuation',
  'Transportation Cost Increase',
  'Regulatory Compliance Cost',
  'Other',
];

export function POInvoiceExceptionModal({
  isOpen,
  onClose,
  onSubmit,
  lineItem,
}: POInvoiceExceptionModalProps) {
  const [formData, setFormData] = useState<ExceptionRequestData>({
    requestedRate: lineItem.requestedRate,
    poRate: lineItem.poRate,
    varianceAmount: lineItem.requestedRate - lineItem.poRate,
    variancePercent: ((lineItem.requestedRate - lineItem.poRate) / lineItem.poRate) * 100,
    exceptionReason: '',
    comments: '',
    attachments: [],
  });

  const [attachments, setAttachments] = useState<File[]>([]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments([...attachments, ...newFiles]);
      setFormData({ ...formData, attachments: [...attachments, ...newFiles] });
    }
  };

  const removeFile = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    setAttachments(newAttachments);
    setFormData({ ...formData, attachments: newAttachments });
  };

  const handleSubmit = () => {
    if (!formData.exceptionReason) {
      alert('Please select an exception reason');
      return;
    }
    if (!formData.comments.trim()) {
      alert('Please provide detailed comments explaining the exception');
      return;
    }
    onSubmit(formData);
    onClose();
  };

  const totalVarianceAmount = formData.varianceAmount * lineItem.quantity;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto"
        style={{ border: '1px solid var(--color-silver)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6"
          style={{ borderBottom: '1px solid var(--color-silver)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#FFF9E6' }}
            >
              <AlertTriangle className="w-5 h-5" style={{ color: '#D97706' }} />
            </div>
            <div>
              <h2 className="text-lg" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
                Request Rate Exception Approval
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                Invoice rate exceeds PO rate - requires CFO approval
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" style={{ color: 'var(--color-mercury-grey)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Item Details Card */}
          <div
            className="bg-gray-50 rounded-lg p-4 mb-6"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p
                  className="text-sm"
                  style={{ color: 'var(--color-mercury-grey)', fontWeight: '500' }}
                >
                  Item
                </p>
                <p
                  className="text-base mt-1"
                  style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                >
                  {lineItem.itemName}
                </p>
                <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  {lineItem.itemCode}
                </p>
              </div>
              <div className="text-right">
                <p
                  className="text-sm"
                  style={{ color: 'var(--color-mercury-grey)', fontWeight: '500' }}
                >
                  Quantity
                </p>
                <p
                  className="text-base mt-1"
                  style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                >
                  {lineItem.quantity}
                </p>
              </div>
            </div>
          </div>

          {/* Rate Comparison */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div
              className="bg-white rounded-lg p-4"
              style={{ border: '2px solid var(--color-silver)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                <p
                  className="text-xs"
                  style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                >
                  PO RATE
                </p>
              </div>
              <p className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
                ₹{lineItem.poRate.toFixed(2)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
                Original agreed rate
              </p>
            </div>

            <div className="bg-white rounded-lg p-4" style={{ border: '2px solid #D97706' }}>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4" style={{ color: '#D97706' }} />
                <p
                  className="text-xs"
                  style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                >
                  REQUESTED RATE
                </p>
              </div>
              <p className="text-2xl" style={{ color: '#D97706', fontWeight: '700' }}>
                ₹{lineItem.requestedRate.toFixed(2)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
                Invoice rate entered
              </p>
            </div>

            <div
              className="bg-red-50 rounded-lg p-4"
              style={{ border: '2px solid var(--color-error)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4" style={{ color: 'var(--color-error)' }} />
                <p className="text-xs" style={{ color: 'var(--color-error)', fontWeight: '600' }}>
                  VARIANCE
                </p>
              </div>
              <p className="text-2xl" style={{ color: 'var(--color-error)', fontWeight: '700' }}>
                +₹{formData.varianceAmount.toFixed(2)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>
                +{formData.variancePercent.toFixed(2)}% increase
              </p>
            </div>
          </div>

          {/* Total Impact */}
          <div
            className="bg-red-50 rounded-lg p-4 mb-6"
            style={{ border: '1px solid var(--color-error)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-sm"
                  style={{ color: 'var(--color-mercury-grey)', fontWeight: '500' }}
                >
                  Total Financial Impact
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
                  Variance × Quantity ({lineItem.quantity} units)
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl" style={{ color: 'var(--color-error)', fontWeight: '700' }}>
                  ₹{totalVarianceAmount.toFixed(2)}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-error)' }}>
                  Additional cost
                </p>
              </div>
            </div>
          </div>

          {/* Exception Reason */}
          <div className="mb-6">
            <label
              className="block text-sm mb-2"
              style={{ color: 'var(--color-ink)', fontWeight: '600' }}
            >
              Exception Reason <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <select
              value={formData.exceptionReason}
              onChange={(e) => setFormData({ ...formData, exceptionReason: e.target.value })}
              className="w-full px-4 py-3 rounded-lg text-sm"
              style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
            >
              <option value="">Select reason for rate variance</option>
              {exceptionReasons.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {/* Comments */}
          <div className="mb-6">
            <label
              className="block text-sm mb-2"
              style={{ color: 'var(--color-ink)', fontWeight: '600' }}
            >
              Detailed Explanation <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <textarea
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              className="w-full px-4 py-3 rounded-lg text-sm"
              style={{
                border: '1px solid var(--color-silver)',
                color: 'var(--color-ink)',
                minHeight: '120px',
              }}
              placeholder="Provide detailed justification for the rate increase. Include market conditions, vendor communication, business impact, and any mitigating factors..."
            />
            <p className="text-xs mt-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Minimum 50 characters required. Be specific and provide data to support the exception.
            </p>
          </div>

          {/* Attachment Upload */}
          <div className="mb-6">
            <label
              className="block text-sm mb-2"
              style={{ color: 'var(--color-ink)', fontWeight: '600' }}
            >
              Supporting Documents
            </label>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center"
              style={{ borderColor: 'var(--color-silver)' }}
            >
              <Upload
                className="w-8 h-8 mx-auto mb-2"
                style={{ color: 'var(--color-mercury-grey)' }}
              />
              <p className="text-sm mb-2" style={{ color: 'var(--color-ink)' }}>
                Upload supporting documents
              </p>
              <p className="text-xs mb-4" style={{ color: 'var(--color-mercury-grey)' }}>
                Vendor rate sheet, email correspondence, market analysis, etc.
              </p>
              <label
                className="inline-block px-4 py-2 rounded-lg cursor-pointer transition-colors"
                style={{ backgroundColor: 'var(--color-teal)', color: '#FFFFFF' }}
              >
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xlsx,.jpg,.png"
                />
                Choose Files
              </label>
            </div>

            {/* Uploaded Files */}
            {attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{
                      backgroundColor: 'var(--color-cloud)',
                      border: '1px solid var(--color-silver)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                      <div>
                        <p
                          className="text-sm"
                          style={{ color: 'var(--color-ink)', fontWeight: '500' }}
                        >
                          {file.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <X className="w-4 h-4" style={{ color: 'var(--color-error)' }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Approval Info */}
          <div
            className="bg-blue-50 rounded-lg p-4"
            style={{ border: '1px solid var(--color-teal)' }}
          >
            <p className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
              Approval Routing
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--color-mercury-grey)' }}>
              This exception will be routed to <strong>CFO</strong> and{' '}
              <strong>Finance Controller</strong> for approval. Invoice will be held in "Pending
              Exception Approval" status until decision is made.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 p-6"
          style={{ borderTop: '1px solid var(--color-silver)' }}
        >
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg transition-all text-sm"
            style={{
              border: '1px solid var(--color-silver)',
              color: 'var(--color-ink)',
              fontWeight: '500',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-cloud)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-lg transition-all text-sm"
            style={{ backgroundColor: 'var(--color-teal)', color: '#FFFFFF', fontWeight: '600' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal)')}
          >
            Submit Exception Request
          </button>
        </div>
      </div>
    </div>
  );
}
