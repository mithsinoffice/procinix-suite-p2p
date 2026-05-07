import { FolderTree, Users, FileText, DollarSign, Calendar, Tag } from 'lucide-react';

export function ARMasters() {
  const masters = [
    {
      name: 'Customer Master',
      count: 124,
      icon: Users,
      route: '/ar/masters/customers',
      color: 'var(--color-teal)',
    },
    {
      name: 'Item / Service Master',
      count: 856,
      icon: FileText,
      route: '/ar/masters/items',
      color: 'var(--color-success-dark)',
    },
    {
      name: 'Tax Master (GST)',
      count: 12,
      icon: DollarSign,
      route: '/ar/masters/tax',
      color: 'var(--color-warning-dark)',
    },
    {
      name: 'Payment Terms',
      count: 8,
      icon: Calendar,
      route: '/ar/masters/payment-terms',
      color: '#7B1FA2',
    },
    {
      name: 'Reason Codes',
      count: 15,
      icon: Tag,
      route: '/ar/masters/reason-codes',
      color: 'var(--color-error-dark)',
    },
    {
      name: 'Revenue Rules',
      count: 6,
      icon: FileText,
      route: '/ar/masters/revenue-rules',
      color: '#1976D2',
    },
  ];

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl mb-2" style={{ color: 'var(--color-ink)', margin: 0 }}>
              AR Masters
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
              Shared master data for AR Automation
            </p>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-3 gap-6">
          {masters.map((master, idx) => {
            const Icon = master.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow"
                style={{ border: '1px solid var(--color-silver)' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${master.color}15` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: master.color }} />
                  </div>
                  <span
                    className="text-2xl"
                    style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                  >
                    {master.count}
                  </span>
                </div>
                <h3
                  className="text-base mb-2"
                  style={{ color: 'var(--color-ink)', fontWeight: '600', margin: 0 }}
                >
                  {master.name}
                </h3>
                <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  Manage {master.name.toLowerCase()} data
                </p>
              </div>
            );
          })}
        </div>

        <div
          className="mt-8 p-6 rounded-lg"
          style={{
            backgroundColor: 'var(--color-teal-tint)',
            border: '1px solid var(--color-teal)',
          }}
        >
          <h4
            className="text-sm mb-2"
            style={{ color: 'var(--color-ink)', margin: 0, fontWeight: '600' }}
          >
            Master Data Governance
          </h4>
          <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
            All masters are read-only in transactional screens. Changes require approval and flow
            downstream automatically. No duplicate masters allowed - single source of truth
            principle enforced.
          </p>
        </div>
      </div>
    </div>
  );
}
