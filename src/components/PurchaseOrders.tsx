import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Calendar,
  ChevronDown,
  ClipboardList,
  Download,
  Eye,
  History,
  Package,
  PencilLine,
  Plus,
  Search,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PremiumActionButton, PremiumFilterMenu, toggleMultiSelect } from './ui/premium-register';
import type { PurchaseOrder } from '../contexts/APDataContext';
import { useProcurementData } from '../contexts/ProcurementDataContext';
import { AuditTrailDrawer } from './procurement/AuditTrailDrawer';
import {
  listingHeader,
  listingTitle,
  listingSubtitle,
  listingPrimaryBtn,
  metricStrip,
  metricCard,
  metricLabel,
  metricValue,
  metricValueSuccess,
  listingPage,
} from './ui/listingStyles';

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
  const { pos: relationalPOs } = useProcurementData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [auditTarget, setAuditTarget] = useState<{ id: string; ref: string } | null>(null);

  // Relational PO records adapted to the existing PurchaseOrder display shape.
  // Source of truth is /api/procurement/pos (via ProcurementDataContext); the
  // AP blob is no longer read for this listing.
  const STATUS_TO_LEGACY: Record<string, PurchaseOrder['status']> = {
    draft: 'Draft',
    issued: 'Issued',
    partially_received: 'Partially Received',
    fully_received: 'Fully Received',
    closed: 'Closed / Cancelled',
    cancelled: 'Closed / Cancelled',
  };
  const purchaseOrders: PurchaseOrder[] = relationalPOs.map((po) => ({
    id: po.id, // relational UUID (used for navigation)
    poNumber: po.poRef,
    vendor: po.vendorName,
    vendorCode: po.vendorId,
    vendorGSTIN: po.vendorGstin ?? '',
    date: (po.issuedAt || po.createdAt || '').split('T')[0] || '',
    amount: Number(po.totalWithGst ?? po.totalAmount ?? 0),
    openAmount: Number(po.totalWithGst ?? po.totalAmount ?? 0),
    status: STATUS_TO_LEGACY[po.status] ?? 'Draft',
    department: '—',
    type: po.poType === 'service' ? 'Services' : 'Goods',
    currency: 'INR',
    lineItems: [],
  }));

  const filteredOrders = useMemo(
    () =>
      purchaseOrders.filter((order) => {
        const searchValue = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !searchValue ||
          [order.poNumber, order.vendor, order.department, order.status]
            .join(' ')
            .toLowerCase()
            .includes(searchValue);
        const matchesStatus = statusFilter.length === 0 || statusFilter.includes(order.status);
        const matchesDepartment =
          departmentFilter.length === 0 || departmentFilter.includes(order.department);
        return matchesSearch && matchesStatus && matchesDepartment;
      }),
    [departmentFilter, searchTerm, statusFilter, purchaseOrders]
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
    <div style={listingPage}>
      <div style={listingHeader}>
        <div>
          <h1 style={listingTitle}>Purchase Orders</h1>
          <p style={listingSubtitle}>
            {filteredOrders.length} visible · receiving status, ownership & actions
          </p>
        </div>

        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowCreateMenu(!showCreateMenu)} style={listingPrimaryBtn}>
            <Plus size={13} />
            Create PO
            <ChevronDown size={13} />
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
                  border: '1px solid var(--color-fog)',
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
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    textAlign: 'left',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    borderBottom: '1px solid #EAF0F4',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F8FBFD';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ color: 'var(--color-ink)', fontWeight: 600, marginBottom: '4px' }}>
                    Create Direct PO
                  </div>
                  <div style={{ color: 'var(--color-mercury-grey)', fontSize: '13px' }}>
                    Create a purchase order without PR.
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowCreateMenu(false);
                    navigate('/purchase-orders/create-from-pr');
                  }}
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    textAlign: 'left',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F8FBFD';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ color: 'var(--color-ink)', fontWeight: 600, marginBottom: '4px' }}>
                    Create PO from PR
                  </div>
                  <div style={{ color: 'var(--color-mercury-grey)', fontSize: '13px' }}>
                    Combine one or more approved PRs.
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={metricStrip}>
        <div style={metricCard}>
          <div style={metricLabel}>Total Orders</div>
          <div style={metricValue}>{stats.total}</div>
        </div>
        <div style={metricCard}>
          <div style={metricLabel}>Issued</div>
          <div style={{ ...metricValue, color: 'var(--color-teal)' }}>{stats.issued}</div>
        </div>
        <div style={metricCard}>
          <div style={metricLabel}>Fully Received</div>
          <div style={metricValueSuccess}>{stats.received}</div>
        </div>
        <div style={metricCard}>
          <div style={metricLabel}>Total Value</div>
          <div style={metricValue}>₹{stats.totalValue.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div
        className="rounded-[28px] overflow-hidden"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--color-fog)',
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
                  <Search
                    className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  />
                  <input
                    type="text"
                    placeholder="Search PO..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl text-sm"
                    style={{
                      backgroundColor: '#F8FBFD',
                      border: '1px solid var(--color-fog)',
                      color: 'var(--color-ink)',
                    }}
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
                    style={{
                      backgroundColor: '#FFF5F5',
                      border: '1px solid #FED7D7',
                      color: '#C53030',
                      fontWeight: 600,
                    }}
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
                  options={[...new Set(purchaseOrders.map((order) => order.department))]}
                  selected={departmentFilter}
                  onToggle={(value) =>
                    setDepartmentFilter((current) => toggleMultiSelect(current, value))
                  }
                />
              </div>
              <div />
              <div className="flex items-start">
                <PremiumFilterMenu
                  label="Status"
                  options={[
                    'Draft',
                    'Issued',
                    'Partially Received',
                    'Fully Received',
                    'Closed / Cancelled',
                  ]}
                  selected={statusFilter}
                  onToggle={(value) =>
                    setStatusFilter((current) => toggleMultiSelect(current, value))
                  }
                />
              </div>
              <div className="flex justify-end">
                <button
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
                  style={{
                    border: '1px solid var(--color-fog)',
                    color: 'var(--color-ink)',
                    backgroundColor: '#FFFFFF',
                  }}
                >
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
              {['PO Number', 'Vendor', 'Date', 'Department', 'Amount', 'Status', 'Action'].map(
                (column) => (
                  <div
                    key={column}
                    className="text-xs uppercase tracking-[0.18em]"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: 700 }}
                  >
                    {column}
                  </div>
                )
              )}
            </div>

            {filteredOrders.map((order, index) => {
              const tone = statusTone(order.status);
              return (
                <div
                  key={order.id}
                  className="grid gap-4 px-6 py-4"
                  style={{
                    gridTemplateColumns: '2.2fr 1.6fr 1.1fr 1.2fr 1.2fr 1.3fr 0.9fr',
                    borderBottom:
                      index === filteredOrders.length - 1 ? 'none' : '1px solid #EDF3F7',
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
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #E8F3FF 0%, #D8EAFE 100%)' }}
                    >
                      <Package className="w-4 h-4" style={{ color: '#2563EB' }} />
                    </div>
                    <div>
                      <div style={{ color: 'var(--color-ink)', fontWeight: 700 }}>
                        {order.poNumber}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                        Purchase order
                      </div>
                    </div>
                  </div>
                  <div style={{ color: 'var(--color-ink)' }}>{order.vendor}</div>
                  <div style={{ color: 'var(--color-mercury-grey)' }}>
                    {new Date(order.date).toLocaleDateString('en-IN')}
                  </div>
                  <div style={{ color: 'var(--color-mercury-grey)' }}>{order.department}</div>
                  <div style={{ color: 'var(--color-ink)', fontWeight: 600 }}>
                    ₹{order.amount.toLocaleString('en-IN')}
                  </div>
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
                      label={order.status === 'Draft' ? 'Edit PO' : 'Edit disabled — non-draft'}
                      icon={<PencilLine className="w-4 h-4" />}
                      tone="slate"
                      onClick={
                        order.status === 'Draft'
                          ? () => navigate(`/purchase-orders/update/${order.id}`)
                          : undefined
                      }
                    />
                    <PremiumActionButton
                      label="Audit trail"
                      icon={<History className="w-4 h-4" />}
                      tone="amber"
                      onClick={() => {
                        const rel = relationalPOs.find(
                          (p) => p.poRef === order.poNumber || p.id === order.id
                        );
                        setAuditTarget({
                          id: rel?.id ?? order.id,
                          ref: rel?.poRef ?? order.poNumber,
                        });
                      }}
                    />
                    <PremiumActionButton
                      label="Update milestones"
                      icon={<Calendar className="w-4 h-4" />}
                      tone="violet"
                      onClick={() => navigate(`/purchase-orders/update/${order.id}`)}
                    />
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

        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: '1px solid #E8F0F4' }}
        >
          <span style={{ color: 'var(--color-mercury-grey)' }}>
            Showing {filteredOrders.length} of {purchaseOrders.length} orders
          </span>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-xl"
              style={{ border: '1px solid var(--color-fog)', color: 'var(--color-mercury-grey)' }}
            >
              Previous
            </button>
            <button
              className="px-4 py-2 rounded-xl text-white"
              style={{ backgroundColor: 'var(--color-teal)' }}
            >
              1
            </button>
            <button
              className="px-4 py-2 rounded-xl"
              style={{ border: '1px solid var(--color-fog)', color: 'var(--color-mercury-grey)' }}
            >
              2
            </button>
            <button
              className="px-4 py-2 rounded-xl"
              style={{ border: '1px solid var(--color-fog)', color: 'var(--color-mercury-grey)' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
      {auditTarget && (
        <AuditTrailDrawer
          open
          onClose={() => setAuditTarget(null)}
          docType="PO"
          docId={auditTarget.id}
          docRef={auditTarget.ref}
        />
      )}
    </div>
  );
}
