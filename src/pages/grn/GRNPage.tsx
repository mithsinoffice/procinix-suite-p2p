import { Truck, ClipboardCheck, Box } from 'lucide-react'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'

const FEATURES = [
  {
    icon: Truck,
    title: 'GRN against PO',
    desc: 'Record goods receipt line-by-line against an open PO, partial receipts supported.',
  },
  {
    icon: ClipboardCheck,
    title: 'Quality Inspection',
    desc: 'Mark items as Accepted, Rejected or Under Inspection before closing the GRN.',
  },
  {
    icon: Box,
    title: 'Asset Creation',
    desc: 'CAPEX GRN auto-triggers asset register entry for capitalised items.',
  },
]

export default function GRNPage() {
  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Goods Receipt Note"
        description="Record receipt of goods against purchase orders"
        backLabel="Dashboard"
        backTo="/dashboard"
      />
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-2xl mx-auto text-center py-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 mb-6">
            Coming Soon
          </span>
          <h2 className="text-xl font-bold mb-2">Goods Receipt Note</h2>
          <p className="text-sm text-muted-foreground mb-10">
            GRN with quality inspection and asset creation is coming in the next release.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-left">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-border bg-card p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 mb-3">
                  <Icon className="h-5 w-5 text-teal-600" />
                </div>
                <p className="text-sm font-semibold mb-1">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
