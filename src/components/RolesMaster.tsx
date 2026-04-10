import { useState } from 'react';
import { Plus, Search, Edit, Trash2, X, Shield, Users, Check, AlertCircle, Clock } from 'lucide-react';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';

interface Role {
  id: string;
  roleCode: string;
  roleName: string;
  description: string;
  userCount: number;
  permissions: string[];
  status: 'Active' | 'Inactive' | 'Pending Approval';
  createdDate: string;
  approvalStatus?: 'Approved' | 'Pending' | 'Rejected';
}

interface UserAssignment {
  id: string;
  role?: string;
  roles?: string[] | string;
  status?: string;
  approvalStatus?: string;
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
  const [formData, setFormData] = useState({
    roleCode: '',
    roleName: '',
    description: '',
    permissions: [] as string[],
    status: 'Pending Approval' as const
  });

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

  const filteredRoles = roles.filter(role =>
    role.roleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.roleCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      approvalStatus: 'Pending'
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
    setShowCreateModal(true);
  };

  const handleUpdate = () => {
    if (selectedRole) {
      setRoles(roles.map(r => r.id === selectedRole.id ? { ...r, ...formData, approvalStatus: 'Pending' } : r));
      setShowCreateModal(false);
      setSelectedRole(null);
      setFormData({
        roleCode: '',
        roleName: '',
        description: '',
        permissions: [],
        status: 'Pending Approval'
      });
    }
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

  return (
    <div style={{ padding: '24px', backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#0A0F14', margin: 0 }}>
            Roles Master
          </h1>
          <p style={{ fontSize: '14px', color: '#6E7A82', margin: '4px 0 0 0' }}>
            Define and manage user roles with permissions
          </p>
        </div>
        <button
          onClick={() => { setSelectedRole(null); setShowCreateModal(true); }}
          className="flex items-center gap-2 rounded-lg transition-all"
          style={{
            padding: '12px 20px',
            backgroundColor: '#00A9B7',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
        >
          <Plus style={{ width: '18px', height: '18px' }} />
          Add Role
        </button>
      </div>

      {/* Search */}
      <div 
        className="rounded-lg" 
        style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E1E6EA',
          padding: '16px',
          marginBottom: '16px'
        }}
      >
        <div className="flex items-center gap-2" style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '12px', width: '18px', height: '18px', color: '#6E7A82' }} />
          <input
            type="text"
            placeholder="Search by role name, code, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 10px 10px 40px',
              border: '1px solid #E1E6EA',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#0A0F14',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Roles Table */}
      <div 
        className="rounded-lg" 
        style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E1E6EA',
          overflow: 'hidden'
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F6F9FC', borderBottom: '1px solid #E1E6EA' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6E7A82', textTransform: 'uppercase' }}>
                  Role Code
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6E7A82', textTransform: 'uppercase' }}>
                  Role Name
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6E7A82', textTransform: 'uppercase' }}>
                  Description
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6E7A82', textTransform: 'uppercase' }}>
                  Permissions
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6E7A82', textTransform: 'uppercase' }}>
                  Users
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6E7A82', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6E7A82', textTransform: 'uppercase' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRoles.map((role) => (
                <tr key={role.id} style={{ borderBottom: '1px solid #E1E6EA' }}>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#0A0F14', fontWeight: '500' }}>
                    <div className="flex items-center gap-2">
                      <Shield style={{ width: '16px', height: '16px', color: '#00A9B7' }} />
                      {role.roleCode}
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#0A0F14' }}>
                    {role.roleName}
                  </td>
                  <td style={{ padding: '16px', fontSize: '13px', color: '#6E7A82', maxWidth: '250px' }}>
                    {role.description}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.slice(0, 2).map((perm, idx) => (
                        <span 
                          key={idx}
                          className="px-2 py-1 rounded"
                          style={{ backgroundColor: '#E8F7F8', color: '#00A9B7', fontSize: '11px', fontWeight: '500' }}
                        >
                          {perm}
                        </span>
                      ))}
                      {role.permissions.length > 2 && (
                        <span 
                          className="px-2 py-1 rounded"
                          style={{ backgroundColor: '#F6F9FC', color: '#6E7A82', fontSize: '11px', fontWeight: '500' }}
                        >
                          +{role.permissions.length - 2} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#6E7A82' }}>
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
                      <button
                        onClick={() => handleEdit(role)}
                        className="p-2 rounded-lg transition-all"
                        style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA', cursor: 'pointer' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E1E6EA'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F6F9FC'}
                        title="Edit Role"
                      >
                        <Edit style={{ width: '16px', height: '16px', color: '#00A9B7' }} />
                      </button>
                      {role.approvalStatus === 'Approved' && (
                        <button
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA', cursor: 'not-allowed', opacity: 0.5 }}
                          title="Cannot delete approved role"
                          disabled
                        >
                          <Trash2 style={{ width: '16px', height: '16px', color: '#6E7A82' }} />
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

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            className="rounded-lg"
            style={{
              backgroundColor: '#FFFFFF',
              width: '700px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between" style={{ padding: '20px', borderBottom: '1px solid #E1E6EA' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0A0F14', margin: 0 }}>
                {selectedRole ? 'Edit Role' : 'Add New Role'}
              </h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px', color: '#6E7A82' }} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px' }}>
              <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0A0F14', marginBottom: '8px' }}>
                    Role Code <span style={{ color: '#FF4E5B' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.roleCode}
                    onChange={(e) => setFormData({ ...formData, roleCode: e.target.value })}
                    placeholder="e.g., PO_CREATE"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #E1E6EA',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#0A0F14',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0A0F14', marginBottom: '8px' }}>
                    Role Name <span style={{ color: '#FF4E5B' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.roleName}
                    onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                    placeholder="e.g., PO Creator"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #E1E6EA',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#0A0F14',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0A0F14', marginBottom: '8px' }}>
                  Description <span style={{ color: '#FF4E5B' }}>*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter role description"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E1E6EA',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#0A0F14',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0A0F14', marginBottom: '12px' }}>
                  Permissions <span style={{ color: '#FF4E5B' }}>*</span>
                </label>
                <div 
                  className="rounded-lg grid grid-cols-2 gap-2"
                  style={{ 
                    border: '1px solid #E1E6EA',
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
                        backgroundColor: formData.permissions.includes(permission) ? '#E8F7F8' : 'transparent',
                        border: formData.permissions.includes(permission) ? '1px solid #00A9B7' : '1px solid transparent'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(permission)}
                        onChange={() => togglePermission(permission)}
                        style={{ 
                          width: '16px', 
                          height: '16px',
                          accentColor: '#00A9B7',
                          cursor: 'pointer'
                        }}
                      />
                      <span style={{ fontSize: '13px', color: '#0A0F14' }}>
                        {permission}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3" style={{ padding: '20px', borderTop: '1px solid #E1E6EA' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E1E6EA',
                  color: '#6E7A82',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F6F9FC'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
              >
                Cancel
              </button>
              <button
                onClick={selectedRole ? handleUpdate : handleCreate}
                className="px-6 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: '#00A9B7',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
              >
                {selectedRole ? 'Update Role' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
