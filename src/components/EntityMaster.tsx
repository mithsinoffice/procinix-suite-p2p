import { ArrowLeft, Plus, Trash2, X, Hash, Building2, FileText, Edit, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo, useCallback } from 'react';
import { useMasterData } from '../contexts/MasterDataContext';
import { ApprovalModal } from './ApprovalModal';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { FormShell, FormSection, PxFormField, CheckCard, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';

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
  const { entities: baseEntities, currencies: masterCurrencies } = useMasterData();
  const uniqueCountries = [...new Set(baseEntities.map((e: any) => e.country).filter(Boolean))].sort();
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
      ? { backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal)' }
      : { backgroundColor: '#FFE8EA', color: 'var(--color-error)' };
  };

  const getApprovalBadgeStyle = (approvalStatus?: string) => {
    switch (approvalStatus) {
      case 'Pending Approval':
        return { backgroundColor: '#FFF9E6', color: '#D97706' };
      case 'Rejected':
        return { backgroundColor: '#FFE8EA', color: 'var(--color-error)' };
      case 'Changes Requested':
        return { backgroundColor: '#E0F2FE', color: '#0284C7' };
      case 'Draft':
        return { backgroundColor: '#E5E7EB', color: 'var(--color-mercury-grey)' };
      default:
        return { backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal)' };
    }
  };

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const completeness = useMemo(() => {
    const fields = [code, legalName, country, currency, taxRegime];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [code, legalName, country, currency, taxRegime]);

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
        title={editingId ? 'Edit Entity' : 'Create Entity'}
        subtitle="Manage legal entities, companies, and branches"
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
        <FormSection title="Entity Details" columns={2}>
          <PxFormField label="Entity Code" required filled={!!code.trim()} hint="Unique identifier across all entities">
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g., SUBKO-IN" className="px-input" />
          </PxFormField>
          <PxFormField label="Legal Name" required filled={!!legalName.trim()}>
            <input type="text" value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Enter legal entity name" className="px-input" />
          </PxFormField>
          <PxFormField label="Country" required filled={!!country.trim()} hint="Country of incorporation">
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="px-select">
              <option value="">Select country...</option>
              {uniqueCountries.map((c: string) => <option key={c} value={c}>{c}</option>)}
              {country && !uniqueCountries.includes(country) && <option value={country}>{country}</option>}
              <option value="India">India</option>
              <option value="UAE">UAE</option>
              <option value="USA">USA</option>
              <option value="UK">UK</option>
              <option value="Singapore">Singapore</option>
            </select>
          </PxFormField>
          <PxFormField label="Currency" required filled={!!currency.trim()} hint="ISO 4217 code">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="px-select">
              <option value="">Select currency...</option>
              {masterCurrencies.filter((c: any) => c.isActive !== false).map((c: any) => (
                <option key={c.id} value={c.code}>{c.code}{c.name ? ` — ${c.name}` : ''}</option>
              ))}
              {currency && !masterCurrencies.some((c: any) => c.code === currency) && <option value={currency}>{currency}</option>}
            </select>
          </PxFormField>
          <PxFormField label="Tax Regime" required filled={!!taxRegime}>
            <select value={taxRegime} onChange={(e) => setTaxRegime(e.target.value)} className="px-select">
              <option value="GST">GST</option>
              <option value="VAT">VAT</option>
              <option value="Sales Tax">Sales Tax</option>
            </select>
          </PxFormField>
          <CheckCard
            title="Entity is Active"
            subtitle="Inactive entities are hidden from transaction forms"
            checked={isActive}
            onChange={setIsActive}
          />
        </FormSection>
      </FormShell>
    );
  }

  return (
    <div className="p-8" style={{ backgroundColor: 'var(--color-cloud)' }}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/masters')} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-mercury-grey)' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl" style={{ color: 'var(--color-ink)' }}>Entity Master</h1>
            <p style={{ color: 'var(--color-mercury-grey)' }}>Manage legal entities, companies, and branches</p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-colors"
          style={{ backgroundColor: 'var(--color-teal)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
        >
          <Plus className="w-5 h-5" />
          Add Entity
        </button>
      </div>

      <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Entity Code</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Legal Name</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Country</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Currency</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Tax Regime</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Status</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Approval</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entities.map((entity, index) => (
                <tr key={entity.id} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--color-silver)' }}>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{entity.code}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{entity.legalName}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>{entity.country}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>{entity.currency}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>{entity.taxRegime}</td>
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
                        style={{ color: 'var(--color-mercury-grey)' }} 
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-2 rounded-lg transition-colors" 
                        style={{ color: 'var(--color-mercury-grey)' }} 
                        title="Edit"
                        onClick={() => handleEdit(entity)}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {(entity.approvalStatus === 'Pending Approval' || entity.approvalStatus === 'Changes Requested' || entity.approvalStatus === 'Draft') && (
                        <button
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: 'var(--color-teal)' }}
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
            <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: 'var(--color-silver)' }}>
              <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>{editingId ? 'Edit Entity' : 'Add Entity'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg" style={{ color: 'var(--color-mercury-grey)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Entity Code" className="px-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)' }} />
              <input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Legal Name" className="px-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)' }} />
              <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" className="px-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)' }} />
              <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder="Currency" className="px-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)' }} />
              <select value={taxRegime} onChange={(e) => setTaxRegime(e.target.value)} className="px-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
                <option value="GST">GST</option>
                <option value="VAT">VAT</option>
                <option value="None">None</option>
              </select>
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-ink)' }}><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />Active</label>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-3" style={{ borderColor: 'var(--color-silver)' }}>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)', backgroundColor: '#FFFFFF', color: 'var(--color-mercury-grey)' }}>Cancel</button>
              <button onClick={() => handleSubmit('Draft')} className="px-4 py-2 rounded-lg" style={{ border: '1px solid #BFE8EC', color: '#0F8A95', backgroundColor: '#ECFEFF', fontWeight: 700 }}>Save Draft</button>
              <button onClick={() => handleSubmit('Pending Approval')} className="px-4 py-2 rounded-lg text-white" style={{ backgroundColor: 'var(--color-teal)' }}>Submit</button>
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
