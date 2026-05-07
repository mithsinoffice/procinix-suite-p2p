import { ArrowLeft, Plus, Trash2, X, Hash, FileText, Edit, Eye } from 'lucide-react';
import { MasterListToolbar } from './ui/MasterListToolbar';
import { useNavigate } from 'react-router-dom';
import { MasterPageShell } from './ui/MasterPageShell';
import { useState, useMemo, useCallback } from 'react';
import { ApprovalModal } from './ApprovalModal';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import {
  FormShell,
  FormSection,
  PxFormField,
  CheckCard,
  type SaveStatus,
} from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';
import { EntityMappingSelector } from './shared/EntityMappingSelector';
import type { EntityScopeMapping } from '../lib/masters/entityMapping';

interface TDSSection {
  id: string;
  sectionCode: string;
  sectionName: string;
  description: string;
  rateIndividual: number;
  rateCompany: number;
  rateNoTan: number;
  thresholdAmount: number;
  applicableTo: string;
  status: 'Active' | 'Inactive';
  approvalStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  entityMappings?: any[];
  originalData?: TDSSection;
}

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

export function TDSSectionMaster() {
  const navigate = useNavigate();
  const [records, setRecords] = useIncrementalMasterRecords<TDSSection>('tds_section_master', [
    {
      id: '1',
      sectionCode: '194C',
      sectionName: 'Payment to Contractors',
      description: 'TDS on payments to contractors and sub-contractors',
      rateIndividual: 1,
      rateCompany: 2,
      rateNoTan: 20,
      thresholdAmount: 30000,
      applicableTo: 'Contractors',
      status: 'Active',
      approvalStatus: 'Approved',
    },
    {
      id: '2',
      sectionCode: '194J',
      sectionName: 'Professional/Technical Services',
      description: 'TDS on professional and technical service fees',
      rateIndividual: 10,
      rateCompany: 10,
      rateNoTan: 20,
      thresholdAmount: 30000,
      applicableTo: 'Professionals',
      status: 'Active',
      approvalStatus: 'Approved',
    },
    {
      id: '3',
      sectionCode: '194I(a)',
      sectionName: 'Rent - Plant & Machinery',
      description: 'TDS on rent for plant, machinery and equipment',
      rateIndividual: 2,
      rateCompany: 2,
      rateNoTan: 20,
      thresholdAmount: 240000,
      applicableTo: 'Rent - Plant/Machinery',
      status: 'Active',
      approvalStatus: 'Approved',
    },
    {
      id: '4',
      sectionCode: '194I(b)',
      sectionName: 'Rent - Land & Building',
      description: 'TDS on rent for land and building',
      rateIndividual: 10,
      rateCompany: 10,
      rateNoTan: 20,
      thresholdAmount: 240000,
      applicableTo: 'Rent - Land/Building',
      status: 'Active',
      approvalStatus: 'Approved',
    },
    {
      id: '5',
      sectionCode: '194H',
      sectionName: 'Commission/Brokerage',
      description: 'TDS on commission and brokerage payments',
      rateIndividual: 5,
      rateCompany: 5,
      rateNoTan: 20,
      thresholdAmount: 15000,
      applicableTo: 'Commission/Brokerage',
      status: 'Active',
      approvalStatus: 'Approved',
    },
    {
      id: '6',
      sectionCode: '194A',
      sectionName: 'Interest other than Securities',
      description: 'TDS on interest income other than securities',
      rateIndividual: 10,
      rateCompany: 10,
      rateNoTan: 20,
      thresholdAmount: 40000,
      applicableTo: 'Interest',
      status: 'Active',
      approvalStatus: 'Approved',
    },
    {
      id: '7',
      sectionCode: '194Q',
      sectionName: 'Purchase of Goods',
      description: 'TDS on purchase of goods exceeding threshold',
      rateIndividual: 0.1,
      rateCompany: 0.1,
      rateNoTan: 5,
      thresholdAmount: 5000000,
      applicableTo: 'Purchase of Goods',
      status: 'Active',
      approvalStatus: 'Approved',
    },
    {
      id: '8',
      sectionCode: '206C',
      sectionName: 'Tax Collected at Source',
      description: 'TCS on specified transactions',
      rateIndividual: 1,
      rateCompany: 1,
      rateNoTan: 5,
      thresholdAmount: 5000000,
      applicableTo: 'TCS',
      status: 'Active',
      approvalStatus: 'Approved',
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [sectionCode, setSectionCode] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [description, setDescription] = useState('');
  const [rateIndividual, setRateIndividual] = useState(0);
  const [rateCompany, setRateCompany] = useState(0);
  const [rateNoTan, setRateNoTan] = useState(20);
  const [thresholdAmount, setThresholdAmount] = useState(0);
  const [applicableTo, setApplicableTo] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [entityMappings, setEntityMappings] = useState<EntityScopeMapping[]>([]);

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<TDSSection | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<string[]>([]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const haystack = [r.sectionCode, r.sectionName, r.description, r.applicableTo]
        .join(' ')
        .toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(r.status);
      const matchesApproval =
        approvalFilter.length === 0 || approvalFilter.includes(r.approvalStatus);
      return matchesSearch && matchesStatus && matchesApproval;
    });
  }, [records, searchTerm, statusFilter, approvalFilter]);

  const handleSubmit = (approvalStatus: TDSSection['approvalStatus'] = 'Pending Approval') => {
    if (isEditMode && editingId) {
      const originalRecord = records.find((d) => d.id === editingId);
      const updated: TDSSection = {
        id: editingId,
        sectionCode,
        sectionName,
        description,
        rateIndividual,
        rateCompany,
        rateNoTan,
        thresholdAmount,
        applicableTo,
        status,
        approvalStatus,
        originalData: originalRecord,
        entityMappings,
      };
      setRecords(records.map((d) => (d.id === editingId ? updated : d)));
    } else {
      const newRec: TDSSection = {
        id: Date.now().toString(),
        sectionCode,
        sectionName,
        description,
        rateIndividual,
        rateCompany,
        rateNoTan,
        thresholdAmount,
        applicableTo,
        status,
        approvalStatus,
        entityMappings,
      };
      setRecords([...records, newRec]);
    }
    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setSectionCode('');
    setSectionName('');
    setDescription('');
    setRateIndividual(0);
    setRateCompany(0);
    setRateNoTan(20);
    setThresholdAmount(0);
    setApplicableTo('');
    setStatus('Active');
    setEntityMappings([]);
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (rec: TDSSection) => {
    setIsEditMode(true);
    setEditingId(rec.id);
    setSectionCode(rec.sectionCode || '');
    setSectionName(rec.sectionName || '');
    setDescription(rec.description || '');
    setRateIndividual(rec.rateIndividual ?? 0);
    setRateCompany(rec.rateCompany ?? 0);
    setRateNoTan(rec.rateNoTan ?? 20);
    setThresholdAmount(rec.thresholdAmount ?? 0);
    setApplicableTo(rec.applicableTo || '');
    setStatus(rec.status || 'Active');
    setEntityMappings(rec.entityMappings || []);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const rec = records.find((d) => d.id === id);
    if (rec?.approvalStatus === 'Approved') {
      alert(
        'Cannot delete approved/live records. You can only modify them through the approval workflow.'
      );
      return;
    }
    setRecords(records.filter((d) => d.id !== id));
  };

  const handleReview = (rec: TDSSection) => {
    const changes: Change[] = [];
    if (rec.originalData) {
      const o = rec.originalData;
      if (o.sectionCode !== rec.sectionCode)
        changes.push({ field: 'Section Code', oldValue: o.sectionCode, newValue: rec.sectionCode });
      if (o.sectionName !== rec.sectionName)
        changes.push({ field: 'Section Name', oldValue: o.sectionName, newValue: rec.sectionName });
      if (o.rateIndividual !== rec.rateIndividual)
        changes.push({
          field: 'Rate (Individual)',
          oldValue: String(o.rateIndividual),
          newValue: String(rec.rateIndividual),
        });
      if (o.rateCompany !== rec.rateCompany)
        changes.push({
          field: 'Rate (Company)',
          oldValue: String(o.rateCompany),
          newValue: String(rec.rateCompany),
        });
      if (o.thresholdAmount !== rec.thresholdAmount)
        changes.push({
          field: 'Threshold Amount',
          oldValue: String(o.thresholdAmount),
          newValue: String(rec.thresholdAmount),
        });
      if (o.status !== rec.status)
        changes.push({ field: 'Status', oldValue: o.status, newValue: rec.status });
    }
    setCurrentReviewRecord(rec);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction(
        'tds_section_master',
        records,
        currentReviewRecord.id,
        'approve'
      );
      setRecords(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction(
        'tds_section_master',
        records,
        currentReviewRecord.id,
        'reject'
      );
      setRecords(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleRequestInfo = async () => {
    if (currentReviewRecord) {
      const comments = window.prompt('Enter comments for the request:', '');
      if (comments === null) return;
      const nextRecords = await applyMasterApprovalAction(
        'tds_section_master',
        records,
        currentReviewRecord.id,
        'request_info',
        comments
      );
      setRecords(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

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

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const completeness = useMemo(() => {
    const fields = [sectionCode, sectionName, applicableTo, status];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [sectionCode, sectionName, applicableTo, status]);

  const handleSaveDraft = useCallback(() => {
    setSaveStatus('saving');
    handleSubmit('Draft');
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  }, [handleSubmit]);

  useFormKeyboardSave(handleSaveDraft);

  if (showForm) {
    return (
      <FormShell
        masterName="TDS Section Master"
        title={editingId ? 'Edit TDS Section' : 'Create TDS Section'}
        subtitle="Manage TDS/TCS sections with approval workflow"
        modeLabel={editingId ? 'Edit Master Record' : 'Create Master Record'}
        draftStatus={editingId ? 'Draft' : 'New'}
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
        <FormSection title="TDS Section Details" columns={2}>
          <PxFormField label="Section Code" required filled={!!sectionCode.trim()}>
            <input
              type="text"
              value={sectionCode}
              onChange={(e) => setSectionCode(e.target.value)}
              placeholder="e.g., 194C"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Section Name" required filled={!!sectionName.trim()}>
            <input
              type="text"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder="e.g., Payment to Contractors"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Description" filled={!!description.trim()}>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Section description"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Applicable To" required filled={!!applicableTo.trim()}>
            <input
              type="text"
              value={applicableTo}
              onChange={(e) => setApplicableTo(e.target.value)}
              placeholder="e.g., Contractors, Professionals"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Rate - Individual (%)" filled={rateIndividual > 0}>
            <input
              type="number"
              step="0.1"
              value={rateIndividual}
              onChange={(e) => setRateIndividual(Number(e.target.value))}
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Rate - Company (%)" filled={rateCompany > 0}>
            <input
              type="number"
              step="0.1"
              value={rateCompany}
              onChange={(e) => setRateCompany(Number(e.target.value))}
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Rate - No TAN (%)" filled={rateNoTan > 0}>
            <input
              type="number"
              step="0.1"
              value={rateNoTan}
              onChange={(e) => setRateNoTan(Number(e.target.value))}
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Threshold Amount" filled={thresholdAmount > 0}>
            <input
              type="number"
              value={thresholdAmount}
              onChange={(e) => setThresholdAmount(Number(e.target.value))}
              placeholder="Annual threshold"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Status" required filled={!!status}>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
              className="px-select"
            >
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
    <MasterPageShell
      masterName="TDS Section Master"
      description="Manage TDS/TCS sections and rates"
    >
      <div className="flex items-center justify-end mb-8">
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-colors"
          style={{ backgroundColor: 'var(--color-teal)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal)')}
        >
          <Plus className="w-5 h-5" />
          Add TDS Section
        </button>
      </div>

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        recordType="TDS Section Master"
        recordId={currentReviewRecord?.sectionCode || ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />

      <MasterListToolbar
        masterName="TDS Sections"
        masterKey="tds_section_master"
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
          { key: 'sectionCode', label: 'Section Code' },
          { key: 'sectionName', label: 'Section Name' },
          { key: 'description', label: 'Description' },
          { key: 'rateIndividual', label: 'Rate Individual' },
          { key: 'rateCompany', label: 'Rate Company' },
          { key: 'rateNoTan', label: 'Rate No TAN' },
          { key: 'thresholdAmount', label: 'Threshold Amount' },
          { key: 'applicableTo', label: 'Applicable To' },
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
                  Section
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Name
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Individual %
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Company %
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Threshold
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
              {filteredRecords.map((rec, index) => (
                <tr
                  key={rec.id}
                  style={{ borderTop: index === 0 ? 'none' : '1px solid var(--color-silver)' }}
                >
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)', fontWeight: 600 }}>
                    {rec.sectionCode}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                    {rec.sectionName}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    {rec.rateIndividual}%
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    {rec.rateCompany}%
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    {rec.thresholdAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-sm"
                      style={{
                        backgroundColor:
                          rec.status === 'Active' ? 'var(--color-teal-tint)' : '#FFE8EA',
                        color: rec.status === 'Active' ? 'var(--color-teal)' : 'var(--color-error)',
                      }}
                    >
                      {rec.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-sm"
                      style={getStatusBadgeStyle(rec.approvalStatus)}
                    >
                      {rec.approvalStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {rec.approvalStatus === 'Pending Approval' && (
                        <button
                          onClick={() => handleReview(rec)}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: 'var(--color-teal)' }}
                          title="Review Changes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(rec)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'var(--color-mercury-grey)' }}
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rec.id)}
                        className="p-2 rounded-lg transition-colors"
                        style={{
                          color:
                            rec.approvalStatus === 'Approved' ? '#C4C4C4' : 'var(--color-error)',
                          cursor: rec.approvalStatus === 'Approved' ? 'not-allowed' : 'pointer',
                        }}
                        title={
                          rec.approvalStatus === 'Approved'
                            ? 'Cannot delete approved records'
                            : 'Delete'
                        }
                        disabled={rec.approvalStatus === 'Approved'}
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
