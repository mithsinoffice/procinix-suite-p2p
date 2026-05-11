import { ArrowLeft, Plus, Trash2, X, Hash, DollarSign, FileText, Edit, Eye } from 'lucide-react';
import { MasterListToolbar } from './ui/MasterListToolbar';
import { tableHeaderBg, tableHeaderFg } from './ui/listingStyles';
import { useNavigate } from 'react-router-dom';
import { MasterPageShell } from './ui/MasterPageShell';
import { useState, useMemo, useCallback } from 'react';
import { useMasterData } from '../contexts/MasterDataContext';
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
  entityMappings?: EntityScopeMapping[];
  originalData?: CurrencyRecord;
};

export function CurrencyMaster() {
  const navigate = useNavigate();
  const { currencies: baseCurrencies } = useMasterData();
  const [currencies, setCurrencies] = useIncrementalMasterRecords<CurrencyRecord>(
    'currency_master',
    baseCurrencies as CurrencyRecord[]
  );
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<CurrencyRecord | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [decimalPrecision, setDecimalPrecision] = useState('2');
  const [isBaseCurrency, setIsBaseCurrency] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [entityMappings, setEntityMappings] = useState<EntityScopeMapping[]>([]);

  const filteredCurrencies = useMemo(() => {
    return currencies.filter((currency) => {
      const haystack = [currency.code, currency.name, currency.symbol].join(' ').toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const statusStr = currency.isActive ? 'Active' : 'Inactive';
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(statusStr);
      const matchesApproval =
        approvalFilter.length === 0 ||
        approvalFilter.includes(currency.approvalStatus ?? 'Approved');
      return matchesSearch && matchesStatus && matchesApproval;
    });
  }, [currencies, searchTerm, statusFilter, approvalFilter]);

  const resetForm = () => {
    setEditingId(null);
    setCode('');
    setName('');
    setSymbol('');
    setDecimalPrecision('2');
    setIsBaseCurrency(false);
    setIsActive(true);
    setEntityMappings([]);
  };

  const handleEdit = (currency: CurrencyRecord) => {
    setEditingId(currency.id);
    setCode(currency.code);
    setName(currency.name);
    setSymbol(currency.symbol);
    setDecimalPrecision(String(currency.decimalPrecision));
    setIsBaseCurrency(currency.isBaseCurrency);
    setIsActive(currency.isActive);
    setEntityMappings(currency.entityMappings || []);
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
      entityMappings,
    };

    if (editingId) {
      setCurrencies(
        currencies.map((currency: any) => (currency.id === editingId ? record : currency))
      );
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
      if (original.code !== currency.code)
        changes.push({ field: 'Currency Code', oldValue: original.code, newValue: currency.code });
      if (original.name !== currency.name)
        changes.push({ field: 'Currency Name', oldValue: original.name, newValue: currency.name });
      if (original.symbol !== currency.symbol)
        changes.push({ field: 'Symbol', oldValue: original.symbol, newValue: currency.symbol });
      if (original.decimalPrecision !== currency.decimalPrecision)
        changes.push({
          field: 'Decimal Precision',
          oldValue: String(original.decimalPrecision),
          newValue: String(currency.decimalPrecision),
        });
      if (original.isBaseCurrency !== currency.isBaseCurrency)
        changes.push({
          field: 'Base Currency',
          oldValue: original.isBaseCurrency ? 'Yes' : 'No',
          newValue: currency.isBaseCurrency ? 'Yes' : 'No',
        });
      if (original.isActive !== currency.isActive)
        changes.push({
          field: 'Status',
          oldValue: original.isActive ? 'Active' : 'Inactive',
          newValue: currency.isActive ? 'Active' : 'Inactive',
        });
    }
    setCurrentReviewRecord(currency);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (!currentReviewRecord) return;
    const nextRecords = await applyMasterApprovalAction(
      'currency_master',
      currencies,
      currentReviewRecord.id,
      'approve'
    );
    setCurrencies(nextRecords);
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (!currentReviewRecord) return;
    const nextRecords = await applyMasterApprovalAction(
      'currency_master',
      currencies,
      currentReviewRecord.id,
      'reject'
    );
    setCurrencies(nextRecords);
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleRequestInfo = async () => {
    if (!currentReviewRecord) return;
    const comments = window.prompt('Enter comments for the request:', '');
    if (comments === null) return;
    const nextRecords = await applyMasterApprovalAction(
      'currency_master',
      currencies,
      currentReviewRecord.id,
      'request_info',
      comments
    );
    setCurrencies(nextRecords);
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
    const fields = [code, name, symbol, decimalPrecision];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [code, name, symbol, decimalPrecision]);

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
        masterName="Currency Master"
        title={editingId ? 'Edit Currency' : 'Create Currency'}
        subtitle="Manage currencies and currency codes"
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
        <FormSection title="Currency Details" columns={2}>
          <PxFormField
            label="Currency Code"
            required
            filled={!!code.trim()}
            hint="ISO 4217 currency code"
          >
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., INR"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Currency Name" required filled={!!name.trim()}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Indian Rupee"
              className="px-input"
            />
          </PxFormField>
          <PxFormField
            label="Symbol"
            required
            filled={!!symbol.trim()}
            hint="Currency symbol for display"
          >
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="e.g., ₹"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Decimal Precision" required filled={!!decimalPrecision.trim()}>
            <input
              type="number"
              value={decimalPrecision}
              onChange={(e) => setDecimalPrecision(e.target.value)}
              className="px-input"
            />
          </PxFormField>
          <CheckCard
            title="Base Currency"
            subtitle="Set as the base currency for the system"
            checked={isBaseCurrency}
            onChange={setIsBaseCurrency}
          />
          <CheckCard
            title="Active Currency"
            subtitle="Inactive currencies are hidden from transaction forms"
            checked={isActive}
            onChange={setIsActive}
          />
          <EntityMappingSelector value={entityMappings} onChange={setEntityMappings} />
        </FormSection>
      </FormShell>
    );
  }

  return (
    <MasterPageShell masterName="Currency Master" description="Manage currencies and symbols">
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
          Add Currency
        </button>
      </div>

      <MasterListToolbar
        masterName="Currency Master"
        masterKey="currency_master"
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
        records={filteredCurrencies}
        columns={[
          { key: 'code', label: 'Currency Code' },
          { key: 'name', label: 'Currency Name' },
          { key: 'symbol', label: 'Symbol' },
          { key: 'decimalPrecision', label: 'Decimal Precision' },
          { key: 'isBaseCurrency', label: 'Is Base Currency' },
          { key: 'isActive', label: 'Is Active' },
          { key: 'entityMappings', label: 'Entity Mappings' },
          { key: 'approvalStatus', label: 'Approval Status' },
        ]}
      />

      <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: tableHeaderBg }}>
              <tr>
                <th
                  className="px-6 py-4 text-left text-xs uppercase tracking-[0.05em]"
                  style={{ color: tableHeaderFg, fontWeight: 500 }}
                >
                  Currency Code
                </th>
                <th
                  className="px-6 py-4 text-left text-xs uppercase tracking-[0.05em]"
                  style={{ color: tableHeaderFg, fontWeight: 500 }}
                >
                  Currency Name
                </th>
                <th
                  className="px-6 py-4 text-left text-xs uppercase tracking-[0.05em]"
                  style={{ color: tableHeaderFg, fontWeight: 500 }}
                >
                  Symbol
                </th>
                <th
                  className="px-6 py-4 text-left text-xs uppercase tracking-[0.05em]"
                  style={{ color: tableHeaderFg, fontWeight: 500 }}
                >
                  Decimal Precision
                </th>
                <th
                  className="px-6 py-4 text-left text-xs uppercase tracking-[0.05em]"
                  style={{ color: tableHeaderFg, fontWeight: 500 }}
                >
                  Base Currency
                </th>
                <th
                  className="px-6 py-4 text-left text-xs uppercase tracking-[0.05em]"
                  style={{ color: tableHeaderFg, fontWeight: 500 }}
                >
                  Status
                </th>
                <th
                  className="px-6 py-4 text-left text-xs uppercase tracking-[0.05em]"
                  style={{ color: tableHeaderFg, fontWeight: 500 }}
                >
                  Approval
                </th>
                <th
                  className="px-6 py-4 text-left text-xs uppercase tracking-[0.05em]"
                  style={{ color: tableHeaderFg, fontWeight: 500 }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCurrencies.map((currency, index) => (
                <tr
                  key={currency.id}
                  style={{ borderTop: index === 0 ? 'none' : '1px solid var(--color-silver)' }}
                >
                  <td
                    className="px-6 py-4"
                    style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                  >
                    {currency.code}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                    {currency.name}
                  </td>
                  <td
                    className="px-6 py-4"
                    style={{ color: 'var(--color-mercury-grey)', fontSize: '18px' }}
                  >
                    {currency.symbol}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    {currency.decimalPrecision}
                  </td>
                  <td className="px-6 py-4">
                    {currency.isBaseCurrency && (
                      <span
                        className="px-3 py-1 rounded-full text-sm"
                        style={{
                          backgroundColor: 'var(--color-teal-tint)',
                          color: 'var(--color-teal)',
                        }}
                      >
                        Base
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-sm"
                      style={getStatusBadgeStyle(currency.isActive)}
                    >
                      {currency.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-sm"
                      style={getApprovalBadgeStyle(currency.approvalStatus)}
                    >
                      {currency.approvalStatus ?? 'Approved'}
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
                        onClick={() => handleEdit(currency)}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {(currency.approvalStatus === 'Pending Approval' ||
                        currency.approvalStatus === 'Changes Requested' ||
                        currency.approvalStatus === 'Draft') && (
                        <button
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: 'var(--color-teal)' }}
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
          ℹ️ Currency Master supports multi-country entities. INR is the base currency. Showing{' '}
          {currencies.length} currencies.
        </p>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-xl">
            <div
              className="border-b px-6 py-4 flex items-center justify-between"
              style={{ borderColor: 'var(--color-silver)' }}
            >
              <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>
                {editingId ? 'Edit Currency' : 'Add Currency'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-lg"
                style={{ color: 'var(--color-mercury-grey)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Code"
                className="px-3 py-2 rounded-lg"
                style={{ border: '1px solid var(--color-silver)' }}
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="px-3 py-2 rounded-lg"
                style={{ border: '1px solid var(--color-silver)' }}
              />
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="Symbol"
                className="px-3 py-2 rounded-lg"
                style={{ border: '1px solid var(--color-silver)' }}
              />
              <input
                value={decimalPrecision}
                onChange={(e) => setDecimalPrecision(e.target.value)}
                placeholder="Decimal Precision"
                className="px-3 py-2 rounded-lg"
                style={{ border: '1px solid var(--color-silver)' }}
              />
              <label
                className="flex items-center gap-2 text-sm"
                style={{ color: 'var(--color-ink)' }}
              >
                <input
                  type="checkbox"
                  checked={isBaseCurrency}
                  onChange={(e) => setIsBaseCurrency(e.target.checked)}
                />
                Base Currency
              </label>
              <label
                className="flex items-center gap-2 text-sm"
                style={{ color: 'var(--color-ink)' }}
              >
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                Active
              </label>
            </div>
            <div
              className="border-t px-6 py-4 flex justify-end gap-3"
              style={{ borderColor: 'var(--color-silver)' }}
            >
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg"
                style={{
                  border: '1px solid var(--color-silver)',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--color-mercury-grey)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit('Draft')}
                className="px-4 py-2 rounded-lg"
                style={{
                  border: '1px solid #BFE8EC',
                  color: '#0F8A95',
                  backgroundColor: '#ECFEFF',
                  fontWeight: 700,
                }}
              >
                Save Draft
              </button>
              <button
                onClick={() => handleSubmit('Pending Approval')}
                className="px-4 py-2 rounded-lg text-white"
                style={{ backgroundColor: 'var(--color-teal)' }}
              >
                Submit
              </button>
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
    </MasterPageShell>
  );
}
