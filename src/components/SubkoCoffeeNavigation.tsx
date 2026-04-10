import type { CSSProperties } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckCircle,
  Plus,
  FileText,
  ShoppingCart,
  Package,
  DollarSign,
  FileDown,
  FileMinus,
  Wallet,
  Users,
  Settings,
  GitBranch,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/**
 * SUBKO COFFEE — flat nav with Vendor Management sub-menus
 */

interface NavChild {
  label: string;
  route: string;
  activePrefixes?: string[];
}

interface NavItem {
  label: string;
  route: string;
  icon: any;
  activePrefixes?: string[];
  children?: NavChild[];
}

function isPathActive(
  pathname: string,
  route: string,
  activePrefixes?: string[]
): boolean {
  if (activePrefixes?.length) {
    return activePrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }
  if (route === '/dashboards') {
    return (
      pathname === '/' ||
      pathname === '/dashboard' ||
      pathname === '/dashboards'
    );
  }
  return pathname === route || pathname.startsWith(`${route}/`);
}

const navigationItems: NavItem[] = [
  { label: 'Chanakya Desk', route: '/dashboards', icon: LayoutDashboard },
  { label: 'My Approvals', route: '/approvals', icon: CheckCircle },
  { label: 'Create', route: '/create', icon: Plus },
  { label: 'Intake (PR)', route: '/procurement/pr', icon: FileText },
  { label: 'Purchase Orders', route: '/procurement/po', icon: ShoppingCart },
  { label: 'GRN / SRN', route: '/procurement/grn', icon: Package },
  { label: 'Vendor Advances', route: '/ap/advances', icon: DollarSign },
  { label: 'Invoices', route: '/ap/invoices', icon: FileDown },
  { label: 'Debit Notes', route: '/ap/debit-notes', icon: FileMinus },
  { label: 'Payments', route: '/ap/payments', icon: Wallet },
  {
    label: 'Vendor Management',
    route: '/vendor-management',
    icon: Users,
    children: [
      {
        label: 'Vendor Governance Desk',
        route: '/vendor-management/governance-desk',
      },
      {
        label: 'Invite vendors',
        route: '/vendor-management/invite-vendors',
      },
      {
        label: 'Vendor Review',
        route: '/vendor-management/review',
      },
      {
        label: 'Vendor Master',
        route: '/vendor-management/master',
        activePrefixes: [
          '/vendor-management/master',
          '/vendors',
          '/add-vendor',
        ],
      },
      {
        label: 'Portal Users',
        route: '/vendor-management/portal-users',
      },
    ],
  },
  { label: 'Masters', route: '/masters', icon: Settings },
  { label: 'Workflow Engine', route: '/workflow-engine', icon: GitBranch },
];

export function SubkoCoffeeNavigation() {
  const location = useLocation();
  const { user } = useAuth();

  const getUserInitials = (name?: string) => {
    if (!name) {
      return 'GU';
    }

    const names = name.trim().split(/\s+/);
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }

    return name.slice(0, 2).toUpperCase();
  };

  const linkClass = (isActive: boolean) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm ${
      isActive ? 'font-semibold' : 'font-normal'
    }`;

  const linkStyle = (isActive: boolean): CSSProperties => ({
    backgroundColor: isActive ? '#00A9B7' : 'transparent',
    color: isActive ? '#FFFFFF' : '#C7D0D8',
  });

  return (
    <div
      className="flex flex-col h-full"
      style={{
        width: '240px',
        backgroundColor: '#2A3A42',
        borderRight: '1px solid #3a4a52',
      }}
    >
      <div className="px-6 py-6" style={{ borderBottom: '1px solid #3a4a52' }}>
        <h1
          className="text-lg"
          style={{ color: '#FFFFFF', fontWeight: '700', letterSpacing: '-0.02em' }}
        >
          Subko Coffee
        </h1>
        <p className="text-xs mt-1" style={{ color: '#9AA6AF' }}>
          Procurement Suite
        </p>
      </div>

      <div className="flex-1 px-3 py-6 overflow-y-auto">
        <nav className="space-y-1">
          {navigationItems.map((item) => {
            if (item.children?.length) {
              const Icon = item.icon;
              return (
                <div key={item.label} className="space-y-1">
                  <div
                    className="flex items-center gap-3 px-4 py-2"
                    style={{ color: '#9AA6AF' }}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" style={{ strokeWidth: 2 }} />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {item.label}
                    </span>
                  </div>
                  {item.children.map((child) => {
                    const isActive = isPathActive(
                      location.pathname,
                      child.route,
                      child.activePrefixes
                    );
                    return (
                      <Link
                        key={child.route}
                        to={child.route}
                        className={linkClass(isActive)}
                        style={{
                          ...linkStyle(isActive),
                          paddingLeft: '2.25rem',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = '#364850';
                            e.currentTarget.style.color = '#FFFFFF';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#C7D0D8';
                          }
                        }}
                      >
                        <span>{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            }

            const isActive = isPathActive(
              location.pathname,
              item.route,
              item.activePrefixes
            );
            const Icon = item.icon;

            return (
              <Link
                key={item.route}
                to={item.route}
                className={linkClass(isActive)}
                style={linkStyle(isActive)}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#364850';
                    e.currentTarget.style.color = '#FFFFFF';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#C7D0D8';
                  }
                }}
              >
                <Icon className="w-5 h-5" style={{ strokeWidth: 2 }} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div
        className="px-4 py-4"
        style={{
          borderTop: '1px solid #3a4a52',
          backgroundColor: '#253138',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
            style={{
              backgroundColor: '#00A9B7',
              color: '#FFFFFF',
              fontWeight: '600',
            }}
          >
            {getUserInitials(user?.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm truncate"
              style={{ color: '#FFFFFF', fontWeight: '500' }}
            >
              {user?.name || 'Guest User'}
            </p>
            <p className="text-xs truncate" style={{ color: '#9AA6AF' }}>
              {user?.role || 'Guest'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
