import { ArrowLeft, Plus, Trash2, X, RefreshCw, DollarSign, FileText, Edit, Eye, Calendar } from 'lucide-react';
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
        return { backgroundColor: '#FFE8EA', color: '#FF4E5B' };
      case 'Changes Requested':
        return { backgroundColor: '#E0F2FE', color: '#0284C7' };
      case 'Draft':
        return { backgroundColor: '#E5E7EB', color: '#6E7A82' };
      default:
        return { backgroundColor: '#E8F7F8', color: '#00A9B7' };
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
      ? { backgroundColor: '#E8F7F8', color: '#00A9B7' }
      : { backgroundColor: '#FFE8EA', color: '#FF4E5B' };
  };

  const getRateTypeBadgeStyle = (rateType: string) => {
    return rateType === 'Standard'
      ? { backgroundColor: '#E5E7EB', color: '#6E7A82' }
      : { backgroundColor: '#FFF9E6', color: '#D97706' };
  };

  if (showForm) {
    return (
      <MasterFormPage
        title={editingId ? 'Edit Exchange Rate' : 'Create Exchange Rate'}
        subtitle="Manage exchange rates between currencies for multi-entity operations"
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
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>From Currency <span style={{ color: '#FF4E5B' }}>*</span></label>
            <input type="text" value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)} placeholder="e.g., USD" className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>To Currency <span style={{ color: '#FF4E5B' }}>*</span></label>
            <input type="text" value={toCurrency} onChange={(e) => setToCurrency(e.target.value)} placeholder="e.g., INR" className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Exchange Rate <span style={{ color: '#FF4E5B' }}>*</span></label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
              <input type="number" step="0.0001" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} placeholder="e.g., 83.1250" className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Rate Type <span style={{ color: '#FF4E5B' }}>*</span></label>
            <div className="relative">
              <RefreshCw className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
              <select value={rateType} onChange={(e) => setRateType(e.target.value)} className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
                <option value="Standard">Standard</option>
                <option value="Closing">Closing</option>
                <option value="Average">Average</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Effective From <span style={{ color: '#FF4E5B' }}>*</span></label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
              <input type="date" value={effectiveFromDate} onChange={(e) => setEffectiveFromDate(e.target.value)} className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ border: '1px solid #D7E3EA', backgroundColor: '#FFFFFF' }}>
            <input id="exchange-active" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <label htmlFor="exchange-active" style={{ color: '#0A0F14' }}>Rate is active</label>
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
            <h1 className="text-3xl" style={{ color: '#0A0F14' }}>Exchange Rate Master</h1>
            <p style={{ color: '#6E7A82' }}>Manage exchange rates between currencies for multi-entity operations</p>
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
          Add Exchange Rate
        </button>
      </div>

      <div className="bg-white rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: '#F6F9FC' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>From Currency</th>
                <th className="px-6 py-4 text-center text-sm" style={{ color: '#6E7A82' }}>→</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>To Currency</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Exchange Rate</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Rate Type</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Effective From</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Status</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Approval</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exchangeRates.map((rate, index) => (
                <tr key={rate.id} style={{ borderTop: index === 0 ? 'none' : '1px solid #E1E6EA' }}>
                  <td className="px-6 py-4" style={{ color: '#0A0F14', fontWeight: '600' }}>{rate.fromCurrency}</td>
                  <td className="px-6 py-4 text-center">
                    <RefreshCw className="w-4 h-4 inline" style={{ color: '#6E7A82' }} />
                  </td>
                  <td className="px-6 py-4" style={{ color: '#0A0F14', fontWeight: '600' }}>{rate.toCurrency}</td>
                  <td className="px-6 py-4" style={{ color: '#0A0F14', fontWeight: '600' }}>{rate.exchangeRate.toFixed(4)}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={getRateTypeBadgeStyle(rate.rateType)}>
                      {rate.rateType}
                    </span>
                  </td>
                  <td className="px-6 py-4" style={{ color: '#6E7A82' }}>
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
                        style={{ color: '#6E7A82' }} 
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-2 rounded-lg transition-colors" 
                        style={{ color: '#6E7A82' }} 
                        title="Edit"
                        onClick={() => handleEdit(rate)}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {(rate.approvalStatus === 'Pending Approval' || rate.approvalStatus === 'Changes Requested' || rate.approvalStatus === 'Draft') && (
                        <button
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: '#00A9B7' }}
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
          style={{ backgroundColor: '#E8F7F8', border: '1px solid #00A9B7' }}
        >
          <p className="text-sm" style={{ color: '#007D87' }}>
            💡 Showing {exchangeRates.length} exchange rate mappings. Bidirectional rates available for INR ↔ AED, INR ↔ USD, AED ↔ USD.
          </p>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-xl">
            <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: '#E1E6EA' }}>
              <h2 className="text-xl" style={{ color: '#0A0F14' }}>{editingId ? 'Edit Exchange Rate' : 'Add Exchange Rate'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg" style={{ color: '#6E7A82' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <input value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value.toUpperCase())} placeholder="From Currency" className="px-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA' }} />
              <input value={toCurrency} onChange={(e) => setToCurrency(e.target.value.toUpperCase())} placeholder="To Currency" className="px-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA' }} />
              <input value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} placeholder="Exchange Rate" className="px-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA' }} />
              <select value={rateType} onChange={(e) => setRateType(e.target.value)} className="px-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
                <option value="Standard">Standard</option>
                <option value="Manual">Manual</option>
              </select>
              <input type="date" value={effectiveFromDate} onChange={(e) => setEffectiveFromDate(e.target.value)} className="px-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA' }} />
              <label className="flex items-center gap-2 text-sm" style={{ color: '#0A0F14' }}><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />Active</label>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-3" style={{ borderColor: '#E1E6EA' }}>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#6E7A82' }}>Cancel</button>
              <button onClick={handleSubmit} className="px-4 py-2 rounded-lg text-white" style={{ backgroundColor: '#00A9B7' }}>Save</button>
            </div>
          </div>
        </div>
      )}

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
