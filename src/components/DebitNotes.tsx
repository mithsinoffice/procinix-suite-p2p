import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Eye, Edit, FileText, Calendar, DollarSign,
  Building2, Download, Hash, AlertCircle, Search, WalletCards, ArrowUpRight
} from 'lucide-react';
import { PremiumActionButton, PremiumFilterMenu, toggleMultiSelect } from './ui/premium-register';
import { useAPData } from '../contexts/APDataContext';

export function DebitNotes() {
  const navigate = useNavigate();
  const { debitNotes } = useAPData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [referenceFilter, setReferenceFilter] = useState<string[]>([]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Draft':
        return { color: '#6E7A82', bgColor: '#F6F9FC' };
      case 'Pending Approval':
        return { color: '#D97706', bgColor: '#FEF3C7' };
      case 'Issued':
        return { color: '#00A9B7', bgColor: '#E8F7F8' };
      case 'Adjusted':
        return { color: '#F59E0B', bgColor: '#FEF3C7' };
      case 'Closed':
        return { color: '#10B981', bgColor: '#D1FAE5' };
      default:
        return { color: '#6E7A82', bgColor: '#F6F9FC' };
    }
  };

  const filteredDebitNotes = useMemo(() => debitNotes.filter((dn) => {
    const searchValue = search.trim().toLowerCase();
    const matchesSearch =
      !searchValue ||
      [
        dn.debitNoteNumber,
        dn.vendorName,
        dn.vendorCode,
        dn.referenceNumber,
        dn.reasonName,
        dn.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(searchValue);
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(dn.status);
    const matchesReferenceType = referenceFilter.length === 0 || referenceFilter.includes(dn.referenceType);
    return matchesSearch && matchesStatus && matchesReferenceType;
  }), [debitNotes, referenceFilter, search, statusFilter]);

  const hasActiveFilters = search.trim().length > 0 || statusFilter.length > 0 || referenceFilter.length > 0;

  const handleView = (id: string) => {
    navigate(`/ap/debit-notes/detail/${id}`);
  };

  const handleEdit = (id: string) => {
    navigate(`/ap/debit-notes/edit/${id}`);
  };

  const handleCreate = () => {
    navigate('/ap/debit-notes/create');
  };

  return (
    <div className="p-8" style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-2" style={{ color: '#0A0F14' }}>Debit Notes</h1>
          <p style={{ color: '#6E7A82' }}>Manage vendor debit notes for commercial adjustments</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-colors"
          style={{ backgroundColor: '#00A9B7' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
        >
          <Plus className="w-5 h-5" />
          Create Debit Note
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
              <FileText className="w-5 h-5" style={{ color: '#00A9B7' }} />
            </div>
            <span className="text-sm" style={{ color: '#6E7A82' }}>Total Debit Notes</span>
          </div>
          <div className="text-2xl" style={{ color: '#0A0F14' }}>{debitNotes.length}</div>
        </div>

        <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
              <DollarSign className="w-5 h-5" style={{ color: '#00A9B7' }} />
            </div>
            <span className="text-sm" style={{ color: '#6E7A82' }}>Total Debit Amount</span>
          </div>
          <div className="text-2xl" style={{ color: '#0A0F14' }}>
            ₹{debitNotes.reduce((sum, dn) => sum + dn.debitAmount, 0).toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
              <AlertCircle className="w-5 h-5" style={{ color: '#F59E0B' }} />
            </div>
            <span className="text-sm" style={{ color: '#6E7A82' }}>Draft</span>
          </div>
          <div className="text-2xl" style={{ color: '#0A0F14' }}>
            {debitNotes.filter(dn => dn.status === 'Draft').length}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
              <AlertCircle className="w-5 h-5" style={{ color: '#D97706' }} />
            </div>
            <span className="text-sm" style={{ color: '#6E7A82' }}>Pending Approval</span>
          </div>
          <div className="text-2xl" style={{ color: '#0A0F14' }}>
            {debitNotes.filter(dn => dn.status === 'Pending Approval').length}
          </div>
        </div>
      </div>

      <div className="rounded-[28px] overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: '1px solid #D7E3EA', boxShadow: '0 24px 52px rgba(15, 23, 42, 0.07)' }}>
        <div className="flex items-center justify-between gap-4 px-6 py-4" style={{ borderBottom: '1px solid #E8F0F4' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFE9EF 0%, #FFDCE7 100%)', boxShadow: '0 14px 30px rgba(190, 24, 93, 0.12)' }}>
              <WalletCards className="w-6 h-6" style={{ color: '#BE123C' }} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: '#FFF0F5', color: '#BE123C', fontWeight: 700 }}>
                Debit Note Register
              </span>
              <span className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: '#FFF7DA', color: '#B45309', fontWeight: 700 }}>
                {filteredDebitNotes.length} Visible
              </span>
            </div>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        <div className="overflow-x-auto">
          <div style={{ minWidth: '1440px' }}>
            <div className="grid gap-4 px-6 py-4" style={{ gridTemplateColumns: '2fr 1fr 1.8fr 1fr 1fr 1.3fr 1fr 1fr 0.9fr', borderBottom: '1px solid #E8F0F4' }}>
              <div className="space-y-2">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#6E7A82' }} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search debit note..." className="w-full pl-11 pr-4 py-2.5 rounded-2xl text-sm" style={{ backgroundColor: '#F8FBFD', border: '1px solid #D7E3EA', color: '#0A0F14' }} />
                </div>
                {hasActiveFilters && (
                  <button type="button" onClick={() => { setSearch(''); setStatusFilter([]); setReferenceFilter([]); }} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm" style={{ backgroundColor: '#FFF5F5', border: '1px solid #FED7D7', color: '#C53030', fontWeight: 600 }}>
                    Clear Filters
                  </button>
                )}
              </div>
              <div />
              <div />
              <div className="flex items-start">
                <PremiumFilterMenu label="Reference" options={['Invoice', 'GRN']} selected={referenceFilter} onToggle={(value) => setReferenceFilter((current) => toggleMultiSelect(current, value))} />
              </div>
              <div />
              <div />
              <div />
              <div className="flex items-start">
                <PremiumFilterMenu label="Status" options={['Draft', 'Pending Approval', 'Issued', 'Adjusted', 'Closed', 'Rejected']} selected={statusFilter} onToggle={(value) => setStatusFilter((current) => toggleMultiSelect(current, value))} />
              </div>
              <div />
            </div>

            <div className="grid gap-4 px-6 py-4" style={{ gridTemplateColumns: '2fr 1fr 1.8fr 1fr 1fr 1.3fr 1fr 1fr 0.9fr', background: 'linear-gradient(180deg, #F8FBFD 0%, #F3F8FB 100%)', borderBottom: '1px solid #E4EDF2' }}>
              {['Debit Note', 'Date', 'Vendor', 'Reference', 'Reference No', 'Reason', 'Amount', 'Status', 'Action'].map((column) => (
                <div key={column} className="text-xs uppercase tracking-[0.18em]" style={{ color: '#6E7A82', fontWeight: 700 }}>
                  {column}
                </div>
              ))}
            </div>

            {filteredDebitNotes.length === 0 ? (
                <div className="px-6 py-12 text-center" style={{ color: '#6E7A82' }}>
                    <div className="flex flex-col items-center gap-3">
                      <FileText className="w-12 h-12" style={{ color: '#E1E6EA' }} />
                      <p>No debit notes found</p>
                      <button
                        onClick={handleCreate}
                        className="mt-2 px-4 py-2 rounded-lg text-white text-sm"
                        style={{ backgroundColor: '#00A9B7' }}
                      >
                        Create First Debit Note
                      </button>
                    </div>
                </div>
              ) : (
                filteredDebitNotes.map((dn, index) => (
                  <div
                    key={dn.id} 
                    className="grid gap-4 px-6 py-4"
                    style={{ gridTemplateColumns: '2fr 1fr 1.8fr 1fr 1fr 1.3fr 1fr 1fr 0.9fr', borderBottom: index === filteredDebitNotes.length - 1 ? 'none' : '1px solid #EDF3F7', backgroundColor: '#FFFFFF' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FCFE'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFE9EF 0%, #FFDCE7 100%)' }}>
                        <Hash className="w-4 h-4" style={{ color: '#BE123C' }} />
                      </div>
                      <div style={{ color: '#00A9B7', fontWeight: 700 }}>
                        {dn.debitNoteNumber}
                      </div>
                    </div>
                    <div style={{ color: '#0A0F14' }}>
                      {new Date(dn.debitNoteDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </div>
                    <div>
                      <div>
                        <div style={{ color: '#0A0F14' }}>{dn.vendorName}</div>
                        <div className="text-sm" style={{ color: '#6E7A82' }}>{dn.vendorCode}</div>
                      </div>
                    </div>
                    <div>
                      <span 
                        className="px-3 py-1 rounded-full text-sm"
                        style={{ 
                          backgroundColor: dn.referenceType === 'Invoice' ? '#E8F7F8' : '#FEF3C7',
                          color: dn.referenceType === 'Invoice' ? '#00A9B7' : '#F59E0B'
                        }}
                      >
                        {dn.referenceType}
                      </span>
                    </div>
                    <div style={{ color: '#0A0F14' }}>
                      {dn.referenceNumber}
                    </div>
                    <div style={{ color: '#6E7A82' }}>
                      {dn.reasonName}
                    </div>
                    <div style={{ color: '#0A0F14' }}>
                      {dn.currency} {dn.debitAmount.toLocaleString('en-IN')}
                    </div>
                    <div>
                      <span
                        className="px-3 py-1 rounded-full text-sm"
                        style={{
                          backgroundColor: getStatusConfig(dn.status).bgColor,
                          color: getStatusConfig(dn.status).color
                        }}
                      >
                        {dn.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <PremiumActionButton label="View debit note" icon={<Eye className="w-4 h-4" />} tone="teal" onClick={() => handleView(dn.id)} />
                      {dn.status === 'Draft' && (
                        <PremiumActionButton label="Edit debit note" icon={<Edit className="w-4 h-4" />} tone="violet" onClick={() => handleEdit(dn.id)} />
                      )}
                      <PremiumActionButton label="Open debit note" icon={<ArrowUpRight className="w-4 h-4" />} tone="blue" onClick={() => handleView(dn.id)} />
                    </div>
                  </div>
                ))
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
