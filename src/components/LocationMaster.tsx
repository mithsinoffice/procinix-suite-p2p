import { ArrowLeft, Plus, Trash2, X, Hash, MapPin, FileText, Edit, Eye } from 'lucide-react';
import { MasterListToolbar } from './ui/MasterListToolbar';
import { useNavigate } from 'react-router-dom';
import { MasterPageShell } from './ui/MasterPageShell';
import { useState, useMemo, useCallback } from 'react';
import { ApprovalModal } from './ApprovalModal';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { FormShell, FormSection, PxFormField, CheckCard, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';
import { EntityMappingSelector } from './shared/EntityMappingSelector';
import type { EntityScopeMapping } from '../lib/masters/entityMapping';

interface Location {
  id: string;
  locationCode: string;
  locationName: string;
  locationType: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  parentEntity: string;
  contactPerson: string;
  contactPhone: string;
  status: 'Active' | 'Inactive';
  approvalStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  entityMappings?: any[];
  originalData?: Location;
}

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

export function LocationMaster() {
  const navigate = useNavigate();
  const [records, setRecords] = useIncrementalMasterRecords<Location>('location_master', [
    { id: '1', locationCode: 'MUM-WH-01', locationName: 'Mumbai Warehouse', locationType: 'Warehouse', address: 'Plot 42, MIDC Industrial Area, Andheri East', city: 'Mumbai', state: 'Maharashtra', pincode: '400093', parentEntity: 'Subko Coffee', contactPerson: 'Ramesh Patil', contactPhone: '9820012345', status: 'Active', approvalStatus: 'Approved' },
    { id: '2', locationCode: 'BLR-ST-01', locationName: 'Bangalore Store', locationType: 'Store', address: '12th Main, Indiranagar', city: 'Bangalore', state: 'Karnataka', pincode: '560038', parentEntity: 'Subko Coffee', contactPerson: 'Kiran Rao', contactPhone: '9845012345', status: 'Active', approvalStatus: 'Approved' },
    { id: '3', locationCode: 'PUN-ST-01', locationName: 'Pune Store', locationType: 'Store', address: 'Lane 7, Koregaon Park', city: 'Pune', state: 'Maharashtra', pincode: '411001', parentEntity: 'Subko Coffee', contactPerson: 'Neha Joshi', contactPhone: '9881012345', status: 'Active', approvalStatus: 'Pending Approval' },
    { id: '4', locationCode: 'DEL-HUB-01', locationName: 'Delhi Hub', locationType: 'Warehouse', address: 'Sector 18, Okhla Industrial Estate', city: 'New Delhi', state: 'Delhi', pincode: '110020', parentEntity: 'Subko Coffee', contactPerson: 'Amit Sharma', contactPhone: '9810012345', status: 'Active', approvalStatus: 'Approved' },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [locationCode, setLocationCode] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationType, setLocationType] = useState('Warehouse');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [parentEntity, setParentEntity] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [entityMappings, setEntityMappings] = useState<EntityScopeMapping[]>([]);

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<Location | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<string[]>([]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const haystack = [r.locationCode, r.locationName, r.locationType, r.city, r.state].join(' ').toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(r.status);
      const matchesApproval = approvalFilter.length === 0 || approvalFilter.includes(r.approvalStatus);
      return matchesSearch && matchesStatus && matchesApproval;
    });
  }, [records, searchTerm, statusFilter, approvalFilter]);

  const handleSubmit = (approvalStatus: Location['approvalStatus'] = 'Pending Approval') => {
    if (isEditMode && editingId) {
      const originalRecord = records.find(d => d.id === editingId);
      const updated: Location = {
        id: editingId, locationCode, locationName, locationType, address, city, state, pincode, parentEntity, contactPerson, contactPhone, status, approvalStatus, originalData: originalRecord, entityMappings,
      };
      setRecords(records.map(d => d.id === editingId ? updated : d));
    } else {
      const newRec: Location = {
        id: Date.now().toString(), locationCode, locationName, locationType, address, city, state, pincode, parentEntity, contactPerson, contactPhone, status, approvalStatus, entityMappings,
      };
      setRecords([...records, newRec]);
    }
    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setLocationCode(''); setLocationName(''); setLocationType('Warehouse');
    setAddress(''); setCity(''); setState(''); setPincode('');
    setParentEntity(''); setContactPerson(''); setContactPhone('');
    setStatus('Active'); setEntityMappings([]);
    setIsEditMode(false); setEditingId(null);
  };

  const handleEdit = (rec: Location) => {
    setIsEditMode(true); setEditingId(rec.id);
    setLocationCode(rec.locationCode || ''); setLocationName(rec.locationName || '');
    setLocationType(rec.locationType || 'Warehouse'); setAddress(rec.address || '');
    setCity(rec.city || ''); setState(rec.state || ''); setPincode(rec.pincode || '');
    setParentEntity(rec.parentEntity || ''); setContactPerson(rec.contactPerson || '');
    setContactPhone(rec.contactPhone || ''); setStatus(rec.status || 'Active');
    setEntityMappings(rec.entityMappings || []);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const rec = records.find(d => d.id === id);
    if (rec?.approvalStatus === 'Approved') {
      alert('Cannot delete approved/live records. You can only modify them through the approval workflow.');
      return;
    }
    setRecords(records.filter(d => d.id !== id));
  };

  const handleReview = (rec: Location) => {
    const changes: Change[] = [];
    if (rec.originalData) {
      const o = rec.originalData;
      if (o.locationCode !== rec.locationCode) changes.push({ field: 'Location Code', oldValue: o.locationCode, newValue: rec.locationCode });
      if (o.locationName !== rec.locationName) changes.push({ field: 'Location Name', oldValue: o.locationName, newValue: rec.locationName });
      if (o.locationType !== rec.locationType) changes.push({ field: 'Location Type', oldValue: o.locationType, newValue: rec.locationType });
      if (o.city !== rec.city) changes.push({ field: 'City', oldValue: o.city, newValue: rec.city });
      if (o.state !== rec.state) changes.push({ field: 'State', oldValue: o.state, newValue: rec.state });
      if (o.status !== rec.status) changes.push({ field: 'Status', oldValue: o.status, newValue: rec.status });
    }
    setCurrentReviewRecord(rec);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction('location_master', records, currentReviewRecord.id, 'approve');
      setRecords(nextRecords);
    }
    setShowApprovalModal(false); setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction('location_master', records, currentReviewRecord.id, 'reject');
      setRecords(nextRecords);
    }
    setShowApprovalModal(false); setCurrentReviewRecord(null);
  };

  const handleRequestInfo = async () => {
    if (currentReviewRecord) {
      const comments = window.prompt('Enter comments for the request:', '');
      if (comments === null) return;
      const nextRecords = await applyMasterApprovalAction('location_master', records, currentReviewRecord.id, 'request_info', comments);
      setRecords(nextRecords);
    }
    setShowApprovalModal(false); setCurrentReviewRecord(null);
  };

  const getStatusBadgeStyle = (approvalStatus: string) => {
    switch (approvalStatus) {
      case 'Approved': return { backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal)' };
      case 'Pending Approval': return { backgroundColor: '#FFF9E6', color: '#D97706' };
      case 'Draft': return { backgroundColor: '#E5E7EB', color: 'var(--color-mercury-grey)' };
      case 'Rejected': return { backgroundColor: '#FFE8EA', color: 'var(--color-error)' };
      default: return { backgroundColor: '#E5E7EB', color: 'var(--color-mercury-grey)' };
    }
  };

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const completeness = useMemo(() => {
    const fields = [locationCode, locationName, locationType, city, state, status];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [locationCode, locationName, locationType, city, state, status]);

  const handleSaveDraft = useCallback(() => {
    setSaveStatus('saving');
    handleSubmit('Draft');
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  }, [handleSubmit]);

  useFormKeyboardSave(handleSaveDraft);

  if (showForm) {
    return (
      <FormShell masterName="Location Master"
        title={editingId ? 'Edit Location' : 'Create Location'}
        subtitle="Manage locations with approval workflow"
        modeLabel={editingId ? 'Edit Master Record' : 'Create Master Record'}
        draftStatus={editingId ? 'Draft' : 'New'}
        completeness={completeness}
        onBack={() => setShowForm(false)}
        onCancel={() => { setShowForm(false); resetForm(); }}
        onSaveDraft={handleSaveDraft}
        onSubmit={() => handleSubmit('Pending Approval')}
        submitLabel="Submit"
        draftLabel="Save Draft"
        saveStatus={saveStatus}
      >
        <FormSection title="Location Details" columns={2}>
          <PxFormField label="Location Code" required filled={!!locationCode.trim()}>
            <input type="text" value={locationCode} onChange={(e) => setLocationCode(e.target.value)} placeholder="e.g., MUM-WH-01" className="px-input" />
          </PxFormField>
          <PxFormField label="Location Name" required filled={!!locationName.trim()}>
            <input type="text" value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="e.g., Mumbai Warehouse" className="px-input" />
          </PxFormField>
          <PxFormField label="Location Type" required filled={!!locationType}>
            <select value={locationType} onChange={(e) => setLocationType(e.target.value)} className="px-select">
              <option value="Warehouse">Warehouse</option>
              <option value="Store">Store</option>
              <option value="Office">Office</option>
              <option value="Factory">Factory</option>
            </select>
          </PxFormField>
          <PxFormField label="Parent Entity" filled={!!parentEntity.trim()}>
            <input type="text" value={parentEntity} onChange={(e) => setParentEntity(e.target.value)} placeholder="Linked entity" className="px-input" />
          </PxFormField>
          <PxFormField label="Address" filled={!!address.trim()}>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" className="px-input" />
          </PxFormField>
          <PxFormField label="City" required filled={!!city.trim()}>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="px-input" />
          </PxFormField>
          <PxFormField label="State" required filled={!!state.trim()}>
            <input type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className="px-input" />
          </PxFormField>
          <PxFormField label="Pincode" filled={!!pincode.trim()}>
            <input type="text" value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="PIN code" className="px-input" />
          </PxFormField>
          <PxFormField label="Contact Person" filled={!!contactPerson.trim()}>
            <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Contact name" className="px-input" />
          </PxFormField>
          <PxFormField label="Contact Phone" filled={!!contactPhone.trim()}>
            <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Phone number" className="px-input" />
          </PxFormField>
          <PxFormField label="Status" required filled={!!status}>
            <select value={status} onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')} className="px-select">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </PxFormField>
          <EntityMappingSelector value={entityMappings} onChange={setEntityMappings} />
        </FormSection>
      </FormShell>
    );
  }

  return (
    <MasterPageShell masterName="Location Master" description="Manage warehouses, stores, offices and factory locations">
      <div className="flex items-center justify-end mb-8">
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-colors"
          style={{ backgroundColor: 'var(--color-teal)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
        >
          <Plus className="w-5 h-5" />
          Add Location
        </button>
      </div>

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        recordType="Location Master"
        recordId={currentReviewRecord?.locationCode || ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />

      <MasterListToolbar
        masterName="Locations"
        masterKey="location_master"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={[
          { key: 'status', label: 'Status', options: ['Active', 'Inactive'], selected: statusFilter },
          { key: 'approval', label: 'Approval', options: ['Draft', 'Pending Approval', 'Approved', 'Rejected'], selected: approvalFilter },
        ]}
        onFilterChange={(key, values) => {
          if (key === 'status') setStatusFilter(values);
          if (key === 'approval') setApprovalFilter(values);
        }}
        records={filteredRecords}
        columns={[
          { key: 'locationCode', label: 'Location Code' },
          { key: 'locationName', label: 'Location Name' },
          { key: 'locationType', label: 'Location Type' },
          { key: 'address', label: 'Address' },
          { key: 'city', label: 'City' },
          { key: 'state', label: 'State' },
          { key: 'pincode', label: 'Pincode' },
          { key: 'parentEntity', label: 'Parent Entity' },
          { key: 'contactPerson', label: 'Contact Person' },
          { key: 'contactPhone', label: 'Contact Phone' },
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
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Code</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Location Name</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Type</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>City</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>State</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Status</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Approval Status</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((rec, index) => (
                <tr key={rec.id} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--color-silver)' }}>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)', fontWeight: 600 }}>{rec.locationCode}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{rec.locationName}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>{rec.locationType}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>{rec.city}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>{rec.state}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: rec.status === 'Active' ? 'var(--color-teal-tint)' : '#FFE8EA', color: rec.status === 'Active' ? 'var(--color-teal)' : 'var(--color-error)' }}>
                      {rec.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={getStatusBadgeStyle(rec.approvalStatus)}>
                      {rec.approvalStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {rec.approvalStatus === 'Pending Approval' && (
                        <button onClick={() => handleReview(rec)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-teal)' }} title="Review Changes">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleEdit(rec)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-mercury-grey)' }} title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(rec.id)} className="p-2 rounded-lg transition-colors" style={{ color: rec.approvalStatus === 'Approved' ? '#C4C4C4' : 'var(--color-error)', cursor: rec.approvalStatus === 'Approved' ? 'not-allowed' : 'pointer' }} title={rec.approvalStatus === 'Approved' ? 'Cannot delete approved records' : 'Delete'} disabled={rec.approvalStatus === 'Approved'}>
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
