import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { http } from '../../../lib/http'
import { toArray } from '../../../lib/utils'
import { useAddManualProvision, useDeleteProposal, useProposals } from '../../../lib/api/provisions.api'

interface Vendor    { id: string; legalName: string; tradeName?: string }
interface GlCode    { id: string; code: string; name: string; accountType: string }
interface TdsRow    { id: string; section: string; code: string }

export default function ManualAdditionsTab({ period }: { period: string }) {
  const { data: proposalsData } = useProposals(period)
  const addManual = useAddManualProvision()
  const del       = useDeleteProposal()

  const { data: vendorsRaw } = useQuery({
    queryKey: ['masters', 'vendors-list'],
    queryFn:  () => http.get<unknown>('/api/masters/vendors?take=200&status=ACTIVE'),
  })
  const { data: glRaw } = useQuery({
    queryKey: ['masters', 'gl-codes-list'],
    queryFn:  () => http.get<unknown>('/api/masters/gl-codes?take=500&status=ACTIVE'),
  })
  const { data: tdsRaw } = useQuery({
    queryKey: ['masters', 'tds-sections-list'],
    queryFn:  () => http.get<unknown>('/api/masters/tds-sections?take=100&status=ACTIVE'),
  })

  const vendors = toArray<Vendor>((vendorsRaw as { data?: unknown })?.data ?? vendorsRaw)
  const glCodes = toArray<GlCode>((glRaw      as { data?: unknown })?.data ?? glRaw)
  const tdsRows = toArray<TdsRow>((tdsRaw     as { data?: unknown })?.data ?? tdsRaw)

  const expenseGLs   = glCodes.filter(g => g.accountType === 'EXPENSE')
  const provisionGLs = glCodes.filter(g => g.accountType === 'LIABILITY')

  // Form state — kept local so submission doesn't churn the parent.
  const [form, setForm] = useState({
    description:    '',
    vendorId:       '',
    amount:         '',
    expenseGlCode:  '',
    provisionGlCode:'',
    tdsSection:     '',
    reversalTrigger:'FIRST_OF_NEXT_MONTH',
    narration:      '',
  })
  const [msg, setMsg] = useState<string | null>(null)

  function update<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleAdd() {
    setMsg(null)
    if (!form.description || !form.amount || !form.expenseGlCode || !form.provisionGlCode) {
      setMsg('Description, amount, expense GL and provision GL are required.')
      return
    }
    await addManual.mutateAsync({
      period,
      description:     form.description,
      vendorId:        form.vendorId || undefined,
      amount:          Number(form.amount),
      expenseGlCode:   form.expenseGlCode,
      provisionGlCode: form.provisionGlCode,
      tdsSection:      form.tdsSection || undefined,
      reversalTrigger: form.reversalTrigger,
      narration:       form.narration || undefined,
    })
    setForm({
      description: '', vendorId: '', amount: '',
      expenseGlCode: '', provisionGlCode: '', tdsSection: '',
      reversalTrigger: 'FIRST_OF_NEXT_MONTH', narration: '',
    })
    setMsg('Added to proposals.')
  }

  // Show only manual proposals for the period.
  const manualRows = (proposalsData?.proposals ?? []).filter(p => p.isManual)

  return (
    <div className="space-y-4">
      {/* Form */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">Add manual provision</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <Field label="Description">
            <input
              type="text"
              value={form.description}
              onChange={e => update('description', e.target.value)}
              className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs"
              placeholder="e.g. Audit fees Q4"
            />
          </Field>
          <Field label="Vendor (optional)">
            <select value={form.vendorId} onChange={e => update('vendorId', e.target.value)} className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs">
              <option value="">—</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.tradeName ?? v.legalName}</option>)}
            </select>
          </Field>
          <Field label="Amount">
            <input
              type="number"
              value={form.amount}
              onChange={e => update('amount', e.target.value)}
              className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs text-right"
            />
          </Field>
          <Field label="Expense GL">
            <select value={form.expenseGlCode} onChange={e => update('expenseGlCode', e.target.value)} className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs">
              <option value="">Select…</option>
              {expenseGLs.map(g => <option key={g.id} value={g.code}>{g.code} · {g.name}</option>)}
            </select>
          </Field>
          <Field label="Provision GL (liability)">
            <select value={form.provisionGlCode} onChange={e => update('provisionGlCode', e.target.value)} className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs">
              <option value="">Select…</option>
              {provisionGLs.map(g => <option key={g.id} value={g.code}>{g.code} · {g.name}</option>)}
            </select>
          </Field>
          <Field label="TDS section (optional)">
            <select value={form.tdsSection} onChange={e => update('tdsSection', e.target.value)} className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs">
              <option value="">—</option>
              {tdsRows.map(t => <option key={t.id} value={t.section}>{t.section} · {t.code}</option>)}
            </select>
          </Field>
          <Field label="Reversal trigger">
            <select value={form.reversalTrigger} onChange={e => update('reversalTrigger', e.target.value)} className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs">
              <option value="FIRST_OF_NEXT_MONTH">First of next month</option>
              <option value="ON_INVOICE_APPROVAL">On invoice approval</option>
              <option value="MANUAL">Manual</option>
            </select>
          </Field>
          <Field label="Narration (optional)">
            <input
              type="text"
              value={form.narration}
              onChange={e => update('narration', e.target.value)}
              className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs"
              placeholder="JV narration…"
            />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2">
          {msg && <span className="text-[11px] text-muted-foreground">{msg}</span>}
          <button
            type="button"
            onClick={handleAdd}
            disabled={addManual.isPending}
            className="flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            <Plus className="h-3 w-3" /> Add to proposals
          </button>
        </div>
      </div>

      {/* Manual rows already added this period */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-left">Vendor</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-left">Expense GL</th>
                <th className="px-3 py-2 text-left">Provision GL</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {manualRows.map(p => (
                <tr key={p.id ?? p.description}>
                  <td className="px-3 py-2 font-medium">{p.description}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.vendorName ?? '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">₹{p.proposedAmount.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-2 font-mono text-[10px]">{p.expenseGlCode}</td>
                  <td className="px-3 py-2 font-mono text-[10px]">{p.provisionGlCode}</td>
                  <td className="px-3 py-2">{p.status}</td>
                  <td className="px-3 py-2 text-right">
                    {p.id && p.status === 'DRAFT' && (
                      <button
                        type="button"
                        onClick={() => del.mutate(p.id!)}
                        disabled={del.isPending}
                        className="rounded-md border border-input px-2 py-1 text-[11px] hover:bg-muted disabled:opacity-60"
                        title="Remove"
                      >
                        <Trash2 className="h-3 w-3 inline" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {manualRows.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No manual additions for this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  )
}
