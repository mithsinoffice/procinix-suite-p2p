import { useNavigate } from 'react-router-dom'
import { Building2, Calculator, MapPin, Receipt, Package, Users, Globe, Calendar, GitBranch, Briefcase, Shield, User } from 'lucide-react'

const MASTER_GROUPS = [
  {
    group: 'Organisation',
    tiles: [
      { to: '/masters/entities',     icon: Building2, title: 'Entities',     desc: 'Legal entities and subsidiaries'   },
      { to: '/masters/departments',  icon: Package,   title: 'Departments',  desc: 'Company department structure'      },
      { to: '/masters/designations', icon: Briefcase, title: 'Designations', desc: 'Job titles and hierarchy levels'   },
      { to: '/masters/employees',    icon: User,      title: 'Employees',    desc: 'Employee master with HR details'   },
      { to: '/masters/locations',    icon: MapPin,    title: 'Locations',    desc: 'Office and warehouse locations'    },
    ],
  },
  {
    group: 'Financial',
    tiles: [
      { to: '/masters/gl-codes',        icon: Calculator, title: 'Chart of Accounts', desc: 'GL codes and account types'      },
      { to: '/masters/cost-centres',    icon: Package,    title: 'Cost Centres',      desc: 'Cost centre allocation'          },
      { to: '/masters/tax-codes',       icon: Receipt,    title: 'Tax Codes',         desc: 'GST slabs for invoice lines'     },
      { to: '/masters/tax-regimes',     icon: Shield,     title: 'Tax Regimes',       desc: 'GST registration regimes'        },
      { to: '/masters/financial-years', icon: Calendar,   title: 'Financial Years',   desc: 'FY periods and current year'     },
    ],
  },
  {
    group: 'Vendors & Payments',
    tiles: [
      { to: '/masters/vendors',        icon: Users,      title: 'Vendors',        desc: 'Supplier and service provider KYC' },
      { to: '/masters/workflow-rules', icon: GitBranch,  title: 'Workflow Rules', desc: 'Approval routing and thresholds'   },
    ],
  },
  {
    group: 'Reference Data',
    tiles: [
      { to: '/masters/geography', icon: Globe, title: 'Geography', desc: 'Countries, states — system seeded' },
    ],
  },
]

export default function MastersPage() {
  const navigate = useNavigate()
  return (
    <div className="px-4 py-6 sm:px-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-lg font-semibold">Masters & Configuration</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Manage all reference data used across modules</p>
      </div>
      {MASTER_GROUPS.map(group => (
        <div key={group.group}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{group.group}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.tiles.map(tile => (
              <button key={tile.to} onClick={() => navigate(tile.to)}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left hover:shadow-sm hover:border-primary/30 transition-all">
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
      ))}
    </div>
  )
}
