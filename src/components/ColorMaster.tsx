import { ArrowLeft, Plus, Trash2, X, Hash, Palette, FileText, Edit, Eye, Search, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMemo, useState, useCallback } from 'react';
import { ApprovalModal } from './ApprovalModal';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { PremiumActionButton, PremiumFilterMenu, toggleMultiSelect } from './ui/premium-register';
import { FormShell, FormSection, PxFormField, CheckCard, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';
import { EntityMappingSelector } from './shared/EntityMappingSelector';
import type { EntityScopeMapping } from '../lib/masters/entityMapping';

interface Color {
  id: string;
  colorCode: string;
  colorName: string;
  hexCode: string;
  status: string;
  approvalStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  originalData?: Color;
}

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

export function ColorMaster() {
  const navigate = useNavigate();
  const [colors, setColors] = useIncrementalMasterRecords<Color>('color_master', [
    { id: '1', colorCode: 'CLR001', colorName: 'Navy Blue', hexCode: '#001F3F', status: 'Active', approvalStatus: 'Approved' },
    { id: '2', colorCode: 'CLR002', colorName: 'Crimson Red', hexCode: '#DC143C', status: 'Active', approvalStatus: 'Approved' },
    { id: '3', colorCode: 'CLR003', colorName: 'Forest Green', hexCode: '#228B22', status: 'Inactive', approvalStatus: 'Pending Approval' },
    { id: '4', colorCode: 'CLR004', colorName: 'Jet Black', hexCode: '#000000', status: 'Active', approvalStatus: 'Approved' },
    { id: '5', colorCode: 'CLR005', colorName: 'Pearl White', hexCode: '#FFFFFF', status: 'Active', approvalStatus: 'Draft' }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [colorCode, setColorCode] = useState('');
  const [colorName, setColorName] = useState('');
  const [hexCode, setHexCode] = useState('');
  const [status, setStatus] = useState('Active');
  const [entityMappings, setEntityMappings] = useState<EntityScopeMapping[]>([]);

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<Color | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<string[]>([]);

  const filteredColors = useMemo(() => {
    return colors.filter((color) => {
      const haystack = [color.colorCode, color.colorName, color.hexCode].join(' ').toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(color.status);
      const matchesApproval = approvalFilter.length === 0 || approvalFilter.includes(color.approvalStatus);
      return matchesSearch && matchesStatus && matchesApproval;
    });
  }, [colors, searchTerm, statusFilter, approvalFilter]);

  const hasActiveFilters = searchTerm.trim().length > 0 || statusFilter.length > 0 || approvalFilter.length > 0;

  const handleSubmit = (approvalStatus: Color['approvalStatus'] = 'Pending Approval') => {
    if (isEditMode && editingId) {
      const originalRecord = colors.find(c => c.id === editingId);
      
      const updatedColor: Color = {
        id: editingId,
        colorCode,
        colorName,
        hexCode,
        status,
        approvalStatus,
        originalData: originalRecord,
        entityMappings,
      };

      setColors(colors.map(c => c.id === editingId ? updatedColor : c));
    } else {
      const newColor: Color = {
        id: Date.now().toString(),
        colorCode: colorCode || 'CLR-NEW',
        colorName,
        hexCode,
        status,
        approvalStatus,
        entityMappings,
      };
      setColors([...colors, newColor]);
    }
    
    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setColorCode('');
    setColorName('');
    setHexCode('');
    setStatus('Active');
    setEntityMappings([]);
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (color: Color) => {
    setIsEditMode(true);
    setEditingId(color.id);
    setColorCode(color.colorCode);
    setColorName(color.colorName);
    setHexCode(color.hexCode);
    setStatus(color.status);
    setEntityMappings(color.entityMappings || []);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const color = colors.find(c => c.id === id);
    
    if (color?.approvalStatus === 'Approved') {
      alert('Cannot delete approved/live records. You can only modify them through the approval workflow.');
      return;
    }
    
    setColors(colors.filter(c => c.id !== id));
  };

  const handleReview = (color: Color) => {
    const changes: Change[] = [];
    
    if (color.originalData) {
      const original = color.originalData;
      
      if (original.colorCode !== color.colorCode) {
        changes.push({ field: 'Color Code', oldValue: original.colorCode, newValue: color.colorCode });
      }
      if (original.colorName !== color.colorName) {
        changes.push({ field: 'Color Name', oldValue: original.colorName, newValue: color.colorName });
      }
      if (original.hexCode !== color.hexCode) {
        changes.push({ field: 'Hex Code', oldValue: original.hexCode, newValue: color.hexCode });
      }
      if (original.status !== color.status) {
        changes.push({ field: 'Status', oldValue: original.status, newValue: color.status });
      }
    }
    
    setCurrentReviewRecord(color);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction('color_master', colors, currentReviewRecord.id, 'approve');
      setColors(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction('color_master', colors, currentReviewRecord.id, 'reject');
      setColors(nextRecords);
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
      const nextRecords = await applyMasterApprovalAction('color_master', colors, currentReviewRecord.id, 'request_info', comments);
      setColors(nextRecords);
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
    const fields = [colorCode, colorName, hexCode];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [colorCode, colorName, hexCode]);

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
        title={editingId ? 'Edit Color' : 'Create Color'}
        subtitle="Manage color catalog with approval workflow"
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
        <FormSection title="Color Details" columns={2}>
          <PxFormField label="Color Code" required filled={!!colorCode.trim()}>
            <input type="text" value={colorCode} onChange={(e) => setColorCode(e.target.value)} placeholder="e.g., CLR006" className="px-input" />
          </PxFormField>
          <PxFormField label="Color Name" required filled={!!colorName.trim()}>
            <input type="text" value={colorName} onChange={(e) => setColorName(e.target.value)} placeholder="e.g., Sky Blue" className="px-input" />
          </PxFormField>
          <PxFormField label="Hex Code" filled={!!hexCode.trim()} hint="CSS hex color value">
            <input type="text" value={hexCode} onChange={(e) => setHexCode(e.target.value)} placeholder="#RRGGBB" className="px-input" />
            {hexCode && (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-6 h-6 rounded border" style={{ backgroundColor: hexCode, borderColor: 'var(--color-silver)' }} />
                <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Color Preview</span>
              </div>
            )}
          </PxFormField>
          <PxFormField label="Status" required filled={!!status}>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-select">
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
    <div className="p-8" style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/masters')} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-mercury-grey)' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl" style={{ color: 'var(--color-ink)' }}>Color Master</h1>
            <p style={{ color: 'var(--color-mercury-grey)' }}>Manage color catalog with approval workflow</p>
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
          Add New Color
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--color-silver)' }}>
              <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>
                {isEditMode ? 'Edit Color' : 'Add New Color'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-mercury-grey)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Color Code <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    <input type="text" value={colorCode} onChange={(e) => setColorCode(e.target.value)} placeholder="e.g., CLR006" className="w-full pl-10 pr-3 py-2.5 rounded-lg" style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Color Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <div className="relative">
                    <Palette className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    <input type="text" value={colorName} onChange={(e) => setColorName(e.target.value)} placeholder="e.g., Sky Blue" className="w-full pl-10 pr-3 py-2.5 rounded-lg" style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Hex Code</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    <input type="text" value={hexCode} onChange={(e) => setHexCode(e.target.value)} placeholder="#RRGGBB" className="w-full pl-10 pr-3 py-2.5 rounded-lg" style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }} />
                  </div>
                  {hexCode && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-6 h-6 rounded border" style={{ backgroundColor: hexCode, borderColor: 'var(--color-silver)' }} />
                      <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Color Preview</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Status <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full pl-10 pr-8 py-2.5 rounded-lg" style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%236E7A82\' d=\'M6 8L2 4h8z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '12px' }}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-3 flex-shrink-0" style={{ borderColor: 'var(--color-silver)' }}>
              <button onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg transition-colors" style={{ border: '1px solid var(--color-silver)', color: 'var(--color-mercury-grey)', backgroundColor: 'white' }}>
                Cancel
              </button>
              <button onClick={handleSubmit} className="px-6 py-2 rounded-lg text-white transition-colors" style={{ backgroundColor: 'var(--color-teal)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}>
                {isEditMode ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        recordType="Color Master"
        recordId={currentReviewRecord?.colorCode || ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />

      <div className="rounded-[24px] overflow-hidden bg-white" style={{ border: '1px solid var(--color-fog)', boxShadow: '0 18px 42px rgba(15, 23, 42, 0.06)' }}>
        <div className="overflow-x-auto">
          <div style={{ minWidth: '1120px' }}>
            <div className="grid gap-4 px-6 py-4" style={{ gridTemplateColumns: '1.4fr 1.7fr 1fr 1.2fr 1fr 1.3fr 0.9fr', borderBottom: '1px solid #E8F0F4' }}>
              <div className="space-y-2">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-mercury-grey)' }} />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search colors..."
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl text-sm"
                    style={{ backgroundColor: '#F8FBFD', border: '1px solid var(--color-fog)', color: 'var(--color-ink)' }}
                  />
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter([]);
                      setApprovalFilter([]);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                    style={{ backgroundColor: '#FFF5F5', border: '1px solid #FED7D7', color: '#C53030', fontWeight: 600 }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
              <div />
              <div />
              <div />
              <div className="flex items-start">
                <PremiumFilterMenu
                  label="Status"
                  options={['Active', 'Inactive']}
                  selected={statusFilter}
                  onToggle={(value) => setStatusFilter((current) => toggleMultiSelect(current, value))}
                />
              </div>
              <div className="flex items-start">
                <PremiumFilterMenu
                  label="Approval"
                  options={['Draft', 'Pending Approval', 'Approved', 'Rejected']}
                  selected={approvalFilter}
                  onToggle={(value) => setApprovalFilter((current) => toggleMultiSelect(current, value))}
                />
              </div>
              <div />
            </div>

            <div className="grid gap-4 px-6 py-4" style={{ gridTemplateColumns: '1.4fr 1.7fr 1fr 1.2fr 1fr 1.3fr 0.9fr', background: 'linear-gradient(180deg, #F8FBFD 0%, #F3F8FB 100%)', borderBottom: '1px solid #E4EDF2' }}>
              {['Color Code', 'Color Name', 'Preview', 'Hex Code', 'Status', 'Approval Status', 'Action'].map((column) => (
                <div key={column} className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--color-mercury-grey)', fontWeight: 700 }}>
                  {column}
                </div>
              ))}
            </div>

            <div>
              {filteredColors.map((color, index) => (
                <div
                  key={color.id}
                  className="grid gap-4 px-6 py-4 items-center"
                  style={{
                    gridTemplateColumns: '1.4fr 1.7fr 1fr 1.2fr 1fr 1.3fr 0.9fr',
                    borderBottom: index === filteredColors.length - 1 ? 'none' : '1px solid #EDF3F7',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <div style={{ color: 'var(--color-ink)', fontWeight: 700 }}>{color.colorCode}</div>
                  <div style={{ color: 'var(--color-ink)' }}>{color.colorName}</div>
                  <div>
                    <div className="w-9 h-9 rounded-2xl border" style={{ backgroundColor: color.hexCode, borderColor: 'var(--color-fog)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.35)' }} />
                  </div>
                  <div style={{ color: 'var(--color-mercury-grey)' }}>{color.hexCode}</div>
                  <div>
                    <span className="px-3 py-1.5 rounded-full text-xs" style={{ backgroundColor: color.status === 'Active' ? 'var(--color-teal-tint)' : '#FFE8EA', color: color.status === 'Active' ? 'var(--color-teal)' : 'var(--color-error)', fontWeight: 700 }}>
                      {color.status}
                    </span>
                  </div>
                  <div>
                    <span className="px-3 py-1.5 rounded-full text-xs" style={{ ...getStatusBadgeStyle(color.approvalStatus), fontWeight: 700 }}>
                      {color.approvalStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {color.approvalStatus === 'Pending Approval' && (
                      <PremiumActionButton label="Review color" icon={<Eye className="w-4 h-4" />} tone="teal" onClick={() => handleReview(color)} />
                    )}
                    <PremiumActionButton label="Edit color" icon={<Edit className="w-4 h-4" />} tone="violet" onClick={() => handleEdit(color)} />
                    <PremiumActionButton label="Open color" icon={<ArrowUpRight className="w-4 h-4" />} tone="blue" onClick={() => handleEdit(color)} />
                    <PremiumActionButton label="Delete color" icon={<Trash2 className="w-4 h-4" />} tone="amber" onClick={() => handleDelete(color.id)} />
                  </div>
                </div>
              ))}
              {filteredColors.length === 0 && (
                <div className="px-8 py-16 text-center">
                  <p className="text-base mb-1" style={{ color: 'var(--color-ink)', fontWeight: 700 }}>No colors match the current filters</p>
                  <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Clear one or more filters to bring the full register back.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
