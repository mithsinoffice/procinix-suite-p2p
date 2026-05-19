import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Send, AlertTriangle } from 'lucide-react'
import { http } from '../../../lib/http'
import {
  MasterPageHeader, FormInput, FormSelect, AutoCodeField,
} from '../../../components/masters/MasterFormLayout'
import { formatCurrency } from '../../../lib/utils/formatters'
import { cn } from '../../../lib/utils'

// ── Types ──

interface BudgetPeriod {
  periodLabel:     string
  periodStart:     string
  periodEnd:       string
  allocatedAmount: number
}

interface BudgetForm {
  name:                string
  financialYearId:     string
  entityId:            string
  departmentId?:       string
  glCodeId?:           string
  costCentreId?:       string
  profitCentreId?:     string
  periodType:          string
  budgetAmount:        number
  toleranceZonePct:    number
  hardBlock:           boolean
  exceptionWorkflowId?: string
  carryForward:        boolean
  carryForwardType?:   string
  status:              string
  periods:             BudgetPeriod[]
}

// ── Period generators ──

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function buildPeriods(periodType: string, budgetAmount: number, fyStart: Date): BudgetPeriod[] {
  if (periodType === 'ANNUAL') {
    const end = new Date(fyStart)
    end.setFullYear(end.getFullYear() + 1)
    end.setDate(end.getDate() - 1)
    return [{ periodLabel: 'Full Year', periodStart: fmtDate(fyStart), periodEnd: fmtDate(end), allocatedAmount: budgetAmount }]
  }
  if (periodType === 'QUARTERLY') {
    const labels = ['Q1 Apr-Jun', 'Q2 Jul-Sep', 'Q3 Oct-Dec', 'Q4 Jan-Mar']
    const perQ   = budgetAmount / 4
    return labels.map((label, i) => {
      const s = new Date(fyStart); s.setMonth(s.getMonth() + i * 3)
      const e = new Date(s);       e.setMonth(e.getMonth() + 3); e.setDate(e.getDate() - 1)
      return { periodLabel: label, periodStart: fmtDate(s), periodEnd: fmtDate(e), allocatedAmount: perQ }
    })
  }
  // MONTHLY
  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
  const perM   = budgetAmount / 12
  return months.map((label, i) => {
    const s = new Date(fyStart); s.setMonth(s.getMonth() + i)
    const e = new Date(s);       e.setMonth(e.getMonth() + 1); e.setDate(e.getDate() - 1)
    const year = s.getFullYear()
    return { periodLabel: `${label} ${year}`, periodStart: fmtDate(s), periodEnd: fmtDate(e), allocatedAmount: perM }
  })
}

// ── Sub ──

function SectionHeader({ letter, title, subtitle }: { letter: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-border pb-2 mb-4">
      <span className="text-sm font-bold text-primary">{letter}.</span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  )
}

function Field({ label, required, error, span, hint, children }: {
  label: string; required?: boolean; error?: string; span?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', span && 'col-span-2')}>
      <label className="text-sm font-medium">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ── Page ──

export default function BudgetFormPage() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const isEdit   = !!id
  const qc       = useQueryClient()

  // ── Lookups ──
  const { data: financialYears = [] } = useQuery({
    queryKey: ['fy-lookup'],
    queryFn:  () => http.get<any>('/api/masters/financial-years').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })
  const { data: entities = [] } = useQuery({
    queryKey: ['entities-lookup'],
    queryFn:  () => http.get<any>('/api/masters/entities').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })
  const { data: departments = [] } = useQuery({
    queryKey: ['departments-lookup'],
    queryFn:  () => http.get<any>('/api/masters/departments').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })
  const { data: glCodes = [] } = useQuery({
    queryKey: ['gl-codes-lookup'],
    queryFn:  () => http.get<any>('/api/masters/gl-codes').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })
  const { data: costCentres = [] } = useQuery({
    queryKey: ['cost-centres-lookup'],
    queryFn:  () => http.get<any>('/api/masters/cost-centres').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })
  const { data: profitCentres = [] } = useQuery({
    queryKey: ['profit-centres-lookup'],
    queryFn:  () => http.get<any>('/api/masters/profit-centres').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })
  const { data: workflows = [] } = useQuery({
    queryKey: ['workflow-definitions'],
    queryFn:  () => http.get<any>('/api/workflow/definitions').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])).catch(() => []),
    staleTime: 5 * 60_000,
  })

  const { data: existing, isLoading: loadingBudget } = useQuery({
    queryKey: ['budget', id],
    queryFn:  () => http.get<any>(`/api/budgets/${id}`),
    enabled:  isEdit,
    staleTime: 0,
  })

  // ── Form ──
  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<BudgetForm>({
      defaultValues: {
        periodType:       'ANNUAL',
        budgetAmount:     0,
        toleranceZonePct: 10,
        hardBlock:        true,
        carryForward:     false,
        status:           'DRAFT',
        periods:          [],
      },
    })

  const { fields, replace } = useFieldArray({ control, name: 'periods' })
  const periodType      = useWatch({ control, name: 'periodType' })
  const budgetAmount    = useWatch({ control, name: 'budgetAmount' })
  const financialYearId = useWatch({ control, name: 'financialYearId' })
  const carryForward    = useWatch({ control, name: 'carryForward' })
  const hardBlock       = useWatch({ control, name: 'hardBlock' })
  const periods         = useWatch({ control, name: 'periods' }) ?? []

  // Hydrate on edit
  useEffect(() => {
    if (existing) {
      reset({
        name:                existing.name,
        financialYearId:     existing.financialYearId,
        entityId:            existing.entityId,
        departmentId:        existing.departmentId ?? '',
        glCodeId:            existing.glCodeId ?? '',
        costCentreId:        existing.costCentreId ?? '',
        profitCentreId:      existing.profitCentreId ?? '',
        periodType:          existing.periodType,
        budgetAmount:        Number(existing.budgetAmount),
        toleranceZonePct:    Number(existing.toleranceZonePct),
        hardBlock:           !!existing.hardBlock,
        exceptionWorkflowId: existing.exceptionWorkflowId ?? '',
        carryForward:        !!existing.carryForward,
        carryForwardType:    existing.carryForwardType ?? '',
        status:              existing.status,
        periods: (existing.periods ?? []).map((p: any) => ({
          periodLabel:     p.periodLabel,
          periodStart:     String(p.periodStart).slice(0, 10),
          periodEnd:       String(p.periodEnd).slice(0, 10),
          allocatedAmount: Number(p.allocatedAmount),
        })),
      })
    }
  }, [existing, reset])

  // Auto-generate periods when periodType or budgetAmount changes
  useEffect(() => {
    if (isEdit && existing) return
    if (!financialYearId) return
    const fy = (financialYears as any[]).find(f => f.id === financialYearId)
    if (!fy?.startDate) return
    const newPeriods = buildPeriods(periodType, Number(budgetAmount) || 0, new Date(fy.startDate))
    replace(newPeriods)
  }, [periodType, budgetAmount, financialYearId])

  const periodSum    = periods.reduce((s, p) => s + (Number(p.allocatedAmount) || 0), 0)
  const periodValid  = Math.abs(periodSum - Number(budgetAmount || 0)) < 0.01
  const periodRemain = Number(budgetAmount || 0) - periodSum

  // ── Mutations ──
  const buildPayload = (data: BudgetForm) => ({
    ...data,
    budgetAmount:     Number(data.budgetAmount),
    toleranceZonePct: Number(data.toleranceZonePct),
    periods:          data.periods.map(p => ({ ...p, allocatedAmount: Number(p.allocatedAmount) })),
  })

  const saveDraft = useMutation({
    mutationFn: (data: BudgetForm) => {
      const payload = buildPayload({ ...data, status: 'DRAFT' })
      return isEdit ? http.put<any>(`/api/budgets/${id}`, payload) : http.post<any>('/api/budgets', payload)
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['budget-list'] })
      navigate(`/budgets/${res.id ?? id}`)
    },
  })

  // Submit-for-approval path: save the budget as DRAFT, then POST /submit so
  // the workflow engine kicks in. Replaces the old direct status='ACTIVE'
  // flip — budgets now require TENANT_ADMIN sign-off before going live.
  const submitForApproval = useMutation({
    mutationFn: async (data: BudgetForm) => {
      const payload = buildPayload({ ...data, status: 'DRAFT' })
      const saved = isEdit
        ? await http.put<{ id: string }>(`/api/budgets/${id}`, payload)
        : await http.post<{ id: string }>('/api/budgets', payload)
      await http.post(`/api/budgets/${saved.id}/submit`, {})
      return saved
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['budget-list'] })
      navigate(`/budgets/${res.id ?? id}`)
    },
  })

  if (isEdit && loadingBudget) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  }

  const isPending = saveDraft.isPending || submitForApproval.isPending

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title={isEdit ? `Edit ${existing?.budgetRef ?? 'Budget'}` : 'New Budget'}
        description="Multi-period budget allocation with utilisation tracking"
        backLabel="Budget"
        backTo="/budgets"
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate('/budgets')}
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted">Cancel</button>
            <button type="button" disabled={isPending}
              onClick={handleSubmit(d => saveDraft.mutate(d))}
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60">
              {saveDraft.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" />}
              Save draft
            </button>
            <button type="button" disabled={isPending || !periodValid}
              onClick={handleSubmit(d => submitForApproval.mutate(d))}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
              <Send className="h-3.5 w-3.5" />
              {submitForApproval.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin inline" />}
              Submit for approval
            </button>
          </div>
        }
      />

      {existing?.status === 'PENDING_APPROVAL' && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 sm:px-6 text-xs text-amber-800">
          Approval pending — current values remain active until approved.
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6">

          {/* A. Identity */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="A" title="Budget Identity" subtitle="Dimensions and amount" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Budget Ref">
                <AutoCodeField value={existing?.budgetRef} />
              </Field>
              <Field label="Name" required error={errors.name?.message}>
                <FormInput placeholder="FY26 Marketing OPEX" {...register('name', { required: 'Name is required' })} />
              </Field>
              <Field label="Financial Year" required error={errors.financialYearId?.message}>
                <FormSelect {...register('financialYearId', { required: 'FY is required' })}>
                  <option value="">Select…</option>
                  {(financialYears as any[]).map(f => <option key={f.id} value={f.id}>{f.code} ({f.name})</option>)}
                </FormSelect>
              </Field>
              <Field label="Entity" required error={errors.entityId?.message}>
                <FormSelect {...register('entityId', { required: 'Entity is required' })}>
                  <option value="">Select…</option>
                  {(entities as any[]).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </FormSelect>
              </Field>
              <Field label="Department">
                <FormSelect {...register('departmentId')}>
                  <option value="">—</option>
                  {(departments as any[]).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </FormSelect>
              </Field>
              <Field label="GL Code">
                <FormSelect {...register('glCodeId')}>
                  <option value="">—</option>
                  {(glCodes as any[]).map(g => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
                </FormSelect>
              </Field>
              <Field label="Cost Centre">
                <FormSelect {...register('costCentreId')}>
                  <option value="">—</option>
                  {(costCentres as any[]).map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                </FormSelect>
              </Field>
              <Field label="Profit Centre">
                <FormSelect {...register('profitCentreId')}>
                  <option value="">—</option>
                  {(profitCentres as any[]).map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </FormSelect>
              </Field>
              <Field label="Period Type" required span>
                <div className="flex items-center rounded-lg border border-input overflow-hidden w-fit">
                  {['ANNUAL', 'QUARTERLY', 'MONTHLY'].map(t => (
                    <button key={t} type="button" onClick={() => setValue('periodType', t)}
                      className={cn('px-4 py-1.5 text-xs font-medium transition-colors',
                        periodType === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Budget Amount (₹)" required>
                <FormInput type="number" step="0.01" min="0" placeholder="0.00"
                  {...register('budgetAmount', { required: true, valueAsNumber: true })} />
              </Field>
              <Field label="Tolerance Zone (%)" hint="PRs/POs within this % over budget show WARNING but are allowed">
                <FormInput type="number" step="0.01" min="0" max="100"
                  {...register('toleranceZonePct', { valueAsNumber: true })} />
              </Field>
              <Field label="Carry Forward">
                <label className="flex items-center gap-2 mt-2">
                  <input type="checkbox" {...register('carryForward')} className="h-4 w-4 rounded" />
                  <span className="text-sm text-muted-foreground">Carry unused balance to next FY</span>
                </label>
              </Field>
              {carryForward && (
                <Field label="Carry Forward Type">
                  <FormSelect {...register('carryForwardType')}>
                    <option value="">Select…</option>
                    {['FULL', 'PERCENTAGE', 'MANUAL_AMOUNT'].map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </FormSelect>
                </Field>
              )}
            </div>
          </div>

          {/* B. Period Allocation */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="B" title="Period Allocation"
              subtitle={periodType === 'ANNUAL' ? 'Single row covering the full year'
                : periodType === 'QUARTERLY' ? '4 quarters — edit individual amounts if needed'
                : '12 months — auto-split equally, edit individual months as needed'} />
            {fields.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">Set Financial Year and Budget Amount to generate periods</p>
            ) : (
              <>
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-xs min-w-[600px]">
                    <thead>
                      <tr className="border-b border-border">
                        {['Period', 'Start Date', 'End Date', 'Allocated (₹)'].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {fields.map((field, i) => (
                        <tr key={field.id}>
                          <td className="px-3 py-2 font-medium">{periods[i]?.periodLabel}</td>
                          <td className="px-3 py-2 font-mono text-muted-foreground">{periods[i]?.periodStart}</td>
                          <td className="px-3 py-2 font-mono text-muted-foreground">{periods[i]?.periodEnd}</td>
                          <td className="px-3 py-2 w-40">
                            <FormInput type="number" step="0.01" min="0"
                              {...register(`periods.${i}.allocatedAmount`, { valueAsNumber: true })} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex items-center justify-end gap-4 text-xs">
                  <span className="text-muted-foreground">Allocated:</span>
                  <span className="font-mono tabular-nums font-semibold">{formatCurrency(periodSum)}</span>
                  <span className="text-muted-foreground">Remaining:</span>
                  <span className={cn('font-mono tabular-nums font-semibold', periodValid ? 'text-green-700' : 'text-destructive')}>
                    {formatCurrency(periodRemain)}
                  </span>
                  {!periodValid && (
                    <span className="flex items-center gap-1 text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Must equal Budget Amount
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* C. Control Settings */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="C" title="Control Settings" subtitle="Block behaviour and exceptional approval" />
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" {...register('hardBlock')} className="h-4 w-4 rounded mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Hard block at 100% utilisation</p>
                    <p className="text-xs text-muted-foreground mt-0.5">When ON — POs and PRs are blocked at 100% utilisation and require exceptional approval workflow. When OFF — soft block applies (warning only).</p>
                  </div>
                </label>
              </div>

              {hardBlock && (
                <Field label="Exception Approval Workflow" hint="Triggered when budget is exceeded and override is requested">
                  <FormSelect {...register('exceptionWorkflowId')}>
                    <option value="">Select…</option>
                    {(workflows as any[]).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </FormSelect>
                </Field>
              )}

              <div className="rounded-lg bg-muted/30 border border-border p-4">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Tolerance zone:</span> {watch('toleranceZonePct') ?? 10}% — requisitions within this overage show a warning but are still allowed to submit.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
