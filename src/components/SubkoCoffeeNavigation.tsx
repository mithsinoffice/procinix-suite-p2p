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
  Sparkles,
  Upload,
  Shield,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isSuperAdminUser } from '../utils/superAdmin';
import procinixLogo from '../assets/Procinix Logo PNG V1.png';

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

function isPathActive(pathname: string, route: string, activePrefixes?: string[]): boolean {
  if (activePrefixes?.length) {
    return activePrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }
  if (route === '/dashboards') {
    return pathname === '/' || pathname === '/dashboard' || pathname === '/dashboards';
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
        activePrefixes: ['/vendor-management/master', '/vendors', '/add-vendor'],
      },
      {
        label: 'Portal Users',
        route: '/vendor-management/portal-users',
      },
    ],
  },
  { label: 'Masters', route: '/masters', icon: Settings },
  { label: 'Bulk Upload', route: '/masters/bulk-upload', icon: Upload },
  { label: 'Agent Configurator', route: '/agent-configurator', icon: Sparkles },
  { label: 'Workflow Engine', route: '/workflow-engine', icon: GitBranch },
];

export function SubkoCoffeeNavigation() {
  const location = useLocation();
  const { user } = useAuth();
  const showSuperAdminNav = isSuperAdminUser(user);

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
    backgroundColor: isActive ? 'var(--color-teal)' : 'transparent',
    color: isActive ? '#FFFFFF' : '#C7D0D8',
  });

  return (
    <div
      className="flex flex-col h-full"
      style={{
        width: '240px',
        backgroundColor: '#1E2E38',
        borderRight: '1px solid #2A3E48',
      }}
    >
      <div
        style={{
          padding: '20px 16px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.07)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            borderRadius: '12px',
            padding: '14px 16px 12px',
          }}
        >
          <img
            src={procinixLogo}
            alt="Procinix"
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
            }}
          />
        </div>
        <p
          style={{
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.45)',
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            textAlign: 'center',
            marginTop: '10px',
            marginBottom: 0,
          }}
        >
          P2P Automation ERP
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
                    style={{ color: 'var(--color-slate)' }}
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
                            e.currentTarget.style.backgroundColor = '#2A3E48';
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

            const isActive = isPathActive(location.pathname, item.route, item.activePrefixes);
            const Icon = item.icon;

            return (
              <Link
                key={item.route}
                to={item.route}
                className={linkClass(isActive)}
                style={linkStyle(isActive)}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#2A3E48';
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
          {showSuperAdminNav ? (
            <Link
              to="/super-admin"
              className={linkClass(
                isPathActive(location.pathname, '/super-admin', ['/super-admin'])
              )}
              style={linkStyle(isPathActive(location.pathname, '/super-admin', ['/super-admin']))}
              onMouseEnter={(e) => {
                const isActive = isPathActive(location.pathname, '/super-admin', ['/super-admin']);
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#2A3E48';
                  e.currentTarget.style.color = '#FFFFFF';
                }
              }}
              onMouseLeave={(e) => {
                const isActive = isPathActive(location.pathname, '/super-admin', ['/super-admin']);
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#C7D0D8';
                }
              }}
            >
              <Shield className="w-5 h-5" style={{ strokeWidth: 2 }} />
              <span>Super admin</span>
            </Link>
          ) : null}
        </nav>
      </div>
    </div>
  );
}
