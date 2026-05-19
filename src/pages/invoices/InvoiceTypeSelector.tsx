import { useNavigate } from 'react-router-dom'
import { FileText, Zap } from 'lucide-react'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { cn } from '../../lib/utils'

// New Invoice → pick one of two creation paths. Drives /invoices/new — the
// child routes (/invoices/new/po, /invoices/new/direct) render the actual forms.
export default function InvoiceTypeSelector() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="New Invoice"
        description="Pick the creation path that matches the underlying purchase"
        backLabel="Invoices"
        backTo="/invoices"
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TypeCard
              icon={<FileText className="h-6 w-6" />}
              tone="teal"
              title="PO-based invoice"
              desc="References an approved PO. Supports 2-way or 3-way match against POs and GRNs."
              badge="Recommended for goods & services"
              onClick={() => navigate('/invoices/new/po')}
            />
            <TypeCard
              icon={<Zap className="h-6 w-6" />}
              tone="blue"
              title="Direct invoice"
              desc="No PO required. Utilities, reimbursements, one-off purchases."
              badge="Requires L2 approval if total > ₹25,000"
              onClick={() => navigate('/invoices/new/direct')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function TypeCard({ icon, tone, title, desc, badge, onClick }: {
  icon:    React.ReactNode
  tone:    'teal' | 'blue'
  title:   string
  desc:    string
  badge:   string
  onClick: () => void
}) {
  const palette = tone === 'teal'
    ? { iconBg: 'bg-teal-50 text-teal-700 border-teal-200',   badge: 'bg-teal-50 text-teal-700 border-teal-200',   ring: 'hover:border-teal-300 hover:ring-teal-100'   }
    : { iconBg: 'bg-blue-50 text-blue-700 border-blue-200',   badge: 'bg-blue-50 text-blue-700 border-blue-200',   ring: 'hover:border-blue-300 hover:ring-blue-100'   }
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6 text-left transition-all hover:shadow-md hover:ring-4 hover:ring-offset-0',
        palette.ring,
      )}
    >
      <div className={cn('rounded-xl border p-3', palette.iconBg)}>
        {icon}
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <span className={cn('mt-auto rounded-full border px-2.5 py-1 text-xs font-medium', palette.badge)}>
        {badge}
      </span>
    </button>
  )
}
