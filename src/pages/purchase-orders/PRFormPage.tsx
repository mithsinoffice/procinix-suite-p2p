import { useEffect, useRef, useState } from 'react'
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
  itemId?:           string
  description:       string
  qty:               number
  uom?:              string
  estimatedPrice:    number
  deliveryLocation?: string
  requiredBy?:       string
  glCodeId?:         string
  costCentreId?:     string
}

interface PRForm {
  prType:         string
  entityId:       string
  departmentId?:  string
  priority:       string
  justification?: string
  currencyCode:   string
  lines:          PRLine[]
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

function Field({ label, required, hint, error, span, children }: {
  label: string; required?: boolean; hint?: string; error?: string; span?: boolean; children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', span && 'col-span-2')}>
      <label className="text-sm font-medium">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {hint  && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// Compact cell-padding override for line-items table — twMerge will collapse the wrapper's px-3 py-2.5 text-sm
const cellCls = 'px-1.5 py-1 text-xs rounded'

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PRFormPage() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const isEdit   = !!id
  const qc       = useQueryClient()

  const [budgetCheck, setBudgetCheck] = useState<{ status: string; available: number | null } | null>(null)

  // ── Lookups ──
  const { data: currentUser } = useQuery({
    queryKey: ['current-user-profile'],
    queryFn:  () => http.get<any>('/auth/me'),
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

  // Budget check derives GL/CC from the first line (line-level fields, not header)
  const firstLineGl = lines[0]?.glCodeId
  const firstLineCc = lines[0]?.costCentreId

  // Auto-populate entity + department from logged-in user's profile (only when creating)
  const prefilledRef = useRef(false)
  useEffect(() => {
    if (isEdit || prefilledRef.current || !currentUser) return
    if (currentUser.entityId)     setValue('entityId',     currentUser.entityId)
    if (currentUser.departmentId) setValue('departmentId', currentUser.departmentId)
    prefilledRef.current = true
  }, [currentUser, isEdit, setValue])

  // Hydrate on edit
  useEffect(() => {
    if (existing) {
      reset({
        prType:        existing.prType,
        entityId:      existing.entityId,
        departmentId:  existing.departmentId ?? '',
        priority:      existing.priority,
        justification: existing.justification ?? '',
        currencyCode:  existing.currencyCode ?? 'INR',
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

  // Budget check (uses first line's GL/CC since those moved to line level)
  useEffect(() => {
    if (!entityId || estimatedTotal <= 0) {
      setBudgetCheck(null)
      return
    }
    const t = setTimeout(() => {
      http.post<any>('/api/po/budget-check', {
        entityId,
        glCodeId:     firstLineGl || null,
        costCentreId: firstLineCc || null,
        amount:       estimatedTotal,
      }).then(setBudgetCheck).catch(() => setBudgetCheck(null))
    }, 400)
    return () => clearTimeout(t)
  }, [entityId, firstLineGl, firstLineCc, estimatedTotal])

  // ── Mutations ──
  // Derive header requiredBy from earliest line date (PR table column is NOT NULL)
  function deriveRequiredBy(allLines: PRLine[]): string {
    const dates = allLines.map(l => l.requiredBy).filter(Boolean) as string[]
    if (dates.length === 0) {
      const fallback = new Date()
      fallback.setDate(fallback.getDate() + 30)
      return fallback.toISOString().slice(0, 10)
    }
    return dates.sort()[0]
  }

  const buildPayload = (data: PRForm) => ({
    ...data,
    requestedBy:    'me',
    requiredBy:     deriveRequiredBy(data.lines),
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

  const isPending   = saveDraft.isPending || submitForApproval.isPending
  const isHardBlock = budgetCheck?.status === 'HARD_BLOCK'
  // Only DRAFT PRs are editable. Anything past DRAFT renders as read-only —
  // matches the backend guard in PUT /api/pr/:id which 422s non-DRAFT edits.
  const prStatus    = (existing?.status as string | undefined) ?? 'DRAFT'
  const isReadOnly  = isEdit && prStatus !== 'DRAFT'

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title={isEdit ? `${isReadOnly ? '' : 'Edit '}${existing?.prRef ?? 'PR'}` : 'New Intake Request'}
        description={isReadOnly
          ? `Locked — PR is in ${prStatus} status. Only DRAFT requisitions are editable.`
          : 'Request items or services — budget-checked and routed for approval'}
        backLabel="Intake"
        backTo="/intake"
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate('/intake')}
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted">
              {isReadOnly ? 'Back' : 'Cancel'}
            </button>
            {!isReadOnly && (
              <>
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
              </>
            )}
          </div>
        }
      />

      {isReadOnly && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 sm:px-6">
          <p className="text-xs text-amber-700">
            <span className="font-semibold">Read-only.</span> This PR is in <span className="font-mono">{prStatus}</span> status — edits are blocked.
            {prStatus === 'REJECTED' && ' Approver can reject to return it to DRAFT for editing.'}
          </p>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <fieldset disabled={isReadOnly} className="contents">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6">

          {/* A. PR Identity */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="A" title="PR Identity" subtitle="Requisition reference and requester scope" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="PR Ref">
                <AutoCodeField value={existing?.prRef} />
              </Field>
              <Field label="PR Type" required>
                <FormSelect {...register('prType')}>
                  {['STANDARD', 'EMERGENCY', 'BLANKET'].map(t => <option key={t} value={t}>{t}</option>)}
                </FormSelect>
              </Field>
              <Field label="Entity" required
                hint="Auto-populated from your profile — can be changed"
                error={errors.entityId?.message}>
                <FormSelect {...register('entityId', { required: 'Entity is required' })}>
                  <option value="">Select entity…</option>
                  {(entities as any[]).map(e => <option key={e.id} value={e.id}>{e.name} — {e.code}</option>)}
                </FormSelect>
              </Field>
              <Field label="Department"
                hint="Auto-populated from your profile — can be changed">
                <FormSelect {...register('departmentId')}>
                  <option value="">—</option>
                  {(departments as any[]).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </FormSelect>
              </Field>
              <Field label="Priority">
                <FormSelect {...register('priority')}>
                  {['NORMAL', 'URGENT', 'EMERGENCY'].map(p => <option key={p} value={p}>{p}</option>)}
                </FormSelect>
              </Field>
              <Field label="Justification" span>
                <FormTextarea rows={3} placeholder="Why this requisition is needed…" {...register('justification')} />
              </Field>
            </div>
          </div>

          {/* B. PR Lines */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="B" title="PR Lines" subtitle="One row per item or service requested — GL code, cost centre and required-by are captured per line" />
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs min-w-[1200px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground w-8">#</th>
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[180px]">Item</th>
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[160px]">Description</th>
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[80px]">Qty</th>
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[70px]">UOM</th>
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[110px]">Est. Price</th>
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[140px]">Delivery Location</th>
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[130px]">Required By</th>
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[150px]">GL Code</th>
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[150px]">Cost Centre</th>
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {fields.map((field, i) => (
                    <tr key={field.id}>
                      <td className="px-2 py-2 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-2 py-2">
                        <FormSelect value={watch(`lines.${i}.itemId`) ?? ''}
                          onChange={e => handleItemChange(i, e.target.value)}
                          className={cellCls}>
                          <option value="">Select…</option>
                          {(items as any[]).map(it => <option key={it.id} value={it.id}>{it.itemCode} — {it.name}</option>)}
                        </FormSelect>
                      </td>
                      <td className="px-2 py-2">
                        <FormInput type="text" placeholder="Description"
                          className={cellCls}
                          {...register(`lines.${i}.description`)} />
                      </td>
                      <td className="px-2 py-2">
                        <FormInput type="number" step="0.01" min="0"
                          className={cellCls}
                          {...register(`lines.${i}.qty`, { valueAsNumber: true })} />
                      </td>
                      <td className="px-2 py-2">
                        <FormInput type="text" placeholder="Nos"
                          className={cellCls}
                          {...register(`lines.${i}.uom`)} />
                      </td>
                      <td className="px-2 py-2">
                        <FormInput type="number" step="0.01" min="0"
                          className={cellCls}
                          {...register(`lines.${i}.estimatedPrice`, { valueAsNumber: true })} />
                      </td>
                      <td className="px-2 py-2">
                        <FormSelect className={cellCls} {...register(`lines.${i}.deliveryLocation`)}>
                          <option value="">—</option>
                          {(locations as any[]).map(l => <option key={l.id} value={l.code}>{l.name}</option>)}
                        </FormSelect>
                      </td>
                      <td className="px-2 py-2">
                        <FormInput type="date" className={cellCls}
                          {...register(`lines.${i}.requiredBy`)} />
                      </td>
                      <td className="px-2 py-2">
                        <FormSelect className={cellCls} {...register(`lines.${i}.glCodeId`)}>
                          <option value="">—</option>
                          {(glCodes as any[]).map(g => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
                        </FormSelect>
                      </td>
                      <td className="px-2 py-2">
                        <FormSelect className={cellCls} {...register(`lines.${i}.costCentreId`)}>
                          <option value="">—</option>
                          {(costCentres as any[]).map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                        </FormSelect>
                      </td>
                      <td className="px-2 py-2">
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
            <SectionHeader letter="C" title="Budget Check" subtitle="Live availability against entity GL allocation (uses the first line's GL / cost centre)" />
            {!budgetCheck ? (
              <p className="text-xs text-muted-foreground">Add a line with GL code and entity to run a budget check.</p>
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
        </fieldset>
      </div>
    </div>
  )
}
