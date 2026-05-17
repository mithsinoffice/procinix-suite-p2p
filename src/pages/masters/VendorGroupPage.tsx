import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Clock } from 'lucide-react'
import { http } from '../../lib/http'
import { MasterTabs, type MasterTab } from '../../components/masters/MasterTabs'
import { AuditTrailDrawer } from '../../components/shared/AuditTrailDrawer'
import {
  FormSection, FormField, FormInput, FormSelect,
  FormPageHeader, FormFooter, WorkflowBanner, MasterPageHeader,
} from '../../components/masters/MasterFormLayout'
import { formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

interface VendorGroup { id: string; code: string; name: string; description?: string; status: string; createdAt: string }

function VendorGroupForm({ record, onClose, onSaved }: { record?: VendorGroup; onClose: () => void; onSaved: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Record<string, unknown>>(record ? { ...record } : { status: 'ACTIVE' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const save = useMutation({
    mutationFn: () => record
      ? http.put<any>(`/api/masters/vendor-groups/${record.id}`, form)
      : http.post<any>('/api/masters/vendor-groups', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendorGroup'] }); onSaved(); onClose() },
  })

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })) }
  function validate() {
    const e: Record<string, string> = {}
    if (!form.code) e.code = 'Code is required'
    if (!form.name) e.name = 'Name is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
      <FormPageHeader
        title={record ? `Edit — ${record.name}` : 'Create Vendor Group'}
        subtitle="Define vendor relationship tiers for strategic sourcing"
        onBack={onClose}
      />
      <FormSection title="Identity">
        <FormField label="Code" required hint="Unique code e.g. VGP-0001" error={errors.code}>
          <FormInput value={String(form.code ?? '')} placeholder="VGP-0001"
            onChange={e => set('code', e.target.value)} onBlur={validate} disabled={!!record} />
        </FormField>
        <FormField label="Name" required error={errors.name}>
          <FormInput value={String(form.name ?? '')} placeholder="Strategic Partners"
            onChange={e => set('name', e.target.value)} onBlur={validate} />
        </FormField>
        <FormField label="Description">
          <FormInput value={String(form.description ?? '')} placeholder="Optional description"
            onChange={e => set('description', e.target.value)} />
        </FormField>
        <FormField label="Status">
          <FormSelect value={String(form.status ?? 'ACTIVE')} onChange={e => set('status', e.target.value)}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </FormSelect>
        </FormField>
      </FormSection>
      <WorkflowBanner />
      <FormFooter
        onCancel={onClose}
        onDraft={() => { if (validate()) save.mutate() }}
        onSubmit={() => { if (validate()) save.mutate() }}
        isPending={save.isPending}
      />
    </div>
  )
}

export default function VendorGroupPage() {
  const qc = useQueryClient()
  const [formOpen, setFormOpen]   = useState(false)
  const [edit, setEdit]           = useState<VendorGroup | null>(null)
  const [activeTab, setActiveTab] = useState<MasterTab>('ACTIVE')
  const [search, setSearch]       = useState('')
  const [audit, setAudit]         = useState<{ id: string; name: string } | null>(null)

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ['vendorGroup', activeTab, search],
    staleTime: 30_000,
    gcTime: 0,
    retry: false,
    refetchOnMount: true,
    queryFn: () => {
      const p = new URLSearchParams()
      if (search)              p.set('search', search)
      if (activeTab !== 'ALL') p.set('status', activeTab)
      return http.get<VendorGroup[]>(`/api/masters/vendor-groups?${p}`)
    },
  })

  if (formOpen) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <VendorGroupForm record={edit ?? undefined} onClose={() => { setFormOpen(false); setEdit(null) }} onSaved={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Vendor Groups"
        description="Define vendor relationship tiers — Strategic, Preferred, Approved, One-Time"
        onRefresh={() => qc.invalidateQueries({ queryKey: ['vendorGroup'] })}
        actions={
          <>
            <input type="search" placeholder="Search groups…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring w-48" />
            <button onClick={() => { setEdit(null); setFormOpen(true) }}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> Add New
            </button>
          </>
        }
      />

      <MasterTabs active={activeTab} onChange={setActiveTab} apiPath="/api/masters/vendor-groups" />

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">{[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">No vendor groups found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                {['Code', 'Name', 'Description', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: VendorGroup) => (
                <tr key={r.id} className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs font-medium">{r.code}</td>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.description ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(r.status))}>
                      {formatStatus(r.status)}
                    </span>
                  </td>
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AuditTrailDrawer open={!!audit} onClose={() => setAudit(null)}
        entityType="vendorGroup" entityId={audit?.id ?? ''} entityName={audit?.name ?? ''} />
    </div>
  )
}
