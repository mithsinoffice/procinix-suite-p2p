import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Clock, CheckCircle2, Send, Loader2 } from 'lucide-react'
import { http } from '../../lib/http'
import { MasterTabs, type MasterTab } from '../../components/masters/MasterTabs'
import { AuditTrailDrawer } from '../../components/shared/AuditTrailDrawer'
import {
  FormSection, FormField, FormInput, FormPageHeader, FormFooter, WorkflowBanner, MasterPageHeader,
} from '../../components/masters/MasterFormLayout'
import { formatDate, formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

interface FY {
  id:        string
  code:      string
  name:      string
  startDate: string
  endDate:   string
  isCurrent: boolean
  status:    string
  createdAt: string
  updatedAt: string
}

// ── Form ───────────────────────────────────────────────────────────────────────

function FinancialYearForm({ record, onClose, onSaved }: { record?: FY; onClose: () => void; onSaved: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Record<string, unknown>>(record
    ? { ...record, startDate: String(record.startDate).slice(0, 10), endDate: String(record.endDate).slice(0, 10) }
    : { isCurrent: false, status: 'DRAFT' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const save = useMutation({
    mutationFn: async ({ submitForApproval }: { submitForApproval: boolean }) => {
      const payload = { ...form }
      const saved = record
        ? await http.put<FY>(`/api/masters/financial-years/${record.id}`, payload)
        : await http.post<FY>('/api/masters/financial-years', payload)
      if (submitForApproval) {
        await http.post(`/api/masters/financial-years/${saved.id}/submit`, {})
      }
      return saved
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['financialYear'] }); onSaved(); onClose() },
  })

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })) }
  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.code)      e.code      = 'Code is required'
    if (!form.name)      e.name      = 'Name is required'
    if (!form.startDate) e.startDate = 'Start date is required'
    if (!form.endDate)   e.endDate   = 'End date is required'
    if (form.startDate && form.endDate && String(form.startDate) >= String(form.endDate)) {
      e.endDate = 'End date must be after start date'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
      <FormPageHeader
        title={record ? `Edit — ${record.name}` : 'Create Financial Year'}
        subtitle="Fiscal year period definition; only one FY can be marked Current at a time"
        onBack={onClose}
      />
      <FormSection title="Identity">
        <FormField label="Code" required hint="Unique short code e.g. FY26" error={errors.code}>
          <FormInput value={String(form.code ?? '')} placeholder="FY26"
            onChange={e => set('code', e.target.value)} onBlur={validate} disabled={!!record} />
        </FormField>
        <FormField label="Name" required error={errors.name}>
          <FormInput value={String(form.name ?? '')} placeholder="Financial Year 2025-26"
            onChange={e => set('name', e.target.value)} onBlur={validate} />
        </FormField>
        <FormField label="Start date" required error={errors.startDate}>
          <FormInput type="date" value={String(form.startDate ?? '')}
            onChange={e => set('startDate', e.target.value)} onBlur={validate} />
        </FormField>
        <FormField label="End date" required error={errors.endDate}>
          <FormInput type="date" value={String(form.endDate ?? '')}
            onChange={e => set('endDate', e.target.value)} onBlur={validate} />
        </FormField>
        <FormField label="Current financial year" span hint="Mark this FY as the active reporting period">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={Boolean(form.isCurrent)}
              onChange={e => set('isCurrent', e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary" />
            <span className="text-sm text-muted-foreground">Set as current FY</span>
          </label>
        </FormField>
      </FormSection>
      <WorkflowBanner rule="1-step approval" />
      <FormFooter
        onCancel={onClose}
        onDraft={() => { if (validate()) save.mutate({ submitForApproval: false }) }}
        onSubmit={() => { if (validate()) save.mutate({ submitForApproval: true }) }}
        isPending={save.isPending}
      />
    </div>
  )
}

// ── List page ──────────────────────────────────────────────────────────────────

export default function FinancialYearsPage() {
  const qc                          = useQueryClient()
  const [formOpen, setFormOpen]     = useState(false)
  const [edit, setEdit]             = useState<FY | null>(null)
  const [activeTab, setActiveTab]   = useState<MasterTab>('ACTIVE')
  const [search, setSearch]         = useState('')
  const [audit, setAudit]           = useState<{ id: string; name: string } | null>(null)

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey:       ['financialYear', activeTab, search],
    staleTime:      30_000,
    gcTime:         0,
    retry:          false,
    refetchOnMount: true,
    queryFn:        () => {
      const p = new URLSearchParams()
      if (search)              p.set('search', search)
      if (activeTab !== 'ALL') p.set('status', activeTab)
      return http.get<FY[]>(`/api/masters/financial-years?${p}`)
    },
  })

  useEffect(() => { qc.invalidateQueries({ queryKey: ['fy-lookup'] }) }, [rows.length, qc])

  const submit = useMutation({
    mutationFn: (id: string) => http.post(`/api/masters/financial-years/${id}/submit`, {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['financialYear'] }),
  })

  const approve = useMutation({
    mutationFn: (id: string) => http.post(`/api/masters/financial-years/${id}/approve`, {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['financialYear'] }),
  })

  if (formOpen) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <FinancialYearForm record={edit ?? undefined}
          onClose={() => { setFormOpen(false); setEdit(null) }}
          onSaved={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Financial Years"
        description="Fiscal year periods, current-year flag, and approval lifecycle"
        onRefresh={() => qc.invalidateQueries({ queryKey: ['financialYear'] })}
        actions={
          <>
            <input type="search" placeholder="Search financial years…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring w-48" />
            <button onClick={() => { setEdit(null); setFormOpen(true) }}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> Add New
            </button>
          </>
        }
      />

      <MasterTabs active={activeTab} onChange={setActiveTab} apiPath="/api/masters/financial-years" />

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">{[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">No financial years found</p>
            <button onClick={() => { setEdit(null); setFormOpen(true) }} className="mt-3 text-sm text-primary hover:underline">Add first financial year</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                {['Code', 'Name', 'Start', 'End', 'Current', 'Status', 'Updated', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className={cn('border-b border-border hover:bg-muted/20', r.isCurrent && 'bg-primary/5')}>
                  <td className="px-4 py-3 font-mono text-xs font-medium">{r.code}</td>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.startDate)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.endDate)}</td>
                  <td className="px-4 py-3">
                    {r.isCurrent && (
                      <span className="rounded-full bg-primary/15 text-primary px-2 py-0.5 text-xs font-medium">Current</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(r.status))}>
                      {formatStatus(r.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.updatedAt ?? r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEdit(r); setFormOpen(true) }} title="Edit"
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setAudit({ id: r.id, name: r.name })} title="Audit"
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
                        <Clock className="h-3.5 w-3.5" />
                      </button>
                      {r.status === 'DRAFT' && (
                        <button onClick={() => submit.mutate(r.id)} title="Submit for approval"
                          disabled={submit.isPending}
                          className="rounded p-1 text-amber-600 hover:bg-amber-50 disabled:opacity-50">
                          {submit.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      {r.status === 'PENDING_APPROVAL' && (
                        <button onClick={() => approve.mutate(r.id)} title="Approve"
                          disabled={approve.isPending}
                          className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-50">
                          {approve.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AuditTrailDrawer open={!!audit} onClose={() => setAudit(null)}
        entityType="financialYear" entityId={audit?.id ?? ''} entityName={audit?.name ?? ''} />
    </div>
  )
}
