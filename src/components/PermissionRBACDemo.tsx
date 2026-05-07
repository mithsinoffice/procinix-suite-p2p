import { usePermissionRBAC, ALL_PERMISSIONS } from '../contexts/PermissionRBACContext';
import { Shield, Eye, Edit3, CheckCircle, Building2, Users, Lock, Unlock } from 'lucide-react';

export function PermissionRBACDemo() {
  const { currentRole, availableRoles, switchRole, currentCompany } = usePermissionRBAC();

  // Group permissions by category
  const permissionCategories = {
    'AP Automation': currentRole.permissions.filter(
      (p) =>
        p.startsWith('AP_INVOICE') ||
        p.startsWith('PAYMENT_RUN') ||
        p.startsWith('PURCHASE_ORDER') ||
        p.startsWith('GRN') ||
        p.startsWith('VENDOR') ||
        p.startsWith('CASHFLOW')
    ),
    'AR Automation': currentRole.permissions.filter(
      (p) =>
        p.startsWith('AR_INVOICE') ||
        p.startsWith('CUSTOMER') ||
        p.startsWith('COLLECTION') ||
        p.startsWith('CREDIT_MGMT')
    ),
    'R2R Automation': currentRole.permissions.filter(
      (p) =>
        p.startsWith('GENERAL_LEDGER') ||
        p.startsWith('RECONCILIATION') ||
        p.startsWith('FINANCIAL_CLOSE') ||
        p.startsWith('CONSOLIDATION')
    ),
    'Masters & Reports': currentRole.permissions.filter(
      (p) => p.startsWith('MASTERS') || p.startsWith('REPORTS')
    ),
    'Global Functions': currentRole.permissions.filter(
      (p) =>
        p.startsWith('DASHBOARD') ||
        p.startsWith('APPROVALS') ||
        p.startsWith('TASKS') ||
        p.startsWith('AUDIT_LOG') ||
        p.startsWith('SETTINGS') ||
        p.startsWith('AI_CAPTURE')
    ),
  };

  const getPermissionIcon = (permission: string) => {
    if (permission.includes('.APPROVE') || permission.includes('.REJECT')) return CheckCircle;
    if (
      permission.includes('.CREATE') ||
      permission.includes('.EDIT') ||
      permission.includes('.DELETE') ||
      permission.includes('.MANAGE') ||
      permission.includes('.EXECUTE') ||
      permission.includes('.POST')
    )
      return Edit3;
    if (permission.includes('.VIEW')) return Eye;
    return Lock;
  };

  const getPermissionColor = (permission: string) => {
    if (permission.includes('.APPROVE') || permission.includes('.REJECT'))
      return 'var(--color-teal)';
    if (
      permission.includes('.CREATE') ||
      permission.includes('.EDIT') ||
      permission.includes('.DELETE') ||
      permission.includes('.MANAGE') ||
      permission.includes('.EXECUTE') ||
      permission.includes('.POST')
    )
      return '#10B981';
    if (permission.includes('.VIEW')) return '#F59E0B';
    return 'var(--color-mercury-grey)';
  };

  const getPermissionLabel = (permission: string) => {
    const parts = permission.split('.');
    return {
      resource: parts[0].replace(/_/g, ' '),
      action: parts[1],
    };
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl mb-2" style={{ color: 'var(--color-ink)' }}>
            Permission-Based RBAC Demo
          </h1>
          <p style={{ color: 'var(--color-mercury-grey)' }}>
            Switch between roles to see granular permission-based access control in action
          </p>
        </div>

        {/* Current Context */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Company Info */}
          <div
            className="bg-white rounded-xl p-6"
            style={{ border: '2px solid var(--color-silver)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-teal)10' }}
              >
                <Building2 className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
              </div>
              <h2 className="text-lg" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                Current Company
              </h2>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  Code:{' '}
                </span>
                <span style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                  {currentCompany.code}
                </span>
              </div>
              <div>
                <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  Name:{' '}
                </span>
                <span style={{ color: 'var(--color-ink)' }}>{currentCompany.name}</span>
              </div>
            </div>
          </div>

          {/* Current Role */}
          <div
            className="bg-white rounded-xl p-6"
            style={{ border: '2px solid var(--color-silver)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-teal)10' }}
              >
                <Shield className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
              </div>
              <h2 className="text-lg" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                Current Role
              </h2>
            </div>
            <div className="space-y-3">
              <div
                className="px-4 py-3 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-teal)20',
                  border: '2px solid var(--color-teal)',
                }}
              >
                <span className="text-lg" style={{ color: 'var(--color-teal)', fontWeight: '600' }}>
                  {currentRole.roleName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Unlock className="w-4 h-4" style={{ color: '#10B981' }} />
                <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  {currentRole.permissions.length} permissions granted
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Role Switcher */}
        <div
          className="bg-white rounded-xl p-6 mb-8"
          style={{ border: '2px solid var(--color-silver)' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
            <h2 className="text-lg" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
              Switch Role to Test RBAC
            </h2>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--color-mercury-grey)' }}>
            Click on any role to switch and see how permissions and navigation change dynamically
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {availableRoles.map((role) => (
              <button
                key={role.roleId}
                onClick={() => switchRole(role.roleId)}
                className="p-4 rounded-lg text-left transition-all"
                style={{
                  backgroundColor:
                    role.roleId === currentRole.roleId
                      ? 'var(--color-teal)20'
                      : 'var(--color-cloud)',
                  border: `2px solid ${role.roleId === currentRole.roleId ? 'var(--color-teal)' : 'var(--color-silver)'}`,
                  color:
                    role.roleId === currentRole.roleId ? 'var(--color-teal)' : 'var(--color-ink)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4" />
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>{role.roleName}</span>
                </div>
                <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                  {role.permissions.length} permissions
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Permissions by Category */}
        <div className="space-y-6">
          {Object.entries(permissionCategories).map(([category, permissions]) => {
            if (permissions.length === 0) return null;

            return (
              <div
                key={category}
                className="bg-white rounded-xl p-6"
                style={{ border: '2px solid var(--color-silver)' }}
              >
                <h2
                  className="text-lg mb-4 flex items-center gap-2"
                  style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                >
                  {category}
                  <span
                    className="px-2 py-0.5 rounded text-xs"
                    style={{
                      backgroundColor: 'var(--color-cloud)',
                      color: 'var(--color-mercury-grey)',
                      fontWeight: '600',
                    }}
                  >
                    {permissions.length}
                  </span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {permissions.map((permission) => {
                    const PermIcon = getPermissionIcon(permission);
                    const color = getPermissionColor(permission);
                    const { resource, action } = getPermissionLabel(permission);

                    return (
                      <div
                        key={permission}
                        className="flex items-center gap-3 p-3 rounded-lg"
                        style={{
                          backgroundColor: 'var(--color-cloud)',
                          border: '1px solid var(--color-silver)',
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${color}20` }}
                        >
                          <PermIcon className="w-4 h-4" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-sm truncate"
                            style={{ color: 'var(--color-ink)', fontWeight: '500' }}
                          >
                            {resource}
                          </div>
                          <div className="text-xs" style={{ color }}>
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

        {/* Permission Key */}
        <div
          className="mt-8 p-6 rounded-lg"
          style={{ backgroundColor: '#DBEAFE', border: '1px solid #3B82F6' }}
        >
          <h3 className="text-sm mb-3" style={{ color: '#1E3A8A', fontWeight: '600' }}>
            📋 Permission Types Explained
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded flex items-center justify-center"
                style={{ backgroundColor: '#10B98120' }}
              >
                <Edit3 className="w-3.5 h-3.5" style={{ color: '#10B981' }} />
              </div>
              <div>
                <div className="text-xs" style={{ color: '#1E3A8A', fontWeight: '600' }}>
                  Edit Permissions
                </div>
                <div className="text-xs" style={{ color: '#1E3A8A' }}>
                  CREATE, EDIT, DELETE, MANAGE
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-teal)20' }}
              >
                <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--color-teal)' }} />
              </div>
              <div>
                <div className="text-xs" style={{ color: '#1E3A8A', fontWeight: '600' }}>
                  Approve Permissions
                </div>
                <div className="text-xs" style={{ color: '#1E3A8A' }}>
                  APPROVE, REJECT
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded flex items-center justify-center"
                style={{ backgroundColor: '#F59E0B20' }}
              >
                <Eye className="w-3.5 h-3.5" style={{ color: '#F59E0B' }} />
              </div>
              <div>
                <div className="text-xs" style={{ color: '#1E3A8A', fontWeight: '600' }}>
                  View Permissions
                </div>
                <div className="text-xs" style={{ color: '#1E3A8A' }}>
                  VIEW, READ
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid #3B82F6' }}>
            <p className="text-xs" style={{ color: '#1E3A8A' }}>
              <strong>💡 Tip:</strong> Switch roles above and watch the left navigation
              automatically update. Items you can only view show an eye icon (👁️). Items without any
              permission are completely hidden from the navigation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
