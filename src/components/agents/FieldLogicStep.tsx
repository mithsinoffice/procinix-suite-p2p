import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  TrendingUp,
  CheckCircle,
  Library,
  Plus,
  X,
  Play,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { RuleTemplates } from './RuleTemplates';

/**
 * ENHANCED FIELD LOGIC STEP — Compact table layout
 * Auto-loads fields from selected form, global rules (3-column grid),
 * accuracy predictor, inline add-rule rows, inline AI suggestions,
 * expandable detail panels per field.
 */

interface Field {
  name: string;
  dataType: string;
  required: boolean;
  category: string;
  rules: Array<{
    id: string;
    type: string;
    config: string;
    severity: string;
    color: string;
  }>;
  aiSuggestions?: Array<{ title: string; description: string }>;
}

interface FieldLogicStepProps {
  selectedModule?: string;
  selectedForm?: string;
  onFieldSelect?: (fieldName: string, fieldType: string) => void;
  externalRuleToAdd?: {
    fieldName: string;
    rule: { type: string; config: string; severity: string };
  } | null;
  onExternalRuleAdded?: () => void;
}

type RuleType =
  | 'Required'
  | 'Format'
  | 'Duplicate'
  | 'CrossReference'
  | 'Math'
  | 'Threshold'
  | 'Blacklist'
  | 'Custom';
type Severity = 'Block' | 'Warning' | 'Info';

const ruleColors: Record<string, string> = {
  Required: '#00A9B7',
  Format: '#3B82F6',
  Duplicate: '#F59E0B',
  CrossReference: '#8B5CF6',
  Math: '#10B981',
  Threshold: '#A855F7',
  Blacklist: '#EF4444',
  Custom: '#6B7280',
};

export function FieldLogicStep({
  selectedModule = 'Accounts Payable',
  selectedForm = 'AP Invoice',
  onFieldSelect,
  externalRuleToAdd,
  onExternalRuleAdded,
}: FieldLogicStepProps) {
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'suggest' | 'generate' | 'review'>('suggest');
  const [showTemplates, setShowTemplates] = useState(false);
  const [generateInput, setGenerateInput] = useState('');
  const [reviewData, setReviewData] = useState<any>(null);

  // New state for compact table layout
  const [addingRuleFor, setAddingRuleFor] = useState<string | null>(null);
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [aiLoadingField, setAiLoadingField] = useState<string | null>(null);
  const [aiSuggestionsFor, setAiSuggestionsFor] = useState<string | null>(null);

  // Inline add-rule form state
  const [newRuleType, setNewRuleType] = useState<RuleType>('Required');
  const [newRuleConfig, setNewRuleConfig] = useState('');
  const [newRuleSeverity, setNewRuleSeverity] = useState<Severity>('Block');

  // Expanded detail panel state
  const [customLogicMap, setCustomLogicMap] = useState<Record<string, string>>({});
  const [testValueMap, setTestValueMap] = useState<Record<string, string>>({});
  const [testResultsMap, setTestResultsMap] = useState<
    Record<string, Array<{ rule: string; passed: boolean; reason?: string }>>
  >({});

  // Track which field is selected for the parent AI panel
  const [selectedFieldForParent, setSelectedFieldForParent] = useState<string | null>(null);

  // Handle externally injected rules from parent AI panel
  const getColorForRuleType_early = useCallback((type: string) => {
    return ruleColors[type] || '#6B7280';
  }, []);

  useEffect(() => {
    if (externalRuleToAdd) {
      const newRule = {
        id: Date.now().toString(),
        type: externalRuleToAdd.rule.type || 'Custom',
        config: externalRuleToAdd.rule.config || '',
        severity: externalRuleToAdd.rule.severity || 'Block',
        color: getColorForRuleType_early(externalRuleToAdd.rule.type || 'Custom'),
      };
      setFields((prev) =>
        prev.map((field) =>
          field.name === externalRuleToAdd.fieldName
            ? { ...field, rules: [...field.rules, newRule] }
            : field
        )
      );
      onExternalRuleAdded?.();
    }
  }, [externalRuleToAdd, onExternalRuleAdded, getColorForRuleType_early]);

  // Global rules
  const [globalRules, setGlobalRules] = useState({
    preExecution: ['Confidence score must be ≥ threshold', 'Attachment must be PDF or image'],
    crossField: [
      'total_amount = subtotal + tax_amount ± 0.01',
      'invoice_date cannot be more than 7 days future',
      'GSTIN state code must match vendor address state',
    ],
    postValidation: [
      'Calculate confidence score from all rule results',
      'If confidence < threshold → set status = review',
      'Log all rule results to agent_run_logs',
    ],
  });

  // Auto-load fields when form is selected
  useEffect(() => {
    if (selectedForm) {
      loadFormFields(selectedForm);
    }
  }, [selectedForm]);

  const loadFormFields = (formName: string) => {
    const f = (
      name: string,
      dataType: string,
      required: boolean,
      category: string,
      rules: Field['rules'] = [],
      aiSuggestions: Field['aiSuggestions'] = []
    ): Field => ({ name, dataType, required, category, rules, aiSuggestions });
    const req = (id: string): Field['rules'][0] => ({
      id,
      type: 'Required',
      config: 'Cannot be empty',
      severity: 'Block',
      color: '#00A9B7',
    });
    const math = (id: string, c: string): Field['rules'][0] => ({
      id,
      type: 'Math',
      config: c,
      severity: 'Block',
      color: '#10B981',
    });

    const invoiceFields: Field[] = [
      f(
        'invoice_number',
        'Text',
        true,
        'Header',
        [req('1')],
        [{ title: 'Duplicate check', description: 'Prevent duplicate invoice numbers' }]
      ),
      f(
        'invoice_date',
        'Date',
        true,
        'Header',
        [req('2')],
        [{ title: 'Future date check', description: 'Warn if > 7 days in future' }]
      ),
      f(
        'due_date',
        'Date',
        true,
        'Header',
        [req('3')],
        [{ title: 'Due date calc', description: 'Auto from invoice date + payment terms' }]
      ),
      f(
        'payment_terms',
        'Text',
        false,
        'Header',
        [],
        [{ title: 'Terms lookup', description: 'Validate vendor payment terms' }]
      ),
      f(
        'vendor_name',
        'Text',
        true,
        'Vendor',
        [req('4')],
        [{ title: 'Vendor master lookup', description: 'Cross-reference with vendor master' }]
      ),
      f('vendor_code', 'Text', false, 'Vendor'),
      f('vendor_group', 'Text', false, 'Vendor'),
      f(
        'vendor_gstin',
        'Text',
        false,
        'Vendor',
        [],
        [
          { title: 'GST format', description: 'Validate 15-char GSTIN pattern' },
          { title: 'State code match', description: 'Match GSTIN state with vendor address' },
        ]
      ),
      f(
        'vendor_pan',
        'Text',
        false,
        'Vendor',
        [],
        [{ title: 'PAN format', description: 'Validate 10-char PAN pattern' }]
      ),
      f('vendor_state', 'Text', false, 'Vendor'),
      f('vendor_location', 'Text', false, 'Vendor'),
      f(
        'entity',
        'Text',
        true,
        'Entity',
        [req('5')],
        [{ title: 'Entity lookup', description: 'Must exist and be active in entity master' }]
      ),
      f('billing_location', 'Text', true, 'Entity', [req('6')]),
      f(
        'bill_to_gstin',
        'Text',
        false,
        'Entity',
        [],
        [{ title: 'GSTIN match', description: 'Bill-to GSTIN must match entity registration' }]
      ),
      f(
        'department',
        'Text',
        true,
        'Entity',
        [req('7')],
        [{ title: 'Dept lookup', description: 'Validate against department master' }]
      ),
      f('sub_department', 'Text', false, 'Entity'),
      f('base_amount', 'Currency', true, 'Amount', [req('8'), math('9', 'Must be > 0')]),
      f(
        'gross_amount',
        'Currency',
        true,
        'Amount',
        [req('10'), math('11', 'Must be > 0')],
        [{ title: 'Cross-field check', description: 'Gross = base + total GST' }]
      ),
      f('retention_name', 'Text', false, 'Retention'),
      f('retention_amount', 'Currency', false, 'Retention'),
      f('retention_reason', 'Text', false, 'Retention'),
      f('retention_date', 'Date', false, 'Retention'),
      f('expense_from', 'Date', false, 'Period'),
      f('expense_to', 'Date', false, 'Period'),
      f('narration', 'Text', false, 'Other'),
      f(
        'item_name',
        'Text',
        true,
        'Line Item',
        [req('12')],
        [{ title: 'Item master lookup', description: 'Cross-reference with item/product master' }]
      ),
      f(
        'item_code',
        'Text',
        false,
        'Line Item',
        [],
        [{ title: 'Item code check', description: 'Verify item code exists in item master' }]
      ),
      f('item_description', 'Text', false, 'Line Item'),
      f(
        'gl_code',
        'Text',
        false,
        'Line Item',
        [],
        [{ title: 'GL code validation', description: 'Verify account code in chart of accounts' }]
      ),
      f('quantity', 'Number', true, 'Line Item', [req('13'), math('14', 'Must be > 0')]),
      f('rate', 'Currency', true, 'Line Item', [req('15'), math('16', 'Must be > 0')]),
      f(
        'line_amount',
        'Currency',
        true,
        'Line Item',
        [req('17')],
        [{ title: 'Line calc', description: 'Amount = qty x rate' }]
      ),
      f(
        'gst_percent',
        'Number',
        false,
        'Line Item Tax',
        [],
        [{ title: 'GST rate check', description: 'Verify GST % is valid (0, 5, 12, 18, 28)' }]
      ),
      f('cgst', 'Currency', false, 'Line Item Tax'),
      f('sgst', 'Currency', false, 'Line Item Tax'),
      f('igst', 'Currency', false, 'Line Item Tax'),
      f('cess', 'Currency', false, 'Line Item Tax'),
      f(
        'total_gst',
        'Currency',
        false,
        'Line Item Tax',
        [],
        [{ title: 'GST calc check', description: 'Total GST = CGST + SGST + IGST + cess' }]
      ),
      f(
        'line_gross_amount',
        'Currency',
        false,
        'Line Item Tax',
        [],
        [{ title: 'Gross calc', description: 'Line gross = amount + total GST' }]
      ),
      f(
        'tds_section',
        'Text',
        false,
        'TDS',
        [],
        [
          {
            title: 'TDS section check',
            description: 'Validate TDS section code (194C, 194J, etc.)',
          },
        ]
      ),
      f(
        'tds_percent',
        'Number',
        false,
        'TDS',
        [],
        [{ title: 'TDS rate check', description: 'Verify TDS % matches section + vendor category' }]
      ),
      f('tds_amount', 'Currency', false, 'TDS'),
      f(
        'lower_tds',
        'Boolean',
        false,
        'TDS',
        [],
        [
          {
            title: 'Lower TDS cert',
            description: 'If true, verify vendor has valid lower TDS certificate',
          },
        ]
      ),
      f(
        'sec_206ab',
        'Text',
        false,
        'TDS',
        [],
        [{ title: '206AB check', description: 'Verify vendor ITR filing status for higher TDS' }]
      ),
      f(
        'net_payable',
        'Currency',
        false,
        'TDS',
        [],
        [{ title: 'Net payable', description: 'Net = gross - TDS' }]
      ),
      f(
        'cost_center',
        'Text',
        false,
        'Allocation',
        [],
        [{ title: 'Cost centre lookup', description: 'Validate against cost centre master' }]
      ),
      f(
        'profit_center',
        'Text',
        false,
        'Allocation',
        [],
        [{ title: 'Profit centre lookup', description: 'Validate against profit centre master' }]
      ),
      f('ship_to', 'Text', false, 'Allocation'),
      f('project_code', 'Text', false, 'Allocation'),
      f('ocr_item', 'Text', false, 'OCR'),
      f(
        'ocr_confidence',
        'Text',
        false,
        'OCR',
        [],
        [{ title: 'Confidence threshold', description: 'Flag items with confidence < 80%' }]
      ),
    ];

    const schemas: Record<string, Field[]> = {
      'AP Invoice': invoiceFields,
      'PO Invoice': invoiceFields,
      'Non-PO Invoice': invoiceFields,
      'Direct Invoice': invoiceFields,
      'Purchase Order': [
        f(
          'po_number',
          'Text',
          true,
          'Identity',
          [req('1')],
          [{ title: 'Auto-number', description: 'Auto-generate sequential PO number' }]
        ),
        f('po_date', 'Date', true, 'Identity', [req('2')]),
        f(
          'vendor_name',
          'Text',
          true,
          'Vendor',
          [req('3')],
          [{ title: 'Vendor lookup', description: 'Must exist in vendor master' }]
        ),
        f('vendor_code', 'Text', true, 'Vendor', [req('4')]),
        f('entity', 'Text', true, 'Identity', [req('5')]),
        f('currency', 'Text', true, 'Identity', [req('6')]),
        f(
          'delivery_date',
          'Date',
          true,
          'Logistics',
          [req('7')],
          [{ title: 'Lead time', description: 'Delivery date > PO date + lead time' }]
        ),
        f('delivery_address', 'Text', false, 'Logistics'),
        f('payment_terms', 'Text', false, 'Payment'),
        f('total_amount', 'Currency', true, 'Financial', [req('8'), math('9', 'Must be > 0')]),
        f('tax_amount', 'Currency', false, 'Financial'),
        f('department', 'Text', false, 'Allocation'),
        f('cost_centre', 'Text', false, 'Allocation'),
        f('remarks', 'Text', false, 'Other'),
      ],
      'Purchase Requisition': [
        f('pr_number', 'Text', true, 'Identity', [req('1')]),
        f('pr_date', 'Date', true, 'Identity', [req('2')]),
        f('requester', 'Text', true, 'Identity', [req('3')]),
        f('department', 'Text', true, 'Identity', [req('4')]),
        f('priority', 'Text', false, 'Identity'),
        f('entity', 'Text', true, 'Identity', [req('5')]),
        f('justification', 'Text', true, 'Other', [req('6')]),
        f(
          'estimated_amount',
          'Currency',
          false,
          'Financial',
          [],
          [{ title: 'Budget check', description: 'Verify against department budget' }]
        ),
        f('required_by_date', 'Date', false, 'Logistics'),
        f('cost_centre', 'Text', false, 'Allocation'),
      ],
      'Goods Receipt Note': [
        f('grn_number', 'Text', true, 'Identity', [req('1')]),
        f('grn_date', 'Date', true, 'Identity', [req('2')]),
        f(
          'po_number',
          'Text',
          true,
          'Reference',
          [req('3')],
          [{ title: 'PO check', description: 'PO must exist and be open' }]
        ),
        f('vendor_name', 'Text', true, 'Vendor', [req('4')]),
        f('entity', 'Text', true, 'Identity', [req('5')]),
        f(
          'received_qty',
          'Number',
          true,
          'Quantity',
          [req('6'), math('7', 'Must be > 0')],
          [{ title: 'Over-receipt', description: 'Warn if received > ordered' }]
        ),
        f('accepted_qty', 'Number', true, 'Quantity', [req('8')]),
        f('rejected_qty', 'Number', false, 'Quantity'),
        f('inspection_notes', 'Text', false, 'Quality'),
      ],
      'Advance Request': [
        f('request_number', 'Text', true, 'Identity', [req('1')]),
        f('vendor_name', 'Text', true, 'Vendor', [req('2')]),
        f('advance_amount', 'Currency', true, 'Financial', [req('3'), math('4', '> 0')]),
        f('purpose', 'Text', true, 'Other', [req('5')]),
        f('entity', 'Text', true, 'Identity', [req('6')]),
        f('po_number', 'Text', false, 'Reference'),
      ],
      'Debit Note': [
        f('debit_note_number', 'Text', true, 'Identity', [req('1')]),
        f('debit_note_date', 'Date', true, 'Identity', [req('2')]),
        f('vendor_name', 'Text', true, 'Vendor', [req('3')]),
        f('reason', 'Text', true, 'Other', [req('4')]),
        f('amount', 'Currency', true, 'Financial', [req('5'), math('6', '> 0')]),
        f('entity', 'Text', true, 'Identity', [req('7')]),
        f(
          'original_invoice',
          'Text',
          false,
          'Reference',
          [],
          [{ title: 'Invoice ref', description: 'Original invoice must exist' }]
        ),
      ],
      'Payment Proposal': [
        f('proposal_number', 'Text', true, 'Identity', [req('1')]),
        f('proposal_date', 'Date', true, 'Identity', [req('2')]),
        f('entity', 'Text', true, 'Identity', [req('3')]),
        f('total_amount', 'Currency', true, 'Financial', [req('4')]),
        f('payment_method', 'Text', true, 'Payment', [req('5')]),
        f('bank_account', 'Text', false, 'Payment'),
      ],
      'Vendor Onboarding': [
        f('vendor_name', 'Text', true, 'Identity', [req('1')]),
        f(
          'vendor_code',
          'Text',
          true,
          'Identity',
          [req('2')],
          [{ title: 'Duplicate', description: 'No existing vendor with same code' }]
        ),
        f(
          'gstin',
          'Text',
          false,
          'Compliance',
          [],
          [{ title: 'GSTIN format', description: 'Validate 15-char pattern' }]
        ),
        f(
          'pan',
          'Text',
          false,
          'Compliance',
          [],
          [{ title: 'PAN format', description: 'Validate 10-char pattern' }]
        ),
        f('msme_number', 'Text', false, 'Compliance'),
        f('bank_account', 'Text', false, 'Payment'),
        f(
          'ifsc_code',
          'Text',
          false,
          'Payment',
          [],
          [{ title: 'IFSC check', description: 'Validate IFSC format' }]
        ),
        f('entity', 'Text', true, 'Identity', [req('3')]),
        f('payment_terms', 'Text', false, 'Payment'),
        f(
          'contact_email',
          'Text',
          false,
          'Contact',
          [],
          [{ title: 'Email format', description: 'Validate email' }]
        ),
        f('contact_phone', 'Text', false, 'Contact'),
        f('address', 'Text', false, 'Contact'),
      ],
      'Vendor Review': [
        f('vendor_name', 'Text', true, 'Identity', [req('1')]),
        f('review_date', 'Date', true, 'Identity', [req('2')]),
        f('rating', 'Number', true, 'Assessment', [req('3')]),
        f('compliance_status', 'Text', false, 'Compliance'),
        f('remarks', 'Text', false, 'Other'),
      ],
    };

    setFields(schemas[formName] || schemas['AP Invoice'] || []);
  };

  // Keep original function signature below
  const _unusedOriginal = null;
  void _unusedOriginal;

  /* original loadFormFields replaced above */
  const __loadFormFieldsPlaceholder = (formName: string) => {
    void formName;
    const schemas: Record<string, Field[]> = {
      __placeholder__: [
        {
          name: 'invoice_number',
          dataType: 'Text',
          required: true,
          category: 'Identity',
          rules: [
            {
              id: '1',
              type: 'Required',
              config: 'Cannot be empty',
              severity: 'Block',
              color: '#00A9B7',
            },
          ],
          aiSuggestions: [
            { title: 'Add duplicate check', description: 'Prevent duplicate invoice numbers' },
          ],
        },
        {
          name: 'invoice_date',
          dataType: 'Date',
          required: true,
          category: 'Identity',
          rules: [
            {
              id: '2',
              type: 'Required',
              config: 'Cannot be empty',
              severity: 'Block',
              color: '#00A9B7',
            },
          ],
          aiSuggestions: [
            {
              title: 'Check future dates',
              description: 'Warn if invoice date is > 7 days in future',
            },
          ],
        },
        {
          name: 'vendor_name',
          dataType: 'Text',
          required: true,
          category: 'Vendor',
          rules: [
            {
              id: '3',
              type: 'Required',
              config: 'Cannot be empty',
              severity: 'Block',
              color: '#00A9B7',
            },
          ],
        },
        {
          name: 'vendor_gstin',
          dataType: 'Text',
          required: false,
          category: 'Vendor',
          rules: [],
          aiSuggestions: [
            { title: 'GST format validation', description: 'Validate GSTIN format pattern' },
            { title: 'State code matching', description: 'Match state code with vendor address' },
          ],
        },
        {
          name: 'subtotal',
          dataType: 'Currency',
          required: true,
          category: 'Financial',
          rules: [
            {
              id: '4',
              type: 'Required',
              config: 'Cannot be empty',
              severity: 'Block',
              color: '#00A9B7',
            },
            { id: '5', type: 'Math', config: 'Must be > 0', severity: 'Block', color: '#10B981' },
          ],
        },
        {
          name: 'tax_amount',
          dataType: 'Currency',
          required: true,
          category: 'Financial',
          rules: [
            {
              id: '6',
              type: 'Required',
              config: 'Cannot be empty',
              severity: 'Block',
              color: '#00A9B7',
            },
          ],
        },
        {
          name: 'total_amount',
          dataType: 'Currency',
          required: true,
          category: 'Financial',
          rules: [
            {
              id: '7',
              type: 'Required',
              config: 'Cannot be empty',
              severity: 'Block',
              color: '#00A9B7',
            },
            { id: '8', type: 'Math', config: 'Must be > 0', severity: 'Block', color: '#10B981' },
          ],
          aiSuggestions: [
            { title: 'Cross-field validation', description: 'Check total = subtotal + tax' },
          ],
        },
        {
          name: 'po_number',
          dataType: 'Text',
          required: false,
          category: 'Other',
          rules: [],
          aiSuggestions: [
            { title: 'PO existence check', description: 'Verify PO exists in system' },
          ],
        },
      ],
    };

    setFields(schemas[formName] || []);
  };

  const handleAddRule = (fieldName: string, rule: any) => {
    setFields(
      fields.map((field) =>
        field.name === fieldName ? { ...field, rules: [...field.rules, rule] } : field
      )
    );
  };

  const handleRemoveRule = (fieldName: string, ruleId: string) => {
    setFields(
      fields.map((field) =>
        field.name === fieldName
          ? { ...field, rules: field.rules.filter((r) => r.id !== ruleId) }
          : field
      )
    );
  };

  const handleApplyTemplate = (template: any) => {
    const updatedFields = fields.map((field) => {
      const templateRules = template.rules.filter((r: any) => r.field === field.name);
      if (templateRules.length > 0) {
        const newRules = templateRules.map((r: any, idx: number) => ({
          id: `template-${Date.now()}-${idx}`,
          type: r.type,
          config: r.config,
          severity: r.severity,
          color: getColorForRuleType(r.type),
        }));
        return { ...field, rules: [...field.rules, ...newRules] };
      }
      return field;
    });
    setFields(updatedFields);
  };

  const getColorForRuleType = (type: string) => {
    return ruleColors[type] || '#6B7280';
  };

  const calculateAccuracy = () => {
    const totalFields = fields.length;
    const fieldsWithRules = fields.filter((f) => f.rules.length > 0).length;
    const totalRules = fields.reduce((sum, f) => sum + f.rules.length, 0);
    const recommendedRulesPerField = 2;
    const recommendedTotalRules = totalFields * recommendedRulesPerField;

    const accuracy = Math.min(98, 70 + (totalRules / recommendedTotalRules) * 28);
    return accuracy;
  };

  const accuracy = calculateAccuracy();
  const rulesNeeded = Math.max(
    0,
    fields.length * 2 - fields.reduce((sum, f) => sum + f.rules.length, 0)
  );

  const handleReviewRules = () => {
    setReviewData({
      predicted_accuracy: 94.5,
      gaps: [
        {
          field: 'vendor_gstin',
          missing_rule: 'Format validation',
          reason: 'GSTIN format should be validated',
          priority: 'High',
        },
        {
          field: 'invoice_date',
          missing_rule: 'Date range check',
          reason: 'Future dates should be flagged',
          priority: 'Medium',
        },
      ],
      redundancies: [],
      recommendations: [
        { priority: 'High', action: 'Add 3-way match rules', impact: '+3.2% accuracy' },
        { priority: 'Medium', action: 'Enable duplicate detection', impact: '+1.5% accuracy' },
      ],
    });
  };

  // Inline add-rule handler
  const handleInlineAddRule = (fieldName: string) => {
    const newRule = {
      id: Date.now().toString(),
      type: newRuleType,
      config: newRuleConfig,
      severity: newRuleSeverity,
      color: getColorForRuleType(newRuleType),
    };
    handleAddRule(fieldName, newRule);
    setNewRuleConfig('');
    setNewRuleType('Required');
    setNewRuleSeverity('Block');
    setAddingRuleFor(null);
  };

  // Test field handler
  const handleTestField = (fieldName: string) => {
    const field = fields.find((f) => f.name === fieldName);
    if (!field) return;
    const testValue = testValueMap[fieldName] || '';
    const results = field.rules.map((rule) => {
      let passed = true;
      let reason = '';
      switch (rule.type) {
        case 'Required':
          passed = testValue.trim().length > 0;
          reason = passed ? '' : 'Field is required';
          break;
        case 'Format':
          if (rule.config.includes('email')) {
            passed = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testValue);
            reason = passed ? '' : 'Invalid email format';
          }
          break;
        case 'Math':
          passed = !isNaN(Number(testValue));
          reason = passed ? '' : 'Must be a number';
          break;
        default:
          passed = true;
      }
      return { rule: `${rule.type}: ${rule.config}`, passed, reason };
    });
    setTestResultsMap((prev) => ({ ...prev, [fieldName]: results }));
  };

  // AI suggestion handler (mock)
  const handleAiSuggest = (fieldName: string) => {
    setAiLoadingField(fieldName);
    setAiSuggestionsFor(fieldName);
    // Simulate API call
    setTimeout(() => {
      setAiLoadingField(null);
    }, 1200);
  };

  // Group fields by category
  const groupedFields = fields.reduce(
    (acc, field) => {
      if (!acc[field.category]) acc[field.category] = [];
      acc[field.category].push(field);
      return acc;
    },
    {} as Record<string, Field[]>
  );

  // Suppress unused variable warnings
  void __loadFormFieldsPlaceholder;
  void selectedModule;
  void activeTab;
  void setActiveTab;
  void generateInput;
  void setGenerateInput;
  void reviewData;
  void setReviewData;
  void handleReviewRules;

  const accuracyColor = accuracy > 95 ? '#10B981' : accuracy > 80 ? '#F59E0B' : '#EF4444';
  const accuracyPercent = Math.min(100, accuracy);

  return (
    <div className="flex gap-6 h-full">
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Slim Accuracy Bar */}
        <div
          className="mb-5 px-5 py-3 rounded-xl flex items-center gap-4"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E1E6EA' }}
        >
          <TrendingUp className="w-4 h-4 flex-shrink-0" style={{ color: accuracyColor }} />
          <span
            style={{ color: '#0A0F14', fontWeight: '600', fontSize: '13px', whiteSpace: 'nowrap' }}
          >
            Estimated accuracy:
          </span>
          <span
            style={{
              color: accuracyColor,
              fontWeight: '700',
              fontSize: '16px',
              whiteSpace: 'nowrap',
            }}
          >
            {accuracy.toFixed(1)}%
          </span>
          <div
            className="flex-1 h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: '#E1E6EA' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${accuracyPercent}%`, backgroundColor: accuracyColor }}
            />
          </div>
          {rulesNeeded > 0 && (
            <span style={{ color: '#6E7A82', fontSize: '12px', whiteSpace: 'nowrap' }}>
              Add {rulesNeeded} more rules to reach 98%+
            </span>
          )}
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg flex-shrink-0"
            style={{
              backgroundColor: '#8B5CF6',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: '600',
            }}
          >
            <Library className="w-3 h-3" />
            Templates
          </button>
        </div>

        {/* Rule Templates Modal */}
        {showTemplates && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 style={{ color: '#0A0F14', fontWeight: '600', fontSize: '15px' }}>
                Rule Templates
              </h3>
              <button
                onClick={() => setShowTemplates(false)}
                style={{ color: '#6E7A82', fontSize: '12px' }}
              >
                Close
              </button>
            </div>
            <RuleTemplates onApplyTemplate={handleApplyTemplate} />
          </div>
        )}

        {/* Global Rules — 3-column grid */}
        <div
          className="mb-5 bg-white rounded-xl p-5"
          style={{ border: '1px solid #E1E6EA', borderLeft: '4px solid #8B5CF6' }}
        >
          <h3 className="mb-4" style={{ color: '#0A0F14', fontWeight: '600', fontSize: '14px' }}>
            Global Rules
          </h3>
          <div className="grid grid-cols-3 gap-5">
            {/* Pre-execution */}
            <div>
              <div
                style={{
                  color: '#6E7A82',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px',
                  fontWeight: '600',
                }}
              >
                Pre-execution checks
              </div>
              <ul className="space-y-1.5">
                {globalRules.preExecution.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle
                      className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                      style={{ color: '#10B981' }}
                    />
                    <span style={{ color: '#0A0F14', fontSize: '12px', lineHeight: '1.4' }}>
                      {rule}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Cross-field */}
            <div>
              <div
                style={{
                  color: '#6E7A82',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px',
                  fontWeight: '600',
                }}
              >
                Cross-field validations
              </div>
              <ul className="space-y-1.5">
                {globalRules.crossField.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle
                      className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                      style={{ color: '#8B5CF6' }}
                    />
                    <span style={{ color: '#0A0F14', fontSize: '12px', lineHeight: '1.4' }}>
                      {rule}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Post-validation */}
            <div>
              <div
                style={{
                  color: '#6E7A82',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px',
                  fontWeight: '600',
                }}
              >
                Post-validation actions
              </div>
              <ul className="space-y-1.5">
                {globalRules.postValidation.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle
                      className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                      style={{ color: '#00A9B7' }}
                    />
                    <span style={{ color: '#0A0F14', fontSize: '12px', lineHeight: '1.4' }}>
                      {rule}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Field Table */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E1E6EA' }}
        >
          {/* Table header banner */}
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderBottom: '1px solid #E1E6EA', backgroundColor: '#F6F9FC' }}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: '#00A9B7' }} />
              <span style={{ color: '#007D87', fontWeight: '600', fontSize: '13px' }}>
                {fields.length} fields loaded from {selectedForm}
              </span>
            </div>
          </div>

          {/* Column headers */}
          <div
            className="grid items-center px-2 py-2.5"
            style={{
              gridTemplateColumns: '3px 1fr 70px 40px 80px 1fr 120px',
              background: 'linear-gradient(180deg, #F8FBFD 0%, #F3F8FB 100%)',
              borderBottom: '1px solid #E1E6EA',
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}
          >
            <div />
            <span
              style={{
                color: '#6E7A82',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '700',
                paddingLeft: '12px',
              }}
            >
              Field Name
            </span>
            <span
              style={{
                color: '#6E7A82',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '700',
              }}
            >
              Type
            </span>
            <span
              style={{
                color: '#6E7A82',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '700',
              }}
            >
              Req
            </span>
            <span
              style={{
                color: '#6E7A82',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '700',
              }}
            >
              Category
            </span>
            <span
              style={{
                color: '#6E7A82',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '700',
              }}
            >
              Rules
            </span>
            <span
              style={{
                color: '#6E7A82',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '700',
              }}
            >
              Actions
            </span>
          </div>

          {/* Field rows grouped by category */}
          {Object.entries(groupedFields).map(([category, categoryFields]) => (
            <div key={category}>
              {/* Category header row */}
              <div
                className="px-5 py-2 flex items-center gap-3"
                style={{ borderBottom: '1px solid #E1E6EA', backgroundColor: '#FAFBFC' }}
              >
                <div style={{ flex: 1, height: '1px', backgroundColor: '#D1D9DE' }} />
                <span
                  style={{
                    color: '#00A9B7',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontWeight: '700',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {category}
                </span>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#D1D9DE' }} />
              </div>

              {/* Field rows */}
              {categoryFields.map((field, rowIdx) => {
                const hasRules = field.rules.length > 0;
                const isAddingRule = addingRuleFor === field.name;
                const isExpanded = expandedField === field.name;
                const isAiLoading = aiLoadingField === field.name;
                const showAiSuggestions = aiSuggestionsFor === field.name && !isAiLoading;

                return (
                  <div key={field.name}>
                    {/* Main field row */}
                    <div
                      className="grid items-center px-2 transition-colors"
                      style={{
                        gridTemplateColumns: '3px 1fr 70px 40px 80px 1fr 120px',
                        minHeight: '44px',
                        backgroundColor:
                          selectedFieldForParent === field.name
                            ? '#F0FDFA'
                            : rowIdx % 2 === 0
                              ? '#FFFFFF'
                              : '#FAFBFC',
                        borderBottom: '1px solid #F0F3F5',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedFieldForParent !== field.name)
                          e.currentTarget.style.backgroundColor = '#F0FAFA';
                      }}
                      onMouseLeave={(e) => {
                        if (selectedFieldForParent !== field.name)
                          e.currentTarget.style.backgroundColor =
                            rowIdx % 2 === 0 ? '#FFFFFF' : '#FAFBFC';
                      }}
                      onClick={() => {
                        setSelectedField(field.name);
                        setSelectedFieldForParent(field.name);
                        onFieldSelect?.(field.name, field.dataType);
                      }}
                    >
                      {/* Left border accent */}
                      <div
                        className="self-stretch rounded-sm"
                        style={{
                          backgroundColor:
                            selectedFieldForParent === field.name
                              ? '#00A9B7'
                              : hasRules
                                ? '#00A9B720'
                                : 'transparent',
                          width: '3px',
                          transition: 'background-color 0.15s ease',
                        }}
                      />

                      {/* Field name + expand arrow */}
                      <div className="flex items-center gap-1.5 pl-3 pr-2 py-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedField(isExpanded ? null : field.name);
                          }}
                          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                          style={{
                            width: '16px',
                            height: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                        <span style={{ color: '#0A0F14', fontWeight: '600', fontSize: '13px' }}>
                          {field.name}
                        </span>
                      </div>

                      {/* Type badge */}
                      <div className="py-2">
                        <span
                          className="px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: '#F0F3F5',
                            color: '#6E7A82',
                            fontSize: '11px',
                            fontWeight: '500',
                          }}
                        >
                          {field.dataType}
                        </span>
                      </div>

                      {/* Required dot */}
                      <div className="py-2 text-center">
                        {field.required && (
                          <span style={{ color: '#EF4444', fontSize: '14px' }}>●</span>
                        )}
                      </div>

                      {/* Category */}
                      <div className="py-2">
                        <span style={{ color: '#9AA6AF', fontSize: '11px' }}>{field.category}</span>
                      </div>

                      {/* Rules chips */}
                      <div className="py-2 flex flex-wrap gap-1 items-center">
                        {field.rules.length > 0 ? (
                          field.rules.map((rule) => (
                            <span
                              key={rule.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${rule.color}15`,
                                fontSize: '10px',
                                fontWeight: '600',
                                color: rule.color,
                              }}
                            >
                              <span
                                style={{
                                  width: '5px',
                                  height: '5px',
                                  borderRadius: '50%',
                                  backgroundColor: rule.color,
                                  display: 'inline-block',
                                }}
                              />
                              {rule.type}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveRule(field.name, rule.id);
                                }}
                                className="hover:opacity-70 ml-0.5"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          ))
                        ) : (
                          <span style={{ color: '#B8C1C8', fontSize: '11px', fontStyle: 'italic' }}>
                            (no rules)
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="py-2 flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isAddingRule) {
                              setAddingRuleFor(null);
                            } else {
                              setAddingRuleFor(field.name);
                              setNewRuleType('Required');
                              setNewRuleConfig('');
                              setNewRuleSeverity('Block');
                            }
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                          style={{
                            color: isAddingRule ? '#FFFFFF' : '#00A9B7',
                            backgroundColor: isAddingRule ? '#00A9B7' : 'transparent',
                            border: '1px solid #00A9B7',
                            fontWeight: '600',
                            fontSize: '10px',
                          }}
                        >
                          <Plus className="w-3 h-3" />
                          Rule
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAiSuggest(field.name);
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                          style={{
                            color: '#4A3BAF',
                            backgroundColor: showAiSuggestions ? '#F0EDFF' : 'transparent',
                            border: '1px solid #C7B5F3',
                            fontWeight: '600',
                            fontSize: '10px',
                          }}
                        >
                          <Sparkles className="w-3 h-3" />
                          AI
                        </button>
                      </div>
                    </div>

                    {/* Inline add-rule row */}
                    {isAddingRule && (
                      <div
                        className="grid items-center px-2 py-2"
                        style={{
                          gridTemplateColumns: '3px 1fr',
                          backgroundColor: '#F6F9FC',
                          borderBottom: '1px solid #E1E6EA',
                        }}
                      >
                        <div />
                        <div className="flex items-center gap-2 pl-3">
                          <select
                            value={newRuleType}
                            onChange={(e) => setNewRuleType(e.target.value as RuleType)}
                            className="px-2 py-1.5 rounded text-xs"
                            style={{ border: '1px solid #E1E6EA', minWidth: '120px' }}
                          >
                            <option value="Required">Required</option>
                            <option value="Format">Format</option>
                            <option value="Duplicate">Duplicate</option>
                            <option value="CrossReference">CrossReference</option>
                            <option value="Math">Math</option>
                            <option value="Threshold">Threshold</option>
                            <option value="Custom">Custom</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Rule configuration..."
                            value={newRuleConfig}
                            onChange={(e) => setNewRuleConfig(e.target.value)}
                            className="flex-1 px-2 py-1.5 rounded text-xs"
                            style={{ border: '1px solid #E1E6EA', maxWidth: '280px' }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <select
                            value={newRuleSeverity}
                            onChange={(e) => setNewRuleSeverity(e.target.value as Severity)}
                            className="px-2 py-1.5 rounded text-xs"
                            style={{ border: '1px solid #E1E6EA', minWidth: '80px' }}
                          >
                            <option value="Block">Block</option>
                            <option value="Warning">Warn</option>
                            <option value="Info">Info</option>
                          </select>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInlineAddRule(field.name);
                            }}
                            className="px-3 py-1.5 rounded text-xs text-white"
                            style={{ backgroundColor: '#00A9B7', fontWeight: '600' }}
                          >
                            Add
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAddingRuleFor(null);
                            }}
                            className="px-3 py-1.5 rounded text-xs"
                            style={{ border: '1px solid #E1E6EA', color: '#6E7A82' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Inline AI suggestions panel */}
                    {(isAiLoading || showAiSuggestions) && (
                      <div
                        className="px-5 py-3"
                        style={{ backgroundColor: '#F8F6FF', borderBottom: '1px solid #E1E6EA' }}
                      >
                        {isAiLoading ? (
                          <div className="flex items-center gap-2 py-2">
                            <Loader2
                              className="w-4 h-4 animate-spin"
                              style={{ color: '#4A3BAF' }}
                            />
                            <span style={{ color: '#4A3BAF', fontSize: '12px' }}>
                              Generating AI suggestions...
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3" style={{ color: '#4A3BAF' }} />
                                <span
                                  style={{ color: '#4A3BAF', fontSize: '11px', fontWeight: '600' }}
                                >
                                  AI Suggestions for {field.name}
                                </span>
                              </div>
                              <button
                                onClick={() => setAiSuggestionsFor(null)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex gap-2">
                              {(field.aiSuggestions || []).slice(0, 3).map((suggestion, idx) => (
                                <div
                                  key={idx}
                                  className="flex-1 bg-white p-3 rounded-lg"
                                  style={{ border: '1px solid #E1E6EA' }}
                                >
                                  <div
                                    style={{
                                      color: '#0A0F14',
                                      fontWeight: '600',
                                      fontSize: '12px',
                                      marginBottom: '3px',
                                    }}
                                  >
                                    {suggestion.title}
                                  </div>
                                  <div
                                    style={{
                                      color: '#6E7A82',
                                      fontSize: '11px',
                                      marginBottom: '6px',
                                    }}
                                  >
                                    {suggestion.description}
                                  </div>
                                  <button
                                    onClick={() => {
                                      handleAddRule(field.name, {
                                        id: `ai-${Date.now()}-${idx}`,
                                        type: 'Custom',
                                        config: suggestion.title,
                                        severity: 'Block',
                                        color: getColorForRuleType('Custom'),
                                      });
                                      setAiSuggestionsFor(null);
                                    }}
                                    className="px-3 py-1 rounded text-xs text-white"
                                    style={{ backgroundColor: '#4A3BAF', fontWeight: '600' }}
                                  >
                                    Apply
                                  </button>
                                </div>
                              ))}
                              {(!field.aiSuggestions || field.aiSuggestions.length === 0) && (
                                <div
                                  style={{ color: '#9AA6AF', fontSize: '12px', padding: '8px 0' }}
                                >
                                  No suggestions available for this field.
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <div
                        className="px-5 py-4"
                        style={{ backgroundColor: '#FAFBFC', borderBottom: '1px solid #E1E6EA' }}
                      >
                        <div className="grid grid-cols-2 gap-5">
                          {/* Custom logic textarea */}
                          <div>
                            <div
                              style={{
                                color: '#6E7A82',
                                fontSize: '10px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '6px',
                                fontWeight: '600',
                              }}
                            >
                              Custom Logic
                            </div>
                            <textarea
                              placeholder="Describe logic in plain English..."
                              value={customLogicMap[field.name] || ''}
                              onChange={(e) =>
                                setCustomLogicMap((prev) => ({
                                  ...prev,
                                  [field.name]: e.target.value,
                                }))
                              }
                              rows={3}
                              className="w-full px-3 py-2 rounded-lg text-xs"
                              style={{ border: '0.5px solid #E1E6EA', resize: 'none' }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              className="mt-2 px-3 py-1.5 rounded text-xs text-white"
                              style={{ backgroundColor: '#4A3BAF', fontWeight: '600' }}
                            >
                              <Sparkles className="w-3 h-3 inline mr-1.5" />
                              Convert with AI
                            </button>
                          </div>

                          {/* Test field */}
                          <div>
                            <div
                              style={{
                                color: '#6E7A82',
                                fontSize: '10px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '6px',
                                fontWeight: '600',
                              }}
                            >
                              Test Field
                            </div>
                            <div className="flex gap-2 mb-2">
                              <input
                                type="text"
                                placeholder="Enter test value..."
                                value={testValueMap[field.name] || ''}
                                onChange={(e) =>
                                  setTestValueMap((prev) => ({
                                    ...prev,
                                    [field.name]: e.target.value,
                                  }))
                                }
                                className="flex-1 px-3 py-2 rounded-lg text-xs"
                                style={{ border: '0.5px solid #E1E6EA' }}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTestField(field.name);
                                }}
                                className="px-3 py-2 rounded-lg text-white text-xs flex items-center gap-1"
                                style={{ backgroundColor: '#00A9B7', fontWeight: '600' }}
                              >
                                <Play className="w-3 h-3" />
                                Test
                              </button>
                            </div>
                            {(testResultsMap[field.name] || []).length > 0 && (
                              <div className="space-y-1">
                                {testResultsMap[field.name].map((result, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-2 p-2 rounded text-xs bg-white"
                                  >
                                    {result.passed ? (
                                      <Check
                                        className="w-3 h-3 flex-shrink-0 mt-0.5"
                                        style={{ color: '#10B981' }}
                                      />
                                    ) : (
                                      <X
                                        className="w-3 h-3 flex-shrink-0 mt-0.5"
                                        style={{ color: '#EF4444' }}
                                      />
                                    )}
                                    <div className="flex-1">
                                      <div style={{ color: '#0A0F14', fontWeight: '600' }}>
                                        {result.rule}
                                      </div>
                                      {result.reason && (
                                        <div style={{ color: '#EF4444', fontSize: '11px' }}>
                                          {result.reason}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - AI Logic Enhancer (now provided by parent AgentConfiguratorCreate) */}
    </div>
  );
}

export default FieldLogicStep;
