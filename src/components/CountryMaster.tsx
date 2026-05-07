import {
  ArrowLeft,
  Plus,
  Trash2,
  X,
  Hash,
  Globe,
  FileText,
  Edit,
  Eye,
  Search,
  ArrowUpRight,
} from 'lucide-react';
import { MasterListToolbar } from './ui/MasterListToolbar';
import { useNavigate } from 'react-router-dom';
import { MasterPageShell } from './ui/MasterPageShell';
import { useMemo, useState, useCallback } from 'react';
import { ApprovalModal } from './ApprovalModal';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { COUNTRY_MASTER_SEED, type CountryMasterRow } from '../lib/countryMasterSeed';
import { PremiumActionButton, PremiumFilterMenu, toggleMultiSelect } from './ui/premium-register';
import {
  FormShell,
  FormSection,
  PxFormField,
  CheckCard,
  type SaveStatus,
} from './ui/form-primitives';
import { useMasterData } from '../contexts/MasterDataContext';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';
import { EntityMappingSelector } from './shared/EntityMappingSelector';
import type { EntityScopeMapping } from '../lib/masters/entityMapping';
import {
  formColors,
  gridFormTwoColGap6,
  inputStyle,
  inputStyleIconLeading,
  labelStyle,
  selectStyleIconLeading,
} from './ui/formTokens';

type Country = CountryMasterRow;

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

export function CountryMaster() {
  const navigate = useNavigate();
  const { currencies: masterCurrencies } = useMasterData();
  const [countries, setCountries] = useIncrementalMasterRecords<Country>(
    'country_master',
    COUNTRY_MASTER_SEED
  );

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [countryCode, setCountryCode] = useState('');
  const [countryName, setCountryName] = useState('');
  const [currency, setCurrency] = useState('');
  const [status, setStatus] = useState('Active');
  const [entityMappings, setEntityMappings] = useState<EntityScopeMapping[]>([]);

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<Country | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<string[]>([]);

  const filteredCountries = useMemo(() => {
    return countries.filter((country) => {
      const haystack = [country.countryCode, country.countryName, country.currency]
        .join(' ')
        .toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesCurrency =
        currencyFilter.length === 0 || currencyFilter.includes(country.currency);
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(country.status);
      const matchesApproval =
        approvalFilter.length === 0 || approvalFilter.includes(country.approvalStatus);
      return matchesSearch && matchesCurrency && matchesStatus && matchesApproval;
    });
  }, [countries, searchTerm, currencyFilter, statusFilter, approvalFilter]);

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    currencyFilter.length > 0 ||
    statusFilter.length > 0 ||
    approvalFilter.length > 0;

  const handleSubmit = (approvalStatus: Country['approvalStatus'] = 'Pending Approval') => {
    if (isEditMode && editingId) {
      const originalRecord = countries.find((c) => c.id === editingId);

      const updatedCountry: Country = {
        id: editingId,
        countryCode,
        countryName,
        currency,
        status,
        approvalStatus,
        originalData: originalRecord,
        entityMappings,
      };

      setCountries(countries.map((c) => (c.id === editingId ? updatedCountry : c)));
    } else {
      const newCountry: Country = {
        id: Date.now().toString(),
        countryCode,
        countryName,
        currency,
        status,
        approvalStatus,
        entityMappings,
      };
      setCountries([...countries, newCountry]);
    }

    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setCountryCode('');
    setCountryName('');
    setCurrency('');
    setStatus('Active');
    setEntityMappings([]);
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (country: Country) => {
    setIsEditMode(true);
    setEditingId(country.id);
    setCountryCode(country.countryCode);
    setCountryName(country.countryName);
    setCurrency(country.currency);
    setStatus(country.status);
    setEntityMappings(country.entityMappings || []);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const country = countries.find((c) => c.id === id);

    if (country?.approvalStatus === 'Approved') {
      alert(
        'Cannot delete approved/live records. You can only modify them through the approval workflow.'
      );
      return;
    }

    setCountries(countries.filter((c) => c.id !== id));
  };

  const handleReview = (country: Country) => {
    const changes: Change[] = [];

    if (country.originalData) {
      const original = country.originalData;

      if (original.countryCode !== country.countryCode) {
        changes.push({
          field: 'Country Code',
          oldValue: original.countryCode,
          newValue: country.countryCode,
        });
      }
      if (original.countryName !== country.countryName) {
        changes.push({
          field: 'Country Name',
          oldValue: original.countryName,
          newValue: country.countryName,
        });
      }
      if (original.currency !== country.currency) {
        changes.push({
          field: 'Currency',
          oldValue: original.currency,
          newValue: country.currency,
        });
      }
      if (original.status !== country.status) {
        changes.push({ field: 'Status', oldValue: original.status, newValue: country.status });
      }
    }

    setCurrentReviewRecord(country);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction(
        'country_master',
        countries,
        currentReviewRecord.id,
        'approve'
      );
      setCountries(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction(
        'country_master',
        countries,
        currentReviewRecord.id,
        'reject'
      );
      setCountries(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleRequestInfo = async () => {
    if (currentReviewRecord) {
      const comments = window.prompt('Enter comments for the request:', '');
      if (comments === null) {
        return;
      }
      const nextRecords = await applyMasterApprovalAction(
        'country_master',
        countries,
        currentReviewRecord.id,
        'request_info',
        comments
      );
      setCountries(nextRecords);
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
    const fields = [countryCode, countryName, currency, status];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [countryCode, countryName, currency, status]);

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
        masterName="Country Master"
        title="Country Master"
        subtitle="Manage countries with approval workflow"
        modeLabel={isEditMode ? 'Edit Country' : 'Create Country'}
        draftStatus={isEditMode ? 'Draft' : 'New'}
        completeness={completeness}
        onBack={() => setShowForm(false)}
        onCancel={() => setShowForm(false)}
        onSaveDraft={handleSaveDraft}
        onSubmit={() => handleSubmit('Pending Approval')}
        submitLabel="Submit"
        draftLabel="Save Draft"
        saveStatus={saveStatus}
      >
        <FormSection title="Country Details" columns={2}>
          <PxFormField
            label="Country Code"
            required
            filled={!!countryCode.trim()}
            hint="ISO 3166 country code"
          >
            <input
              type="text"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              placeholder="e.g., FR"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Country Name" required filled={!!countryName.trim()}>
            <input
              type="text"
              value={countryName}
              onChange={(e) => setCountryName(e.target.value)}
              placeholder="e.g., France"
              className="px-input"
            />
          </PxFormField>
          <PxFormField label="Currency" filled={!!currency.trim()} hint="ISO 4217 currency code">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="px-select"
            >
              <option value="">Select currency...</option>
              {masterCurrencies
                .filter((c: any) => c.isActive !== false)
                .map((c: any) => (
                  <option key={c.id} value={c.code}>
                    {c.code}
                    {c.name ? ` — ${c.name}` : ''}
                  </option>
                ))}
              {currency && !masterCurrencies.some((c: any) => c.code === currency) && (
                <option value={currency}>{currency}</option>
              )}
            </select>
          </PxFormField>
          <PxFormField label="Status" required filled={!!status.trim()}>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
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
    <MasterPageShell masterName="Country Master" description="Manage country definitions">
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
          Add Country
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div
              className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0"
              style={{ borderColor: 'var(--color-silver)' }}
            >
              <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>
                {isEditMode ? 'Edit Country' : 'Add New Country'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--color-mercury-grey)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className={gridFormTwoColGap6}>
                <div className="min-w-0">
                  <label style={labelStyle}>
                    Country Code <span style={{ color: formColors.required }}>*</span>
                  </label>
                  <div className="relative">
                    <Hash
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                      style={{ color: formColors.textMuted }}
                    />
                    <input
                      type="text"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      placeholder="e.g., FR"
                      style={inputStyleIconLeading}
                    />
                  </div>
                </div>
                <div className="min-w-0">
                  <label style={labelStyle}>
                    Country Name <span style={{ color: formColors.required }}>*</span>
                  </label>
                  <div className="relative">
                    <Globe
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                      style={{ color: formColors.textMuted }}
                    />
                    <input
                      type="text"
                      value={countryName}
                      onChange={(e) => setCountryName(e.target.value)}
                      placeholder="e.g., France"
                      style={inputStyleIconLeading}
                    />
                  </div>
                </div>
                <div className="min-w-0">
                  <label style={labelStyle}>Currency</label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    placeholder="e.g., EUR"
                    style={inputStyle}
                  />
                </div>
                <div className="min-w-0">
                  <label style={labelStyle}>
                    Status <span style={{ color: formColors.required }}>*</span>
                  </label>
                  <div className="relative">
                    <FileText
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                      style={{ color: formColors.textMuted }}
                    />
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      style={selectStyleIconLeading}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="border-t px-6 py-4 flex justify-end gap-3 flex-shrink-0"
              style={{ borderColor: 'var(--color-silver)' }}
            >
              <button
                onClick={() => setShowForm(false)}
                className="px-6 py-2 rounded-lg transition-colors"
                style={{
                  border: '1px solid var(--color-silver)',
                  color: 'var(--color-mercury-grey)',
                  backgroundColor: 'white',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit()}
                className="px-6 py-2 rounded-lg text-white transition-colors"
                style={{ backgroundColor: 'var(--color-teal)' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal)')}
              >
                {isEditMode ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        recordType="Country Master"
        recordId={currentReviewRecord?.countryCode || ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />

      <MasterListToolbar
        masterName="Country Master"
        masterKey="country_master"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={[
          {
            key: 'currency',
            label: 'Currency',
            options: [...new Set(countries.map((c) => c.currency).filter(Boolean))],
            selected: currencyFilter,
          },
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
          if (key === 'currency') setCurrencyFilter(values);
          if (key === 'status') setStatusFilter(values);
          if (key === 'approval') setApprovalFilter(values);
        }}
        records={filteredCountries}
        columns={[
          { key: 'countryCode', label: 'Country Code' },
          { key: 'countryName', label: 'Country Name' },
          { key: 'currency', label: 'Currency' },
          { key: 'status', label: 'Status' },
          { key: 'entityMappings', label: 'Entity Mappings' },
          { key: 'approvalStatus', label: 'Approval Status' },
        ]}
      />

      <div
        className="rounded-[24px] overflow-hidden bg-white"
        style={{
          border: '1px solid var(--color-fog)',
          boxShadow: '0 18px 42px rgba(15, 23, 42, 0.06)',
        }}
      >
        <div className="overflow-x-auto">
          <div style={{ minWidth: '1080px' }}>
            <div
              className="grid gap-4 px-6 py-4"
              style={{
                gridTemplateColumns: '1.2fr 1.6fr 1fr 1fr 1.3fr 0.9fr',
                background: 'linear-gradient(180deg, #F8FBFD 0%, #F3F8FB 100%)',
                borderBottom: '1px solid #E4EDF2',
              }}
            >
              {[
                'Country Code',
                'Country Name',
                'Currency',
                'Status',
                'Approval Status',
                'Action',
              ].map((column) => (
                <div
                  key={column}
                  className="text-xs uppercase tracking-[0.18em]"
                  style={{ color: 'var(--color-mercury-grey)', fontWeight: 700 }}
                >
                  {column}
                </div>
              ))}
            </div>

            <div>
              {filteredCountries.map((country, index) => (
                <div
                  key={country.id}
                  className="grid gap-4 px-6 py-4 items-center"
                  style={{
                    gridTemplateColumns: '1.2fr 1.6fr 1fr 1fr 1.3fr 0.9fr',
                    borderBottom:
                      index === filteredCountries.length - 1 ? 'none' : '1px solid #EDF3F7',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <div style={{ color: 'var(--color-ink)', fontWeight: 700 }}>
                    {country.countryCode}
                  </div>
                  <div style={{ color: 'var(--color-ink)' }}>{country.countryName}</div>
                  <div style={{ color: 'var(--color-mercury-grey)' }}>
                    {country.currency || 'Unassigned'}
                  </div>
                  <div>
                    <span
                      className="px-3 py-1.5 rounded-full text-xs"
                      style={{
                        backgroundColor:
                          country.status === 'Active' ? 'var(--color-teal-tint)' : '#FFE8EA',
                        color:
                          country.status === 'Active' ? 'var(--color-teal)' : 'var(--color-error)',
                        fontWeight: 700,
                      }}
                    >
                      {country.status}
                    </span>
                  </div>
                  <div>
                    <span
                      className="px-3 py-1.5 rounded-full text-xs"
                      style={{ ...getStatusBadgeStyle(country.approvalStatus), fontWeight: 700 }}
                    >
                      {country.approvalStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {country.approvalStatus === 'Pending Approval' && (
                      <PremiumActionButton
                        label="Review country"
                        icon={<Eye className="w-4 h-4" />}
                        tone="teal"
                        onClick={() => handleReview(country)}
                      />
                    )}
                    <PremiumActionButton
                      label="Edit country"
                      icon={<Edit className="w-4 h-4" />}
                      tone="violet"
                      onClick={() => handleEdit(country)}
                    />
                    <PremiumActionButton
                      label="Open country"
                      icon={<ArrowUpRight className="w-4 h-4" />}
                      tone="blue"
                      onClick={() => handleEdit(country)}
                    />
                    <PremiumActionButton
                      label="Delete country"
                      icon={<Trash2 className="w-4 h-4" />}
                      tone="amber"
                      onClick={() => handleDelete(country.id)}
                    />
                  </div>
                </div>
              ))}
              {filteredCountries.length === 0 && (
                <div className="px-8 py-16 text-center">
                  <p
                    className="text-base mb-1"
                    style={{ color: 'var(--color-ink)', fontWeight: 700 }}
                  >
                    No countries match the current filters
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    Clear one or more filters to bring the full register back.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MasterPageShell>
  );
}
