import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  Sparkles,
  Building2,
  AlertTriangle,
  GitBranch,
  Calculator,
  Code,
  TrendingUp,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Info,
  Check,
  AlertCircle,
  Zap,
  Eye,
  Lock,
  Unlock,
  Search,
} from 'lucide-react';

/* ─── Types ────────────────────────────────────────────────────── */
interface AgentConfig {
  id: number;
  agent_name: string;
  config_key: string;
  config_value: string;
  config_type: 'number' | 'string' | 'boolean' | 'json';
  description: string;
  category: string;
  display_order: number;
  is_active: boolean;
}

interface AgentMeta {
  key: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  version: string;
}

/* ─── Agent Metadata ───────────────────────────────────────────── */
const AGENTS: AgentMeta[] = [
  {
    key: 'intake_agent',
    label: 'Intake Agent',
    icon: <Shield size={18} />,
    description:
      'Receives, normalizes, and classifies incoming invoice documents. Detects file quality, validates MIME types, and deduplicates by content hash.',
    version: 'v2.1',
  },
  {
    key: 'extraction_agent',
    label: 'Extraction Agent',
    icon: <Sparkles size={18} />,
    description:
      'Converts invoice documents into structured data using AI-powered OCR. Supports Claude, ChatGPT, and Gemini with automatic fallback.',
    version: 'v3.0',
  },
  {
    key: 'vendor_identity_agent',
    label: 'Vendor Identity Agent',
    icon: <Building2 size={18} />,
    description:
      'Matches invoice vendor to the vendor master using GSTIN, PAN, name fuzzy matching, and email domain analysis.',
    version: 'v1.4',
  },
  {
    key: 'duplicate_fraud_agent',
    label: 'Duplicate & Fraud Agent',
    icon: <AlertTriangle size={18} />,
    description:
      'Detects exact and fuzzy duplicate invoices, content hash matches, and suspicious patterns to prevent double payments.',
    version: 'v2.2',
  },
  {
    key: 'match_agent',
    label: 'Match Agent',
    icon: <GitBranch size={18} />,
    description:
      'Validates invoices against purchase orders using 2-way PO match, fuzzy matching, and recurring pattern detection.',
    version: 'v1.7',
  },
  {
    key: 'tax_compliance_agent',
    label: 'Tax & Compliance Agent',
    icon: <Calculator size={18} />,
    description:
      'Validates GST arithmetic, state code logic (CGST/SGST vs IGST), GSTIN format, tax rate consistency, and TDS applicability.',
    version: 'v2.0',
  },
  {
    key: 'coding_agent',
    label: 'Coding Agent',
    icon: <Code size={18} />,
    description:
      'Suggests GL codes, cost centers, and profit centers using PO history, vendor patterns, and keyword-based description matching.',
    version: 'v1.3',
  },
  {
    key: 'workflow_routing_agent',
    label: 'Workflow Routing Agent',
    icon: <TrendingUp size={18} />,
    description:
      'Determines invoice processing lane (Green/Amber/Red) based on composite confidence scores and configurable thresholds.',
    version: 'v2.5',
  },
];

const API_BASE = `${import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || ''}/api/ap/agent-config`;

/* ─── Component ────────────────────────────────────────────────── */
export function AgentConfigEngine() {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<AgentConfig[]>([]);
  const [originalConfigs, setOriginalConfigs] = useState<AgentConfig[]>([]);
  const [modifiedIds, setModifiedIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [activeAgent, setActiveAgent] = useState(AGENTS[0].key);
  const [expandedJson, setExpandedJson] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  /* ── Fetch configs ──────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(API_BASE);
        const json = await res.json();
        if (json.success) {
          setConfigs(json.data);
          setOriginalConfigs(JSON.parse(JSON.stringify(json.data)));
        }
      } catch (e) {
        console.error('Failed to load agent configs', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── Sidebar scroll-to ──────────────────────────────────────── */
  const scrollToAgent = useCallback((agentKey: string) => {
    setActiveAgent(agentKey);
    const el = sectionRefs.current[agentKey];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  /* ── Track scroll position to highlight active sidebar item ── */
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      for (const agent of AGENTS) {
        const el = sectionRefs.current[agent.key];
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 180 && rect.bottom > 180) {
            setActiveAgent(agent.key);
            break;
          }
        }
      }
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [configs]);

  /* ── Update a config value ──────────────────────────────────── */
  const updateConfig = (id: number, newValue: string) => {
    setConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, config_value: newValue } : c)));
    const original = originalConfigs.find((c) => c.id === id);
    if (original && original.config_value !== newValue) {
      setModifiedIds((prev) => new Set(prev).add(id));
    } else {
      setModifiedIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
    // Clear saved state for this id
    setSavedIds((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
  };

  /* ── Save all changes ───────────────────────────────────────── */
  const saveAll = async () => {
    if (modifiedIds.size === 0) return;
    setSaving(true);
    try {
      const promises = Array.from(modifiedIds).map((id) => {
        const cfg = configs.find((c) => c.id === id);
        if (!cfg) return Promise.resolve();
        return fetch(API_BASE, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: cfg.id, config_value: cfg.config_value }),
        });
      });
      await Promise.all(promises);
      setSavedIds(new Set(modifiedIds));
      setOriginalConfigs(JSON.parse(JSON.stringify(configs)));
      setModifiedIds(new Set());
      setTimeout(() => setSavedIds(new Set()), 2000);
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setSaving(false);
    }
  };

  /* ── Reset to defaults (revert unsaved) ─────────────────────── */
  const resetToDefaults = () => {
    setConfigs(JSON.parse(JSON.stringify(originalConfigs)));
    setModifiedIds(new Set());
  };

  /* ── Group configs by agent then category ───────────────────── */
  const getAgentConfigs = (agentKey: string) => {
    let agentCfgs = configs
      .filter((c) => c.agent_name === agentKey)
      .sort((a, b) => a.display_order - b.display_order);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      agentCfgs = agentCfgs.filter(
        (c) =>
          c.config_key.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
      );
    }
    const grouped: Record<string, AgentConfig[]> = {};
    agentCfgs.forEach((c) => {
      if (!grouped[c.category]) grouped[c.category] = [];
      grouped[c.category].push(c);
    });
    return grouped;
  };

  /* ── JSON helpers ───────────────────────────────────────────── */
  const getJsonKeyCount = (val: string): number => {
    try {
      return Object.keys(JSON.parse(val)).length;
    } catch {
      return 0;
    }
  };

  const formatJson = (val: string): string => {
    try {
      return JSON.stringify(JSON.parse(val), null, 2);
    } catch {
      return val;
    }
  };

  /* ── Determine if a number config is a 0-1 threshold ────────── */
  const isThreshold = (key: string, val: string): boolean => {
    const n = parseFloat(val);
    return (
      !isNaN(n) &&
      n >= 0 &&
      n <= 1 &&
      (key.includes('threshold') ||
        key.includes('confidence') ||
        key.includes('score') ||
        key.includes('similarity'))
    );
  };

  const isPercentage = (key: string): boolean => {
    return key.includes('percent') || key.includes('weight') || key.includes('rate');
  };

  /* ─── Render Functions ───────────────────────────────────────── */

  const renderNumberInput = (cfg: AgentConfig) => {
    const val = cfg.config_value;
    const numVal = parseFloat(val);
    const modified = modifiedIds.has(cfg.id);
    const saved = savedIds.has(cfg.id);
    const showSlider = isThreshold(cfg.config_key, val);
    const showPercent = isPercentage(cfg.config_key);

    return (
      <div
        style={{
          padding: '16px 20px',
          borderLeft: modified
            ? '3px solid var(--color-warning)'
            : saved
              ? '3px solid var(--color-success)'
              : '3px solid transparent',
          background: saved ? 'var(--color-success-light)' : 'var(--background)',
          borderRadius: 8,
          transition: 'all 0.3s ease',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)' }}>
                {cfg.config_key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </span>
              {modified && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    background: 'var(--color-warning-light)',
                    color: 'var(--color-warning-dark)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  unsaved
                </span>
              )}
              {saved && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    background: 'var(--color-success-light)',
                    color: 'var(--color-success-dark)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <Check size={10} /> saved
                </span>
              )}
            </div>
            <p
              style={{
                fontSize: 13,
                color: 'var(--color-mercury-grey)',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {cfg.description}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <input
              type="number"
              value={val}
              onChange={(e) => updateConfig(cfg.id, e.target.value)}
              step={showSlider ? 0.005 : 1}
              style={{
                width: 100,
                height: 36,
                padding: '0 10px',
                textAlign: 'right',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--color-ink)',
                border: modified
                  ? '1.5px solid var(--color-warning)'
                  : '1px solid var(--color-silver)',
                borderRadius: 6,
                outline: 'none',
                background: 'var(--background)',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-teal)';
                e.target.style.boxShadow = '0 0 0 3px var(--color-teal-light)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = modified
                  ? 'var(--color-warning)'
                  : 'var(--color-silver)';
                e.target.style.boxShadow = 'none';
              }}
            />
            {showPercent && (
              <span style={{ fontSize: 13, color: 'var(--color-mercury-grey)', fontWeight: 500 }}>
                %
              </span>
            )}
          </div>
        </div>
        {showSlider && (
          <div style={{ marginTop: 12, paddingRight: 120 }}>
            <div
              style={{
                position: 'relative',
                height: 6,
                background: 'var(--color-silver)',
                borderRadius: 3,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  borderRadius: 3,
                  width: `${Math.min(numVal * 100, 100)}%`,
                  background:
                    'linear-gradient(90deg, var(--color-error), var(--color-warning), var(--color-success))',
                  transition: 'width 0.2s',
                }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.005"
              value={numVal}
              onChange={(e) => updateConfig(cfg.id, e.target.value)}
              style={{
                width: '100%',
                marginTop: -4,
                height: 20,
                background: 'transparent',
                WebkitAppearance: 'none',
                cursor: 'pointer',
                position: 'relative',
              }}
            />
          </div>
        )}
      </div>
    );
  };

  const renderBooleanInput = (cfg: AgentConfig) => {
    const isOn = cfg.config_value === 'true';
    const modified = modifiedIds.has(cfg.id);
    const saved = savedIds.has(cfg.id);

    return (
      <div
        style={{
          padding: '16px 20px',
          borderLeft: modified
            ? '3px solid var(--color-warning)'
            : saved
              ? '3px solid var(--color-success)'
              : '3px solid transparent',
          background: saved ? 'var(--color-success-light)' : 'var(--background)',
          borderRadius: 8,
          transition: 'all 0.3s ease',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)' }}>
                {cfg.config_key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </span>
              {modified && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    background: 'var(--color-warning-light)',
                    color: 'var(--color-warning-dark)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  unsaved
                </span>
              )}
            </div>
            <p
              style={{
                fontSize: 13,
                color: 'var(--color-mercury-grey)',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {cfg.description}
            </p>
          </div>
          <button
            onClick={() => updateConfig(cfg.id, isOn ? 'false' : 'true')}
            style={{
              width: 48,
              height: 26,
              borderRadius: 13,
              border: 'none',
              cursor: 'pointer',
              background: isOn ? 'var(--color-teal)' : 'var(--switch-background)',
              position: 'relative',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: 3,
                left: isOn ? 25 : 3,
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }}
            />
          </button>
        </div>
      </div>
    );
  };

  const renderStringInput = (cfg: AgentConfig) => {
    const modified = modifiedIds.has(cfg.id);
    const saved = savedIds.has(cfg.id);

    return (
      <div
        style={{
          padding: '16px 20px',
          borderLeft: modified
            ? '3px solid var(--color-warning)'
            : saved
              ? '3px solid var(--color-success)'
              : '3px solid transparent',
          background: saved ? 'var(--color-success-light)' : 'var(--background)',
          borderRadius: 8,
          transition: 'all 0.3s ease',
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)' }}>
            {cfg.config_key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </span>
          {modified && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 9999,
                background: 'var(--color-warning-light)',
                color: 'var(--color-warning-dark)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              unsaved
            </span>
          )}
        </div>
        <p
          style={{
            fontSize: 13,
            color: 'var(--color-mercury-grey)',
            margin: '0 0 10px 0',
            lineHeight: 1.5,
          }}
        >
          {cfg.description}
        </p>
        <input
          className="px-input"
          value={cfg.config_value}
          onChange={(e) => updateConfig(cfg.id, e.target.value)}
          style={{
            borderColor: modified ? 'var(--color-warning)' : undefined,
            transition: 'border-color 0.2s',
          }}
        />
      </div>
    );
  };

  const renderJsonInput = (cfg: AgentConfig) => {
    const modified = modifiedIds.has(cfg.id);
    const saved = savedIds.has(cfg.id);
    const expanded = expandedJson.has(cfg.id);
    const keyCount = getJsonKeyCount(cfg.config_value);

    return (
      <div
        style={{
          padding: '16px 20px',
          borderLeft: modified
            ? '3px solid var(--color-warning)'
            : saved
              ? '3px solid var(--color-success)'
              : '3px solid transparent',
          background: saved ? 'var(--color-success-light)' : 'var(--background)',
          borderRadius: 8,
          transition: 'all 0.3s ease',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
          }}
          onClick={() => {
            setExpandedJson((prev) => {
              const s = new Set(prev);
              expanded ? s.delete(cfg.id) : s.add(cfg.id);
              return s;
            });
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {expanded ? (
              <ChevronDown size={16} style={{ color: 'var(--color-teal)' }} />
            ) : (
              <ChevronRight size={16} style={{ color: 'var(--color-mercury-grey)' }} />
            )}
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)' }}>
              {cfg.config_key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 9999,
                background: 'var(--color-teal-tint)',
                color: 'var(--color-teal-dark)',
              }}
            >
              {keyCount} mappings
            </span>
            {modified && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 9999,
                  background: 'var(--color-warning-light)',
                  color: 'var(--color-warning-dark)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                unsaved
              </span>
            )}
          </div>
          <Eye size={16} style={{ color: 'var(--color-mercury-grey)' }} />
        </div>
        <p
          style={{
            fontSize: 13,
            color: 'var(--color-mercury-grey)',
            margin: '6px 0 0 24px',
            lineHeight: 1.5,
          }}
        >
          {cfg.description}
        </p>
        {expanded && (
          <div style={{ marginTop: 12 }}>
            <textarea
              value={formatJson(cfg.config_value)}
              onChange={(e) => {
                try {
                  JSON.parse(e.target.value);
                  updateConfig(cfg.id, e.target.value);
                } catch {
                  updateConfig(cfg.id, e.target.value);
                }
              }}
              style={{
                width: '100%',
                minHeight: 200,
                padding: 14,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 12,
                lineHeight: 1.6,
                color: 'var(--color-ink)',
                background: 'var(--color-cloud)',
                border: '1px solid var(--color-silver)',
                borderRadius: 8,
                outline: 'none',
                resize: 'vertical',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-teal)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--color-silver)';
              }}
            />
          </div>
        )}
      </div>
    );
  };

  const renderConfigRow = (cfg: AgentConfig) => {
    switch (cfg.config_type) {
      case 'number':
        return renderNumberInput(cfg);
      case 'boolean':
        return renderBooleanInput(cfg);
      case 'string':
        return renderStringInput(cfg);
      case 'json':
        return renderJsonInput(cfg);
      default:
        return renderStringInput(cfg);
    }
  };

  /* ── Lane Thresholds Visualizer ─────────────────────────────── */
  const renderLaneVisualizer = () => {
    const routingConfigs = configs.filter((c) => c.agent_name === 'workflow_routing_agent');
    if (routingConfigs.length === 0) return null;

    const getVal = (key: string) => {
      const c = routingConfigs.find((r) => r.config_key === key);
      return c ? parseFloat(c.config_value) : 0;
    };

    const lanes = [
      {
        label: 'Header Extraction',
        amber: getVal('header_extraction_amber_threshold'),
        green: getVal('header_extraction_green_threshold'),
      },
      {
        label: 'Line Extraction',
        amber: getVal('line_extraction_amber_threshold'),
        green: getVal('line_extraction_green_threshold'),
      },
      {
        label: 'Vendor Match',
        amber: getVal('vendor_match_amber_threshold'),
        green: getVal('vendor_match_green_threshold'),
      },
      {
        label: 'Accounting Certainty',
        amber: getVal('accounting_certainty_amber_threshold'),
        green: getVal('accounting_certainty_green_threshold'),
      },
    ];

    const hasLaneData = lanes.some((l) => l.amber > 0 || l.green > 0);
    if (!hasLaneData) return null;

    const weights = [
      { label: 'Extraction', val: getVal('extraction_weight') || 25 },
      { label: 'Vendor', val: getVal('vendor_weight') || 20 },
      { label: 'Tax', val: getVal('tax_weight') || 20 },
      { label: 'Duplicate', val: getVal('duplicate_weight') || 15 },
      { label: 'Accounting', val: getVal('accounting_weight') || 10 },
      { label: 'Match', val: getVal('match_weight') || 10 },
    ];

    return (
      <div
        style={{
          background: 'var(--background)',
          border: '1px solid var(--color-silver)',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Zap size={18} style={{ color: 'var(--color-teal)' }} />
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-ink)' }}>
            Lane Thresholds
          </span>
        </div>

        {/* Color bar legend */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: 'flex',
              height: 8,
              borderRadius: 4,
              overflow: 'hidden',
              marginBottom: 8,
            }}
          >
            <div style={{ flex: 1, background: 'var(--color-error)' }} />
            <div style={{ flex: 1, background: 'var(--color-warning)' }} />
            <div style={{ flex: 1, background: 'var(--color-success)' }} />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <span style={{ color: 'var(--color-error-dark)', flex: 1 }}>Red</span>
            <span style={{ color: 'var(--color-warning-dark)', flex: 1, textAlign: 'center' }}>
              Amber
            </span>
            <span style={{ color: 'var(--color-success-dark)', flex: 1, textAlign: 'right' }}>
              Green
            </span>
          </div>
        </div>

        {/* Lane rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {lanes.map((lane) => (
            <div key={lane.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  width: 160,
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--color-ink)',
                  flexShrink: 0,
                }}
              >
                {lane.label}
              </span>
              <div
                style={{
                  flex: 1,
                  position: 'relative',
                  height: 28,
                  background: 'var(--color-cloud)',
                  borderRadius: 6,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${lane.amber * 100}%`,
                    background: 'var(--color-error)',
                    opacity: 0.2,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${lane.amber * 100}%`,
                    width: `${(lane.green - lane.amber) * 100}%`,
                    background: 'var(--color-warning)',
                    opacity: 0.2,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${lane.green * 100}%`,
                    right: 0,
                    background: 'var(--color-success)',
                    opacity: 0.2,
                  }}
                />
                {/* Amber marker */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${lane.amber * 100}%`,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: 'var(--color-warning-dark)',
                    transform: 'translateX(-1px)',
                  }}
                />
                {/* Green marker */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${lane.green * 100}%`,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: 'var(--color-success-dark)',
                    transform: 'translateX(-1px)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <span
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'var(--color-warning-light)',
                    color: 'var(--color-warning-dark)',
                  }}
                >
                  {lane.amber}
                </span>
                <span
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'var(--color-success-light)',
                    color: 'var(--color-success-dark)',
                  }}
                >
                  {lane.green}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Posting Readiness Weights */}
        <div
          style={{
            background: 'var(--color-cloud)',
            borderRadius: 8,
            padding: 16,
            border: '1px solid var(--color-fog)',
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--color-mercury-grey)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Posting Readiness Weights
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
            {weights.map((w) => (
              <div
                key={w.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  background: 'var(--background)',
                  borderRadius: 6,
                  border: '1px solid var(--color-silver)',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--color-mercury-grey)' }}>{w.label}:</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-teal-dark)',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  }}
                >
                  {w.val}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /* ── Agent Section ──────────────────────────────────────────── */
  const renderAgentSection = (agent: AgentMeta) => {
    const grouped = getAgentConfigs(agent.key);
    const categories = Object.keys(grouped);
    const agentConfigCount = configs.filter((c) => c.agent_name === agent.key).length;
    const agentModifiedCount = configs.filter(
      (c) => c.agent_name === agent.key && modifiedIds.has(c.id)
    ).length;

    if (searchQuery && categories.length === 0) return null;

    return (
      <div
        key={agent.key}
        ref={(el) => {
          sectionRefs.current[agent.key] = el;
        }}
        style={{ marginBottom: 40 }}
      >
        {/* Agent Header Card */}
        <div
          style={{
            background: 'var(--background)',
            border: '1px solid var(--color-silver)',
            borderRadius: 12,
            padding: 20,
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ display: 'flex', gap: 14, flex: 1 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: 'var(--color-teal-tint)',
                color: 'var(--color-teal)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {agent.icon}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
                  {agent.label}
                </h2>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    background: 'var(--color-cloud)',
                    color: 'var(--color-mercury-grey)',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  }}
                >
                  {agent.version}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    background: 'var(--color-success-light)',
                    color: 'var(--color-success-dark)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--color-success)',
                    }}
                  />
                  Active
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--color-mercury-grey)',
                  margin: 0,
                  lineHeight: 1.6,
                  maxWidth: 600,
                }}
              >
                {agent.description}
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-ink)' }}>
              {agentConfigCount}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--color-mercury-grey)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              configs
            </div>
            {agentModifiedCount > 0 && (
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--color-warning-dark)',
                  marginTop: 4,
                }}
              >
                {agentModifiedCount} changed
              </div>
            )}
          </div>
        </div>

        {/* Lane Visualizer for workflow routing */}
        {agent.key === 'workflow_routing_agent' && renderLaneVisualizer()}

        {/* Config Groups */}
        {categories.map((category) => (
          <div key={category} style={{ marginBottom: 20 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 12,
                padding: '0 4px',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--color-teal)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {category.replace(/_/g, ' ')}
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--color-silver)' }} />
              <span style={{ fontSize: 11, color: 'var(--color-slate)' }}>
                {grouped[category].length} {grouped[category].length === 1 ? 'setting' : 'settings'}
              </span>
            </div>
            <div
              style={{
                background: 'var(--color-cloud)',
                borderRadius: 10,
                padding: 8,
                border: '1px solid var(--color-fog)',
              }}
            >
              {grouped[category].map((cfg) => (
                <div key={cfg.id}>{renderConfigRow(cfg)}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  /* ─── Main Render ────────────────────────────────────────────── */
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--color-cloud)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: '3px solid var(--color-silver)',
              borderTopColor: 'var(--color-teal)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ fontSize: 14, color: 'var(--color-mercury-grey)' }}>
            Loading agent configurations...
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--color-cloud)',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--background)',
          borderBottom: '1px solid var(--color-silver)',
          padding: '16px 28px',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <button
              onClick={() => navigate('/invoices/ai-ingestion')}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: '1px solid var(--color-silver)',
                background: 'var(--background)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-mercury-grey)',
                transition: 'all 0.15s',
                marginTop: 2,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-teal)';
                e.currentTarget.style.color = 'var(--color-teal)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-silver)';
                e.currentTarget.style.color = 'var(--color-mercury-grey)';
              }}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                Agent Configuration Engine
              </h1>
              <p style={{ fontSize: 13, color: 'var(--color-mercury-grey)', margin: '4px 0 0 0' }}>
                Define rules, thresholds, and behavior for each AI agent in the invoice processing
                pipeline
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {modifiedIds.size > 0 && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--color-warning-dark)',
                  background: 'var(--color-warning-light)',
                  padding: '4px 12px',
                  borderRadius: 9999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <AlertCircle size={13} /> {modifiedIds.size} unsaved
              </span>
            )}
            <button
              className="btn-secondary"
              onClick={resetToDefaults}
              disabled={modifiedIds.size === 0}
            >
              <RotateCcw size={15} /> Reset to Defaults
            </button>
            <button
              className="btn-primary"
              onClick={saveAll}
              disabled={modifiedIds.size === 0 || saving}
            >
              <Save size={15} /> {saving ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ── Left Sidebar ───────────────────────────────────── */}
        <div
          style={{
            width: 220,
            flexShrink: 0,
            background: 'var(--background)',
            borderRight: '1px solid var(--color-silver)',
            padding: '16px 0',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {/* Search */}
          <div style={{ padding: '0 12px 12px' }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-slate)',
                }}
              />
              <input
                placeholder="Filter configs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: 34,
                  paddingLeft: 30,
                  paddingRight: 10,
                  fontSize: 12,
                  border: '1px solid var(--color-silver)',
                  borderRadius: 6,
                  background: 'var(--color-cloud)',
                  outline: 'none',
                  color: 'var(--color-ink)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {AGENTS.map((agent) => {
            const isActive = activeAgent === agent.key;
            const modCount = configs.filter(
              (c) => c.agent_name === agent.key && modifiedIds.has(c.id)
            ).length;

            return (
              <button
                key={agent.key}
                onClick={() => scrollToAgent(agent.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 16px',
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? 'var(--color-teal-tint)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--color-teal)' : '3px solid transparent',
                  transition: 'all 0.15s',
                  textAlign: 'left',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'var(--color-cloud)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span
                  style={{
                    color: isActive ? 'var(--color-teal)' : 'var(--color-mercury-grey)',
                    flexShrink: 0,
                    display: 'flex',
                  }}
                >
                  {agent.icon}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--color-teal-dark)' : 'var(--color-ink)',
                    lineHeight: 1.3,
                    flex: 1,
                  }}
                >
                  {agent.label}
                </span>
                {modCount > 0 && (
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      fontSize: 10,
                      fontWeight: 700,
                      background: 'var(--color-warning)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {modCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Main Content ───────────────────────────────────── */}
        <div
          ref={scrollContainerRef}
          style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 80px' }}
        >
          {configs.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 0',
                color: 'var(--color-mercury-grey)',
              }}
            >
              <AlertCircle size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p style={{ fontSize: 16, fontWeight: 500, margin: '0 0 4px' }}>
                No configurations found
              </p>
              <p style={{ fontSize: 13, margin: 0 }}>
                The agent configuration API returned no data.
              </p>
            </div>
          ) : (
            AGENTS.map((agent) => renderAgentSection(agent))
          )}
        </div>
      </div>
    </div>
  );
}
