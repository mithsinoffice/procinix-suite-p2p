import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Calendar,
  ChevronDown,
  ClipboardList,
  Download,
  Eye,
  Package,
  PencilLine,
  Plus,
  Search,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PremiumActionButton, PremiumFilterMenu, toggleMultiSelect } from './ui/premium-register';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: string;
  date: string;
  amount: number;
  status: 'Draft' | 'Issued' | 'Partially Received' | 'Fully Received' | 'Closed / Cancelled';
  department: string;
}

const mockPurchaseOrders: PurchaseOrder[] = [
  { id: '1', poNumber: 'PO-2024-001', vendor: 'Acme Supplies Ltd', date: '2024-12-10', amount: 125000, status: 'Issued', department: 'IT' },
  { id: '2', poNumber: 'PO-2024-002', vendor: 'Global Tech Solutions', date: '2024-12-09', amount: 89500, status: 'Partially Received', department: 'Operations' },
  { id: '3', poNumber: 'PO-2024-003', vendor: 'Office Depot India', date: '2024-12-08', amount: 45200, status: 'Fully Received', department: 'Admin' },
  { id: '4', poNumber: 'PO-2024-004', vendor: 'Engineering Parts Co', date: '2024-12-07', amount: 210000, status: 'Issued', department: 'Manufacturing' },
  { id: '5', poNumber: 'PO-2024-005', vendor: 'Marketing Materials Inc', date: '2024-12-06', amount: 68000, status: 'Draft', department: 'Marketing' },
  { id: '6', poNumber: 'PO-2024-006', vendor: 'Facility Services Ltd', date: '2024-12-05', amount: 32500, status: 'Closed / Cancelled', department: 'Facilities' },
];

const statusTone = (status: PurchaseOrder['status']) => {
  switch (status) {
    case 'Draft':
      return { bg: '#F4F7FB', color: '#64748B', border: '#D9E2EC' };
    case 'Issued':
      return { bg: '#E7FBFD', color: '#0F8A95', border: '#BEEBF0' };
    case 'Partially Received':
      return { bg: '#EAF4FF', color: '#2563EB', border: '#CFE1F8' };
    case 'Fully Received':
      return { bg: '#E8FFF2', color: '#0F9D69', border: '#C8F2DA' };
    case 'Closed / Cancelled':
      return { bg: '#FFF1F2', color: '#BE123C', border: '#FFD6DD' };
    default:
      return { bg: '#F4F7FB', color: '#64748B', border: '#D9E2EC' };
  }
};

export function PurchaseOrders() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const filteredOrders = useMemo(
    () =>
      mockPurchaseOrders.filter((order) => {
        const searchValue = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !searchValue ||
          [order.poNumber, order.vendor, order.department, order.status].join(' ').toLowerCase().includes(searchValue);
        const matchesStatus = statusFilter.length === 0 || statusFilter.includes(order.status);
        const matchesDepartment = departmentFilter.length === 0 || departmentFilter.includes(order.department);
        return matchesSearch && matchesStatus && matchesDepartment;
      }),
    [departmentFilter, searchTerm, statusFilter]
  );

  const stats = {
    total: filteredOrders.length,
    issued: filteredOrders.filter((order) => order.status === 'Issued').length,
    received: filteredOrders.filter((order) => order.status === 'Fully Received').length,
    totalValue: filteredOrders.reduce((sum, order) => sum + order.amount, 0),
  };

  const hasActiveFilters =
    searchTerm.trim().length > 0 || statusFilter.length > 0 || departmentFilter.length > 0;

  return (
    <div className="p-8" style={{ background: 'linear-gradient(180deg, #EEF6FB 0%, #F6F9FC 42%, #F6F9FC 100%)', minHeight: '100vh' }}>
      <div className="flex items-start justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #E8F3FF 0%, #D8EAFE 100%)',
                boxShadow: '0 14px 30px rgba(37, 99, 235, 0.14)',
              }}
            >
              <ClipboardList className="w-6 h-6" style={{ color: '#2563EB' }} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: '#EEF7FF', color: '#2563EB', fontWeight: 700 }}>
                PO Register
              </span>
              <span className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: '#E8FFF2', color: '#0F9D69', fontWeight: 700 }}>
                {filteredOrders.length} Visible
              </span>
            </div>
          </div>
          <h1 className="text-3xl" style={{ color: '#0A0F14', fontWeight: 700 }}>Purchase Orders</h1>
          <p style={{ color: '#6E7A82', maxWidth: '820px' }}>
            Review purchase orders, receiving status, department ownership, and act from one premium operational register.
          </p>
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white transition-colors"
            style={{ backgroundColor: '#00A9B7', boxShadow: '0 10px 22px rgba(0, 169, 183, 0.18)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#007D87';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#00A9B7';
            }}
          >
            <Plus className="w-5 h-5" />
            Create PO
            <ChevronDown className="w-4 h-4" />
          </button>

          {showCreateMenu && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                onClick={() => setShowCreateMenu(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  backgroundColor: 'white',
                  border: '1px solid #D7E3EA',
                  borderRadius: '18px',
                  boxShadow: '0 24px 48px rgba(15, 23, 42, 0.12)',
                  minWidth: '320px',
                  zIndex: 20,
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => {
                    setShowCreateMenu(false);
                    navigate('/purchase-orders/create?mode=direct');
                  }}
                  style={{ width: '100%', padding: '14px 18px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: '1px solid #EAF0F4' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F8FBFD';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ color: '#0A0F14', fontWeight: 600, marginBottom: '4px' }}>Create Direct PO</div>
                  <div style={{ color: '#6E7A82', fontSize: '13px' }}>Create a purchase order without PR.</div>
                </button>

                <button
                  onClick={() => {
                    setShowCreateMenu(false);
                    navigate('/purchase-orders/create-from-pr');
                  }}
                  style={{ width: '100%', padding: '14px 18px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F8FBFD';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ color: '#0A0F14', fontWeight: 600, marginBottom: '4px' }}>Create PO from PR</div>
                  <div style={{ color: '#6E7A82', fontSize: '13px' }}>Combine one or more approved PRs.</div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #D7E3EA', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)' }}>
          <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Total Orders</p>
          <p className="text-2xl" style={{ color: '#0A0F14', fontWeight: 700 }}>{stats.total}</p>
        </div>
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #D7E3EA', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)' }}>
          <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Issued</p>
          <p className="text-2xl" style={{ color: '#00A9B7', fontWeight: 700 }}>{stats.issued}</p>
        </div>
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #D7E3EA', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)' }}>
          <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Fully Received</p>
          <p className="text-2xl" style={{ color: '#0F9D69', fontWeight: 700 }}>{stats.received}</p>
        </div>
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #D7E3EA', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)' }}>
          <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Total Value</p>
          <p className="text-2xl" style={{ color: '#0A0F14', fontWeight: 700 }}>₹{stats.totalValue.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div
        className="rounded-[28px] overflow-hidden"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #D7E3EA',
          boxShadow: '0 24px 52px rgba(15, 23, 42, 0.07)',
        }}
      >
        <div className="overflow-x-auto">
          <div style={{ minWidth: '1380px' }}>
            <div
              className="grid gap-4 px-6 py-4"
              style={{
                gridTemplateColumns: '2.2fr 1.6fr 1.1fr 1.2fr 1.2fr 1.3fr 0.9fr',
                borderBottom: '1px solid #E8F0F4',
              }}
            >
              <div className="space-y-2">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#6E7A82' }} />
                  <input
                    type="text"
                    placeholder="Search PO..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl text-sm"
                    style={{ backgroundColor: '#F8FBFD', border: '1px solid #D7E3EA', color: '#0A0F14' }}
                  />
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter([]);
                      setDepartmentFilter([]);
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
              <div className="flex items-start">
                <PremiumFilterMenu
                  label="Department"
                  options={[...new Set(mockPurchaseOrders.map((order) => order.department))]}
                  selected={departmentFilter}
                  onToggle={(value) => setDepartmentFilter((current) => toggleMultiSelect(current, value))}
                />
              </div>
              <div />
              <div className="flex items-start">
                <PremiumFilterMenu
                  label="Status"
                  options={['Draft', 'Issued', 'Partially Received', 'Fully Received', 'Closed / Cancelled']}
                  selected={statusFilter}
                  onToggle={(value) => setStatusFilter((current) => toggleMultiSelect(current, value))}
                />
              </div>
              <div className="flex justify-end">
                <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>

            <div
              className="grid gap-4 px-6 py-4"
              style={{
                gridTemplateColumns: '2.2fr 1.6fr 1.1fr 1.2fr 1.2fr 1.3fr 0.9fr',
                background: 'linear-gradient(180deg, #F8FBFD 0%, #F3F8FB 100%)',
                borderBottom: '1px solid #E4EDF2',
              }}
            >
              {['PO Number', 'Vendor', 'Date', 'Department', 'Amount', 'Status', 'Action'].map((column) => (
                <div key={column} className="text-xs uppercase tracking-[0.18em]" style={{ color: '#6E7A82', fontWeight: 700 }}>
                  {column}
                </div>
              ))}
            </div>

            {filteredOrders.map((order, index) => {
              const tone = statusTone(order.status);
              return (
                <div
                  key={order.id}
                  className="grid gap-4 px-6 py-4"
                  style={{
                    gridTemplateColumns: '2.2fr 1.6fr 1.1fr 1.2fr 1.2fr 1.3fr 0.9fr',
                    borderBottom: index === filteredOrders.length - 1 ? 'none' : '1px solid #EDF3F7',
                    backgroundColor: '#FFFFFF',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F8FCFE';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #E8F3FF 0%, #D8EAFE 100%)' }}>
                      <Package className="w-4 h-4" style={{ color: '#2563EB' }} />
                    </div>
                    <div>
                      <div style={{ color: '#0A0F14', fontWeight: 700 }}>{order.poNumber}</div>
                      <div className="text-xs" style={{ color: '#6E7A82' }}>Purchase order</div>
                    </div>
                  </div>
                  <div style={{ color: '#0A0F14' }}>{order.vendor}</div>
                  <div style={{ color: '#6E7A82' }}>{new Date(order.date).toLocaleDateString('en-IN')}</div>
                  <div style={{ color: '#6E7A82' }}>{order.department}</div>
                  <div style={{ color: '#0A0F14', fontWeight: 600 }}>₹{order.amount.toLocaleString('en-IN')}</div>
                  <div>
                    <span
                      className="inline-flex items-center rounded-full px-3 py-1 text-xs"
                      style={{
                        backgroundColor: tone.bg,
                        color: tone.color,
                        border: `1px solid ${tone.border}`,
                        fontWeight: 700,
                      }}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <PremiumActionButton
                      label="View PO"
                      icon={<Eye className="w-4 h-4" />}
                      tone="teal"
                      onClick={() => navigate(`/purchase-orders/update/${order.id}`)}
                    />
                    <PremiumActionButton
                      label="Update milestones"
                      icon={<Calendar className="w-4 h-4" />}
                      tone="violet"
                      onClick={() => navigate(`/purchase-orders/update/${order.id}`)}
                    />
                    {order.status === 'Draft' && (
                      <PremiumActionButton
                        label="Edit PO"
                        icon={<PencilLine className="w-4 h-4" />}
                        tone="slate"
                        onClick={() => navigate(`/purchase-orders/update/${order.id}`)}
                      />
                    )}
                    <PremiumActionButton
                      label="Open PO"
                      icon={<ArrowUpRight className="w-4 h-4" />}
                      tone="blue"
                      onClick={() => navigate(`/purchase-orders/update/${order.id}`)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid #E8F0F4' }}>
          <span style={{ color: '#6E7A82' }}>
            Showing {filteredOrders.length} of {mockPurchaseOrders.length} orders
          </span>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#6E7A82' }}>
              Previous
            </button>
            <button className="px-4 py-2 rounded-xl text-white" style={{ backgroundColor: '#00A9B7' }}>
              1
            </button>
            <button className="px-4 py-2 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#6E7A82' }}>
              2
            </button>
            <button className="px-4 py-2 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#6E7A82' }}>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
