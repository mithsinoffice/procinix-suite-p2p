import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mysqlApiRequest } from '../../lib/mysql/client';
import {
  Check,
  X,
  Save,
  ArrowRight,
  FileText,
  Database,
  Sparkles,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Send,
  Mail,
  Bell,
  Zap,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { FieldLogicStep } from './FieldLogicStep';
import { useMasterData } from '../../contexts/MasterDataContext';
import { MODULE_OPTIONS, FORM_OPTIONS } from './types';

/**
 * CREATE AGENT WIZARD
 * Multi-step wizard for creating agentic AI workflows
 */

type Step = 1 | 2 | 3 | 4;

interface FieldRule {
  field: string;
  dataType: string;
  rules: string[];
  customLogic: string;
}

export function AgentConfiguratorCreate() {
  const navigate = useNavigate();
  const { id: agentId } = useParams<{ id: string }>();
  const isEdit = Boolean(agentId);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [autoSaved, setAutoSaved] = useState(true);

  // Step 1 - Agent Identity
  const [agentName, setAgentName] = useState('');
  const [agentType, setAgentType] = useState('Validator');
  const [purpose, setPurpose] = useState('');
  const [targetAccuracy, setTargetAccuracy] = useState('95');
  const [fallbackAction, setFallbackAction] = useState('Route to human');
  const [applicationType, setApplicationType] = useState<'form' | 'master'>('form');
  const [module, setModule] = useState('');
  const [formName, setFormName] = useState('');
  const [entityScope, setEntityScope] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('');

  // Load agent data in edit mode
  useEffect(() => {
    if (!agentId) return;
    let cancelled = false;
    mysqlApiRequest<{ success: boolean; agent: any; rules: any[]; actions: any[] }>(
      `/agents/${agentId}`
    )
      .then((res) => {
        if (cancelled) return;
        const a = res.agent || res;
        if (!a || !a.name) {
          console.warn('Agent not found in DB, switching to create mode');
          savedIdRef.current = undefined;
          return;
        }
        if (a.name) setAgentName(a.name);
        if (a.type) setAgentType(a.type);
        if (a.purpose) setPurpose(a.purpose);
        if (a.target_accuracy != null) setTargetAccuracy(String(a.target_accuracy));
        if (a.fallback_action) setFallbackAction(a.fallback_action);
        if (a.application_on) setApplicationType(a.application_on === 'Master' ? 'master' : 'form');
        if (a.module) setModule(a.module);
        if (a.form_name) setFormName(a.form_name);
        if (a.entity_scope) setEntityScope(a.entity_scope);
        if (a.trigger_event) setTriggerEvent(a.trigger_event);
        savedIdRef.current = agentId;
      })
      .catch((err) => {
        console.warn('Failed to load agent, switching to create mode:', err);
        savedIdRef.current = undefined;
      });
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  // Auto-save: debounced 2s after any identity field change
  const savedIdRef = useRef<string | undefined>(undefined);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isLoadingRef = useRef(true);

  const doAutoSave = useCallback(async () => {
    if (isLoadingRef.current) return;
    if (!agentName.trim()) return;
    setAutoSaved(false);
    try {
      const payload = {
        name: agentName,
        type: agentType,
        purpose,
        target_accuracy: Number(targetAccuracy),
        fallback_action: fallbackAction,
        application_on: applicationType === 'master' ? 'Master' : 'Form',
        module,
        form_name: formName,
        entity_scope: entityScope,
        trigger_event: triggerEvent,
        status: 'Draft',
      };
      if (savedIdRef.current) {
        await mysqlApiRequest(`/agents/${savedIdRef.current}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        const res = await mysqlApiRequest<{ success: boolean; data?: { id: string }; id?: string }>(
          '/agents',
          { method: 'POST', body: JSON.stringify(payload) }
        );
        const newId = res.data?.id || res.id;
        if (newId) {
          savedIdRef.current = newId;
          navigate(`/agent-configurator/edit/${newId}`, { replace: true });
        }
      }
      setAutoSaved(true);
    } catch (err) {
      console.warn('Auto-save failed:', err);
    }
  }, [
    agentName,
    agentType,
    purpose,
    targetAccuracy,
    fallbackAction,
    applicationType,
    module,
    formName,
    entityScope,
    triggerEvent,
    navigate,
  ]);

  useEffect(() => {
    if (isLoadingRef.current) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(doAutoSave, 2000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [doAutoSave]);

  // Mark loading complete after initial hydration
  useEffect(() => {
    const t = setTimeout(() => {
      isLoadingRef.current = false;
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  // Live data from contexts
  const { entities } = useMasterData();
  const activeEntities = useMemo(
    () =>
      (
        entities as Array<{ id: string; name?: string; legalName?: string; isActive?: boolean }>
      ).filter((e) => e.isActive !== false),
    [entities]
  );
  const formOptions = useMemo(() => (module ? (FORM_OPTIONS[module] ?? []) : []), [module]);

  // Step 2 - Field Logic
  const [fieldRules, setFieldRules] = useState<FieldRule[]>([]);

  // Step 3 - Actions
  const [successActions, setSuccessActions] = useState<string[]>([]);
  const [failureActions, setFailureActions] = useState<string[]>([]);

  // Step 2 AI Panel state
  const [selectedFieldAI, setSelectedFieldAI] = useState<{ name: string; type: string } | null>(
    null
  );
  const [aiTab, setAiTab] = useState<'suggest' | 'generate' | 'review'>('suggest');
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiGeneratedRules, setAiGeneratedRules] = useState<any[]>([]);
  const [aiReview, setAiReview] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [externalRuleToAdd, setExternalRuleToAdd] = useState<{
    fieldName: string;
    rule: { type: string; config: string; severity: string };
  } | null>(null);
  const [fixedGaps, setFixedGaps] = useState<Set<number>>(new Set());

  // AI Panel API calls
  const fetchSuggestions = async (fieldName: string, fieldType: string) => {
    setAiLoading(true);
    setAiError('');
    setAiSuggestions([]);
    try {
      const res = await mysqlApiRequest<{ success: boolean; suggestions: any[] }>(
        '/agents/ai/suggest-rules',
        {
          method: 'POST',
          body: JSON.stringify({
            field_name: fieldName,
            field_type: fieldType,
            form_context: formName,
            module: module,
          }),
        }
      );
      setAiSuggestions(res.suggestions || []);
      if (!res.suggestions?.length) setAiError('No suggestions generated for this field.');
    } catch (err: any) {
      setAiError(err?.message || 'Failed to fetch suggestions');
    } finally {
      setAiLoading(false);
    }
  };

  const fetchGeneratedRules = async () => {
    if (!generatePrompt.trim() || !selectedFieldAI) return;
    setAiLoading(true);
    setAiError('');
    setAiGeneratedRules([]);
    try {
      const res = await mysqlApiRequest<{ success: boolean; suggestions: any[] }>(
        '/agents/ai/generate-rules',
        {
          method: 'POST',
          body: JSON.stringify({
            description: generatePrompt,
            field_name: selectedFieldAI.name,
            form_context: formName,
            module: module,
          }),
        }
      );
      setAiGeneratedRules(res.suggestions || []);
      if (!res.suggestions?.length)
        setAiError('No rules generated. Try a more specific description.');
    } catch (err: any) {
      setAiError(err?.message || 'Failed to generate rules');
    } finally {
      setAiLoading(false);
    }
  };

  const fetchReviewRules = async () => {
    setAiLoading(true);
    setAiError('');
    setAiReview(null);
    try {
      const res = await mysqlApiRequest<{ success: boolean; review: any }>(
        '/agents/ai/review-rules',
        {
          method: 'POST',
          body: JSON.stringify({
            rules: fieldRules,
            form_context: formName,
            module: module,
          }),
        }
      );
      setAiReview(res.review || null);
      if (!res.review) setAiError('No review data returned.');
    } catch (err: any) {
      setAiError(err?.message || 'Failed to review rules');
    } finally {
      setAiLoading(false);
    }
  };

  const steps = [
    { number: 1, label: 'Agent Identity', completed: currentStep > 1 },
    { number: 2, label: 'Field Logic', completed: currentStep > 2 },
    { number: 3, label: 'Actions', completed: currentStep > 3 },
    { number: 4, label: 'Test & Activate', completed: false },
  ];

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const renderStep1 = () => (
    <div className="flex-1 p-8 overflow-auto">
      <h2 className="text-2xl mb-6" style={{ color: '#0A0F14', fontWeight: '600' }}>
        Agent Identity
      </h2>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <label
            className="block mb-2"
            style={{
              color: '#6E7A82',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Agent Name *
          </label>
          <input
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="e.g., Invoice Auto-validator"
            className="w-full px-4 py-2.5 rounded-lg"
            style={{ border: '0.5px solid #E1E6EA', fontSize: '13px' }}
          />
        </div>
        <div>
          <label
            className="block mb-2"
            style={{
              color: '#6E7A82',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Agent Type *
          </label>
          <select
            value={agentType}
            onChange={(e) => setAgentType(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg"
            style={{ border: '0.5px solid #E1E6EA', fontSize: '13px' }}
          >
            <option>Validator</option>
            <option>Enricher</option>
            <option>Matcher</option>
            <option>Classifier</option>
          </select>
        </div>
      </div>

      <div className="mb-6">
        <label
          className="block mb-2"
          style={{
            color: '#6E7A82',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Purpose *
        </label>
        <textarea
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="Describe what this agent does..."
          rows={3}
          className="w-full px-4 py-2.5 rounded-lg"
          style={{ border: '0.5px solid #E1E6EA', fontSize: '13px', resize: 'none' }}
        />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <label
            className="block mb-2"
            style={{
              color: '#6E7A82',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Target Accuracy
          </label>
          <select
            value={targetAccuracy}
            onChange={(e) => setTargetAccuracy(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg"
            style={{ border: '0.5px solid #E1E6EA', fontSize: '13px' }}
          >
            <option>90%</option>
            <option>95%</option>
            <option>98%</option>
            <option>99%</option>
          </select>
        </div>
        <div>
          <label
            className="block mb-2"
            style={{
              color: '#6E7A82',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Fallback Action
          </label>
          <select
            value={fallbackAction}
            onChange={(e) => setFallbackAction(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg"
            style={{ border: '0.5px solid #E1E6EA', fontSize: '13px' }}
          >
            <option>Route to human</option>
            <option>Auto-reject</option>
            <option>Hold for review</option>
            <option>Escalate</option>
          </select>
        </div>
      </div>

      <div className="mb-6">
        <label
          className="block mb-3"
          style={{
            color: '#6E7A82',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Application On *
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div
            onClick={() => setApplicationType('form')}
            className="p-6 rounded-xl cursor-pointer transition-all"
            style={{
              border: `2px solid ${applicationType === 'form' ? '#00A9B7' : '#E1E6EA'}`,
              backgroundColor: applicationType === 'form' ? '#D6F7F9' : '#FFFFFF',
            }}
          >
            <FileText
              className="w-8 h-8 mb-3"
              style={{ color: applicationType === 'form' ? '#00A9B7' : '#6E7A82' }}
            />
            <div className="mb-1" style={{ color: '#0A0F14', fontWeight: '600', fontSize: '15px' }}>
              Form
            </div>
            <div style={{ color: '#6E7A82', fontSize: '13px' }}>Apply to transactional forms</div>
          </div>
          <div
            onClick={() => setApplicationType('master')}
            className="p-6 rounded-xl cursor-pointer transition-all"
            style={{
              border: `2px solid ${applicationType === 'master' ? '#00A9B7' : '#E1E6EA'}`,
              backgroundColor: applicationType === 'master' ? '#D6F7F9' : '#FFFFFF',
            }}
          >
            <Database
              className="w-8 h-8 mb-3"
              style={{ color: applicationType === 'master' ? '#00A9B7' : '#6E7A82' }}
            />
            <div className="mb-1" style={{ color: '#0A0F14', fontWeight: '600', fontSize: '15px' }}>
              Master
            </div>
            <div style={{ color: '#6E7A82', fontSize: '13px' }}>Apply to master data</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <label
            className="block mb-2"
            style={{
              color: '#6E7A82',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Module *
          </label>
          <select
            value={module}
            onChange={(e) => setModule(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg"
            style={{ border: '0.5px solid #E1E6EA', fontSize: '13px' }}
          >
            <option value="">Select module</option>
            {MODULE_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="block mb-2"
            style={{
              color: '#6E7A82',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Form Name *
          </label>
          <select
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg"
            style={{ border: '0.5px solid #E1E6EA', fontSize: '13px' }}
          >
            <option value="">Select form</option>
            {formOptions.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label
            className="block mb-2"
            style={{
              color: '#6E7A82',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Entity Scope
          </label>
          <select
            value={entityScope}
            onChange={(e) => setEntityScope(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg"
            style={{ border: '0.5px solid #E1E6EA', fontSize: '13px' }}
          >
            <option value="">All entities</option>
            {activeEntities.map((e) => (
              <option key={e.id} value={e.name || e.legalName || e.id}>
                {e.name || e.legalName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="block mb-2"
            style={{
              color: '#6E7A82',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Trigger Event
          </label>
          <select
            value={triggerEvent}
            onChange={(e) => setTriggerEvent(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg"
            style={{ border: '0.5px solid #E1E6EA', fontSize: '13px' }}
          >
            <option>On Submit</option>
            <option>On Save</option>
            <option>On Field Change</option>
            <option>Manual Trigger</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="flex-1 overflow-auto">
      <FieldLogicStep
        selectedModule={module}
        selectedForm={formName}
        onFieldSelect={(name, type) => {
          setSelectedFieldAI({ name, type });
          setAiTab('suggest');
          setAiError('');
          fetchSuggestions(name, type);
        }}
        externalRuleToAdd={externalRuleToAdd}
        onExternalRuleAdded={() => setExternalRuleToAdd(null)}
      />
    </div>
  );

  const renderStep3 = () => (
    <div className="flex-1 p-8 overflow-auto">
      <h2 className="text-2xl mb-6" style={{ color: '#0A0F14', fontWeight: '600' }}>
        Actions
      </h2>

      {/* On Success Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10B981' }} />
          <div style={{ width: '100%', height: '0.5px', backgroundColor: '#E1E6EA' }} />
          <span
            style={{
              color: '#10B981',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
            }}
          >
            On Success
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            {
              id: 'approve',
              icon: CheckCircle,
              title: 'Auto-approve',
              desc: 'Automatically approve the record',
              color: '#10B981',
            },
            {
              id: 'route',
              icon: Send,
              title: 'Route to next step',
              desc: 'Continue workflow',
              color: '#00A9B7',
            },
            {
              id: 'notify',
              icon: Bell,
              title: 'Send notification',
              desc: 'Notify stakeholders',
              color: '#F59E0B',
            },
            {
              id: 'log',
              icon: FileText,
              title: 'Log success',
              desc: 'Record in audit trail',
              color: '#6B7280',
            },
          ].map((action) => {
            const Icon = action.icon;
            const isSelected = successActions.includes(action.id);
            return (
              <div
                key={action.id}
                onClick={() => {
                  if (isSelected) {
                    setSuccessActions(successActions.filter((a) => a !== action.id));
                  } else {
                    setSuccessActions([...successActions, action.id]);
                  }
                }}
                className="p-5 rounded-xl cursor-pointer transition-all"
                style={{
                  border: `2px solid ${isSelected ? '#00A9B7' : '#E1E6EA'}`,
                  backgroundColor: isSelected ? '#D6F7F9' : '#FFFFFF',
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${action.color}20` }}
                >
                  <Icon className="w-5 h-5" style={{ color: action.color }} />
                </div>
                <div
                  className="mb-1"
                  style={{ color: '#0A0F14', fontWeight: '600', fontSize: '14px' }}
                >
                  {action.title}
                </div>
                <div style={{ color: '#6E7A82', fontSize: '12px' }}>{action.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* On Failure Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }} />
          <div style={{ width: '100%', height: '0.5px', backgroundColor: '#E1E6EA' }} />
          <span
            style={{
              color: '#EF4444',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
            }}
          >
            On Failure
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            {
              id: 'reject',
              icon: X,
              title: 'Auto-reject',
              desc: 'Reject the record',
              color: '#EF4444',
            },
            {
              id: 'escalate',
              icon: AlertCircle,
              title: 'Escalate',
              desc: 'Route to supervisor',
              color: '#F59E0B',
            },
          ].map((action) => {
            const Icon = action.icon;
            const isSelected = failureActions.includes(action.id);
            return (
              <div
                key={action.id}
                onClick={() => {
                  if (isSelected) {
                    setFailureActions(failureActions.filter((a) => a !== action.id));
                  } else {
                    setFailureActions([...failureActions, action.id]);
                  }
                }}
                className="p-5 rounded-xl cursor-pointer transition-all"
                style={{
                  border: `2px solid ${isSelected ? '#EF4444' : '#E1E6EA'}`,
                  backgroundColor: isSelected ? '#FEE2E2' : '#FFFFFF',
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${action.color}20` }}
                >
                  <Icon className="w-5 h-5" style={{ color: action.color }} />
                </div>
                <div
                  className="mb-1"
                  style={{ color: '#0A0F14', fontWeight: '600', fontSize: '14px' }}
                >
                  {action.title}
                </div>
                <div style={{ color: '#6E7A82', fontSize: '12px' }}>{action.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Execution Order */}
      <div className="bg-white rounded-xl p-6" style={{ border: '1px solid #E1E6EA' }}>
        <h3 className="mb-4" style={{ color: '#0A0F14', fontWeight: '600', fontSize: '15px' }}>
          Execution Order
        </h3>
        <div className="space-y-2">
          {[
            'Validate all fields',
            'Check business rules',
            'Execute success actions',
            'Log activity',
          ].map((step, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ backgroundColor: '#F6F9FC' }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                style={{ backgroundColor: '#00A9B7', color: '#FFFFFF', fontWeight: '600' }}
              >
                {idx + 1}
              </div>
              <span style={{ color: '#0A0F14', fontSize: '13px' }}>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="flex-1 p-8 overflow-auto">
      <h2 className="text-2xl mb-6" style={{ color: '#0A0F14', fontWeight: '600' }}>
        Test & Activate
      </h2>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6" style={{ color: '#10B981' }} />
            <span
              style={{
                color: '#6E7A82',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Overall Accuracy
            </span>
          </div>
          <div className="text-5xl mb-3" style={{ color: '#10B981', fontWeight: '700' }}>
            99.2%
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E1E6EA' }}>
            <div
              className="h-full rounded-full"
              style={{ width: '99.2%', backgroundColor: '#10B981' }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-6 h-6" style={{ color: '#00A9B7' }} />
            <span
              style={{
                color: '#6E7A82',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Touchless Rate
            </span>
          </div>
          <div className="text-5xl mb-3" style={{ color: '#00A9B7', fontWeight: '700' }}>
            85%
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E1E6EA' }}>
            <div
              className="h-full rounded-full"
              style={{ width: '85%', backgroundColor: '#00A9B7' }}
            />
          </div>
        </div>
      </div>

      {/* Test Results Table */}
      <div className="bg-white rounded-xl mb-8" style={{ border: '1px solid #E1E6EA' }}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid #E1E6EA' }}>
          <h3 style={{ color: '#0A0F14', fontWeight: '600', fontSize: '15px' }}>Test Results</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: '#F6F9FC', borderBottom: '0.5px solid #E1E6EA' }}>
              <th
                className="text-left px-6 py-3"
                style={{
                  color: '#6E7A82',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  fontWeight: '600',
                }}
              >
                Rule
              </th>
              <th
                className="text-left px-6 py-3"
                style={{
                  color: '#6E7A82',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  fontWeight: '600',
                }}
              >
                Field
              </th>
              <th
                className="text-center px-6 py-3"
                style={{
                  color: '#6E7A82',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  fontWeight: '600',
                }}
              >
                Pass
              </th>
              <th
                className="text-center px-6 py-3"
                style={{
                  color: '#6E7A82',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  fontWeight: '600',
                }}
              >
                Fail
              </th>
              <th
                className="text-center px-6 py-3"
                style={{
                  color: '#6E7A82',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  fontWeight: '600',
                }}
              >
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                rule: 'Required validation',
                field: 'Invoice Number',
                pass: 98,
                fail: 2,
                status: 'pass',
              },
              { rule: 'Format validation', field: 'GSTIN', pass: 95, fail: 5, status: 'pass' },
              { rule: 'Range check', field: 'Amount', pass: 100, fail: 0, status: 'pass' },
              {
                rule: 'Duplicate check',
                field: 'Invoice Number',
                pass: 97,
                fail: 3,
                status: 'warning',
              },
            ].map((result, idx) => (
              <tr key={idx} style={{ borderBottom: '0.5px solid #E1E6EA' }}>
                <td className="px-6 py-4" style={{ color: '#0A0F14', fontSize: '13px' }}>
                  {result.rule}
                </td>
                <td className="px-6 py-4" style={{ color: '#6E7A82', fontSize: '13px' }}>
                  {result.field}
                </td>
                <td
                  className="px-6 py-4 text-center"
                  style={{ color: '#10B981', fontSize: '13px', fontWeight: '600' }}
                >
                  {result.pass}
                </td>
                <td
                  className="px-6 py-4 text-center"
                  style={{ color: '#EF4444', fontSize: '13px', fontWeight: '600' }}
                >
                  {result.fail}
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className="px-3 py-1 rounded-full text-xs"
                    style={{
                      backgroundColor: result.status === 'pass' ? '#D1FAE5' : '#FEF3C7',
                      color: result.status === 'pass' ? '#065F46' : '#92400E',
                      fontWeight: '600',
                    }}
                  >
                    {result.status === 'pass' ? 'Passing' : 'Warning'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Activation Card */}
      <div
        className="bg-white rounded-xl p-8"
        style={{ border: '2px solid #10B981', backgroundColor: '#ECFDF5' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="mb-2" style={{ color: '#065F46', fontWeight: '700', fontSize: '18px' }}>
              Ready to activate
            </h3>
            <p style={{ color: '#047857', fontSize: '13px' }}>
              Your agent has passed all tests and is ready to go live
            </p>
          </div>
          <button
            className="px-8 py-3 rounded-lg text-white"
            style={{ backgroundColor: '#10B981', fontSize: '15px', fontWeight: '600' }}
            onClick={async () => {
              let id = savedIdRef.current;
              try {
                if (!agentName.trim()) {
                  window.alert('Please fill in the agent name first.');
                  return;
                }
                // Ensure agent exists in DB — create if not saved yet
                if (!id) {
                  const payload = {
                    name: agentName,
                    type: agentType,
                    purpose,
                    target_accuracy: Number(targetAccuracy),
                    fallback_action: fallbackAction,
                    application_on: applicationType === 'master' ? 'Master' : 'Form',
                    module,
                    form_name: formName,
                    entity_scope: entityScope,
                    trigger_event: triggerEvent,
                    status: 'Draft',
                  };
                  const res = await mysqlApiRequest<{
                    success: boolean;
                    data?: { id: string };
                    id?: string;
                  }>('/agents', { method: 'POST', body: JSON.stringify(payload) });
                  const newId = res.data?.id || res.id;
                  if (!newId) {
                    window.alert('Failed to save agent.');
                    return;
                  }
                  savedIdRef.current = newId;
                  id = newId;
                }
                // Try activate; if fails, create then retry
                try {
                  await mysqlApiRequest(`/agents/${id}/activate`, { method: 'POST' });
                } catch {
                  const payload = {
                    name: agentName,
                    type: agentType,
                    purpose,
                    target_accuracy: Number(targetAccuracy),
                    fallback_action: fallbackAction,
                    application_on: applicationType === 'master' ? 'Master' : 'Form',
                    module,
                    form_name: formName,
                    entity_scope: entityScope,
                    trigger_event: triggerEvent,
                    status: 'Draft',
                  };
                  const res = await mysqlApiRequest<{
                    success: boolean;
                    data?: { id: string };
                    id?: string;
                  }>('/agents', { method: 'POST', body: JSON.stringify(payload) });
                  const newId = res.data?.id || res.id;
                  if (!newId) {
                    window.alert('Failed to save agent.');
                    return;
                  }
                  savedIdRef.current = newId;
                  id = newId;
                  await mysqlApiRequest(`/agents/${id}/activate`, { method: 'POST' });
                }
                window.alert('Agent activated successfully!');
                navigate('/agent-configurator');
              } catch (err: any) {
                window.alert(err?.message || 'Activation failed.');
              }
            }}
          >
            Activate agent →
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: '#F6F9FC' }}>
      {/* Top bar: title + horizontal step indicator + progress bar */}
      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E1E6EA', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <button
              onClick={() => navigate('/agent-configurator')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9AA6AF',
                padding: 4,
              }}
            >
              <X size={18} />
            </button>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0A0F14', margin: 0 }}>
              {isEdit ? 'Edit Agent' : 'Create Agent'}
            </h2>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
            {steps.map((step, idx) => (
              <div key={step.number} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <button
                  onClick={() => setCurrentStep(step.number as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '6px 12px',
                    borderRadius: 8,
                    whiteSpace: 'nowrap',
                    backgroundColor: currentStep === step.number ? '#E0F7FA' : 'transparent',
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      flexShrink: 0,
                      backgroundColor: step.completed
                        ? '#10B981'
                        : currentStep === step.number
                          ? '#007D87'
                          : '#E1E6EA',
                      color: step.completed || currentStep === step.number ? '#FFFFFF' : '#9AA6AF',
                    }}
                  >
                    {step.completed ? <Check size={13} /> : step.number}
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: currentStep === step.number ? 600 : 400,
                      color:
                        currentStep === step.number
                          ? '#007D87'
                          : step.completed
                            ? '#10B981'
                            : '#9AA6AF',
                    }}
                  >
                    {step.label}
                  </span>
                </button>
                {idx < steps.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      backgroundColor: step.completed ? '#10B981' : '#E1E6EA',
                      margin: '0 4px',
                      minWidth: 16,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: autoSaved ? '#10B981' : '#E1E6EA',
              }}
            />
            <span style={{ fontSize: 11, color: '#9AA6AF' }}>Auto-saved</span>
          </div>
        </div>
        <div style={{ height: 3, backgroundColor: '#E1E6EA' }}>
          <div
            style={{
              height: '100%',
              width: `${(currentStep / 4) * 100}%`,
              backgroundColor: '#00A9B7',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Step Content */}
          <div className="flex-1 overflow-hidden flex">
            <div style={{ display: currentStep === 1 ? 'contents' : 'none' }}>{renderStep1()}</div>
            <div style={{ display: currentStep === 2 ? 'contents' : 'none' }}>{renderStep2()}</div>
            <div style={{ display: currentStep === 3 ? 'contents' : 'none' }}>{renderStep3()}</div>
            <div style={{ display: currentStep === 4 ? 'contents' : 'none' }}>{renderStep4()}</div>

            {/* Right Panel - AI Assistant (only on step 1) */}
            {currentStep === 1 && (
              <div
                className="bg-white p-6 overflow-auto"
                style={{ width: '320px', borderLeft: '0.5px solid #E1E6EA' }}
              >
                <div className="p-4 rounded-lg mb-6" style={{ backgroundColor: '#F0EDFF' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4A3BAF' }} />
                    <span style={{ color: '#4A3BAF', fontSize: '13px', fontWeight: '600' }}>
                      AI assistant
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: '#6E7A82' }}>
                    Get smart suggestions to build your agent faster
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    'Auto-fill common invoice validation rules',
                    'Suggest optimal accuracy threshold',
                    'Recommend fallback actions',
                  ].map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg"
                      style={{ border: '1px solid #C7B5F3' }}
                    >
                      <p className="text-xs mb-3" style={{ color: '#0A0F14' }}>
                        {suggestion}
                      </p>
                      <button
                        className="w-full px-3 py-1.5 rounded text-xs"
                        style={{ backgroundColor: '#4A3BAF', color: '#FFFFFF', fontWeight: '600' }}
                      >
                        Apply
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Right Panel - AI Logic Enhancer (step 2) */}
            {currentStep === 2 && (
              <div
                style={{
                  width: 320,
                  borderLeft: '1px solid #E1E6EA',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {/* Tab bar */}
                <div style={{ display: 'flex', borderBottom: '1px solid #E1E6EA', flexShrink: 0 }}>
                  {(['suggest', 'generate', 'review'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setAiTab(tab)}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        fontSize: 12,
                        fontWeight: aiTab === tab ? 700 : 400,
                        color: aiTab === tab ? '#007D87' : '#9AA6AF',
                        background: 'none',
                        border: 'none',
                        borderBottom: aiTab === tab ? '2px solid #007D87' : '2px solid transparent',
                        cursor: 'pointer',
                        textTransform: 'capitalize' as const,
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Selected field indicator */}
                {selectedFieldAI ? (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #E1E6EA',
                      backgroundColor: '#F0FDFA',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: '#9AA6AF',
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.5px',
                      }}
                    >
                      Suggestions for
                    </span>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0A0F14', marginTop: 2 }}>
                      {selectedFieldAI.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#6E7A82', marginTop: 1 }}>
                      Type: {selectedFieldAI.type}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: 24,
                      textAlign: 'center' as const,
                      color: '#9AA6AF',
                      fontSize: 13,
                    }}
                  >
                    <Sparkles
                      size={24}
                      style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }}
                    />
                    Click any field on the left to get AI-powered rule suggestions
                  </div>
                )}

                {/* Tab content - scrollable */}
                <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                  {/* Loading state */}
                  {aiLoading && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '16px 0',
                        justifyContent: 'center',
                      }}
                    >
                      <Loader2 size={16} className="animate-spin" style={{ color: '#007D87' }} />
                      <span style={{ color: '#007D87', fontSize: 12 }}>Processing...</span>
                    </div>
                  )}

                  {/* Error state */}
                  {aiError && !aiLoading && (
                    <div
                      style={{
                        padding: 12,
                        backgroundColor: '#FEF2F2',
                        borderRadius: 8,
                        marginBottom: 12,
                        border: '1px solid #FECACA',
                      }}
                    >
                      <span style={{ color: '#991B1B', fontSize: 12 }}>{aiError}</span>
                    </div>
                  )}

                  {/* SUGGEST TAB */}
                  {aiTab === 'suggest' && !aiLoading && (
                    <div>
                      {selectedFieldAI && aiSuggestions.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                          {aiSuggestions.map((s: any, idx: number) => (
                            <div
                              key={idx}
                              style={{
                                padding: 12,
                                borderRadius: 8,
                                border: '1px solid #E1E6EA',
                                backgroundColor: '#FAFBFC',
                              }}
                            >
                              <div
                                style={{
                                  color: '#0A0F14',
                                  fontWeight: 600,
                                  fontSize: 13,
                                  marginBottom: 4,
                                }}
                              >
                                {s.description || s.suggested?.ruleType || 'Rule suggestion'}
                              </div>
                              {s.suggested?.fieldName && (
                                <div style={{ color: '#6E7A82', fontSize: 11, marginBottom: 2 }}>
                                  Field: {s.suggested.fieldName}
                                </div>
                              )}
                              {s.suggested?.ruleType && (
                                <div style={{ color: '#6E7A82', fontSize: 11, marginBottom: 2 }}>
                                  Type: {s.suggested.ruleType}
                                </div>
                              )}
                              {s.suggested?.severity && (
                                <div style={{ color: '#6E7A82', fontSize: 11, marginBottom: 6 }}>
                                  Severity: {s.suggested.severity}
                                </div>
                              )}
                              {s.confidence != null && (
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    marginBottom: 8,
                                  }}
                                >
                                  <div
                                    style={{
                                      flex: 1,
                                      height: 4,
                                      borderRadius: 2,
                                      backgroundColor: '#E1E6EA',
                                    }}
                                  >
                                    <div
                                      style={{
                                        height: '100%',
                                        borderRadius: 2,
                                        backgroundColor: '#00A9B7',
                                        width: `${s.confidence * 100}%`,
                                      }}
                                    />
                                  </div>
                                  <span style={{ fontSize: 10, color: '#6E7A82' }}>
                                    {Math.round(s.confidence * 100)}%
                                  </span>
                                </div>
                              )}
                              <button
                                onClick={() => {
                                  setExternalRuleToAdd({
                                    fieldName: s.suggested?.fieldName || selectedFieldAI.name,
                                    rule: {
                                      type: s.suggested?.ruleType || 'Custom',
                                      config: s.description || s.suggested?.ruleType || '',
                                      severity:
                                        s.suggested?.severity === 'Error'
                                          ? 'Block'
                                          : s.suggested?.severity === 'Warning'
                                            ? 'Warning'
                                            : 'Info',
                                    },
                                  });
                                }}
                                style={{
                                  width: '100%',
                                  padding: '6px 0',
                                  borderRadius: 6,
                                  backgroundColor: '#007D87',
                                  color: '#FFFFFF',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                Apply Rule
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : !selectedFieldAI ? null : !aiError ? (
                        <div
                          style={{
                            color: '#9AA6AF',
                            fontSize: 12,
                            textAlign: 'center' as const,
                            padding: '16px 0',
                          }}
                        >
                          No suggestions yet. Select a field.
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* GENERATE TAB */}
                  {aiTab === 'generate' && !aiLoading && (
                    <div>
                      <textarea
                        placeholder={
                          selectedFieldAI
                            ? `Describe validation rules for "${selectedFieldAI.name}" in plain English...`
                            : 'Select a field first, then describe your rules...'
                        }
                        value={generatePrompt}
                        onChange={(e) => setGeneratePrompt(e.target.value)}
                        rows={4}
                        disabled={!selectedFieldAI}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1px solid #E1E6EA',
                          fontSize: 13,
                          resize: 'none' as const,
                          marginBottom: 10,
                          fontFamily: 'inherit',
                          boxSizing: 'border-box' as const,
                        }}
                      />
                      <button
                        onClick={fetchGeneratedRules}
                        disabled={!selectedFieldAI || !generatePrompt.trim()}
                        style={{
                          width: '100%',
                          padding: '10px 0',
                          borderRadius: 8,
                          backgroundColor:
                            !selectedFieldAI || !generatePrompt.trim() ? '#E1E6EA' : '#007D87',
                          color: !selectedFieldAI || !generatePrompt.trim() ? '#9AA6AF' : '#FFFFFF',
                          fontSize: 13,
                          fontWeight: 600,
                          border: 'none',
                          cursor:
                            !selectedFieldAI || !generatePrompt.trim() ? 'not-allowed' : 'pointer',
                          marginBottom: 16,
                        }}
                      >
                        <Sparkles
                          size={14}
                          style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }}
                        />
                        Generate Rules
                      </button>

                      {aiGeneratedRules.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                          {aiGeneratedRules.map((r: any, idx: number) => (
                            <div
                              key={idx}
                              style={{
                                padding: 12,
                                borderRadius: 8,
                                border: '1px solid #D1FAE5',
                                backgroundColor: '#F0FDF4',
                              }}
                            >
                              <div
                                style={{
                                  color: '#0A0F14',
                                  fontWeight: 600,
                                  fontSize: 13,
                                  marginBottom: 4,
                                }}
                              >
                                {r.description || r.suggested?.ruleType || 'Generated rule'}
                              </div>
                              {r.suggested?.ruleType && (
                                <div style={{ color: '#6E7A82', fontSize: 11, marginBottom: 6 }}>
                                  Type: {r.suggested.ruleType} | Severity:{' '}
                                  {r.suggested.severity || 'Error'}
                                </div>
                              )}
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  onClick={() => {
                                    setExternalRuleToAdd({
                                      fieldName:
                                        r.suggested?.fieldName || selectedFieldAI?.name || '',
                                      rule: {
                                        type: r.suggested?.ruleType || 'Custom',
                                        config: r.description || r.suggested?.ruleType || '',
                                        severity:
                                          r.suggested?.severity === 'Error'
                                            ? 'Block'
                                            : r.suggested?.severity === 'Warning'
                                              ? 'Warning'
                                              : 'Info',
                                      },
                                    });
                                    setAiGeneratedRules((prev) => prev.filter((_, i) => i !== idx));
                                  }}
                                  style={{
                                    flex: 1,
                                    padding: '6px 0',
                                    borderRadius: 6,
                                    backgroundColor: '#10B981',
                                    color: '#FFFFFF',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    border: 'none',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() =>
                                    setAiGeneratedRules((prev) => prev.filter((_, i) => i !== idx))
                                  }
                                  style={{
                                    flex: 1,
                                    padding: '6px 0',
                                    borderRadius: 6,
                                    backgroundColor: '#FFFFFF',
                                    color: '#EF4444',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    border: '1px solid #EF4444',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* REVIEW TAB */}
                  {aiTab === 'review' && !aiLoading && (
                    <div>
                      <button
                        onClick={fetchReviewRules}
                        style={{
                          width: '100%',
                          padding: '10px 0',
                          borderRadius: 8,
                          backgroundColor: '#007D87',
                          color: '#FFFFFF',
                          fontSize: 13,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          marginBottom: 16,
                        }}
                      >
                        Review All Rules
                      </button>

                      {aiReview && (
                        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
                          {/* Predicted Accuracy */}
                          <div
                            style={{
                              padding: 14,
                              borderRadius: 8,
                              backgroundColor: '#ECFDF5',
                              border: '1px solid #10B981',
                            }}
                          >
                            <div
                              style={{
                                color: '#065F46',
                                fontSize: 11,
                                textTransform: 'uppercase' as const,
                                letterSpacing: '0.5px',
                                marginBottom: 4,
                              }}
                            >
                              Predicted Accuracy
                            </div>
                            <div style={{ color: '#10B981', fontWeight: 700, fontSize: 28 }}>
                              {aiReview.predicted_accuracy ?? '--'}%
                            </div>
                          </div>

                          {/* Gaps */}
                          {aiReview.gaps && aiReview.gaps.length > 0 && (
                            <div>
                              <div
                                style={{
                                  color: '#6E7A82',
                                  fontSize: 11,
                                  textTransform: 'uppercase' as const,
                                  letterSpacing: '0.5px',
                                  marginBottom: 8,
                                  fontWeight: 600,
                                }}
                              >
                                Gaps Detected
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column' as const,
                                  gap: 8,
                                }}
                              >
                                {aiReview.gaps.map((gap: any, idx: number) => (
                                  <div
                                    key={idx}
                                    style={{
                                      padding: 10,
                                      borderRadius: 8,
                                      backgroundColor: '#FEF3C7',
                                      border: '1px solid #F59E0B',
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'start',
                                        gap: 6,
                                        marginBottom: 6,
                                      }}
                                    >
                                      <AlertTriangle
                                        size={14}
                                        style={{ color: '#F59E0B', flexShrink: 0, marginTop: 1 }}
                                      />
                                      <div style={{ flex: 1 }}>
                                        <div
                                          style={{
                                            color: '#92400E',
                                            fontWeight: 600,
                                            fontSize: 12,
                                          }}
                                        >
                                          {gap.field}: {gap.missing_rule}
                                        </div>
                                        <div style={{ color: '#92400E', fontSize: 11 }}>
                                          {gap.recommendation || gap.reason || ''}
                                        </div>
                                        {gap.severity && (
                                          <div
                                            style={{ color: '#78350F', fontSize: 10, marginTop: 2 }}
                                          >
                                            Severity: {gap.severity}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => {
                                        const fieldName = gap.field || gap.fieldName || '';
                                        if (!fieldName) {
                                          window.alert(
                                            'Cannot apply: no field specified in this gap. Please add the rule manually in Step 2 (Field Logic).'
                                          );
                                          return;
                                        }
                                        setExternalRuleToAdd({
                                          fieldName,
                                          rule: {
                                            type: 'Custom',
                                            config:
                                              gap.missing_rule ||
                                              gap.recommendation ||
                                              gap.description ||
                                              '',
                                            severity:
                                              gap.severity === 'High'
                                                ? 'Block'
                                                : gap.severity === 'Medium'
                                                  ? 'Warning'
                                                  : 'Info',
                                          },
                                        });
                                        setFixedGaps((prev) => new Set([...prev, idx]));
                                      }}
                                      disabled={fixedGaps.has(idx)}
                                      style={{
                                        width: '100%',
                                        padding: '5px 0',
                                        borderRadius: 6,
                                        backgroundColor: fixedGaps.has(idx) ? '#10B981' : '#F59E0B',
                                        color: '#FFFFFF',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        border: 'none',
                                        cursor: fixedGaps.has(idx) ? 'default' : 'pointer',
                                        opacity: fixedGaps.has(idx) ? 0.8 : 1,
                                      }}
                                    >
                                      {fixedGaps.has(idx) ? '✓ Rule Added to Step 2' : 'Fix Now'}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Recommendations */}
                          {aiReview.recommendations && aiReview.recommendations.length > 0 && (
                            <div>
                              <div
                                style={{
                                  color: '#6E7A82',
                                  fontSize: 11,
                                  textTransform: 'uppercase' as const,
                                  letterSpacing: '0.5px',
                                  marginBottom: 8,
                                  fontWeight: 600,
                                }}
                              >
                                Recommendations
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column' as const,
                                  gap: 4,
                                }}
                              >
                                {aiReview.recommendations.map((rec: string, idx: number) => (
                                  <div
                                    key={idx}
                                    style={{
                                      padding: '8px 10px',
                                      borderRadius: 6,
                                      backgroundColor: '#F0F9FF',
                                      border: '1px solid #BAE6FD',
                                      fontSize: 12,
                                      color: '#0C4A6E',
                                    }}
                                  >
                                    {rec}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Fraud Risks */}
                          {aiReview.fraud_risks && aiReview.fraud_risks.length > 0 && (
                            <div>
                              <div
                                style={{
                                  color: '#6E7A82',
                                  fontSize: 11,
                                  textTransform: 'uppercase' as const,
                                  letterSpacing: '0.5px',
                                  marginBottom: 8,
                                  fontWeight: 600,
                                }}
                              >
                                Fraud Risks
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column' as const,
                                  gap: 4,
                                }}
                              >
                                {aiReview.fraud_risks.map((risk: string, idx: number) => (
                                  <div
                                    key={idx}
                                    style={{
                                      padding: '8px 10px',
                                      borderRadius: 6,
                                      backgroundColor: '#FEF2F2',
                                      border: '1px solid #FECACA',
                                      fontSize: 12,
                                      color: '#991B1B',
                                    }}
                                  >
                                    {risk}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Footer - Sticky */}
          <div
            className="flex items-center justify-between px-8 py-4"
            style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E1E6EA' }}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/agent-configurator')}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: '#6E7A82' }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg text-sm"
                style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
                onClick={async () => {
                  try {
                    const payload = {
                      name: agentName,
                      type: agentType,
                      purpose,
                      target_accuracy: Number(targetAccuracy),
                      fallback_action: fallbackAction,
                      application_on: applicationType === 'master' ? 'Master' : 'Form',
                      module,
                      form_name: formName,
                      entity_scope: entityScope,
                      trigger_event: triggerEvent,
                      status: 'Draft',
                    };
                    if (isEdit && agentId) {
                      await mysqlApiRequest(`/agents/${agentId}`, {
                        method: 'PUT',
                        body: JSON.stringify(payload),
                      });
                    } else {
                      const res = await mysqlApiRequest<{
                        success: boolean;
                        data?: { id: string };
                        id?: string;
                      }>('/agents', { method: 'POST', body: JSON.stringify(payload) });
                      const newId = res.data?.id || res.id;
                      if (newId) {
                        savedIdRef.current = newId;
                        navigate(`/agent-configurator/edit/${newId}`, { replace: true });
                      }
                    }
                    setAutoSaved(true);
                  } catch (err) {
                    console.warn('Save failed:', err);
                  }
                }}
              >
                <Save className="w-4 h-4 inline mr-2" />
                Save Draft
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10B981' }} />
              <span className="text-xs" style={{ color: '#6E7A82' }}>
                Auto-saved
              </span>
            </div>

            <div className="flex items-center gap-3">
              {currentStep > 1 && (
                <button
                  onClick={handlePrevious}
                  className="px-6 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
                >
                  ← Previous
                </button>
              )}
              {currentStep < 4 && (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 rounded-lg text-white text-sm"
                  style={{ backgroundColor: '#007D87' }}
                >
                  Next: {steps[currentStep].label} →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentConfiguratorCreate;
