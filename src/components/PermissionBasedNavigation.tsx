import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Building2,
  Shield,
  RefreshCw,
  ChevronUp,
  Lock,
  Edit3,
  Eye,
  CheckCircle as ApproveIcon,
} from 'lucide-react';
import { usePermissionRBAC } from '../contexts/PermissionRBACContext';
import { useAuth } from '../contexts/AuthContext';
import { navigationConfig, globalNavigationConfig, NavItem, NavPillar } from '../config/navigationConfig';

export function PermissionBasedNavigation() {
  const location = useLocation();
  const { user } = useAuth();
  const { 
    currentRole, 
    availableRoles, 
    currentCompany, 
    availableCompanies,
    switchRole, 
    switchCompany,
    hasAnyPermission,
    hasPermission,
  } = usePermissionRBAC();

  const [expandedSection, setExpandedSection] = useState<string>('AP');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  // Check if user is admin (can switch roles)
  const isAdmin = currentRole.roleId === 'super-admin';

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? '' : sectionId);
  };

  const isActiveRoute = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Get permission type for an item
  const getPermissionType = (item: NavItem): 'edit' | 'view' | 'approve' | null => {
    // Check for create/edit permissions
    const editPerms = item.requiredPerm.filter(p => 
      p.includes('.CREATE') || p.includes('.EDIT') || p.includes('.MANAGE') || p.includes('.EXECUTE')
    );
    if (editPerms.some(p => hasPermission(p))) {
      return 'edit';
    }

    // Check for approve permissions
    const approvePerms = item.requiredPerm.filter(p => p.includes('.APPROVE'));
    if (approvePerms.some(p => hasPermission(p))) {
      return 'approve';
    }

    // Check for view permissions
    const viewPerms = item.requiredPerm.filter(p => p.includes('.VIEW'));
    if (viewPerms.some(p => hasPermission(p))) {
      return 'view';
    }

    return null;
  };

  const renderNavItem = (item: NavItem, level: number = 0) => {
    // Check if user has any of the required permissions
    if (!hasAnyPermission(item.requiredPerm)) {
      return null; // Hide if no access
    }

    const isActive = isActiveRoute(item.route);
    const permissionType = getPermissionType(item);
    const hasChildren = item.children && item.children.length > 0;
    const [isChildExpanded, setIsChildExpanded] = useState(false);

    const paddingLeft = isCollapsed ? 0 : level === 0 ? 16 : level === 1 ? 32 : 48;

    // Permission indicator icon
    const PermissionIcon = 
      permissionType === 'edit' ? Edit3 :
      permissionType === 'approve' ? ApproveIcon :
      permissionType === 'view' ? Eye : null;

    if (hasChildren && !isCollapsed) {
      // Filter accessible children
      const accessibleChildren = item.children?.filter(child => 
        hasAnyPermission(child.requiredPerm)
      ) || [];
      
      // If no accessible children, treat as regular link
      if (accessibleChildren.length === 0) {
        return renderNavItem({ ...item, children: undefined }, level);
      }

      return (
        <div key={item.key}>
          <button
            onClick={() => setIsChildExpanded(!isChildExpanded)}
            className="w-full flex items-center justify-between px-4 py-2 transition-colors group"
            style={{
              paddingLeft: `${paddingLeft}px`,
              backgroundColor: isActive ? '#00A9B720' : 'transparent',
              color: isActive ? '#00A9B7' : '#B8C5CE'
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.backgroundColor = '#3a4a52';
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm" style={{ fontWeight: isActive ? '600' : '400' }}>
                {item.label}
              </span>
              {PermissionIcon && permissionType === 'view' && (
                <PermissionIcon className="w-3.5 h-3.5" style={{ color: '#9AA6AF' }} title="View Only" />
              )}
              {item.badge && (
                <span 
                  className="px-2 py-0.5 rounded text-xs"
                  style={{ 
                    backgroundColor: '#8B5CF6',
                    color: '#FFFFFF',
                    fontWeight: '600'
                  }}
                >
                  {item.badge}
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
        key={item.key}
        to={item.route}
        className="flex items-center gap-3 px-4 py-2 transition-colors group"
        style={{
          paddingLeft: isCollapsed ? '16px' : `${paddingLeft}px`,
          backgroundColor: isActive ? '#00A9B720' : 'transparent',
          color: isActive ? '#00A9B7' : '#B8C5CE',
          justifyContent: isCollapsed ? 'center' : 'flex-start'
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = '#3a4a52';
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title={isCollapsed ? item.label : ''}
      >
        <item.icon className="w-4 h-4 flex-shrink-0" />
        {!isCollapsed && (
          <>
            <span className="text-sm flex-1" style={{ fontWeight: isActive ? '600' : '400' }}>
              {item.label}
            </span>
            {PermissionIcon && permissionType === 'view' && (
              <PermissionIcon className="w-3.5 h-3.5" style={{ color: '#9AA6AF' }} title="View Only" />
            )}
            {item.badge && (
              <span 
                className="px-2 py-0.5 rounded text-xs"
                style={{ 
                  backgroundColor: '#8B5CF6',
                  color: '#FFFFFF',
                  fontWeight: '600'
                }}
              >
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  const renderPillar = (pillar: NavPillar) => {
    const isExpanded = expandedSection === pillar.key;
    const PillarIcon = pillar.icon;

    // Filter accessible items
    const accessibleItems = pillar.items.filter(item => 
      hasAnyPermission(item.requiredPerm)
    );

    // Hide pillar if no accessible items
    if (accessibleItems.length === 0) {
      return null;
    }

    return (
      <div key={pillar.key} style={{ borderBottom: '1px solid #3a4a52' }}>
        {/* Pillar Header */}
        <button
          onClick={() => toggleSection(pillar.key)}
          className="w-full flex items-center justify-between px-4 py-3 transition-colors"
          style={{
            backgroundColor: isExpanded ? '#3a4a52' : 'transparent',
            color: isExpanded ? '#FFFFFF' : '#9AA6AF',
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
            <PillarIcon className="w-5 h-5 flex-shrink-0" style={{ color: '#00A9B7' }} />
            {!isCollapsed && (
              <span style={{ fontWeight: '600', fontSize: '14px' }}>
                {pillar.label}
              </span>
            )}
          </div>
          {!isCollapsed && (
            isExpanded ? (
              <ChevronDown className="w-4 h-4" style={{ color: isExpanded ? '#FFFFFF' : '#9AA6AF' }} />
            ) : (
              <ChevronRight className="w-4 h-4" style={{ color: isExpanded ? '#FFFFFF' : '#9AA6AF' }} />
            )
          )}
        </button>

        {/* Pillar Content */}
        {isExpanded && (
          <div className="py-2">
            {accessibleItems.map(item => renderNavItem(item))}
          </div>
        )}
      </div>
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
                <Building2 className="w-5 h-5" style={{ color: '#00A9B7' }} />
                <div className="text-left">
                  <div className="text-xs" style={{ color: '#9AA6AF' }}>Company</div>
                  <div className="text-sm" style={{ fontWeight: '600' }}>{currentCompany.code}</div>
                </div>
              </div>
              {showCompanyDropdown ? (
                <ChevronUp className="w-4 h-4" style={{ color: '#9AA6AF' }} />
              ) : (
                <ChevronDown className="w-4 h-4" style={{ color: '#9AA6AF' }} />
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
                      backgroundColor: company.id === currentCompany.id ? '#00A9B720' : 'transparent',
                      color: company.id === currentCompany.id ? '#00A9B7' : '#B8C5CE',
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
                    <div className="text-xs mt-0.5" style={{ color: '#9AA6AF' }}>{company.name}</div>
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
              style={{ backgroundColor: '#00A9B7', color: '#FFFFFF', fontWeight: '600' }}
            >
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate" style={{ color: '#FFFFFF', fontWeight: '600' }}>
                {user?.name || 'User'}
              </div>
              <div className="text-xs truncate" style={{ color: '#9AA6AF' }}>
                {user?.email || 'user@example.com'}
              </div>
            </div>
          </div>

          {/* Current Role Badge */}
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4" style={{ color: '#00A9B7' }} />
            <span className="text-xs" style={{ color: '#9AA6AF' }}>Current Role:</span>
          </div>
          <div 
            className="px-3 py-2 rounded-lg mb-2"
            style={{ backgroundColor: '#00A9B720', border: '1px solid #00A9B7' }}
          >
            <span className="text-sm" style={{ color: '#00A9B7', fontWeight: '600' }}>
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
                        backgroundColor: role.roleId === currentRole.roleId ? '#00A9B720' : 'transparent',
                        color: role.roleId === currentRole.roleId ? '#00A9B7' : '#B8C5CE',
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
          <span className="text-xs uppercase tracking-wider" style={{ color: '#9AA6AF', fontWeight: '600' }}>
            Navigation
          </span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: '#9AA6AF' }}
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
        {navigationConfig.pillars.map(pillar => renderPillar(pillar))}
      </div>

      {/* Global Sections */}
      <div className="p-4" style={{ borderTop: '1px solid #3a4a52' }}>
        {!isCollapsed && (
          <div className="mb-2 px-2">
            <span className="text-xs uppercase tracking-wider" style={{ color: '#9AA6AF', fontWeight: '600' }}>
              Global
            </span>
          </div>
        )}
        {globalNavigationConfig.map(section => {
          // Check if user has any of the required permissions
          if (!hasAnyPermission(section.requiredPerm)) {
            return null;
          }

          const isActive = isActiveRoute(section.route);
          const permissionType = section.requiredPerm.some(p => 
            p.includes('.EDIT') || p.includes('.MANAGE')
          ) ? 'edit' : 'view';

          return (
            <Link
              key={section.key}
              to={section.route}
              className="flex items-center gap-3 px-4 py-2 rounded-lg transition-colors mb-1"
              style={{
                backgroundColor: isActive ? '#00A9B720' : 'transparent',
                color: isActive ? '#00A9B7' : '#B8C5CE',
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
                  {permissionType === 'view' && (
                    <Eye className="w-3.5 h-3.5" style={{ color: '#9AA6AF' }} title="View Only" />
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