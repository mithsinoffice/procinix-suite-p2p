import { useRBAC } from '../contexts/RBACContext';
import { Shield, Eye, Edit3, CheckCircle, X, Building2, Users } from 'lucide-react';

export function RBACDemo() {
  const { currentRole, availableRoles, switchRole, currentCompany } = useRBAC();

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case 'edit': return '#10B981';
      case 'view': return '#F59E0B';
      case 'approve': return 'var(--color-teal)';
      case 'none': return '#EF4444';
      default: return 'var(--color-mercury-grey)';
    }
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'edit': return Edit3;
      case 'view': return Eye;
      case 'approve': return CheckCircle;
      case 'none': return X;
      default: return Shield;
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl mb-2" style={{ color: 'var(--color-ink)' }}>
            Role-Based Access Control Demo
          </h1>
          <p style={{ color: 'var(--color-mercury-grey)' }}>
            Switch between roles to see how the navigation and permissions change dynamically
          </p>
        </div>

        {/* Current Context */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Company Info */}
          <div className="bg-white rounded-xl p-6" style={{ border: '2px solid var(--color-silver)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-teal)10' }}>
                <Building2 className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
              </div>
              <h2 className="text-lg" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>Current Company</h2>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Code: </span>
                <span style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{currentCompany.code}</span>
              </div>
              <div>
                <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Name: </span>
                <span style={{ color: 'var(--color-ink)' }}>{currentCompany.name}</span>
              </div>
            </div>
          </div>

          {/* Current Role */}
          <div className="bg-white rounded-xl p-6" style={{ border: '2px solid var(--color-silver)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-teal)10' }}>
                <Shield className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
              </div>
              <h2 className="text-lg" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>Current Role</h2>
            </div>
            <div className="space-y-3">
              <div 
                className="px-4 py-3 rounded-lg"
                style={{ backgroundColor: 'var(--color-teal)20', border: '2px solid var(--color-teal)' }}
              >
                <span className="text-lg" style={{ color: 'var(--color-teal)', fontWeight: '600' }}>
                  {currentRole.roleName}
                </span>
              </div>
              <div className="flex gap-2">
                {currentRole.pillars.ap && (
                  <span className="px-3 py-1 rounded text-xs" style={{ backgroundColor: '#D1FAE5', color: '#065F46', fontWeight: '600' }}>
                    AP Access
                  </span>
                )}
                {currentRole.pillars.ar && (
                  <span className="px-3 py-1 rounded text-xs" style={{ backgroundColor: '#DBEAFE', color: '#1E3A8A', fontWeight: '600' }}>
                    AR Access
                  </span>
                )}
                {currentRole.pillars.r2r && (
                  <span className="px-3 py-1 rounded text-xs" style={{ backgroundColor: '#FEF3C7', color: '#78350F', fontWeight: '600' }}>
                    R2R Access
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Role Switcher */}
        <div className="bg-white rounded-xl p-6 mb-8" style={{ border: '2px solid var(--color-silver)' }}>
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
            <h2 className="text-lg" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>Switch Role to Test RBAC</h2>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--color-mercury-grey)' }}>
            Click on any role to switch and see how the navigation changes
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {availableRoles.map(role => (
              <button
                key={role.roleId}
                onClick={() => switchRole(role.roleId)}
                className="p-4 rounded-lg text-left transition-all"
                style={{
                  backgroundColor: role.roleId === currentRole.roleId ? 'var(--color-teal)20' : 'var(--color-cloud)',
                  border: `2px solid ${role.roleId === currentRole.roleId ? 'var(--color-teal)' : 'var(--color-silver)'}`,
                  color: role.roleId === currentRole.roleId ? 'var(--color-teal)' : 'var(--color-ink)'
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4" />
                  <span style={{ fontWeight: '600' }}>{role.roleName}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {role.pillars.ap && (
                    <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
                      AP
                    </span>
                  )}
                  {role.pillars.ar && (
                    <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: '#DBEAFE', color: '#1E3A8A' }}>
                      AR
                    </span>
                  )}
                  {role.pillars.r2r && (
                    <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: '#FEF3C7', color: '#78350F' }}>
                      R2R
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Current Permissions */}
        <div className="bg-white rounded-xl p-6" style={{ border: '2px solid var(--color-silver)' }}>
          <h2 className="text-lg mb-4" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
            Current Role Permissions
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
                <tr>
                  <th className="text-left px-4 py-3 text-sm" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>
                    Module Path
                  </th>
                  <th className="text-left px-4 py-3 text-sm" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>
                    Permission Level
                  </th>
                  <th className="text-left px-4 py-3 text-sm" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>
                    Access Type
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentRole.modules.map((module, index) => {
                  const PermissionIcon = getPermissionIcon(module.permission);
                  const permissionColor = getPermissionColor(module.permission);

                  return (
                    <tr key={index} style={{ borderTop: '1px solid var(--color-silver)' }}>
                      <td className="px-4 py-3">
                        <code className="text-sm px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-cloud)', color: 'var(--color-ink)' }}>
                          {module.modulePath}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <PermissionIcon className="w-4 h-4" style={{ color: permissionColor }} />
                          <span 
                            className="px-3 py-1 rounded text-xs uppercase"
                            style={{ 
                              backgroundColor: `${permissionColor}20`,
                              color: permissionColor,
                              fontWeight: '600'
                            }}
                          >
                            {module.permission}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                        {module.permission === 'edit' && 'Full Read & Write Access'}
                        {module.permission === 'view' && 'Read-Only Access'}
                        {module.permission === 'approve' && 'Approval Rights'}
                        {module.permission === 'none' && 'No Access'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 rounded-lg" style={{ backgroundColor: '#DBEAFE', border: '1px solid #3B82F6' }}>
          <p className="text-sm" style={{ color: '#1E3A8A' }}>
            <strong>💡 Tip:</strong> Switch roles above and observe how the left navigation dynamically shows/hides sections based on permissions. 
            Modules with view-only access will show an eye icon (👁️). The navigation automatically hides pillars and modules you don't have access to.
          </p>
        </div>
      </div>
    </div>
  );
}
