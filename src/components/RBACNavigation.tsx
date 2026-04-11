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
  CheckCircle,
  ListTodo,
  History,
  Settings,
  Eye,
  Shield,
  RefreshCw,
  ChevronUp
} from 'lucide-react';
import { useRBAC } from '../contexts/RBACContext';
import { useAuth } from '../contexts/AuthContext';

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
  pillar: 'ap' | 'ar' | 'r2r';
  modules: NavModule[];
  masters: NavModule[];
  reports: NavModule[];
}

interface GlobalSection {
  path: string;
  label: string;
  icon: any;
  badge?: number;
}

export function RBACNavigation() {
  const location = useLocation();
  const { user } = useAuth();
  const { 
    currentRole, 
    availableRoles, 
    currentCompany, 
    availableCompanies,
    switchRole, 
    switchCompany,
    hasAccess,
    hasPillarAccess 
  } = useRBAC();

  const [expandedSection, setExpandedSection] = useState<string>('ap');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  // Check if user is admin (can switch roles)
  const isAdmin = currentRole.roleId === 'super-admin';

  const navSections: NavSection[] = [
    {
      id: 'ap',
      label: 'AP Automation',
      icon: ShoppingCart,
      pillar: 'ap',
      modules: [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { 
          path: '/procurement/pr', 
          label: 'Procurement Intake (PR)', 
          icon: FileText,
          children: [
            { path: '/procurement/pr/listing', label: 'All PRs', icon: FileText },
            { path: '/procurement/pr/create', label: 'Create PR', icon: FileText },
            { path: '/procurement/pr/approvals-inbox', label: 'PR Approvals', icon: CheckCircle },
            { path: '/procurement/pr/reports', label: 'PR Reports', icon: BarChart3 }
          ]
        },
        { path: '/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
        { path: '/goods-receipt', label: 'Goods Receipt (GRN)', icon: Package },
        { 
          path: '/invoices', 
          label: 'Invoices', 
          icon: CreditCard,
          children: [
            { path: '/invoices', label: 'All Invoices', icon: FileText },
            { path: '/invoices/ai-capture', label: 'AI Capture', icon: Sparkles, badge: 'AI' }
          ]
        },
        {
          path: '/ap/payments',
          label: 'Payments',
          icon: Wallet,
          children: [
            { path: '/ap/payments', label: 'Payment Dashboard', icon: LayoutDashboard },
            { path: '/ap/msme-payment-dashboard', label: 'MSME Payments', icon: Building2 },
            { path: '/ap/payment-aging-dashboard', label: 'Aging Dashboard', icon: BarChart3 },
            { path: '/ap/payment-proposal', label: 'Payment Proposal', icon: FileText },
            { path: '/ap/payment-batches', label: 'Payment Batches', icon: Package },
            { path: '/ap/ai-suggested-payment-batch', label: 'AI Suggested Batches', icon: Sparkles, badge: 'AI' },
            { path: '/ap/bank-integration-management', label: 'Bank Integration', icon: CreditCard },
            { path: '/ap/payment-audit-trail', label: 'Payment Audit Trail', icon: History }
          ]
        },
        { path: '/vendors', label: 'Vendor Management', icon: Users }
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
        { path: '/masters/exchange-rate-master', label: 'Exchange Rate Master', icon: RefreshCw }
      ],
      reports: [
        { path: '/reports/procurement-head-desk', label: 'Procurement Dashboard', icon: BarChart3 },
        { path: '/reports/operational-dashboard', label: 'Operations Dashboard', icon: TrendingUp },
        { path: '/reports/workflow-report', label: 'Workflow Report', icon: FileText }
      ]
    },
    {
      id: 'ar',
      label: 'AR Automation',
      icon: Wallet,
      pillar: 'ar',
      modules: [
        { path: '/ar/dashboard', label: 'AR Dashboard', icon: LayoutDashboard },
        { path: '/ar/customer-invoicing', label: 'Customer Invoicing', icon: Receipt },
        { path: '/ar/payment-collections', label: 'Payment Collections', icon: DollarSign },
        { path: '/ar/credit-management', label: 'Credit Management', icon: TrendingUp },
        { path: '/ar/customer-portal', label: 'Customer Portal', icon: UserCheck }
      ],
      masters: [
        { path: '/ar/masters/customer-master', label: 'Customer Master', icon: Users },
        { path: '/ar/masters/pricing-master', label: 'Pricing Master', icon: DollarSign },
        { path: '/ar/masters/payment-terms', label: 'Payment Terms', icon: Calendar }
      ],
      reports: [
        { path: '/ar/reports/aging-report', label: 'Aging Report', icon: BarChart3 },
        { path: '/ar/reports/collection-report', label: 'Collection Report', icon: TrendingUp },
        { path: '/ar/reports/revenue-report', label: 'Revenue Report', icon: FileText }
      ]
    },
    {
      id: 'r2r',
      label: 'R2R Automation',
      icon: BookOpen,
      pillar: 'r2r',
      modules: [
        { path: '/r2r/dashboard', label: 'R2R Dashboard', icon: LayoutDashboard },
        { path: '/r2r/general-ledger', label: 'General Ledger', icon: BookOpen },
        { path: '/r2r/financial-close', label: 'Financial Close', icon: Calendar },
        { path: '/r2r/reconciliations', label: 'Reconciliations', icon: Target },
        { path: '/r2r/consolidations', label: 'Consolidations', icon: BarChart3 }
      ],
      masters: [
        { path: '/masters/department-master', label: 'Department Master', icon: FolderTree },
        { path: '/masters/cost-centre-master', label: 'Cost Centre Master', icon: Target },
        { path: '/masters/profit-centre-master', label: 'Profit Centre Master', icon: TrendingUp },
        { path: '/masters/employee-master', label: 'Employee Master', icon: Users }
      ],
      reports: [
        { path: '/reports/cfo-desk', label: 'CFO Dashboard', icon: BarChart3 },
        { path: '/reports/management-desk', label: 'Management Dashboard', icon: TrendingUp },
        { path: '/reports/audit-trail', label: 'Audit Trail', icon: FileText }
      ]
    }
  ];

  const globalSections: GlobalSection[] = [
    { path: '/', label: 'Chanakya Desk', icon: LayoutDashboard },
    { path: '/approvals', label: 'Approvals', icon: CheckCircle, badge: 12 },
    { path: '/tasks', label: 'My Tasks', icon: ListTodo, badge: 5 },
    { path: '/audit-log', label: 'Audit Log', icon: History },
    { path: '/settings', label: 'Settings', icon: Settings }
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? '' : sectionId);
  };

  const toggleModule = (modulePath: string) => {
    setExpandedModules(prev => 
      prev.includes(modulePath) 
        ? prev.filter(p => p !== modulePath)
        : [...prev, modulePath]
    );
  };

  const isActiveRoute = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const renderNavItem = (module: NavModule, level: number = 0) => {
    const permission = hasAccess(module.path);
    
    // Hide if no access
    if (permission === 'none') return null;

    const isActive = isActiveRoute(module.path);
    const isViewOnly = permission === 'view';
    const hasChildren = module.children && module.children.length > 0;
    const isChildExpanded = expandedModules.includes(module.path);

    const paddingLeft = isCollapsed ? 0 : level === 0 ? 16 : level === 1 ? 32 : 48;

    if (hasChildren && !isCollapsed) {
      // Filter children based on permissions
      const accessibleChildren = module.children?.filter(child => hasAccess(child.path) !== 'none') || [];
      
      // If no accessible children, treat as regular link
      if (accessibleChildren.length === 0) {
        return renderNavItem({ ...module, children: undefined }, level);
      }

      return (
        <div key={module.path}>
          <button
            onClick={() => toggleModule(module.path)}
            className="w-full flex items-center justify-between px-4 py-2 transition-colors group"
            style={{
              paddingLeft: `${paddingLeft}px`,
              backgroundColor: isActive ? 'var(--color-teal)20' : 'transparent',
              color: isActive ? 'var(--color-teal)' : '#B8C5CE'
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
              {isViewOnly && (
                <Eye className="w-3.5 h-3.5" style={{ color: 'var(--color-slate)' }} title="View Only" />
              )}
              {module.badge && (
                <span 
                  className="px-2 py-0.5 rounded text-xs"
                  style={{ 
                    backgroundColor: '#007D87',
                    color: '#FFFFFF',
                    fontWeight: '600'
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
            <div>
              {accessibleChildren.map(child => renderNavItem(child, level + 1))}
            </div>
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
          justifyContent: isCollapsed ? 'center' : 'flex-start'
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
            {isViewOnly && (
              <Eye className="w-3.5 h-3.5" style={{ color: 'var(--color-slate)' }} title="View Only" />
            )}
            {module.badge && (
              <span 
                className="px-2 py-0.5 rounded text-xs"
                style={{ 
                  backgroundColor: '#007D87',
                  color: '#FFFFFF',
                  fontWeight: '600'
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
        borderRight: '1px solid #1a2832'
      }}
    >
      {/* Company Switcher */}
      {!isCollapsed && (
        <div className="p-4" style={{ borderBottom: '1px solid #3a4a52' }}>
          <div className="relative">
            <button
              onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
              className="w-full flex items-center justify-between p-3 rounded-lg transition-colors"
              style={{ backgroundColor: '#3a4a52', color: '#FFFFFF' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4a5a62'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3a4a52'}
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
                <div className="text-left">
                  <div className="text-xs" style={{ color: 'var(--color-slate)' }}>Company</div>
                  <div className="text-sm" style={{ fontWeight: '600' }}>{currentCompany.code}</div>
                </div>
              </div>
              {showCompanyDropdown ? (
                <ChevronUp className="w-4 h-4" style={{ color: 'var(--color-slate)' }} />
              ) : (
                <ChevronDown className="w-4 h-4" style={{ color: 'var(--color-slate)' }} />
              )}
            </button>

            {showCompanyDropdown && (
              <div 
                className="absolute top-full left-0 right-0 mt-2 rounded-lg overflow-hidden z-50"
                style={{ backgroundColor: '#3a4a52', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
              >
                {availableCompanies.map(company => (
                  <button
                    key={company.id}
                    onClick={() => {
                      switchCompany(company.id);
                      setShowCompanyDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 transition-colors"
                    style={{
                      backgroundColor: company.id === currentCompany.id ? 'var(--color-teal)20' : 'transparent',
                      color: company.id === currentCompany.id ? 'var(--color-teal)' : '#B8C5CE',
                      borderBottom: '1px solid #2A3A42'
                    }}
                    onMouseEnter={(e) => {
                      if (company.id !== currentCompany.id) e.currentTarget.style.backgroundColor = '#4a5a62';
                    }}
                    onMouseLeave={(e) => {
                      if (company.id !== currentCompany.id) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div className="text-sm" style={{ fontWeight: '600' }}>{company.code}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--color-slate)' }}>{company.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Profile & Role */}
      {!isCollapsed && (
        <div className="p-4" style={{ borderBottom: '1px solid #3a4a52' }}>
          <div className="flex items-center gap-3 mb-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-teal)', color: '#FFFFFF', fontWeight: '600' }}
            >
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate" style={{ color: '#FFFFFF', fontWeight: '600' }}>
                {user?.name || 'User'}
              </div>
              <div className="text-xs truncate" style={{ color: 'var(--color-slate)' }}>
                {user?.email || 'user@example.com'}
              </div>
            </div>
          </div>

          {/* Current Role Badge */}
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
            <span className="text-xs" style={{ color: 'var(--color-slate)' }}>Current Role:</span>
          </div>
          <div 
            className="px-3 py-2 rounded-lg mb-2"
            style={{ backgroundColor: 'var(--color-teal)20', border: '1px solid var(--color-teal)' }}
          >
            <span className="text-sm" style={{ color: 'var(--color-teal)', fontWeight: '600' }}>
              {currentRole.roleName}
            </span>
          </div>

          {/* Role Switcher (Admin Only) */}
          {isAdmin && (
            <div className="relative">
              <button
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-xs"
                style={{ backgroundColor: '#3a4a52', color: '#B8C5CE' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4a5a62'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3a4a52'}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Switch Role</span>
              </button>

              {showRoleDropdown && (
                <div 
                  className="absolute top-full left-0 right-0 mt-2 rounded-lg overflow-hidden z-50"
                  style={{ backgroundColor: '#3a4a52', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                >
                  {availableRoles.map(role => (
                    <button
                      key={role.roleId}
                      onClick={() => {
                        switchRole(role.roleId);
                        setShowRoleDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 transition-colors text-sm"
                      style={{
                        backgroundColor: role.roleId === currentRole.roleId ? 'var(--color-teal)20' : 'transparent',
                        color: role.roleId === currentRole.roleId ? 'var(--color-teal)' : '#B8C5CE',
                        borderBottom: '1px solid #2A3A42'
                      }}
                      onMouseEnter={(e) => {
                        if (role.roleId !== currentRole.roleId) e.currentTarget.style.backgroundColor = '#4a5a62';
                      }}
                      onMouseLeave={(e) => {
                        if (role.roleId !== currentRole.roleId) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {role.roleName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Collapse Toggle */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #3a4a52' }}>
        {!isCollapsed && (
          <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-slate)', fontWeight: '600' }}>
            Navigation
          </span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--color-slate)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a4a52'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Sections (Pillars) */}
      <div className="flex-1 overflow-y-auto">
        {navSections.map((section) => {
          // Hide entire pillar if user has no access
          if (!hasPillarAccess(section.pillar)) return null;

          const isExpanded = expandedSection === section.id;
          const SectionIcon = section.icon;

          // Filter modules based on permissions
          const accessibleModules = section.modules.filter(m => hasAccess(m.path) !== 'none');
          const accessibleMasters = section.masters.filter(m => hasAccess(m.path) !== 'none');
          const accessibleReports = section.reports.filter(m => hasAccess(m.path) !== 'none');

          // If no accessible modules, hide the section
          if (accessibleModules.length === 0 && accessibleMasters.length === 0 && accessibleReports.length === 0) {
            return null;
          }

          return (
            <div key={section.id} style={{ borderBottom: '1px solid #3a4a52' }}>
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-4 py-3 transition-colors"
                style={{
                  backgroundColor: isExpanded ? '#3a4a52' : 'transparent',
                  color: isExpanded ? '#FFFFFF' : 'var(--color-slate)',
                  justifyContent: isCollapsed ? 'center' : 'space-between'
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
                  <SectionIcon className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-teal)' }} />
                  {!isCollapsed && (
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>
                      {section.label}
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  isExpanded ? (
                    <ChevronDown className="w-4 h-4" style={{ color: isExpanded ? '#FFFFFF' : 'var(--color-slate)' }} />
                  ) : (
                    <ChevronRight className="w-4 h-4" style={{ color: isExpanded ? '#FFFFFF' : 'var(--color-slate)' }} />
                  )
                )}
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div className="py-2">
                  {/* Core Modules */}
                  {accessibleModules.length > 0 && (
                    <div>
                      {accessibleModules.map(module => renderNavItem(module))}
                    </div>
                  )}

                  {/* Masters Section */}
                  {accessibleMasters.length > 0 && (
                    <>
                      {!isCollapsed && (
                        <div className="px-4 py-2">
                          <div style={{ height: '1px', backgroundColor: '#3a4a52' }} />
                        </div>
                      )}
                      {!isCollapsed && (
                        <div className="px-4 py-1">
                          <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-slate)', fontWeight: '600' }}>
                            Masters
                          </span>
                        </div>
                      )}
                      <div>
                        {accessibleMasters.map(module => renderNavItem(module))}
                      </div>
                    </>
                  )}

                  {/* Reports Section */}
                  {accessibleReports.length > 0 && (
                    <>
                      {!isCollapsed && (
                        <div className="px-4 py-2">
                          <div style={{ height: '1px', backgroundColor: '#3a4a52' }} />
                        </div>
                      )}
                      {!isCollapsed && (
                        <div className="px-4 py-1">
                          <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-slate)', fontWeight: '600' }}>
                            Reports
                          </span>
                        </div>
                      )}
                      <div>
                        {accessibleReports.map(module => renderNavItem(module))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Global Sections */}
      <div className="p-4" style={{ borderTop: '1px solid #3a4a52' }}>
        {!isCollapsed && (
          <div className="mb-2 px-2">
            <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-slate)', fontWeight: '600' }}>
              Global
            </span>
          </div>
        )}
        {globalSections.map(section => {
          const permission = hasAccess(section.path);
          
          // Hide if no access
          if (permission === 'none') return null;

          const isActive = isActiveRoute(section.path);
          const isViewOnly = permission === 'view';

          return (
            <Link
              key={section.path}
              to={section.path}
              className="flex items-center gap-3 px-4 py-2 rounded-lg transition-colors mb-1"
              style={{
                backgroundColor: isActive ? 'var(--color-teal)20' : 'transparent',
                color: isActive ? 'var(--color-teal)' : '#B8C5CE',
                justifyContent: isCollapsed ? 'center' : 'flex-start'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = '#3a4a52';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title={isCollapsed ? section.label : ''}
            >
              <section.icon className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="text-sm flex-1" style={{ fontWeight: isActive ? '600' : '400' }}>
                    {section.label}
                  </span>
                  {isViewOnly && (
                    <Eye className="w-3.5 h-3.5" style={{ color: 'var(--color-slate)' }} title="View Only" />
                  )}
                  {section.badge && section.badge > 0 && (
                    <span 
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{ 
                        backgroundColor: '#EF4444',
                        color: '#FFFFFF',
                        fontWeight: '600'
                      }}
                    >
                      {section.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}