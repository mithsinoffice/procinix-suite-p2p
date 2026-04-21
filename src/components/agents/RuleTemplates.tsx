import { useState } from 'react';
import { X, Check, FileText, Shield, AlertTriangle, Link as LinkIcon } from 'lucide-react';

/**
 * RULE TEMPLATES LIBRARY
 * Pre-built rule sets that can be applied to agents
 */

interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  ruleCount: number;
  formType: string[];
  rules: Array<{
    field: string;
    type: string;
    config: string;
    severity: string;
  }>;
}

const templates: RuleTemplate[] = [
  {
    id: 'standard-invoice',
    name: 'Standard Invoice Validation',
    description: 'Essential validation rules for AP invoices including required fields and format checks',
    icon: FileText,
    color: '#00A9B7',
    ruleCount: 8,
    formType: ['AP Invoice'],
    rules: [
      { field: 'invoice_number', type: 'Required', config: 'Cannot be empty', severity: 'Block' },
      { field: 'invoice_number', type: 'Duplicate', config: 'Check against existing invoices', severity: 'Block' },
      { field: 'invoice_date', type: 'Required', config: 'Cannot be empty', severity: 'Block' },
      { field: 'vendor_name', type: 'Required', config: 'Cannot be empty', severity: 'Block' },
      { field: 'total_amount', type: 'Required', config: 'Cannot be empty', severity: 'Block' },
      { field: 'total_amount', type: 'Math', config: 'Must be > 0', severity: 'Block' },
      { field: 'currency', type: 'Required', config: 'Cannot be empty', severity: 'Block' },
      { field: 'invoice_date', type: 'Threshold', config: 'Cannot be > 7 days in future', severity: 'Warning' }
    ]
  },
  {
    id: 'gst-compliance',
    name: 'GST Compliance Pack',
    description: 'Indian GST validation rules including GSTIN format and state code matching',
    icon: Shield,
    color: '#10B981',
    ruleCount: 5,
    formType: ['AP Invoice', 'Vendor Master'],
    rules: [
      { field: 'vendor_gstin', type: 'Format', config: 'Must match pattern: [0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}', severity: 'Block' },
      { field: 'vendor_gstin', type: 'CrossReference', config: 'State code must match vendor address state', severity: 'Block' },
      { field: 'tax_amount', type: 'Required', config: 'Cannot be empty', severity: 'Block' },
      { field: 'tax_amount', type: 'Math', config: 'Must be >= 0', severity: 'Block' },
      { field: 'hsn_code', type: 'Format', config: 'Must be 4, 6, or 8 digits', severity: 'Warning' }
    ]
  },
  {
    id: 'fraud-detection',
    name: 'Fraud Detection Pack',
    description: 'Advanced fraud detection rules including duplicate checks and threshold validation',
    icon: AlertTriangle,
    color: '#EF4444',
    ruleCount: 6,
    formType: ['AP Invoice', 'Payment Proposal'],
    rules: [
      { field: 'vendor_name', type: 'Blacklist', config: 'Check against fraud blacklist', severity: 'Block' },
      { field: 'bank_account', type: 'CrossReference', config: 'Must match vendor master record', severity: 'Block' },
      { field: 'total_amount', type: 'Threshold', config: 'Flag if > ₹5,00,000', severity: 'Warning' },
      { field: 'invoice_number', type: 'Duplicate', config: 'Check for duplicate across all vendors', severity: 'Block' },
      { field: 'payment_date', type: 'Threshold', config: 'Flag if same-day payment', severity: 'Warning' },
      { field: 'vendor_email', type: 'Format', config: 'Must be valid email format', severity: 'Warning' }
    ]
  },
  {
    id: '3way-match',
    name: '3-Way Match Pack',
    description: 'Rules for matching PO → GRN → Invoice with tolerance checks',
    icon: LinkIcon,
    color: '#8B5CF6',
    ruleCount: 4,
    formType: ['AP Invoice'],
    rules: [
      { field: 'po_number', type: 'CrossReference', config: 'Must exist in PO system', severity: 'Block' },
      { field: 'grn_number', type: 'CrossReference', config: 'Must exist and match PO', severity: 'Block' },
      { field: 'total_amount', type: 'Math', config: 'Must match PO total ± 5%', severity: 'Warning' },
      { field: 'line_items', type: 'CrossReference', config: 'Quantities must match GRN', severity: 'Block' }
    ]
  }
];

interface RuleTemplatesProps {
  onApplyTemplate: (template: RuleTemplate) => void;
}

export function RuleTemplates({ onApplyTemplate }: RuleTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<RuleTemplate | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleSelectTemplate = (template: RuleTemplate) => {
    setSelectedTemplate(template);
    setShowModal(true);
  };

  const handleApply = () => {
    if (selectedTemplate) {
      onApplyTemplate(selectedTemplate);
      setShowModal(false);
      setSelectedTemplate(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {templates.map((template) => {
          const Icon = template.icon;
          return (
            <div
              key={template.id}
              onClick={() => handleSelectTemplate(template)}
              className="bg-white rounded-xl p-5 cursor-pointer transition-all"
              style={{ border: '1px solid #E1E6EA' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = template.color;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 4px 12px ${template.color}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E1E6EA';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${template.color}20` }}
                >
                  <Icon className="w-5 h-5" style={{ color: template.color }} />
                </div>
                <div className="flex-1">
                  <div className="mb-1" style={{ color: '#0A0F14', fontWeight: '600', fontSize: '14px' }}>
                    {template.name}
                  </div>
                  <div
                    className="px-2 py-1 rounded-full text-xs inline-block"
                    style={{ backgroundColor: `${template.color}20`, color: template.color, fontWeight: '600' }}
                  >
                    {template.ruleCount} rules
                  </div>
                </div>
              </div>
              <p style={{ color: '#6E7A82', fontSize: '12px', marginBottom: '8px' }}>
                {template.description}
              </p>
              <div style={{ color: '#9AA6AF', fontSize: '11px' }}>
                For: {template.formType.join(', ')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Template Preview Modal */}
      {showModal && selectedTemplate && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${selectedTemplate.color}20` }}
                >
                  {(() => {
                    const Icon = selectedTemplate.icon;
                    return <Icon className="w-6 h-6" style={{ color: selectedTemplate.color }} />;
                  })()}
                </div>
                <div>
                  <h3 className="text-lg" style={{ color: '#0A0F14', fontWeight: '600' }}>
                    {selectedTemplate.name}
                  </h3>
                  <p style={{ color: '#6E7A82', fontSize: '13px' }}>
                    {selectedTemplate.ruleCount} rules
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" style={{ color: '#6E7A82' }} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <p className="mb-6" style={{ color: '#6E7A82', fontSize: '13px' }}>
                {selectedTemplate.description}
              </p>

              <div style={{ color: '#6E7A82', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                Rules Preview
              </div>

              <div className="space-y-3">
                {selectedTemplate.rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span style={{ color: '#0A0F14', fontWeight: '600', fontSize: '13px' }}>
                          {rule.field}
                        </span>
                        <span
                          className="px-2 py-1 rounded text-xs"
                          style={{ backgroundColor: `${selectedTemplate.color}20`, color: selectedTemplate.color, fontWeight: '600' }}
                        >
                          {rule.type}
                        </span>
                      </div>
                      <span
                        className="px-2 py-1 rounded text-xs"
                        style={{
                          backgroundColor: rule.severity === 'Block' ? '#FEE2E2' : '#FEF3C7',
                          color: rule.severity === 'Block' ? '#991B1B' : '#92400E',
                          fontWeight: '600'
                        }}
                      >
                        {rule.severity}
                      </span>
                    </div>
                    <div style={{ color: '#6E7A82', fontSize: '12px' }}>
                      {rule.config}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6" style={{ borderTop: '1px solid #E1E6EA' }}>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: '#6E7A82' }}
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-white text-sm"
                style={{ backgroundColor: selectedTemplate.color, fontWeight: '600' }}
              >
                <Check className="w-4 h-4" />
                Apply template
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default RuleTemplates;
