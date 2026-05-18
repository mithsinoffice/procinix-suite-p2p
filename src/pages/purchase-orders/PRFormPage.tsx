import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Loader2, Send, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { http } from '../../lib/http'
import {
  MasterPageHeader, FormInput, FormSelect, FormTextarea, AutoCodeField,
} from '../../components/masters/MasterFormLayout'
import { formatCurrency } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

interface PRLine {
  itemId?:          string
  description:      string
  qty:              number
  uom?:             string
  estimatedPrice:   number
  deliveryLocation?: string
  requiredBy?:      string
  glCodeId?:        string
  costCentreId?:    string
}

interface PRForm {
  prType:        string
  entityId:      string
  departmentId?: string
  requiredBy:    string
  priority:      string
  justification?: string
  currencyCode:  string
  glCodeId?:     string
  costCentreId?: string
  lines:         PRLine[]
}

const emptyLine = (): PRLine => ({
  description: '', qty: 1, estimatedPrice: 0,
})

// ── Section header ─────────────────────────────────────────────────────────────

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

function Field({ label, required, error, span, children }: {
  label: string; required?: boolean; error?: string; span?: boolean; children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', span && 'col-span-2')}>
      <label className="text-sm font-medium">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PRFormPage() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const isEdit   = !!id
  const qc       = useQueryClient()

  const [budgetCheck, setBudgetCheck] = useState<{ status: string; available: number | null } | null>(null)

  // ── Lookups ──
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
  const { data: items = [] } = useQuery({
    queryKey: ['items-lookup'],
    queryFn:  () => http.get<any>('/api/masters/items').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
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
  const { data: locations = [] } = useQuery({
    queryKey: ['locations-lookup'],
    queryFn:  () => http.get<any>('/api/masters/locations').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })

  const { data: existing, isLoading: loadingPr } = useQuery({
    queryKey: ['pr', id],
    queryFn:  () => http.get<any>(`/api/pr/${id}`),
    enabled:  isEdit,
    staleTime: 0,
  })

  // ── Form ──
  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<PRForm>({
      defaultValues: {
        prType:       'STANDARD',
        priority:     'NORMAL',
        currencyCode: 'INR',
        lines:        [emptyLine()],
      },
    })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })
  const lines    = useWatch({ control, name: 'lines' }) ?? []
  const entityId = useWatch({ control, name: 'entityId' })
  const glCodeId = useWatch({ control, name: 'glCodeId' })
  const costCentreId = useWatch({ control, name: 'costCentreId' })

  // Hydrate on edit
  useEffect(() => {
    if (existing) {
      reset({
        prType:        existing.prType,
        entityId:      existing.entityId,
        departmentId:  existing.departmentId ?? '',
        requiredBy:    existing.requiredBy ? String(existing.requiredBy).slice(0, 10) : '',
        priority:      existing.priority,
        justification: existing.justification ?? '',
        currencyCode:  existing.currencyCode ?? 'INR',
        glCodeId:      existing.budgetId ?? '',
        lines: (existing.lines ?? []).map((l: any) => ({
          itemId:           l.itemId ?? '',
          description:      l.description,
          qty:              Number(l.qty),
          uom:              l.uom ?? '',
          estimatedPrice:   Number(l.estimatedPrice),
          deliveryLocation: l.deliveryLocation ?? '',
          requiredBy:       l.requiredBy ? String(l.requiredBy).slice(0, 10) : '',
          glCodeId:         l.glCodeId ?? '',
          costCentreId:     l.costCentreId ?? '',
        })),
      })
    }
  }, [existing, reset])

  const estimatedTotal = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.estimatedPrice) || 0), 0)

  // Item auto-fill
  const handleItemChange = (idx: number, itemId: string) => {
    setValue(`lines.${idx}.itemId`, itemId)
    const item = (items as any[]).find(i => i.id === itemId)
    if (item) {
      setValue(`lines.${idx}.description`, item.name ?? item.description ?? '')
      setValue(`lines.${idx}.uom`, item.uom ?? '')
    }
  }

  // Budget check
  useEffect(() => {
    if (!entityId || estimatedTotal <= 0) {
      setBudgetCheck(null)
      return
    }
    const t = setTimeout(() => {
      http.post<any>('/api/po/budget-check', {
        entityId, glCodeId: glCodeId || null, costCentreId: costCentreId || null, amount: estimatedTotal,
      }).then(setBudgetCheck).catch(() => setBudgetCheck(null))
    }, 400)
    return () => clearTimeout(t)
  }, [entityId, glCodeId, costCentreId, estimatedTotal])

  // ── Mutations ──
  const buildPayload = (data: PRForm) => ({
    ...data,
    requestedBy: 'me',
    estimatedTotal,
    lines: data.lines.map(l => ({ ...l, qty: Number(l.qty), estimatedPrice: Number(l.estimatedPrice) })),
  })

  const saveDraft = useMutation({
    mutationFn: (data: PRForm) => {
      const payload = buildPayload(data)
      return isEdit ? http.put<any>(`/api/pr/${id}`, payload) : http.post<any>('/api/pr', payload)
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['pr-list'] })
      navigate(`/intake/${res.id ?? id}`)
    },
  })

  const submitForApproval = useMutation({
    mutationFn: async (data: PRForm) => {
      const payload = buildPayload(data)
      const pr = isEdit ? await http.put<any>(`/api/pr/${id}`, payload) : await http.post<any>('/api/pr', payload)
      await http.post(`/api/pr/${pr.id}/submit`, {})
      return pr
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['pr-list'] })
      navigate(`/intake/${res.id ?? id}`)
    },
  })

  if (isEdit && loadingPr) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  }

  const isPending = saveDraft.isPending || submitForApproval.isPending
  const isHardBlock = budgetCheck?.status === 'HARD_BLOCK'

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title={isEdit ? `Edit ${existing?.prRef ?? 'PR'}` : 'New Intake Request'}
        description="Request items or services — budget-checked and routed for approval"
        backLabel="Intake"
        backTo="/intake"
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate('/intake')}
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted">Cancel</button>
            <button type="button" disabled={isPending}
              onClick={handleSubmit(d => saveDraft.mutate(d))}
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60">
              {saveDraft.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" />}
              Save draft
            </button>
            <button type="button" disabled={isPending || isHardBlock}
              onClick={handleSubmit(d => submitForApproval.mutate(d))}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
              <Send className="h-3.5 w-3.5" />
              Submit for approval
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6">

          {/* A. PR Identity */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="A" title="PR Identity" subtitle="Requisition reference, entity, and timing" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="PR Ref">
                <AutoCodeField value={existing?.prRef} />
              </Field>
              <Field label="PR Type" required>
                <FormSelect {...register('prType')}>
                  {['STANDARD', 'EMERGENCY', 'BLANKET'].map(t => <option key={t} value={t}>{t}</option>)}
                </FormSelect>
              </Field>
              <Field label="Entity" required error={errors.entityId?.message}>
                <FormSelect {...register('entityId', { required: 'Entity is required' })}>
                  <option value="">Select entity…</option>
                  {(entities as any[]).map(e => <option key={e.id} value={e.id}>{e.name} — {e.code}</option>)}
                </FormSelect>
              </Field>
              <Field label="Department">
                <FormSelect {...register('departmentId')}>
                  <option value="">—</option>
                  {(departments as any[]).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </FormSelect>
              </Field>
              <Field label="Required By" required>
                <FormInput type="date" {...register('requiredBy', { required: true })} />
              </Field>
              <Field label="Priority">
                <FormSelect {...register('priority')}>
                  {['NORMAL', 'URGENT', 'EMERGENCY'].map(p => <option key={p} value={p}>{p}</option>)}
                </FormSelect>
              </Field>
              <Field label="GL Code (for budget)">
                <FormSelect {...register('glCodeId')}>
                  <option value="">—</option>
                  {(glCodes as any[]).map(g => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
                </FormSelect>
              </Field>
              <Field label="Cost Centre (for budget)">
                <FormSelect {...register('costCentreId')}>
                  <option value="">—</option>
                  {(costCentres as any[]).map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                </FormSelect>
              </Field>
              <Field label="Justification" span>
                <FormTextarea rows={3} placeholder="Why this requisition is needed…" {...register('justification')} />
              </Field>
            </div>
          </div>

          {/* B. PR Lines */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="B" title="PR Lines" subtitle="One row per item or service requested" />
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs min-w-[900px]">
                <thead>
                  <tr className="border-b border-border">
                    {['#', 'Item', 'Description', 'Qty', 'UOM', 'Est. Price', 'Delivery Location', 'Required By', 'GL Code', 'Cost Centre', ''].map(h => (
                      <th key={h} className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {fields.map((field, i) => (
                    <tr key={field.id} className="align-top">
                      <td className="px-2 py-2 pt-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-2 py-2 min-w-[160px]">
                        <FormSelect value={watch(`lines.${i}.itemId`) ?? ''}
                          onChange={e => handleItemChange(i, e.target.value)}>
                          <option value="">Select…</option>
                          {(items as any[]).map(it => <option key={it.id} value={it.id}>{it.itemCode} — {it.name}</option>)}
                        </FormSelect>
                      </td>
                      <td className="px-2 py-2 min-w-[180px]">
                        <FormInput placeholder="Description" {...register(`lines.${i}.description`)} />
                      </td>
                      <td className="px-2 py-2 w-20">
                        <FormInput type="number" step="0.01" min="0"
                          {...register(`lines.${i}.qty`, { valueAsNumber: true })} />
                      </td>
                      <td className="px-2 py-2 w-16">
                        <FormInput placeholder="Nos" {...register(`lines.${i}.uom`)} />
                      </td>
                      <td className="px-2 py-2 w-24">
                        <FormInput type="number" step="0.01" min="0"
                          {...register(`lines.${i}.estimatedPrice`, { valueAsNumber: true })} />
                      </td>
                      <td className="px-2 py-2 min-w-[140px]">
                        <FormSelect {...register(`lines.${i}.deliveryLocation`)}>
                          <option value="">—</option>
                          {(locations as any[]).map(l => <option key={l.id} value={l.code}>{l.name}</option>)}
                        </FormSelect>
                      </td>
                      <td className="px-2 py-2 w-32">
                        <FormInput type="date" {...register(`lines.${i}.requiredBy`)} />
                      </td>
                      <td className="px-2 py-2 min-w-[140px]">
                        <FormSelect {...register(`lines.${i}.glCodeId`)}>
                          <option value="">—</option>
                          {(glCodes as any[]).map(g => <option key={g.id} value={g.id}>{g.code}</option>)}
                        </FormSelect>
                      </td>
                      <td className="px-2 py-2 min-w-[140px]">
                        <FormSelect {...register(`lines.${i}.costCentreId`)}>
                          <option value="">—</option>
                          {(costCentres as any[]).map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                        </FormSelect>
                      </td>
                      <td className="px-2 py-2 pt-3">
                        <button type="button" onClick={() => remove(i)} disabled={fields.length === 1}
                          className="text-muted-foreground hover:text-destructive disabled:opacity-30">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => append(emptyLine())}
              className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-input px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/40">
              <Plus className="h-3.5 w-3.5" /> Add line
            </button>
          </div>

          {/* C. Budget Check */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="C" title="Budget Check" subtitle="Live availability against entity GL allocation" />
            {!budgetCheck ? (
              <p className="text-xs text-muted-foreground">Select entity, GL code and line amounts to run a budget check.</p>
            ) : budgetCheck.status === 'OK' ? (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <p className="text-sm text-green-700">Available · {formatCurrency(budgetCheck.available)} budget remaining</p>
              </div>
            ) : budgetCheck.status === 'WARNING' ? (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <p className="text-sm text-amber-700">Warning · within tolerance zone, only {formatCurrency(budgetCheck.available)} remaining</p>
              </div>
            ) : budgetCheck.status === 'HARD_BLOCK' ? (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm text-red-700 font-medium">Budget exhausted — exceptional approval required</p>
                  <p className="text-xs text-red-600 mt-0.5">Only {formatCurrency(budgetCheck.available)} available. Submission disabled until budget is revised.</p>
                </div>
              </div>
            ) : budgetCheck.status === 'SOFT_BLOCK' ? (
              <div className="flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <p className="text-sm text-orange-700">Soft block · {formatCurrency(budgetCheck.available)} remaining — additional approval may be required</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <p className="text-sm text-muted-foreground">No budget configured for this entity + GL combination</p>
              </div>
            )}
          </div>

          {/* D. Summary */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="D" title="Summary" subtitle="Estimated total and workflow routing" />
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lines</span>
                <span className="font-mono tabular-nums">{lines.length}</span>
              </div>
              <div className="flex justify-between text-base pt-2 border-t border-border">
                <span className="font-semibold">Estimated total</span>
                <span className="font-mono tabular-nums font-semibold">{formatCurrency(estimatedTotal)}</span>
              </div>
              <div className="mt-4 rounded-lg bg-primary/10 border border-primary/20 px-4 py-2.5">
                <p className="text-xs text-primary font-medium">
                  Workflow will be selected based on amount and entity when you submit
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
