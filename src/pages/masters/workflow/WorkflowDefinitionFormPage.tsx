import { useEffect, useMemo, useReducer, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Trash2, Save, Send, Sparkles, Filter, GitBranch, AlertTriangle,
  ArrowLeft, Bell, Mail, MessageSquare, Clock, ChevronRight,
} from 'lucide-react'
import { http, HttpError } from '../../../lib/http'
import { MasterPageHeader } from '../../../components/masters/MasterFormLayout'
import { cn } from '../../../lib/utils'

// ── Types — mirror the server contract for WorkflowDefinition + Stage + Condition ──
type ApproverType = 'ROLE' | 'USER' | 'MANAGER_OF' | 'DEPT_HEAD'

interface FormStage {
  uid:              string           // client-only key; backend ignores
  order:            number
  name:             string
  approverType:     ApproverType
  approverRole:     string | null
  approverUserId:   string | null
  slaHours:         number
  autoApproveBelow: number | null    // per-stage gate — drives "gates step N" UX
  requiresComment:  boolean
  allowDelegation:  boolean
  onReject:         'RETURN_TO_DRAFT' | 'RETURN_TO_PREV_STAGE' | 'REQUEST_INFO'
}

interface FormCondition {
  uid:        string
  field:      string
  operator:   string
  value:      string
  logicGroup: 'AND' | 'OR'
}

interface FormState {
  code:        string
  name:        string
  module:      string
  description: string
  status:      'ACTIVE' | 'DRAFT'
  priority:    number
  isDefault:   boolean
  notifyBell:        boolean
  notifyEmail:       boolean
  requireRejectionRemarks: boolean
  slaEscalation:     boolean
  stages:     FormStage[]
  conditions: FormCondition[]
}

const MODULES: { value: string; label: string }[] = [
  { value: 'INVOICE',        label: 'Invoice'              },
  { value: 'PR',             label: 'Purchase request'     },
  { value: 'PO',             label: 'Purchase order'       },
  { value: 'GRN',            label: 'GRN'                  },
  { value: 'PAYMENT',        label: 'Payment'              },
  { value: 'PROVISION',      label: 'Provision'            },
  { value: 'VENDOR',         label: 'Vendor'               },
  { value: 'BUDGET',         label: 'Budget'               },
  { value: 'DEPARTMENT',     label: 'Department'           },
  { value: 'GL_CODE',        label: 'GL code'              },
  { value: 'COST_CENTRE',    label: 'Cost centre'          },
  { value: 'EMPLOYEE',       label: 'Employee'             },
  { value: 'DESIGNATION',    label: 'Designation'          },
  { value: 'LOCATION',       label: 'Location'             },
  { value: 'ITEM',           label: 'Item master'          },
  { value: 'VENDOR_CATEGORY',label: 'Vendor category'      },
  { value: 'FINANCIAL_YEAR', label: 'Financial year'       },
  { value: 'TAX_CODE',       label: 'Tax code'             },
  { value: 'TDS_SECTION',    label: 'TDS section'          },
  { value: 'ENTITY',         label: 'Entity'               },
  { value: 'USER',           label: 'User'                 },
  { value: 'CURRENCY',       label: 'Currency'             },
  { value: 'PROFIT_CENTRE',  label: 'Profit centre'        },
]

const ROLES = [
  'FINANCE_MANAGER', 'CFO', 'MD', 'CEO', 'TENANT_ADMIN', 'DEPT_HEAD',
  'AP_MANAGER', 'AP_CLERK', 'PROCUREMENT_HEAD', 'SUPER_ADMIN',
]

// Operator vocab shown on the condition picker. Maps to the engine's
// evaluateCondition op codes (GT/LT/EQ/etc.) — engine matches exactly.
const OPERATORS: { value: string; label: string }[] = [
  { value: 'GT',       label: 'is greater than' },
  { value: 'GTE',      label: 'is at least'     },
  { value: 'LT',       label: 'is less than'    },
  { value: 'LTE',      label: 'is at most'      },
  { value: 'EQ',       label: 'equals'          },
  { value: 'NOT_EQ',   label: 'does not equal'  },
  { value: 'IN',       label: 'is one of'       },
  { value: 'NOT_IN',   label: 'is not one of'   },
  { value: 'CONTAINS', label: 'contains'        },
]

// ── Reducer — single source of truth for the form ──
type Action =
  | { type: 'LOAD'; state: FormState }
  | { type: 'SET_FIELD'; field: keyof FormState; value: unknown }
  | { type: 'ADD_STAGE' }
  | { type: 'UPDATE_STAGE'; uid: string; patch: Partial<FormStage> }
  | { type: 'REMOVE_STAGE'; uid: string }
  | { type: 'ADD_CONDITION' }
  | { type: 'UPDATE_CONDITION'; uid: string; patch: Partial<FormCondition> }
  | { type: 'REMOVE_CONDITION'; uid: string }
  | { type: 'PREFILL_FROM_DRAFT'; draft: { name: string; description: string; stages: Omit<FormStage,'uid'>[]; conditions: Omit<FormCondition,'uid'>[] } }

function makeUid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const initialState: FormState = {
  code:        '',
  name:        '',
  module:      'INVOICE',
  description: '',
  status:      'DRAFT',
  priority:    10,
  isDefault:   false,
  notifyBell:  true,
  notifyEmail: false,
  requireRejectionRemarks: true,
  slaEscalation:           true,
  stages: [{
    uid: makeUid(), order: 1, name: 'Finance Manager Review',
    approverType: 'ROLE', approverRole: 'FINANCE_MANAGER', approverUserId: null,
    slaHours: 48, autoApproveBelow: null,
    requiresComment: false, allowDelegation: true, onReject: 'RETURN_TO_DRAFT',
  }],
  conditions: [],
}

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case 'LOAD':
      return action.state
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value }
    case 'ADD_STAGE': {
      const order = state.stages.length + 1
      return {
        ...state,
        stages: [...state.stages, {
          uid: makeUid(), order, name: `Stage ${order}`,
          approverType: 'ROLE', approverRole: 'FINANCE_MANAGER', approverUserId: null,
          slaHours: 48, autoApproveBelow: null,
          requiresComment: false, allowDelegation: true, onReject: 'RETURN_TO_DRAFT',
        }],
      }
    }
    case 'UPDATE_STAGE':
      return {
        ...state,
        stages: state.stages.map(s => s.uid === action.uid ? { ...s, ...action.patch } : s),
      }
    case 'REMOVE_STAGE': {
      const remaining = state.stages.filter(s => s.uid !== action.uid)
      // Renumber so order is contiguous after removal.
      return { ...state, stages: remaining.map((s, i) => ({ ...s, order: i + 1 })) }
    }
    case 'ADD_CONDITION':
      return {
        ...state,
        conditions: [...state.conditions, {
          uid: makeUid(), field: 'totalAmount', operator: 'GT', value: '0', logicGroup: 'AND',
        }],
      }
    case 'UPDATE_CONDITION':
      return {
        ...state,
        conditions: state.conditions.map(c => c.uid === action.uid ? { ...c, ...action.patch } : c),
      }
    case 'REMOVE_CONDITION':
      return { ...state, conditions: state.conditions.filter(c => c.uid !== action.uid) }
    case 'PREFILL_FROM_DRAFT':
      return {
        ...state,
        name:        state.name || action.draft.name,
        description: state.description || action.draft.description,
        stages:      action.draft.stages.map(s => ({ ...s, uid: makeUid(), approverUserId: null, autoApproveBelow: null })),
        conditions:  action.draft.conditions.map(c => ({ ...c, uid: makeUid() })),
      }
    default:
      return state
  }
}

// ── Page ──
export default function WorkflowDefinitionFormPage() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const isEdit   = !!id && id !== 'new'
  const qc       = useQueryClient()
  const [state, dispatch] = useReducer(reducer, initialState)
  const [tab, setTab]     = useState<'chain' | 'notifications' | 'review'>('chain')

  // Hydrate from server in edit mode.
  const { data: existing } = useQuery({
    queryKey: ['workflow-definition', id],
    enabled:  isEdit,
    queryFn:  () => http.get<{
      id: string; code: string; name: string; module: string; description?: string;
      status: string; priority: number; isDefault: boolean;
      stages: Array<{ id: string; order: number; name: string; approverType: string;
        approverRole: string | null; approverUserId: string | null; slaHours: number;
        autoApproveBelow: number | string | null;
        requiresComment: boolean; allowDelegation: boolean; onReject: string }>;
      conditions: Array<{ id: string; field: string; operator: string; value: string; logicGroup: string }>;
    }>(`/api/workflow/definitions/${id}`),
  })

  useEffect(() => {
    if (!existing) return
    dispatch({ type: 'LOAD', state: {
      code:        existing.code,
      name:        existing.name,
      module:      existing.module,
      description: existing.description ?? '',
      status:      (existing.status === 'ACTIVE' ? 'ACTIVE' : 'DRAFT'),
      priority:    existing.priority,
      isDefault:   existing.isDefault,
      // Notification flags aren't persisted on the WorkflowDefinition model yet —
      // surface them as UI-only with sensible defaults so the spec's tab still
      // renders. When the schema gains these fields they'll round-trip naturally.
      notifyBell:  true,
      notifyEmail: false,
      requireRejectionRemarks: true,
      slaEscalation:           true,
      stages: existing.stages.map(s => ({
        uid: makeUid(), order: s.order, name: s.name,
        approverType:     s.approverType as ApproverType,
        approverRole:     s.approverRole,
        approverUserId:   s.approverUserId,
        slaHours:         s.slaHours,
        autoApproveBelow: s.autoApproveBelow == null ? null : Number(s.autoApproveBelow),
        requiresComment:  s.requiresComment,
        allowDelegation:  s.allowDelegation,
        onReject:         s.onReject as FormStage['onReject'],
      })),
      conditions: existing.conditions.map(c => ({
        uid: makeUid(), field: c.field, operator: c.operator, value: c.value,
        logicGroup: (c.logicGroup === 'OR' ? 'OR' : 'AND'),
      })),
    } })
  }, [existing])

  // Field catalog for the condition builder — driven by the selected module.
  const { data: fields = [] } = useQuery({
    queryKey: ['workflow-fields', state.module],
    queryFn:  () => http.get<{ field: string; label: string; type: string }[]>(`/api/workflow/fields?module=${state.module}`),
  })

  // Save mutation
  const save = useMutation({
    mutationFn: async (overrideStatus?: 'ACTIVE' | 'DRAFT') => {
      const payload = {
        code:        state.code || autoGenerateCode(state.module, state.name),
        name:        state.name,
        module:      state.module,
        description: state.description || null,
        status:      overrideStatus ?? state.status,
        priority:    state.priority,
        isDefault:   state.isDefault,
        stages: state.stages.map(s => ({
          order: s.order, name: s.name,
          approverType:    s.approverType,
          approverRole:    s.approverRole,
          approverUserId:  s.approverUserId,
          slaHours:        s.slaHours,
          autoApproveBelow: s.autoApproveBelow,
          requiresComment: s.requiresComment,
          allowDelegation: s.allowDelegation,
          onReject:        s.onReject,
        })),
        conditions: state.conditions.map(c => ({
          field: c.field, operator: c.operator, value: c.value, logicGroup: c.logicGroup,
        })),
      }
      if (isEdit) return http.put(`/api/workflow/definitions/${id}`, payload)
      return http.post<{ id: string }>('/api/workflow/definitions', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflow-definitions'] })
      navigate('/workflow-engine')
    },
  })

  // AI assistant mutation
  const assistant = useMutation({
    mutationFn: (prompt: string) =>
      http.post<{ name: string; description: string;
        stages: Omit<FormStage,'uid'>[]; conditions: Omit<FormCondition,'uid'>[] }>(
        '/api/workflow/assistant', { prompt, module: state.module },
      ),
    onSuccess: (draft) => dispatch({ type: 'PREFILL_FROM_DRAFT', draft }),
  })

  // Validation — name + module + at least one stage with role assigned.
  const validation = useMemo(() => {
    const errors: string[] = []
    if (!state.name.trim())   errors.push('Workflow name is required')
    if (!state.module)        errors.push('Document type is required')
    if (state.stages.length === 0) errors.push('At least one step is required')
    state.stages.forEach((s, i) => {
      if (s.approverType === 'ROLE' && !s.approverRole) {
        errors.push(`Step ${i + 1}: role is required`)
      }
    })
    return errors
  }, [state])

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title={isEdit ? 'Edit workflow' : 'New workflow'}
        description="Define approval chain for this document type"
        backLabel="Workflow engine"
        backTo="/workflow-engine"
      />

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT panel — Basics + AI assistant (sticky, always visible). */}
        <aside className="w-[280px] flex-shrink-0 border-r border-border bg-muted/10 overflow-y-auto p-4 space-y-4">
          <SectionHeader letter="A" label="Basics" />
          <FormField label="Workflow name *">
            <input
              type="text"
              value={state.name}
              onChange={e => dispatch({ type: 'SET_FIELD', field: 'name', value: e.target.value })}
              placeholder="e.g. Invoice over ₹5L"
              className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs"
            />
          </FormField>
          <FormField label="Document type *">
            <select
              value={state.module}
              onChange={e => dispatch({ type: 'SET_FIELD', field: 'module', value: e.target.value })}
              className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs"
            >
              {MODULES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </FormField>
          <FormField label="Priority" hint="Higher value wins when multiple definitions match">
            <input
              type="number"
              value={state.priority}
              onChange={e => dispatch({ type: 'SET_FIELD', field: 'priority', value: Number(e.target.value) })}
              className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs text-right"
            />
          </FormField>
          <FormField label="Status">
            <div className="grid grid-cols-2 gap-1">
              {(['ACTIVE', 'DRAFT'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_FIELD', field: 'status', value: s })}
                  className={cn(
                    'rounded px-2 py-1.5 text-xs font-medium border',
                    state.status === s
                      ? s === 'ACTIVE'
                        ? 'bg-[#E1F5EE] text-[#0F6E56] border-[#1D9E75]'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-background text-muted-foreground border-input hover:bg-muted',
                  )}
                >
                  {s === 'ACTIVE' ? 'Active' : 'Draft'}
                </button>
              ))}
            </div>
          </FormField>
          <FormField label="Description">
            <textarea
              rows={3}
              value={state.description}
              onChange={e => dispatch({ type: 'SET_FIELD', field: 'description', value: e.target.value })}
              className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs"
            />
          </FormField>
          <FormField label="Default fallback?" hint="Used when no other definition matches">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={state.isDefault}
                onChange={e => dispatch({ type: 'SET_FIELD', field: 'isDefault', value: e.target.checked })}
              />
              Default for this module
            </label>
          </FormField>

          <AiAssistantCard
            onDraft={prompt => assistant.mutate(prompt)}
            isPending={assistant.isPending}
            error={assistant.error instanceof Error ? assistant.error.message : null}
          />
        </aside>

        {/* RIGHT panel — tabbed: Approval chain | Notifications | Review */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-border bg-background px-4">
            <div className="flex items-center gap-0.5">
              {([
                { id: 'chain' as const,         letter: 'B', label: 'Approval chain' },
                { id: 'notifications' as const, letter: 'C', label: 'Notifications'  },
                { id: 'review' as const,        letter: 'D', label: 'Review & save'  },
              ]).map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors',
                    tab === t.id
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span className="text-[10px] font-bold opacity-60">{t.letter}.</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 bg-muted/20">
            {tab === 'chain'         && <ApprovalChainTab state={state} dispatch={dispatch} fields={fields} />}
            {tab === 'notifications' && <NotificationsTab state={state} dispatch={dispatch} />}
            {tab === 'review'        && <ReviewTab state={state} validation={validation} />}
          </div>

          {/* Sticky save bar */}
          <div className="flex items-center justify-between border-t border-border bg-background px-4 py-2.5">
            <button
              type="button"
              onClick={() => navigate('/workflow-engine')}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to list
            </button>
            <div className="flex items-center gap-2">
              {validation.length > 0 && (
                <span className="text-[11px] text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {validation.length} issue{validation.length === 1 ? '' : 's'} to resolve
                </span>
              )}
              {save.isError && (
                <span className="text-[11px] text-red-700">
                  {save.error instanceof HttpError ? save.error.error.message : 'Save failed'}
                </span>
              )}
              <button
                type="button"
                onClick={() => save.mutate('DRAFT')}
                disabled={save.isPending || validation.length > 0}
                className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60"
              >
                <Save className="h-3 w-3" /> Save as draft
              </button>
              <button
                type="button"
                onClick={() => save.mutate('ACTIVE')}
                disabled={save.isPending || validation.length > 0}
                className="flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                <Send className="h-3 w-3" /> Save & activate
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Subcomponents ──

function SectionHeader({ letter, label }: { letter: string; label: string }) {
  return (
    <div className="flex items-center gap-2 pb-1 border-b border-border">
      <span className="text-[10px] font-bold text-teal-700">{letter}.</span>
      <h3 className="text-xs font-semibold uppercase tracking-wider">{label}</h3>
    </div>
  )
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  )
}

function AiAssistantCard({ onDraft, isPending, error }: {
  onDraft:   (prompt: string) => void
  isPending: boolean
  error:     string | null
}) {
  const [prompt, setPrompt] = useState('')
  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-teal-700" />
        <h3 className="text-xs font-semibold text-teal-900">AI assistant</h3>
      </div>
      <p className="text-[11px] text-teal-800">
        Describe your workflow in plain English. e.g. "Finance Manager then HOD if amount &gt; ₹5L then CFO"
      </p>
      <textarea
        rows={2}
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="Route to HOD then CFO if invoice over ₹5L"
        className="w-full rounded border border-teal-200 bg-white px-2 py-1.5 text-xs"
      />
      <button
        type="button"
        onClick={() => onDraft(prompt)}
        disabled={isPending || !prompt.trim()}
        className="flex w-full items-center justify-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? 'Drafting…' : 'Draft chain →'}
      </button>
      {error && <p className="text-[11px] text-red-700">{error}</p>}
    </div>
  )
}

function ApprovalChainTab({ state, dispatch, fields }: {
  state:    FormState
  dispatch: React.Dispatch<Action>
  fields:   { field: string; label: string; type: string }[]
}) {
  // Duplicate-approver detection — flag any two stages with the same
  // approverRole (the runtime resolver would collapse them anyway, so
  // surface it at design time).
  const dupRoles = useMemo(() => {
    const seen = new Map<string, number>()
    const dups = new Set<string>()
    for (const s of state.stages) {
      if (s.approverType !== 'ROLE' || !s.approverRole) continue
      const prev = seen.get(s.approverRole)
      if (prev != null) { dups.add(s.uid); seen.forEach((v, k) => { if (k === s.approverRole) dups.add(state.stages[v].uid) }) }
      else seen.set(s.approverRole, state.stages.findIndex(x => x.uid === s.uid))
    }
    return dups
  }, [state.stages])

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Conditions panel — note: in our engine these gate WHICH definition
          matches, not which step runs. autoApproveBelow on each stage
          handles per-step gating. */}
      {state.conditions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-amber-700" />
            <h3 className="text-xs font-semibold text-amber-900">Match conditions</h3>
            <span className="text-[10px] text-amber-700">— filter when this workflow applies</span>
          </div>
          {state.conditions.map((c, i) => (
            <ConditionCard
              key={c.uid}
              condition={c}
              fields={fields}
              isFirst={i === 0}
              onChange={patch => dispatch({ type: 'UPDATE_CONDITION', uid: c.uid, patch })}
              onRemove={() => dispatch({ type: 'REMOVE_CONDITION', uid: c.uid })}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => dispatch({ type: 'ADD_CONDITION' })}
        className="w-full flex items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/40 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-50"
      >
        <Plus className="h-3.5 w-3.5" /> Add match condition
      </button>

      {/* Steps */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <GitBranch className="h-3.5 w-3.5 text-teal-700" />
          <h3 className="text-xs font-semibold text-teal-900">Approval chain</h3>
        </div>
        {state.stages.map(s => (
          <StepCard
            key={s.uid}
            stage={s}
            duplicateFlag={dupRoles.has(s.uid)}
            canRemove={state.stages.length > 1}
            onChange={patch => dispatch({ type: 'UPDATE_STAGE', uid: s.uid, patch })}
            onRemove={() => dispatch({ type: 'REMOVE_STAGE', uid: s.uid })}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => dispatch({ type: 'ADD_STAGE' })}
        className="w-full flex items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-teal-300 bg-teal-50/40 px-3 py-2 text-xs font-medium text-teal-800 hover:bg-teal-50"
      >
        <Plus className="h-3.5 w-3.5" /> Add approval step
      </button>

      <LivePreviewStrip state={state} />
    </div>
  )
}

function StepCard({ stage, duplicateFlag, canRemove, onChange, onRemove }: {
  stage:         FormStage
  duplicateFlag: boolean
  canRemove:     boolean
  onChange:      (patch: Partial<FormStage>) => void
  onRemove:      () => void
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 border-l-[3px] border-l-teal-500 relative">
      <div className="flex items-start gap-3">
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-600 text-[11px] font-bold text-white">
          {stage.order}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <input
              type="text"
              value={stage.name}
              onChange={e => onChange({ name: e.target.value })}
              placeholder="Step name"
              className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs font-medium"
            />
            <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" /> {stage.slaHours}h SLA
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <select
              value={stage.approverRole ?? ''}
              onChange={e => onChange({ approverRole: e.target.value, approverType: 'ROLE' })}
              className="rounded border border-input bg-background px-2 py-1 text-xs"
            >
              <option value="">Select role…</option>
              {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>
            <input
              type="number"
              value={stage.slaHours}
              onChange={e => onChange({ slaHours: Number(e.target.value) })}
              placeholder="SLA hrs"
              className="rounded border border-input bg-background px-2 py-1 text-xs text-right"
            />
            <input
              type="number"
              value={stage.autoApproveBelow ?? ''}
              onChange={e => onChange({ autoApproveBelow: e.target.value ? Number(e.target.value) : null })}
              placeholder="Auto-approve <"
              title="Auto-approve this step when amount is below this value"
              className="rounded border border-input bg-background px-2 py-1 text-xs text-right"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={stage.allowDelegation}
                onChange={e => onChange({ allowDelegation: e.target.checked })}
              />
              Optional step
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={stage.requiresComment}
                onChange={e => onChange({ requiresComment: e.target.checked })}
              />
              Comments required
            </label>
            <span className="text-muted-foreground">
              On reject:
              <select
                value={stage.onReject}
                onChange={e => onChange({ onReject: e.target.value as FormStage['onReject'] })}
                className="ml-1 rounded border border-input bg-background px-1.5 py-0.5 text-[10px]"
              >
                <option value="RETURN_TO_DRAFT">Return to draft</option>
                <option value="RETURN_TO_PREV_STAGE">Return to previous</option>
                <option value="REQUEST_INFO">Request info</option>
              </select>
            </span>
          </div>

          {duplicateFlag && (
            <p className="flex items-center gap-1 text-[10px] text-amber-700">
              <AlertTriangle className="h-3 w-3" />
              Duplicate approver — runtime will merge these steps.
            </p>
          )}
          {stage.approverType === 'ROLE' && !stage.approverRole && (
            <p className="flex items-center gap-1 text-[10px] text-red-700">
              <AlertTriangle className="h-3 w-3" />
              Pick a role — the engine can't dispatch this step until you do.
            </p>
          )}
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            title="Remove step"
            className="rounded p-1 text-muted-foreground hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

function ConditionCard({ condition, fields, isFirst, onChange, onRemove }: {
  condition: FormCondition
  fields:    { field: string; label: string; type: string }[]
  isFirst:   boolean
  onChange:  (patch: Partial<FormCondition>) => void
  onRemove:  () => void
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 border-l-[3px] border-l-amber-500 relative">
      <div className="flex items-center gap-2 mb-2">
        {!isFirst && (
          <select
            value={condition.logicGroup}
            onChange={e => onChange({ logicGroup: e.target.value as 'AND' | 'OR' })}
            className="rounded border border-amber-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase"
          >
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </select>
        )}
        <Filter className="h-3.5 w-3.5 text-amber-700" />
        <span className="text-[11px] font-medium text-amber-900">Match condition</span>
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto rounded p-1 text-muted-foreground hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <select
          value={condition.field}
          onChange={e => onChange({ field: e.target.value })}
          className="rounded border border-input bg-background px-2 py-1 text-xs"
        >
          {fields.length === 0
            ? <option value={condition.field}>{condition.field}</option>
            : fields.map(f => <option key={f.field} value={f.field}>{f.label}</option>)}
        </select>
        <select
          value={condition.operator}
          onChange={e => onChange({ operator: e.target.value })}
          className="rounded border border-input bg-background px-2 py-1 text-xs"
        >
          {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input
          type="text"
          value={condition.value}
          onChange={e => onChange({ value: e.target.value })}
          placeholder="Value"
          className="rounded border border-input bg-background px-2 py-1 text-xs"
        />
      </div>
    </div>
  )
}

function LivePreviewStrip({ state }: { state: FormState }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2.5 border border-border">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Live preview</p>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="rounded-full bg-muted px-2 py-0.5">Submitted</span>
        {state.conditions.length > 0 && (
          <>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 border border-amber-200">
              if {state.conditions.length} cond{state.conditions.length === 1 ? '' : 's'}
            </span>
          </>
        )}
        {state.stages.map(s => (
          <span key={s.uid} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className="rounded-full bg-teal-100 text-teal-800 px-2 py-0.5 border border-teal-200">
              {s.approverRole ? s.approverRole.replace(/_/g, ' ') : `Step ${s.order}`}
              {s.autoApproveBelow ? ` (auto < ₹${s.autoApproveBelow.toLocaleString('en-IN')})` : ''}
            </span>
          </span>
        ))}
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
        <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 border border-emerald-200">Approved</span>
      </div>
    </div>
  )
}

function NotificationsTab({ state, dispatch }: { state: FormState; dispatch: React.Dispatch<Action> }) {
  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      <SectionHeader letter="C" label="Notifications" />
      <NotificationToggle
        icon={<Bell className="h-4 w-4 text-teal-700" />}
        title="Bell notification"
        description="Send an in-app bell notification on each pending step"
        value={state.notifyBell}
        onChange={v => dispatch({ type: 'SET_FIELD', field: 'notifyBell', value: v })}
      />
      <NotificationToggle
        icon={<Mail className="h-4 w-4 text-teal-700" />}
        title="Email notification"
        description="Email the approver when a step lands in their queue"
        value={state.notifyEmail}
        onChange={v => dispatch({ type: 'SET_FIELD', field: 'notifyEmail', value: v })}
      />
      <NotificationToggle
        icon={<MessageSquare className="h-4 w-4 text-teal-700" />}
        title="Rejection remarks required"
        description="Reject + return paths must include a comment"
        value={state.requireRejectionRemarks}
        onChange={v => dispatch({ type: 'SET_FIELD', field: 'requireRejectionRemarks', value: v })}
      />
      <NotificationToggle
        icon={<Clock className="h-4 w-4 text-teal-700" />}
        title="SLA escalation"
        description="Escalate to next role when stage SLA is breached"
        value={state.slaEscalation}
        onChange={v => dispatch({ type: 'SET_FIELD', field: 'slaEscalation', value: v })}
      />
      <p className="text-[11px] text-muted-foreground pt-2">
        Note: notification flags are UI-only until the WorkflowDefinition schema adopts these fields. Engine behaviour is unaffected.
      </p>
    </div>
  )
}

function NotificationToggle({ icon, title, description, value, onChange }: {
  icon:        React.ReactNode
  title:       string
  description: string
  value:       boolean
  onChange:    (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 cursor-pointer hover:bg-muted/30">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium">{title}</p>
          <input
            type="checkbox"
            checked={value}
            onChange={e => onChange(e.target.checked)}
            className="h-4 w-4"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
    </label>
  )
}

function ReviewTab({ state, validation }: { state: FormState; validation: string[] }) {
  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      <SectionHeader letter="D" label="Review & save" />
      <div className="rounded-lg border border-border bg-card p-4 space-y-2">
        <SummaryRow label="Name"        value={state.name || <em className="text-muted-foreground">untitled</em>} />
        <SummaryRow label="Document"    value={MODULES.find(m => m.value === state.module)?.label ?? state.module} />
        <SummaryRow label="Status"      value={state.status === 'ACTIVE' ? 'Active' : 'Draft'} />
        <SummaryRow label="Steps"       value={`${state.stages.length} step${state.stages.length === 1 ? '' : 's'}`} />
        <SummaryRow label="Conditions"  value={`${state.conditions.length} condition${state.conditions.length === 1 ? '' : 's'}`} />
        <SummaryRow label="Priority"    value={state.priority} />
        <SummaryRow label="Default?"    value={state.isDefault ? 'Yes — catch-all for module' : 'No'} />
      </div>

      <LivePreviewStrip state={state} />

      {validation.length === 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          ✓ Ready to save. Use the bottom bar to finalise.
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p className="font-medium mb-1">Resolve these before saving:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {validation.map(v => <li key={v}>{v}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

// Generate a deterministic code from module + name so the user doesn't
// have to think about it. Edited records keep their existing code.
function autoGenerateCode(module: string, name: string): string {
  const slug = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24)
  return `${module.slice(0, 4)}-${slug || 'WF'}-${Date.now().toString(36).slice(-4).toUpperCase()}`
}
