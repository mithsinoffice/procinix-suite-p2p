import type { CSSProperties } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ClipboardList, BarChart3, TrendingUp, Landmark, Settings as Cog } from 'lucide-react';

const TABS = [
  { key: 'queue', label: 'Payment queue', icon: ClipboardList, path: '/ap/payments/queue' },
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3, path: '/ap/payments', end: true },
  { key: 'forecast', label: 'Forecast', icon: TrendingUp, path: '/ap/payments/forecast' },
  { key: 'banking', label: 'Banking', icon: Landmark, path: '/ap/payments/banking' },
  { key: 'settings', label: 'Settings', icon: Cog, path: '/ap/payments/settings' },
] as const;

const tabBar: CSSProperties = {
  background: 'var(--color-background-primary, #FFFFFF)',
  borderBottom: '0.5px solid var(--color-border-tertiary)',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '0 24px',
  overflowX: 'auto',
};

const tabBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 16px',
  fontSize: 13,
  fontWeight: 500,
  borderBottom: '2px solid transparent',
  marginBottom: -1,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  background: 'transparent',
};

const tabInactive: CSSProperties = {
  ...tabBase,
  color: 'var(--color-text-secondary)',
};

const tabActive: CSSProperties = {
  ...tabBase,
  color: '#0F6E56',
  borderBottomColor: '#1D9E75',
};

export function PaymentsLayout() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-background-primary, #FFFFFF)',
      }}
    >
      <nav style={tabBar} aria-label="Payments tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.key}
              to={tab.path}
              end={'end' in tab ? tab.end : false}
              style={({ isActive }) => (isActive ? tabActive : tabInactive)}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
