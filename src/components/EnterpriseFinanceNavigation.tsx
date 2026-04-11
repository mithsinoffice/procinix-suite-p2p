import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Building2,
  Shield,
  Eye,
  User,
} from 'lucide-react';
import { useFinanceRBAC } from '../contexts/FinanceRBACContext';
import { useAuth } from '../contexts/AuthContext';
import { financeNavigationConfig, globalNavigationConfig, FinanceNavModule } from '../config/financeNavigationConfig';

export function EnterpriseFinanceNavigation() {
  const location = useLocation();
  const { user } = useAuth();
  const { 
    currentRole, 
    currentCompany, 
    availableCompanies,
    switchCompany,
    hasAnyPermission,
  } = useFinanceRBAC();

  // Only one pillar can be expanded at a time
  const [expandedPillar, setExpandedPillar] = useState<string>('AP');
  const [expandedModule, setExpandedModule] = useState<string | null>('PAYMENTS');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  const togglePillar = (pillarKey: string) => {
    // If clicking the currently expanded pillar, collapse it
    // Otherwise, expand the clicked pillar and collapse others
    setExpandedPillar(expandedPillar === pillarKey ? '' : pillarKey);
  };

  const isActiveRoute = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const isViewOnlyModule = (module: FinanceNavModule): boolean => {
    // Check if user has permission to view but not create
    if (!hasAnyPermission(module.requiredPerm)) {
      return false; // No access at all
    }

    // Check if user has CREATE permission
    const hasCreate = module.requiredPerm.some(perm => 
      perm.includes('.CREATE') && hasAnyPermission([perm])
    );

    return !hasCreate; // View-only if no CREATE permission
  };

  const renderModule = (module: FinanceNavModule) => {
    // Hide if user has no permission
    if (!hasAnyPermission(module.requiredPerm)) {
      return null;
    }

    const isActive = isActiveRoute(module.route);
    const isViewOnly = isViewOnlyModule(module);
    const hasSubmodules = module.submodules && module.submodules.length > 0;
    const isModuleExpanded = expandedModule === module.key;

    // If module has submodules, render as expandable section
    if (hasSubmodules) {
      return (
        <div key={module.key}>
          <button
            onClick={() => setExpandedModule(isModuleExpanded ? null : module.key)}
            className="w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-200"
            style={{
              backgroundColor: isModuleExpanded ? '#3a4a52' : 'transparent',
              color: '#B8C5CE',
              justifyContent: 'flex-start'
            }}
            onMouseEnter={(e) => {
              if (!isModuleExpanded) {
                e.currentTarget.style.backgroundColor = '#3a4a52';
              }
            }}
            onMouseLeave={(e) => {
              if (!isModuleExpanded) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <module.icon 
              className="w-4.5 h-4.5 flex-shrink-0" 
              style={{ strokeWidth: 2 }} 
            />
            {!isCollapsed && (
              <>
                <span className="text-sm flex-1" style={{ fontWeight: '400' }}>
                  {module.label}
                </span>
                {isModuleExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </>
            )}
          </button>
          
          {/* Submodules */}
          {isModuleExpanded && !isCollapsed && (
            <div className="pl-8">
              {module.submodules?.map((submodule) => {
                if (!hasAnyPermission(submodule.requiredPerm)) {
                  return null;
                }
                
                const isSubActive = isActiveRoute(submodule.route);
                
                return (
                  <Link
                    key={submodule.key}
                    to={submodule.route}
                    className="flex items-center gap-3 px-4 py-2 transition-all duration-200 group"
                    style={{
                      backgroundColor: isSubActive ? 'var(--color-teal)20' : 'transparent',
                      borderLeft: isSubActive ? '2px solid var(--color-teal)' : '2px solid transparent',
                      marginLeft: '0',
                      paddingLeft: isSubActive ? '14px' : '16px',
                      color: isSubActive ? 'var(--color-teal)' : '#B8C5CE'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSubActive) {
                        e.currentTarget.style.backgroundColor = '#3a4a52';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSubActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <submodule.icon 
                      className="w-4 h-4 flex-shrink-0" 
                      style={{ strokeWidth: 2 }} 
                    />
                    <span 
                      className="text-sm"
                      style={{ fontWeight: isSubActive ? '600' : '400' }}
                    >
                      {submodule.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Regular module without submodules
    return (
      <Link
        key={module.key}
        to={module.route}
        className="flex items-center gap-3 px-4 py-2.5 transition-all duration-200 group"
        style={{
          backgroundColor: isActive ? 'var(--color-teal)20' : 'transparent',
          borderLeft: isActive ? '3px solid var(--color-teal)' : '3px solid transparent',
          marginLeft: '0',
          paddingLeft: isActive ? '13px' : '16px',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          color: isActive ? 'var(--color-teal)' : '#B8C5CE'
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = '#3a4a52';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
        title={isCollapsed ? module.label : ''}
      >
        <module.icon 
          className="w-4.5 h-4.5 flex-shrink-0" 
          style={{ 
            strokeWidth: 2
          }} 
        />
        {!isCollapsed && (
          <>
            <span 
              className="text-sm flex-1"
              style={{ 
                fontWeight: isActive ? '600' : '400'
              }}
            >
              {module.label}
            </span>
            {isViewOnly && (
              <Eye 
                className="w-3.5 h-3.5" 
                style={{ color: 'var(--color-slate)' }} 
                title="View Only Access"
              />
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

      {/* Navigation Pillars */}
      <div className="flex-1 overflow-y-auto">
        {financeNavigationConfig.pillars.map((pillar) => {
          const PillarIcon = pillar.icon;
          const isExpanded = expandedPillar === pillar.key;

          // Filter accessible modules
          const accessibleModules = pillar.modules.filter(module => 
            hasAnyPermission(module.requiredPerm)
          );

          // Hide pillar if no accessible modules
          if (accessibleModules.length === 0) {
            return null;
          }

          return (
            <div key={pillar.key} style={{ borderBottom: '1px solid #3a4a52' }}>
              {/* Pillar Header */}
              <button
                onClick={() => togglePillar(pillar.key)}
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
                title={isCollapsed ? pillar.label : ''}
              >
                <div className="flex items-center gap-3">
                  <PillarIcon className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-teal)' }} />
                  {!isCollapsed && (
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>
                      {pillar.label}
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

              {/* Pillar Content */}
              {isExpanded && (
                <div className="py-2">
                  {accessibleModules.map(module => renderModule(module))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Global Navigation */}
      <div className="p-4" style={{ borderTop: '1px solid #3a4a52' }}>
        {!isCollapsed && (
          <div className="mb-2 px-2">
            <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-slate)', fontWeight: '600' }}>
              Global
            </span>
          </div>
        )}
        {globalNavigationConfig.map(section => {
          // Hide if no permission
          if (!hasAnyPermission(section.requiredPerm)) {
            return null;
          }

          const isActive = isActiveRoute(section.route);

          return (
            <Link
              key={section.key}
              to={section.route}
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