import { ArrowLeft, Plus, Trash2, X, Hash, DollarSign, FileText, Edit, Eye } from 'lucide-react';
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

type CurrencyRecord = {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimalPrecision: number;
  isBaseCurrency: boolean;
  isActive: boolean;
  approvalStatus?: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Changes Requested';
  originalData?: CurrencyRecord;
};

export function CurrencyMaster() {
  const navigate = useNavigate();
  const { currencies: baseCurrencies } = useMasterData();
  const [currencies, setCurrencies] = useIncrementalMasterRecords<CurrencyRecord>('currency_master', baseCurrencies as CurrencyRecord[]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<CurrencyRecord | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [decimalPrecision, setDecimalPrecision] = useState('2');
  const [isBaseCurrency, setIsBaseCurrency] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setEditingId(null);
    setCode('');
    setName('');
    setSymbol('');
    setDecimalPrecision('2');
    setIsBaseCurrency(false);
    setIsActive(true);
  };

  const handleEdit = (currency: CurrencyRecord) => {
    setEditingId(currency.id);
    setCode(currency.code);
    setName(currency.name);
    setSymbol(currency.symbol);
    setDecimalPrecision(String(currency.decimalPrecision));
    setIsBaseCurrency(currency.isBaseCurrency);
    setIsActive(currency.isActive);
    setShowForm(true);
  };

  const handleSubmit = (approvalStatus: CurrencyRecord['approvalStatus'] = 'Pending Approval') => {
    const originalRecord = currencies.find((currency) => currency.id === editingId);
    const record: CurrencyRecord = {
      id: editingId || Date.now().toString(),
      code,
      name,
      symbol,
      decimalPrecision: Number(decimalPrecision),
      isBaseCurrency,
      isActive,
      approvalStatus,
      originalData: editingId ? originalRecord : undefined,
    };

    if (editingId) {
      setCurrencies(currencies.map((currency: any) => currency.id === editingId ? record : currency));
    } else {
      setCurrencies([...currencies, record]);
    }

    setShowForm(false);
    resetForm();
  };

  const handleReview = (currency: CurrencyRecord) => {
    const changes: Change[] = [];
    const original = currency.originalData;
    if (original) {
      if (original.code !== currency.code) changes.push({ field: 'Currency Code', oldValue: original.code, newValue: currency.code });
      if (original.name !== currency.name) changes.push({ field: 'Currency Name', oldValue: original.name, newValue: currency.name });
      if (original.symbol !== currency.symbol) changes.push({ field: 'Symbol', oldValue: original.symbol, newValue: currency.symbol });
      if (original.decimalPrecision !== currency.decimalPrecision) changes.push({ field: 'Decimal Precision', oldValue: String(original.decimalPrecision), newValue: String(currency.decimalPrecision) });
      if (original.isBaseCurrency !== currency.isBaseCurrency) changes.push({ field: 'Base Currency', oldValue: original.isBaseCurrency ? 'Yes' : 'No', newValue: currency.isBaseCurrency ? 'Yes' : 'No' });
      if (original.isActive !== currency.isActive) changes.push({ field: 'Status', oldValue: original.isActive ? 'Active' : 'Inactive', newValue: currency.isActive ? 'Active' : 'Inactive' });
    }
    setCurrentReviewRecord(currency);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (!currentReviewRecord) return;
    const nextRecords = await applyMasterApprovalAction('currency_master', currencies, currentReviewRecord.id, 'approve');
    setCurrencies(nextRecords);
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (!currentReviewRecord) return;
    const nextRecords = await applyMasterApprovalAction('currency_master', currencies, currentReviewRecord.id, 'reject');
    setCurrencies(nextRecords);
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleRequestInfo = async () => {
    if (!currentReviewRecord) return;
    const comments = window.prompt('Enter comments for the request:', '');
    if (comments === null) return;
    const nextRecords = await applyMasterApprovalAction('currency_master', currencies, currentReviewRecord.id, 'request_info', comments);
    setCurrencies(nextRecords);
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
        title={editingId ? 'Edit Currency' : 'Create Currency'}
        subtitle="Manage currencies and currency codes"
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
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Currency Code <span style={{ color: '#FF4E5B' }}>*</span></label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g., INR" className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Currency Name <span style={{ color: '#FF4E5B' }}>*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Indian Rupee" className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Symbol <span style={{ color: '#FF4E5B' }}>*</span></label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
              <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="e.g., ₹" className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Decimal Precision <span style={{ color: '#FF4E5B' }}>*</span></label>
            <input type="number" value={decimalPrecision} onChange={(e) => setDecimalPrecision(e.target.value)} className="w-full px-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
          </div>
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ border: '1px solid #D7E3EA', backgroundColor: '#FFFFFF' }}>
            <input id="base-currency" type="checkbox" checked={isBaseCurrency} onChange={(e) => setIsBaseCurrency(e.target.checked)} />
            <label htmlFor="base-currency" style={{ color: '#0A0F14' }}>Set as base currency</label>
          </div>
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ border: '1px solid #D7E3EA', backgroundColor: '#FFFFFF' }}>
            <input id="currency-status" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <label htmlFor="currency-status" style={{ color: '#0A0F14' }}>Active currency</label>
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
            <h1 className="text-3xl" style={{ color: '#0A0F14' }}>Currency Master</h1>
            <p style={{ color: '#6E7A82' }}>Manage currencies and currency codes (INR, AED, USD, EUR, GBP)</p>
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
          Add Currency
        </button>
      </div>

      <div className="bg-white rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: '#F6F9FC' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Currency Code</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Currency Name</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Symbol</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Decimal Precision</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Base Currency</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Status</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Approval</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currencies.map((currency, index) => (
                <tr key={currency.id} style={{ borderTop: index === 0 ? 'none' : '1px solid #E1E6EA' }}>
                  <td className="px-6 py-4" style={{ color: '#0A0F14', fontWeight: '600' }}>{currency.code}</td>
                  <td className="px-6 py-4" style={{ color: '#0A0F14' }}>{currency.name}</td>
                  <td className="px-6 py-4" style={{ color: '#6E7A82', fontSize: '18px' }}>{currency.symbol}</td>
                  <td className="px-6 py-4" style={{ color: '#6E7A82' }}>{currency.decimalPrecision}</td>
                  <td className="px-6 py-4">
                    {currency.isBaseCurrency && (
                      <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: '#E8F7F8', color: '#00A9B7' }}>
                        Base
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={getStatusBadgeStyle(currency.isActive)}>
                      {currency.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={getApprovalBadgeStyle(currency.approvalStatus)}>
                      {currency.approvalStatus ?? 'Approved'}
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
                        onClick={() => handleEdit(currency)}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {(currency.approvalStatus === 'Pending Approval' || currency.approvalStatus === 'Changes Requested' || currency.approvalStatus === 'Draft') && (
                        <button
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: '#00A9B7' }}
                          title="Review Changes"
                          onClick={() => handleReview(currency)}
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
          ℹ️ Currency Master supports multi-country entities. INR is the base currency. Showing {currencies.length} currencies.
        </p>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-xl">
            <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: '#E1E6EA' }}>
              <h2 className="text-xl" style={{ color: '#0A0F14' }}>{editingId ? 'Edit Currency' : 'Add Currency'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg" style={{ color: '#6E7A82' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Code" className="px-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA' }} />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="px-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA' }} />
              <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="Symbol" className="px-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA' }} />
              <input value={decimalPrecision} onChange={(e) => setDecimalPrecision(e.target.value)} placeholder="Decimal Precision" className="px-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA' }} />
              <label className="flex items-center gap-2 text-sm" style={{ color: '#0A0F14' }}><input type="checkbox" checked={isBaseCurrency} onChange={(e) => setIsBaseCurrency(e.target.checked)} />Base Currency</label>
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
        recordType="Currency Master"
        recordId={currentReviewRecord?.id ?? ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />
    </div>
  );
}
