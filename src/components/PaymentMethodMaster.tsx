import { ArrowLeft, Plus, Trash2, X, Hash, CreditCard, FileText, Edit, Eye } from 'lucide-react';
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

interface PaymentMethod {
  id: string;
  methodCode: string;
  methodName: string;
  description: string;
  processingTime: string;
  maxAmount: number;
  currency: string;
  isOnline: boolean;
  status: 'Active' | 'Inactive';
  approvalStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  entityMappings?: any[];
  originalData?: PaymentMethod;
}

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

export function PaymentMethodMaster() {
  const navigate = useNavigate();
  const [records, setRecords] = useIncrementalMasterRecords<PaymentMethod>(
    'payment_method_master',
    [
      {
        id: '1',
        methodCode: 'NEFT',
        methodName: 'National Electronic Fund Transfer',
        description: 'Bank-to-bank electronic fund transfer',
        processingTime: 'T+1',
        maxAmount: 0,
        currency: 'INR',
        isOnline: true,
        status: 'Active',
        approvalStatus: 'Approved',
      },
      {
        id: '2',
        methodCode: 'RTGS',
        methodName: 'Real Time Gross Settlement',
        description: 'Real-time high-value transfers, min 2,00,000',
        processingTime: 'T+0',
        maxAmount: 0,
        currency: 'INR',
        isOnline: true,
        status: 'Active',
        approvalStatus: 'Approved',
      },
      {
        id: '3',
        methodCode: 'IMPS',
        methodName: 'Immediate Payment Service',
        description: 'Instant interbank transfer up to 5 lakh',
        processingTime: 'T+0',
        maxAmount: 500000,
        currency: 'INR',
        isOnline: true,
        status: 'Active',
        approvalStatus: 'Approved',
      },
      {
        id: '4',
        methodCode: 'UPI',
        methodName: 'Unified Payments Interface',
        description: 'Instant mobile payment up to 1 lakh',
        processingTime: 'T+0',
        maxAmount: 100000,
        currency: 'INR',
        isOnline: true,
        status: 'Active',
        approvalStatus: 'Approved',
      },
      {
        id: '5',
        methodCode: 'CHQ',
        methodName: 'Cheque/DD',
        description: 'Physical cheque or demand draft',
        processingTime: '3-5 days',
        maxAmount: 0,
        currency: 'INR',
        isOnline: false,
        status: 'Active',
        approvalStatus: 'Approved',
      },
      {
        id: '6',
        methodCode: 'WIRE',
        methodName: 'International Wire Transfer',
        description: 'Cross-border wire transfer via SWIFT',
        processingTime: 'T+2',
        maxAmount: 0,
        currency: 'INR',
        isOnline: true,
        status: 'Active',
        approvalStatus: 'Approved',
      },
      {
        id: '7',
        methodCode: 'ACH',
        methodName: 'Automated Clearing House',
        description: 'Batch electronic transfers',
        processingTime: 'T+1',
        maxAmount: 0,
        currency: 'INR',
        isOnline: true,
        status: 'Active',
        approvalStatus: 'Approved',
      },
    ]
  );

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [methodCode, setMethodCode] = useState('');
  const [methodName, setMethodName] = useState('');
  const [description, setDescription] = useState('');
  const [processingTime, setProcessingTime] = useState('');
  const [maxAmount, setMaxAmount] = useState(0);
  const [currency, setCurrency] = useState('INR');
  const [isOnline, setIsOnline] = useState(true);
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [entityMappings, setEntityMappings] = useState<EntityScopeMapping[]>([]);

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<PaymentMethod | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<string[]>([]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const haystack = [r.methodCode, r.methodName, r.description, r.processingTime]
        .join(' ')
        .toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(r.status);
      const matchesApproval =
        approvalFilter.length === 0 || approvalFilter.includes(r.approvalStatus);
      return matchesSearch && matchesStatus && matchesApproval;
    });
  }, [records, searchTerm, statusFilter, approvalFilter]);

  const handleSubmit = (approvalStatus: PaymentMethod['approvalStatus'] = 'Pending Approval') => {
    if (isEditMode && editingId) {
      const originalRecord = records.find((d) => d.id === editingId);
      const updated: PaymentMethod = {
        id: editingId,
        methodCode,
        methodName,
        description,
        processingTime,
        maxAmount,
        currency,
        isOnline,
        status,
        approvalStatus,
        originalData: originalRecord,
        entityMappings,
      };
      setRecords(records.map((d) => (d.id === editingId ? updated : d)));
    } else {
      const newRec: PaymentMethod = {
        id: Date.now().toString(),
        methodCode,
        methodName,
        description,
        processingTime,
        maxAmount,
        currency,
        isOnline,
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
    setMethodCode('');
    setMethodName('');
    setDescription('');
    setProcessingTime('');
    setMaxAmount(0);
    setCurrency('INR');
    setIsOnline(true);
    setStatus('Active');
    setEntityMappings([]);
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (rec: PaymentMethod) => {
    setIsEditMode(true);
    setEditingId(rec.id);
    setMethodCode(rec.methodCode || '');
    setMethodName(rec.methodName || '');
    setDescription(rec.description || '');
    setProcessingTime(rec.processingTime || '');
    setMaxAmount(rec.maxAmount || 0);
    setCurrency(rec.currency || 'INR');
    setIsOnline(rec.isOnline ?? true);
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

  const handleReview = (rec: PaymentMethod) => {
    const changes: Change[] = [];
    if (rec.originalData) {
      const o = rec.originalData;
      if (o.methodCode !== rec.methodCode)
        changes.push({ field: 'Method Code', oldValue: o.methodCode, newValue: rec.methodCode });
      if (o.methodName !== rec.methodName)
        changes.push({ field: 'Method Name', oldValue: o.methodName, newValue: rec.methodName });
      if (o.description !== rec.description)
        changes.push({ field: 'Description', oldValue: o.description, newValue: rec.description });
      if (o.processingTime !== rec.processingTime)
        changes.push({
          field: 'Processing Time',
          oldValue: o.processingTime,
          newValue: rec.processingTime,
        });
      if (o.maxAmount !== rec.maxAmount)
        changes.push({
          field: 'Max Amount',
          oldValue: String(o.maxAmount),
          newValue: String(rec.maxAmount),
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
        'payment_method_master',
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
        'payment_method_master',
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
        'payment_method_master',
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
    const fields = [methodCode, methodName, processingTime, status];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [methodCode, methodName, processingTime, status]);

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
        masterName="Payment Method Master"
        title={editingId ? 'Edit Payment Method' : 'Create Payment Method'}
        subtitle="Manage payment methods with approval workflow"
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
        <FormSection title="Payment Method Details" columns={2}>
          <PxFormField label="Method Code" required filled={!!methodCode.trim()}>
            <input
              type="text"
              value={methodCode}
              onChange={(e) => setMethodCode(e.target.value)}
              placeholder="e.g., NEFT"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Method Name" required filled={!!methodName.trim()}>
            <input
              type="text"
              value={methodName}
              onChange={(e) => setMethodName(e.target.value)}
              placeholder="e.g., National Electronic Fund Transfer"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Description" filled={!!description.trim()}>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Method description"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Processing Time" required filled={!!processingTime.trim()}>
            <input
              type="text"
              value={processingTime}
              onChange={(e) => setProcessingTime(e.target.value)}
              placeholder="e.g., T+0, T+1"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Max Amount (0 = unlimited)" filled={maxAmount > 0}>
            <input
              type="number"
              value={maxAmount}
              onChange={(e) => setMaxAmount(Number(e.target.value))}
              placeholder="0"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Currency" filled={!!currency.trim()}>
            <input
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="INR"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Online Method" filled>
            <select
              value={isOnline ? 'Yes' : 'No'}
              onChange={(e) => setIsOnline(e.target.value === 'Yes')}
              className="px-select"
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
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
      masterName="Payment Method Master"
      description="Manage payment methods and channels"
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
          Add Payment Method
        </button>
      </div>

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        recordType="Payment Method Master"
        recordId={currentReviewRecord?.methodCode || ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />

      <MasterListToolbar
        masterName="Payment Methods"
        masterKey="payment_method_master"
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
          { key: 'methodCode', label: 'Method Code' },
          { key: 'methodName', label: 'Method Name' },
          { key: 'description', label: 'Description' },
          { key: 'processingTime', label: 'Processing Time' },
          { key: 'maxAmount', label: 'Max Amount' },
          { key: 'currency', label: 'Currency' },
          { key: 'isOnline', label: 'Is Online' },
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
                  Code
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Method Name
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Processing Time
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Max Amount
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Online
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
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                    {rec.methodCode}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                    {rec.methodName}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    {rec.processingTime}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    {rec.maxAmount === 0 ? 'Unlimited' : rec.maxAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    {rec.isOnline ? 'Yes' : 'No'}
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
