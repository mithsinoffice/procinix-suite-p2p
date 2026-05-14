import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, X, Upload } from 'lucide-react'
import { http } from '../../lib/http'
import { cn } from '../../lib/utils'
import { getCountryFlag } from '../../lib/utils/country'

// ── Types ──────────────────────────────────────────────────────────────────

interface Country  { code: string; name: string; dialCode: string; currency: string; isActive: boolean }
interface State    { id: string; code: string; name: string; countryCode: string; gstCode?: string; isActive: boolean }
interface Currency { code: string; name: string; symbol: string; exchangeRate?: number; isBase?: boolean; isActive: boolean }

type Tab = 'countries' | 'states' | 'cities' | 'currencies'

// ── SlideForm — right-side drawer ─────────────────────────────────────────

function SlideForm({ title, open, onClose, children }: {
  title: string; open: boolean; onClose: () => void; children: React.ReactNode
}) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/30" onClick={onClose} />}
      <aside className={cn(
        'fixed inset-y-0 right-0 z-40 flex w-[400px] flex-col bg-card border-l border-border shadow-xl transition-transform duration-200',
        open ? 'translate-x-0' : 'translate-x-full'
      )}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">{children}</div>
      </aside>
    </>
  )
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 placeholder:text-muted-foreground"
      {...props}
    />
  )
}

function Btn({ children, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  return (
    <button
      className={cn(
        'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
        variant === 'primary'
          ? 'bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60'
          : 'border border-input hover:bg-muted disabled:opacity-60'
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// ── CountriesTab ──────────────────────────────────────────────────────────

function CountriesTab() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Country | null>(null)
  const [adding, setAdding]   = useState(false)
  const [form, setForm]       = useState({ code: '', name: '', dialCode: '', currency: '' })

  const { data: countries = [] } = useQuery({
    queryKey: ['masters', 'countries'],
    queryFn:  () => http.get<Country[]>('/api/masters/countries'),
    staleTime: 5 * 60_000,
  })

  const save = useMutation({
    mutationFn: () => editing
      ? http.put(`/api/masters/countries/${editing.code}`, { name: form.name, dialCode: form.dialCode, currency: form.currency })
      : http.post('/api/masters/countries', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['masters', 'countries'] }); close() },
  })

  function open(c?: Country) {
    if (c) { setEditing(c); setForm({ code: c.code, name: c.name, dialCode: c.dialCode, currency: c.currency }) }
    else   { setEditing(null); setForm({ code: '', name: '', dialCode: '', currency: '' }) }
    setAdding(true)
  }
  function close() { setAdding(false); setEditing(null) }
  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{countries.length} countries</p>
        <Btn onClick={() => open()}>
          <Plus className="h-3.5 w-3.5 inline mr-1.5" />Add country
        </Btn>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {countries.map((c: Country) => (
          <div key={c.code} className="group relative rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors">
            <div className="text-3xl mb-2">{getCountryFlag(c.code)}</div>
            <p className="text-sm font-semibold leading-tight">{c.name}</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{c.code} · {c.dialCode}</p>
            <p className="text-xs text-muted-foreground">{c.currency}</p>
            <button
              onClick={() => open(c)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 rounded-md p-1 hover:bg-muted transition-opacity"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>

      <SlideForm title={editing ? `Edit — ${editing.name}` : 'Add country'} open={adding} onClose={close}>
        <Field label="Country code" required hint="2-letter ISO code e.g. IN, US">
          <Input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="IN" maxLength={2} disabled={!!editing} />
        </Field>
        <Field label="Name" required>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="India" />
        </Field>
        <Field label="Dial code" hint="Include + prefix e.g. +91">
          <Input value={form.dialCode} onChange={e => set('dialCode', e.target.value)} placeholder="+91" />
        </Field>
        <Field label="Currency code" hint="3-letter ISO code e.g. INR, USD">
          <Input value={form.currency} onChange={e => set('currency', e.target.value.toUpperCase())} placeholder="INR" maxLength={3} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Btn variant="ghost" onClick={close}>Cancel</Btn>
          <Btn onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Btn>
        </div>
      </SlideForm>
    </>
  )
}

// ── StatesTab ─────────────────────────────────────────────────────────────

function StatesTab() {
  const qc = useQueryClient()
  const [countryFilter, setCountryFilter] = useState('IN')
  const [editing, setEditing] = useState<State | null>(null)
  const [adding, setAdding]   = useState(false)
  const [form, setForm]       = useState({ code: '', name: '', countryCode: 'IN', gstCode: '' })

  const { data: countries = [] } = useQuery({
    queryKey: ['masters', 'countries'],
    queryFn:  () => http.get<Country[]>('/api/masters/countries'),
    staleTime: 5 * 60_000,
  })

  const { data: states = [] } = useQuery({
    queryKey: ['masters', 'states', countryFilter],
    queryFn:  () => http.get<State[]>(`/api/masters/states${countryFilter ? `?countryCode=${countryFilter}` : ''}`),
    staleTime: 5 * 60_000,
  })

  const save = useMutation({
    mutationFn: () => editing
      ? http.put(`/api/masters/states/${editing.id}`, { name: form.name, gstCode: form.gstCode })
      : http.post('/api/masters/states', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['masters', 'states'] }); close() },
  })

  function open(s?: State) {
    if (s) { setEditing(s); setForm({ code: s.code, name: s.name, countryCode: s.countryCode, gstCode: s.gstCode ?? '' }) }
    else   { setEditing(null); setForm({ code: '', name: '', countryCode: countryFilter, gstCode: '' }) }
    setAdding(true)
  }
  function close() { setAdding(false); setEditing(null) }
  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <select
            value={countryFilter}
            onChange={e => setCountryFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All countries</option>
            {countries.map((c: Country) => (
              <option key={c.code} value={c.code}>{getCountryFlag(c.code)} {c.name}</option>
            ))}
          </select>
          <span className="text-sm text-muted-foreground">{states.length} states</span>
        </div>
        <Btn onClick={() => open()}>
          <Plus className="h-3.5 w-3.5 inline mr-1.5" />Add state
        </Btn>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {states.map((s: State) => (
          <div key={s.id} className="group relative rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors">
            <p className="text-sm font-semibold leading-tight">{s.name}</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{s.code}</p>
            {s.gstCode && <p className="text-xs text-muted-foreground">GST {s.gstCode}</p>}
            <button
              onClick={() => open(s)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 rounded-md p-1 hover:bg-muted transition-opacity"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>

      <SlideForm title={editing ? `Edit — ${editing.name}` : 'Add state'} open={adding} onClose={close}>
        <Field label="Country" required>
          <select
            value={form.countryCode}
            onChange={e => set('countryCode', e.target.value)}
            disabled={!!editing}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {countries.map((c: Country) => (
              <option key={c.code} value={c.code}>{getCountryFlag(c.code)} {c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="State code" required hint="2–4 letter code e.g. MH, DL">
          <Input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="MH" maxLength={4} disabled={!!editing} />
        </Field>
        <Field label="Name" required>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Maharashtra" />
        </Field>
        <Field label="GST code" hint="2-digit GST state code">
          <Input value={form.gstCode} onChange={e => set('gstCode', e.target.value)} placeholder="27" maxLength={2} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Btn variant="ghost" onClick={close}>Cancel</Btn>
          <Btn onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Btn>
        </div>
      </SlideForm>
    </>
  )
}

// ── CitiesTab ─────────────────────────────────────────────────────────────

function CitiesTab() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Upload className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">Cities are managed via bulk upload</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
        Download the template, fill in city names with their state codes, and upload. Changes take effect immediately.
      </p>
      <button className="mt-4 rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted">
        Download template
      </button>
    </div>
  )
}

// ── CurrenciesTab ─────────────────────────────────────────────────────────

function CurrenciesTab() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Currency | null>(null)
  const [adding, setAdding]   = useState(false)
  const [form, setForm]       = useState({ code: '', name: '', symbol: '', exchangeRate: '' })

  const { data: currencies = [] } = useQuery({
    queryKey: ['masters', 'currencies'],
    queryFn:  () => http.get<Currency[]>('/api/masters/currencies'),
    staleTime: 5 * 60_000,
  })

  const save = useMutation({
    mutationFn: () => editing
      ? http.put(`/api/masters/currencies/${editing.code}`, { name: form.name, symbol: form.symbol, exchangeRate: form.exchangeRate ? Number(form.exchangeRate) : undefined })
      : http.post('/api/masters/currencies', { ...form, exchangeRate: form.exchangeRate ? Number(form.exchangeRate) : undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['masters', 'currencies'] }); close() },
  })

  function open(c?: Currency) {
    if (c) { setEditing(c); setForm({ code: c.code, name: c.name, symbol: c.symbol, exchangeRate: String(c.exchangeRate ?? '') }) }
    else   { setEditing(null); setForm({ code: '', name: '', symbol: '', exchangeRate: '' }) }
    setAdding(true)
  }
  function close() { setAdding(false); setEditing(null) }
  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{currencies.length} currencies</p>
        <Btn onClick={() => open()}>
          <Plus className="h-3.5 w-3.5 inline mr-1.5" />Add currency
        </Btn>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {currencies.map((c: Currency) => (
          <div key={c.code} className="group relative rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                {c.symbol || c.code.slice(0, 1)}
              </div>
              {c.isBase && (
                <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-1.5 py-0.5">Base</span>
              )}
            </div>
            <p className="text-sm font-semibold">{c.code}</p>
            <p className="text-xs text-muted-foreground leading-tight">{c.name}</p>
            {c.exchangeRate != null && (
              <p className="text-xs text-muted-foreground mt-0.5">1 USD = {c.exchangeRate} {c.code}</p>
            )}
            <button
              onClick={() => open(c)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 rounded-md p-1 hover:bg-muted transition-opacity"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>

      <SlideForm title={editing ? `Edit — ${editing.name}` : 'Add currency'} open={adding} onClose={close}>
        <Field label="Currency code" required hint="3-letter ISO code e.g. INR, USD">
          <Input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="INR" maxLength={3} disabled={!!editing} />
        </Field>
        <Field label="Name" required>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Indian Rupee" />
        </Field>
        <Field label="Symbol" hint="Currency symbol e.g. ₹, $, €">
          <Input value={form.symbol} onChange={e => set('symbol', e.target.value)} placeholder="₹" />
        </Field>
        <Field label="Exchange rate" hint="Rate vs USD (optional)">
          <Input type="number" value={form.exchangeRate} onChange={e => set('exchangeRate', e.target.value)} placeholder="83.5" min={0} step="0.01" />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Btn variant="ghost" onClick={close}>Cancel</Btn>
          <Btn onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Btn>
        </div>
      </SlideForm>
    </>
  )
}

// ── GeographyPage ─────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: 'countries',  label: 'Countries'  },
  { id: 'states',     label: 'States'     },
  { id: 'cities',     label: 'Cities'     },
  { id: 'currencies', label: 'Currencies' },
]

export default function GeographyPage() {
  const [tab, setTab] = useState<Tab>('countries')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-base font-semibold">Geography &amp; Currencies</h1>
        <p className="text-xs text-muted-foreground">System reference data — countries, states, cities, currencies</p>
      </div>

      {/* Tab bar — underline style */}
      <div className="flex border-b border-border px-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-6">
        {tab === 'countries'  && <CountriesTab  />}
        {tab === 'states'     && <StatesTab     />}
        {tab === 'cities'     && <CitiesTab     />}
        {tab === 'currencies' && <CurrenciesTab />}
      </div>
    </div>
  )
}
