import { useCallback, useMemo, useState } from 'react';
import { Edit, Eye, Plus, Trash2 } from 'lucide-react';
import { ApprovalModal } from './ApprovalModal';
import { MasterListToolbar } from './ui/MasterListToolbar';
import { MasterPageShell } from './ui/MasterPageShell';
import { FormShell, FormSection, PxFormField, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { EntityMappingSelector } from './shared/EntityMappingSelector';
import type { EntityScopeMapping } from '../lib/masters/entityMapping';

interface VendorGroupRecord {
  id: string;
  groupCode: string;
  clientErpVendorGroupCode: string;
  groupName: string;
  relationshipType: 'Third party' | 'Related party' | 'Associate' | 'JV';
  description: string;
  status: 'Active' | 'Inactive';
  approvalStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  entityMappings?: EntityScopeMapping[];
  originalData?: VendorGroupRecord;
}

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

const RELATIONSHIP_TYPES: VendorGroupRecord['relationshipType'][] = [
  'Third party',
  'Related party',
  'Associate',
  'JV',
];

export function VendorGroupMaster() {
  const [records, setRecords] = useIncrementalMasterRecords<VendorGroupRecord>(
    'vendor_group_master',
    [
      {
        id: 'vg-1',
        groupCode: 'VG001',
        clientErpVendorGroupCode: 'ERP-VG-001',
        groupName: 'Independent Vendors',
        relationshipType: 'Third party',
        description: 'Default group for non-related suppliers.',
        status: 'Active',
        approvalStatus: 'Approved',
        entityMappings: [],
      },
    ]
  );

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [groupCode, setGroupCode] = useState('');
  const [clientErpVendorGroupCode, setClientErpVendorGroupCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [relationshipType, setRelationshipType] =
    useState<VendorGroupRecord['relationshipType']>('Third party');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [entityMappings, setEntityMappings] = useState<EntityScopeMapping[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<string[]>([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<VendorGroupRecord | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const haystack = [
          record.groupCode,
          record.clientErpVendorGroupCode,
          record.groupName,
          record.relationshipType,
          record.description,
        ]
          .join(' ')
          .toLowerCase();
        const matchesSearch = haystack.includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter.length === 0 || statusFilter.includes(record.status);
        const matchesApproval =
          approvalFilter.length === 0 || approvalFilter.includes(record.approvalStatus);
        return matchesSearch && matchesStatus && matchesApproval;
      }),
    [records, searchTerm, statusFilter, approvalFilter]
  );

  const resetForm = () => {
    const maxCodeNum = records.reduce((max, record) => {
      const match = String(record.groupCode || '').match(/^VG(\d+)$/i);
      if (!match) return max;
      const n = Number(match[1]);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    const nextCode = `VG${String(maxCodeNum + 1).padStart(3, '0')}`;
    setGroupCode(nextCode);
    setClientErpVendorGroupCode('');
    setGroupName('');
    setRelationshipType('Third party');
    setDescription('');
    setStatus('Active');
    setEntityMappings([]);
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleSubmit = (
    approvalStatus: VendorGroupRecord['approvalStatus'] = 'Pending Approval'
  ) => {
    const normalizedErpCode = clientErpVendorGroupCode.trim().toLowerCase();
    const duplicateErpCodeRecord = records.find((record) => {
      if (isEditMode && editingId && record.id === editingId) {
        return false;
      }
      return (
        String(record.clientErpVendorGroupCode || '')
          .trim()
          .toLowerCase() === normalizedErpCode
      );
    });

    if (duplicateErpCodeRecord) {
      alert('Client ERP Vendor Group Code already exists. Please enter a unique value.');
      return;
    }

    if (isEditMode && editingId) {
      const originalRecord = records.find((record) => record.id === editingId);
      const updated: VendorGroupRecord = {
        id: editingId,
        groupCode,
        clientErpVendorGroupCode: clientErpVendorGroupCode.trim(),
        groupName,
        relationshipType,
        description,
        status,
        approvalStatus,
        entityMappings,
        originalData: originalRecord,
      };
      setRecords(records.map((record) => (record.id === editingId ? updated : record)));
    } else {
      const created: VendorGroupRecord = {
        id: `vg-${Date.now()}`,
        groupCode,
        clientErpVendorGroupCode: clientErpVendorGroupCode.trim(),
        groupName,
        relationshipType,
        description,
        status,
        approvalStatus,
        entityMappings,
      };
      setRecords([created, ...records]);
    }
    setShowForm(false);
    resetForm();
  };

  const handleEdit = (record: VendorGroupRecord) => {
    setIsEditMode(true);
    setEditingId(record.id);
    setGroupCode(record.groupCode);
    setClientErpVendorGroupCode(record.clientErpVendorGroupCode || '');
    setGroupName(record.groupName);
    setRelationshipType(record.relationshipType);
    setDescription(record.description);
    setStatus(record.status);
    setEntityMappings(record.entityMappings || []);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const record = records.find((item) => item.id === id);
    if (record?.approvalStatus === 'Approved') {
      alert('Cannot delete approved/live records. Use approval workflow for modifications.');
      return;
    }
    setRecords(records.filter((item) => item.id !== id));
  };

  const handleReview = (record: VendorGroupRecord) => {
    const changes: Change[] = [];
    if (record.originalData) {
      if (record.originalData.groupCode !== record.groupCode) {
        changes.push({
          field: 'Group Code',
          oldValue: record.originalData.groupCode,
          newValue: record.groupCode,
        });
      }
      if (record.originalData.groupName !== record.groupName) {
        changes.push({
          field: 'Group Name',
          oldValue: record.originalData.groupName,
          newValue: record.groupName,
        });
      }
      if (record.originalData.clientErpVendorGroupCode !== record.clientErpVendorGroupCode) {
        changes.push({
          field: 'Client ERP Vendor Group Code',
          oldValue: record.originalData.clientErpVendorGroupCode || '',
          newValue: record.clientErpVendorGroupCode || '',
        });
      }
      if (record.originalData.relationshipType !== record.relationshipType) {
        changes.push({
          field: 'Relationship Type',
          oldValue: record.originalData.relationshipType,
          newValue: record.relationshipType,
        });
      }
      if (record.originalData.status !== record.status) {
        changes.push({
          field: 'Status',
          oldValue: record.originalData.status,
          newValue: record.status,
        });
      }
    }
    setCurrentReviewRecord(record);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (currentReviewRecord) {
      const next = await applyMasterApprovalAction(
        'vendor_group_master',
        records,
        currentReviewRecord.id,
        'approve'
      );
      setRecords(next);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (currentReviewRecord) {
      const next = await applyMasterApprovalAction(
        'vendor_group_master',
        records,
        currentReviewRecord.id,
        'reject'
      );
      setRecords(next);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleRequestInfo = async () => {
    if (currentReviewRecord) {
      const comments = window.prompt('Enter comments for the request:', '');
      if (comments === null) return;
      const next = await applyMasterApprovalAction(
        'vendor_group_master',
        records,
        currentReviewRecord.id,
        'request_info',
        comments
      );
      setRecords(next);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const completeness = useMemo(() => {
    const fields = [groupCode, clientErpVendorGroupCode, groupName, relationshipType, status];
    const filled = fields.filter((value) => String(value).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [groupCode, clientErpVendorGroupCode, groupName, relationshipType, status]);

  const handleSaveDraft = useCallback(() => {
    setSaveStatus('saving');
    handleSubmit('Draft');
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  }, [
    groupCode,
    clientErpVendorGroupCode,
    groupName,
    relationshipType,
    status,
    description,
    entityMappings,
    isEditMode,
    editingId,
    records,
  ]);

  useFormKeyboardSave(handleSaveDraft);

  const getStatusBadgeStyle = (approvalStatus: string) => {
    switch (approvalStatus) {
      case 'Approved':
        return { backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal)' };
      case 'Pending Approval':
        return { backgroundColor: '#FFF9E6', color: '#D97706' };
      case 'Draft':
        return { backgroundColor: '#E5E7EB', color: 'var(--color-mercury-grey)' };
      case 'Rejected':
        return { backgroundColor: '#FFE8EA', color: 'var(--color-error)' };
      default:
        return { backgroundColor: '#E5E7EB', color: 'var(--color-mercury-grey)' };
    }
  };

  if (showForm) {
    return (
      <FormShell
        masterName="Vendor Group Master"
        title={isEditMode ? 'Edit Vendor Group' : 'Create Vendor Group'}
        subtitle="Manage vendor grouping for vendor mapping"
        modeLabel={isEditMode ? 'Edit Master Record' : 'Create Master Record'}
        draftStatus={isEditMode ? 'Draft' : 'New'}
        completeness={completeness}
        onBack={() => setShowForm(false)}
        onCancel={() => {
          setShowForm(false);
          resetForm();
        }}
        onSaveDraft={handleSaveDraft}
        onSubmit={() => handleSubmit('Pending Approval')}
        submitLabel="Submit"
        draftLabel="Save Draft"
        saveStatus={saveStatus}
      >
        <FormSection title="Vendor Group Details" columns={2}>
          <PxFormField label="Group Code" required filled={!!groupCode.trim()}>
            <input
              value={groupCode}
              readOnly
              className="px-input"
              placeholder="System generated"
              style={{ backgroundColor: '#F6F9FC', color: '#6E7A82' }}
            />
          </PxFormField>
          <PxFormField
            label="Client ERP Vendor Group Code"
            required
            filled={!!clientErpVendorGroupCode.trim()}
          >
            <input
              value={clientErpVendorGroupCode}
              onChange={(event) => setClientErpVendorGroupCode(event.target.value)}
              className="px-input"
              placeholder="e.g., ERP-VG-001"
            />
          </PxFormField>
          <PxFormField label="Group Name" required filled={!!groupName.trim()}>
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              className="px-input"
              placeholder="e.g., Tata Group"
            />
          </PxFormField>
          <PxFormField label="Relationship Type" required filled={!!relationshipType}>
            <select
              value={relationshipType}
              onChange={(event) =>
                setRelationshipType(event.target.value as VendorGroupRecord['relationshipType'])
              }
              className="px-select"
            >
              {RELATIONSHIP_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </PxFormField>
          <PxFormField label="Status" required filled={!!status}>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as 'Active' | 'Inactive')}
              className="px-select"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </PxFormField>
          <PxFormField label="Description" filled={!!description.trim()}>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="px-input"
              placeholder="Describe the group purpose"
            />
          </PxFormField>
          <EntityMappingSelector value={entityMappings} onChange={setEntityMappings} />
        </FormSection>
      </FormShell>
    );
  }

  return (
    <MasterPageShell
      masterName="Vendor Group Master"
      description="Manage vendor grouping references for vendor onboarding and mapping"
    >
      <div className="flex items-center justify-end mb-8">
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-colors"
          style={{ backgroundColor: 'var(--color-teal)' }}
          onMouseEnter={(event) =>
            (event.currentTarget.style.backgroundColor = 'var(--color-teal-dark)')
          }
          onMouseLeave={(event) =>
            (event.currentTarget.style.backgroundColor = 'var(--color-teal)')
          }
        >
          <Plus className="w-5 h-5" />
          Add Vendor Group
        </button>
      </div>

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        recordType="Vendor Group Master"
        recordId={currentReviewRecord?.groupCode || ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />

      <MasterListToolbar
        masterName="Vendor Group Master"
        masterKey="vendor_group_master"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: ['Active', 'Inactive'],
            selected: statusFilter,
          },
          {
            key: 'approval',
            label: 'Approval',
            options: ['Draft', 'Pending Approval', 'Approved', 'Rejected'],
            selected: approvalFilter,
          },
        ]}
        onFilterChange={(key, values) => {
          if (key === 'status') setStatusFilter(values);
          if (key === 'approval') setApprovalFilter(values);
        }}
        records={filteredRecords}
        columns={[
          { key: 'groupCode', label: 'Group Code' },
          { key: 'clientErpVendorGroupCode', label: 'Client ERP Vendor Group Code' },
          { key: 'groupName', label: 'Group Name' },
          { key: 'relationshipType', label: 'Relationship Type' },
          { key: 'description', label: 'Description' },
          { key: 'status', label: 'Status' },
          { key: 'entityMappings', label: 'Entity Mappings' },
          { key: 'approvalStatus', label: 'Approval Status' },
        ]}
      />

      <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
              <tr>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Group Code
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Client ERP Group Code
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Group Name
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Relationship Type
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Status
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Approval Status
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record, index) => (
                <tr
                  key={record.id}
                  style={{ borderTop: index === 0 ? 'none' : '1px solid var(--color-silver)' }}
                >
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)', fontWeight: 600 }}>
                    {record.groupCode}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    {record.clientErpVendorGroupCode || '—'}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                    {record.groupName}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    {record.relationshipType}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-sm"
                      style={{
                        backgroundColor:
                          record.status === 'Active' ? 'var(--color-teal-tint)' : '#FFE8EA',
                        color:
                          record.status === 'Active' ? 'var(--color-teal)' : 'var(--color-error)',
                      }}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-sm"
                      style={getStatusBadgeStyle(record.approvalStatus)}
                    >
                      {record.approvalStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {record.approvalStatus === 'Pending Approval' && (
                        <button
                          onClick={() => handleReview(record)}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: 'var(--color-teal)' }}
                          title="Review Changes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(record)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'var(--color-mercury-grey)' }}
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="p-2 rounded-lg transition-colors"
                        style={{
                          color:
                            record.approvalStatus === 'Approved' ? '#C4C4C4' : 'var(--color-error)',
                          cursor: record.approvalStatus === 'Approved' ? 'not-allowed' : 'pointer',
                        }}
                        title={
                          record.approvalStatus === 'Approved'
                            ? 'Cannot delete approved records'
                            : 'Delete'
                        }
                        disabled={record.approvalStatus === 'Approved'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MasterPageShell>
  );
}
