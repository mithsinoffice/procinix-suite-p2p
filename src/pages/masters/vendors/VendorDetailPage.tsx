import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Pencil, Building2, Mail, Phone, Globe, MapPin } from 'lucide-react'
import { MasterPageHeader } from '../../../components/masters/MasterFormLayout'
import { KycBadge } from '../../../components/shared/KycBadge'
import { useVendor } from '../../../lib/api/vendors.api'
import { http } from '../../../lib/http'
import { formatStatus, getStatusColor, formatCurrency } from '../../../lib/utils/formatters'
import { cn } from '../../../lib/utils'

// Unwraps responses that are either a bare array or { data: [...] }
const toArray = (r: any) => Array.isArray(r) ? r : (r?.data ?? [])

export default function VendorDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate    = useNavigate()
  const { data: vendor, isLoading, error } = useVendor(id)

  // Resolve UUIDs to human-readable names in the Entity Mappings table.
  // 5-min stale time — these change rarely and are reused across the app.
  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn:  () => http.get<any>('/api/masters/entities').then(toArray),
    staleTime: 5 * 60 * 1000,
  })
  const { data: glCodes = [] } = useQuery({
    queryKey: ['gl-codes'],
    queryFn:  () => http.get<any>('/api/masters/gl-codes').then(toArray),
    staleTime: 5 * 60 * 1000,
  })
  const { data: costCentres = [] } = useQuery({
    queryKey: ['cost-centres'],
    queryFn:  () => http.get<any>('/api/masters/cost-centres').then(toArray),
    staleTime: 5 * 60 * 1000,
  })

  const entityName = (id?: string | null) => {
    if (!id) return '—'
    const e = entities.find((x: any) => x.id === id)
    return e?.name ?? e?.code ?? id
  }
  const glName = (id?: string | null) => {
    if (!id) return '—'
    const g = glCodes.find((x: any) => x.id === id)
    return g ? `${g.code ?? ''}${g.code && g.name ? ' — ' : ''}${g.name ?? ''}` || id : id
  }
  const ccName = (id?: string | null) => {
    if (!id) return '—'
    const c = costCentres.find((x: any) => x.id === id)
    return c?.name ?? c?.code ?? id
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <MasterPageHeader title="Vendor" backLabel="Vendors" backTo="/vendors" />
        <div className="p-6 space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (error || !vendor) {
    return (
      <div className="flex flex-col h-full">
        <MasterPageHeader title="Vendor" backLabel="Vendors" backTo="/vendors" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-muted-foreground">Vendor not found</p>
          <button onClick={() => navigate('/vendors')} className="mt-3 text-sm text-primary hover:underline">Back to vendors</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title={vendor.legalName}
        description={`Vendor code: ${vendor.vendorCode}`}
        backLabel="Vendors"
        backTo="/vendors"
        actions={
          <button
            onClick={() => navigate(`/vendors/${vendor.id}/edit`)}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        }
      />

      <div className="flex-1 overflow-auto">
        {/* Header strip — status + KYC chips */}
        <div className="border-b border-border bg-muted/30 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', getStatusColor(vendor.status))}>
              {formatStatus(vendor.status)}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <KycBadge label="PAN"  status={vendor.kycPanStatus} />
            <KycBadge label="GST"  status={vendor.kycGstStatus} />
            <KycBadge label="Bank" status={vendor.kycBankStatus} />
            {vendor.is206ABApplicable && <KycBadge label="206AB" status="INVALID" />}
            {vendor.einvoiceRequired   && <KycBadge label="e-Invoice" status="PENDING" />}
            {typeof vendor.gstComplianceScore === 'number' && (
              <span className="ml-auto text-xs text-muted-foreground">GST score: <span className="font-medium text-foreground">{vendor.gstComplianceScore}</span>/100</span>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Section A — Identity */}
          <Section title="A. Identity">
            <Field label="Legal name"   value={vendor.legalName} />
            <Field label="Trade name"   value={vendor.tradeName} />
            <Field label="Vendor type"  value={vendor.vendorType} />
            <Field label="PAN"          value={vendor.pan} mono />
            <Field label="GSTIN"        value={vendor.gstin} mono />
            <Field label="CIN"          value={vendor.cin} mono />
            <Field label="Udyam"        value={vendor.udyamNumber} mono />
            <Field label="TAN"          value={vendor.tan} mono />
            <Field label="MSME category" value={vendor.msmeCategory} />
            <Field label="PAN compliance" value={vendor.panCompliance} />
          </Section>

          {/* Section B — Contact */}
          <Section title="B. Contact">
            <Field label="Contact name" value={vendor.contactName}                 icon={<Building2 className="h-3 w-3" />} />
            <Field label="Email"        value={vendor.email}                       icon={<Mail className="h-3 w-3" />} />
            <Field label="Mobile"       value={vendor.mobile}                      icon={<Phone className="h-3 w-3" />} />
            <Field label="Website"      value={vendor.website}                     icon={<Globe className="h-3 w-3" />} />
            <Field
              label="Address"
              value={[vendor.addressLine1, vendor.addressLine2, vendor.city, vendor.state, vendor.pincode].filter(Boolean).join(', ') || undefined}
              icon={<MapPin className="h-3 w-3" />}
              span={2}
            />
            <Field label="Country"      value={vendor.countryCode} />
            <Field label="Payment terms" value={`${vendor.paymentTerms} days`} />
          </Section>

          {/* Section C — GST Registrations */}
          <Section title={`C. GST Registrations (${vendor.gstRegistrations?.length ?? 0})`}>
            {vendor.gstRegistrations && vendor.gstRegistrations.length > 0 ? (
              <div className="col-span-full overflow-x-auto -mx-1">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="border-b border-border bg-muted/30">
                    <tr>
                      <th className="w-16             px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">State</th>
                      <th className="min-w-[160px]   px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">GSTIN</th>
                      <th className="w-24             px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Type</th>
                      <th className="w-16             px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Primary</th>
                      <th className="min-w-[160px]   px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">SPOC</th>
                      <th className="w-20             px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">KYC</th>
                      <th className="w-24             px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendor.gstRegistrations.map(g => (
                      <tr key={g.id} className="border-b border-border">
                        <td className="px-3 py-2 text-xs">{g.stateCode}</td>
                        <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{g.gstin}</td>
                        <td className="px-3 py-2 text-xs">{g.registrationType}</td>
                        <td className="px-3 py-2 text-xs">{g.isPrimary ? 'Yes' : '—'}</td>
                        <td className="px-3 py-2 text-xs">{[g.spocName, g.spocEmail].filter(Boolean).join(' · ') || '—'}</td>
                        <td className="px-3 py-2"><KycBadge label="" status={g.kycStatus} /></td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap"><span className={cn('rounded-full px-2 py-0.5 text-xs', getStatusColor(g.status))}>{formatStatus(g.status)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyRow text="No GST registrations on file" />
            )}
          </Section>

          {/* Section D — Bank Accounts */}
          <Section title={`D. Bank Accounts (${vendor.bankAccounts?.length ?? 0})`}>
            {vendor.bankAccounts && vendor.bankAccounts.length > 0 ? (
              <div className="col-span-full overflow-x-auto -mx-1">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="border-b border-border bg-muted/30">
                    <tr>
                      <th className="min-w-[140px]   px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Account #</th>
                      <th className="w-28             px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">IFSC</th>
                      <th className="min-w-[160px]   px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Bank / Branch</th>
                      <th className="w-24             px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Type</th>
                      <th className="min-w-[140px]   px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Holder</th>
                      <th className="w-16             px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Primary</th>
                      <th className="w-20             px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">KYC</th>
                      <th className="w-24             px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendor.bankAccounts.map(b => (
                      <tr key={b.id} className="border-b border-border">
                        <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{b.accountNo}</td>
                        <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{b.ifsc}</td>
                        <td className="px-3 py-2 text-xs">{b.bankName ?? '—'}{b.branch ? ` · ${b.branch}` : ''}</td>
                        <td className="px-3 py-2 text-xs">{b.accountType}</td>
                        <td className="px-3 py-2 text-xs">{b.accountHolderName ?? '—'}</td>
                        <td className="px-3 py-2 text-xs">{b.isPrimary ? 'Yes' : '—'}</td>
                        <td className="px-3 py-2"><KycBadge label="" status={b.kycStatus} /></td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap"><span className={cn('rounded-full px-2 py-0.5 text-xs', getStatusColor(b.status))}>{formatStatus(b.status)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyRow text="No bank accounts on file" />
            )}
          </Section>

          {/* Section E — Entity Mappings */}
          <Section title={`E. Entity Mappings (${vendor.entityMappings?.length ?? 0})`}>
            {vendor.entityMappings && vendor.entityMappings.length > 0 ? (
              <div className="col-span-full overflow-x-auto -mx-1">
                <table className="w-full min-w-[1000px] text-sm">
                  <thead className="border-b border-border bg-muted/30">
                    <tr>
                      <th className="min-w-[150px]   px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Entity</th>
                      <th className="min-w-[180px]   px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">GL code</th>
                      <th className="min-w-[120px]   px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Cost centre</th>
                      <th className="w-20             px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Currency</th>
                      <th className="min-w-[110px]   px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Credit limit</th>
                      <th className="w-20             px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Terms</th>
                      <th className="w-20             px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Block PO</th>
                      <th className="w-20             px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Block Pay</th>
                      <th className="w-16             px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendor.entityMappings.map(m => (
                      <tr key={m.id} className="border-b border-border">
                        <td className="px-3 py-2 text-xs">{entityName(m.entityId)}</td>
                        <td className="px-3 py-2 text-xs">{glName(m.glCodeId)}</td>
                        <td className="px-3 py-2 text-xs">{ccName(m.costCentreId)}</td>
                        <td className="px-3 py-2 text-xs">{m.currencyCode}</td>
                        <td className="px-3 py-2 text-xs font-mono tabular-nums whitespace-nowrap">
                          {m.creditLimit != null ? formatCurrency(m.creditLimit, m.currencyCode) : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs">{m.paymentTermsDays ?? '—'}d</td>
                        <td className="px-3 py-2 text-xs">{m.blockPO      ? 'Yes' : '—'}</td>
                        <td className="px-3 py-2 text-xs">{m.blockPayment ? 'Yes' : '—'}</td>
                        <td className="px-3 py-2 text-xs">{m.isActive     ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyRow text="No entity mappings on file" />
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="border-b border-border px-4 py-2.5">
        <h2 className="text-sm font-medium">{title}</h2>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 px-4 py-4">
        {children}
      </div>
    </section>
  )
}

function Field({
  label, value, mono, icon, span,
}: {
  label: string
  value?: string | number | null
  mono?: boolean
  icon?: React.ReactNode
  span?: 2 | 3
}) {
  return (
    <div className={cn(span === 2 && 'sm:col-span-2', span === 3 && 'sm:col-span-3')}>
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">{icon}{label}</p>
      <p className={cn('text-sm mt-0.5', mono && 'font-mono', !value && 'text-muted-foreground')}>
        {value || '—'}
      </p>
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return <p className="col-span-full text-sm text-muted-foreground">{text}</p>
}
