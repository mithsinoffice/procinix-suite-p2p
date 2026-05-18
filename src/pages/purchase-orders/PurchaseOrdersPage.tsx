import { ShoppingCart, GitMerge, PiggyBank } from 'lucide-react'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'

const FEATURES = [
  {
    icon: ShoppingCart,
    title: 'PO Creation',
    desc: 'Raise purchase orders with line items, GL coding, and budget commitment check.',
  },
  {
    icon: GitMerge,
    title: '3-Way Matching',
    desc: 'Automatic PO ↔ GRN ↔ Invoice reconciliation before payment release.',
  },
  {
    icon: PiggyBank,
    title: 'Budget Linkage',
    desc: 'Commitment accounting — reserved budget releases only on GRN confirmation.',
  },
]

export default function PurchaseOrdersPage() {
  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Purchase Orders"
        description="Raise, approve and track purchase orders linked to budget"
        backLabel="Dashboard"
        backTo="/dashboard"
      />
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-2xl mx-auto text-center py-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 mb-6">
            Coming Soon
          </span>
          <h2 className="text-xl font-bold mb-2">Purchase Orders</h2>
          <p className="text-sm text-muted-foreground mb-10">
            Full PO lifecycle — requisition to receipt — is coming in the next release.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-left">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-border bg-card p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 mb-3">
                  <Icon className="h-5 w-5 text-amber-600" />
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
