import { useNavigate } from 'react-router-dom'
import { Building2, Calculator, MapPin, Receipt, Users } from 'lucide-react'

const MASTER_TILES = [
  { to: '/masters/vendors',      icon: Users,      title: 'Vendors',       desc: 'Supplier, contractor, service provider master' },
  { to: '/masters/gl-codes',     icon: Calculator, title: 'GL Codes',      desc: 'Chart of accounts for financial coding'        },
  { to: '/masters/departments',  icon: Building2,  title: 'Departments',   desc: 'Company department structure'                  },
  { to: '/masters/cost-centres', icon: MapPin,     title: 'Cost Centres',  desc: 'Cost centre allocation master'                 },
  { to: '/masters/tax-codes',    icon: Receipt,    title: 'Tax Codes',     desc: 'GST tax slabs for invoice line items'          },
]

export default function MastersPage() {
  const navigate = useNavigate()
  return (
    <div className="px-4 py-6 sm:px-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Masters & Configuration</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Manage reference data used across all modules</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MASTER_TILES.map(tile => (
          <button
            key={tile.to}
            onClick={() => navigate(tile.to)}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left hover:shadow-sm hover:border-primary/30 transition-all"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
              <tile.icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{tile.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{tile.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
