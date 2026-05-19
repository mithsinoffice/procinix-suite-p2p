import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Users, FileText, CreditCard, Plus, Settings, ToggleLeft, ToggleRight } from 'lucide-react'
import { http } from '../../lib/http'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { cn } from '../../lib/utils'
import { formatDate } from '../../lib/utils/formatters'

const MODULE_LABELS: Record<string, string> = {
  INVOICE:  'Invoice Management',
  VENDOR:   'Vendor Master',
  PAYMENT:  'Payments',
  WORKFLOW: 'Workflow Engine',
  PR:       'Purchase Requisition',
  PO:       'Purchase Order',
  GRN:      'Goods Receipt',
  REPORTS:  'Reports & Analytics',
}

const FEATURE_LABELS: Record<string, Record<string, string>> = {
  INVOICE:  { UPLOAD: 'Manual Upload', OCR: 'Gemini OCR', EMAIL_INGEST: 'Email Ingest', STP: 'Straight-Through', MATCH_SCORING: 'Match Scoring', EINVOICE: 'e-Invoice' },
  VENDOR:   { KYC: 'KYC Validation', PORTAL: 'Vendor Portal', '206AB': '206AB Check', MSME: 'MSME Rules', ERP_SYNC: 'ERP Sync' },
  PAYMENT:  { TRANSBNK: 'Transbnk', TDS: 'TDS Calc', BATCH: 'Batch Payments', CHALLAN: 'TDS Challan' },
  WORKFLOW: { DYNAMIC: 'Dynamic Engine', CHAT: 'Chat + Info Request', SLA: 'SLA Tracking' },
  PR:       { CREATE: 'Create PR', APPROVE: 'Approve PR', CONVERT_PO: 'Convert to PO' },
  PO:       { CREATE: 'Create PO', APPROVE: 'Approve PO', GRN: 'GRN Matching' },
  GRN:      { CREATE: 'Create GRN', APPROVE: 'Approve GRN' },
  REPORTS:  { AP_AGING: 'AP Aging', SPEND: 'Spend Analytics', TDS_SUMMARY: 'TDS Summary' },
}

function ModuleToggle({ tenantId, moduleCode, isEnabled, features, onToggle: _onToggle }: any) {
  const qc = useQueryClient()
  const toggleModule = useMutation({
    mutationFn: (enabled: boolean) =>
      http.put(`/api/admin/tenants/${tenantId}/modules/${moduleCode}`, { isEnabled: enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-modules', tenantId] }),
  })
  const toggleFeature = useMutation({
    mutationFn: ({ featureCode, enabled }: { featureCode: string; enabled: boolean }) =>
      http.put(`/api/admin/tenants/${tenantId}/modules/${moduleCode}/features/${featureCode}`, { isEnabled: enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-modules', tenantId] }),
  })

  return (
    <div className={cn('rounded-xl border p-4', isEnabled ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20')}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold">{MODULE_LABELS[moduleCode] ?? moduleCode}</span>
        <button onClick={() => toggleModule.mutate(!isEnabled)}>
          {isEnabled
            ? <ToggleRight className="h-6 w-6 text-primary" />
            : <ToggleLeft  className="h-6 w-6 text-muted-foreground" />}
        </button>
      </div>
      {isEnabled && (
        <div className="space-y-1.5">
          {features.map((f: any) => (
            <div key={f.featureCode} className="flex items-center justify-between pl-2">
              <span className="text-xs text-muted-foreground">
                {FEATURE_LABELS[moduleCode]?.[f.featureCode] ?? f.featureCode}
              </span>
              <button onClick={() => toggleFeature.mutate({ featureCode: f.featureCode, enabled: !f.isEnabled })}>
                {f.isEnabled
                  ? <ToggleRight className="h-4 w-4 text-primary" />
                  : <ToggleLeft  className="h-4 w-4 text-muted-foreground" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TenantModulesDrawer({ tenant, onClose }: any) {
  const { data: modules = [] } = useQuery({
    queryKey: ['admin-modules', tenant.id],
    queryFn:  () => http.get<any[]>(`/api/admin/tenants/${tenant.id}/modules`),
  })
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-background shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">{tenant.name}</p>
            <p className="text-xs text-muted-foreground">Module & feature configuration</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 gap-3">
          {modules.map((m: any) => (
            <ModuleToggle key={m.moduleCode} tenantId={tenant.id} {...m} />
          ))}
        </div>
      </div>
    </>
  )
}

export default function AdminTenantsPage() {
  const [configTenant, setConfigTenant] = useState<any>(null)
  const [showCreate, setShowCreate]     = useState(false)
  const [form, setForm]                 = useState({ code: '', name: '', plan: 'TRIAL', maxEntities: 1, maxUsers: 5 })
  const qc = useQueryClient()

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn:  () => http.get<any[]>('/api/admin/tenants'),
  })

  const { data: stats } = useQuery({
    queryKey: ['admin-stats', tenants.map((t: any) => t.id).join(',')],
    queryFn:  () =>
      Promise.all(tenants.map((t: any) =>
        http.get<any>(`/api/admin/tenants/${t.id}/stats`).then(s => ({ id: t.id, ...s }))
      )).then(results => Object.fromEntries(results.map(r => [r.id, r]))),
    enabled: tenants.length > 0,
    staleTime: 60_000,
  })

  const createTenant = useMutation({
    mutationFn: () => http.post('/api/admin/tenants', form),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-tenants'] }); setShowCreate(false) },
  })

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Tenant Management"
        description="Procinix super admin — manage all client tenants, modules and features"
        backLabel="Dashboard"
        backTo="/dashboard"
        actions={
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> New Tenant
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {tenants.map((t: any) => {
              const s = stats?.[t.id]
              const enabledModules = t.modules?.filter((m: any) => m.isEnabled).length ?? 0
              return (
                <div key={t.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{t.name}</p>
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium',
                          t.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-muted text-muted-foreground')}>
                          {t.status}
                        </span>
                        <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-xs font-medium">
                          {t.plan}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.code}</p>
                      {t.trialExpiresAt && (
                        <p className="text-xs text-amber-600 mt-0.5">Trial expires {formatDate(t.trialExpiresAt)}</p>
                      )}
                    </div>
                    <button onClick={() => setConfigTenant(t)}
                      className="flex items-center gap-1 rounded-lg border border-input px-2.5 py-1.5 text-xs hover:bg-muted flex-shrink-0">
                      <Settings className="h-3 w-3" /> Configure
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { icon: Users,      label: 'Users',    val: s?.users    ?? '—' },
                      { icon: Building2,  label: 'Vendors',  val: s?.vendors  ?? '—' },
                      { icon: FileText,   label: 'Invoices', val: s?.invoices ?? '—' },
                      { icon: CreditCard, label: 'Payments', val: s?.payments ?? '—' },
                    ].map(({ icon: Icon, label, val }) => (
                      <div key={label} className="rounded-lg bg-muted/40 p-2 text-center">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-0.5" />
                        <p className="text-sm font-semibold">{val}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{enabledModules} of 8 modules enabled</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {configTenant && <TenantModulesDrawer tenant={configTenant} onClose={() => setConfigTenant(null)} />}

      {showCreate && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowCreate(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">New Tenant</p>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
            </div>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {([
                { key: 'code', label: 'Tenant code',  placeholder: 'ACME' },
                { key: 'name', label: 'Company name', placeholder: 'Acme Corporation' },
              ] as const).map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{f.label}</label>
                  <input value={(form as any)[f.key]} placeholder={f.placeholder}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Plan</label>
                <select value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
                  {['TRIAL', 'PROFESSIONAL', 'ENTERPRISE'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Max entities</label>
                  <input type="number" value={form.maxEntities}
                    onChange={e => setForm(p => ({ ...p, maxEntities: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Max users</label>
                  <input type="number" value={form.maxUsers}
                    onChange={e => setForm(p => ({ ...p, maxUsers: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
            </div>
            <div className="border-t border-border p-4 flex gap-2">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 rounded-lg border border-input px-3 py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={() => createTenant.mutate()} disabled={!form.code || !form.name || createTenant.isPending}
                className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                Create tenant
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
