import { useState } from 'react';
import { ChevronDown, ChevronUp, X, Plus, Sparkles, Play, Check, AlertCircle } from 'lucide-react';

/**
 * ENHANCED FIELD RULE CARD
 * Auto-expandable card for each field with inline rule builder,
 * AI suggestions, and inline testing
 */

interface Rule {
  id: string;
  type:
    | 'Required'
    | 'Format'
    | 'Duplicate'
    | 'CrossReference'
    | 'Math'
    | 'Threshold'
    | 'Blacklist'
    | 'Custom';
  config: string;
  severity: 'Info' | 'Warning' | 'Block';
  color: string;
}

interface FieldRuleCardProps {
  fieldName: string;
  dataType: string;
  required: boolean;
  category: string;
  rules: Rule[];
  aiSuggestions?: Array<{ title: string; description: string }>;
  onAddRule: (rule: Rule) => void;
  onRemoveRule: (ruleId: string) => void;
  onSelectField?: () => void;
}

export function FieldRuleCard({
  fieldName,
  dataType,
  required,
  category,
  rules,
  aiSuggestions = [],
  onAddRule,
  onRemoveRule,
  onSelectField,
}: FieldRuleCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [testValue, setTestValue] = useState('');
  const [testResults, setTestResults] = useState<
    Array<{ rule: string; passed: boolean; reason?: string }>
  >([]);

  // New rule form state
  const [ruleType, setRuleType] = useState<Rule['type']>('Required');
  const [ruleConfig, setRuleConfig] = useState('');
  const [ruleSeverity, setRuleSeverity] = useState<Rule['severity']>('Block');
  const [customLogic, setCustomLogic] = useState('');

  const ruleColors: Record<Rule['type'], string> = {
    Required: '#00A9B7',
    Format: '#3B82F6',
    Duplicate: '#F59E0B',
    CrossReference: '#8B5CF6',
    Math: '#10B981',
    Threshold: '#A855F7',
    Blacklist: '#EF4444',
    Custom: '#6B7280',
  };

  const handleAddRule = () => {
    const newRule: Rule = {
      id: Date.now().toString(),
      type: ruleType,
      config: ruleConfig,
      severity: ruleSeverity,
      color: ruleColors[ruleType],
    };
    onAddRule(newRule);
    setRuleConfig('');
    setShowAddRule(false);
  };

  const handleTestField = () => {
    // Client-side rule validation
    const results = rules.map((rule) => {
      let passed = true;
      let reason = '';

      switch (rule.type) {
        case 'Required':
          passed = testValue.trim().length > 0;
          reason = passed ? '' : 'Field is required';
          break;
        case 'Format':
          // Simple format check (e.g., email, phone)
          if (rule.config.includes('email')) {
            passed = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testValue);
            reason = passed ? '' : 'Invalid email format';
          }
          break;
        case 'Math':
          // Check if value is numeric
          passed = !isNaN(Number(testValue));
          reason = passed ? '' : 'Must be a number';
          break;
        default:
          passed = true;
      }

      return { rule: `${rule.type}: ${rule.config}`, passed, reason };
    });

    setTestResults(results);
  };

  return (
    <div
      className="bg-white rounded-xl p-5"
      style={{ border: '1px solid #E1E6EA' }}
      onClick={() => {
        if (!expanded && onSelectField) {
          onSelectField();
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span style={{ color: '#0A0F14', fontWeight: '600', fontSize: '14px' }}>
                {fieldName}
              </span>
              <span
                className="px-2 py-1 rounded text-xs"
                style={{ backgroundColor: '#F6F9FC', color: '#6E7A82', fontWeight: '600' }}
              >
                {dataType}
              </span>
              {required && (
                <span
                  className="px-2 py-1 rounded text-xs"
                  style={{ backgroundColor: '#FEE2E2', color: '#991B1B', fontWeight: '600' }}
                >
                  Required
                </span>
              )}
            </div>
            <div style={{ color: '#9AA6AF', fontSize: '11px', marginTop: '2px' }}>{category}</div>
          </div>
        </div>

        {/* Rule count badge */}
        <span
          className="px-3 py-1 rounded-full text-xs"
          style={{ backgroundColor: '#D6F7F9', color: '#007D87', fontWeight: '600' }}
        >
          {rules.length} {rules.length === 1 ? 'rule' : 'rules'}
        </span>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Active Rules */}
          {rules.length > 0 && (
            <div>
              <div
                style={{
                  color: '#6E7A82',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px',
                }}
              >
                Active Rules
              </div>
              <div className="flex flex-wrap gap-2">
                {rules.map((rule) => (
                  <span
                    key={rule.id}
                    className="px-3 py-1.5 rounded-full text-xs flex items-center gap-2"
                    style={{
                      backgroundColor: `${rule.color}20`,
                      color: rule.color,
                      fontWeight: '600',
                    }}
                  >
                    {rule.type}: {rule.config}
                    <button onClick={() => onRemoveRule(rule.id)} className="hover:opacity-70">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Add Rule Builder */}
          {showAddRule ? (
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}
            >
              <div className="grid grid-cols-3 gap-3 mb-3">
                <select
                  value={ruleType}
                  onChange={(e) => setRuleType(e.target.value as Rule['type'])}
                  className="px-3 py-2 rounded-lg text-xs"
                  style={{ border: '0.5px solid #E1E6EA' }}
                >
                  <option>Required</option>
                  <option>Format</option>
                  <option>Duplicate</option>
                  <option>CrossReference</option>
                  <option>Math</option>
                  <option>Threshold</option>
                  <option>Blacklist</option>
                  <option>Custom</option>
                </select>
                <input
                  type="text"
                  placeholder="Rule config..."
                  value={ruleConfig}
                  onChange={(e) => setRuleConfig(e.target.value)}
                  className="px-3 py-2 rounded-lg text-xs"
                  style={{ border: '0.5px solid #E1E6EA' }}
                />
                <select
                  value={ruleSeverity}
                  onChange={(e) => setRuleSeverity(e.target.value as Rule['severity'])}
                  className="px-3 py-2 rounded-lg text-xs"
                  style={{ border: '0.5px solid #E1E6EA' }}
                >
                  <option>Info</option>
                  <option>Warning</option>
                  <option>Block</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddRule}
                  className="px-4 py-2 rounded-lg text-white text-xs"
                  style={{ backgroundColor: '#00A9B7', fontWeight: '600' }}
                >
                  Save rule
                </button>
                <button
                  onClick={() => setShowAddRule(false)}
                  className="px-4 py-2 rounded-lg text-xs"
                  style={{ border: '1px solid #E1E6EA', color: '#6E7A82' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddRule(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors w-full"
              style={{ border: '1px dashed #E1E6EA', color: '#6E7A82' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#00A9B7';
                e.currentTarget.style.color = '#00A9B7';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E1E6EA';
                e.currentTarget.style.color = '#6E7A82';
              }}
            >
              <Plus className="w-3 h-3" />
              Add rule
            </button>
          )}

          {/* Custom Logic with AI */}
          <div>
            <div
              style={{
                color: '#6E7A82',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px',
              }}
            >
              Custom Logic
            </div>
            <textarea
              placeholder="Describe logic in plain English..."
              value={customLogic}
              onChange={(e) => setCustomLogic(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-xs"
              style={{ border: '0.5px solid #E1E6EA', resize: 'none' }}
            />
            <button
              className="mt-2 px-4 py-2 rounded-lg text-xs text-white"
              style={{ backgroundColor: '#4A3BAF', fontWeight: '600' }}
            >
              <Sparkles className="w-3 h-3 inline mr-2" />
              Convert with AI
            </button>
          </div>

          {/* AI Suggestions */}
          {aiSuggestions.length > 0 && (
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#F0EDFF' }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3 h-3" style={{ color: '#4A3BAF' }} />
                <span className="text-xs" style={{ color: '#4A3BAF', fontWeight: '600' }}>
                  AI Suggestions
                </span>
              </div>
              <div className="space-y-2">
                {aiSuggestions.map((suggestion, idx) => (
                  <div key={idx} className="bg-white p-2 rounded text-xs">
                    <div style={{ color: '#0A0F14', fontWeight: '600', marginBottom: '4px' }}>
                      {suggestion.title}
                    </div>
                    <div style={{ color: '#6E7A82', fontSize: '11px', marginBottom: '6px' }}>
                      {suggestion.description}
                    </div>
                    <button
                      className="px-3 py-1 rounded text-xs text-white"
                      style={{ backgroundColor: '#4A3BAF', fontWeight: '600' }}
                    >
                      Apply
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inline Test Panel */}
          <div>
            <button
              onClick={() => setShowTest(!showTest)}
              className="flex items-center gap-2 text-xs"
              style={{ color: '#00A9B7', fontWeight: '600' }}
            >
              <Play className="w-3 h-3" />
              {showTest ? 'Hide test panel' : 'Test this field'}
            </button>

            {showTest && (
              <div
                className="mt-3 p-3 rounded-lg"
                style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}
              >
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Enter test value..."
                    value={testValue}
                    onChange={(e) => setTestValue(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs"
                    style={{ border: '0.5px solid #E1E6EA' }}
                  />
                  <button
                    onClick={handleTestField}
                    className="px-4 py-2 rounded-lg text-white text-xs"
                    style={{ backgroundColor: '#00A9B7', fontWeight: '600' }}
                  >
                    Test
                  </button>
                </div>

                {testResults.length > 0 && (
                  <div className="space-y-2">
                    {testResults.map((result, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2 rounded text-xs"
                        style={{ backgroundColor: '#FFFFFF' }}
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
                          <div style={{ color: '#0A0F14', fontWeight: '600' }}>{result.rule}</div>
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default FieldRuleCard;
