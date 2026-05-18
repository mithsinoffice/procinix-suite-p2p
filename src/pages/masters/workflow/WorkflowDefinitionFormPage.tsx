import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Trash2, ChevronUp, ChevronDown,
  Save, Zap, CheckCircle2, AlertCircle, GitBranch,
} from 'lucide-react'
import { http } from '../../../lib/http'
import {
  MasterPageHeader, FormInput, FormSelect, FormTextarea,
  FormField, FormSection,
} from '../../../components/masters/MasterFormLayout'

// ── Constants ────────────────────────────────────────────────────────────────

const MODULES = ['INVOICE', 'VENDOR', 'PAYMENT', 'PR', 'PO']

const CONDITION_FIELDS: Record<string, { value: string; label: string; type: 'number' | 'string' | 'boolean' | 'select' }[]> = {
  INVOICE: [
    { value: 'totalAmount',    label: 'Total Amount (₹)',  type: 'number'  },
    { value: 'entityId',       label: 'Entity',            type: 'select'  },
    { value: 'vendorType',     label: 'Vendor Type',       type: 'select'  },
    { value: 'currencyCode',   label: 'Currency',          type: 'select'  },
    { value: 'isPOInvoice',    label: 'Is PO Invoice',     type: 'boolean' },
    { value: 'isFirstInvoice', label: 'First Invoice',     type: 'boolean' },
    { value: 'channelType',    label: 'Channel Type',      type: 'select'  },
  ],
  VENDOR: [
    { value: 'vendorType',  label: 'Vendor Type', type: 'select' },
    { value: 'countryCode', label: 'Country',     type: 'select' },
  ],
  PAYMENT: [
    { value: 'totalAmount',  label: 'Batch Amount (₹)', type: 'number' },
    { value: 'currencyCode', label: 'Currency',         type: 'select' },
  ],
  PR: [
    { value: 'totalAmount',  label: 'PR Amount (₹)', type: 'number' },
    { value: 'departmentId', label: 'Department',    type: 'select' },
    { value: 'entityId',     label: 'Entity',        type: 'select' },
  ],
  PO: [
    { value: 'totalAmount',  label: 'PO Amount (₹)', type: 'number' },
    { value: 'entityId',     label: 'Entity',        type: 'select' },
  ],
}

const OPERATORS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  number: [
    { value: 'GT',      label: 'is greater than' },
    { value: 'GTE',     label: 'is at least'     },
    { value: 'LT',      label: 'is less than'    },
    { value: 'LTE',     label: 'is at most'      },
    { value: 'EQ',      label: 'equals'          },
    { value: 'BETWEEN', label: 'is between'      },
  ],
  string: [
    { value: 'EQ',       label: 'equals'        },
    { value: 'NOT_EQ',   label: 'does not equal' },
    { value: 'IN',       label: 'is one of'     },
    { value: 'NOT_IN',   label: 'is not one of' },
    { value: 'CONTAINS', label: 'contains'      },
  ],
  boolean: [
    { value: 'EQ', label: 'equals' },
  ],
  select: [
    { value: 'EQ',     label: 'equals'        },
    { value: 'IN',     label: 'is one of'     },
    { value: 'NOT_IN', label: 'is not one of' },
  ],
}

const APPROVER_ROLES = [
  'FINANCE_MANAGER', 'CFO', 'MD', 'CEO',
  'DEPT_HEAD', 'PROCUREMENT_HEAD', 'AP_MANAGER',
  'APPROVER_L1', 'APPROVER_L2', 'APPROVER_L3',
  'TENANT_ADMIN',
]

const APPROVER_TYPES = [
  { value: 'ROLE',       label: 'Role'           },
  { value: 'USER',       label: 'Specific user'  },
  { value: 'MANAGER_OF', label: 'Manager of'     },
  { value: 'DEPT_HEAD',  label: 'Dept head'      },
]

const ON_REJECT_OPTIONS = [
  { value: 'RETURN_TO_DRAFT',      label: 'Return to draft'     },
  { value: 'RETURN_TO_PREV_STAGE', label: 'Return to prev stage' },
  { value: 'REQUEST_INFO',         label: 'Request information' },
]

// ── Zod schema ────────────────────────────────────────────────────────────────

const conditionSchema = z.object({
  field:      z.string().min(1, 'Field required'),
  operator:   z.string().min(1, 'Operator required'),
  value:      z.string().min(1, 'Value required'),
  logicGroup: z.enum(['AND', 'OR']).default('AND'),
})

const stageSchema = z.object({
  order:            z.number(),
  name:             z.string().min(1, 'Stage name required'),
  approverType:     z.enum(['ROLE', 'USER', 'MANAGER_OF', 'DEPT_HEAD']).default('ROLE'),
  approverRole:     z.string().optional(),
  approverUserId:   z.string().optional(),
  slaHours:         z.number().optional(),
  escalateToRole:   z.string().optional(),
  autoApproveBelow: z.number().optional(),
  allowDelegation:  z.boolean().default(false),
  requiresComment:  z.boolean().default(false),
  onReject:         z.enum(['RETURN_TO_DRAFT', 'RETURN_TO_PREV_STAGE', 'REQUEST_INFO']).default('RETURN_TO_DRAFT'),
})

const defSchema = z.object({
  code:         z.string().min(1, 'Code is required'),
  name:         z.string().min(1, 'Name is required'),
  module:       z.string().min(1, 'Module is required'),
  description:  z.string().optional(),
  entityId:     z.string().optional(),
  departmentId: z.string().optional(),
  priority:     z.number().default(0),
  isDefault:    z.boolean().default(false),
  status:       z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
  conditions:   z.array(conditionSchema).default([]),
  stages:       z.array(stageSchema).default([]),
})

type DefForm = z.infer<typeof defSchema>

// ── Helper: generate a suggested code ────────────────────────────────────────

function suggestCode(module: string): string {
  const suffix = Date.now().toString(36).slice(-4).toUpperCase()
  return `WF-${module.slice(0, 3)}-${suffix}`
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WorkflowDefinitionFormPage() {
  const { id }   = useParams<{ id: string }>()
  const isEdit   = !!id
  const navigate = useNavigate()
  const qc       = useQueryClient()

  // Fetch existing definition when editing
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['workflow-definition', id],
    queryFn:  () => http.get<any>(`/api/workflow/definitions/${id}`),
    enabled:  isEdit,
    staleTime: 0,
  })

  // Fetch entities + departments for selects
  const { data: entities = [] }   = useQuery({
    queryKey: ['entities-list'],
    queryFn:  () => http.get<any[]>('/api/masters/entities?status=ACTIVE&take=200')
      .then(r => Array.isArray(r) ? r : (r as any).data ?? []),
    staleTime: 5 * 60_000,
  })
  const { data: departments = [] } = useQuery({
    queryKey: ['departments-list'],
    queryFn:  () => http.get<any[]>('/api/masters/departments?status=ACTIVE&take=200')
      .then(r => Array.isArray(r) ? r : (r as any).data ?? []),
    staleTime: 5 * 60_000,
  })

  const { register, control, handleSubmit, watch, reset, setValue, formState: { errors, isDirty } } =
    useForm<DefForm>({
      resolver:      zodResolver(defSchema),
      defaultValues: {
        code: '', name: '', module: 'INVOICE', description: '',
        priority: 0, isDefault: false, status: 'DRAFT',
        conditions: [], stages: [],
      },
    })

  // Populate form when editing
  useEffect(() => {
    if (existing) {
      reset({
        code:         existing.code,
        name:         existing.name,
        module:       existing.module,
        description:  existing.description ?? '',
        entityId:     existing.entityId    ?? '',
        departmentId: existing.departmentId ?? '',
        priority:     existing.priority    ?? 0,
        isDefault:    existing.isDefault   ?? false,
        status:       existing.status      ?? 'DRAFT',
        conditions:   (existing.conditions ?? []).map((c: any) => ({
          field:      c.field,
          operator:   c.operator,
          value:      c.value,
          logicGroup: c.logicGroup ?? 'AND',
        })),
        stages: (existing.stages ?? []).map((s: any) => ({
          order:            s.order,
          name:             s.name,
          approverType:     s.approverType     ?? 'ROLE',
          approverRole:     s.approverRole     ?? '',
          approverUserId:   s.approverUserId   ?? '',
          slaHours:         s.slaHours         ?? undefined,
          escalateToRole:   s.escalateToRole   ?? '',
          autoApproveBelow: s.autoApproveBelow != null ? Number(s.autoApproveBelow) : undefined,
          allowDelegation:  s.allowDelegation  ?? false,
          requiresComment:  s.requiresComment  ?? false,
          onReject:         s.onReject          ?? 'RETURN_TO_DRAFT',
        })),
      })
    }
  }, [existing, reset])

  const {
    fields: condFields,
    append: appendCond,
    remove: removeCond,
  } = useFieldArray({ control, name: 'conditions' })

  const {
    fields:  stageFields,
    append:  appendStage,
    remove:  removeStage,
    swap:    swapStage,
  } = useFieldArray({ control, name: 'stages' })

  const watchedModule     = watch('module')
  const watchedConditions = watch('conditions')
  const watchedStages     = watch('stages')
  const watchedPriority   = watch('priority')
  const watchedName       = watch('name')
  const watchedIsDefault  = watch('isDefault')

  const availableFields = CONDITION_FIELDS[watchedModule] ?? []

  // Mutations
  const save = useMutation({
    mutationFn: (data: DefForm & { status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' }) => {
      const body = {
        ...data,
        stages:     data.stages.map((s, i) => ({ ...s, order: i + 1 })),
        conditions: data.conditions,
      }
      if (isEdit) return http.put<any>(`/api/workflow/definitions/${id}`, body)
      return http.post<any>('/api/workflow/definitions', body)
    },
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ['workflow-definitions'] })
      if (!isEdit && res?.id) {
        navigate(`/masters/workflow-definitions/${res.id}`, { replace: true })
      } else {
        qc.invalidateQueries({ queryKey: ['workflow-definition', id] })
      }
      if (vars.status === 'ACTIVE') {
        qc.invalidateQueries({ queryKey: ['workflow-definitions'] })
      }
    },
  })

  function onSaveDraft(data: DefForm)   { save.mutate({ ...data, status: 'DRAFT'  }) }
  function onActivate(data: DefForm)    { save.mutate({ ...data, status: 'ACTIVE' }) }

  const handleSaveDraft = handleSubmit(onSaveDraft)
  const handleActivate  = handleSubmit(onActivate)

  if (isEdit && loadingExisting) {
    return (
      <div className="flex flex-col h-full">
        <MasterPageHeader title="Workflow Definition" description="Loading…" backLabel="Workflow" backTo="/workflow" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground text-sm">Loading definition…</div>
        </div>
      </div>
    )
  }

  // ── Condition field type lookup ───────────────────────────────────────────
  function getFieldMeta(fieldValue: string) {
    return availableFields.find(f => f.value === fieldValue) ?? { type: 'string' as const, label: fieldValue }
  }

  // ── Preview (Section D) ──────────────────────────────────────────────────
  function buildPreview(): string {
    const lines: string[] = []
    lines.push(`Module: ${watchedModule}`)

    if (watchedConditions.length > 0) {
      lines.push('\nApplies when:')
      watchedConditions.forEach((c, i) => {
        const fieldMeta = availableFields.find(f => f.value === c.field)
        const fieldLbl  = fieldMeta?.label ?? c.field
        const opLbl     = OPERATORS_BY_TYPE[fieldMeta?.type ?? 'string']
          ?.find(o => o.value === c.operator)?.label ?? c.operator
        const logic     = i < watchedConditions.length - 1 ? ` [${c.logicGroup}]` : ''
        lines.push(`  • ${fieldLbl} ${opLbl} ${c.value}${logic}`)
      })
    } else {
      lines.push('\nConditions: None (applies to all records in this module)')
    }

    if (watchedStages.length > 0) {
      lines.push('\nApproval chain:')
      watchedStages.forEach((s, i) => {
        const approver = s.approverType === 'ROLE'
          ? `${s.approverRole ?? '(role not set)'}`
          : s.approverType === 'USER'
          ? `User: ${s.approverUserId ?? '(user not set)'}`
          : s.approverType
        const sla    = s.slaHours   ? `, SLA ${s.slaHours}h` : ''
        const esc    = s.escalateToRole ? `, escalates to ${s.escalateToRole}` : ''
        const flags  = [
          s.requiresComment  && 'comment required',
          s.allowDelegation  && 'delegation allowed',
        ].filter(Boolean).join(', ')
        lines.push(`  Stage ${i + 1} → ${approver}${sla}${esc}${flags ? ` (${flags})` : ''}`)
      })
    } else {
      lines.push('\nApproval chain: No stages defined yet')
    }

    lines.push(`\nPriority: ${watchedPriority ?? 0} (higher = evaluated first)`)
    if (watchedIsDefault) lines.push('Fallback: Yes — used when no other definition matches')

    return lines.join('\n')
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title={isEdit ? (existing?.name ?? 'Edit Workflow') : 'New Workflow Definition'}
        description={isEdit ? `Code: ${existing?.code ?? ''}` : 'Design the approval stages, conditions and routing rules'}
        backLabel="Workflow"
        backTo="/workflow"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/masters/workflow-definitions')}
              className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={save.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {save.isPending ? 'Saving…' : 'Save Draft'}
            </button>
            <button
              onClick={handleActivate}
              disabled={save.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Zap className="h-3.5 w-3.5" />
              Activate
            </button>
          </div>
        }
      />

      {/* Save error banner */}
      {save.isError && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {(save.error as any)?.message ?? 'Save failed — please try again'}
        </div>
      )}
      {save.isSuccess && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
          Saved successfully
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6">

        {/* ── Section A — Identity ─────────────────────────────────────────── */}
        <FormSection title="A. Definition Identity">
          <FormField label="Code" required error={errors.code?.message}>
            <FormInput
              {...register('code')}
              placeholder="e.g. WF-INV-001"
            />
          </FormField>

          <FormField label="Name" required error={errors.name?.message}>
            <FormInput {...register('name')} placeholder="e.g. Invoice Approval — Mid-range" />
          </FormField>

          <FormField label="Module" required error={errors.module?.message}>
            <Controller
              control={control}
              name="module"
              render={({ field }) => (
                <FormSelect
                  {...field}
                  onChange={e => {
                    field.onChange(e)
                    // suggest code when module changes (only for new records)
                    if (!isEdit && !isDirty) {
                      setValue('code', suggestCode(e.target.value))
                    }
                  }}
                >
                  <option value="">Select module…</option>
                  {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                </FormSelect>
              )}
            />
          </FormField>

          <FormField label="Priority" hint="Higher number = evaluated first among definitions of the same module">
            <FormInput
              {...register('priority', { valueAsNumber: true })}
              type="number"
              min={0}
              placeholder="0"
            />
          </FormField>

          <FormField label="Entity" hint="Leave blank to apply to all entities">
            <Controller
              control={control}
              name="entityId"
              render={({ field }) => (
                <FormSelect {...field} value={field.value ?? ''}>
                  <option value="">All entities</option>
                  {entities.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.name ?? e.code ?? e.id}</option>
                  ))}
                </FormSelect>
              )}
            />
          </FormField>

          <FormField label="Department" hint="Leave blank to apply to all departments">
            <Controller
              control={control}
              name="departmentId"
              render={({ field }) => (
                <FormSelect {...field} value={field.value ?? ''}>
                  <option value="">All departments</option>
                  {departments.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name ?? d.code ?? d.id}</option>
                  ))}
                </FormSelect>
              )}
            />
          </FormField>

          <FormField label="Description" span>
            <FormTextarea
              {...register('description')}
              rows={2}
              placeholder="Describe when this workflow applies…"
            />
          </FormField>

          <div className="col-span-2 flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <Controller
                control={control}
                name="isDefault"
                render={({ field }) => (
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-4 w-4 rounded border border-input accent-primary"
                  />
                )}
              />
              <span className="text-sm font-medium">Default fallback</span>
              <span className="text-xs text-muted-foreground">— used when no other definition matches</span>
            </label>
          </div>
        </FormSection>

        {/* ── Section B — Conditions ───────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">B. Conditions</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                When does this workflow apply? Leave empty to match all records.
              </p>
            </div>
            <button
              type="button"
              onClick={() => appendCond({ field: availableFields[0]?.value ?? '', operator: 'GT', value: '', logicGroup: 'AND' })}
              disabled={availableFields.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-primary/50 px-3 py-1.5 text-xs text-primary hover:bg-primary/5 transition-colors disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" /> Add condition
            </button>
          </div>

          {availableFields.length === 0 && watchedModule && (
            <p className="text-xs text-amber-600 italic">
              No condition fields defined for module "{watchedModule}" yet.
            </p>
          )}

          {condFields.length === 0 && availableFields.length > 0 && (
            <p className="text-xs text-muted-foreground italic">
              No conditions — this workflow applies to all {watchedModule} records.
            </p>
          )}

          <div className="space-y-2">
            {condFields.map((cf, idx) => {
              const fieldVal  = watchedConditions[idx]?.field ?? ''
              const fieldMeta = getFieldMeta(fieldVal)
              const operators = OPERATORS_BY_TYPE[fieldMeta.type] ?? OPERATORS_BY_TYPE.string
              const op        = watchedConditions[idx]?.operator ?? ''
              const isBetween = op === 'BETWEEN'

              return (
                <div key={cf.id} className="flex items-center gap-2 flex-wrap rounded-lg border border-border bg-muted/20 p-2">
                  {/* Field */}
                  <Controller
                    control={control}
                    name={`conditions.${idx}.field`}
                    render={({ field }) => (
                      <FormSelect
                        {...field}
                        className="w-44 text-xs py-1.5"
                        onChange={e => {
                          field.onChange(e)
                          // reset operator when field changes
                          setValue(`conditions.${idx}.operator`, OPERATORS_BY_TYPE[getFieldMeta(e.target.value).type]?.[0]?.value ?? 'EQ')
                          setValue(`conditions.${idx}.value`, '')
                        }}
                      >
                        {availableFields.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </FormSelect>
                    )}
                  />

                  {/* Operator */}
                  <Controller
                    control={control}
                    name={`conditions.${idx}.operator`}
                    render={({ field }) => (
                      <FormSelect {...field} className="w-40 text-xs py-1.5">
                        {operators.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </FormSelect>
                    )}
                  />

                  {/* Value */}
                  {fieldMeta.type === 'boolean' ? (
                    <Controller
                      control={control}
                      name={`conditions.${idx}.value`}
                      render={({ field }) => (
                        <FormSelect {...field} className="w-24 text-xs py-1.5">
                          <option value="true">True</option>
                          <option value="false">False</option>
                        </FormSelect>
                      )}
                    />
                  ) : isBetween ? (
                    <div className="flex items-center gap-1">
                      <Controller
                        control={control}
                        name={`conditions.${idx}.value`}
                        render={({ field }) => {
                          const parts = (field.value ?? '').split(',')
                          return (
                            <>
                              <FormInput
                                type="number"
                                value={parts[0] ?? ''}
                                onChange={e => field.onChange(`${e.target.value},${parts[1] ?? ''}`)}
                                className="w-28 text-xs py-1.5"
                                placeholder="Min"
                              />
                              <span className="text-xs text-muted-foreground">and</span>
                              <FormInput
                                type="number"
                                value={parts[1] ?? ''}
                                onChange={e => field.onChange(`${parts[0] ?? ''},${e.target.value}`)}
                                className="w-28 text-xs py-1.5"
                                placeholder="Max"
                              />
                            </>
                          )
                        }}
                      />
                    </div>
                  ) : (
                    <FormInput
                      {...register(`conditions.${idx}.value`)}
                      type={fieldMeta.type === 'number' ? 'number' : 'text'}
                      className="w-36 text-xs py-1.5"
                      placeholder={
                        fieldMeta.type === 'number' ? '100000' :
                        op === 'IN' || op === 'NOT_IN' ? 'val1,val2…' : 'Value'
                      }
                    />
                  )}

                  {/* Logic */}
                  {idx < condFields.length - 1 && (
                    <Controller
                      control={control}
                      name={`conditions.${idx}.logicGroup`}
                      render={({ field }) => (
                        <FormSelect {...field} className="w-20 text-xs py-1.5">
                          <option value="AND">AND</option>
                          <option value="OR">OR</option>
                        </FormSelect>
                      )}
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => removeCond(idx)}
                    className="ml-auto rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>

          {/* Plain-English condition summary */}
          {condFields.length > 0 && (
            <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-xs text-muted-foreground italic">
              {watchedConditions
                .filter(c => c.field && c.value)
                .map((c, i) => {
                  const fMeta = getFieldMeta(c.field)
                  const opLbl = OPERATORS_BY_TYPE[fMeta.type]?.find(o => o.value === c.operator)?.label ?? c.operator
                  const logic = i < watchedConditions.length - 1 ? ` ${c.logicGroup}` : ''
                  return `${fMeta.label ?? c.field} ${opLbl} ${c.value}${logic}`
                })
                .join(' ')
              || 'Fill in all condition values to see summary'}
            </div>
          )}
        </div>

        {/* ── Section C — Approval Stages ──────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">C. Approval Stages</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Define who approves, in what order, and what happens on rejection.
              </p>
            </div>
            <button
              type="button"
              onClick={() => appendStage({
                order:            stageFields.length + 1,
                name:             `Stage ${stageFields.length + 1}`,
                approverType:     'ROLE',
                approverRole:     'APPROVER_L1',
                approverUserId:   '',
                slaHours:         24,
                escalateToRole:   '',
                allowDelegation:  false,
                requiresComment:  false,
                onReject:         'RETURN_TO_DRAFT',
              })}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-primary/50 px-3 py-1.5 text-xs text-primary hover:bg-primary/5 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add stage
            </button>
          </div>

          {stageFields.length === 0 && (
            <div className="rounded-lg border border-dashed border-border py-8 text-center">
              <GitBranch className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No stages defined — click "Add stage" to begin</p>
            </div>
          )}

          <div className="space-y-3">
            {stageFields.map((sf, idx) => {
              const approverType = watchedStages[idx]?.approverType ?? 'ROLE'
              return (
                <div key={sf.id} className="rounded-xl border border-border bg-background p-4 space-y-3">
                  {/* Stage header */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Stage {idx + 1}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => swapStage(idx, idx - 1)}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === stageFields.length - 1}
                        onClick={() => swapStage(idx, idx + 1)}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStage(idx)}
                        className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Stage fields — 2-col grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Stage name" required error={errors.stages?.[idx]?.name?.message} span>
                      <FormInput
                        {...register(`stages.${idx}.name`)}
                        placeholder="e.g. Finance Manager Approval"
                      />
                    </FormField>

                    <FormField label="Approver type">
                      <Controller
                        control={control}
                        name={`stages.${idx}.approverType`}
                        render={({ field }) => (
                          <FormSelect {...field}>
                            {APPROVER_TYPES.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </FormSelect>
                        )}
                      />
                    </FormField>

                    {approverType === 'USER' ? (
                      <FormField label="Approver user ID">
                        <FormInput
                          {...register(`stages.${idx}.approverUserId`)}
                          placeholder="e.g. user-cfo-001"
                        />
                      </FormField>
                    ) : (
                      <FormField label="Approver role">
                        <Controller
                          control={control}
                          name={`stages.${idx}.approverRole`}
                          render={({ field }) => (
                            <FormSelect {...field} value={field.value ?? ''}>
                              <option value="">Select role…</option>
                              {APPROVER_ROLES.map(r => (
                                <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                              ))}
                            </FormSelect>
                          )}
                        />
                      </FormField>
                    )}

                    <FormField label="SLA (hours)" hint="Time before escalation triggers">
                      <FormInput
                        {...register(`stages.${idx}.slaHours`, { valueAsNumber: true })}
                        type="number"
                        min={1}
                        placeholder="24"
                      />
                    </FormField>

                    <FormField label="Escalate to role" hint="Auto-assign after SLA breach">
                      <Controller
                        control={control}
                        name={`stages.${idx}.escalateToRole`}
                        render={({ field }) => (
                          <FormSelect {...field} value={field.value ?? ''}>
                            <option value="">No escalation</option>
                            {APPROVER_ROLES.map(r => (
                              <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                            ))}
                          </FormSelect>
                        )}
                      />
                    </FormField>

                    <FormField label="Auto-approve below (₹)" hint="Skip approval for amounts below this threshold">
                      <FormInput
                        {...register(`stages.${idx}.autoApproveBelow`, { setValueAs: v => v === '' ? undefined : Number(v) })}
                        type="number"
                        min={0}
                        placeholder="Leave blank to disable"
                      />
                    </FormField>

                    <FormField label="On rejection">
                      <Controller
                        control={control}
                        name={`stages.${idx}.onReject`}
                        render={({ field }) => (
                          <FormSelect {...field}>
                            {ON_REJECT_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </FormSelect>
                        )}
                      />
                    </FormField>

                    {/* Checkboxes row */}
                    <div className="col-span-2 flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Controller
                          control={control}
                          name={`stages.${idx}.requiresComment`}
                          render={({ field }) => (
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 rounded border border-input accent-primary"
                            />
                          )}
                        />
                        <span className="text-sm">Require comment</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Controller
                          control={control}
                          name={`stages.${idx}.allowDelegation`}
                          render={({ field }) => (
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 rounded border border-input accent-primary"
                            />
                          )}
                        />
                        <span className="text-sm">Allow delegation</span>
                      </label>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Section D — Preview ──────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <div>
            <h3 className="text-base font-semibold">D. Preview</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Plain-English summary of this workflow definition.
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 text-xs font-mono text-foreground whitespace-pre-wrap leading-relaxed">
            {watchedName && <div className="font-bold mb-1 font-sans text-sm">"{watchedName}"</div>}
            {buildPreview()}
          </div>
        </div>

      </div>
    </div>
  )
}
