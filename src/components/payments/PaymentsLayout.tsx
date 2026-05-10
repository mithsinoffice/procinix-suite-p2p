import { NavLink, Outlet } from 'react-router-dom';
import { ClipboardList, BarChart3, TrendingUp, Landmark, Settings as Cog } from 'lucide-react';

const TABS = [
  { key: 'queue', label: 'Payment queue', icon: ClipboardList, path: '/ap/payments/queue' },
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3, path: '/ap/payments', end: true },
  { key: 'forecast', label: 'Forecast', icon: TrendingUp, path: '/ap/payments/forecast' },
  { key: 'banking', label: 'Banking', icon: Landmark, path: '/ap/payments/banking' },
  { key: 'settings', label: 'Settings', icon: Cog, path: '/ap/payments/settings' },
] as const;

export function PaymentsLayout() {
  return (
    <div className="min-h-screen bg-cloud">
      <div className="bg-white border-b-2 border-silver">
        <nav className="flex items-center gap-1 px-6 pt-3" aria-label="Payments tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.key}
                to={tab.path}
                end={'end' in tab ? tab.end : false}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-[2px] transition-colors',
                    isActive
                      ? 'border-teal text-teal'
                      : 'border-transparent text-mercury-grey hover:text-ink hover:border-silver',
                  ].join(' ')
                }
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
