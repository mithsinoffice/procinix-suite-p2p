import { useState, useMemo, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, X, Shield, Users, Check, AlertCircle, Clock, Eye } from 'lucide-react';
import { MasterListToolbar } from './ui/MasterListToolbar';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { ApprovalModal } from './ApprovalModal';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { MasterPageShell } from './ui/MasterPageShell';
import { FormShell, FormSection, PxFormField, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';
import { EntityMappingSelector } from './shared/EntityMappingSelector';
import type { EntityScopeMapping } from '../lib/masters/entityMapping';

interface Role {
  id: string;
  roleCode: string;
  roleName: string;
  description: string;
  userCount: number;
  permissions: string[];
  status: 'Active' | 'Inactive' | 'Pending Approval';
  createdDate: string;
  entityMappings?: EntityScopeMapping[];
  approvalStatus?: 'Approved' | 'Pending' | 'Pending Approval' | 'Rejected';
  originalData?: Role;
}

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

interface UserAssignment {
  id: string;
  role?: string;
  roles?: string[] | string;
  status?: string;
  approvalStatus?: string;
}

interface RoleFormData {
  roleCode: string;
  roleName: string;
  description: string;
  permissions: string[];
  status: Role['status'];
}

const mockRoles: Role[] = [
  { 
    id: '1', 
    roleCode: 'ADMIN', 
    roleName: 'System Administrator', 
    description: 'Full system access with all privileges', 
    userCount: 2, 
    permissions: ['All Modules', 'User Management', 'System Configuration'],
    status: 'Active', 
    createdDate: '2024-01-10',
    approvalStatus: 'Approved'
  },
  { 
    id: '2', 
    roleCode: 'PO_CREATE', 
    roleName: 'PO Creator', 
    description: 'Can create and submit purchase orders', 
    userCount: 15, 
    permissions: ['Create PO', 'View PO', 'Edit Draft PO'],
    status: 'Active', 
    createdDate: '2024-01-12',
    approvalStatus: 'Approved'
  },
  { 
    id: '3', 
    roleCode: 'PO_APPROVE', 
    roleName: 'PO Approver', 
    description: 'Can approve or reject purchase orders', 
    userCount: 5, 
    permissions: ['Approve PO', 'Reject PO', 'View PO', 'Request More Info'],
    status: 'Active', 
    createdDate: '2024-01-15',
    approvalStatus: 'Approved'
  },
  { 
    id: '4', 
    roleCode: 'GRN_MGR', 
    roleName: 'GRN Manager', 
    description: 'Manages goods receipt process', 
    userCount: 8, 
    permissions: ['Create GRN', 'View GRN', 'Allocate to Locations'],
    status: 'Active', 
    createdDate: '2024-01-18',
    approvalStatus: 'Approved'
  },
  { 
    id: '5', 
    roleCode: 'LOC_MGR', 
    roleName: 'Location Manager', 
    description: 'Accepts allocated goods at location level', 
    userCount: 12, 
    permissions: ['Accept Location Allocation', 'View GRN', 'Reject Allocation'],
    status: 'Pending Approval', 
    createdDate: '2024-12-10',
    approvalStatus: 'Pending'
  },
];

export function RolesMaster() {
  const [roles, setRoles] = useIncrementalMasterRecords<Role>('roles_master', mockRoles);
  const [users] = useIncrementalMasterRecords<UserAssignment>('user_master', []);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<RoleFormData>({
    roleCode: '',
    roleName: '',
    description: '',
    permissions: [] as string[],
    status: 'Pending Approval'
  });
  const [entityMappings, setEntityMappings] = useState<EntityScopeMapping[]>([]);

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<Role | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<string[]>([]);

  const availablePermissions = [
    'Create PO', 'View PO', 'Edit Draft PO', 'Delete Draft PO',
    'Approve PO', 'Reject PO', 'Request More Info',
    'Create GRN', 'View GRN', 'Edit GRN', 'Allocate to Locations',
    'Accept Location Allocation', 'Reject Allocation',
    'View Reports', 'Export Data',
    'Manage Users', 'Manage Roles', 'Manage Workflows',
    'View Masters', 'Edit Masters', 'Approve Masters',
    'System Configuration', 'All Modules'
  ];

  const filteredRoles = useMemo(() => {
    return roles.filter(role => {
      const haystack = [role.roleCode, role.roleName, role.description].join(' ').toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(role.status);
      const matchesApproval = approvalFilter.length === 0 || approvalFilter.includes(role.approvalStatus ?? 'Approved');
      return matchesSearch && matchesStatus && matchesApproval;
    });
  }, [roles, searchTerm, statusFilter, approvalFilter]);

  const getAssignedUserCount = (role: Role) => users.filter((user) => {
    if (user.status === 'Inactive' || user.approvalStatus !== 'Approved') {
      return false;
    }

    const assignedRoles = Array.isArray(user.roles)
      ? user.roles
      : typeof user.roles === 'string'
        ? user.roles.split(',').map((entry) => entry.trim()).filter(Boolean)
        : user.role
          ? [user.role]
          : [];

    return assignedRoles.some((assignedRole) => (
      assignedRole.toLowerCase() === role.roleName.toLowerCase() ||
      assignedRole.toLowerCase() === role.roleCode.toLowerCase()
    ));
  }).length;

  const handleCreate = () => {
    const newRole: Role = {
      id: Date.now().toString(),
      ...formData,
      userCount: 0,
      createdDate: new Date().toISOString().split('T')[0],
      approvalStatus: 'Pending',
      entityMappings,
    };
    setRoles([...roles, newRole]);
    setShowCreateModal(false);
    setFormData({
      roleCode: '',
      roleName: '',
      description: '',
      permissions: [],
      status: 'Pending Approval'
    });
    setEntityMappings([]);
  };

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      roleCode: role.roleCode,
      roleName: role.roleName,
      description: role.description,
      permissions: role.permissions,
      status: role.status
    });
    setEntityMappings(role.entityMappings || []);
    setShowCreateModal(true);
  };

  const handleUpdate = () => {
    if (selectedRole) {
      setRoles(roles.map(r => r.id === selectedRole.id ? { ...r, ...formData, approvalStatus: 'Pending', entityMappings } : r));
      setShowCreateModal(false);
      setSelectedRole(null);
      setFormData({
        roleCode: '',
        roleName: '',
        description: '',
        permissions: [],
        status: 'Pending Approval'
      });
      setEntityMappings([]);
    }
  };

  const handleReview = (role: Role) => {
    const changes: Change[] = [];
    if (role.originalData) {
      const original = role.originalData;
      if (original.roleCode !== role.roleCode) changes.push({ field: 'Role Code', oldValue: original.roleCode, newValue: role.roleCode });
      if (original.roleName !== role.roleName) changes.push({ field: 'Role Name', oldValue: original.roleName, newValue: role.roleName });
      if (original.description !== role.description) changes.push({ field: 'Description', oldValue: original.description, newValue: role.description });
      if (original.status !== role.status) changes.push({ field: 'Status', oldValue: original.status, newValue: role.status });
      if (JSON.stringify(original.permissions) !== JSON.stringify(role.permissions)) changes.push({ field: 'Permissions', oldValue: original.permissions.join(', '), newValue: role.permissions.join(', ') });
    }
    setCurrentReviewRecord(role);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction('roles_master', roles, currentReviewRecord.id, 'approve');
      setRoles(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction('roles_master', roles, currentReviewRecord.id, 'reject');
      setRoles(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleRequestInfo = async () => {
    if (currentReviewRecord) {
      const comments = window.prompt('Enter comments for the request:', '');
      if (comments === null) return;
      const nextRecords = await applyMasterApprovalAction('roles_master', roles, currentReviewRecord.id, 'request_info', comments);
      setRoles(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const togglePermission = (permission: string) => {
    setFormData({
      ...formData,
      permissions: formData.permissions.includes(permission)
        ? formData.permissions.filter(p => p !== permission)
        : [...formData.permissions, permission]
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: any }> = {
      'Active': { bg: '#E8F7F0', text: '#0A7E4A', icon: Check },
      'Inactive': { bg: '#FFE5E5', text: '#D32F2F', icon: AlertCircle },
      'Pending Approval': { bg: '#FFF9E6', text: '#D97706', icon: Clock }
    };
    const config = styles[status] || styles['Pending Approval'];
    const Icon = config.icon;
    return (
      <span 
        className="inline-flex items-center gap-1 px-3 py-1 rounded-full" 
        style={{ backgroundColor: config.bg, color: config.text, fontSize: '12px', fontWeight: '500' }}
      >
        <Icon style={{ width: '14px', height: '14px' }} />
        {status}
      </span>
    );
  };

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const completeness = useMemo(() => {
    const fields = [formData.roleCode, formData.roleName, formData.description];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    const permFilled = formData.permissions.length > 0 ? 1 : 0;
    return { filled: filled + permFilled, total: fields.length + 1 };
  }, [formData.roleCode, formData.roleName, formData.description, formData.permissions]);

  const handleSaveDraft = useCallback(() => {
    setSaveStatus('saving');
    if (selectedRole) {
      handleUpdate();
    } else {
      handleCreate();
    }
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  }, [selectedRole, handleUpdate, handleCreate]);

  useFormKeyboardSave(showCreateModal ? handleSaveDraft : undefined);

  if (showCreateModal) {
    return (
      <FormShell masterName="Roles Master"
        title={selectedRole ? 'Edit Role' : 'Create Role'}
        subtitle="Define and manage user roles with permissions"
        modeLabel={selectedRole ? 'Edit Master Record' : 'Create Master Record'}
        draftStatus={selectedRole ? 'Draft' : 'New'}
        completeness={completeness}
        onBack={() => setShowCreateModal(false)}
        onCancel={() => {
          setShowCreateModal(false);
          setSelectedRole(null);
          setFormData({ roleCode: '', roleName: '', description: '', permissions: [], status: 'Pending Approval' });
        }}
        onSaveDraft={handleSaveDraft}
        onSubmit={selectedRole ? handleUpdate : handleCreate}
        submitLabel={selectedRole ? 'Update Role' : 'Create Role'}
        draftLabel="Save Draft"
        saveStatus={saveStatus}
      >
        <FormSection title="Role Details" columns={2}>
          <PxFormField label="Role Code" required filled={!!formData.roleCode.trim()} hint="Unique role identifier">
            <input
              type="text"
              value={formData.roleCode}
              onChange={(e) => setFormData({ ...formData, roleCode: e.target.value })}
              placeholder="e.g., PO_CREATE"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Role Name" required filled={!!formData.roleName.trim()}>
            <input
              type="text"
              value={formData.roleName}
              onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
              placeholder="e.g., PO Creator"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Description" required filled={!!formData.description.trim()}>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter role description"
              rows={3}
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Permissions" required filled={formData.permissions.length > 0} hint={`${formData.permissions.length} selected`}>
            <div
              className="rounded-lg grid grid-cols-2 gap-2"
              style={{
                border: '1px solid var(--color-silver)',
                padding: '16px',
                maxHeight: '300px',
                overflowY: 'auto'
              }}
            >
              {availablePermissions.map((permission) => (
                <label
                  key={permission}
                  className="flex items-center gap-2 p-2 rounded cursor-pointer transition-all"
                  style={{
                    backgroundColor: formData.permissions.includes(permission) ? 'var(--color-teal-tint)' : 'transparent',
                    border: formData.permissions.includes(permission) ? '1px solid var(--color-teal)' : '1px solid transparent'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: 'var(--color-teal)',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--color-ink)' }}>
                    {permission}
                  </span>
                </label>
              ))}
            </div>
          </PxFormField>
          <EntityMappingSelector value={entityMappings} onChange={setEntityMappings} />
        </FormSection>
      </FormShell>
    );
  }

  return (
    <MasterPageShell masterName="Roles Master" description="Manage user roles and permissions">
      {/* Header */}
      <div className="flex items-center justify-end" style={{ marginBottom: '24px' }}>
        <button
          onClick={() => { setSelectedRole(null); setShowCreateModal(true); }}
          className="flex items-center gap-2 rounded-lg transition-all"
          style={{
            padding: '12px 20px',
            backgroundColor: 'var(--color-teal)',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
        >
          <Plus style={{ width: '18px', height: '18px' }} />
          Add Role
        </button>
      </div>

      <MasterListToolbar
        masterName="Roles Master"
        masterKey="roles_master"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={[
          { key: 'status', label: 'Status', options: ['Active', 'Inactive', 'Pending Approval'], selected: statusFilter },
          { key: 'approval', label: 'Approval', options: ['Approved', 'Pending', 'Rejected'], selected: approvalFilter },
        ]}
        onFilterChange={(key, values) => {
          if (key === 'status') setStatusFilter(values);
          if (key === 'approval') setApprovalFilter(values);
        }}
        records={filteredRoles}
        columns={[
          { key: 'roleCode', label: 'Role Code' },
          { key: 'roleName', label: 'Role Name' },
          { key: 'description', label: 'Description' },
          { key: 'userCount', label: 'User Count' },
          { key: 'permissions', label: 'Permissions' },
          { key: 'createdDate', label: 'Created Date' },
          { key: 'status', label: 'Status' },
          { key: 'entityMappings', label: 'Entity Mappings' },
          { key: 'approvalStatus', label: 'Approval Status' },
        ]}
      />

      {/* Roles Table */}
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
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', textTransform: 'uppercase' }}>
                  Role Code
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', textTransform: 'uppercase' }}>
                  Role Name
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', textTransform: 'uppercase' }}>
                  Description
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', textTransform: 'uppercase' }}>
                  Permissions
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', textTransform: 'uppercase' }}>
                  Users
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-mercury-grey)', textTransform: 'uppercase' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRoles.map((role) => (
                <tr key={role.id} style={{ borderBottom: '1px solid var(--color-silver)' }}>
                  <td style={{ padding: '16px', fontSize: '14px', color: 'var(--color-ink)', fontWeight: '500' }}>
                    <div className="flex items-center gap-2">
                      <Shield style={{ width: '16px', height: '16px', color: 'var(--color-teal)' }} />
                      {role.roleCode}
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', color: 'var(--color-ink)' }}>
                    {role.roleName}
                  </td>
                  <td style={{ padding: '16px', fontSize: '13px', color: 'var(--color-mercury-grey)', maxWidth: '250px' }}>
                    {role.description}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.slice(0, 2).map((perm, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded"
                          style={{ backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal)', fontSize: '11px', fontWeight: '500' }}
                        >
                          {perm}
                        </span>
                      ))}
                      {role.permissions.length > 2 && (
                        <span
                          className="px-2 py-1 rounded"
                          style={{ backgroundColor: 'var(--color-cloud)', color: 'var(--color-mercury-grey)', fontSize: '11px', fontWeight: '500' }}
                        >
                          +{role.permissions.length - 2} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', color: 'var(--color-mercury-grey)' }}>
                    <div className="flex items-center gap-2">
                      <Users style={{ width: '16px', height: '16px' }} />
                      {getAssignedUserCount(role)}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    {getStatusBadge(role.status)}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div className="flex items-center gap-2">
                      {role.approvalStatus === 'Pending' && (
                        <button
                          onClick={() => handleReview(role)}
                          className="p-2 rounded-lg transition-all"
                          style={{ backgroundColor: 'var(--color-cloud)', border: '1px solid var(--color-silver)', cursor: 'pointer' }}
                          title="Review Changes"
                        >
                          <Eye style={{ width: '16px', height: '16px', color: 'var(--color-teal)' }} />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(role)}
                        className="p-2 rounded-lg transition-all"
                        style={{ backgroundColor: 'var(--color-cloud)', border: '1px solid var(--color-silver)', cursor: 'pointer' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-silver)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-cloud)'}
                        title="Edit Role"
                      >
                        <Edit style={{ width: '16px', height: '16px', color: 'var(--color-teal)' }} />
                      </button>
                      {role.approvalStatus === 'Approved' && (
                        <button
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: 'var(--color-cloud)', border: '1px solid var(--color-silver)', cursor: 'not-allowed', opacity: 0.5 }}
                          title="Cannot delete approved role"
                          disabled
                        >
                          <Trash2 style={{ width: '16px', height: '16px', color: 'var(--color-mercury-grey)' }} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        recordType="Roles Master"
        recordId={currentReviewRecord?.roleCode || ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />
    </MasterPageShell>
  );
}
