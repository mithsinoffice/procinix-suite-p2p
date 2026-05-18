import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Clock, CheckCircle2, Send, Loader2 } from 'lucide-react'
import { http } from '../../lib/http'
import { MasterTabs, type MasterTab } from '../../components/masters/MasterTabs'
import { AuditTrailDrawer } from '../../components/shared/AuditTrailDrawer'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

interface Employee {
  id:               string
  code:             string
  name:             string
  email?:           string
  entityId?:        string
  departmentId?:    string
  designationId?:   string
  employeeCategory?: string
  systemRole?:      string
  status:           string
  createdAt:        string
  updatedAt:        string
}

export default function EmployeesPage() {
  const navigate                  = useNavigate()
  const qc                        = useQueryClient()
  const [activeTab, setActiveTab] = useState<MasterTab>('ACTIVE')
  const [search, setSearch]       = useState('')
  const [audit, setAudit]         = useState<{ id: string; name: string } | null>(null)

  const { data: rows, isLoading } = useQuery({
    queryKey:       ['employee', activeTab, search],
    staleTime:      30_000,
    gcTime:         0,
    retry:          false,
    refetchOnMount: true,
    queryFn:        () => {
      const p = new URLSearchParams()
      if (search)              p.set('search', search)
      if (activeTab === 'DRAFT')        { p.set('status', 'DRAFT'); p.set('mine', 'true') }
      else if (activeTab !== 'ALL')     p.set('status', activeTab)
      p.set('take', '50')
      return http.get<{ data: Employee[]; total: number }>(`/api/masters/employees?${p}`)
    },
  })

  const employees = rows?.data ?? []
  const total     = rows?.total ?? 0

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
  const { data: designations = [] } = useQuery({
    queryKey: ['designations-lookup'],
    queryFn:  () => http.get<any>('/api/masters/designations').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })

  const entityMap      = Object.fromEntries((entities      as any[]).map(e => [e.id, e]))
  const departmentMap  = Object.fromEntries((departments   as any[]).map(d => [d.id, d]))
  const designationMap = Object.fromEntries((designations  as any[]).map(d => [d.id, d]))

  const submit = useMutation({
    mutationFn: (id: string) => http.post(`/api/masters/employees/${id}/submit`, {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['employee'] }),
  })
  const approve = useMutation({
    mutationFn: (id: string) => http.post(`/api/masters/employees/${id}/approve`, {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['employee'] }),
  })

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Employees"
        description={`${total} employee${total === 1 ? '' : 's'}`}
        onRefresh={() => qc.invalidateQueries({ queryKey: ['employee'] })}
        actions={
          <>
            <input type="search" placeholder="Search name, email, code…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring w-56" />
            <button onClick={() => navigate('/masters/employees/new')}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> New employee
            </button>
          </>
        }
      />

      <MasterTabs active={activeTab} onChange={setActiveTab} apiPath="/api/masters/employees" />

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">{[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">No employees found</p>
            <button onClick={() => navigate('/masters/employees/new')} className="mt-3 text-sm text-primary hover:underline">Add your first employee</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                {['Code', 'Name', 'Email', 'Department', 'Designation', 'Entity', 'Category', 'System role', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} className="border-b border-border hover:bg-muted/20 cursor-pointer"
                  onClick={() => navigate(`/masters/employees/${emp.id}`)}>
                  <td className="px-4 py-3 font-mono text-xs font-medium">{emp.code}</td>
                  <td className="px-4 py-3 font-medium">{emp.name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{emp.email ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{emp.departmentId  ? departmentMap[emp.departmentId]?.name  ?? '—' : '—'}</td>
                  <td className="px-4 py-3 text-xs">{emp.designationId ? designationMap[emp.designationId]?.name ?? '—' : '—'}</td>
                  <td className="px-4 py-3 text-xs">{emp.entityId      ? entityMap[emp.entityId]?.name           ?? '—' : '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{emp.employeeCategory?.replace(/_/g, ' ') ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{emp.systemRole?.replace(/_/g, ' ') ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(emp.status))}>
                      {formatStatus(emp.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/masters/employees/${emp.id}`)} title="Edit"
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setAudit({ id: emp.id, name: emp.name })} title="Audit"
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
                        <Clock className="h-3.5 w-3.5" />
                      </button>
                      {emp.status === 'DRAFT' && (
                        <button onClick={() => submit.mutate(emp.id)} title="Submit for approval"
                          disabled={submit.isPending}
                          className="rounded p-1 text-amber-600 hover:bg-amber-50 disabled:opacity-50">
                          {submit.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      {emp.status === 'PENDING_APPROVAL' && (
                        <button onClick={() => approve.mutate(emp.id)} title="Approve"
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
        entityType="employee" entityId={audit?.id ?? ''} entityName={audit?.name ?? ''} />
    </div>
  )
}
