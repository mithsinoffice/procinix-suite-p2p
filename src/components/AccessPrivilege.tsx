import { useState } from 'react';
import { Shield, Lock, Eye, Edit, Trash2, Check, X as XIcon, Search } from 'lucide-react';
import { useMasterData } from '../contexts/MasterDataContext';

interface AccessRule {
  id: string;
  role: string;
  module: string;
  entityIds: string[];
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canExport: boolean;
}

const modules = [
  'Purchase Orders', 'Goods Receipt', 'Vendors', 'Reports',
  'Category Master', 'Item Master', 'Product Master', 'Color Master',
  'Size Master', 'SKU Master', 'Contract Master', 'Country Master',
  'State Master', 'Tax Code Master', 'Employee Master', 'Department Master',
  'User Master', 'Roles Master', 'Workflow Configurator'
];

const roles = ['Admin', 'PO Creator', 'PO Approver', 'GRN Manager', 'Location Manager', 'Viewer'];

const mockAccessRules: AccessRule[] = [
  { id: '1', role: 'Admin', module: 'Purchase Orders', entityIds: ['ALL'], canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true, canExport: true },
  { id: '2', role: 'PO Creator', module: 'Purchase Orders', entityIds: ['ALL'], canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: false, canExport: true },
  { id: '3', role: 'PO Approver', module: 'Purchase Orders', entityIds: ['ALL'], canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: true, canExport: true },
];

export function AccessPrivilege() {
  const { availableCompanies } = useMasterData();
  const [accessRules, setAccessRules] = useState<AccessRule[]>(mockAccessRules);
  const [selectedRole, setSelectedRole] = useState('Admin');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>(['ALL']);

  const toggleEntityScope = (entityId: string) => {
    if (entityId === 'ALL') {
      setSelectedEntityIds(['ALL']);
      return;
    }

    setSelectedEntityIds((current) => {
      const withoutAll = current.filter((id) => id !== 'ALL');
      if (withoutAll.includes(entityId)) {
        const next = withoutAll.filter((id) => id !== entityId);
        return next.length > 0 ? next : ['ALL'];
      }

      return [...withoutAll, entityId];
    });
  };

  const entityScopeLabel = selectedEntityIds.includes('ALL')
    ? 'All Entities'
    : availableCompanies
        .filter((company) => selectedEntityIds.includes(company.id))
        .map((company) => company.code)
        .join(', ');

  const getRoleAccessRules = () => {
    return modules.map(module => {
      const existing = accessRules.find(r =>
        r.role === selectedRole &&
        r.module === module &&
        JSON.stringify([...r.entityIds].sort()) === JSON.stringify([...selectedEntityIds].sort())
      );
      return existing || {
        id: `new-${module}`,
        role: selectedRole,
        module,
        entityIds: selectedEntityIds,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canApprove: false,
        canExport: false
      };
    }).filter(rule => rule.module.toLowerCase().includes(searchTerm.toLowerCase()));
  };

  const togglePermission = (module: string, permission: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canApprove' | 'canExport') => {
    const existingRule = accessRules.find(r =>
      r.role === selectedRole &&
      r.module === module &&
      JSON.stringify([...r.entityIds].sort()) === JSON.stringify([...selectedEntityIds].sort())
    );
    
    if (existingRule) {
      setAccessRules(accessRules.map(r => 
        r.id === existingRule.id ? { ...r, [permission]: !r[permission] } : r
      ));
    } else {
      const newRule: AccessRule = {
        id: Date.now().toString(),
        role: selectedRole,
        module,
        entityIds: selectedEntityIds,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canApprove: false,
        canExport: false,
        [permission]: true
      };
      setAccessRules([...accessRules, newRule]);
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', color: 'var(--color-ink)', margin: 0 }}>
          Access Privilege Management
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-mercury-grey)', margin: '4px 0 0 0' }}>
          Configure module-level permissions for each role
        </p>
      </div>

      {/* Role Selector */}
      <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '16px' }}>
        <div 
          className="rounded-lg" 
          style={{ 
            backgroundColor: '#FFFFFF', 
            border: '1px solid var(--color-silver)',
            padding: '16px'
          }}
        >
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-ink)', marginBottom: '8px' }}>
            Select Role
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--color-silver)',
              borderRadius: '8px',
              fontSize: '14px',
              color: 'var(--color-ink)',
              outline: 'none'
            }}
          >
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        <div 
          className="rounded-lg" 
          style={{ 
            backgroundColor: '#FFFFFF', 
            border: '1px solid var(--color-silver)',
            padding: '16px'
          }}
        >
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-ink)', marginBottom: '8px' }}>
            Entity Scope
          </label>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: '8px' }}>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
              <input
                type="checkbox"
                checked={selectedEntityIds.includes('ALL')}
                onChange={() => toggleEntityScope('ALL')}
                style={{ accentColor: 'var(--color-teal)' }}
              />
              <span style={{ fontSize: '13px', color: 'var(--color-ink)' }}>All Entities</span>
            </label>
            {availableCompanies.map((company) => (
              <label key={company.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
                <input
                  type="checkbox"
                  checked={!selectedEntityIds.includes('ALL') && selectedEntityIds.includes(company.id)}
                  onChange={() => toggleEntityScope(company.id)}
                  style={{ accentColor: 'var(--color-teal)' }}
                />
                <span style={{ fontSize: '13px', color: 'var(--color-ink)' }}>{company.code}</span>
              </label>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-mercury-grey)', margin: 0 }}>
            Current scope: {entityScopeLabel}
          </p>
        </div>

        <div 
          className="rounded-lg" 
          style={{ 
            backgroundColor: '#FFFFFF', 
            border: '1px solid var(--color-silver)',
            padding: '16px'
          }}
        >
          <div className="flex items-center gap-2" style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', width: '18px', height: '18px', color: 'var(--color-mercury-grey)' }} />
            <input
              type="text"
              placeholder="Search modules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 10px 10px 40px',
                border: '1px solid var(--color-silver)',
                borderRadius: '8px',
                fontSize: '14px',
                color: 'var(--color-ink)',
                outline: 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* Access Matrix */}
      <div 
        className="rounded-lg" 
        style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid var(--color-silver)',
          overflow: 'hidden'
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-cloud)', borderBottom: '1px solid var(--color-silver)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', textTransform: 'uppercase', minWidth: '200px' }}>
                  Module
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', textTransform: 'uppercase' }}>
                  <div className="flex flex-col items-center gap-1">
                    <Eye style={{ width: '16px', height: '16px' }} />
                    <span>View</span>
                  </div>
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', textTransform: 'uppercase' }}>
                  <div className="flex flex-col items-center gap-1">
                    <Edit style={{ width: '16px', height: '16px' }} />
                    <span>Create</span>
                  </div>
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', textTransform: 'uppercase' }}>
                  <div className="flex flex-col items-center gap-1">
                    <Edit style={{ width: '16px', height: '16px' }} />
                    <span>Edit</span>
                  </div>
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', textTransform: 'uppercase' }}>
                  <div className="flex flex-col items-center gap-1">
                    <Trash2 style={{ width: '16px', height: '16px' }} />
                    <span>Delete</span>
                  </div>
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', textTransform: 'uppercase' }}>
                  <div className="flex flex-col items-center gap-1">
                    <Check style={{ width: '16px', height: '16px' }} />
                    <span>Approve</span>
                  </div>
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', textTransform: 'uppercase' }}>
                  <div className="flex flex-col items-center gap-1">
                    <Shield style={{ width: '16px', height: '16px' }} />
                    <span>Export</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {getRoleAccessRules().map((rule) => (
                <tr key={rule.module} style={{ borderBottom: '1px solid var(--color-silver)' }}>
                  <td style={{ padding: '16px', fontSize: '14px', color: 'var(--color-ink)', fontWeight: '500' }}>
                    <div className="flex items-center gap-2">
                      <Lock style={{ width: '16px', height: '16px', color: 'var(--color-teal)' }} />
                      <div>
                        <div>{rule.module}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-mercury-grey)', fontWeight: '400' }}>
                          {rule.entityIds.includes('ALL')
                            ? 'All Entities'
                            : availableCompanies.filter((company) => rule.entityIds.includes(company.id)).map((company) => company.code).join(', ')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={rule.canView}
                      onChange={() => togglePermission(rule.module, 'canView')}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--color-teal)', cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={rule.canCreate}
                      onChange={() => togglePermission(rule.module, 'canCreate')}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--color-teal)', cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={rule.canEdit}
                      onChange={() => togglePermission(rule.module, 'canEdit')}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--color-teal)', cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={rule.canDelete}
                      onChange={() => togglePermission(rule.module, 'canDelete')}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--color-teal)', cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={rule.canApprove}
                      onChange={() => togglePermission(rule.module, 'canApprove')}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--color-teal)', cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={rule.canExport}
                      onChange={() => togglePermission(rule.module, 'canExport')}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--color-teal)', cursor: 'pointer' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3" style={{ marginTop: '24px' }}>
        <button
          className="px-6 py-3 rounded-lg transition-all"
          style={{
            backgroundColor: 'var(--color-teal)',
            border: 'none',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
        >
          Save Access Configuration
        </button>
      </div>
    </div>
  );
}
