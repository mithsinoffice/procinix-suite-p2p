import { ArrowLeft, Plus, Trash2, X, Hash, Building2, FileText, Edit, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useMasterData } from '../contexts/MasterDataContext';
import { ApprovalModal } from './ApprovalModal';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { MasterFormPage } from './ui/MasterFormPage';

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

type EntityRecord = {
  id: string;
  code: string;
  legalName: string;
  name: string;
  country: string;
  currency: string;
  taxRegime: string;
  isActive: boolean;
  approvalStatus?: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Changes Requested';
  originalData?: EntityRecord;
};

export function EntityMaster() {
  const navigate = useNavigate();
  const { entities: baseEntities } = useMasterData();
  const [entities, setEntities] = useIncrementalMasterRecords<EntityRecord>('entity_master', baseEntities as EntityRecord[]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<EntityRecord | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [legalName, setLegalName] = useState('');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('');
  const [taxRegime, setTaxRegime] = useState('GST');
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setEditingId(null);
    setCode('');
    setLegalName('');
    setCountry('');
    setCurrency('');
    setTaxRegime('GST');
    setIsActive(true);
  };

  const handleEdit = (entity: EntityRecord) => {
    setEditingId(entity.id);
    setCode(entity.code);
    setLegalName(entity.legalName);
    setCountry(entity.country);
    setCurrency(entity.currency);
    setTaxRegime(entity.taxRegime);
    setIsActive(entity.isActive);
    setShowForm(true);
  };

  const handleSubmit = (approvalStatus: EntityRecord['approvalStatus'] = 'Pending Approval') => {
    const originalRecord = entities.find((entity) => entity.id === editingId);
    const record: EntityRecord = {
      ...(entities.find((entity: any) => entity.id === editingId) || {}),
      id: editingId || Date.now().toString(),
      code,
      legalName,
      name: legalName,
      country,
      currency,
      taxRegime,
      isActive,
      approvalStatus,
      originalData: editingId ? originalRecord : undefined,
    };

    if (editingId) {
      setEntities(entities.map((entity: any) => entity.id === editingId ? record : entity));
    } else {
      setEntities([...entities, record]);
    }

    setShowForm(false);
    resetForm();
  };

  const handleReview = (entity: EntityRecord) => {
    const changes: Change[] = [];
    const original = entity.originalData;
    if (original) {
      if (original.code !== entity.code) changes.push({ field: 'Entity Code', oldValue: original.code, newValue: entity.code });
      if (original.legalName !== entity.legalName) changes.push({ field: 'Legal Name', oldValue: original.legalName, newValue: entity.legalName });
      if (original.country !== entity.country) changes.push({ field: 'Country', oldValue: original.country, newValue: entity.country });
      if (original.currency !== entity.currency) changes.push({ field: 'Currency', oldValue: original.currency, newValue: entity.currency });
      if (original.taxRegime !== entity.taxRegime) changes.push({ field: 'Tax Regime', oldValue: original.taxRegime, newValue: entity.taxRegime });
      if (original.isActive !== entity.isActive) changes.push({ field: 'Status', oldValue: original.isActive ? 'Active' : 'Inactive', newValue: entity.isActive ? 'Active' : 'Inactive' });
    }
    setCurrentReviewRecord(entity);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (!currentReviewRecord) return;
    const nextRecords = await applyMasterApprovalAction('entity_master', entities, currentReviewRecord.id, 'approve');
    setEntities(nextRecords);
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (!currentReviewRecord) return;
    const nextRecords = await applyMasterApprovalAction('entity_master', entities, currentReviewRecord.id, 'reject');
    setEntities(nextRecords);
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleRequestInfo = async () => {
    if (!currentReviewRecord) return;
    const comments = window.prompt('Enter comments for the request:', '');
    if (comments === null) return;
    const nextRecords = await applyMasterApprovalAction('entity_master', entities, currentReviewRecord.id, 'request_info', comments);
    setEntities(nextRecords);
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const getStatusBadgeStyle = (isActive: boolean) => {
    return isActive
      ? { backgroundColor: '#E8F7F8', color: '#00A9B7' }
      : { backgroundColor: '#FFE8EA', color: '#FF4E5B' };
  };

  const getApprovalBadgeStyle = (approvalStatus?: string) => {
    switch (approvalStatus) {
      case 'Pending Approval':
        return { backgroundColor: '#FFF9E6', color: '#D97706' };
      case 'Rejected':
        return { backgroundColor: '#FFE8EA', color: '#FF4E5B' };
      case 'Changes Requested':
        return { backgroundColor: '#E0F2FE', color: '#0284C7' };
      case 'Draft':
        return { backgroundColor: '#E5E7EB', color: '#6E7A82' };
      default:
        return { backgroundColor: '#E8F7F8', color: '#00A9B7' };
    }
  };

  if (showForm) {
    return (
      <MasterFormPage
        title={editingId ? 'Edit Entity' : 'Create Entity'}
        subtitle="Manage legal entities, companies, and branches"
        modeLabel={editingId ? 'Edit Master Record' : 'Create Master Record'}
        onBack={() => setShowForm(false)}
        onCancel={() => {
          setShowForm(false);
          resetForm();
        }}
        onSaveDraft={() => handleSubmit('Draft')}
        onSubmit={() => handleSubmit('Pending Approval')}
        submitLabel="Submit"
        draftLabel="Save Draft"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Entity Code <span style={{ color: '#FF4E5B' }}>*</span></label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g., SUBKO-IN" className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Legal Name <span style={{ color: '#FF4E5B' }}>*</span></label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
              <input type="text" value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Enter legal entity name" className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Country <span style={{ color: '#FF4E5B' }}>*</span></label>
            <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g., India" className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Currency <span style={{ color: '#FF4E5B' }}>*</span></label>
            <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="e.g., INR" className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Tax Regime <span style={{ color: '#FF4E5B' }}>*</span></label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
              <select value={taxRegime} onChange={(e) => setTaxRegime(e.target.value)} className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
                <option value="GST">GST</option>
                <option value="VAT">VAT</option>
                <option value="Sales Tax">Sales Tax</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ border: '1px solid #D7E3EA', backgroundColor: '#FFFFFF' }}>
            <input id="entity-active" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <label htmlFor="entity-active" style={{ color: '#0A0F14' }}>Entity is active</label>
          </div>
        </div>
      </MasterFormPage>
    );
  }

  return (
    <div className="p-8" style={{ backgroundColor: '#F6F9FC' }}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/masters')} className="p-2 rounded-lg transition-colors" style={{ color: '#6E7A82' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl" style={{ color: '#0A0F14' }}>Entity Master</h1>
            <p style={{ color: '#6E7A82' }}>Manage legal entities, companies, and branches</p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-colors"
          style={{ backgroundColor: '#00A9B7' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
        >
          <Plus className="w-5 h-5" />
          Add Entity
        </button>
      </div>

      <div className="bg-white rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: '#F6F9FC' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Entity Code</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Legal Name</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Country</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Currency</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Tax Regime</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Status</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Approval</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entities.map((entity, index) => (
                <tr key={entity.id} style={{ borderTop: index === 0 ? 'none' : '1px solid #E1E6EA' }}>
                  <td className="px-6 py-4" style={{ color: '#0A0F14', fontWeight: '600' }}>{entity.code}</td>
                  <td className="px-6 py-4" style={{ color: '#0A0F14' }}>{entity.legalName}</td>
                  <td className="px-6 py-4" style={{ color: '#6E7A82' }}>{entity.country}</td>
                  <td className="px-6 py-4" style={{ color: '#6E7A82' }}>{entity.currency}</td>
                  <td className="px-6 py-4" style={{ color: '#6E7A82' }}>{entity.taxRegime}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={getStatusBadgeStyle(entity.isActive)}>
                      {entity.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={getApprovalBadgeStyle(entity.approvalStatus)}>
                      {entity.approvalStatus ?? 'Approved'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        className="p-2 rounded-lg transition-colors" 
                        style={{ color: '#6E7A82' }} 
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-2 rounded-lg transition-colors" 
                        style={{ color: '#6E7A82' }} 
                        title="Edit"
                        onClick={() => handleEdit(entity)}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {(entity.approvalStatus === 'Pending Approval' || entity.approvalStatus === 'Changes Requested' || entity.approvalStatus === 'Draft') && (
                        <button
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: '#00A9B7' }}
                          title="Review Changes"
                          onClick={() => handleReview(entity)}
                        >
                          <Eye className="w-4 h-4" />
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

      {/* Info Banner */}
      <div 
        className="mt-6 p-4 rounded-lg"
        style={{ backgroundColor: '#FFF9E6', border: '1px solid #FCD34D' }}
      >
        <p className="text-sm" style={{ color: '#D97706' }}>
          ℹ️ Entity Master is populated from the canonical entity registry. Showing {entities.length} active entities.
        </p>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-xl">
            <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: '#E1E6EA' }}>
              <h2 className="text-xl" style={{ color: '#0A0F14' }}>{editingId ? 'Edit Entity' : 'Add Entity'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg" style={{ color: '#6E7A82' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Entity Code" className="px-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA' }} />
              <input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Legal Name" className="px-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA' }} />
              <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" className="px-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA' }} />
              <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder="Currency" className="px-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA' }} />
              <select value={taxRegime} onChange={(e) => setTaxRegime(e.target.value)} className="px-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
                <option value="GST">GST</option>
                <option value="VAT">VAT</option>
                <option value="None">None</option>
              </select>
              <label className="flex items-center gap-2 text-sm" style={{ color: '#0A0F14' }}><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />Active</label>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-3" style={{ borderColor: '#E1E6EA' }}>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#6E7A82' }}>Cancel</button>
              <button onClick={() => handleSubmit('Draft')} className="px-4 py-2 rounded-lg" style={{ border: '1px solid #BFE8EC', color: '#0F8A95', backgroundColor: '#ECFEFF', fontWeight: 700 }}>Save Draft</button>
              <button onClick={() => handleSubmit('Pending Approval')} className="px-4 py-2 rounded-lg text-white" style={{ backgroundColor: '#00A9B7' }}>Submit</button>
            </div>
          </div>
        </div>
      )}

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        recordType="Entity Master"
        recordId={currentReviewRecord?.id ?? ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />
    </div>
  );
}
