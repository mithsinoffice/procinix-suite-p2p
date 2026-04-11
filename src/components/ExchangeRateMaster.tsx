import { ArrowLeft, Plus, Trash2, X, RefreshCw, DollarSign, FileText, Edit, Eye, Calendar } from 'lucide-react';
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

interface ExchangeRateRecord {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  rateType: string;
  effectiveFromDate: string;
  isActive: boolean;
  approvalStatus?: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Changes Requested';
  originalData?: ExchangeRateRecord;
}

export function ExchangeRateMaster() {
  const navigate = useNavigate();
  const { exchangeRates: baseExchangeRates } = useMasterData();
  const [exchangeRates, setExchangeRates] = useIncrementalMasterRecords<ExchangeRateRecord>('exchange_rate_master', baseExchangeRates as ExchangeRateRecord[]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<ExchangeRateRecord | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fromCurrency, setFromCurrency] = useState('');
  const [toCurrency, setToCurrency] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [rateType, setRateType] = useState('Standard');
  const [effectiveFromDate, setEffectiveFromDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setEditingId(null);
    setFromCurrency('');
    setToCurrency('');
    setExchangeRate('');
    setRateType('Standard');
    setEffectiveFromDate('');
    setIsActive(true);
  };

  const handleEdit = (rate: ExchangeRateRecord) => {
    setEditingId(rate.id);
    setFromCurrency(rate.fromCurrency);
    setToCurrency(rate.toCurrency);
    setExchangeRate(String(rate.exchangeRate));
    setRateType(rate.rateType);
    setEffectiveFromDate(rate.effectiveFromDate);
    setIsActive(rate.isActive);
    setShowForm(true);
  };

  const handleSubmit = (approvalStatus: ExchangeRateRecord['approvalStatus'] = 'Pending Approval') => {
    const originalRecord = exchangeRates.find((rate) => rate.id === editingId);
    const record: ExchangeRateRecord = {
      id: editingId || Date.now().toString(),
      fromCurrency,
      toCurrency,
      exchangeRate: Number(exchangeRate),
      rateType,
      effectiveFromDate,
      isActive,
      approvalStatus,
      originalData: editingId ? originalRecord : undefined,
    };

    if (editingId) {
      setExchangeRates(exchangeRates.map((rate: any) => rate.id === editingId ? record : rate));
    } else {
      setExchangeRates([...exchangeRates, record]);
    }

    setShowForm(false);
    resetForm();
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

  const handleReview = (rate: ExchangeRateRecord) => {
    const changes: Change[] = [];
    const original = rate.originalData;
    if (original) {
      if (original.fromCurrency !== rate.fromCurrency) changes.push({ field: 'From Currency', oldValue: original.fromCurrency, newValue: rate.fromCurrency });
      if (original.toCurrency !== rate.toCurrency) changes.push({ field: 'To Currency', oldValue: original.toCurrency, newValue: rate.toCurrency });
      if (original.exchangeRate !== rate.exchangeRate) changes.push({ field: 'Exchange Rate', oldValue: original.exchangeRate.toFixed(4), newValue: rate.exchangeRate.toFixed(4) });
      if (original.rateType !== rate.rateType) changes.push({ field: 'Rate Type', oldValue: original.rateType, newValue: rate.rateType });
      if (original.effectiveFromDate !== rate.effectiveFromDate) changes.push({ field: 'Effective From', oldValue: original.effectiveFromDate, newValue: rate.effectiveFromDate });
      if (original.isActive !== rate.isActive) changes.push({ field: 'Status', oldValue: original.isActive ? 'Active' : 'Inactive', newValue: rate.isActive ? 'Active' : 'Inactive' });
    }
    setCurrentReviewRecord(rate);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (!currentReviewRecord) return;
    const nextRecords = await applyMasterApprovalAction('exchange_rate_master', exchangeRates, currentReviewRecord.id, 'approve');
    setExchangeRates(nextRecords);
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (!currentReviewRecord) return;
    const nextRecords = await applyMasterApprovalAction('exchange_rate_master', exchangeRates, currentReviewRecord.id, 'reject');
    setExchangeRates(nextRecords);
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleRequestInfo = async () => {
    if (!currentReviewRecord) return;
    const comments = window.prompt('Enter comments for the request:', '');
    if (comments === null) return;
    const nextRecords = await applyMasterApprovalAction('exchange_rate_master', exchangeRates, currentReviewRecord.id, 'request_info', comments);
    setExchangeRates(nextRecords);
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const getStatusBadgeStyle = (isActive: boolean) => {
    return isActive
      ? { backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal)' }
      : { backgroundColor: '#FFE8EA', color: 'var(--color-error)' };
  };

  const getRateTypeBadgeStyle = (rateType: string) => {
    return rateType === 'Standard'
      ? { backgroundColor: '#E5E7EB', color: 'var(--color-mercury-grey)' }
      : { backgroundColor: '#FFF9E6', color: '#D97706' };
  };

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const completeness = useMemo(() => {
    const fields = [fromCurrency, toCurrency, exchangeRate, rateType, effectiveFromDate];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [fromCurrency, toCurrency, exchangeRate, rateType, effectiveFromDate]);

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
        title={editingId ? 'Edit Exchange Rate' : 'Create Exchange Rate'}
        subtitle="Manage exchange rates between currencies for multi-entity operations"
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
        <FormSection title="Rate Details" columns={2}>
          <PxFormField label="From Currency" required filled={!!fromCurrency.trim()}>
            <input type="text" value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)} placeholder="e.g., USD" className="px-input" />
          </PxFormField>
          <PxFormField label="To Currency" required filled={!!toCurrency.trim()}>
            <input type="text" value={toCurrency} onChange={(e) => setToCurrency(e.target.value)} placeholder="e.g., INR" className="px-input" />
          </PxFormField>
          <PxFormField label="Exchange Rate" required filled={!!exchangeRate.trim()}>
            <input type="number" step="0.0001" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} placeholder="e.g., 83.1250" className="px-input" />
          </PxFormField>
          <PxFormField label="Rate Type" required filled={!!rateType}>
            <select value={rateType} onChange={(e) => setRateType(e.target.value)} className="px-select">
              <option value="Standard">Standard</option>
              <option value="Closing">Closing</option>
              <option value="Average">Average</option>
            </select>
          </PxFormField>
          <PxFormField label="Effective From" required filled={!!effectiveFromDate.trim()}>
            <input type="date" value={effectiveFromDate} onChange={(e) => setEffectiveFromDate(e.target.value)} className="px-input" />
          </PxFormField>
          <CheckCard
            title="Rate is Active"
            subtitle="Inactive rates are hidden from transaction forms"
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
            <h1 className="text-3xl" style={{ color: 'var(--color-ink)' }}>Exchange Rate Master</h1>
            <p style={{ color: 'var(--color-mercury-grey)' }}>Manage exchange rates between currencies for multi-entity operations</p>
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
          Add Exchange Rate
        </button>
      </div>

      <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>From Currency</th>
                <th className="px-6 py-4 text-center text-sm" style={{ color: 'var(--color-mercury-grey)' }}>→</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>To Currency</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Exchange Rate</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Rate Type</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Effective From</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Status</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Approval</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exchangeRates.map((rate, index) => (
                <tr key={rate.id} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--color-silver)' }}>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{rate.fromCurrency}</td>
                  <td className="px-6 py-4 text-center">
                    <RefreshCw className="w-4 h-4 inline" style={{ color: 'var(--color-mercury-grey)' }} />
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{rate.toCurrency}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{rate.exchangeRate.toFixed(4)}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={getRateTypeBadgeStyle(rate.rateType)}>
                      {rate.rateType}
                    </span>
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      {rate.effectiveFromDate}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={getStatusBadgeStyle(rate.isActive)}>
                      {rate.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={getApprovalBadgeStyle(rate.approvalStatus)}>
                      {rate.approvalStatus ?? 'Approved'}
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
                        onClick={() => handleEdit(rate)}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {(rate.approvalStatus === 'Pending Approval' || rate.approvalStatus === 'Changes Requested' || rate.approvalStatus === 'Draft') && (
                        <button
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: 'var(--color-teal)' }}
                          title="Review Changes"
                          onClick={() => handleReview(rate)}
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

      {/* Info Banners */}
      <div className="mt-6 space-y-3">
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: '#FFF9E6', border: '1px solid #FCD34D' }}
        >
          <p className="text-sm" style={{ color: '#D97706' }}>
            ℹ️ Exchange rates are used for consolidated reporting and cross-entity analytics only. Not auto-applied to transactions.
          </p>
        </div>
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: 'var(--color-teal-tint)', border: '1px solid var(--color-teal)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-teal-dark)' }}>
            💡 Showing {exchangeRates.length} exchange rate mappings. Bidirectional rates available for INR ↔ AED, INR ↔ USD, AED ↔ USD.
          </p>
        </div>
      </div>

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        recordType="Exchange Rate Master"
        recordId={currentReviewRecord?.id ?? ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />
    </div>
  );
}
