import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronRight,
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  BookOpen,
  CheckCircle,
  ListTodo,
  History,
  Settings,
  Eye,
  X,
} from 'lucide-react';
import { useFinanceRBAC } from '../contexts/FinanceRBACContext';
import { useAuth } from '../contexts/AuthContext';
import { financeNavigationConfig, globalNavigationConfig, FinanceNavModule } from '../config/financeNavigationConfig';
import procinixLogo from 'figma:asset/eb6183c63677cdc729899e9456f9ae8bda3594fb.png';

/**
 * ENTERPRISE LEFT NAVIGATION - STRUCTURAL NAVIGATION ONLY
 * 
 * Purpose: Structural navigation across modules and sub-modules
 * 
 * Contains:
 * - Product modules (AP Automation, AR Automation, R2R Automation, etc.)
 * - Sub-navigation within each module
 * - Global utilities (Approvals, My Tasks, Audit Logs, Settings)
 * 
 * Does NOT contain:
 * - Entity selector (in top bar)
 * - Role selector (in top bar)
 * - Filters (in page header)
 * - Create/Export actions (in page header)
 * - Notifications (in top bar)
 * 
 * Design Rules:
 * - Icons ONLY for top-level modules
 * - Indentation and typography (not icons) for sub-items
 * - Clear visual hierarchy (module headers vs sub-items)
 */

export function EnterpriseFinanceNavigationV2() {
  const location = useLocation();
  const { user } = useAuth();
  const { 
    currentRole, 
    hasAnyPermission,
  } = useFinanceRBAC();

  const [selectedPillar, setSelectedPillar] = useState<string>('AP');
  const [showContextualPanel, setShowContextualPanel] = useState(false);

  const isActiveRoute = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const isViewOnlyModule = (module: FinanceNavModule): boolean => {
    if (!hasAnyPermission(module.requiredPerm)) {
      return false;
    }
    const hasCreate = module.requiredPerm.some(perm => 
      perm.includes('.CREATE') && hasAnyPermission([perm])
    );
    return !hasCreate;
  };

  const handlePillarClick = (pillarKey: string) => {
    setSelectedPillar(pillarKey);
    setShowContextualPanel(true);
  };

  const renderContextualModule = (module: FinanceNavModule) => {
    if (!hasAnyPermission(module.requiredPerm)) {
      return null;
    }

    const isActive = isActiveRoute(module.route);
    const isViewOnly = isViewOnlyModule(module);
    const hasSubmodules = module.submodules && module.submodules.length > 0;

    if (hasSubmodules) {
      return (
        <div key={module.key} className="mb-6">
          {/* MODULE HEADER - Enhanced Visual Hierarchy */}
          <div 
            className="flex items-center gap-2 px-4 py-3 mb-2"
            style={{ borderBottom: '1px solid #E1E6EA' }}
          >
            <module.icon className="w-4 h-4" style={{ color: '#00A9B7' }} />
            <span 
              className="text-sm uppercase tracking-wide" 
              style={{ 
                color: '#0A0F14', 
                fontWeight: '700',
                letterSpacing: '0.05em'
              }}
            >
              {module.label}
            </span>
          </div>
          {/* SUB-ITEMS - Indented and Muted */}
          <div className="space-y-0.5 pl-2">
            {module.submodules?.map((submodule) => {
              if (!hasAnyPermission(submodule.requiredPerm)) {
                return null;
              }
              const isSubActive = isActiveRoute(submodule.route);
              const hasNestedSubmodules = submodule.submodules && submodule.submodules.length > 0;

              if (hasNestedSubmodules) {
                // Handle nested submodules (3rd level)
                return (
                  <div key={submodule.key} className="mb-3">
                    {/* SUB-MODULE HEADER - Medium Hierarchy */}
                    <div 
                      className="flex items-center gap-2 px-3 py-2.5 mb-1"
                      style={{ 
                        borderLeft: '2px solid #00A9B7',
                        marginLeft: '8px'
                      }}
                    >
                      <submodule.icon className="w-4 h-4" style={{ color: '#00A9B7' }} />
                      <span 
                        className="text-sm" 
                        style={{ 
                          color: '#0A0F14', 
                          fontWeight: '600'
                        }}
                      >
                        {submodule.label}
                      </span>
                    </div>
                    {/* NESTED SUB-ITEMS - Further Indented */}
                    <div className="space-y-0.5">
                      {submodule.submodules?.map((nestedSubmodule) => {
                        if (!hasAnyPermission(nestedSubmodule.requiredPerm)) {
                          return null;
                        }
                        const isNestedActive = isActiveRoute(nestedSubmodule.route);
                        return (
                          <Link
                            key={nestedSubmodule.key}
                            to={nestedSubmodule.route}
                            onClick={() => setShowContextualPanel(false)}
                            className="flex items-center gap-2.5 py-2 pl-8 pr-3 rounded-lg transition-all duration-200"
                            style={{
                              backgroundColor: isNestedActive ? '#00A9B710' : 'transparent',
                              color: isNestedActive ? '#00A9B7' : '#6E7A82',
                              borderLeft: isNestedActive ? '3px solid #00A9B7' : '3px solid transparent',
                              marginLeft: '12px'
                            }}
                            onMouseEnter={(e) => {
                              if (!isNestedActive) {
                                e.currentTarget.style.backgroundColor = '#F6F9FC';
                                e.currentTarget.style.color = '#0A0F14';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isNestedActive) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = '#6E7A82';
                              }
                            }}
                          >
                            <nestedSubmodule.icon className="w-4 h-4" style={{ strokeWidth: 2 }} />
                            <span className="text-sm" style={{ fontWeight: isNestedActive ? '500' : '400' }}>
                              {nestedSubmodule.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={submodule.key}
                  to={submodule.route}
                  onClick={() => setShowContextualPanel(false)}
                  className="flex items-center gap-2.5 py-2.5 pl-4 pr-3 rounded-lg transition-all duration-200"
                  style={{
                    backgroundColor: isSubActive ? '#00A9B710' : 'transparent',
                    color: isSubActive ? '#00A9B7' : '#6E7A82',
                    borderLeft: isSubActive ? '3px solid #00A9B7' : '3px solid transparent',
                    marginLeft: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubActive) {
                      e.currentTarget.style.backgroundColor = '#F6F9FC';
                      e.currentTarget.style.color = '#0A0F14';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#6E7A82';
                    }
                  }}
                >
                  <submodule.icon className="w-4 h-4" style={{ strokeWidth: 2 }} />
                  <span className="text-sm" style={{ fontWeight: isSubActive ? '500' : '400' }}>
                    {submodule.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      );
    }

    // Module without submodules
    return (
      <Link
        key={module.key}
        to={module.route}
        onClick={() => setShowContextualPanel(false)}
        className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all duration-200 mb-1"
        style={{
          backgroundColor: isActive ? '#00A9B7' : 'transparent',
          color: isActive ? '#FFFFFF' : '#0A0F14'
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = '#F6F9FC';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <module.icon className="w-4.5 h-4.5" style={{ strokeWidth: 2 }} />
        <span className="text-sm flex-1" style={{ fontWeight: isActive ? '600' : '400' }}>
          {module.label}
        </span>
        {isViewOnly && (
          <Eye className="w-3.5 h-3.5" style={{ color: '#6E7A82' }} title="View Only Access" />
        )}
      </Link>
    );
  };

  const selectedPillarData = financeNavigationConfig.pillars.find(p => p.key === selectedPillar);
  const accessibleModules = selectedPillarData?.modules.filter(module => 
    hasAnyPermission(module.requiredPerm)
  ) || [];

  // Determine if current route belongs to a pillar
  const getActivePillar = () => {
    for (const pillar of financeNavigationConfig.pillars) {
      for (const module of pillar.modules) {
        if (isActiveRoute(module.route)) {
          return pillar.key;
        }
        if (module.submodules) {
          for (const submodule of module.submodules) {
            if (isActiveRoute(submodule.route)) {
              return pillar.key;
            }
          }
        }
      }
    }
    return null;
  };

  const activePillar = getActivePillar();

  return (
    <>
      {/* Left Navigation - Primary Pillars */}
      <div 
        className="flex flex-col h-full"
        style={{ 
          width: '240px',
          backgroundColor: '#2A3A42',
          borderRight: '1px solid #3a4a52'
        }}
      >
        {/* Logo/Brand Area */}
        <div 
          className="px-6 py-6" 
          style={{ 
            borderBottom: '1px solid #3a4a52',
            overflow: 'visible',
            position: 'relative',
            zIndex: 10
          }}
        >
          {/* Vertical Flex Container for Logo + Text */}
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '8px',
              alignItems: 'flex-start'
            }}
          >
            {/* Image Node - Procinix Logo */}
            <img 
              src={procinixLogo}
              alt="Procinix Logo"
              style={{ 
                height: '28px', 
                width: 'auto',
                display: 'block',
                position: 'relative',
                zIndex: 20
              }}
            />
            
            {/* Text Node - Company Name */}
            <h1 
              style={{ 
                color: '#FFFFFF', 
                fontSize: '16px',
                fontWeight: '600', 
                letterSpacing: '-0.01em',
                margin: 0,
                lineHeight: '1.4'
              }}
            >
              Subko Coffee
            </h1>
            
            {/* Text Node - Product Name */}
            <p 
              style={{ 
                color: '#B6DCE0', 
                fontSize: '12px',
                fontWeight: '500',
                margin: 0,
                lineHeight: '1.4'
              }}
            >
              AP Automation
            </p>
          </div>
        </div>

        {/* Primary Pillars */}
        <div className="flex-1 px-3 py-6">
          <div className="mb-6">
            <div className="px-3 mb-3">
              <span className="text-xs uppercase tracking-wider" style={{ color: '#9AA6AF', fontWeight: '600' }}>
                Modules
              </span>
            </div>
            <div className="space-y-1">
              {financeNavigationConfig.pillars.map((pillar) => {
                const accessiblePillarModules = pillar.modules.filter(module => 
                  hasAnyPermission(module.requiredPerm)
                );

                if (accessiblePillarModules.length === 0) {
                  return null;
                }

                const PillarIcon = pillar.icon;
                const isActive = activePillar === pillar.key;

                return (
                  <button
                    key={pillar.key}
                    onClick={() => handlePillarClick(pillar.key)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200"
                    style={{
                      backgroundColor: isActive ? '#00A9B7' : 'transparent',
                      color: isActive ? '#FFFFFF' : '#B8C5CE'
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
                  >
                    <PillarIcon className="w-5 h-5" style={{ strokeWidth: 2 }} />
                    <span className="text-sm flex-1 text-left" style={{ fontWeight: isActive ? '600' : '500' }}>
                      {pillar.label}
                    </span>
                    <ChevronRight className="w-4 h-4" style={{ opacity: 0.6 }} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Global Navigation */}
          <div>
            <div className="px-3 mb-3">
              <span className="text-xs uppercase tracking-wider" style={{ color: '#9AA6AF', fontWeight: '600' }}>
                Global
              </span>
            </div>
            <div className="space-y-1">
              {globalNavigationConfig.map(section => {
                if (!hasAnyPermission(section.requiredPerm)) {
                  return null;
                }

                const isActive = isActiveRoute(section.route);

                return (
                  <Link
                    key={section.key}
                    to={section.route}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200"
                    style={{
                      backgroundColor: isActive ? '#00A9B720' : 'transparent',
                      color: isActive ? '#00A9B7' : '#B8C5CE'
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
                  >
                    <section.icon className="w-4.5 h-4.5" style={{ strokeWidth: 2 }} />
                    <span className="text-sm flex-1" style={{ fontWeight: isActive ? '600' : '500' }}>
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
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="px-6 py-4" style={{ borderTop: '1px solid #3a4a52' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#00A9B7' }}>
              <span className="text-sm" style={{ color: '#FFFFFF', fontWeight: '600' }}>
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate" style={{ color: '#FFFFFF', fontWeight: '500' }}>
                {user?.name}
              </p>
              <p className="text-xs truncate" style={{ color: '#9AA6AF' }}>
                {currentRole?.roleName || 'User'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contextual Panel - Module Navigation */}
      {showContextualPanel && (
        <div 
          className="h-full flex flex-col"
          style={{ 
            width: '320px',
            backgroundColor: '#FFFFFF',
            borderRight: '1px solid #E1E6EA',
            boxShadow: '2px 0 8px rgba(0, 0, 0, 0.04)'
          }}
        >
          {/* Panel Header */}
          <div className="px-6 py-5" style={{ borderBottom: '1px solid #E1E6EA' }}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base" style={{ color: '#0A0F14', fontWeight: '700' }}>
                {selectedPillarData?.label}
              </h2>
              <button
                onClick={() => setShowContextualPanel(false)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: '#6E7A82' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F6F9FC'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs" style={{ color: '#6E7A82' }}>
              {accessibleModules.length} module{accessibleModules.length !== 1 ? 's' : ''} available
            </p>
          </div>

          {/* Module List */}
          <div className="flex-1 overflow-y-auto px-2 py-4">
            {accessibleModules.map(module => renderContextualModule(module))}
          </div>
        </div>
      )}
    </>
  );
}