import { useState, useDeferredValue } from 'react'
import { Plus, Search, Upload, Eye, Pencil, Clock, CheckCircle, Send, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '../../lib/http'
import { AuditTrailDrawer } from '../shared/AuditTrailDrawer'
import { BulkUploadModal } from '../shared/BulkUploadModal'
import { formatDate, formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

// ── Config type ──

export interface FieldDef {
  key:        string
  label:      string
  type:       'text' | 'number' | 'select' | 'checkbox' | 'textarea'
  options?:   string[]
  required?:  boolean
  span?:      1 | 2
  step?:      string
}

export interface ColDef {
  key:    string
  label:  string
  mono?:  boolean
  render?: (row: any) => React.ReactNode
}

export interface MasterConfig {
  title:        string
  singular:     string
  apiPath:      string
  entityType:   string
  columns:      ColDef[]
  fields:       FieldDef[]
  csvHeaders:   string[]
  csvExample:   Record<string, string>
}

// ── Form drawer ──

function FormDrawer({ open, onClose, config, record, onSaved }: {
  open: boolean; onClose: () => void
  config: MasterConfig; record?: any; onSaved: () => void
}) {
  const qc              = useQueryClient()
  const [form, setForm] = useState<Record<string, unknown>>(record ?? {})

  const save = useMutation({
    mutationFn: (submitForApproval: boolean) => {
      const payload = { ...form, submitForApproval }
      return record
        ? http.put(`${config.apiPath}/${record.id}`, payload)
        : http.post(config.apiPath, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [config.entityType] })
      onSaved()
      onClose()
    },
  })

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-background shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">{record ? `Edit ${config.singular}` : `New ${config.singular}`}</p>
            {record && <p className="text-xs text-muted-foreground font-mono">{record.code}</p>}
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-4">
            {config.fields.map(field => (
              <div key={field.key} className={cn('space-y-1.5', field.span === 2 && 'col-span-2')}>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}
                </label>

                {field.key === 'code' && !record && (
                  <div className="w-full rounded-md border border-dashed border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    Auto-generated on save
                  </div>
                )}
                {field.key === 'code' && record && (
                  <input
                    type="text"
                    value={String(form[field.key] ?? '')}
                    readOnly
                    className="w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                  />
                )}
                {field.key !== 'code' && field.type === 'text' && (
                  <input
                    type="text"
                    value={String(form[field.key] ?? '')}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                )}

                {field.type === 'number' && (
                  <input
                    type="number"
                    step={field.step ?? '0.01'}
                    value={String(form[field.key] ?? '')}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                )}

                {field.type === 'select' && (
                  <select
                    value={String(form[field.key] ?? '')}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select…</option>
                    {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}

                {field.type === 'checkbox' && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id={field.key}
                      checked={Boolean(form[field.key])}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.checked }))}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    <label htmlFor={field.key} className="text-sm text-muted-foreground">{field.label}</label>
                  </div>
                )}

                {field.type === 'textarea' && (
                  <textarea
                    value={String(form[field.key] ?? '')}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer with draft / submit */}
        <div className="border-t border-border p-4 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => save.mutate(false)}
              disabled={save.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
            >
              Save as draft
            </button>
            <button
              onClick={() => save.mutate(true)}
              disabled={save.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" />
              Submit for approval
            </button>
          </div>
          {save.isError && <p className="text-xs text-destructive text-center">{(save.error as any)?.message}</p>}
        </div>
      </div>
    </>
  )
}

// ── Main component ──

export function MasterListScreen({ config }: { config: MasterConfig }) {
  const qc              = useQueryClient()
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('')
  const [formOpen, setFormOpen]       = useState(false)
  const [bulkOpen, setBulkOpen]       = useState(false)
  const [editRecord, setEditRecord]   = useState<any>(null)
  const [auditRecord, setAuditRecord] = useState<{ id: string; name: string } | null>(null)
  const deferred = useDeferredValue(search)

  const { data, isLoading, refetch } = useQuery({
    queryKey: [config.entityType, { search: deferred, status }],
    queryFn:  () => {
      const p = new URLSearchParams()
      if (deferred) p.set('search', deferred)
      if (status)   p.set('status', status)
      p.set('take', '50')
      return http.get<{ data: any[]; total: number }>(`${config.apiPath}?${p}`)
    },
  })

  const approve = useMutation({
    mutationFn: (id: string) => http.post(`${config.apiPath}/${id}/approve`, {}),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: [config.entityType] }) },
  })

  const submit = useMutation({
    mutationFn: (id: string) => http.post(`${config.apiPath}/${id}/submit`, {}),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: [config.entityType] }) },
  })

  const rows  = data?.data ?? []
  const total = data?.total ?? 0

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-base font-semibold">{config.title}</h1>
          <p className="text-xs text-muted-foreground">{total} records</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBulkOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <Upload className="h-3.5 w-3.5" />
            Bulk upload
          </button>
          <button
            onClick={() => { setEditRecord(null); setFormOpen(true) }}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            New {config.singular}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2 sm:px-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="search" placeholder={`Search ${config.singular}…`}
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={status} onChange={e => setStatus(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_APPROVAL">Pending approval</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">No {config.title.toLowerCase()} found</p>
            <button onClick={() => setFormOpen(true)} className="mt-3 text-sm text-primary hover:underline">Add first {config.singular}</button>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <table className="hidden w-full text-sm sm:table">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  {config.columns.map(c => (
                    <th key={c.key} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{c.label}</th>
                  ))}
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Updated</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground w-36">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/20">
                    {config.columns.map(c => (
                      <td key={c.key} className={cn('px-4 py-3', c.mono && 'font-mono text-xs')}>
                        {c.render ? c.render(row) : String(row[c.key] ?? '—')}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(row.status ?? 'ACTIVE'))}>
                        {formatStatus(row.status ?? 'ACTIVE')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(row.updatedAt ?? row.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditRecord(row); setFormOpen(true) }}
                          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="View / Edit"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { setEditRecord(row); setFormOpen(true) }}
                          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setAuditRecord({ id: row.id, name: row.name })}
                          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="Audit trail"
                        >
                          <Clock className="h-3.5 w-3.5" />
                        </button>
                        {row.status === 'DRAFT' && (
                          <button
                            onClick={() => submit.mutate(row.id)}
                            className="rounded p-1 text-amber-600 hover:bg-amber-50"
                            title="Submit for approval"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {row.status === 'PENDING_APPROVAL' && (
                          <button
                            onClick={() => approve.mutate(row.id)}
                            className="rounded p-1 text-green-600 hover:bg-green-50"
                            title="Approve"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-border">
              {rows.map(row => (
                <div key={row.id} className="px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{row.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{row.code}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(row.status ?? 'ACTIVE'))}>
                        {formatStatus(row.status ?? 'ACTIVE')}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={() => { setEditRecord(row); setFormOpen(true) }} className="text-xs text-primary hover:underline">Edit</button>
                    <span className="text-muted-foreground">·</span>
                    <button onClick={() => setAuditRecord({ id: row.id, name: row.name })} className="text-xs text-muted-foreground hover:text-foreground">Audit</button>
                    {row.status === 'DRAFT' && (
                      <><span className="text-muted-foreground">·</span>
                        <button onClick={() => submit.mutate(row.id)} className="text-xs text-amber-600 hover:underline">Submit</button>
                      </>
                    )}
                    {row.status === 'PENDING_APPROVAL' && (
                      <><span className="text-muted-foreground">·</span>
                        <button onClick={() => approve.mutate(row.id)} className="text-xs text-green-600 hover:underline">Approve</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Drawers + modals */}
      <FormDrawer
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditRecord(null) }}
        config={config}
        record={editRecord}
        onSaved={() => refetch()}
      />

      <AuditTrailDrawer
        open={!!auditRecord}
        onClose={() => setAuditRecord(null)}
        entityType={config.entityType}
        entityId={auditRecord?.id ?? ''}
        entityName={auditRecord?.name ?? ''}
      />

      <BulkUploadModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onSuccess={() => { refetch(); setBulkOpen(false) }}
        masterName={config.title}
        apiPath={config.apiPath}
        csvHeaders={config.csvHeaders}
        csvExample={config.csvExample}
      />
    </div>
  )
}
