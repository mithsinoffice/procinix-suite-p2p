import { useState, useDeferredValue } from 'react'
import { Plus, Search, Upload, Eye, Pencil, Clock, CheckCircle, Send } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '../../lib/http'
import { AuditTrailDrawer } from '../shared/AuditTrailDrawer'
import { BulkUploadModal } from '../shared/BulkUploadModal'
import { formatDate, formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'
import {
  FormSection, FormField, FormInput, FormSelect, FormTextarea,
  AutoCodeField, WorkflowBanner, FormPageHeader, FormFooter,
} from './MasterFormLayout'

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

// ── Full-page form ──

function FullPageForm({ config, record, onSaved, onCancel }: {
  config: MasterConfig; record?: any; onSaved: () => void; onCancel: () => void
}) {
  const qc                            = useQueryClient()
  const [form, setForm]               = useState<Record<string, unknown>>(record ?? {})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function validateField(key: string, value: unknown) {
    const field = config.fields.find(f => f.key === key)
    if (!field) return
    if (field.required && !value) {
      setFieldErrors(e => ({ ...e, [key]: `${field.label} is required` }))
    } else {
      setFieldErrors(e => { const next = { ...e }; delete next[key]; return next })
    }
  }

  function validateAll(): boolean {
    const errs: Record<string, string> = {}
    for (const field of config.fields) {
      if (field.required && field.key !== 'code' && !form[field.key]) {
        errs[field.key] = `${field.label} is required`
      }
    }
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

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
    },
  })

  const codeField  = config.fields.find(f => f.key === 'code')
  const otherFields = config.fields.filter(f => f.key !== 'code')

  return (
    <div className="space-y-4">
      <FormSection title="Details">
        {/* Code always first */}
        <FormField label={codeField?.label ?? 'Code'} hint="Auto-generated — unique identifier">
          <AutoCodeField value={record?.code} />
        </FormField>

        {otherFields.map(field => (
          <FormField
            key={field.key}
            label={field.label}
            required={field.required}
            error={fieldErrors[field.key]}
            span={field.span === 2}
            icon={field.key.toLowerCase().includes('code') ? '#' : field.key === 'email' ? '@' : undefined}
          >
            {field.type === 'text' && (
              <FormInput
                value={String(form[field.key] ?? '')}
                placeholder={`Enter ${field.label.toLowerCase()}`}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                onBlur={() => validateField(field.key, form[field.key])}
                className={fieldErrors[field.key] ? 'border-destructive' : ''}
              />
            )}
            {field.type === 'number' && (
              <FormInput
                type="number" step={field.step ?? '0.01'}
                value={String(form[field.key] ?? '')}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                onBlur={() => validateField(field.key, form[field.key])}
                className={fieldErrors[field.key] ? 'border-destructive' : ''}
              />
            )}
            {field.type === 'select' && (
              <FormSelect
                value={String(form[field.key] ?? '')}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                onBlur={() => validateField(field.key, form[field.key])}
              >
                <option value="">Select…</option>
                {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
              </FormSelect>
            )}
            {field.type === 'textarea' && (
              <FormTextarea
                rows={3}
                value={String(form[field.key] ?? '')}
                placeholder={`Enter ${field.label.toLowerCase()}`}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                onBlur={() => validateField(field.key, form[field.key])}
              />
            )}
            {field.type === 'checkbox' && (
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id={field.key}
                  checked={Boolean(form[field.key])}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.checked }))}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <label htmlFor={field.key} className="text-sm text-muted-foreground">{field.label}</label>
              </div>
            )}
          </FormField>
        ))}
      </FormSection>

      <WorkflowBanner />

      <FormFooter
        onCancel={onCancel}
        onDraft={() => { if (validateAll()) save.mutate(false) }}
        onSubmit={() => { if (validateAll()) save.mutate(true) }}
        isPending={save.isPending}
      />
    </div>
  )
}

// ── Main component ──

export function MasterListScreen({ config }: { config: MasterConfig }) {
  const qc                              = useQueryClient()
  const [search, setSearch]             = useState('')
  const [status, setStatus]             = useState('')
  const [formOpen, setFormOpen]         = useState(false)
  const [bulkOpen, setBulkOpen]         = useState(false)
  const [editRecord, setEditRecord]     = useState<any>(null)
  const [auditRecord, setAuditRecord]   = useState<{ id: string; name: string } | null>(null)
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

  const closeForm = () => { setFormOpen(false); setEditRecord(null) }

  // ── Full-page form view ──
  if (formOpen) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6">
            <FormPageHeader
              title={editRecord ? `Edit ${config.singular}` : `Create ${config.singular}`}
              subtitle={editRecord ? `Editing ${editRecord.code ?? editRecord.name}` : `Fill in the details to create a new ${config.singular}`}
              onBack={closeForm}
            />
            <FullPageForm
              config={config}
              record={editRecord}
              onSaved={() => { refetch(); closeForm() }}
              onCancel={closeForm}
            />
          </div>
        </div>
      </div>
    )
  }

  // ── List view ──
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
