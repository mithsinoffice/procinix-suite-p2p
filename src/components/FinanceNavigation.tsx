import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  ShoppingCart,
  Package,
  CreditCard,
  Users,
  FileText,
  FolderTree,
  Receipt,
  Wallet,
  TrendingUp,
  UserCheck,
  DollarSign,
  BookOpen,
  Calendar,
  Target,
  BarChart3,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  Building2,
  RefreshCw,
} from 'lucide-react';

interface NavModule {
  path: string;
  label: string;
  icon: any;
  badge?: string;
  children?: NavModule[];
}

interface NavSection {
  id: string;
  label: string;
  icon: any;
  modules: NavModule[];
  masters: NavModule[];
  reports: NavModule[];
}

export function FinanceNavigation() {
  const location = useLocation();
  const [expandedSection, setExpandedSection] = useState<string>('ap');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navSections: NavSection[] = [
    {
      id: 'ap',
      label: 'AP Automation',
      icon: ShoppingCart,
      modules: [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
        { path: '/goods-receipt', label: 'Goods Receipt (GRN)', icon: Package },
        {
          path: '/invoices',
          label: 'Invoices',
          icon: CreditCard,
          children: [
            { path: '/invoices', label: 'All Invoices', icon: FileText },
            { path: '/invoices/ai-capture', label: 'AI Capture', icon: Sparkles, badge: 'AI' },
          ],
        },
        { path: '/vendors', label: 'Vendor Management', icon: Users },
      ],
      masters: [
        { path: '/masters/category-master', label: 'Category Master', icon: FolderTree },
        { path: '/masters/item-master', label: 'Item Master', icon: Package },
        { path: '/masters/product-master', label: 'Product Master', icon: Package },
        { path: '/masters/sku-master', label: 'SKU Master', icon: Package },
        { path: '/masters/contract-master', label: 'Contract Master', icon: FileText },
        { path: '/masters/tax-code-master', label: 'Tax Code Master', icon: Receipt },
        { path: '/masters/entity-master', label: 'Entity Master', icon: Building2 },
        { path: '/masters/currency-master', label: 'Currency Master', icon: DollarSign },
        { path: '/masters/exchange-rate-master', label: 'Exchange Rate Master', icon: RefreshCw },
      ],
      reports: [
        { path: '/reports/procurement-head-desk', label: 'Procurement Dashboard', icon: BarChart3 },
        { path: '/reports/operational-dashboard', label: 'Operations Dashboard', icon: TrendingUp },
        { path: '/reports/workflow-report', label: 'Workflow Report', icon: FileText },
      ],
    },
    {
      id: 'ar',
      label: 'AR Automation',
      icon: Wallet,
      modules: [
        { path: '/ar/dashboard', label: 'AR Dashboard', icon: LayoutDashboard },
        { path: '/ar/customer-invoicing', label: 'Customer Invoicing', icon: Receipt },
        { path: '/ar/payment-collections', label: 'Payment Collections', icon: DollarSign },
        { path: '/ar/credit-management', label: 'Credit Management', icon: TrendingUp },
        { path: '/ar/customer-portal', label: 'Customer Portal', icon: UserCheck },
      ],
      masters: [
        { path: '/ar/masters/customer-master', label: 'Customer Master', icon: Users },
        { path: '/ar/masters/pricing-master', label: 'Pricing Master', icon: DollarSign },
        { path: '/ar/masters/payment-terms', label: 'Payment Terms', icon: Calendar },
      ],
      reports: [
        { path: '/ar/reports/aging-report', label: 'Aging Report', icon: BarChart3 },
        { path: '/ar/reports/collection-report', label: 'Collection Report', icon: TrendingUp },
        { path: '/ar/reports/revenue-report', label: 'Revenue Report', icon: FileText },
      ],
    },
    {
      id: 'r2r',
      label: 'R2R Automation',
      icon: BookOpen,
      modules: [
        { path: '/r2r/dashboard', label: 'R2R Dashboard', icon: LayoutDashboard },
        { path: '/r2r/general-ledger', label: 'General Ledger', icon: BookOpen },
        { path: '/r2r/financial-close', label: 'Financial Close', icon: Calendar },
        { path: '/r2r/reconciliations', label: 'Reconciliations', icon: Target },
        { path: '/r2r/consolidations', label: 'Consolidations', icon: BarChart3 },
      ],
      masters: [
        { path: '/masters/department-master', label: 'Department Master', icon: FolderTree },
        { path: '/masters/cost-centre-master', label: 'Cost Centre Master', icon: Target },
        { path: '/masters/profit-centre-master', label: 'Profit Centre Master', icon: TrendingUp },
        { path: '/masters/employee-master', label: 'Employee Master', icon: Users },
      ],
      reports: [
        { path: '/reports/cfo-desk', label: 'CFO Dashboard', icon: BarChart3 },
        { path: '/reports/management-desk', label: 'Management Dashboard', icon: TrendingUp },
        { path: '/reports/audit-trail', label: 'Audit Trail', icon: FileText },
      ],
    },
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? '' : sectionId);
  };

  const isActiveRoute = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const renderNavItem = (module: NavModule, level: number = 0) => {
    const isActive = isActiveRoute(module.path);
    const hasChildren = module.children && module.children.length > 0;
    // TODO(F4-followup): renderNavItem should be extracted to its own
    // component (e.g. <NavItem>) — calling useState here is technically a
    // rules-of-hooks violation, but the helper is invoked from the same
    // render path each time so behaviour is stable today.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [isChildExpanded, setIsChildExpanded] = useState(false);

    const paddingLeft = isCollapsed ? 0 : level === 0 ? 16 : level === 1 ? 32 : 48;

    if (hasChildren && !isCollapsed) {
      return (
        <div key={module.path}>
          <button
            onClick={() => setIsChildExpanded(!isChildExpanded)}
            className="w-full flex items-center justify-between px-4 py-2 transition-colors group"
            style={{
              paddingLeft: `${paddingLeft}px`,
              backgroundColor: isActive ? 'var(--color-teal)20' : 'transparent',
              color: isActive ? 'var(--color-teal)' : '#B8C5CE',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.backgroundColor = '#3a4a52';
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div className="flex items-center gap-3">
              <module.icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm" style={{ fontWeight: isActive ? '600' : '400' }}>
                {module.label}
              </span>
              {module.badge && (
                <span
                  className="px-2 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: '#007D87',
                    color: '#FFFFFF',
                    fontWeight: '600',
                  }}
                >
                  {module.badge}
                </span>
              )}
            </div>
            {isChildExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {isChildExpanded && (
            <div>{module.children?.map((child) => renderNavItem(child, level + 1))}</div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={module.path}
        to={module.path}
        className="flex items-center gap-3 px-4 py-2 transition-colors group"
        style={{
          paddingLeft: isCollapsed ? '16px' : `${paddingLeft}px`,
          backgroundColor: isActive ? 'var(--color-teal)20' : 'transparent',
          color: isActive ? 'var(--color-teal)' : '#B8C5CE',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = '#3a4a52';
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title={isCollapsed ? module.label : ''}
      >
        <module.icon className="w-4 h-4 flex-shrink-0" />
        {!isCollapsed && (
          <>
            <span className="text-sm flex-1" style={{ fontWeight: isActive ? '600' : '400' }}>
              {module.label}
            </span>
            {module.badge && (
              <span
                className="px-2 py-0.5 rounded text-xs"
                style={{
                  backgroundColor: '#007D87',
                  color: '#FFFFFF',
                  fontWeight: '600',
                }}
              >
                {module.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  return (
    <div
      className="flex flex-col h-full transition-all duration-300"
      style={{
        width: isCollapsed ? '64px' : '280px',
        backgroundColor: '#2A3A42',
        borderRight: '1px solid #1a2832',
      }}
    >
      {/* Collapse Toggle */}
      <div
        className="p-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid #3a4a52' }}
      >
        {!isCollapsed && (
          <span
            className="text-xs uppercase tracking-wider"
            style={{ color: 'var(--color-slate)', fontWeight: '600' }}
          >
            Finance Automation
          </span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--color-slate)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3a4a52')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto">
        {navSections.map((section) => {
          const isExpanded = expandedSection === section.id;
          const SectionIcon = section.icon;

          return (
            <div key={section.id} style={{ borderBottom: '1px solid #3a4a52' }}>
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-4 py-3 transition-colors"
                style={{
                  backgroundColor: isExpanded ? '#3a4a52' : 'transparent',
                  color: isExpanded ? '#FFFFFF' : 'var(--color-slate)',
                  justifyContent: isCollapsed ? 'center' : 'space-between',
                }}
                onMouseEnter={(e) => {
                  if (!isExpanded) e.currentTarget.style.backgroundColor = '#3a4a52';
                }}
                onMouseLeave={(e) => {
                  if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title={isCollapsed ? section.label : ''}
              >
                <div className="flex items-center gap-3">
                  <SectionIcon
                    className="w-5 h-5 flex-shrink-0"
                    style={{ color: 'var(--color-teal)' }}
                  />
                  {!isCollapsed && (
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>{section.label}</span>
                  )}
                </div>
                {!isCollapsed &&
                  (isExpanded ? (
                    <ChevronDown
                      className="w-4 h-4"
                      style={{ color: isExpanded ? '#FFFFFF' : 'var(--color-slate)' }}
                    />
                  ) : (
                    <ChevronRight
                      className="w-4 h-4"
                      style={{ color: isExpanded ? '#FFFFFF' : 'var(--color-slate)' }}
                    />
                  ))}
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div className="py-2">
                  {/* Core Modules */}
                  <div>{section.modules.map((module) => renderNavItem(module))}</div>

                  {/* Divider */}
                  {!isCollapsed && (
                    <div className="px-4 py-2">
                      <div style={{ height: '1px', backgroundColor: '#3a4a52' }} />
                    </div>
                  )}

                  {/* Masters Section */}
                  {!isCollapsed && (
                    <div className="px-4 py-1">
                      <span
                        className="text-xs uppercase tracking-wider"
                        style={{ color: 'var(--color-slate)', fontWeight: '600' }}
                      >
                        Masters
                      </span>
                    </div>
                  )}
                  <div>{section.masters.map((module) => renderNavItem(module))}</div>

                  {/* Divider */}
                  {!isCollapsed && (
                    <div className="px-4 py-2">
                      <div style={{ height: '1px', backgroundColor: '#3a4a52' }} />
                    </div>
                  )}

                  {/* Reports Section */}
                  {!isCollapsed && (
                    <div className="px-4 py-1">
                      <span
                        className="text-xs uppercase tracking-wider"
                        style={{ color: 'var(--color-slate)', fontWeight: '600' }}
                      >
                        Reports
                      </span>
                    </div>
                  )}
                  <div>{section.reports.map((module) => renderNavItem(module))}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer - System Settings */}
      <div className="p-4" style={{ borderTop: '1px solid #3a4a52' }}>
        <Link
          to="/masters"
          className="flex items-center gap-3 px-4 py-2 rounded-lg transition-colors"
          style={{
            backgroundColor:
              location.pathname === '/masters' ? 'var(--color-teal)20' : 'transparent',
            color: location.pathname === '/masters' ? 'var(--color-teal)' : '#B8C5CE',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
          }}
          onMouseEnter={(e) => {
            if (location.pathname !== '/masters') e.currentTarget.style.backgroundColor = '#3a4a52';
          }}
          onMouseLeave={(e) => {
            if (location.pathname !== '/masters')
              e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title={isCollapsed ? 'System Settings' : ''}
        >
          <FolderTree className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && (
            <span
              className="text-sm"
              style={{ fontWeight: location.pathname === '/masters' ? '600' : '400' }}
            >
              System Settings
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}
