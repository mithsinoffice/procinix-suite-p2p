import { useState, useMemo } from 'react';
import {
  Check,
  X,
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  Shield,
  Settings,
  Eye,
  Edit3,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  roles,
  modules,
  permissionMatrix,
  type PermissionAction,
  type Role,
  type Module,
} from '../data/permissionMatrixData';

export function RolePermissionMatrix() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const actions: { id: PermissionAction; label: string; icon: any }[] = [
    { id: 'view', label: 'View', icon: Eye },
    { id: 'create', label: 'Create', icon: Edit3 },
    { id: 'edit', label: 'Edit', icon: Edit3 },
    { id: 'approve', label: 'Approve', icon: CheckCircle },
    { id: 'export', label: 'Export', icon: Download },
    { id: 'configure', label: 'Configure', icon: Settings },
  ];

  // Filter modules based on search and section
  const filteredModules = useMemo(() => {
    let filtered = modules;

    if (selectedSection !== 'all') {
      filtered = filtered.filter((m) => m.section === selectedSection);
    }

    if (searchQuery) {
      filtered = filtered.filter((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    return filtered;
  }, [searchQuery, selectedSection]);

  // Filter roles
  const filteredRoles = useMemo(() => {
    if (selectedRole === 'all') {
      return roles;
    }
    return roles.filter((r) => r.id === selectedRole);
  }, [selectedRole]);

  // Group modules by section
  const modulesBySection = useMemo(() => {
    const groups: { [key: string]: Module[] } = {};
    filteredModules.forEach((module) => {
      if (!groups[module.section]) {
        groups[module.section] = [];
      }
      groups[module.section].push(module);
    });
    return groups;
  }, [filteredModules]);

  const sections = ['AP Automation', 'AR Automation', 'R2R Automation'];

  const handleExport = () => {
    console.log('Exporting permission matrix...');
    // In production, this would generate a CSV or Excel file
  };

  const getPermissionCount = (roleId: string, action: PermissionAction) => {
    return modules.filter((module) => permissionMatrix[roleId]?.[module.id]?.[action]).length;
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      {/* Header */}
      <div
        className="px-8 py-6"
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '2px solid var(--color-silver)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl mb-1" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
              Role-Permission Matrix
            </h1>
            <p style={{ color: 'var(--color-mercury-grey)', fontSize: '14px' }}>
              Manage access control across all finance automation modules
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: showFilters ? 'var(--color-teal)10' : '#FFFFFF',
                border: `1px solid ${showFilters ? 'var(--color-teal)' : 'var(--color-silver)'}`,
                color: showFilters ? 'var(--color-teal)' : 'var(--color-mercury-grey)',
              }}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm" style={{ fontWeight: '500' }}>
                Filters
              </span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: 'var(--color-teal)',
                color: '#FFFFFF',
                border: '1px solid var(--color-teal-dark)',
              }}
            >
              <Download className="w-4 h-4" />
              <span className="text-sm" style={{ fontWeight: '600' }}>
                Export Matrix
              </span>
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg"
            style={{
              backgroundColor: 'var(--color-cloud)',
              border: '1px solid var(--color-silver)',
            }}
          >
            {/* Search */}
            <div>
              <label
                className="block text-xs mb-2"
                style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
              >
                Search Modules
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--color-slate)' }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by module name..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--color-silver)',
                    color: 'var(--color-ink)',
                  }}
                />
              </div>
            </div>

            {/* Section Filter */}
            <div>
              <label
                className="block text-xs mb-2"
                style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
              >
                Filter by Section
              </label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full px-4 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--color-silver)',
                  color: 'var(--color-ink)',
                }}
              >
                <option value="all">All Sections</option>
                {sections.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Filter */}
            <div>
              <label
                className="block text-xs mb-2"
                style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
              >
                Filter by Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-4 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--color-silver)',
                  color: 'var(--color-ink)',
                }}
              >
                <option value="all">All Roles</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Matrix Container */}
      <div className="p-8">
        <div
          className="bg-white rounded-lg overflow-hidden"
          style={{
            border: '1px solid var(--color-silver)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          {/* Table Container with Horizontal Scroll */}
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: '1200px' }}>
              {/* Table Header */}
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--color-cloud)',
                    borderBottom: '2px solid var(--color-silver)',
                  }}
                >
                  {/* Sticky Role Column Header */}
                  <th
                    className="text-left px-6 py-4"
                    style={{
                      position: 'sticky',
                      left: 0,
                      backgroundColor: 'var(--color-cloud)',
                      zIndex: 20,
                      minWidth: '200px',
                      borderRight: '2px solid var(--color-silver)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                      <span
                        style={{
                          color: 'var(--color-ink)',
                          fontWeight: '700',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                        }}
                      >
                        Role
                      </span>
                    </div>
                  </th>

                  {/* Module Header */}
                  <th
                    className="text-left px-4 py-4"
                    style={{
                      minWidth: '180px',
                      borderRight: '1px solid var(--color-silver)',
                    }}
                  >
                    <span
                      style={{
                        color: 'var(--color-ink)',
                        fontWeight: '700',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                      }}
                    >
                      Module
                    </span>
                  </th>

                  {/* Action Headers */}
                  {actions.map((action, idx) => (
                    <th
                      key={action.id}
                      className="text-center px-3 py-4"
                      style={{
                        minWidth: '100px',
                        borderRight:
                          idx < actions.length - 1 ? '1px solid var(--color-silver)' : 'none',
                      }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <action.icon
                          className="w-4 h-4"
                          style={{ color: 'var(--color-mercury-grey)' }}
                        />
                        <span
                          style={{ color: 'var(--color-ink)', fontWeight: '600', fontSize: '11px' }}
                        >
                          {action.label}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {filteredRoles.map((role, roleIndex) => {
                  const moduleCount = filteredModules.length;

                  return filteredModules.map((module, moduleIndex) => {
                    const isFirstModuleOfRole = moduleIndex === 0;
                    const isNewSection =
                      moduleIndex === 0 ||
                      filteredModules[moduleIndex - 1].section !== module.section;
                    const permissions = permissionMatrix[role.id]?.[module.id];

                    return (
                      <tr
                        key={`${role.id}-${module.id}`}
                        style={{
                          backgroundColor: roleIndex % 2 === 0 ? '#FFFFFF' : '#FAFBFC',
                          borderBottom: '1px solid var(--color-silver)',
                        }}
                      >
                        {/* Sticky Role Cell */}
                        {isFirstModuleOfRole && (
                          <td
                            rowSpan={moduleCount}
                            className="px-6 py-4"
                            style={{
                              position: 'sticky',
                              left: 0,
                              backgroundColor: roleIndex % 2 === 0 ? '#FFFFFF' : '#FAFBFC',
                              zIndex: 10,
                              borderRight: '2px solid var(--color-silver)',
                              verticalAlign: 'top',
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${role.color}15` }}
                              >
                                <Shield className="w-5 h-5" style={{ color: role.color }} />
                              </div>
                              <div>
                                <div
                                  style={{
                                    color: 'var(--color-ink)',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                  }}
                                >
                                  {role.name}
                                </div>
                                <div
                                  className="text-xs mt-1"
                                  style={{ color: 'var(--color-mercury-grey)', lineHeight: '1.4' }}
                                >
                                  {role.description}
                                </div>

                                {/* Permission Summary */}
                                <div className="flex flex-wrap gap-1 mt-3">
                                  {actions.map((action) => {
                                    const count = getPermissionCount(role.id, action.id);
                                    if (count === 0) return null;
                                    return (
                                      <div
                                        key={action.id}
                                        className="px-2 py-0.5 rounded text-xs"
                                        style={{
                                          backgroundColor: 'var(--color-cloud)',
                                          color: 'var(--color-mercury-grey)',
                                          fontWeight: '600',
                                        }}
                                        title={`${count} modules with ${action.label} permission`}
                                      >
                                        {count} {action.label.toLowerCase()}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </td>
                        )}

                        {/* Module Cell with Section Header */}
                        <td
                          className="px-4 py-3"
                          style={{ borderRight: '1px solid var(--color-silver)' }}
                        >
                          {isNewSection && (
                            <div
                              className="mb-2 pb-2"
                              style={{ borderBottom: '2px solid var(--color-silver)' }}
                            >
                              <span
                                className="text-xs uppercase tracking-wider"
                                style={{
                                  color: 'var(--color-teal)',
                                  fontWeight: '700',
                                }}
                              >
                                {module.section}
                              </span>
                            </div>
                          )}
                          <div
                            style={{
                              color: 'var(--color-ink)',
                              fontWeight: '500',
                              fontSize: '14px',
                            }}
                          >
                            {module.name}
                          </div>
                        </td>

                        {/* Permission Cells */}
                        {actions.map((action, idx) => {
                          const hasPermission = permissions?.[action.id] || false;

                          return (
                            <td
                              key={action.id}
                              className="text-center px-3 py-3"
                              style={{
                                borderRight:
                                  idx < actions.length - 1
                                    ? '1px solid var(--color-silver)'
                                    : 'none',
                              }}
                            >
                              <div className="flex justify-center">
                                {hasPermission ? (
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: 'var(--color-teal)15' }}
                                  >
                                    <Check
                                      className="w-5 h-5"
                                      style={{ color: 'var(--color-teal)', strokeWidth: 2.5 }}
                                    />
                                  </div>
                                ) : (
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: 'var(--color-cloud)' }}
                                  >
                                    <X
                                      className="w-4 h-4"
                                      style={{ color: '#CBD5E1', strokeWidth: 2 }}
                                    />
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div
            className="bg-white rounded-lg p-4"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#3B82F615' }}
              >
                <Shield className="w-5 h-5" style={{ color: '#3B82F6' }} />
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                  Total Roles
                </div>
                <div className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
                  {filteredRoles.length}
                </div>
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-lg p-4"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#10B98115' }}
              >
                <FileSpreadsheet className="w-5 h-5" style={{ color: '#10B981' }} />
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                  Total Modules
                </div>
                <div className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
                  {filteredModules.length}
                </div>
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-lg p-4"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#F59E0B15' }}
              >
                <Settings className="w-5 h-5" style={{ color: '#F59E0B' }} />
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                  Sections
                </div>
                <div className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
                  {selectedSection === 'all' ? 3 : 1}
                </div>
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-lg p-4"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-teal)15' }}
              >
                <Check className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                  Total Permissions
                </div>
                <div className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
                  {filteredRoles.reduce((total, role) => {
                    return (
                      total +
                      filteredModules.reduce((moduleTotal, module) => {
                        const perms = permissionMatrix[role.id]?.[module.id];
                        return (
                          moduleTotal + (perms ? Object.values(perms).filter(Boolean).length : 0)
                        );
                      }, 0)
                    );
                  }, 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
