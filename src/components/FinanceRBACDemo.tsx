import { useFinanceRBAC } from '../contexts/FinanceRBACContext';
import { Shield, Eye, Edit3, CheckCircle, Building2, Users, Lock, TrendingUp } from 'lucide-react';

export function FinanceRBACDemo() {
  const { currentRole, availableRoles, switchRole, currentCompany } = useFinanceRBAC();

  // Group permissions by pillar
  const permissionsByPillar = {
    'AP Automation': currentRole.permissions.filter(p => 
      p.startsWith('PROCUREMENT') || p.startsWith('AP_INVOICE') || 
      p.startsWith('PAYMENT') || p.startsWith('VENDOR') ||
      p.startsWith('SOURCING') || p.startsWith('BUDGET') ||
      p.startsWith('FIXED_ASSET')
    ),
    'AR Automation': currentRole.permissions.filter(p => 
      p.startsWith('CUSTOMER') || p.startsWith('AR_INVOICE') || 
      p.startsWith('COLLECTION') || p.startsWith('CREDIT_NOTE') ||
      p.startsWith('REVENUE')
    ),
    'R2R Automation': currentRole.permissions.filter(p => 
      p.startsWith('GENERAL_LEDGER') || p.startsWith('FINANCIAL_CLOSE') || 
      p.startsWith('FINANCIAL_STATEMENT') || p.startsWith('CONSOLIDATION') ||
      p.startsWith('CASHFLOW') || p.startsWith('VARIANCE')
    ),
    'Global Functions': currentRole.permissions.filter(p => 
      p.startsWith('DASHBOARD') || p.startsWith('APPROVALS') || 
      p.startsWith('TASKS') || p.startsWith('AUDIT_LOG') ||
      p.startsWith('SETTINGS') || p.startsWith('MASTERS') ||
      p.startsWith('REPORTS')
    )
  };

  const getPermissionIcon = (permission: string) => {
    if (permission.includes('.APPROVE') || permission.includes('.REJECT')) return CheckCircle;
    if (permission.includes('.CREATE') || permission.includes('.EDIT') || 
        permission.includes('.EXECUTE') || permission.includes('.POST') ||
        permission.includes('.MANAGE')) return Edit3;
    if (permission.includes('.VIEW')) return Eye;
    return Lock;
  };

  const getPermissionColor = (permission: string) => {
    if (permission.includes('.APPROVE') || permission.includes('.REJECT')) return '#0066CC';
    if (permission.includes('.CREATE') || permission.includes('.EDIT') || 
        permission.includes('.EXECUTE') || permission.includes('.POST') ||
        permission.includes('.MANAGE')) return '#16A34A';
    if (permission.includes('.VIEW')) return '#F59E0B';
    return '#64748B';
  };

  const getPermissionLabel = (permission: string) => {
    const parts = permission.split('.');
    return {
      resource: parts[0].replace(/_/g, ' '),
      action: parts[1]
    };
  };

  return (
    <div style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl mb-2" style={{ color: '#0A0F14', fontWeight: '700' }}>
            Enterprise Finance RBAC System
          </h1>
          <p style={{ color: '#64748B', fontSize: '16px' }}>
            Switch between roles to experience dynamic permission-based access control across AP, AR, and R2R modules
          </p>
        </div>

        {/* Current Context Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Company Card */}
          <div 
            className="bg-white rounded-xl p-6" 
            style={{ border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#EBF5FF' }}
              >
                <Building2 className="w-6 h-6" style={{ color: '#0066CC' }} />
              </div>
              <div>
                <div className="text-xs" style={{ color: '#64748B', fontWeight: '500' }}>
                  Current Company
                </div>
                <div className="text-lg" style={{ color: '#0A0F14', fontWeight: '700' }}>
                  {currentCompany.code}
                </div>
              </div>
            </div>
            <div className="text-sm" style={{ color: '#334155' }}>
              {currentCompany.name}
            </div>
          </div>

          {/* Role Card */}
          <div 
            className="bg-white rounded-xl p-6" 
            style={{ border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#F0FDF4' }}
              >
                <Shield className="w-6 h-6" style={{ color: '#16A34A' }} />
              </div>
              <div>
                <div className="text-xs" style={{ color: '#64748B', fontWeight: '500' }}>
                  Current Role
                </div>
                <div className="text-lg" style={{ color: '#0A0F14', fontWeight: '700' }}>
                  {currentRole.roleName}
                </div>
              </div>
            </div>
            <div className="text-sm" style={{ color: '#334155' }}>
              {currentRole.permissions.length} permissions granted
            </div>
          </div>

          {/* Access Summary Card */}
          <div 
            className="bg-white rounded-xl p-6" 
            style={{ border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#FEF3C7' }}
              >
                <TrendingUp className="w-6 h-6" style={{ color: '#D97706' }} />
              </div>
              <div>
                <div className="text-xs" style={{ color: '#64748B', fontWeight: '500' }}>
                  Module Access
                </div>
                <div className="text-lg" style={{ color: '#0A0F14', fontWeight: '700' }}>
                  {Object.values(permissionsByPillar).reduce((acc, perms) => acc + perms.length, 0)}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {permissionsByPillar['AP Automation'].length > 0 && (
                <span 
                  className="px-2 py-1 rounded text-xs"
                  style={{ backgroundColor: '#DBEAFE', color: '#1E3A8A', fontWeight: '600' }}
                >
                  AP
                </span>
              )}
              {permissionsByPillar['AR Automation'].length > 0 && (
                <span 
                  className="px-2 py-1 rounded text-xs"
                  style={{ backgroundColor: '#D1FAE5', color: '#065F46', fontWeight: '600' }}
                >
                  AR
                </span>
              )}
              {permissionsByPillar['R2R Automation'].length > 0 && (
                <span 
                  className="px-2 py-1 rounded text-xs"
                  style={{ backgroundColor: '#FEF3C7', color: '#78350F', fontWeight: '600' }}
                >
                  R2R
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Role Switcher */}
        <div 
          className="bg-white rounded-xl p-6 mb-8" 
          style={{ border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5" style={{ color: '#0066CC' }} />
            <h2 className="text-lg" style={{ color: '#0A0F14', fontWeight: '600' }}>
              Switch Role to Test RBAC
            </h2>
          </div>
          <p className="text-sm mb-6" style={{ color: '#64748B' }}>
            Click any role below to instantly switch and observe how the left navigation adapts. Only one primary pillar can be expanded at a time.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {availableRoles.map(role => {
              const isActive = role.roleId === currentRole.roleId;
              
              return (
                <button
                  key={role.roleId}
                  onClick={() => switchRole(role.roleId)}
                  className="p-4 rounded-lg text-left transition-all duration-200"
                  style={{
                    backgroundColor: isActive ? '#EBF5FF' : '#F8FAFC',
                    border: `2px solid ${isActive ? '#0066CC' : '#E2E8F0'}`,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = '#CBD5E1';
                      e.currentTarget.style.backgroundColor = '#F1F5F9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                    }
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Shield 
                      className="w-4 h-4" 
                      style={{ color: isActive ? '#0066CC' : '#64748B' }}
                    />
                    <span 
                      style={{ 
                        fontWeight: '600',
                        fontSize: '14px',
                        color: isActive ? '#0066CC' : '#0A0F14'
                      }}
                    >
                      {role.roleName}
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: '#64748B' }}>
                    {role.permissions.length} permissions
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Permissions by Pillar */}
        <div className="space-y-6">
          {Object.entries(permissionsByPillar).map(([pillar, permissions]) => {
            if (permissions.length === 0) return null;

            return (
              <div 
                key={pillar}
                className="bg-white rounded-xl p-6" 
                style={{ border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
              >
                <h2 className="text-lg mb-4 flex items-center gap-3" style={{ color: '#0A0F14', fontWeight: '600' }}>
                  <span>{pillar}</span>
                  <span 
                    className="px-2.5 py-1 rounded-full text-xs"
                    style={{ 
                      backgroundColor: '#F1F5F9',
                      color: '#334155',
                      fontWeight: '600'
                    }}
                  >
                    {permissions.length} permissions
                  </span>
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {permissions.map(permission => {
                    const PermIcon = getPermissionIcon(permission);
                    const color = getPermissionColor(permission);
                    const { resource, action } = getPermissionLabel(permission);

                    return (
                      <div 
                        key={permission}
                        className="flex items-center gap-3 p-3 rounded-lg transition-all"
                        style={{ 
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0'
                        }}
                      >
                        <div 
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${color}15` }}
                        >
                          <PermIcon className="w-4.5 h-4.5" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div 
                            className="text-sm truncate" 
                            style={{ color: '#0A0F14', fontWeight: '600' }}
                          >
                            {resource}
                          </div>
                          <div 
                            className="text-xs uppercase tracking-wide"
                            style={{ color, fontWeight: '600' }}
                          >
                            {action}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Banner */}
        <div 
          className="mt-8 p-6 rounded-xl" 
          style={{ 
            backgroundColor: '#EBF5FF',
            border: '1px solid #93C5FD'
          }}
        >
          <h3 className="text-sm mb-3 flex items-center gap-2" style={{ color: '#1E3A8A', fontWeight: '600' }}>
            <Shield className="w-4 h-4" />
            RBAC System Behavior
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#16A34A' }} />
                <span className="text-sm" style={{ color: '#1E3A8A', fontWeight: '600' }}>
                  Edit Access
                </span>
              </div>
              <p className="text-xs ml-4" style={{ color: '#1E40AF' }}>
                Modules with CREATE, EDIT, or MANAGE permissions show full access
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4" style={{ color: '#F59E0B' }} />
                <span className="text-sm" style={{ color: '#1E3A8A', fontWeight: '600' }}>
                  View-Only Access
                </span>
              </div>
              <p className="text-xs ml-4" style={{ color: '#1E40AF' }}>
                Modules with VIEW permission only display an eye icon (👁️)
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#DC2626' }} />
                <span className="text-sm" style={{ color: '#1E3A8A', fontWeight: '600' }}>
                  No Access
                </span>
              </div>
              <p className="text-xs ml-4" style={{ color: '#1E40AF' }}>
                Modules without permission are completely hidden (not greyed out)
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4" style={{ color: '#0066CC' }} />
                <span className="text-sm" style={{ color: '#1E3A8A', fontWeight: '600' }}>
                  Single Pillar Expansion
                </span>
              </div>
              <p className="text-xs ml-4" style={{ color: '#1E40AF' }}>
                Only one primary pillar (AP/AR/R2R) can be expanded at a time
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
